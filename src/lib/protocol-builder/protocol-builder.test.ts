import { describe, expect, it } from "vitest";
import { containsBannedLanguage } from "@/lib/safety";
import type { LabMarker, OutcomeCategory, StackItem, UserProfile } from "@/types";
import { generateProtocol } from "./index";
import { tierFor } from "./rules";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "p1",
    userId: "u1",
    goals: [],
    diet: null,
    riskTolerance: null,
    allergies: [],
    medications: [],
    avoidedIngredients: [],
    formPreferences: [],
    caffeineSensitivity: null,
    experienceLevel: null,
    notes: null,
    createdAt: "2026-06-11T00:00:00Z",
    updatedAt: "2026-06-11T00:00:00Z",
    ...overrides,
  };
}

function group(result: ReturnType<typeof generateProtocol>, goal: OutcomeCategory) {
  return result.groups.find((g) => g.goal === goal);
}

describe("generateProtocol", () => {
  it("groups suggestions by goal, grade-ranked (A first)", () => {
    const result = generateProtocol({ profile: makeProfile({ goals: ["sleep"] }) });
    const sleep = group(result, "sleep");
    expect(sleep).toBeDefined();
    expect(sleep!.suggestions.length).toBeGreaterThan(1);
    // melatonin has a grade-A sleep effect → ranked first (no lab boost).
    expect(sleep!.suggestions[0].supplementId).toBe("melatonin");
    expect(sleep!.suggestions[0].grade).toBe("A");
  });

  it("excludes allergen-conflicting supplements", () => {
    const result = generateProtocol({
      profile: makeProfile({ goals: ["metabolic"], allergies: ["fish"] }),
    });
    const metabolic = group(result, "metabolic");
    expect(metabolic).toBeDefined();
    expect(metabolic!.suggestions.some((s) => s.supplementId === "fish-oil")).toBe(false);
  });

  it("flags medication-caution items but still suggests them", () => {
    const result = generateProtocol({
      profile: makeProfile({ goals: ["metabolic"], medications: ["metformin"] }),
    });
    const berberine = group(result, "metabolic")!.suggestions.find(
      (s) => s.supplementId === "berberine",
    );
    expect(berberine).toBeDefined();
    expect(berberine!.medicationCaution).toBe(true);
  });

  it("lab-boosts and ranks a deficient marker's supplement first", () => {
    const lowVitD: LabMarker = {
      id: "l1", userId: "u1", marker: "Vitamin D", value: 18,
      unit: "ng/mL", referenceLow: 30, referenceHigh: 100, date: null, notes: null,
    };
    const result = generateProtocol({
      profile: makeProfile({ goals: ["deficiency"] }),
      labMarkers: [lowVitD],
    });
    const deficiency = group(result, "deficiency")!;
    expect(deficiency.suggestions[0].supplementId).toBe("vitamin-d");
    expect(deficiency.suggestions[0].labBoosted).toBe(true);
  });

  it("lab-timeline v4: a worsening trend nudges the supplement up with an explainable note", () => {
    const worsening = {
      biomarkerId: "vitamin-d-25oh",
      biomarkerName: "25-OH Vitamin D",
      latest: { value: 20, unit: "ng/mL", collectedAt: "2026-06-01" },
      previous: { value: 28, unit: "ng/mL", collectedAt: "2025-12-01" },
      delta: -8,
      pctChange: -28,
      direction: "falling" as const,
      windowDays: 182,
      points: 2,
    };
    const result = generateProtocol({
      profile: makeProfile({ goals: ["deficiency"] }),
      trends: [worsening],
    });
    const vitD = group(result, "deficiency")!.suggestions.find(
      (s) => s.supplementId === "vitamin-d",
    )!;
    expect(vitD.labSignal).toBeGreaterThan(0);
    expect(vitD.labBoosted).toBe(true);
    expect(vitD.labRationale).toMatch(/away from range/i);
  });

  it("lab-timeline v4: trend nudge is bounded and copy stays non-diagnostic", () => {
    const improving = {
      biomarkerId: "vitamin-d-25oh",
      biomarkerName: "25-OH Vitamin D",
      latest: { value: 41, unit: "ng/mL", collectedAt: "2026-06-01" },
      previous: { value: 28, unit: "ng/mL", collectedAt: "2025-12-01" },
      delta: 13,
      pctChange: 46,
      direction: "rising" as const,
      windowDays: 182,
      points: 2,
    };
    const result = generateProtocol({
      profile: makeProfile({ goals: ["deficiency"] }),
      trends: [improving],
    });
    for (const s of group(result, "deficiency")!.suggestions) {
      expect(Math.abs(s.labSignal ?? 0)).toBeLessThanOrEqual(1);
      if (s.labRationale) expect(containsBannedLanguage(s.labRationale)).toBe(false);
    }
  });

  it("annotates items already in the target stack", () => {
    const items: StackItem[] = [
      {
        id: "i1", stackId: "s1", supplementId: "magnesium", customName: null,
        dose: 300, unit: "mg", timing: null, frequency: null, reason: null, notes: null,
      },
    ];
    const result = generateProtocol({
      profile: makeProfile({ goals: ["sleep"] }),
      stackItems: items,
    });
    const mag = group(result, "sleep")!.suggestions.find((s) => s.supplementId === "magnesium");
    expect(mag?.alreadyInStack).toBe(true);
  });

  it("returns empty groups when the profile has no goals", () => {
    const result = generateProtocol({ profile: makeProfile({ goals: [] }) });
    expect(result.groups).toHaveLength(0);
    expect(result.generatedFor.goals).toHaveLength(0);
  });

  it("assigns tiers from grade + foundational tag", () => {
    expect(tierFor("A", ["foundational"])).toBe("foundational");
    expect(tierFor("A", ["performance"])).toBe("targeted");
    expect(tierFor("B", [])).toBe("targeted");
    expect(tierFor("C", [])).toBe("advanced");
    expect(tierFor("D", [])).toBe("experimental");
  });

  it("produces only non-diagnostic copy", () => {
    const result = generateProtocol({
      profile: makeProfile({ goals: ["sleep", "metabolic", "deficiency"], medications: ["x"] }),
    });
    for (const g of result.groups) {
      for (const s of g.suggestions) {
        expect(containsBannedLanguage(s.rationale), s.rationale).toBe(false);
        if (s.confidenceNote) {
          expect(containsBannedLanguage(s.confidenceNote), s.confidenceNote).toBe(false);
        }
      }
    }
  });

  it("is deterministic — same input yields identical output", () => {
    const profile = makeProfile({ goals: ["sleep", "focus"] });
    const a = generateProtocol({ profile });
    const b = generateProtocol({ profile });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
