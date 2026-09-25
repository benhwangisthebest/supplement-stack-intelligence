// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering an evidence grade ships
// with a component test. EffectGradeBadge is where every Library, Stack Lab and
// protocol grade letter is drawn. Each grade must show its own letter and its own
// word, and the tooltip must say the same thing. Grade D reads "Preliminary",
// never a stronger word. Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EVIDENCE_GRADES, type EvidenceGrade } from "@/types";
import { EffectGradeBadge } from "./EffectGradeBadge";

afterEach(cleanup);

const WORD: Record<EvidenceGrade, string> = {
  A: "Strong",
  B: "Moderate",
  C: "Limited",
  D: "Preliminary",
};

describe("EffectGradeBadge — the grade letter and its word (rule 8)", () => {
  it.each(EVIDENCE_GRADES)("grade %s renders its own letter, word and tooltip", (grade) => {
    render(<EffectGradeBadge grade={grade} />);
    const badge = screen.getByTitle(`Evidence grade ${grade} — ${WORD[grade]}`);
    expect(within(badge).getByText(grade)).toBeTruthy();
    expect(within(badge).getByText(WORD[grade])).toBeTruthy();
  });

  it("Grade D is never shown with a stronger word", () => {
    render(<EffectGradeBadge grade="D" />);
    for (const stronger of ["Strong", "Moderate", "Limited"]) {
      expect(screen.queryByText(stronger)).toBeNull();
    }
  });

  it("adds the confidence to the badge and its tooltip when given, and omits it otherwise", () => {
    render(<EffectGradeBadge grade="B" confidence="low" />);
    const badge = screen.getByTitle("Evidence grade B — Moderate · low confidence");
    expect(within(badge).getByText("· low")).toBeTruthy();
    cleanup();
    render(<EffectGradeBadge grade="B" />);
    expect(screen.queryByText(/confidence|· /)).toBeNull();
  });
});
