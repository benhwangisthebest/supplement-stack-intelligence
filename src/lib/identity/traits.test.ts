import { describe, expect, it } from "vitest";
import type { IdentityContext, IdentityStack, TraitAxis } from "@/types/identity";
import { TRAIT_AXES } from "@/types/identity";
import { computeTraitVector, describeTraits, PROFILE_FIELD_COUNT } from "./traits";

function ctx(partial: Partial<IdentityContext> = {}): IdentityContext {
  return { profile: null, stacks: [], hasLabs: false, ...partial };
}

function stack(
  intent: IdentityStack["intent"],
  itemSupplementIds: (string | null)[],
  id = "s1",
): IdentityStack {
  return { stackId: id, name: `${intent} stack`, intent, itemSupplementIds };
}

describe("computeTraitVector", () => {
  it("is deterministic and bounded [0,1] on all axes", () => {
    const c = ctx({
      profile: { goals: ["training"], riskTolerance: "moderate", experienceLevel: null, filledFieldCount: 3 },
      stacks: [stack("training", ["creatine"])],
    });
    const a = computeTraitVector(c);
    const b = computeTraitVector(c);
    expect(a).toEqual(b);
    for (const axis of TRAIT_AXES) {
      expect(a[axis]).toBeGreaterThanOrEqual(0);
      expect(a[axis]).toBeLessThanOrEqual(1);
    }
  });

  it("scores evidenceRigor high for a strongly-graded item (creatine → training = A)", () => {
    const v = computeTraitVector(ctx({ stacks: [stack("training", ["creatine"])] }));
    expect(v.evidenceRigor).toBeGreaterThanOrEqual(0.66);
  });

  it("scores evidenceRigor 0 for custom/free-text items", () => {
    const v = computeTraitVector(ctx({ stacks: [stack("training", [null, null])] }));
    expect(v.evidenceRigor).toBe(0);
  });

  it("maxes riskAppetite for an experimental stack + high risk tolerance", () => {
    const v = computeTraitVector(
      ctx({
        profile: { goals: [], riskTolerance: "high", experienceLevel: null, filledFieldCount: 2 },
        stacks: [stack("experimental", ["creatine"])],
      }),
    );
    expect(v.riskAppetite).toBeCloseTo(1, 5);
  });

  it("keeps riskAppetite low for a well-evidenced, low-tolerance stack", () => {
    const v = computeTraitVector(
      ctx({
        profile: { goals: [], riskTolerance: "low", experienceLevel: null, filledFieldCount: 2 },
        stacks: [stack("training", ["creatine"])],
      }),
    );
    expect(v.riskAppetite).toBeLessThan(0.34);
  });

  it("sets foundationalFocus = 1 when all items serve a foundational outcome", () => {
    const v = computeTraitVector(ctx({ stacks: [stack("deficiency", ["vitamin-d"])] }));
    expect(v.foundationalFocus).toBe(1);
  });

  it("increases breadth with more distinct outcome domains", () => {
    const narrow = computeTraitVector(
      ctx({ profile: { goals: ["sleep"], riskTolerance: null, experienceLevel: null, filledFieldCount: 1 }, stacks: [] }),
    );
    const wide = computeTraitVector(
      ctx({
        profile: { goals: ["sleep", "focus", "training", "longevity"], riskTolerance: null, experienceLevel: null, filledFieldCount: 1 },
        stacks: [],
      }),
    );
    expect(wide.breadth).toBeGreaterThan(narrow.breadth);
  });

  it("raises dataDepth with fuller profile, more stacks/items, and labs", () => {
    const thin = computeTraitVector(ctx());
    const rich = computeTraitVector(
      ctx({
        profile: { goals: ["training"], riskTolerance: "moderate", experienceLevel: "advanced", filledFieldCount: PROFILE_FIELD_COUNT },
        stacks: [stack("training", ["creatine", "magnesium", "zinc"]), stack("sleep", ["magnesium"], "s2")],
        hasLabs: true,
      }),
    );
    expect(rich.dataDepth).toBeGreaterThan(thin.dataDepth);
    expect(rich.dataDepth).toBeGreaterThan(0.6);
  });
});

describe("describeTraits", () => {
  it("returns one trait per axis with matching values", () => {
    const c = ctx({ stacks: [stack("training", ["creatine"])] });
    const v = computeTraitVector(c);
    const traits = describeTraits(c, v);
    expect(traits).toHaveLength(TRAIT_AXES.length);
    for (const t of traits) {
      expect(t.value).toBe(v[t.axis as TraitAxis]);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.derivation.length).toBeGreaterThan(0);
    }
  });
});
