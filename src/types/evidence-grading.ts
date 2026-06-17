import type { EvidenceGrade } from "./index";

// Domain — effect-level, multi-dimensional evidence grading (Design §3.1).
// Plan SC: replace an opaque single letter with a transparent, traceable,
// dimension-scored judgment from which the A/B/C/D grade is DERIVED.

/** The independent questions a single grade collapses (Design §3.1). */
export type EvidenceDimension =
  | "humanEvidence" // human (vs animal/in-vitro) evidence strength
  | "studyQuality" // RCT / blinding / size / risk-of-bias
  | "consistency" // agreement of findings across studies
  | "effectSize" // magnitude / practical relevance
  | "populationRelevance"; // applicability to the general/target population

export const EVIDENCE_DIMENSIONS: readonly EvidenceDimension[] = [
  "humanEvidence",
  "studyQuality",
  "consistency",
  "effectSize",
  "populationRelevance",
] as const;

/** Ordinal rating per dimension: none / weak / moderate / strong. */
export type DimensionRating = 0 | 1 | 2 | 3;

/** A curated rating for one dimension, traced to the papers that justify it. */
export interface DimensionScore {
  score: DimensionRating;
  rationale: string; // short, factual, non-diagnostic
  paperIds: string[]; // seed papers justifying THIS dimension (citations)
}

/** The full per-effect profile. Optional on Effect (absent = legacy behavior). */
export interface EvidenceProfile {
  dimensions: Record<EvidenceDimension, DimensionScore>;
}

/** Per-dimension view handed to the Library UI (Design §5). */
export interface DimensionBreakdown {
  dimension: EvidenceDimension;
  label: string; // "Human evidence"
  score: DimensionRating;
  ratingLabel: string; // none | weak | moderate | strong
  rationale: string;
  paperIds: string[];
}

/** Re-export for convenience at call sites that also need the derived grade. */
export type { EvidenceGrade };
