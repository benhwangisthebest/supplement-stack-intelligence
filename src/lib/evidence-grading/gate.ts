// Domain layer — PURE. The gate for Grade B (Phase 4 U5; owner ruling D-2 (c)).
// FU-61: the composite alone can grade a well-studied null effect B, because 55% of the weight
// is humanEvidence and studyQuality. A gate adds per-dimension floors that a B-or-better
// composite must also clear. U5 (a) carried four candidate rules, report-only. [2026-09-26, U5 (b);
// owner batch] The owner chose G1 (effectSize ≥ 1): B_GATE below is the rule deriveGrade applies
// (./index), as a CAP at C, not a one-letter drop. The other three candidates stay here only as
// data for the report script (scripts/evidence-gate-report.mjs). FU-74: an R5 zero on the gated
// dimension fails the gate (see `gatedScore`).
// Reads no seed data; callers hand it profiles. It imports ./index, which imports it back: nothing
// here calls into ./index at module load, only inside functions, so the cycle is safe either way.
import type { EvidenceGrade } from "@/types";
import type {
  DimensionRating,
  EvidenceDimension,
  EvidenceProfile,
} from "@/types/evidence-grading";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import { compositeGrade, compositeScore } from "./index";
import { DIMENSION_LABELS } from "./weights";

/** A candidate gate: the minimum score each named dimension must reach. */
export interface BGateRule {
  id: string;
  floors: Partial<Record<EvidenceDimension, DimensionRating>>;
}

/** The chosen gate (owner batch 2026-09-26): G1, effectSize ≥ 1. deriveGrade applies this and no other. */
export const B_GATE: BGateRule = { id: "G1", floors: { effectSize: 1 } };

/** The owner's four candidates (U5 brief, 2026-09-25), for the report only. G1 is B_GATE itself. */
export const CANDIDATE_RULES: readonly BGateRule[] = [
  B_GATE,
  { id: "G2", floors: { effectSize: 2 } },
  { id: "G3", floors: { effectSize: 1, consistency: 2 } },
  { id: "G4", floors: { effectSize: 1, consistency: 1 } },
];

export interface BGateResult {
  /** True when the rule does not apply (composite below B) or every floor is met. */
  passes: boolean;
  /** Dimensions under their floor, in EVIDENCE_DIMENSIONS order. */
  failing: EvidenceDimension[];
  /** Why each failing dimension failed, aligned with `failing`. "Not assessed" never reads as a 0. */
  reasons: string[];
  /** The paperIds cited by the failing dimensions, de-duplicated, in order. */
  ratingsCited: string[];
}

const GATED: readonly EvidenceGrade[] = ["A", "B"];

/**
 * The score the gate reads. FU-74 (owner batch 2026-09-26): a dimension that cites no paper is
 * NOT ASSESSED, and R5 scores it 0 whatever number was authored, so it fails any floor. Without
 * this clause an uncited dimension carrying an authored score would pass on a number no paper
 * supports. G6 (src/data/seed-integrity.test.ts) keeps the seed from authoring one; this keeps
 * the gate from trusting one.
 */
function gatedScore(profile: EvidenceProfile, d: EvidenceDimension): number {
  const dim = profile.dimensions[d];
  return dim.paperIds.length === 0 ? 0 : dim.score;
}

function reason(profile: EvidenceProfile, d: EvidenceDimension, floor: DimensionRating): string {
  const label = DIMENSION_LABELS[d];
  return profile.dimensions[d].paperIds.length === 0
    ? `${label} not assessed: no cited paper, so R5 scores it 0 (FU-74)`
    : `${label} ${profile.dimensions[d].score} is below the floor of ${floor}`;
}

/** Apply one rule to one profile. A rule applies only to a composite of B or better. */
export function applyBGate(profile: EvidenceProfile, rule: BGateRule): BGateResult {
  if (!GATED.includes(compositeGrade(profile))) {
    return { passes: true, failing: [], reasons: [], ratingsCited: [] };
  }
  const failing = EVIDENCE_DIMENSIONS.filter((d) => {
    const floor = rule.floors[d];
    return floor !== undefined && gatedScore(profile, d) < floor;
  });
  const reasons = failing.map((d) => reason(profile, d, rule.floors[d]!));
  const ratingsCited = [...new Set(failing.flatMap((d) => profile.dimensions[d].paperIds))];
  return { passes: failing.length === 0, failing, reasons, ratingsCited };
}

/** One letter down, for the report only: A → B, B → C. */
const ONE_DOWN: Partial<Record<EvidenceGrade, EvidenceGrade>> = { A: "B", B: "C" };

export interface GateMove {
  id: string;
  storedGrade: EvidenceGrade;
  composite: number;
  scores: Record<EvidenceDimension, DimensionRating>;
  movedTo: EvidenceGrade;
  failing: {
    dimension: EvidenceDimension;
    score: DimensionRating;
    floor: DimensionRating;
    rationale: string;
    paperIds: string[];
  }[];
}

/**
 * Every effect a rule would move, in input order, for the report. The move is one letter down
 * from the composite's own letter, and the stored grade is carried beside it so a reader can
 * compare the two.
 */
export function gateMoves(
  effects: readonly { id: string; grade: EvidenceGrade; evidenceProfile: EvidenceProfile }[],
  rule: BGateRule,
): GateMove[] {
  const moves: GateMove[] = [];
  for (const e of effects) {
    const p = e.evidenceProfile;
    const result = applyBGate(p, rule);
    if (result.passes) continue;
    moves.push({
      id: e.id,
      storedGrade: e.grade,
      composite: compositeScore(p),
      scores: Object.fromEntries(
        EVIDENCE_DIMENSIONS.map((d) => [d, p.dimensions[d].score]),
      ) as Record<EvidenceDimension, DimensionRating>,
      movedTo: ONE_DOWN[compositeGrade(p)]!,
      failing: result.failing.map((d) => ({
        dimension: d,
        score: p.dimensions[d].score,
        floor: rule.floors[d]!,
        rationale: p.dimensions[d].rationale,
        paperIds: p.dimensions[d].paperIds,
      })),
    });
  }
  return moves;
}
