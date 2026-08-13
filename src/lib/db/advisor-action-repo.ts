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
  batch_id: string | null; // v8 advisor-experience (migration 0005); NULL for legacy/single rows
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
    batchId: r.batch_id ?? null,
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

/**
 * v8 advisor-experience — insert a BATCH of applied actions that share one
 * batch_id (Design §3.3). Rows are stored in the given order; grouped undo reverses
 * them via getActionsByBatch. A single-action confirm is just a length-1 batch.
 */
export async function recordBatch(
  supabase: SupabaseClient,
  userId: string,
  batchId: string,
  actions: NewAction[],
): Promise<AdvisorActionRecord[]> {
  const rows = actions.map((a) => ({
    user_id: userId,
    conversation_id: a.conversationId,
    action_type: a.actionType,
    status: "applied" as const,
    payload: a.payload,
    inverse: a.inverse,
    batch_id: batchId,
  }));
  const { data, error } = await supabase
    .from("advisor_actions")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data as ActionRow[]).map(toRecord);
}

/** All still-applied rows in a batch, oldest first (for grouped undo, SC-7). */
export async function getActionsByBatch(
  supabase: SupabaseClient,
  batchId: string,
): Promise<AdvisorActionRecord[]> {
  const { data, error } = await supabase
    .from("advisor_actions")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ActionRow[]).map(toRecord);
}

/**
 * Every action this user has ever recorded, oldest first.
 *
 * Added by Phase 2 U16 for the data export: the existing readers are
 * `getActionsByBatch` (one undo batch) and `getAction` (one row), neither of
 * which can answer "everything of mine". Filters on `user_id` explicitly rather
 * than leaning on RLS — the belt-and-braces the repo layer applies everywhere,
 * and what `REPO_SCOPING` requires of a table that has a `user_id` column.
 */
export async function listActionsByUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdvisorActionRecord[]> {
  const { data, error } = await supabase
    .from("advisor_actions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ActionRow[]).map(toRecord);
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
