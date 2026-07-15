import { describe, expect, it } from "vitest";
import { defaultLibrary } from "@/lib/evidence";
import { containsBannedLanguage } from "@/lib/safety";
import type {
  LabMarker,
  Stack,
  StackItem,
  UserProfile,
} from "@/types";
import {
  evaluateStack,
  ruleAllergyConflict,
  ruleComplexity,
  ruleDoseFit,
  ruleEvidenceFit,
  ruleGoalAlignment,
  ruleLabRelevance,
  ruleLabTrend,
  ruleInteractions,
  ruleRedundancy,
  type EvalContext,
} from "./index";
import type { TrendDirection, TrendSignal } from "@/types/lab";

function makeTrend(
  biomarkerId: string,
  biomarkerName: string,
  direction: TrendDirection,
  pctChange: number | null,
): TrendSignal {
  return {
    biomarkerId,
    biomarkerName,
    latest: { value: 0, unit: "ng/mL", collectedAt: "2026-06-01" },
    previous: { value: 0, unit: "ng/mL", collectedAt: "2025-12-01" },
    delta: 0,
    pctChange,
    direction,
    windowDays: 182,
    points: 2,
  };
}

// ---- fixtures ----
function makeStack(overrides: Partial<Stack> = {}): Stack {
  return {
    id: "s1",
    userId: "u1",
    name: "Test Stack",
    intent: "sleep",
    mode: "current",
    description: null,
    createdAt: "2026-06-11T00:00:00Z",
    updatedAt: "2026-06-11T00:00:00Z",
    ...overrides,
  };
}

let itemSeq = 0;
function makeItem(overrides: Partial<StackItem> = {}): StackItem {
  itemSeq += 1;
  return {
    id: `i${itemSeq}`,
    stackId: "s1",
    supplementId: null,
    customName: null,
    dose: 0,
    unit: "mg",
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
    ...overrides,
  };
}

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

function ctx(overrides: Partial<EvalContext>): EvalContext {
  return {
    stack: makeStack(),
    items: [],
    profile: null,
    labMarkers: [],
    trends: [],
    library: defaultLibrary,
    ...overrides,
  };
}

describe("ruleDoseFit", () => {
  it("flags critical when dose is well above studied max", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 1500, unit: "mg" })];
    const flags = ruleDoseFit(ctx({ items }));
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("critical");
    expect(flags[0].category).toBe("dose-fit");
  });

  it("flags warning when dose moderately exceeds studied max", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 800, unit: "mg" })];
    const flags = ruleDoseFit(ctx({ items }));
    expect(flags[0].severity).toBe("warning");
  });

  it("flags info when dose is below studied min", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 50, unit: "mg" })];
    const flags = ruleDoseFit(ctx({ items }));
    expect(flags[0].severity).toBe("info");
  });

  it("does not flag a dose within range", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 300, unit: "mg" })];
    expect(ruleDoseFit(ctx({ items }))).toHaveLength(0);
  });

  it("skips comparison when units differ", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 5, unit: "g" })];
    expect(ruleDoseFit(ctx({ items }))).toHaveLength(0);
  });

  it("ignores custom (non-seed) items", () => {
    const items = [makeItem({ customName: "Mystery blend", dose: 9999, unit: "mg" })];
    expect(ruleDoseFit(ctx({ items }))).toHaveLength(0);
  });
});

describe("ruleEvidenceFit", () => {
  it("does not flag a strong (A/B) fit for the intent", () => {
    // magnesium has a grade B sleep effect
    const items = [makeItem({ supplementId: "magnesium", dose: 300 })];
    expect(ruleEvidenceFit(ctx({ items }))).toHaveLength(0);
  });

  it("flags info when the supplement has no strong effect for the intent", () => {
    // taurine has no sleep effect
    const items = [makeItem({ supplementId: "taurine", dose: 1000 })];
    const flags = ruleEvidenceFit(ctx({ items }));
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe("evidence-fit");
    expect(flags[0].severity).toBe("info");
  });

  it("skips evidence-fit for experimental stacks", () => {
    const items = [makeItem({ supplementId: "taurine", dose: 1000 })];
    const flags = ruleEvidenceFit(ctx({ stack: makeStack({ intent: "experimental" }), items }));
    expect(flags).toHaveLength(0);
  });
});

describe("ruleRedundancy", () => {
  it("flags info for two items sharing outcome + mechanism", () => {
    const items = [
      makeItem({ supplementId: "magnesium", dose: 300 }),
      makeItem({ supplementId: "magnesium", dose: 200 }),
    ];
    const flags = ruleRedundancy(ctx({ items }));
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("info");
    expect(flags[0].category).toBe("redundancy");
  });

  it("escalates to warning for three or more overlapping items", () => {
    const items = [
      makeItem({ supplementId: "magnesium", dose: 300 }),
      makeItem({ supplementId: "magnesium", dose: 200 }),
      makeItem({ supplementId: "magnesium", dose: 250 }),
    ];
    expect(ruleRedundancy(ctx({ items }))[0].severity).toBe("warning");
  });

  it("does not flag complementary items with no mechanism overlap", () => {
    // magnesium-sleep (GABA) + glycine-sleep (inhibitory-neurotransmitter): no shared tag
    const items = [
      makeItem({ supplementId: "magnesium", dose: 300 }),
      makeItem({ supplementId: "glycine", dose: 3, unit: "g" }),
    ];
    expect(ruleRedundancy(ctx({ items }))).toHaveLength(0);
  });
});

