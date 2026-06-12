import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "@/data/seed-products";
import { containsBannedLanguage } from "@/lib/safety";
import type { Product, StackItem, SupplementForm, UserProfile } from "@/types";
import { matchProducts } from "./index";

let seq = 0;
function item(supplementId: string | null, dose: number, unit: string): StackItem {
  seq += 1;
  return {
    id: `i${seq}`,
    stackId: "s1",
    supplementId,
    customName: supplementId ? null : "custom",
    dose,
    unit,
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
  };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "p1", userId: "u1", goals: [], diet: null, riskTolerance: null,
    allergies: [], medications: [], avoidedIngredients: [], formPreferences: [],
    caffeineSensitivity: null, experienceLevel: null, notes: null,
    createdAt: "2026-06-11T00:00:00Z", updatedAt: "2026-06-11T00:00:00Z",
    ...overrides,
  };
}

const magGroup = (p?: UserProfile, products?: Product[]) =>
  matchProducts({ stackItems: [item("magnesium", 300, "mg")], profile: p, products }).groups[0];

describe("matchProducts", () => {
  it("ranks candidate products for a stack item by fit score", () => {
    const g = magGroup();
    expect(g.matches.length).toBe(2);
    expect(g.matches[0].fitScore).toBeGreaterThanOrEqual(g.matches[1].fitScore);
  });

  it("excludes allergen-conflicting products (hard filter)", () => {
    const g = matchProducts({
      stackItems: [item("fish-oil", 1000, "mg")],
      profile: profile({ allergies: ["fish"] }),
    }).groups[0];
    expect(g.matches).toHaveLength(0);
  });

  it("scores an exact dose match highest on the dose sub-score", () => {
    const g = magGroup();
    const acme = g.matches.find((m) => m.product.id === "mag-acme-glycinate");
    expect(acme?.breakdown.dose).toBe(1); // 300 == target 300
  });

  it("boosts products matching the form preference", () => {
    const g = magGroup(profile({ formPreferences: ["capsule"] as SupplementForm[] }));
    const acme = g.matches.find((m) => m.product.id === "mag-acme-glycinate"); // capsule
    const oxide = g.matches.find((m) => m.product.id === "mag-valuline-oxide"); // tablet
    expect(acme?.breakdown.form).toBe(1);
    expect(oxide?.breakdown.form).toBeLessThan(1);
  });

  it("rewards third-party testing", () => {
    const g = magGroup();
    const acme = g.matches.find((m) => m.product.id === "mag-acme-glycinate"); // NSF
    const oxide = g.matches.find((m) => m.product.id === "mag-valuline-oxide"); // none
    expect(acme?.breakdown.testing).toBe(1);
    expect(oxide?.breakdown.testing).toBeLessThan(1);
  });

  it("penalizes additives/fillers", () => {
    const g = magGroup();
    const oxide = g.matches.find((m) => m.product.id === "mag-valuline-oxide"); // 2 additives
    expect(oxide?.breakdown.additives).toBeCloseTo(0.7, 5); // 1 - 2*0.15
  });

  it("computes price per effective dose", () => {
    const g = magGroup();
    const acme = g.matches.find((m) => m.product.id === "mag-acme-glycinate");
    // 24 / 120 servings / doseFit(1) = 0.2
    expect(acme?.pricePerEffectiveDose).toBeCloseTo(0.2, 3);
  });

  it("is invariant to the affiliate link (trust guard)", () => {
    const withAff = SEED_PRODUCTS.filter((p) => p.supplementId === "magnesium").map((p) => ({
      ...p,
      affiliateLink: "https://aff.example/x",
    }));
    const withoutAff = withAff.map((p) => ({ ...p, affiliateLink: null }));
    const a = magGroup(undefined, withAff).matches.map((m) => [m.product.id, m.fitScore]);
    const b = magGroup(undefined, withoutAff).matches.map((m) => [m.product.id, m.fitScore]);
    expect(a).toEqual(b); // identical scores AND order
  });

  it("returns empty matches for custom items or supplements with no products", () => {
    const custom = matchProducts({ stackItems: [item(null, 1, "mg")] });
    expect(custom.groups).toHaveLength(0); // custom item skipped entirely
    const none = matchProducts({ stackItems: [item("nonexistent-supp", 1, "mg")] }).groups[0];
    expect(none.matches).toHaveLength(0);
  });

  it("produces only non-diagnostic reasons", () => {
    const result = matchProducts({
      stackItems: [
        item("magnesium", 300, "mg"),
        item("fish-oil", 1000, "mg"),
        item("protein-powder", 25, "g"),
      ],
      profile: profile({ formPreferences: ["capsule"] as SupplementForm[] }),
    });
    for (const g of result.groups) {
      for (const m of g.matches) {
        for (const r of m.reasons) {
          expect(containsBannedLanguage(r), r).toBe(false);
        }
      }
    }
  });

  it("is deterministic", () => {
    const items = [item("magnesium", 300, "mg")]; // fixed input for both runs
    const a = JSON.stringify(matchProducts({ stackItems: items }));
    const b = JSON.stringify(matchProducts({ stackItems: items }));
    expect(a).toBe(b);
  });
});
