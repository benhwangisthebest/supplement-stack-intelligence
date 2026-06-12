import { describe, expect, it } from "vitest";
import {
  BANNED_PHRASES,
  containsBannedLanguage,
  DISCLAIMERS,
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
