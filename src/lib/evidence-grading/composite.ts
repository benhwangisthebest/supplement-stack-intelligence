// Domain layer — PURE. The composite score and the letter it reaches (Design §2.1, §4).
// [2026-09-29, Phase 4 U20; FU-75] Moved here from ./index so the B gate (./gate) can read the
// composite without importing ./index, which imports the gate back. Both import this module;
// it imports neither. ./index re-exports both functions, so its public surface is unchanged.
import type { EvidenceGrade } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import { DIMENSION_WEIGHTS, GRADE_THRESHOLDS, MAX_RATING } from "./weights";

/**
 * Precision the composite is rounded to (Phase 3 U4, finding F-1). Summed in
 * floating point, a composite that is exactly a threshold can come out a hair below
 * it, depending on the order of the terms: scores (2,1,1,2,3) are exactly .55 but
 * summed to 0.5499999999999999 and derived C. Rounding to 1e-9, far finer than the
 * rubric's smallest step (1/300), makes every reachable composite the double nearest
 * its exact value, so the grade cannot depend on summation order.
 */
const COMPOSITE_PRECISION = 1e9;

/**
 * Weighted composite score ∈ [0,1]:  Σ_d  weight[d] × (score[d] / MAX_RATING).
 * Deterministic; identical profile → identical score.
 */
export function compositeScore(profile: EvidenceProfile): number {
  let sum = 0;
  for (const dimension of EVIDENCE_DIMENSIONS) {
    const { score } = profile.dimensions[dimension];
    sum += DIMENSION_WEIGHTS[dimension] * (score / MAX_RATING);
  }
  return Math.round(sum * COMPOSITE_PRECISION) / COMPOSITE_PRECISION;
}

/** The letter the composite alone reaches, via fixed descending thresholds. The B gate reads this. */
export function compositeGrade(profile: EvidenceProfile): EvidenceGrade {
  const composite = compositeScore(profile);
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (composite >= min) return grade;
  }
  return "D"; // unreachable (last threshold is 0)
}
