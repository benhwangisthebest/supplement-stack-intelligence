// Application — orchestrates load → pure evaluateStack() → persist flags (Design §9.4, §4.2).
// The actual rules live in the PURE lib/stack-evaluator (module-2); this layer only does I/O.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvaluationFlag, EvaluationSummary, Stack } from "@/types";
import { getStack } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { getProfile } from "@/lib/db/profile-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { listFlags, replaceFlags } from "@/lib/db/evaluation-flag-repo";
import type { StackItem } from "@/types";
import { evaluateStack, summarize } from "@/lib/stack-evaluator";

export interface EvaluationOutput {
  stackId: string;
  flags: EvaluationFlag[];
  summary: EvaluationSummary;
}

/**
 * Runs an evaluation for an owned stack and persists the resulting flags.
 * Returns null if the stack does not exist / is not owned (caller maps to 404).
 */
export async function runEvaluation(
  supabase: SupabaseClient,
  userId: string,
  stackId: string,
): Promise<EvaluationOutput | null> {
  const stack = await getStack(supabase, userId, stackId);
  if (!stack) return null;

  const [items, profile, labMarkers] = await Promise.all([
    listItems(supabase, stackId),
    getProfile(supabase, userId),
    listLabMarkers(supabase, userId),
  ]);

  // Plan SC: profile + labs feed the engine — this is where personalization pays off.
  const { flags: drafts } = evaluateStack({ stack, items, profile, labMarkers });
  const persisted = await replaceFlags(supabase, stackId, drafts);

  return { stackId, flags: persisted, summary: summarize(drafts) };
}

/** Loads a stack with its items + previously computed flags (Design §4.1 GET /stacks/:id). */
export async function getStackDetail(
  supabase: SupabaseClient,
  userId: string,
  stackId: string,
): Promise<{ stack: Stack; items: StackItem[]; flags: EvaluationFlag[] } | null> {
  const stack = await getStack(supabase, userId, stackId);
  if (!stack) return null;
  const [items, flags] = await Promise.all([
    listItems(supabase, stackId),
    listFlags(supabase, stackId),
  ]);
  return { stack, items, flags };
}
