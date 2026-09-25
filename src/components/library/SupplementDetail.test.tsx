// Phase 3 U4 (owner ruling 2026-09-23, E2E fix option a). After U4 every seed
// effect carries an evidenceProfile (G4), so the Library's no-profile fallback —
// `e.evidenceProfile && <EvidenceBreakdown …/>` in SupplementDetail — can no longer
// be reached from the seed, and the E2E spec that used l-theanine as its
// "legacy (unprofiled)" example had to change. The fallback is guarded here with
// made-up effects instead. Red proof: rendering the breakdown unconditionally fails
// the first test (docs/01-plan/features/p3-u4-profiles.plan.md).
// Phase 4 U2 made Effect.evidenceProfile REQUIRED (FU-63), so the unprofiled
// effect below is built past the type with a cast. The branch and this test stay
// until the owner rules on retiring them (U2 artifact).
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
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

const effect = (id: string, name: string, evidenceProfile?: EvidenceProfile): Effect => {
  // Every field but the profile is type-checked; only the unprofiled case is cast.
  const base: Omit<Effect, "evidenceProfile"> = {
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
  };
  return evidenceProfile ? { ...base, evidenceProfile } : (base as Effect);
};

function renderEffects(effects: Effect[]) {
  render(<SupplementDetail supplement={supplement} effects={effects} papers={[]} related={[]} />);
  fireEvent.click(screen.getByRole("tab", { name: "Effects" }));
}

describe("SupplementDetail — the no-profile fallback (U4, FU-63)", () => {
  it("an effect without an evidenceProfile shows its grade but no breakdown", () => {
    renderEffects([effect("made-up-unprofiled", "Made-up unprofiled effect")]);
    const card = document.getElementById("effect-made-up-unprofiled")!;
    expect(within(card).getByText("Made-up unprofiled effect")).toBeTruthy();
    // FU-67: the title promised a grade and nothing asserted one.
    expect(within(card).getByTitle("Evidence grade B — Moderate · moderate confidence")).toBeTruthy();
    expect(within(card).queryByText("Evidence breakdown")).toBeNull();
  });

  it("an effect with an evidenceProfile shows the breakdown (anti-vacuity)", () => {
    renderEffects([effect("made-up-profiled", "Made-up profiled effect", profile)]);
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
