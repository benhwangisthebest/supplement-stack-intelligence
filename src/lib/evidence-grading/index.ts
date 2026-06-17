// Domain layer — PURE, deterministic evidence-grading engine (Design §2.1, §4).
// Plan SC: composite + derived grade + per-dimension breakdown from a curated
// evidenceProfile. No I/O. Mirrors the lib/biomarkers / lib/lab-trends pattern.
import type { EvidenceGrade } from "@/types";
import type {
  DimensionBreakdown,
  EvidenceProfile,
} from "@/types/evidence-grading";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import {
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  MAX_RATING,
  RATING_LABELS,
} from "./weights";

export {
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  DIMENSION_LABELS,
  RATING_LABELS,
} from "./weights";

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
  return sum;
}

/** Map the composite to an A/B/C/D grade via fixed descending thresholds. */
export function deriveGrade(profile: EvidenceProfile): EvidenceGrade {
  const composite = compositeScore(profile);
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (composite >= min) return grade;
  }
  return "D"; // unreachable (last threshold is 0)
}

/** Per-dimension view for the Library UI (label, rating word, rationale, papers). */
export function gradeBreakdown(profile: EvidenceProfile): DimensionBreakdown[] {
  return EVIDENCE_DIMENSIONS.map((dimension) => {
    const d = profile.dimensions[dimension];
    return {
      dimension,
      label: DIMENSION_LABELS[dimension],
      score: d.score,
      ratingLabel: RATING_LABELS[d.score],
      rationale: d.rationale,
      paperIds: d.paperIds,
    };
  });
}

/**
 * Shape validation: every dimension present with a valid ordinal score and a
 * non-empty rationale. (Citation integrity vs SEED_PAPERS is checked separately
 * where the paper registry is available.)
 */
export function validateProfile(profile: EvidenceProfile): boolean {
  if (!profile || typeof profile !== "object" || !profile.dimensions) return false;
  for (const dimension of EVIDENCE_DIMENSIONS) {
    const d = profile.dimensions[dimension];
    if (!d) return false;
    if (![0, 1, 2, 3].includes(d.score)) return false;
    if (typeof d.rationale !== "string" || d.rationale.trim() === "") return false;
    if (!Array.isArray(d.paperIds)) return false;
  }
  return true;
}
