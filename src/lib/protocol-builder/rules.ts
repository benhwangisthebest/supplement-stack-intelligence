// Domain layer — PURE. Protocol generation rules (Design §11.4).
// Imports only lib/evidence, lib/safety, lib/interactions, lib/biomarkers, and types.
import { hasMedicationInteraction } from "@/lib/interactions";
import { biomarkersForSupplement } from "@/lib/biomarkers";
import { safetyCopy } from "@/lib/safety";
import type {
  EvidenceGrade,
  ItemTiming,
  OutcomeCategory,
  ProtocolTier,
  Supplement,
} from "@/types";
import type { TrendSignal } from "@/types/lab";

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

// lab-timeline v4 — bounded trajectory nudge to the lab signal. Per relevant
// biomarker; total clamped so trends inform but never dominate ranking.
export const TREND_NUDGE = 0.2;

/**
 * Adjustment to a supplement's lab signal from its relevant biomarkers' trends.
 * A worsening marker (moving away from range) nudges the supplement UP (more
 * likely relevant); an improving marker nudges it DOWN. Total bounded to
 * ±TREND_NUDGE. Pure & deterministic. Returns an explainable note for the top
 * contributor, or null.
 */
export function trendAdjustment(
  supplementId: string,
  trends: TrendSignal[],
): { delta: number; note: string | null } {
  if (trends.length === 0) return { delta: 0, note: null };
  const byId = new Map(trends.map((t) => [t.biomarkerId, t]));

  let delta = 0;
  let note: string | null = null;
  let topAbs = 0;

  for (const { rule } of biomarkersForSupplement(supplementId)) {
    // Trajectory framing is clearest for deficiency-support rules; caution rules
    // (supplement could push an already-high marker further) are left to v5.
    if (rule.relation !== "support") continue;
    const trend = byId.get(rule.biomarkerId);
    if (!trend || trend.pctChange === null) continue;
    if (trend.direction !== "rising" && trend.direction !== "falling") continue;

    const improving =
      rule.trigger === "low"
        ? trend.direction === "rising"
        : trend.direction === "falling";
    const contribution = improving ? -TREND_NUDGE : TREND_NUDGE;
    delta += contribution;
    if (Math.abs(contribution) >= topAbs) {
      topAbs = Math.abs(contribution);
      note = safetyCopy.protocolTrendNote(
        trend.biomarkerName,
        improving ? "improving" : "worsening",
      );
    }
  }

  return { delta: Math.max(-TREND_NUDGE, Math.min(TREND_NUDGE, delta)), note };
}

// Grade rank for ordering (A strongest).
const GRADE_RANK: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1 };

/**
 * Ranking comparator within a goal group:
 *   1. higher lab signal first (biomarker-intelligence v3)
 *   2. then higher grade
 *   3. then higher check-in FEEDBACK (daily-checkin v10 — Design §2.0 Option C:
 *      strictly BELOW grade, so self-reported feedback can only break ties within
 *      an equal grade and can never override evidence; Plan SC5)
 *   4. then higher composite (evidence-grading v5 — refines within equal grade)
 *   5. then alphabetical by name (stable, deterministic)
 */
export function compareSuggestions(
  a: { labSignal?: number; grade: EvidenceGrade; feedback?: number; composite?: number; supplementName: string },
  b: { labSignal?: number; grade: EvidenceGrade; feedback?: number; composite?: number; supplementName: string },
): number {
  const sa = a.labSignal ?? 0;
  const sb = b.labSignal ?? 0;
  if (sa !== sb) return sb - sa;
  if (a.grade !== b.grade) return GRADE_RANK[b.grade] - GRADE_RANK[a.grade];
  const fa = a.feedback ?? 0;
  const fb = b.feedback ?? 0;
  if (fa !== fb) return fb - fa;
  const ca = a.composite ?? -1;
  const cb = b.composite ?? -1;
  if (ca !== cb) return cb - ca;
  return a.supplementName.localeCompare(b.supplementName);
}
