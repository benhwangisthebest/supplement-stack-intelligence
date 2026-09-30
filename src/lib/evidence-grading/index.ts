// Domain layer — PURE, deterministic evidence-grading engine (Design §2.1, §4).
// Plan SC: composite + derived grade + per-dimension breakdown from a curated
// evidenceProfile. No I/O. Mirrors the lib/biomarkers / lib/lab-trends pattern.
import type { EvidenceGrade } from "@/types";
import type {
  DimensionBreakdown,
  EvidenceProfile,
} from "@/types/evidence-grading";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import { compositeGrade } from "./composite";
import { applyBGate, B_GATE } from "./gate";
import { DIMENSION_LABELS, RATING_LABELS } from "./weights";

// [2026-09-29, Phase 4 U20; FU-75] The composite lives in ./composite, which ./gate also reads,
// so this module and the gate no longer import each other. Re-exported: the surface is unchanged.
export { compositeGrade, compositeScore } from "./composite";

export {
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  DIMENSION_LABELS,
  RATING_LABELS,
} from "./weights";

/**
 * The grade: the composite's letter, CAPPED AT C when the B gate fails (Phase 4 U5 (b), owner
 * batch 2026-09-26: rule G1, effectSize ≥ 1; FU-61). The gate applies only to an A or B
 * composite, so C and D pass through unchanged, and a failing A or B becomes C, not one letter
 * down. Closes FU-61: a well-studied null (effectSize 0) no longer reaches B.
 */
export function deriveGrade(profile: EvidenceProfile): EvidenceGrade {
  const grade = compositeGrade(profile);
  return applyBGate(profile, B_GATE).passes ? grade : "C";
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
