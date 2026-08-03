// Domain/Application — accept/reject boundary tests for the write schemas (Phase 1 U9).
//
// WHY THIS EXISTS. These eight schemas are the server-side validation boundary
// for every write in the application (Design §6, §7). Route tests from U1–U4
// prove a route returns 400 for *some* invalid body; they do not pin WHICH
// bodies are invalid. Nothing until now asserted that `dose` rejects 0, that
// `ratings` rejects 6, or that an unrecognised side-effect label is refused
// rather than stored.
//
// The failure class is silent widening. `.positive()` relaxed to `.min(0)`, an
// `.int()` dropped, a `.max()` raised — none of these break a single existing
// test, none change a type, and each one lets a value through that the domain
// downstream assumes cannot exist. A dose of 0 divides; a rating of 6 breaks a
// 1–5 scale; a non-canonical side-effect label fabricates a correlation the
// engine will happily compute over (CLAUDE.md §2.2 rule 7).
//
// So every case below is a BOUNDARY pair where it matters: the last accepted
// value and the first rejected one. A test that only checks "obviously wrong
// input is rejected" cannot detect a widening of one step.
import { describe, expect, it } from "vitest";
import {
  checkinInputSchema,
  generateProtocolSchema,
  labMarkerInputSchema,
  matchProductsSchema,
  profileInputSchema,
  reportedSideEffectSchema,
  stackInputSchema,
  stackItemInputSchema,
} from "./schemas";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("stackItemInputSchema — the dose boundary", () => {
  const base = { supplementId: "magnesium", unit: "mg" };

  it("accepts the smallest positive dose", () => {
    expect(stackItemInputSchema.safeParse({ ...base, dose: 0.001 }).success).toBe(true);
  });

  it("rejects dose = 0", () => {
    // The exact widening plan §6.2 names: `.positive()` → `.min(0)`.
    expect(stackItemInputSchema.safeParse({ ...base, dose: 0 }).success).toBe(false);
  });

  it("rejects a negative dose", () => {
    expect(stackItemInputSchema.safeParse({ ...base, dose: -1 }).success).toBe(false);
  });

  it("rejects a non-numeric dose rather than coercing it", () => {
    expect(stackItemInputSchema.safeParse({ ...base, dose: "300" }).success).toBe(false);
  });

  it("requires either a supplementId or a customName", () => {
    const neither = stackItemInputSchema.safeParse({ dose: 1, unit: "mg" });
    expect(neither.success).toBe(false);

    expect(
      stackItemInputSchema.safeParse({ customName: "Homemade blend", dose: 1, unit: "mg" }).success,
    ).toBe(true);
  });

  it("applies null defaults for every optional field", () => {
    const parsed = stackItemInputSchema.parse({ ...base, dose: 300 });

    expect(parsed).toMatchObject({
      customName: null,
      timing: null,
      frequency: null,
      reason: null,
      notes: null,
    });
  });

  it("rejects a timing or frequency outside the enum", () => {
    expect(
      stackItemInputSchema.safeParse({ ...base, dose: 1, timing: "whenever" }).success,
    ).toBe(false);
    expect(
      stackItemInputSchema.safeParse({ ...base, dose: 1, frequency: "hourly" }).success,
    ).toBe(false);
  });

  it("rejects a unit at 21 characters but accepts 20", () => {
    expect(stackItemInputSchema.safeParse({ ...base, dose: 1, unit: "u".repeat(20) }).success).toBe(true);
    expect(stackItemInputSchema.safeParse({ ...base, dose: 1, unit: "u".repeat(21) }).success).toBe(false);
  });

  it("rejects an empty unit", () => {
    expect(stackItemInputSchema.safeParse({ ...base, dose: 1, unit: "" }).success).toBe(false);
  });

  it("strips unknown keys instead of preserving them", () => {
    // Load-bearing beyond tidiness: /api/stacks/:id/items relies on this to
    // ignore a body-supplied stackId (plan §6.2.2, the M4 lesson).
    const parsed = stackItemInputSchema.parse({ ...base, dose: 1, stackId: "s-forged" });

    expect(parsed).not.toHaveProperty("stackId");
  });
});

