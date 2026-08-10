// Infrastructure — EvaluationFlag persistence (Design §4 /api/stacks/:id/evaluate).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftFlag, EvaluationFlag } from "@/types";
import { toEvaluationFlag } from "./mappers";
import type { EvaluationFlagRow } from "./types";

export async function listFlags(
  supabase: SupabaseClient,
  stackId: string,
): Promise<EvaluationFlag[]> {
  const { data, error } = await supabase
    .from("evaluation_flags")
    .select("*")
    .eq("stack_id", stackId);
  if (error) throw error;
  return (data as EvaluationFlagRow[]).map(toEvaluationFlag);
}

/**
 * Replaces all flags for a stack with a freshly computed set
 * (evaluation is recomputed wholesale, not patched). Design §4.2.
 *
 * ===========================================================================
 * WHY THE ORDER IS INSERT-THEN-DELETE (Phase 2 U8)
 * ===========================================================================
 * This was delete-then-insert. There is no transaction across two PostgREST
 * calls, so that order has a window in which the stack has NO flags at all —
 * and if the insert then fails, the window never closes: the user's evaluation
 * is gone and nothing replaces it. A network blip between the two calls
 * silently destroyed data the user had, to make room for data that never
 * arrived.
 *
 * Reversing the order does not make the pair atomic — nothing here can, short
 * of a SQL function, and this operation does not warrant one (see below). What
 * it does is change WHICH failure is possible:
 *
 *   delete-then-insert   insert fails → the stack is left with NOTHING.  Loss.
 *   insert-then-delete   delete fails → the stack holds BOTH sets.       Excess.
 *
 * Excess is recoverable and loss is not, so the order is chosen for the shape
 * of its failure, not for elegance.
 *
 * COST TO STATE RATHER THAN DISCOVER: between the insert and the delete the
 * table transiently holds both the old and the new set, so a concurrent
 * `listFlags` can see duplicates. That is accepted: flags are per-stack and
 * recomputed only by an explicit user action, so the window is short and
 * observed by at most the one user who owns the stack. It is never EMPTY,
 * which is the property the test pins.
 *
 * IF THE DELETE FAILS the function throws with the new rows already committed,
 * and the duplicates persist until the next evaluation — which captures every
 * existing id up front, including the leftovers, and removes them. The state is
 * self-healing on the next run. It still throws rather than reporting success,
 * because "the flags you are looking at are doubled" is not a success, and
 * swallowing the error would be the silent-failure defect `CLAUDE.md` §8.3
 * names.
 *
 * WHY IDS ARE CAPTURED FIRST rather than deleting "everything not just
 * inserted": under two concurrent replacements, delete-by-not-mine has each
 * call remove the other's rows and the stack ends up with neither set. Deleting
 * exactly the ids observed before this call's insert makes the loser's rows the
 * only casualty — last writer wins, which is the semantic a wholesale recompute
 * already implies.
 *
 * NOT A SQL FUNCTION, deliberately: `evaluation_flags` is transitively owned
 * (no `user_id` column; RLS derives ownership through `stacks`), so a
 * `SECURITY DEFINER` writer would have to re-derive that ownership by hand and
 * would become a new privileged surface for the registry guard to police. The
 * ledger and rate-limit counters earned that cost because a user could defeat
 * them; nobody gains anything by racing their own evaluation.
 */
export async function replaceFlags(
  supabase: SupabaseClient,
  stackId: string,
  drafts: DraftFlag[],
): Promise<EvaluationFlag[]> {
  // 1. What is here now. Captured BEFORE the insert so the delete can name
  //    exactly these rows and cannot reach a concurrent writer's.
  const existing = await supabase
    .from("evaluation_flags")
    .select("id")
    .eq("stack_id", stackId);
  if (existing.error) throw existing.error;
  const staleIds = ((existing.data ?? []) as { id: string }[]).map((r) => r.id);

  // 2. Write the new set first, so a failure here leaves the old set intact.
  let inserted: EvaluationFlag[] = [];
  if (drafts.length > 0) {
    const rows = drafts.map((d) => ({
      stack_id: stackId,
      stack_item_id: d.stackItemId,
      severity: d.severity,
      category: d.category,
      title: d.title,
      explanation: d.explanation,
      recommendation: d.recommendation,
      evidence_level: d.evidenceLevel,
    }));

    const { data, error } = await supabase
      .from("evaluation_flags")
      .insert(rows)
      .select("*");
    if (error) throw error;
    inserted = (data as EvaluationFlagRow[]).map(toEvaluationFlag);
  }

  // 3. Retire the old set by id. Nothing to do on a first evaluation.
  if (staleIds.length > 0) {
    const del = await supabase.from("evaluation_flags").delete().in("id", staleIds);
    if (del.error) throw del.error;
  }

  return inserted;
}
