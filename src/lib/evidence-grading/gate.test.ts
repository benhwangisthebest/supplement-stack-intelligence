import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EvidenceGrade } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { compositeScore, deriveGrade } from "./index";
import { applyBGate, CANDIDATE_RULES, gateMoves } from "./gate";

// Phase 4 U5 (a), D-2 (c): the report-only gate for Grade B.

function profile(
  h: number,
  q: number,
  c: number,
  e: number,
  p: number,
  cite: (dim: string) => string[] = () => [],
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
  grade: deriveGrade(evidenceProfile) as EvidenceGrade,
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

  it("derives A and B from the composite alone", () => {
    expect(compositeScore(nullA)).toBeCloseTo(0.817, 3);
    expect(deriveGrade(nullA)).toBe("A");
    expect(compositeScore(nullB)).toBeCloseTo(0.683, 3);
    expect(deriveGrade(nullB)).toBe("B");
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
      expect(applyBGate(c, rule)).toEqual({ passes: true, failing: [], ratingsCited: [] });
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

describe("gate.ts stays pure and seed-blind (AC-1)", () => {
  it("imports nothing from content/, src/data, or I/O", () => {
    const src = readFileSync(path.join(__dirname, "gate.ts"), "utf8");
    const specifiers = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((s) => /content|@\/data|src\/data|^node:|^fs$/.test(s))).toEqual([]);
  });
});
