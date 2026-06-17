// Domain — PURE. The grading rubric constants (Design §3.3). Tunable here only.
// SAFETY/TRUST: thresholds are curated so the DERIVED grade reproduces curated
// intent for every seeded profile (integrity-tested).
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
