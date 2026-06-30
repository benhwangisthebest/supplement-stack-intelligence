// Infrastructure — advisor_actions persistence (Design §3.3, §4.2). Mirrors the
// lib/db/*-repo pattern: user-scoped SupabaseClient + userId; RLS (migration 0004)
// enforces tenant isolation. Stores each APPLIED action + its inverse for undo (SC-7).
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdvisorActionRecord,
  AdvisorActionType,
  WriteIntent,
} from "@/types/advisor-action";

interface ActionRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  action_type: AdvisorActionType;
  status: "applied" | "undone";
  payload: Record<string, unknown>;
  inverse: WriteIntent;
  created_at: string;
  undone_at: string | null;
}

function toRecord(r: ActionRow): AdvisorActionRecord {
  return {
    id: r.id,
    userId: r.user_id,
    conversationId: r.conversation_id,
    actionType: r.action_type,
    status: r.status,
    payload: r.payload,
    inverse: r.inverse,
    createdAt: r.created_at,
    undoneAt: r.undone_at,
  };
}

export interface NewAction {
  conversationId: string | null;
  actionType: AdvisorActionType;
  payload: Record<string, unknown>;
  inverse: WriteIntent;
}

/** Insert one applied action with its inverse. */
export async function recordAction(
  supabase: SupabaseClient,
  userId: string,
  action: NewAction,
): Promise<AdvisorActionRecord> {
  const { data, error } = await supabase
    .from("advisor_actions")
    .insert({
      user_id: userId,
      conversation_id: action.conversationId,
      action_type: action.actionType,
      status: "applied",
      payload: action.payload,
      inverse: action.inverse,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toRecord(data as ActionRow);
}

/** Fetch one action (RLS scopes it to the caller). */
export async function getAction(
  supabase: SupabaseClient,
  id: string,
): Promise<AdvisorActionRecord | null> {
  const { data, error } = await supabase
    .from("advisor_actions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as ActionRow) : null;
}

/** Mark an action undone (idempotency is enforced by the caller checking status). */
export async function markUndone(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("advisor_actions")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