describe("ruleAllergyConflict", () => {
  it("warns when a supplement allergen matches a profile allergy", () => {
    const items = [makeItem({ supplementId: "fish-oil", dose: 1000 })];
    const profile = makeProfile({ allergies: ["fish"] });
    const flags = ruleAllergyConflict(ctx({ items, profile }));
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("warning");
  });

  it("escalates to critical when the allergen is also a listed medication", () => {
    const items = [makeItem({ supplementId: "fish-oil", dose: 1000 })];
    const profile = makeProfile({ allergies: ["fish"], medications: ["fish"] });
    expect(ruleAllergyConflict(ctx({ items, profile }))[0].severity).toBe("critical");
  });

  it("returns nothing when there are no allergies", () => {
    const items = [makeItem({ supplementId: "fish-oil", dose: 1000 })];
    expect(ruleAllergyConflict(ctx({ items, profile: makeProfile() }))).toHaveLength(0);
    expect(ruleAllergyConflict(ctx({ items, profile: null }))).toHaveLength(0);
  });
});

describe("ruleGoalAlignment", () => {
  it("flags an item that maps to none of the profile goals", () => {
    const items = [makeItem({ supplementId: "berberine", dose: 1000 })];
    const profile = makeProfile({ goals: ["sleep"] });
    const flags = ruleGoalAlignment(ctx({ items, profile }));
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe("goal-alignment");
  });

  it("does not flag an aligned item", () => {
    const items = [makeItem({ supplementId: "magnesium", dose: 300 })];
    const profile = makeProfile({ goals: ["sleep"] });
    expect(ruleGoalAlignment(ctx({ items, profile }))).toHaveLength(0);
  });
});

describe("ruleLabRelevance", () => {
  const lowVitD: LabMarker = {
    id: "l1", userId: "u1", marker: "Vitamin D", value: 18,
    unit: "ng/mL", referenceLow: 30, referenceHigh: 100, date: null, notes: null,
  };

  it("notes support when a related marker is below range", () => {
    const items = [makeItem({ supplementId: "vitamin-d", dose: 2000, unit: "IU" })];
    const flags = ruleLabRelevance(ctx({ items, profile: makeProfile(), labMarkers: [lowVitD] }));
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("info");
    expect(flags[0].category).toBe("lab-relevance");
  });

  it("warns when a related marker is above range", () => {
    const high: LabMarker = { ...lowVitD, value: 120 };
    const items = [makeItem({ supplementId: "vitamin-d", dose: 2000, unit: "IU" })];
    expect(
      ruleLabRelevance(ctx({ items, profile: makeProfile(), labMarkers: [high] }))[0].severity,
    ).toBe("warning");
  });

  it("surfaces an unrecognized lab marker as an info flag (curation honesty)", () => {
    const unknown: LabMarker = { ...lowVitD, marker: "Dragon Enzyme" };
    const items = [makeItem({ supplementId: "vitamin-d", dose: 2000, unit: "IU" })];
    const flags = ruleLabRelevance(ctx({ items, profile: makeProfile(), labMarkers: [unknown] }));
    const note = flags.find((f) => /not recognized/i.test(f.title));
    expect(note).toBeDefined();
    expect(note!.severity).toBe("info");
    expect(note!.category).toBe("lab-relevance");
  });
});

describe("ruleLabTrend (lab-timeline v4)", () => {
  const items = [makeItem({ supplementId: "vitamin-d", dose: 2000, unit: "IU" })];

  it("notes an improving trajectory (low marker rising toward range)", () => {
    const trends = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "rising", 46)];
    const flags = ruleLabTrend(ctx({ items, trends }));
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe("lab-relevance");
    expect(flags[0].severity).toBe("info");
    expect(flags[0].stackItemId).toBe(items[0].id);
    expect(/helpful direction/i.test(flags[0].title)).toBe(true);
  });

  it("notes a worsening trajectory (low marker falling further from range)", () => {
    const trends = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "falling", -20)];
    const flags = ruleLabTrend(ctx({ items, trends }));
    expect(flags[0].title).toMatch(/away from range/i);
  });

  it("emits nothing without a relevant supplement in the stack", () => {
    const trends = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "rising", 46)];
    const other = [makeItem({ supplementId: "taurine", dose: 1000 })];
    expect(ruleLabTrend(ctx({ items: other, trends }))).toHaveLength(0);
  });

  it("ignores stable / insufficient trends", () => {
    const stable = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "stable", 2)];
    expect(ruleLabTrend(ctx({ items, trends: stable }))).toHaveLength(0);
    const insufficient = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "insufficient", null)];
    expect(ruleLabTrend(ctx({ items, trends: insufficient }))).toHaveLength(0);
  });

  it("trend copy is non-diagnostic", () => {
    const trends = [makeTrend("vitamin-d-25oh", "25-OH Vitamin D", "falling", -20)];
    for (const f of ruleLabTrend(ctx({ items, trends }))) {
      expect(containsBannedLanguage(`${f.title} ${f.explanation} ${f.recommendation}`)).toBe(false);
    }
  });
});

