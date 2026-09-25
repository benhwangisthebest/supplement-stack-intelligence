// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag or an
// evidence grade ships with a component test. BiomarkerRelevanceSection shows, per
// linked marker, whether the supplement may support it or may worsen it ("caution"),
// with the rule's evidence grade. Every expectation below is the engine's own answer
// (biomarkersForSupplement), so the copy is bound to the computation (§5 rule 4).
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { biomarkersForSupplement } from "@/lib/biomarkers";
import { DISCLAIMERS } from "@/lib/safety";
import { BiomarkerRelevanceSection } from "./BiomarkerRelevanceSection";

afterEach(cleanup);

// vitamin-d carries both relations, and grades that differ between rows.
const SUPPLEMENT = "vitamin-d";
const rows = biomarkersForSupplement(SUPPLEMENT);

describe("BiomarkerRelevanceSection — relation and grade per marker (rule 8)", () => {
  it("the fixture exercises a caution row and more than one grade (anti-vacuity)", () => {
    expect(rows.some((r) => r.rule.relation === "caution")).toBe(true);
    expect(rows.some((r) => r.rule.relation === "support")).toBe(true);
    expect(new Set(rows.map((r) => r.rule.evidenceGrade)).size).toBeGreaterThan(1);
  });

  it("each marker shows its own relation and its own evidence grade", () => {
    render(<BiomarkerRelevanceSection supplementId={SUPPLEMENT} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);
    for (const { biomarker, rule } of rows) {
      const li = screen
        .getAllByRole("heading", { name: biomarker.name })
        .map((h) => h.closest("li") as HTMLElement)
        .find((el) => within(el).queryByText(`when ${rule.trigger}`))!;
      expect(li, `${biomarker.name} when ${rule.trigger}`).toBeTruthy();
      expect(within(li).getByText(rule.relation)).toBeTruthy();
      expect(within(li).getByText(`evidence ${rule.evidenceGrade}`)).toBeTruthy();
      expect(within(li).getByText(`${rule.rationale}.`)).toBeTruthy();
    }
  });

  it("closes with the labs disclaimer", () => {
    render(<BiomarkerRelevanceSection supplementId={SUPPLEMENT} />);
    expect(screen.getByText(DISCLAIMERS.labs)).toBeTruthy();
  });

  it("an unlinked supplement says so without implying nothing is worth reviewing", () => {
    render(<BiomarkerRelevanceSection supplementId="made-up-supplement" />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/does not\s+mean your labs have nothing worth reviewing/)).toBeTruthy();
    expect(screen.getByText(DISCLAIMERS.labs)).toBeTruthy();
  });
});
