// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag or an
// evidence grade ships with a component test. FoodPairingSection splits a
// supplement's food rules into "Pairs well with" (synergy) and "Best to space apart"
// (avoid, the caution). A rule must land in its own group and carry its own grade.
// Expectations come from foodPairingsForSupplement, the engine the section calls.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { foodPairingsForSupplement } from "@/lib/interactions";
import { FoodPairingSection } from "./FoodPairingSection";

afterEach(cleanup);

/** The list under a group heading ("Pairs well with" / "Best to space apart"). */
const group = (name: string) =>
  screen.getByRole("heading", { name }).parentElement!.querySelector("ul") as HTMLElement;

describe("FoodPairingSection — group and grade per food rule (rule 8)", () => {
  it.each([
    ["zinc", "avoid", "Best to space apart", "Pairs well with"],
    ["vitamin-d", "synergy", "Pairs well with", "Best to space apart"],
  ] as const)("%s: every %s rule is under '%s' with its own grade", (id, direction, heading, other) => {
    const rules = foodPairingsForSupplement(id).filter((r) => r.direction === direction);
    expect(rules.length, "anti-vacuity").toBeGreaterThan(0);
    render(<FoodPairingSection supplementId={id} />);
    const list = group(heading);
    expect(within(list).getAllByRole("listitem")).toHaveLength(rules.length);
    for (const rule of rules) {
      const li = within(list).getByRole("heading", { name: rule.food! }).closest("li") as HTMLElement;
      expect(within(li).getByText(`evidence ${rule.evidenceGrade}`)).toBeTruthy();
      expect(within(li).getByText(`${rule.mechanism}.`)).toBeTruthy();
    }
    expect(screen.queryByRole("heading", { name: other })).toBeNull();
  });

  it("the zinc fixture carries two different grades (anti-vacuity for the per-rule grade)", () => {
    expect(new Set(foodPairingsForSupplement("zinc").map((r) => r.evidenceGrade)).size).toBe(2);
  });
});