describe("ruleInteractions", () => {
  it("flags a real supplement↔drug interaction as critical (engine-backed)", () => {
    const items = [makeItem({ supplementId: "berberine", dose: 1000 })];
    const profile = makeProfile({ medications: ["metformin"] }); // antidiabetic
    const flags = ruleInteractions(ctx({ items, profile }));
    // v12: food-pairing guidance may also surface; assert the drug interaction specifically.
    const drugFlag = flags.find((f) => f.category === "medication-caution");
    expect(drugFlag).toBeDefined();
    expect(drugFlag?.severity).toBe("critical"); // drug-interaction warning escalates
    expect(drugFlag?.stackItemId).toBe(items[0].id);
  });

  it("flags a supplement↔supplement interaction within the stack", () => {
    const items = [
      makeItem({ supplementId: "magnesium", dose: 300 }),
      makeItem({ supplementId: "zinc", dose: 30 }),
    ];
    const flags = ruleInteractions(ctx({ items, profile: makeProfile() }));
    expect(flags.some((f) => f.category === "interaction-risk")).toBe(true);
  });

  it("does not raise medication/interaction risk when there are no medications and no risky pairs", () => {
    const items = [makeItem({ supplementId: "berberine", dose: 1000 })];
    const flags = ruleInteractions(ctx({ items, profile: makeProfile() }));
    // v12: food-pairing info flags may appear, but no medication/interaction-risk flags.
    expect(
      flags.some(
        (f) =>
          f.category === "medication-caution" ||
          f.category === "interaction-risk",
      ),
    ).toBe(false);
  });

  it("surfaces an unrecognized medication as an info flag (curation honesty)", () => {
    const items = [makeItem({ supplementId: "creatine", dose: 5 })];
    const profile = makeProfile({ medications: ["dragon tonic"] });
    const flags = ruleInteractions(ctx({ items, profile }));
    const note = flags.find((f) => /not recognized/i.test(f.title));
    expect(note).toBeDefined();
    expect(note!.severity).toBe("info");
  });
});

describe("ruleComplexity", () => {
  it("flags overly large stacks", () => {
    const items = Array.from({ length: 13 }, () => makeItem({ supplementId: "zinc", dose: 10 }));
    const flags = ruleComplexity(ctx({ items }));
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe("complexity");
  });

  it("does not flag a reasonable stack size", () => {
    const items = Array.from({ length: 5 }, () => makeItem({ supplementId: "zinc", dose: 10 }));
    expect(ruleComplexity(ctx({ items }))).toHaveLength(0);
  });
});

describe("evaluateStack (integration)", () => {
  it("aggregates flags, sorts critical first, and summarizes", () => {
    const result = evaluateStack({
      stack: makeStack({ intent: "sleep" }),
      items: [
        makeItem({ supplementId: "magnesium", dose: 1500, unit: "mg" }), // dose critical
        makeItem({ supplementId: "fish-oil", dose: 1000, unit: "mg" }), // allergy warning + evidence-fit info
      ],
      profile: makeProfile({ allergies: ["fish"], goals: ["sleep"] }),
    });

    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0].severity).toBe("critical"); // sorted critical-first
    expect(result.summary.critical).toBeGreaterThanOrEqual(1);
    expect(
      result.summary.critical + result.summary.warning + result.summary.info,
    ).toBe(result.flags.length);
  });

  it("produces only non-diagnostic language across all flags", () => {
    const result = evaluateStack({
      stack: makeStack({ intent: "sleep" }),
      items: [
        makeItem({ supplementId: "magnesium", dose: 1500, unit: "mg" }),
        makeItem({ supplementId: "berberine", dose: 1000, unit: "mg" }),
        makeItem({ supplementId: "taurine", dose: 1000, unit: "mg" }),
      ],
      profile: makeProfile({ goals: ["sleep"], medications: ["metformin"] }),
    });
    for (const f of result.flags) {
      expect(containsBannedLanguage(`${f.title} ${f.explanation} ${f.recommendation}`)).toBe(false);
    }
  });

  it("returns an empty, well-formed result for an empty stack", () => {
    const result = evaluateStack({ stack: makeStack(), items: [] });
    expect(result.flags).toHaveLength(0);
    expect(result.summary).toEqual({ critical: 0, warning: 0, info: 0 });
  });
});
