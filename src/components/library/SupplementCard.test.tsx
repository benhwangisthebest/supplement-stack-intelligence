// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering an evidence grade ships
// with a component test. SupplementCard is the Library search result. The grade it
// shows must be its top effect's own grade, and with no top effect it shows none,
// rather than a default letter. Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { BACKGROUND_LABEL } from "@/lib/safety";
import type { Effect } from "@/types";
import { SupplementCard } from "./SupplementCard";

afterEach(cleanup);

const supplement = SEED_SUPPLEMENTS.find((s) => s.id === "magnesium")!;

// Phase 4 U2 (FU-63): the profile is required. The card reads only the literal
// grade, never one derived from this profile (whose all-1 scores would derive a D).
const dim = { score: 1 as const, rationale: "Made-up rationale.", paperIds: [] };
const madeUpProfile: Effect["evidenceProfile"] = {
  dimensions: {
    humanEvidence: dim,
    studyQuality: dim,
    consistency: dim,
    effectSize: dim,
    populationRelevance: dim,
  },
};

const effect = (over: Partial<Effect>): Effect => ({
  id: "made-up-effect",
  supplementId: supplement.id,
  name: "Made-up effect",
  outcomeCategory: "sleep",
  grade: "C",
  confidence: "low",
  summary: "Made-up summary.",
  relevantPopulation: "made-up population",
  studiedDose: { min: 1, max: 2, unit: "mg" },
  mechanismTags: [],
  paperIds: [],
  evidenceProfile: madeUpProfile,
  ...over,
});

describe("SupplementCard — the top effect's grade (rule 8)", () => {
  it("links to the supplement's Library page", () => {
    render(<SupplementCard supplement={supplement} backgroundLabel={BACKGROUND_LABEL} />);
    const link = screen.getByRole("link", { name: new RegExp(supplement.name) });
    expect(link.getAttribute("href")).toBe(`/library/${supplement.slug}`);
  });

  it.each(["A", "C", "D"] as const)("shows the top effect's own grade %s and its confidence", (grade) => {
    render(<SupplementCard supplement={supplement} backgroundLabel={BACKGROUND_LABEL} topEffect={effect({ grade, confidence: "moderate" })} />);
    const badge = screen.getByTitle(new RegExp(`^Evidence grade ${grade} — .* · moderate confidence$`));
    expect(within(badge).getByText(grade)).toBeTruthy();
  });

  it("shows no grade at all without a top effect", () => {
    render(<SupplementCard supplement={supplement} backgroundLabel={BACKGROUND_LABEL} />);
    expect(screen.queryByTitle(/Evidence grade/)).toBeNull();
  });
});

// Phase 4 U6 (c), owner ruling (3) 2026-09-28: the description renders only under the
// background label, which the server page passes down as a prop (the card is in a client graph).
describe("SupplementCard — the description is labelled background (U6 (c))", () => {
  it("renders the label and the description in one block, label first", () => {
    render(<SupplementCard supplement={supplement} backgroundLabel={BACKGROUND_LABEL} />);
    const label = screen.getByText(BACKGROUND_LABEL);
    const block = label.closest("[data-background='description']")!;
    expect(block).toBeTruthy();
    expect(within(block as HTMLElement).getByText(supplement.description)).toBeTruthy();
    expect(block.firstElementChild).toBe(label);
  });

  it("renders the description exactly once, inside that block", () => {
    const { container } = render(<SupplementCard supplement={supplement} backgroundLabel={BACKGROUND_LABEL} />);
    expect(container.textContent!.split(supplement.description)).toHaveLength(2);
    const block = container.querySelector("[data-background='description']")!;
    expect(block.textContent).toContain(supplement.description);
  });
});
