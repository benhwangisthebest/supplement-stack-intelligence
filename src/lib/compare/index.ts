// Domain layer — PURE. Goal-coverage comparison (Design §4.2 /compare).
import { defaultLibrary, getEffectsForSupplement, type EvidenceLibrary } from "@/lib/evidence";
import type { OutcomeCategory, StackItem, UserProfile } from "@/types";

export interface CompareResult {
  goals: OutcomeCategory[];
  coveredGoals: OutcomeCategory[];
  uncoveredGoals: OutcomeCategory[];
  itemsByGoal: Record<string, string[]>; // goal -> supplement ids covering it
}

/**
 * Compares a stack's items against the profile's goals: which goals have at least
 * one supporting supplement (by effect outcomeCategory) and which are uncovered.
 */
export function computeCompare(
  goals: OutcomeCategory[],
  items: StackItem[],
  library: EvidenceLibrary = defaultLibrary,
): CompareResult {
  const itemsByGoal: Record<string, string[]> = {};
  for (const goal of goals) itemsByGoal[goal] = [];

  for (const item of items) {
    if (!item.supplementId) continue;
    const categories = new Set(
      getEffectsForSupplement(item.supplementId, library).map((e) => e.outcomeCategory),
    );
    for (const goal of goals) {
      if (categories.has(goal)) itemsByGoal[goal].push(item.supplementId);
    }
  }

  const coveredGoals = goals.filter((g) => itemsByGoal[g].length > 0);
  const uncoveredGoals = goals.filter((g) => itemsByGoal[g].length === 0);
  return { goals, coveredGoals, uncoveredGoals, itemsByGoal };
}

export function compareFromProfile(
  profile: UserProfile | null,
  items: StackItem[],
  library: EvidenceLibrary = defaultLibrary,
): CompareResult {
  return computeCompare(profile?.goals ?? [], items, library);
}
