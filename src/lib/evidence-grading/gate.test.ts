import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EvidenceGrade } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { compositeGrade, compositeScore, deriveGrade } from "./index";
import { applyBGate, B_GATE, CANDIDATE_RULES, gateMoves } from "./gate";

// Phase 4 U5, D-2 (c): the gate for Grade B. (a) carried four candidates, report-only. (b), owner
// batch 2026-09-26: B_GATE is G1, and deriveGrade caps a failing A or B composite at C.

function profile(
  h: number,
  q: number,
  c: number,
  e: number,
  p: number,
  cite: (dim: string) => string[] = (dim) => [`p-${dim}`], // cited by default: R5 is met
): EvidenceProfile {
  const d = (dim: string, score: number) => ({
    score: score as 0 | 1 | 2 | 3,
    rationale: `${dim} rationale`,
    paperIds: cite(dim),
  });
  return {
    dimensions: {
      humanEvidence: d("humanEvidence", h),
      studyQuality: d("studyQuality", q),
      consistency: d("consistency", c),
      effectSize: d("effectSize", e),
      populationRelevance: d("populationRelevance", p),
    },
  };
}

const effect = (id: string, evidenceProfile: EvidenceProfile) => ({
  id,
  grade: compositeGrade(evidenceProfile) as EvidenceGrade, // the composite letter, as (a) listed it
  evidenceProfile,
});

describe("CANDIDATE_RULES — the owner's four, unchanged", () => {
  it("is exactly G1…G4 with their floors", () => {
    expect(CANDIDATE_RULES).toEqual([
      { id: "G1", floors: { effectSize: 1 } },
      { id: "G2", floors: { effectSize: 2 } },
      { id: "G3", floors: { effectSize: 1, consistency: 2 } },
      { id: "G4", floors: { effectSize: 1, consistency: 1 } },
    ]);
  });
});

describe("the planted well-studied null (the U5 row's red proof)", () => {
  // Strong, consistent, relevant human evidence of NO benefit: effectSize 0 (R13).
  const nullA = profile(3, 3, 3, 0, 2);
  const nullB = profile(3, 3, 1, 0, 2);

  it("reach A and B on the composite alone", () => {
    expect(compositeScore(nullA)).toBeCloseTo(0.817, 3);
    expect(compositeGrade(nullA)).toBe("A");
    expect(compositeScore(nullB)).toBeCloseTo(0.683, 3);
    expect(compositeGrade(nullB)).toBe("B");
  });

  for (const rule of CANDIDATE_RULES) {
    it(`${rule.id} lists both planted profiles as moved`, () => {
      const moved = gateMoves(
        [effect("planted-null-a", nullA), effect("planted-null-b", nullB)],
        rule,
      );
      expect(moved.map((m) => `${m.id} ${m.storedGrade}→${m.movedTo}`)).toEqual([
        "planted-null-a A→B",
        "planted-null-b B→C",
      ]);
      expect(moved.every((m) => m.failing.some((f) => f.dimension === "effectSize"))).toBe(true);
    });
  }
});

describe("applyBGate", () => {
  it("does not apply below B: a C composite with effectSize 0 passes", () => {
    const c = profile(2, 1, 1, 0, 2);
    expect(deriveGrade(c)).toBe("C");
    for (const rule of CANDIDATE_RULES) {
      expect(applyBGate(c, rule)).toEqual({ passes: true, failing: [], reasons: [], ratingsCited: [] });
    }
  });

  it("a score equal to its floor passes", () => {
    const atFloor = profile(3, 2, 2, 1, 2);
    expect(applyBGate(atFloor, CANDIDATE_RULES[0]).passes).toBe(true);
    expect(applyBGate(atFloor, CANDIDATE_RULES[2]).passes).toBe(true);
    expect(applyBGate(atFloor, CANDIDATE_RULES[1]).failing).toEqual(["effectSize"]);
  });

  it("names every failing dimension, in dimension order, and cites only their papers", () => {
    const cite = (dim: string) =>
      ({ consistency: ["p-shared", "p-c"], effectSize: ["p-shared", "p-e"], humanEvidence: ["p-h"] })[
        dim
      ] ?? [];
    const both = profile(3, 3, 1, 0, 3, cite);
    expect(applyBGate(both, CANDIDATE_RULES[2])).toEqual({
      passes: false,
      failing: ["consistency", "effectSize"],
      reasons: ["Consistency 1 is below the floor of 2", "Effect size 0 is below the floor of 1"],
      ratingsCited: ["p-shared", "p-c", "p-e"],
    });
  });
});

