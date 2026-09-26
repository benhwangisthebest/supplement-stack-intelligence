// Domain — PURE. The grading rubric constants (Design §3.3). Tunable here only.
// SAFETY/TRUST: every seed grade is DERIVED from its profile by these weights and
// thresholds (G4, src/data/seed-integrity.test.ts). The letters follow the rubric,
// not the reverse. Changing a weight or threshold is a grading change for every effect.
// [2026-09-25, Phase 4 U5; FU-71, a DOCUMENTED LIMIT, kept by ruling D-2] studyQuality is scored
// under owner ruling R17 (docs/01-plan/phase-3-evidence-grounding.plan.md:248). Its size clause
// subtracts 1 only when the abstract itself flags a small sample, so it follows the authors'
// wording, not a participant count: an unflagged small study keeps 2 (l-theanine-stress, 12
// participants), a flagged one scores 1 (creatine-cognition). No objective threshold exists.
// [2026-09-26, Phase 4 U5 (b); FU-74, owner batch] R5: a dimension that cites no paper scores 0
// and is NOT ASSESSED. These weights and thresholds give the composite; the B gate (./gate.ts,
// rule G1: effectSize ≥ 1) then caps an A or B composite at C when it fails. FU-74 ruled that
// an R5 zero on the gated dimension counts as failing, so the gate reads an uncited effectSize
// as 0 whatever was authored, and its failure reason says "not assessed", never "effect size 0".
import type { EvidenceDimension, DimensionRating } from "@/types/evidence-grading";
import type { EvidenceGrade } from "@/types";

/** Per-dimension weights — must sum to 1.0 (asserted in tests). */
export const DIMENSION_WEIGHTS: Record<EvidenceDimension, number> = {
  humanEvidence: 0.3,
  studyQuality: 0.25,
  consistency: 0.2,
  effectSize: 0.15,
  populationRelevance: 0.1,
};

/** Highest rating on the ordinal scale (none=0 … strong=3). */
export const MAX_RATING = 3;

/**
 * Composite → grade thresholds, descending. composite ∈ [0,1].
 * ≥.75 A · ≥.55 B · ≥.35 C · else D.
 */
export const GRADE_THRESHOLDS: { min: number; grade: EvidenceGrade }[] = [
  { min: 0.75, grade: "A" },
  { min: 0.55, grade: "B" },
  { min: 0.35, grade: "C" },
  { min: 0.0, grade: "D" },
];

/** Human-readable dimension labels (UI). */
export const DIMENSION_LABELS: Record<EvidenceDimension, string> = {
  humanEvidence: "Human evidence",
  studyQuality: "Study quality",
  consistency: "Consistency",
  effectSize: "Effect size",
  populationRelevance: "Population relevance",
};

/** Rating word per ordinal score (UI). */
export const RATING_LABELS: Record<DimensionRating, string> = {
  0: "none",
  1: "weak",
  2: "moderate",
  3: "strong",
};
