// Infrastructure layer — assemble AdvisorContext from the user's own data, using
// the existing read repos (Design §3.2). Read-only; the client can never inject
// this context. Keeps the module-3 API route thin.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/db/profile-repo";
import { listStacks } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { listTimelinePoints } from "@/lib/db/lab-panel-repo";
import type { AdvisorContext } from "@/types/advisor";
import type { Stack } from "@/types";

/**
 * Build the per-turn context: profile + the user's active CURRENT stack (most
 * recent) + its items + lab markers + canonical timeline points. Each piece is
 * independently nullable/empty — the tools report ok:false when their slice is
 * missing, which drives honest refusals rather than errors.
 */
export async function loadAdvisorContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdvisorContext> {
  const [profile, stacks, labMarkers, timelinePoints] = await Promise.all([
    getProfile(supabase, userId),
    listStacks(supabase, userId),
    listLabMarkers(supabase, userId),
    listTimelinePoints(supabase, userId),
  ]);

  const stack = pickActiveStack(stacks);
  const stackItems = stack ? await listItems(supabase, stack.id) : [];

  return { userId, profile, stack, stackItems, labMarkers, timelinePoints };
}

/** The most recent "current" stack, falling back to the most recent of any mode. */
export function pickActiveStack(stacks: Stack[]): Stack | null {
  if (stacks.length === 0) return null;
  // listStacks returns created_at desc, so the first match is the most recent.
  return stacks.find((s) => s.mode === "current") ?? stacks[0];
}
