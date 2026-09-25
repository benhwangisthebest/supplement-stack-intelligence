// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering an evidence grade (or a
// safety caution) ships with a component test. SuggestionCard is one protocol
// suggestion. Its grade must be the suggestion's own, and a medication caution must
// escalate to a clinician in the hedged wording §2.1 requires.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProtocolSuggestion } from "@/types";
import { SuggestionCard } from "./SuggestionCard";

afterEach(cleanup);

const suggestion = (over: Partial<ProtocolSuggestion>): ProtocolSuggestion => ({
  supplementId: "made-up",
  supplementName: "Made-up supplement",
  outcomeCategory: "sleep",
  effectId: "made-up-effect",
  grade: "D",
  tier: "experimental",
  dose: { min: 1, max: 2, unit: "mg" },
  timing: null,
  rationale: "Made-up rationale.",
  confidenceNote: null,
  labBoosted: false,
  medicationCaution: false,
  alreadyInStack: false,
  ...over,
});

const renderCard = (s: ProtocolSuggestion) =>
  render(<SuggestionCard suggestion={s} busy={false} onAccept={vi.fn()} onDismiss={vi.fn()} />);

const CAUTION = "May interact with medications — worth discussing with a clinician.";

describe("SuggestionCard — grade and medication caution (rule 8)", () => {
  it.each([
    ["A", "Strong"],
    ["D", "Preliminary"],
  ] as const)("shows the suggestion's own grade %s (%s)", (grade, word) => {
    renderCard(suggestion({ grade }));
    const badge = screen.getByTitle(`Evidence grade ${grade} — ${word}`);
    expect(within(badge).getByText(grade)).toBeTruthy();
  });

  it("escalates a medication caution to a clinician, and says nothing when there is none", () => {
    renderCard(suggestion({ medicationCaution: true }));
    expect(screen.getByText(CAUTION)).toBeTruthy();
    cleanup();
    renderCard(suggestion({ medicationCaution: false }));
    expect(screen.queryByText(CAUTION)).toBeNull();
  });

  it("names the supplement as a heading and shows its rationale", () => {
    renderCard(suggestion({}));
    expect(screen.getByRole("heading", { name: "Made-up supplement" })).toBeTruthy();
    expect(screen.getByText("Made-up rationale.")).toBeTruthy();
  });
});
