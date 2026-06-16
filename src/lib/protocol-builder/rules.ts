// Domain layer — PURE. Protocol generation rules (Design §11.4).
// Imports only lib/evidence, lib/safety, lib/interactions, and types.
import { hasMedicationInteraction } from "@/lib/interactions";
import type {
  EvidenceGrade,
  ItemTiming,
  OutcomeCategory,
  ProtocolTier,
  Supplement,
} from "@/types";

// Default timing suggestion per goal (heuristic; null when no clear default).
const TIMING_BY_GOAL: Partial<Record<OutcomeCategory, ItemTiming>> = {
  sleep: "bedtime",
  stress: "evening",
  recovery: "evening",
  focus: "morning",
  training: "pre-workout",
};

export function timingForGoal(goal: OutcomeCategory): ItemTiming | null {
  return TIMING_BY_GOAL[goal] ?? null;
}

/** Tier from evidence grade + whether the supplement is tagged foundational. */
export function tierFor(grade: EvidenceGrade, tags: string[]): ProtocolTier {
  if (grade === "A") {
    return tags.map((t) => t.toLowerCase()).includes("foundational")
      ? "foundational"
      : "targeted";
  }
  if (grade === "B") return "targeted";
  if (grade === "C") return "advanced";
  return "experimental"; // D
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Lab prioritization moved to lib/biomarkers `labBoost` (biomarker-intelligence v3);
// the v1 string-match `isLabBoosted` is removed.

export function hasAllergenConflict(supp: Supplement, allergies: string[]): boolean {
  const set = new Set(allergies.map(norm));
  return supp.allergenTags.some((t) => set.has(norm(t)));
}

/**
 * Real medication-interaction check (medication-interactions v2).
 * Delegates to the pure engine — replaces the v1 hardcoded MED_CAUTION_IDS set.
 */
export function hasMedicationCaution(
  supplementId: string,
  medications: string[],
): boolean {
  return hasMedicationInteraction(supplementId, medications);
}

// Grade rank for ordering (A strongest).
const GRADE_RANK: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1 };

/**
 * Ranking comparator within a goal group (biomarker-intelligence v3):
 *   1. higher lab signal first (deficiency boosts; replete/caution demotes)
 *   2. then higher grade
 *   3. then alphabetical by name (stable, deterministic)
 */
export function compareSuggestions(
  a: { labSignal?: number; grade: EvidenceGrade; supplementName: string },
  b: { labSignal?: number; grade: EvidenceGrade; supplementName: string },
): number {
  const sa = a.labSignal ?? 0;
  const sb = b.labSignal ?? 0;
  if (sa !== sb) return sb - sa;
  if (a.grade !== b.grade) return GRADE_RANK[b.grade] - GRADE_RANK[a.grade];
  return a.supplementName.localeCompare(b.supplementName);
}
