// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag or an
// evidence grade ships with a component test. InteractionSection lists a
// supplement's curated interactions. Each row's severity chip must be the rule's own
// severity (a "warning" may never read as "info"), with the rule's grade and its
// management text. Expectations come from interactionsForSupplement.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { interactionsForSupplement } from "@/lib/interactions";
import { InteractionSection } from "./InteractionSection";

afterEach(cleanup);

describe("InteractionSection — severity, grade and management per rule (rule 8)", () => {
  it.each(["fish-oil", "ashwagandha", "magnesium"])("%s: each row shows its own rule", (id) => {
    const rules = interactionsForSupplement(id);
    expect(rules.length, "anti-vacuity").toBeGreaterThan(0);
    render(<InteractionSection supplementId={id} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(rules.length);
    rules.forEach((rule, i) => {
      const li = items[i];
      expect(within(li).getByText(rule.severity)).toBeTruthy();
      expect(within(li).getByText(new RegExp(`evidence ${rule.evidenceGrade}$`))).toBeTruthy();
      expect(within(li).getByText(`${rule.mechanism}.`)).toBeTruthy();
      expect(within(li).getByText(rule.management)).toBeTruthy();
    });
  });

  it("the fixtures cover more than one severity, including one above 'info' (anti-vacuity)", () => {
    const severities = new Set(
      ["fish-oil", "ashwagandha", "magnesium"].flatMap((id) => interactionsForSupplement(id).map((r) => r.severity)),
    );
    expect(severities.has("warning")).toBe(true);
    expect(severities.size).toBeGreaterThan(2);
  });
});