describe("gateMoves", () => {
  it("carries the failing dimension's rationale, score, floor and paperIds verbatim", () => {
    const p = profile(3, 3, 3, 0, 2, (d) => (d === "effectSize" ? ["p-x"] : []));
    const [m] = gateMoves([effect("e1", p)], CANDIDATE_RULES[1]);
    expect(m.failing).toEqual([
      { dimension: "effectSize", score: 0, floor: 2, rationale: "effectSize rationale", paperIds: ["p-x"] },
    ]);
    expect(m.scores).toEqual({
      humanEvidence: 3,
      studyQuality: 3,
      consistency: 3,
      effectSize: 0,
      populationRelevance: 2,
    });
  });

  it("skips effects that pass, keeping input order", () => {
    const strong = profile(3, 2, 2, 2, 2);
    const weak = profile(3, 3, 3, 0, 2);
    expect(
      gateMoves([effect("x", weak), effect("y", strong), effect("z", weak)], CANDIDATE_RULES[0]).map(
        (m) => m.id,
      ),
    ).toEqual(["x", "z"]);
  });
});

describe("B_GATE — the owner's choice, wired into deriveGrade (U5 (b), AC-1)", () => {
  it("is G1, effectSize ≥ 1, and is CANDIDATE_RULES' G1 itself, so the two cannot drift", () => {
    expect(B_GATE).toEqual({ id: "G1", floors: { effectSize: 1 } });
    expect(CANDIDATE_RULES[0]).toBe(B_GATE);
  });

  it("deriveGrade applies B_GATE and no other candidate", () => {
    const src = readFileSync(path.join(__dirname, "index.ts"), "utf8");
    expect(src).toMatch(/applyBGate\(profile, B_GATE\)/);
    expect(src).not.toMatch(/CANDIDATE_RULES/);
  });
});

describe("deriveGrade caps a gate failure at C (U5 (b), AC-2)", () => {
  it("the planted well-studied nulls derive C, not A and B", () => {
    expect(deriveGrade(profile(3, 3, 3, 0, 2))).toBe("C"); // composite 0.817: a cap, not A → B
    expect(deriveGrade(profile(3, 3, 1, 0, 2))).toBe("C"); // composite 0.683
  });

  it("FU-74: an uncited effectSize is R5's 0 and fails, whatever score was authored", () => {
    const uncited = profile(3, 3, 3, 2, 2, (d) => (d === "effectSize" ? [] : [`p-${d}`]));
    expect(compositeGrade(uncited)).toBe("A");
    expect(deriveGrade(uncited)).toBe("C");
  });

  it("a passing A or B, and any C or D, keep the composite's letter", () => {
    for (const p of [profile(3, 3, 3, 1, 2), profile(2, 2, 2, 1, 2), profile(2, 1, 1, 0, 2), profile(0, 0, 1, 0, 0)]) {
      expect(deriveGrade(p)).toBe(compositeGrade(p));
    }
  });
});

describe("the failure reason tells not assessed from a scored 0 (U5 (b), AC-5)", () => {
  it("a cited effectSize of 0 is 'Effect size 0'; an uncited one is 'not assessed'", () => {
    expect(applyBGate(profile(3, 3, 3, 0, 2), B_GATE).reasons).toEqual([
      "Effect size 0 is below the floor of 1",
    ]);
    const uncited = profile(3, 3, 3, 0, 2, (d) => (d === "effectSize" ? [] : [`p-${d}`]));
    expect(applyBGate(uncited, B_GATE).reasons).toEqual([
      "Effect size not assessed: no cited paper, so R5 scores it 0 (FU-74)",
    ]);
  });
});

describe("gate.ts stays pure and seed-blind (AC-1)", () => {
  it("imports nothing from content/, src/data, or I/O", () => {
    const src = readFileSync(path.join(__dirname, "gate.ts"), "utf8");
    const specifiers = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((s) => /content|@\/data|src\/data|^node:|^fs$/.test(s))).toEqual([]);
  });
});
