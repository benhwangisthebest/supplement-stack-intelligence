import { describe, expect, it } from "vitest";
import type { OutcomeCategory, UserProfile } from "@/types";
import { generateProtocol } from "./index";

// Phase 3 U4, owner ruling R10 (2026-09-23). U4 derives every grade from a
// verified evidence profile, and some letters change. No engine test named the
// effects whose grade changed, so the new behaviour was unpinned. Each row pins
// the protocol tier the real seed library now produces for that effect's
// supplement under its own goal (tierFor: A → foundational/targeted, B →
// targeted, C → advanced, D → experimental). One row per changed effect; each
// U4 batch adds its own. Red proof: every row failed against the seed as it was
// before its batch (docs/01-plan/features/p3-u4-profiles.plan.md).

function profile(goal: OutcomeCategory): UserProfile {
  return {
    id: "p1",
    userId: "u1",
    goals: [goal],
    diet: null,
    riskTolerance: null,
    allergies: [],
    medications: [],
    avoidedIngredients: [],
    formPreferences: [],
    caffeineSensitivity: null,
    experienceLevel: null,
    notes: null,
    createdAt: "2026-09-23T00:00:00Z",
    updatedAt: "2026-09-23T00:00:00Z",
  };
}

const PINS: { batch: string; effect: string; supplementId: string; goal: OutcomeCategory; grade: string; tier: string }[] = [
  // B1: zinc-deficiency A → C (one intake–status meta-analysis, no deficient subgroup)
  { batch: "B1", effect: "zinc-deficiency", supplementId: "zinc", goal: "deficiency", grade: "C", tier: "advanced" },
  // B1: vitamin-b12-deficiency A → B (B-1 + B-2 + the vegan study; quality and consistency weak)
  { batch: "B1", effect: "vitamin-b12-deficiency", supplementId: "vitamin-b12", goal: "deficiency", grade: "B", tier: "targeted" },
  // B2: magnesium-stress C → D (one post-hoc trial, no placebo arm)
  { batch: "B2", effect: "magnesium-stress", supplementId: "magnesium", goal: "stress", grade: "D", tier: "experimental" },
  // B2: fish-oil-mood C → B (26 RCTs; benefit only in EPA-rich subgroups, consistency weak)
  { batch: "B2", effect: "fish-oil-mood", supplementId: "fish-oil", goal: "mood", grade: "B", tier: "targeted" },
  // B3: l-theanine-stress B → D (one 12-person laboratory crossover trial)
  { batch: "B3", effect: "l-theanine-stress", supplementId: "l-theanine", goal: "stress", grade: "D", tier: "experimental" },
  // B3: glycine-sleep B → D (R6: its only paper is title-only; no verified evidence in this library)
  { batch: "B3", effect: "glycine-sleep", supplementId: "glycine", goal: "sleep", grade: "D", tier: "experimental" },
  // B3: ashwagandha-sleep C → B (5 RCTs; I² 62%; effect small but significant)
  { batch: "B3", effect: "ashwagandha-sleep", supplementId: "ashwagandha", goal: "sleep", grade: "B", tier: "targeted" },
  // B4: zinc-immune B → C (low-certainty treatment benefit, I² 97%; prevention null)
  { batch: "B4", effect: "zinc-immune", supplementId: "zinc", goal: "foundational", grade: "C", tier: "advanced" },
  // B4: nac-antioxidant C → D (R5: cites no paper; no verified evidence in this library)
  { batch: "B4", effect: "nac-antioxidant", supplementId: "nac", goal: "longevity", grade: "D", tier: "experimental" },
  // B4: protein-powder-recovery B → D (R5: cites no paper; no verified evidence in this library)
  { batch: "B4", effect: "protein-powder-recovery", supplementId: "protein-powder", goal: "recovery", grade: "D", tier: "experimental" },
  // B6: magnesium-sleep B → D (3 small RCTs, moderate-to-high risk of bias, low to very low quality)
  { batch: "B6", effect: "magnesium-sleep", supplementId: "magnesium", goal: "sleep", grade: "D", tier: "experimental" },
  // B6: vitamin-d-deficiency A → B (one placebo RCT; the meta-analyses compare forms and regimens)
  { batch: "B6", effect: "vitamin-d-deficiency", supplementId: "vitamin-d", goal: "deficiency", grade: "B", tier: "targeted" },
  // B6: fish-oil-cardiovascular B → A (90 RCTs, near-linear triglyceride lowering)
  { batch: "B6", effect: "fish-oil-cardiovascular", supplementId: "fish-oil", goal: "metabolic", grade: "A", tier: "foundational" },
  // B6: melatonin-sleep A → B (19 RCTs; modest effects; primary sleep disorders only)
  { batch: "B6", effect: "melatonin-sleep", supplementId: "melatonin", goal: "sleep", grade: "B", tier: "targeted" },
  // B6: caffeine-focus A → B (high risk of bias; benefit mainly under sleep loss)
  { batch: "B6", effect: "caffeine-focus", supplementId: "caffeine", goal: "focus", grade: "B", tier: "targeted" },
];

describe("U4 grade changes: the protocol tier each changed effect now produces (R10)", () => {
  it.each(PINS)("$batch $effect → Grade $grade, tier $tier", ({ effect, supplementId, goal, grade, tier }) => {
    const group = generateProtocol({ profile: profile(goal) }).groups.find((g) => g.goal === goal);
    const s = group?.suggestions.find((x) => x.supplementId === supplementId);
    expect(s?.effectId).toBe(effect);
    expect(s?.grade).toBe(grade);
    expect(s?.tier).toBe(tier);
  });
});
