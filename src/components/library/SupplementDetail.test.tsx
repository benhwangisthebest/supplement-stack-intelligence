// Phase 3 U4 (owner ruling 2026-09-23, E2E fix option a). After U4 every seed
// effect carries an evidenceProfile (G4), so the Library's no-profile fallback —
// `e.evidenceProfile && <EvidenceBreakdown …/>` in SupplementDetail — can no longer
// be reached from the seed, and the E2E spec that used l-theanine as its
// "legacy (unprofiled)" example had to change. The fallback is guarded here with
// made-up effects instead (docs/01-plan/features/p3-u4-profiles.plan.md).
// Phase 4 U2 made Effect.evidenceProfile REQUIRED (FU-63). [2026-09-29, Phase 4 U20; N-90]
// The fallback and its unprofiled test are retired: an unprofiled effect no longer
// type-checks, and SupplementDetail renders the breakdown for every effect. The profiled
// test stays as the positive check that the breakdown renders.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { BACKGROUND_LABEL } from "@/lib/safety";
import type { Effect, Paper } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { SupplementDetail } from "./SupplementDetail";

afterEach(cleanup);

const supplement = SEED_SUPPLEMENTS.find((s) => s.id === "l-theanine")!;

const dim = { score: 2 as const, rationale: "Made-up rationale.", paperIds: [] };
const profile: EvidenceProfile = {
  dimensions: {
    humanEvidence: dim,
    studyQuality: dim,
    consistency: dim,
    effectSize: dim,
    populationRelevance: dim,
  },
};

const effect = (id: string, name: string, evidenceProfile: EvidenceProfile = profile): Effect => ({
  id,
  supplementId: supplement.id,
  name,
  outcomeCategory: "focus",
  grade: "B",
  confidence: "moderate",
  summary: "Made-up summary.",
  relevantPopulation: "made-up population",
  studiedDose: { min: 1, max: 2, unit: "mg" },
  mechanismTags: [],
  paperIds: [],
  evidenceProfile,
});

function renderEffects(effects: Effect[]) {
  render(<SupplementDetail supplement={supplement} effects={effects} papers={[]} related={[]} />);
  fireEvent.click(screen.getByRole("tab", { name: "Effects" }));
}

describe("SupplementDetail — the evidence breakdown (U4, FU-63)", () => {
  it("an effect shows its evidence breakdown", () => {
    renderEffects([effect("made-up-profiled", "Made-up profiled effect")]);
    const card = document.getElementById("effect-made-up-profiled")!;
    expect(within(card).getByText("Evidence breakdown")).toBeTruthy();
  });
});

// Phase 3 closeout (a), FU-67. SupplementDetail is a rule-8 member: it renders each
// effect's evidence grade and each cited paper. Until now no test here asserted
// either, so a card showing the wrong grade, or no paper, stayed green. Expectations
// are the badge's own words for each letter. Red proof: hard-coding `grade="A"` or
// dropping the badge fails the first test, and not rendering PaperSummaryCard fails
// the second (closeout artifact).
const GRADE_WORD = { A: "Strong", B: "Moderate", C: "Limited", D: "Preliminary" } as const;

describe("SupplementDetail — each effect shows its own grade; each cited paper renders (rule 8, FU-67)", () => {
  it("every effect card carries the badge for its own grade and confidence", () => {
    const cases = [
      { id: "g-a", grade: "A", confidence: "high" },
      { id: "g-b", grade: "B", confidence: "moderate" },
      { id: "g-c", grade: "C", confidence: "low" },
      { id: "g-d", grade: "D", confidence: "low" },
    ] as const;
    renderEffects(
      cases.map((c) => ({ ...effect(c.id, `Made-up ${c.id}`, profile), grade: c.grade, confidence: c.confidence })),
    );
    for (const c of cases) {
      const card = document.getElementById(`effect-${c.id}`)!;
      const badge = within(card).getByTitle(
        `Evidence grade ${c.grade} — ${GRADE_WORD[c.grade]} · ${c.confidence} confidence`,
      );
      expect(badge.textContent).toBe(`${c.grade}${GRADE_WORD[c.grade]}· ${c.confidence}`);
    }
  });

  it("the Evidence summaries tab renders every paper it is given, at its anchor", () => {
    const paper = (id: string): Paper => ({
      id,
      title: `Made-up paper ${id}`,
      population: "made-up population",
      intervention: "made-up intervention",
      dose: "made-up dose",
      duration: "made-up duration",
      outcomes: "made-up outcomes",
      limitations: "made-up limitations",
      summary: "Made-up summary.",
    });
    render(
      <SupplementDetail supplement={supplement} effects={[]} papers={[paper("p-1"), paper("p-2")]} related={[]} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Evidence summaries (2)" }));
    for (const id of ["p-1", "p-2"]) {
      const anchor = document.getElementById(`paper-${id}`)!;
      expect(within(anchor).getByRole("heading", { level: 4 }).textContent).toBe(`Made-up paper ${id}`);
    }
  });
});

// Phase 4 U6 (c), owner rulings (2) and (3) 2026-09-28. Every seed supplement: the Summary
// tab shows the description under the background label and never the mechanismSummary.
describe("SupplementDetail — background label, no mechanism text (U6 (c))", () => {
  it.each(SEED_SUPPLEMENTS.map((s) => [s.id, s] as const))("%s", (_id, s) => {
    const { container } = render(<SupplementDetail supplement={s} effects={[]} papers={[]} related={[]} />);
    const label = screen.getByText(BACKGROUND_LABEL);
    const block = label.closest("[data-background='description']") as HTMLElement;
    expect(within(block).getByText(s.description)).toBeTruthy();
    expect(block.firstElementChild).toBe(label);
    expect(container.textContent).not.toContain(s.mechanismSummary);
    expect(screen.queryByRole("heading", { name: "Mechanism" })).toBeNull();
  });
});
