// Infrastructure — identity-cards (v9). Assembles the pure-engine IdentityContext
// from EXISTING RLS-scoped repos. Design Ref: §2.3, §9.4 — reuses getProfile /
// listStacks / listItems / listLabMarkers read-only; NO new business logic, NO new
// table. Mirrors the advisor's context-loader pattern. Plan SC8/SC9.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/db/profile-repo";
import { listStacks } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { listCheckins } from "@/lib/db/checkin-repo";
import { computeConsistency } from "@/lib/checkin";
import { PROFILE_FIELD_COUNT } from "./traits";
import type { UserProfile } from "@/types/profile";
import type { IdentityContext } from "@/types/identity";

/**
 * How many of the PROFILE_FIELD_COUNT core fields the user has filled — the
 * dataDepth completeness input (traits.ts). Kept in sync with PROFILE_FIELD_COUNT.
 */
function filledFieldCount(p: UserProfile): number {
  const filled = [
    p.goals.length > 0,
    p.diet !== null && p.diet.trim().length > 0,
    p.riskTolerance !== null,
    p.allergies.length > 0,
    p.medications.length > 0,
    p.experienceLevel !== null,
  ].filter(Boolean).length;
  return Math.min(filled, PROFILE_FIELD_COUNT);
}

/**
 * Load everything the identity engine needs, RLS-scoped to `userId`. Items are
 * fetched per stack (identity spans ALL stacks, unlike the advisor's active-stack
 * loader). All reads run in parallel; the returned shape is plain data so the
 * pure engine never touches I/O.
 */
export async function loadIdentityContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<IdentityContext> {
  const [profile, stacks, labMarkers, checkins] = await Promise.all([
    getProfile(supabase, userId),
    listStacks(supabase, userId),
    listLabMarkers(supabase, userId),
    listCheckins(supabase, userId),
  ]);

  const stacksWithItems = await Promise.all(
    stacks.map(async (s) => {
      const items = await listItems(supabase, s.id);
      return {
        stackId: s.id,
        name: s.name,
        intent: s.intent,
        itemSupplementIds: items.map((it) => it.supplementId),
      };
    }),
  );

  return {
    profile: profile
      ? {
          goals: profile.goals,
          riskTolerance: profile.riskTolerance,
          experienceLevel: profile.experienceLevel,
          filledFieldCount: filledFieldCount(profile),
        }
      : null,
    stacks: stacksWithItems,
    hasLabs: labMarkers.length > 0,
    // daily-checkin v10: consistency feeds dataDepth (Design §5, Plan SC8).
    checkinConsistency: computeConsistency(checkins).checkinRate,
  };
}