describe("stackInputSchema", () => {
  it("accepts a valid stack and defaults mode to current", () => {
    const parsed = stackInputSchema.parse({ name: "Sleep", intent: "sleep" });

    expect(parsed).toMatchObject({ mode: "current", description: null });
  });

  it("accepts the experimental intent, which is not an outcome category", () => {
    expect(stackInputSchema.safeParse({ name: "Lab", intent: "experimental" }).success).toBe(true);
  });

  it("rejects an unknown intent", () => {
    expect(stackInputSchema.safeParse({ name: "X", intent: "vibes" }).success).toBe(false);
  });

  it("rejects an empty name but accepts one character", () => {
    expect(stackInputSchema.safeParse({ name: "", intent: "sleep" }).success).toBe(false);
    expect(stackInputSchema.safeParse({ name: "a", intent: "sleep" }).success).toBe(true);
  });

  it("rejects a name at 121 characters but accepts 120", () => {
    expect(stackInputSchema.safeParse({ name: "n".repeat(120), intent: "sleep" }).success).toBe(true);
    expect(stackInputSchema.safeParse({ name: "n".repeat(121), intent: "sleep" }).success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    expect(
      stackInputSchema.safeParse({ name: "X", intent: "sleep", mode: "archived" }).success,
    ).toBe(false);
  });
});

describe("labMarkerInputSchema — the reference-range refinement", () => {
  const base = { marker: "Ferritin", value: 45, unit: "ng/mL" };

  it("accepts a marker with no reference range", () => {
    expect(labMarkerInputSchema.parse(base)).toMatchObject({
      referenceLow: null,
      referenceHigh: null,
      date: null,
      notes: null,
    });
  });

  it("accepts high == low, the boundary of the cross-field rule", () => {
    expect(
      labMarkerInputSchema.safeParse({ ...base, referenceLow: 30, referenceHigh: 30 }).success,
    ).toBe(true);
  });

  it("rejects an inverted reference range", () => {
    // A cross-field rule no per-field check can express.
    expect(
      labMarkerInputSchema.safeParse({ ...base, referenceLow: 100, referenceHigh: 30 }).success,
    ).toBe(false);
  });

  it("accepts a half-open range in either direction", () => {
    expect(labMarkerInputSchema.safeParse({ ...base, referenceLow: 30 }).success).toBe(true);
    expect(labMarkerInputSchema.safeParse({ ...base, referenceHigh: 400 }).success).toBe(true);
  });

  it("rejects a non-finite value", () => {
    // Infinity would flow straight into a numeric comparison in the lab engine.
    expect(labMarkerInputSchema.safeParse({ ...base, value: Infinity }).success).toBe(false);
    expect(labMarkerInputSchema.safeParse({ ...base, value: NaN }).success).toBe(false);
  });

  it("rejects an empty marker name or unit", () => {
    expect(labMarkerInputSchema.safeParse({ ...base, marker: "" }).success).toBe(false);
    expect(labMarkerInputSchema.safeParse({ ...base, unit: "" }).success).toBe(false);
  });

  it("accepts a negative value — some markers legitimately report one", () => {
    expect(labMarkerInputSchema.safeParse({ ...base, value: -1 }).success).toBe(true);
  });
});

describe("profileInputSchema", () => {
  it("defaults every field, so an empty body is a valid empty profile", () => {
    expect(profileInputSchema.parse({})).toEqual({
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
    });
  });

  it("rejects a goal outside the outcome categories", () => {
    expect(profileInputSchema.safeParse({ goals: ["vibes"] }).success).toBe(false);
    expect(profileInputSchema.safeParse({ goals: ["sleep", "longevity"] }).success).toBe(true);
  });

  it("rejects an unknown riskTolerance or experienceLevel", () => {
    expect(profileInputSchema.safeParse({ riskTolerance: "reckless" }).success).toBe(false);
    expect(profileInputSchema.safeParse({ experienceLevel: "expert" }).success).toBe(false);
  });

  it("rejects a medication string at 121 characters but accepts 120", () => {
    // Health data with a length cap: the boundary is the whole rule.
    expect(profileInputSchema.safeParse({ medications: ["m".repeat(120)] }).success).toBe(true);
    expect(profileInputSchema.safeParse({ medications: ["m".repeat(121)] }).success).toBe(false);
  });

  it("rejects an allergy string at 81 characters but accepts 80", () => {
    expect(profileInputSchema.safeParse({ allergies: ["a".repeat(80)] }).success).toBe(true);
    expect(profileInputSchema.safeParse({ allergies: ["a".repeat(81)] }).success).toBe(false);
  });

  it("rejects an unknown form preference", () => {
    expect(profileInputSchema.safeParse({ formPreferences: ["injection"] }).success).toBe(false);
  });
});

describe("checkinInputSchema — the 1–5 rating scale", () => {
  const base = { date: "2026-08-04" };

  it("accepts the scale endpoints", () => {
    expect(checkinInputSchema.safeParse({ ...base, ratings: { sleep: 1 } }).success).toBe(true);
    expect(checkinInputSchema.safeParse({ ...base, ratings: { sleep: 5 } }).success).toBe(true);
  });

  it("rejects one step outside the scale in either direction", () => {
    expect(checkinInputSchema.safeParse({ ...base, ratings: { sleep: 0 } }).success).toBe(false);
    expect(checkinInputSchema.safeParse({ ...base, ratings: { sleep: 6 } }).success).toBe(false);
  });

  it("rejects a fractional rating", () => {
    expect(checkinInputSchema.safeParse({ ...base, ratings: { sleep: 4.5 } }).success).toBe(false);
  });

  it("rejects a rating keyed by a non-outcome category", () => {
    expect(checkinInputSchema.safeParse({ ...base, ratings: { vibes: 3 } }).success).toBe(false);
  });

  it("requires an ISO date and rejects other date shapes", () => {
    expect(checkinInputSchema.safeParse({ date: "2026-08-04" }).success).toBe(true);
    expect(checkinInputSchema.safeParse({ date: "04/08/2026" }).success).toBe(false);
    expect(checkinInputSchema.safeParse({ date: "2026-8-4" }).success).toBe(false);
  });

  it("caps structured side-effect reports at 20", () => {
    const one = { effectLabel: "nausea" };
    expect(
      checkinInputSchema.safeParse({ ...base, sideEffects: Array(20).fill(one) }).success,
    ).toBe(true);
    expect(
      checkinInputSchema.safeParse({ ...base, sideEffects: Array(21).fill(one) }).success,
    ).toBe(false);
  });

  it("defaults every optional field so a bare date is a valid check-in", () => {
    expect(checkinInputSchema.parse(base)).toEqual({
      date: "2026-08-04",
      ratings: {},
      taken: [],
      scheduled: [],
      note: null,
      sideEffect: null,
      sideEffects: [],
    });
  });
});

describe("reportedSideEffectSchema — canonical vocabulary", () => {
  it("normalises a recognised label to its canonical form", () => {
    const parsed = reportedSideEffectSchema.parse({ effectLabel: "Nausea" });

    expect(parsed.effectLabel).toBe("nausea");
  });

  it("rejects an unrecognised label instead of storing it", () => {
    // CLAUDE.md §2.2 rule 7: a non-canonical string that reached storage would
    // let the engine compute a co-occurrence over a label it cannot ground.
    const result = reportedSideEffectSchema.safeParse({ effectLabel: "feeling weird" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["effectLabel"]);
      expect(result.error.issues[0].message).toContain("Unrecognized side-effect");
    }
  });

  it("accepts the severity endpoints and rejects one step outside", () => {
    expect(reportedSideEffectSchema.safeParse({ effectLabel: "nausea", severity: 1 }).success).toBe(true);
    expect(reportedSideEffectSchema.safeParse({ effectLabel: "nausea", severity: 3 }).success).toBe(true);
    expect(reportedSideEffectSchema.safeParse({ effectLabel: "nausea", severity: 0 }).success).toBe(false);
    expect(reportedSideEffectSchema.safeParse({ effectLabel: "nausea", severity: 4 }).success).toBe(false);
  });
});

describe("uuid-only request schemas", () => {
  it("accept a uuid and reject anything else", () => {
    for (const schema of [matchProductsSchema, generateProtocolSchema]) {
      expect(schema.safeParse({ stackId: UUID }).success).toBe(true);
      expect(schema.safeParse({ stackId: "not-a-uuid" }).success).toBe(false);
      expect(schema.safeParse({ stackId: "" }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    }
  });
});
