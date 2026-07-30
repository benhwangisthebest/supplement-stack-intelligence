import { describe, expect, it } from "vitest";
import type { Effect } from "@/types";
import {
  compareGrades,
  effectComposite,
  getAllSupplements,
  getBestEffectForOutcome,
  getEffectsByOutcome,
  getEffectsForSupplement,
  getPapersForEffect,
  getRelatedSupplements,
  getSupplementById,
  getSupplementBySlug,
  isStrongerGrade,
  resolveEffect,
  searchSupplements,
} from "./index";

describe("lib/evidence lookups", () => {
  it("exposes the full seeded supplement set (>=15)", () => {
    expect(getAllSupplements().length).toBeGreaterThanOrEqual(15);
  });

  it("finds a supplement by id and slug", () => {
    expect(getSupplementById("creatine")?.name).toContain("Creatine");
    expect(getSupplementBySlug("magnesium")?.id).toBe("magnesium");
    expect(getSupplementById("does-not-exist")).toBeUndefined();
  });

  it("returns effects for a supplement", () => {
    const effects = getEffectsForSupplement("creatine");
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((e) => e.supplementId === "creatine")).toBe(true);
  });

  it("returns effects by outcome category", () => {
    const sleep = getEffectsByOutcome("sleep");
    expect(sleep.some((e) => e.supplementId === "melatonin")).toBe(true);
  });

  it("picks the highest-grade effect for an outcome", () => {
    // creatine: training=A (strength), so best-for-training must be grade A
    const best = getBestEffectForOutcome("creatine", "training");
    expect(best?.grade).toBe("A");
  });

  it("resolves linked papers for an effect", () => {
    const best = getBestEffectForOutcome("melatonin", "sleep");
    expect(best).toBeDefined();
    const papers = getPapersForEffect(best!);
    expect(papers.length).toBeGreaterThan(0);
    // v13: asserted studyType — a fabricated provenance field, now deleted. The
    // resolution contract is the id→summary link, so assert on content instead.
    expect(papers[0]?.summary).toBeTruthy();
  });

  it("resolves related supplements", () => {
    const related = getRelatedSupplements("magnesium");
    expect(related.map((s) => s.id)).toContain("glycine");
  });

  it("searches by name and alias, case-insensitively", () => {
    expect(searchSupplements("MAGNES").map((s) => s.id)).toContain("magnesium");
    expect(searchSupplements("omega-3").map((s) => s.id)).toContain("fish-oil");
    expect(searchSupplements("").length).toBe(getAllSupplements().length);
    expect(searchSupplements("zzzznope")).toHaveLength(0);
  });

  it("ranks grades correctly", () => {
    expect(isStrongerGrade("A", "C")).toBe(true);
    expect(isStrongerGrade("D", "B")).toBe(false);
    expect(compareGrades("A", "B")).toBeLessThan(0); // A sorts before B
  });
});

describe("evidence-grading v5 — grade resolution", () => {
  function effect(partial: Partial<Effect> & { id: string }): Effect {
    return {
      supplementId: "x",
      name: "n",
      outcomeCategory: "focus",
      grade: "C",
      confidence: "low",
      summary: "s",
      relevantPopulation: "adults",
      studiedDose: { min: 1, max: 1, unit: "mg" },
      mechanismTags: [],
      paperIds: [],
      ...partial,
    };
  }

  const profileAllStrong = {
    dimensions: {
      humanEvidence: { score: 3 as const, rationale: "x", paperIds: [] },
      studyQuality: { score: 3 as const, rationale: "x", paperIds: [] },
      consistency: { score: 3 as const, rationale: "x", paperIds: [] },
      effectSize: { score: 3 as const, rationale: "x", paperIds: [] },
      populationRelevance: { score: 3 as const, rationale: "x", paperIds: [] },
    },
  };

  it("resolveEffect derives the grade from a profile (overriding a stale literal)", () => {
    const e = effect({ id: "e1", grade: "D", evidenceProfile: profileAllStrong });
    expect(resolveEffect(e).grade).toBe("A"); // derived from all-strong
  });

  it("resolveEffect leaves a profile-less effect unchanged (legacy)", () => {
    const e = effect({ id: "e2", grade: "B" });
    expect(resolveEffect(e)).toBe(e); // identity — no allocation
  });

  it("effectComposite returns a score for profiled, null for legacy", () => {
    expect(effectComposite(effect({ id: "e3", evidenceProfile: profileAllStrong }))).toBeCloseTo(1.0, 6);
    expect(effectComposite(effect({ id: "e4" }))).toBeNull();
  });

  it("the default library pre-resolves grades (profiled effect's grade is derived)", () => {
    const creatineStrength = getEffectsForSupplement("creatine").find(
      (e) => e.id === "creatine-strength",
    )!;
    expect(creatineStrength.grade).toBe("A"); // derived == curated
    expect(effectComposite(creatineStrength)).not.toBeNull();
  });

  it("getBestEffectForOutcome breaks equal-grade ties by composite", () => {
    const lib = {
      supplements: [],
      papers: [],
      effects: [
        effect({ id: "low", supplementId: "s", grade: "B", evidenceProfile: {
          dimensions: {
            humanEvidence: { score: 2 as const, rationale: "x", paperIds: [] },
            studyQuality: { score: 2 as const, rationale: "x", paperIds: [] },
            consistency: { score: 2 as const, rationale: "x", paperIds: [] },
            effectSize: { score: 1 as const, rationale: "x", paperIds: [] },
            populationRelevance: { score: 1 as const, rationale: "x", paperIds: [] },
          },
        } }),
        effect({ id: "high", supplementId: "s", grade: "B", evidenceProfile: {
          dimensions: {
            humanEvidence: { score: 2 as const, rationale: "x", paperIds: [] },
            studyQuality: { score: 3 as const, rationale: "x", paperIds: [] },
            consistency: { score: 2 as const, rationale: "x", paperIds: [] },
            effectSize: { score: 1 as const, rationale: "x", paperIds: [] },
            populationRelevance: { score: 2 as const, rationale: "x", paperIds: [] },
          },
        } }),
      ],
    };
    expect(getBestEffectForOutcome("s", "focus", lib)!.id).toBe("high");
  });
});
