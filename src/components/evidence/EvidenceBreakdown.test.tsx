// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a citation ships with a
// component test. EvidenceBreakdown shows, per grading dimension, the papers that
// justify it. Each tag must be that paper's own title. A cited id with no paper
// renders nothing, never a placeholder (§2.2 rule 8). It also carries U7's two
// honesty statements: "not assessed" for a 0 that cites no paper (versus "none" for
// a 0 that does), and the Grade D note it is handed. CoverageLimit.test.tsx covers
// those statements across surfaces; this file pins them on the component itself.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COVERAGE } from "@/lib/safety";
import type { Paper } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { EvidenceBreakdown } from "./EvidenceBreakdown";

afterEach(cleanup);

const paper = (id: string, title: string): Paper => ({
  id,
  title,
  population: "made-up",
  intervention: "made-up",
  dose: "made-up",
  duration: "made-up",
  outcomes: "made-up",
  limitations: "made-up",
  summary: "made-up",
});

const papers = [paper("p-one", "Made-up paper one"), paper("p-two", "Made-up paper two")];

const profile: EvidenceProfile = {
  dimensions: {
    humanEvidence: { score: 3, rationale: "Human rationale.", paperIds: ["p-one", "p-two"] },
    studyQuality: { score: 0, rationale: "Quality rationale.", paperIds: [] },
    consistency: { score: 0, rationale: "Consistency rationale.", paperIds: ["p-one"] },
    effectSize: { score: 2, rationale: "Size rationale.", paperIds: ["p-missing"] },
    populationRelevance: { score: 1, rationale: "Population rationale.", paperIds: [] },
  },
};

/** One dimension's row, found by its label. */
const row = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

describe("EvidenceBreakdown — cited papers per dimension (rule 8)", () => {
  it("tags each dimension with its own cited papers' titles", () => {
    render(<EvidenceBreakdown profile={profile} papers={papers} />);
    const human = row("Human evidence");
    expect(within(human).getByTitle("Made-up paper one").textContent).toBe("Made-up paper one");
    expect(within(human).getByTitle("Made-up paper two").textContent).toBe("Made-up paper two");
    const consistency = row("Consistency");
    expect(within(consistency).getByTitle("Made-up paper one")).toBeTruthy();
    expect(within(consistency).queryByTitle("Made-up paper two")).toBeNull();
  });

  it("renders no tag, and no link, for a cited id the papers do not hold", () => {
    render(<EvidenceBreakdown profile={profile} papers={papers} />);
    const size = row("Effect size");
    expect(within(size).queryByTitle(/./)).toBeNull();
    expect(within(size).queryByText("p-missing")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("a 0 citing no paper reads 'not assessed'; a 0 citing a paper reads 'none' (U7)", () => {
    render(<EvidenceBreakdown profile={profile} papers={papers} />);
    expect(within(row("Study quality")).getByText("not assessed")).toBeTruthy();
    expect(within(row("Consistency")).getByText("none")).toBeTruthy();
    expect(within(row("Consistency")).queryByText("not assessed")).toBeNull();
    expect(within(row("Human evidence")).getByText("strong")).toBeTruthy();
  });

  it("shows the Grade D note it is given, and none without one (U7)", () => {
    render(<EvidenceBreakdown profile={profile} papers={papers} gradeNote={COVERAGE.gradeDUncited} />);
    expect(screen.getByText(COVERAGE.gradeDUncited.text)).toBeTruthy();
    cleanup();
    render(<EvidenceBreakdown profile={profile} papers={papers} />);
    expect(screen.queryByText(COVERAGE.gradeDUncited.text)).toBeNull();
    expect(screen.queryByText(COVERAGE.gradeDLimited.text)).toBeNull();
  });
});
