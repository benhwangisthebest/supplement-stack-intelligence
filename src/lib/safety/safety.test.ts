import { describe, expect, it } from "vitest";
import type { Paper } from "@/types";
import {
  BANNED_PHRASES,
  containsBannedLanguage,
  COVERAGE,
  DISCLAIMERS,
  gradeDCoverage,
  isTitleOnly,
  NOT_IN_ABSTRACT,
  safetyCopy,
} from "./index";

describe("lib/safety phrasing", () => {
  it("flags diagnostic/directive language", () => {
    expect(containsBannedLanguage("You have a deficiency")).toBe(true);
    expect(containsBannedLanguage("This cures everything")).toBe(true);
    expect(containsBannedLanguage("May support sleep quality")).toBe(false);
  });

  it("never emits banned language in disclaimers", () => {
    for (const text of Object.values(DISCLAIMERS)) {
      expect(containsBannedLanguage(text), text).toBe(false);
    }
  });

  it("every flag copy builder produces non-diagnostic, complete copy", () => {
    const samples = [
      safetyCopy.evidenceLimited("Taurine", "training"),
      safetyCopy.doseBelowRange("Magnesium", 200, "mg"),
      safetyCopy.doseExceedsRange("Magnesium", 800, 400, "mg"),
      safetyCopy.doseCritical("Magnesium", 1500, 400, "mg"),
      safetyCopy.redundancy(["Magnesium", "Glycine"], "sleep"),
      safetyCopy.allergyConflict("Fish Oil", ["fish"]),
      safetyCopy.allergyCritical("Fish Oil", ["fish"]),
      safetyCopy.medicationCaution("Berberine"),
      safetyCopy.goalMisalignment("Berberine"),
      safetyCopy.labSupported("Vitamin D3", "Vitamin D"),
      safetyCopy.labCaution("Zinc", "Zinc"),
      safetyCopy.complexity(15),
    ];

    for (const c of samples) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.explanation.length).toBeGreaterThan(0);
      expect(c.recommendation.length).toBeGreaterThan(0);
      expect(containsBannedLanguage(c.title), c.title).toBe(false);
      expect(containsBannedLanguage(c.explanation), c.explanation).toBe(false);
      expect(containsBannedLanguage(c.recommendation), c.recommendation).toBe(false);
    }
  });

  it("uses hedged language, not absolute claims", () => {
    expect(BANNED_PHRASES).toContain("guaranteed");
    const copy = safetyCopy.evidenceLimited("Taurine", "training");
    expect(copy.explanation.toLowerCase()).toContain("limited");
  });
});

// Phase 3 closeout (e2), owner ruling on Check finding P3-7: D1/D2 follows R6 (a
// title-only paper supports nothing). Made-up papers, so the rule is tested apart
// from the seed; the seed case (glycine-sleep) is in CoverageLimit.test.tsx.
describe("gradeDCoverage — D1/D2 follows R6 (P3-7)", () => {
  const titleOnly = (id: string): Paper => ({
    id,
    title: `Made-up title-only paper ${id}`,
    population: NOT_IN_ABSTRACT,
    intervention: NOT_IN_ABSTRACT,
    dose: NOT_IN_ABSTRACT,
    duration: NOT_IN_ABSTRACT,
    outcomes: NOT_IN_ABSTRACT,
    limitations: NOT_IN_ABSTRACT,
    summary: NOT_IN_ABSTRACT,
  });
  const withAbstract = (id: string): Paper => ({ ...titleOnly(id), summary: "Made-up summary from an abstract." });
  const d = (paperIds: string[]) => ({ grade: "D", paperIds });

  it("isTitleOnly: every card field unreported, and only then", () => {
    expect(isTitleOnly(titleOnly("t"))).toBe(true);
    expect(isTitleOnly(withAbstract("a"))).toBe(false);
  });

  it("all cited papers title-only → D2", () => {
    expect(gradeDCoverage(d(["t1", "t2"]), [titleOnly("t1"), titleOnly("t2")])).toBe(COVERAGE.gradeDUncited);
  });

  it("at least one cited paper with an abstract → D1", () => {
    expect(gradeDCoverage(d(["t1", "a1"]), [titleOnly("t1"), withAbstract("a1")])).toBe(COVERAGE.gradeDLimited);
  });

  it("no cited paper → D2; a cited id missing from the list counts as supporting → D1", () => {
    expect(gradeDCoverage(d([]), [])).toBe(COVERAGE.gradeDUncited);
    expect(gradeDCoverage(d(["absent"]), [])).toBe(COVERAGE.gradeDLimited);
  });

  it("not Grade D → null", () => {
    expect(gradeDCoverage({ grade: "C", paperIds: ["t1"] }, [titleOnly("t1")])).toBeNull();
  });
});
