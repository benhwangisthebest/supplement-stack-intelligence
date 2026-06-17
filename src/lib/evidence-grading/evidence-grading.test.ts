import { describe, expect, it } from "vitest";
import { SEED_EFFECTS } from "@/data/seed-effects";
import { SEED_PAPERS } from "@/data/seed-papers";
import { containsBannedLanguage } from "@/lib/safety";
import { EVIDENCE_DIMENSIONS } from "@/types/evidence-grading";
import type { EvidenceProfile } from "@/types/evidence-grading";
import {
  compositeScore,
  deriveGrade,
  gradeBreakdown,
  validateProfile,
  DIMENSION_WEIGHTS,
} from "./index";

function profile(
  h: number,
  q: number,
  c: number,
  e: number,
  p: number,
): EvidenceProfile {
  const d = (score: number): { score: 0 | 1 | 2 | 3; rationale: string; paperIds: string[] } => ({
    score: score as 0 | 1 | 2 | 3,
    rationale: "x",
    paperIds: [],
  });
  return {
    dimensions: {
      humanEvidence: d(h),
      studyQuality: d(q),
      consistency: d(c),
      effectSize: d(e),
      populationRelevance: d(p),
    },
  };
}

describe("weights", () => {
  it("dimension weights sum to 1.0", () => {
    const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe("compositeScore", () => {
  it("computes the weighted average over MAX_RATING", () => {
    // all strong (3) → 1.0
    expect(compositeScore(profile(3, 3, 3, 3, 3))).toBeCloseTo(1.0, 10);
    // all none (0) → 0
    expect(compositeScore(profile(0, 0, 0, 0, 0))).toBe(0);
    // hand-computed: .30*3 + .25*3 + .20*3 + .15*3 + .10*2 = 2.9 → /3 = .9667
    expect(compositeScore(profile(3, 3, 3, 3, 2))).toBeCloseTo(2.9 / 3, 6);
  });

  it("is deterministic", () => {
    const p = profile(2, 2, 2, 1, 2);
    expect(compositeScore(p)).toBe(compositeScore(p));
  });
});

describe("deriveGrade thresholds", () => {
  it("maps composites to A/B/C/D at the boundaries", () => {
    expect(deriveGrade(profile(3, 3, 3, 3, 2))).toBe("A"); // .967
    expect(deriveGrade(profile(2, 2, 2, 1, 2))).toBe("B"); // .617
    expect(deriveGrade(profile(2, 1, 1, 1, 2))).toBe("C"); // .367
    expect(deriveGrade(profile(0, 0, 1, 0, 0))).toBe("D"); // .067
  });
});

describe("gradeBreakdown", () => {
  it("returns one row per dimension with label, rating word, rationale, papers", () => {
    const rows = gradeBreakdown(profile(3, 2, 2, 1, 0));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      dimension: "humanEvidence",
      label: "Human evidence",
      score: 3,
      ratingLabel: "strong",
    });
    expect(rows.find((r) => r.dimension === "populationRelevance")!.ratingLabel).toBe("none");
  });
});

describe("validateProfile", () => {
  it("accepts a complete profile", () => {
    expect(validateProfile(profile(2, 2, 2, 2, 2))).toBe(true);
  });
  it("rejects a missing dimension", () => {
    const broken = profile(2, 2, 2, 2, 2);
    // @ts-expect-error — intentionally remove a dimension
    delete broken.dimensions.studyQuality;
    expect(validateProfile(broken)).toBe(false);
  });
  it("rejects an out-of-range score", () => {
    const broken = profile(2, 2, 2, 2, 2);
    // @ts-expect-error — intentionally invalid score
    broken.dimensions.effectSize.score = 5;
    expect(validateProfile(broken)).toBe(false);
  });
  it("rejects an empty rationale", () => {
    const broken = profile(2, 2, 2, 2, 2);
    broken.dimensions.consistency.rationale = "  ";
    expect(validateProfile(broken)).toBe(false);
  });
});

describe("seed integrity (Plan SC-5/6)", () => {
  const paperIds = new Set(SEED_PAPERS.map((p) => p.id));
  const profiled = SEED_EFFECTS.filter((e) => e.evidenceProfile);

  it("seeds at least 6 profiled effects across ≥4 supplements spanning A/B/C", () => {
    expect(profiled.length).toBeGreaterThanOrEqual(6);
    expect(new Set(profiled.map((e) => e.supplementId)).size).toBeGreaterThanOrEqual(4);
    const grades = new Set(profiled.map((e) => e.grade));
    expect(grades.has("A")).toBe(true);
    expect(grades.has("B")).toBe(true);
    expect(grades.has("C")).toBe(true);
  });

  it("every profiled effect is structurally valid", () => {
    for (const e of profiled) expect(validateProfile(e.evidenceProfile!)).toBe(true);
  });

  it("derived grade matches each effect's curated grade (honesty)", () => {
    for (const e of profiled) {
      expect(deriveGrade(e.evidenceProfile!), `${e.id}`).toBe(e.grade);
    }
  });

  it("every cited paperId references a real seed paper", () => {
    for (const e of profiled) {
      for (const dim of EVIDENCE_DIMENSIONS) {
        for (const pid of e.evidenceProfile!.dimensions[dim].paperIds) {
          expect(paperIds.has(pid), `${e.id}/${dim}:${pid}`).toBe(true);
        }
      }
    }
  });

  it("dimension rationales are non-diagnostic", () => {
    for (const e of profiled) {
      for (const dim of EVIDENCE_DIMENSIONS) {
        expect(containsBannedLanguage(e.evidenceProfile!.dimensions[dim].rationale)).toBe(false);
      }
    }
  });
});
