import { describe, expect, it } from "vitest";
import { SEED_FOOD_PAIRINGS } from "@/data/seed-food-pairings";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { containsBannedLanguage } from "@/lib/safety";
import type { StackItem } from "@/types/stack";
import type { InteractionRule } from "@/types/interaction";
import { findInteractions, foodPairingsForSupplement } from "./index";
import { toInteractionFlags, hasCriticalInteraction } from "./to-flags";
import { validateInteractionRules } from "./schema";

function item(supplementId: string | null): StackItem {
  return {
    id: `item-${supplementId ?? "custom"}`,
    stackId: "stack-1",
    supplementId,
    customName: null,
    dose: 1,
    unit: "mg",
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
  };
}

const validFoodRule: InteractionRule = {
  id: "test-food",
  kind: "supplement-food",
  supplementId: "vitamin-d",
  direction: "synergy",
  food: "a fat-containing meal",
  timing: "with food",
  severity: "info",
  mechanism: "fat aids absorption of a fat-soluble vitamin",
  management: "take with a meal",
  evidenceGrade: "B",
};

describe("food-pairings — schema", () => {
  it("accepts a well-formed supplement-food rule", () => {
    expect(() => validateInteractionRules([validFoodRule])).not.toThrow();
  });

  it("rejects a supplement-food rule missing direction", () => {
    const { direction: _omit, ...bad } = validFoodRule;
    expect(() =>
      validateInteractionRules([bad as InteractionRule]),
    ).toThrow();
  });

  it("rejects a supplement-food rule missing food", () => {
    const { food: _omit, ...bad } = validFoodRule;
    expect(() =>
      validateInteractionRules([bad as InteractionRule]),
    ).toThrow();
  });

  it("rejects a supplement-food rule that also sets otherSupplementId", () => {
    const bad = { ...validFoodRule, otherSupplementId: "zinc" };
    expect(() => validateInteractionRules([bad])).toThrow();
  });
});

describe("food-pairings — seed integrity", () => {
  it("validates the whole seed dataset", () => {
    expect(() => validateInteractionRules(SEED_FOOD_PAIRINGS)).not.toThrow();
  });

  it("references only supplements that exist in the catalog", () => {
    const ids = new Set(SEED_SUPPLEMENTS.map((s) => s.id));
    for (const rule of SEED_FOOD_PAIRINGS) {
      expect(ids.has(rule.supplementId)).toBe(true);
    }
  });

  it("uses only the food kind and a valid direction", () => {
    for (const rule of SEED_FOOD_PAIRINGS) {
      expect(rule.kind).toBe("supplement-food");
      expect(["synergy", "avoid"]).toContain(rule.direction);
    }
  });

  it("produces no banned language in generated flag copy", () => {
    const suppIds = [...new Set(SEED_FOOD_PAIRINGS.map((r) => r.supplementId))];
    const findings = findInteractions({
      medications: [],
      stackItems: suppIds.map((id) => item(id)),
    });
    const flags = toInteractionFlags(findings);
    for (const flag of flags) {
      expect(containsBannedLanguage(flag.title)).toBe(false);
      expect(containsBannedLanguage(flag.explanation)).toBe(false);
      expect(containsBannedLanguage(flag.recommendation)).toBe(false);
    }
  });
});

describe("food-pairings — foodPairingsForSupplement", () => {
  it("returns only that supplement's food rules", () => {
    const rules = foodPairingsForSupplement("zinc");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.supplementId === "zinc")).toBe(true);
  });

  it("sorts synergy before avoid", () => {
    // magnesium has synergy; use a supplement with both if present, else assert order rule
    const rules = foodPairingsForSupplement("zinc");
    const firstAvoidIdx = rules.findIndex((r) => r.direction === "avoid");
    const lastSynergyIdx = rules.map((r) => r.direction).lastIndexOf("synergy");
    if (firstAvoidIdx !== -1 && lastSynergyIdx !== -1) {
      expect(lastSynergyIdx).toBeLessThan(firstAvoidIdx);
    }
  });

  it("returns [] for an unknown supplement", () => {
    expect(foodPairingsForSupplement("does-not-exist")).toEqual([]);
  });
});

describe("food-pairings — findInteractions", () => {
  it("emits food findings when the supplement is in the stack (no meds needed)", () => {
    const findings = findInteractions({
      medications: [],
      stackItems: [item("vitamin-d")],
    });
    const food = findings.filter((f) => f.kind === "supplement-food");
    expect(food.length).toBeGreaterThan(0);
    expect(food[0]).toMatchObject({
      supplementId: "vitamin-d",
      direction: "synergy",
    });
    expect(food[0].food).toBeTruthy();
  });

  it("is deterministic (identical input → deep-equal output)", () => {
    const input = { medications: [], stackItems: [item("zinc")] };
    expect(findInteractions(input)).toEqual(findInteractions(input));
  });
});

describe("food-pairings — to-flags", () => {
  it("renders synergy as an info flag under the food-pairing category", () => {
    const findings = findInteractions({
      medications: [],
      stackItems: [item("vitamin-d")],
    });
    const flags = toInteractionFlags(findings);
    const synergy = flags.find((f) => f.category === "food-pairing");
    expect(synergy).toBeDefined();
    expect(synergy?.severity).toBe("info");
  });

  it("never escalates food guidance to critical", () => {
    const findings = findInteractions({
      medications: [],
      stackItems: [item("caffeine"), item("zinc"), item("melatonin")],
    });
    const foodFlags = toInteractionFlags(findings).filter(
      (f) => f.category === "food-pairing",
    );
    expect(foodFlags.length).toBeGreaterThan(0);
    expect(foodFlags.every((f) => f.severity !== "critical")).toBe(true);
    expect(hasCriticalInteraction(findings)).toBe(false);
  });
});
