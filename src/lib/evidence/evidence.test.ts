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
  // Phase 4 U2 (FU-63): evidenceProfile is required on Effect. [2026-09-29, Phase 4 U20; N-90]
  // lib/evidence's no-profile branch is gone, so every fixture carries a profile and none is cast.
  function effect(
    partial: Partial<Effect> & Pick<Effect, "id" | "evidenceProfile">,
  ): Effect {
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

  // [2026-09-26, Phase 4 U5 (b)] Each dimension cites a paper, as R5 requires of a score above 0:
  // the B gate reads an uncited effectSize as 0 (FU-74) and would cap this profile at C.
  const profileAllStrong = {
    dimensions: {
      humanEvidence: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
      studyQuality: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
      consistency: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
      effectSize: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
      populationRelevance: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
    },
  };

  it("resolveEffect derives the grade from a profile (overriding a stale literal)", () => {
    const e = effect({ id: "e1", grade: "D", evidenceProfile: profileAllStrong });
    expect(resolveEffect(e).grade).toBe("A"); // derived from all-strong
  });

  it("effectComposite returns the profile's composite score", () => {
    expect(effectComposite(effect({ id: "e3", evidenceProfile: profileAllStrong }))).toBeCloseTo(1.0, 6);
  });

  it("the default library pre-resolves grades (profiled effect's grade is derived)", () => {
    const creatineStrength = getEffectsForSupplement("creatine").find(
      (e) => e.id === "creatine-strength",
    )!;
    expect(creatineStrength.grade).toBe("A"); // derived == curated
    // U20 (N-90): never null now, so assert the value, not its presence.
    expect(effectComposite(creatineStrength)).toBeGreaterThan(0);
  });

  it("getBestEffectForOutcome breaks equal-grade ties by composite", () => {
    // [2026-09-29, Phase 4 U20; N-92] Every scored dimension cites a paper, as R5 requires, so
    // each fixture DERIVES the B it carries. Uncited, the B gate reads effectSize as 0 (FU-74)
    // and both derive C, and the literal B would be a grade the engine cannot produce.
    const lib = {
      supplements: [],
      papers: [],
      effects: [
        effect({ id: "low", supplementId: "s", grade: "B", evidenceProfile: {
          dimensions: {
            humanEvidence: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
            studyQuality: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
            consistency: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
            effectSize: { score: 1 as const, rationale: "x", paperIds: ["p1"] },
            populationRelevance: { score: 1 as const, rationale: "x", paperIds: ["p1"] },
          },
        } }),
        effect({ id: "high", supplementId: "s", grade: "B", evidenceProfile: {
          dimensions: {
            humanEvidence: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
            studyQuality: { score: 3 as const, rationale: "x", paperIds: ["p1"] },
            consistency: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
            effectSize: { score: 1 as const, rationale: "x", paperIds: ["p1"] },
            populationRelevance: { score: 2 as const, rationale: "x", paperIds: ["p1"] },
          },
        } }),
      ],
    };
    // R5: every scored dimension of both fixtures cites a paper.
    for (const e of lib.effects) {
      for (const d of Object.values(e.evidenceProfile.dimensions)) {
        if (d.score > 0) expect(d.paperIds, e.id).not.toHaveLength(0);
      }
    }
    // The tie is real: both fixtures derive the grade they carry.
    for (const e of lib.effects) expect(resolveEffect(e).grade).toBe("B");
    expect(getBestEffectForOutcome("s", "focus", lib)!.id).toBe("high");
  });
});
