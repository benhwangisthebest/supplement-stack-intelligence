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
 */
export async function replaceFlags(
  supabase: SupabaseClient,
  stackId: string,
  drafts: DraftFlag[],
): Promise<EvaluationFlag[]> {
  const del = await supabase.from("evaluation_flags").delete().eq("stack_id", stackId);
  if (del.error) throw del.error;

  if (drafts.length === 0) return [];

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
  return (data as EvaluationFlagRow[]).map(toEvaluationFlag);
}
