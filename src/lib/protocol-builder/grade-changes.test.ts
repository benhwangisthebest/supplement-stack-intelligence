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
