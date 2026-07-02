import { describe, expect, it } from "vitest";
import type { IdentityContext } from "@/types/identity";
import {
  confidenceLevel,
  deriveConfidence,
  DEVELOPING_DATA_DEPTH,
  EMERGING_DATA_DEPTH,
  sharpenSuggestions,
} from "./confidence";

function ctx(partial: Partial<IdentityContext> = {}): IdentityContext {
  return { profile: null, stacks: [], hasLabs: false, ...partial };
}

describe("confidenceLevel", () => {
  it("maps dataDepth to the three levels at the documented thresholds", () => {
    expect(confidenceLevel(0)).toBe("emerging");
    expect(confidenceLevel(EMERGING_DATA_DEPTH - 0.01)).toBe("emerging");
    expect(confidenceLevel(EMERGING_DATA_DEPTH)).toBe("developing");
    expect(confidenceLevel(DEVELOPING_DATA_DEPTH - 0.01)).toBe("developing");
    expect(confidenceLevel(DEVELOPING_DATA_DEPTH)).toBe("established");
    expect(confidenceLevel(1)).toBe("established");
  });
});

describe("sharpenSuggestions", () => {
  it("surfaces every gap for an empty context", () => {
    const tips = sharpenSuggestions(ctx());
    expect(tips.length).toBe(4); // goals, risk tolerance, build a stack, labs
    expect(tips.some((t) => t.toLowerCase().includes("goal"))).toBe(true);
    expect(tips.some((t) => t.toLowerCase().includes("lab"))).toBe(true);
  });

  it("returns no tips when the context is already rich", () => {
    const tips = sharpenSuggestions(
      ctx({
        profile: { goals: ["training"], riskTolerance: "moderate", experienceLevel: "advanced", filledFieldCount: 6 },
        stacks: [{ stackId: "s1", name: "S", intent: "training", itemSupplementIds: ["creatine", "magnesium", "zinc"] }],
        hasLabs: true,
      }),
    );
    expect(tips).toEqual([]);
  });

  it("nudges to add items when a stack exists but is sparse", () => {
    const tips = sharpenSuggestions(
      ctx({
        profile: { goals: ["training"], riskTolerance: "moderate", experienceLevel: null, filledFieldCount: 4 },
        stacks: [{ stackId: "s1", name: "S", intent: "training", itemSupplementIds: ["creatine"] }],
        hasLabs: true,
      }),
    );
    expect(tips.some((t) => t.toLowerCase().includes("more items"))).toBe(true);
  });
});

describe("deriveConfidence", () => {
  it("returns the level and sharpen list together", () => {
    const res = deriveConfidence(ctx(), 0.1);
    expect(res.level).toBe("emerging");
    expect(res.sharpen.length).toBeGreaterThan(0);
  });
});
