import { describe, expect, it } from "vitest";
import type { Paper } from "@/types";
import {
  advisorOutcomeCopy,
  authCopy,
  BACKGROUND_LABEL,
  BANNED_PHRASES,
  containsBannedLanguage,
  COVERAGE,
  DISCLAIMERS,
  gradeDCoverage,
  isTitleOnly,
  NOT_IN_ABSTRACT,
  productMatchCopy,
  safetyCopy,
} from "./index";

describe("lib/safety phrasing", () => {
  it("flags diagnostic/directive language", () => {
    expect(containsBannedLanguage("You have a deficiency")).toBe(true);
    expect(containsBannedLanguage("This cures everything")).toBe(true);
    expect(containsBannedLanguage("May support sleep quality")).toBe(false);
  });

  it("never emits banned language in disclaimers, the background label, the product-match copy, the advisor outcomes or the auth errors", () => {
    for (const text of [
      ...Object.values(DISCLAIMERS),
      BACKGROUND_LABEL,
      COVERAGE.productMatchLimit.text,
      ...Object.values(productMatchCopy),
      ...Object.values(advisorOutcomeCopy),
      ...Object.values(authCopy),
    ]) {
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

// Phase 4 U13 (FU-59) — the brief's constraints on the product-match statement,
// executable: it says the set is small and curated, says an absent product is not
// judged, and makes no claim about product quality (§2.2 rule 10). Owner ruling on
// Q-14 (2026-09-29): option (b), allergen sentences re-ruled; "not an endorsement" is allowed.
describe("COVERAGE.productMatchLimit — U13 copy constraints", () => {
  const { dataset, state, text } = COVERAGE.productMatchLimit;

  it("is the products dataset's limit statement", () => {
    expect([dataset, state]).toEqual(["products", "limit"]);
  });

  it("says the set is small, curated sample data, that absence is not a judgement, and names the allergen exclusion", () => {
    expect(text).toMatch(/\bsmall\b/);
    expect(text).toMatch(/\bcurated\b/);
    expect(text).toMatch(/sample products, not real market listings/);
    expect(text).toMatch(/is not a judgement on it/);
    expect(text).toMatch(/left out only when a listed allergen matches an allergy entered in your profile\./);
    expect(text).toMatch(/Allergen listings in this set are incomplete, so a product shown here may still contain something you avoid/);
    expect(text).not.toMatch(/conflict with allergies in your profile are left out/); // round 2's B2: overclaims the exact-tag match
  });

  it("makes no claim about product quality; only the negated \"not an endorsement\" is allowed", () => {
    const QUALITY =
      /\b(best|top|quality|trusted|trustworthy|vetted|vetting|verified|tested|assess\w*|recommend\w*|endorse\w*|safe|reliable|premium|approved|pure|clean)\b/i;
    expect(text).toMatch(/\bnot an endorsement\b/); // the allowance is used, so it is not vacuous
    const unnegated = text.replace(/\bnot an endorsement\b/g, "");
    expect(unnegated).not.toMatch(QUALITY);
    for (const s of Object.values(productMatchCopy)) expect(s).not.toMatch(QUALITY);
  });
});
