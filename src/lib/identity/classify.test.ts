import { describe, expect, it } from "vitest";
import type { TraitVector } from "@/types/identity";
import { ARCHETYPES } from "./archetypes";
import { classify, MIN_MATCH, weightedDistance } from "./classify";

const vec = (partial: Partial<TraitVector> = {}): TraitVector => ({
  evidenceRigor: 0.5,
  riskAppetite: 0.5,
  breadth: 0.5,
  foundationalFocus: 0.5,
  dataDepth: 0.5,
  ...partial,
});

describe("classify — integrity (Plan SC10)", () => {
  it("every archetype is the unique nearest neighbour of its own target", () => {
    for (const def of ARCHETYPES) {
      const distances = ARCHETYPES.map((d) => ({
        id: d.id,
        dist: weightedDistance(def.target, d),
      }));
      const nearest = distances.reduce((a, b) => (b.dist < a.dist ? b : a));
      expect(nearest.id).toBe(def.id);
      // strictly unique: no other archetype ties at distance 0
      const zeros = distances.filter((d) => d.dist === 0);
      expect(zeros).toHaveLength(1);
    }
  });

  it("classifies each archetype's own target back to itself (established confidence)", () => {
    for (const def of ARCHETYPES) {
      const res = classify(def.target, "established");
      expect(res.archetype).toBe(def.id);
      expect(res.matchScore).toBeGreaterThanOrEqual(MIN_MATCH);
      expect(res.matchScore).toBeLessThanOrEqual(1);
    }
  });
});

describe("classify — anti-over-claim guard (Plan SC5)", () => {
  it("returns emerging whenever confidence is emerging, regardless of vector", () => {
    expect(classify(ARCHETYPES[0].target, "emerging").archetype).toBe("emerging");
    expect(classify(vec(), "emerging").matchScore).toBe(0);
  });

  it("only returns a non-emerging archetype when matchScore >= MIN_MATCH", () => {
    // property holds for arbitrary vectors
    const samples = [vec(), vec({ evidenceRigor: 0, riskAppetite: 0, breadth: 0, foundationalFocus: 0 }), vec({ breadth: 1 }), ARCHETYPES[2].target];
    for (const v of samples) {
      const res = classify(v, "established");
      if (res.archetype !== "emerging") {
        expect(res.matchScore).toBeGreaterThanOrEqual(MIN_MATCH);
      }
    }
  });
});

describe("classify — determinism", () => {
  it("is a pure function of (vector, confidence)", () => {
    const v = vec({ evidenceRigor: 0.82, foundationalFocus: 0.79, riskAppetite: 0.28, breadth: 0.55 });
    expect(classify(v, "established")).toEqual(classify(v, "established"));
  });

  it("dataDepth does not affect the chosen style archetype (weight 0)", () => {
    const base = vec({ evidenceRigor: 0.8, foundationalFocus: 0.8, riskAppetite: 0.3, breadth: 0.55 });
    const a = classify({ ...base, dataDepth: 0.3 }, "established");
    const b = classify({ ...base, dataDepth: 0.95 }, "established");
    expect(a.archetype).toBe(b.archetype);
  });
});
