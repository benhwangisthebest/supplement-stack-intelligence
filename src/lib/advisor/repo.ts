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

/**
 * An upper bound on what one advisor turn may spend, reserved BEFORE the model
 * is called and settled to the real figure afterwards (Phase 2 U4).
 *
 * WHERE THE NUMBER COMES FROM, and what it does not promise. The output half is
 * derived: `MAX_TURNS` (5) × the adapter's `max_tokens` (1024) = 5,120 output
 * tokens is a hard ceiling the loop cannot exceed. The input half is an
 * ESTIMATE — prompt, advisor context, and conversation history are not bounded
 * by any constant in this repository — so the reservation is deliberately
 * generous and `settleAdvisorUsage` corrects it to the truth immediately after.
 *
 * What the reservation buys is CONCURRENCY safety: N simultaneous turns cannot
 * each see the full remaining budget, because each has already taken its bound
 * off the top. What it does NOT buy is a per-turn hard cap — if a single turn's
 * actual usage exceeds this bound, settle charges the real figure and the day's
 * total can overshoot by that difference, once. Bounding a turn's input is a
 * different mechanism (truncating context), not a ledger property.
 */
export const ADVISOR_TURN_RESERVATION = Number(
  process.env.ADVISOR_TURN_RESERVATION ?? 25_000,
);

/**
 * Reserve a turn's worth of budget atomically. Returns the granted amount, or
 * **0 when the reservation would breach the daily budget** — which the caller
 * must treat as a refusal.
 *
 * WHY AN RPC AND NOT A READ-THEN-WRITE (Phase 2 U4, finding N-2). The previous
 * pair — `getRemainingBudget` then `recordUsage` — had two races, not one:
 *
 *   1. between the two calls: every concurrent turn read the same remaining
 *      budget and every one of them proceeded;
 *   2. INSIDE `recordUsage`, which was select-then-upsert, so concurrent turns
 *      overwrote rather than accumulated and usage was silently LOST.
 *
 * Neither is fixable in supabase-js: PostgREST cannot express `col = col + n`,
 * so there is no client-side spelling of "add and check in one statement". The
 * single `UPDATE … WHERE … RETURNING` lives in
 * `supabase/migrations/0008_usage_ledger_policy.sql` and this is its only
 * caller. The user id is NOT passed: the function derives it from `auth.uid()`,
 * because a definer function that trusts a supplied id lets any caller charge
 * anyone's ledger.
 *
 * Proven here against a stateful fake, which establishes that THIS FUNCTION has
 * no read-then-write window. That the SQL is atomic under real concurrent
 * Postgres sessions is an owner-run check — see the migration's header.
 */
export async function reserveAdvisorTokens(
  supabase: SupabaseClient,
  amount: number = ADVISOR_TURN_RESERVATION,
  dailyBudget: number = ADVISOR_DAILY_TOKEN_BUDGET,
): Promise<number> {
  const { data, error } = await supabase.rpc("reserve_advisor_tokens", {
    p_amount: amount,
    p_daily_budget: dailyBudget,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

/**
 * Release a reservation and charge what was actually spent, in one statement.
 *
 * Splitting these would reintroduce a window where the reservation is released
 * but the usage is not yet recorded — briefly handing the user their budget
 * back for free.
 */
export async function settleAdvisorUsage(
  supabase: SupabaseClient,
  reserved: number,
  usage: { inputTokens: number; outputTokens: number },
): Promise<void> {
  const { error } = await supabase.rpc("settle_advisor_tokens", {
    p_reserved: reserved,
    p_input_tokens: usage.inputTokens,
    p_output_tokens: usage.outputTokens,
  });
  if (error) throw error;
}

/*
 * `recordUsage` USED TO LIVE HERE. Deleted by Phase 2 U15, closing N-13.
 *
 * It was a direct select-then-upsert against `advisor_usage`. Migration 0008
 * removed the end user's INSERT/UPDATE/DELETE on that table, so it could no
 * longer work for any anon-key client, and U4 moved the request path onto
 * `reserveAdvisorTokens` / `settleAdvisorUsage`.
 *
 * U4 kept it, and the reason it gave was: *"retained only because
 * `npm run db:seed` runs under the service-role key, which bypasses RLS — and
 * deleting it would be a change to the seed path under U4's name."*
 *
 * THAT REASON WAS NOT TRUE — not stale, false when written. `src/lib/db/seed.ts`
 * has never referenced `advisor_usage`, and at deletion the function had **zero
 * callers anywhere in `src/` outside its own test file**. It was never seed-path
 * code, so the §8.1 argument for leaving it alone did not apply to it.
 *
 * Recorded rather than quietly removed because the lesson is the transferable
 * part: a `@deprecated` tag plus a plausible retention story reads exactly like
 * a considered decision, and nothing in the toolchain checks whether the story
 * is true. The seed path was one grep away.
 */
