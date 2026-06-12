import { describe, expect, it } from "vitest";
import type { StackItem } from "@/types";
import { computeCompare } from "./index";

let seq = 0;
function item(supplementId: string | null): StackItem {
  seq += 1;
  return {
    id: `i${seq}`,
    stackId: "s1",
    supplementId,
    customName: supplementId ? null : "custom",
    dose: 1,
    unit: "mg",
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
  };
}

describe("computeCompare", () => {
  it("marks goals covered when a supplement has a matching effect", () => {
    // magnesium has a sleep effect; berberine does not.
    const result = computeCompare(["sleep", "focus"], [item("magnesium")]);
    expect(result.coveredGoals).toContain("sleep");
    expect(result.uncoveredGoals).toContain("focus");
    expect(result.itemsByGoal.sleep).toContain("magnesium");
  });

  it("reports all uncovered when no items match", () => {
    const result = computeCompare(["focus"], [item("magnesium")]);
    expect(result.coveredGoals).toHaveLength(0);
    expect(result.uncoveredGoals).toEqual(["focus"]);
  });

  it("ignores custom (non-seed) items", () => {
    const result = computeCompare(["sleep"], [item(null)]);
    expect(result.coveredGoals).toHaveLength(0);
  });

  it("handles an empty goal list", () => {
    const result = computeCompare([], [item("magnesium")]);
    expect(result.goals).toHaveLength(0);
    expect(result.coveredGoals).toHaveLength(0);
    expect(result.uncoveredGoals).toHaveLength(0);
  });
});
