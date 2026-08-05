// Infrastructure layer — advisor persistence + per-user token budget (Design §3.3).
// Mirrors the lib/db/*-repo pattern: functions take a user-scoped SupabaseClient +
// userId; RLS (migration 0003) enforces tenant isolation in the DB. Plan SC-6, SC-8.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdvisorConversation,
  AdvisorMessage,
  Citation,
} from "@/types/advisor";

/** Default daily token budget (input+output) per user. Override via env. SC-8. */
export const ADVISOR_DAILY_TOKEN_BUDGET = Number(
  process.env.ADVISOR_DAILY_TOKEN_BUDGET ?? 200_000,
);

// ---- Row shapes (DB snake_case) ----------------------------------------------
interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}
interface UsageRow {
  user_id: string;
  usage_date: string;
  input_tokens: number;
  output_tokens: number;
}

function toConversation(r: ConversationRow): AdvisorConversation {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function toMessage(r: MessageRow): AdvisorMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    citations: Array.isArray(r.citations) ? r.citations : [],
    createdAt: r.created_at,
  };
}

/** A title derived from the first user message (truncated). PURE. */
export function deriveTitle(firstMessage: string): string {
  const t = firstMessage.trim().replace(/\s+/g, " ");
  if (!t) return "New conversation";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

// ---- Conversations + messages ------------------------------------------------

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title: string,
): Promise<AdvisorConversation> {
  const { data, error } = await supabase
    .from("advisor_conversations")
    .insert({ user_id: userId, title })
    .select("*")
    .single();
  if (error) throw error;
  return toConversation(data as ConversationRow);
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdvisorConversation[]> {
  const { data, error } = await supabase
    .from("advisor_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ConversationRow[]).map(toConversation);
}

/**
 * Does `conversationId` belong to `userId`?
 *
 * Returns a BOOLEAN rather than the row on purpose. Nothing here needs the
 * conversation's fields, and a function that mapped a row would owe a row-fixture
 * test (CLAUDE.md §5.6) for a value no caller reads. It also keeps the answer
 * un-leakable: there is no shape to accidentally return to a client.
 *
 * Added by Phase 1 U21 — the U19 shape applied to conversation reads.
 */
export async function conversationBelongsToUser(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("advisor_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<AdvisorMessage[]> {
  const { data, error } = await supabase
    .from("advisor_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(toMessage);
}

export interface NewMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

/** Append messages to a conversation and bump its updated_at. */
export async function appendMessages(
  supabase: SupabaseClient,
  conversationId: string,
  messages: NewMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    conversation_id: conversationId,
    role: m.role,
    content: m.content,
    citations: m.citations,
  }));
  const { error } = await supabase.from("advisor_messages").insert(rows);
  if (error) throw error;
  const { error: touchError } = await supabase
    .from("advisor_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (touchError) throw touchError;
}

// ---- Token budget ------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Remaining tokens this user may still spend today. Never negative. SC-8. */
export async function getRemainingBudget(
  supabase: SupabaseClient,
  userId: string,
  dailyBudget: number = ADVISOR_DAILY_TOKEN_BUDGET,
): Promise<number> {
  const { data, error } = await supabase
    .from("advisor_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("usage_date", today())
    .maybeSingle();
  if (error) throw error;
  const row = data as UsageRow | null;
  const used = row ? row.input_tokens + row.output_tokens : 0;
  return Math.max(0, dailyBudget - used);
}

/** Add a turn's usage to today's ledger (upsert + accumulate). SC-8. */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  usage: { inputTokens: number; outputTokens: number },
): Promise<void> {
  const date = today();
  const { data, error } = await supabase
    .from("advisor_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("usage_date", date)
    .maybeSingle();
  if (error) throw error;
  const prev = data as UsageRow | null;
  const next = {
    user_id: userId,
    usage_date: date,
    input_tokens: (prev?.input_tokens ?? 0) + usage.inputTokens,
    output_tokens: (prev?.output_tokens ?? 0) + usage.outputTokens,
  };
  const { error: upsertError } = await supabase
    .from("advisor_usage")
    .upsert(next, { onConflict: "user_id,usage_date" });
  if (upsertError) throw upsertError;
}
