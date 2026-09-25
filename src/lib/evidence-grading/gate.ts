// Domain layer — PURE. A REPORT-ONLY gate for Grade B (Phase 4 U5 (a); owner ruling D-2 (c)).
// FU-61: the composite alone can grade a well-studied null effect B, because 55% of the weight
// is humanEvidence and studyQuality. A gate adds per-dimension floors that a B-or-better
// composite must also clear. Which floor is the OWNER's number, so this module carries the
// candidate rules and reports what each would move. It is NOT wired into deriveGrade:
// no stored letter changes here, and G4b (src/data/seed-integrity.test.ts) stays as it was.
// Reads no seed data; callers hand it profiles.
import type { EvidenceGrade } from "@/types";
import type {
  DimensionRating,
  EvidenceDimension,
  EvidenceProfile,
} from "@/types/evidence-grading";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import { compositeScore, deriveGrade } from "./index";

/** A candidate gate: the minimum score each named dimension must reach. */
export interface BGateRule {
  id: string;
  floors: Partial<Record<EvidenceDimension, DimensionRating>>;
}

/** The owner's four candidates (U5 brief, 2026-09-25). Add none, remove none. */
export const CANDIDATE_RULES: readonly BGateRule[] = [
  { id: "G1", floors: { effectSize: 1 } },
  { id: "G2", floors: { effectSize: 2 } },
  { id: "G3", floors: { effectSize: 1, consistency: 2 } },
  { id: "G4", floors: { effectSize: 1, consistency: 1 } },
];

export interface BGateResult {
  /** True when the rule does not apply (composite below B) or every floor is met. */
  passes: boolean;
  /** Dimensions scoring under their floor, in EVIDENCE_DIMENSIONS order. */
  failing: EvidenceDimension[];
  /** The paperIds cited by the failing dimensions, de-duplicated, in order. */
  ratingsCited: string[];
}

const GATED: readonly EvidenceGrade[] = ["A", "B"];

/** Apply one rule to one profile. A rule applies only to a composite of B or better. */
export function applyBGate(profile: EvidenceProfile, rule: BGateRule): BGateResult {
  if (!GATED.includes(deriveGrade(profile))) {
    return { passes: true, failing: [], ratingsCited: [] };
  }
  const failing = EVIDENCE_DIMENSIONS.filter((d) => {
    const floor = rule.floors[d];
    return floor !== undefined && profile.dimensions[d].score < floor;
  });
  const ratingsCited = [...new Set(failing.flatMap((d) => profile.dimensions[d].paperIds))];
  return { passes: failing.length === 0, failing, ratingsCited };
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
 * Every effect a rule would move, in input order. The move is computed from the profile's
 * composite, and the stored grade is carried beside it so a reader can compare the two.
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
      movedTo: ONE_DOWN[deriveGrade(p)]!,
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
