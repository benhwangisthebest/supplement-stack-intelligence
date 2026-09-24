// Phase 3 U7 — coverage honesty: the guard behind [P3-X4] ("every surface that
// can show partial coverage states its coverage limit; test-verified") and
// CLAUDE.md §2.2 rule 10 (absence of a warning is not a safety signal).
// Cycle record: docs/01-plan/features/p3-u7-coverage-honesty.plan.md.
//
// Three checks.
//   1. RENDER — each surface, in its none state and its limit state, renders a
//      `coverage-limit` for the right dataset and state, with the COVERAGE text.
//      None states use made-up ids, so they hold however the seed grows.
//   2. COMPLETENESS — derived from the FILESYSTEM, not from the table: every
//      component importing a dataset accessor module must be a SURFACE, every
//      SURFACE must render <CoverageLimit, and every SURFACE must have a case
//      in RENDER_CASES. A new surface cannot opt itself out by omission.
//   3. COPY — every COVERAGE text passes the banned-language sweep.
import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { foodPairingsForSupplement, interactionsForSupplement } from "@/lib/interactions";
import { getEffectsForSupplement, getPapersForEffect } from "@/lib/evidence";
import { COVERAGE, containsBannedLanguage, type CoverageCopy } from "@/lib/safety";
import { profileForSupplement } from "@/lib/side-effects";
import type { Effect, EvaluationFlag, Paper, Stack, StackItem, Supplement } from "@/types";
import type { EvidenceProfile } from "@/types/evidence-grading";
import { EvidenceBreakdown } from "@/components/evidence/EvidenceBreakdown";
import { FoodPairingSection } from "@/components/library/FoodPairingSection";
import { InteractionSection } from "@/components/library/InteractionSection";
import { SupplementDetail } from "@/components/library/SupplementDetail";
import { WhatToWatch } from "@/components/library/WhatToWatch";
import { StackWorkspace } from "@/components/stack/StackWorkspace";
import { attachedProductLabels, stackLabCopy } from "@/components/stack/stack-lab-props";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ROOT = path.resolve(__dirname, "../../..");
const MADE_UP = "made-up-supplement";

/** Each surface that renders a curated dataset, and why it is one. */
const SURFACES: Record<string, string> = {
  "src/components/library/InteractionSection.tsx": "interaction rules for a supplement",
  "src/components/library/FoodPairingSection.tsx": "food pairings for a supplement",
  "src/components/library/WhatToWatch.tsx": "curated side-effect profile",
  "src/components/library/SupplementDetail.tsx":
    "effects, and the Supplement's sideEffects / contraindications lists (props, not an accessor import)",
  "src/components/stack/StackWorkspace.tsx":
    "stack evaluation over the curated datasets (API result, not an accessor import)",
  "src/components/evidence/EvidenceBreakdown.tsx":
    "per-dimension evidence: a dimension citing no paper, and the Grade D statement (U7 b2)",
};

/** Modules whose import makes a component a surface. `vocab` and
 *  `medication-names` are label/autocomplete helpers, not coverage-bearing data. */
const ACCESSOR_IMPORT = /from\s+["']@\/lib\/(interactions|side-effects)["']/;

function expectCoverage(copy: CoverageCopy) {
  const hits = screen
    .queryAllByTestId("coverage-limit")
    .filter((el) => el.dataset.dataset === copy.dataset && el.dataset.state === copy.state);
  expect(
    hits.map((el) => el.textContent),
    `expected a ${copy.dataset}/${copy.state} coverage statement`,
  ).toContain(copy.text);
}

function expectNoCoverage(copy: CoverageCopy) {
  const texts = screen.queryAllByTestId("coverage-limit").map((el) => el.textContent);
  expect(texts).not.toContain(copy.text);
}

const firstSeed = (pred: (id: string) => boolean) => {
  const s = SEED_SUPPLEMENTS.find((x) => pred(x.id));
  if (!s) throw new Error("no seed supplement satisfies the listed-state precondition");
  return s.id;
};

const madeUpSupplement = (over: Partial<Supplement> = {}): Supplement => ({
  ...SEED_SUPPLEMENTS[0],
  id: MADE_UP,
  slug: MADE_UP,
  name: "Made-up supplement",
  sideEffects: ["Made-up side effect"],
  contraindications: ["Made-up contraindication"],
  allergenTags: [],
  ...over,
});

const madeUpEffect: Effect = {
  id: "made-up-effect",
  supplementId: MADE_UP,
  name: "Made-up effect",
  outcomeCategory: "focus",
  grade: "C",
  confidence: "low",
  summary: "Made-up summary.",
  relevantPopulation: "made-up population",
  studiedDose: { min: 1, max: 2, unit: "mg" },
  mechanismTags: [],
  paperIds: [],
};

function renderDetail(supplement: Supplement, effects: Effect[], tab?: string, papers: Paper[] = []) {
  render(<SupplementDetail supplement={supplement} effects={effects} papers={papers} related={[]} />);
  if (tab) fireEvent.click(screen.getByRole("tab", { name: tab }));
}

const stack: Stack = {
  id: "made-up-stack",
  userId: "made-up-user",
  name: "Made-up stack",
  intent: "focus",
  mode: "current",
  description: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} as Stack;

const item = (over: Partial<StackItem>): StackItem => ({
  id: "made-up-item",
  stackId: stack.id,
  supplementId: SEED_SUPPLEMENTS[0].id,
  customName: null,
  dose: 1,
  unit: "mg",
  timing: null,
  frequency: null,
  reason: null,
  notes: null,
  ...over,
});

/** Renders the workspace and runs one evaluation that comes back clean. */
async function evaluateClean(items: StackItem[], flags: EvaluationFlag[] = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ data: { flags, summary: { critical: 0, warning: 0, info: flags.length } } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  function Harness() {
    const [xs, setXs] = useState(items);
    return (
      <StackWorkspace
        stack={stack}
        items={xs}
        setItems={setXs}
        initialFlags={[]}
        supplements={[]}
        copy={stackLabCopy()}
        productLabels={attachedProductLabels()}
      />
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Evaluate stack" }));
  await screen.findByText(/0 critical/);
}

/** A seed supplement page exactly as /library/[slug] assembles it, Effects tab open. */
function renderSeedEffects(supplementId: string) {
  const supplement = SEED_SUPPLEMENTS.find((x) => x.id === supplementId)!;
  const effects = getEffectsForSupplement(supplementId);
  const papers = [
    ...new Map(effects.flatMap((e) => getPapersForEffect(e)).map((p) => [p.id, p])).values(),
  ];
  renderDetail(supplement, effects, "Effects", papers);
}

/** The Grade D statement on an effect card, split into card-level and breakdown-level. */
function gradeDStatements(effectId: string) {
  const card = document.getElementById(`effect-${effectId}`)!;
  const all = within(card).queryAllByTestId("coverage-limit");
  const texts = (inBreakdown: boolean) =>
    all.filter((el) => !!el.closest("details") === inBreakdown).map((el) => el.textContent);
  return { card: texts(false), breakdown: texts(true) };
}

const dim = (score: 0 | 1 | 2 | 3, paperIds: string[]) => ({
  score,
  rationale: "Made-up rationale.",
  paperIds,
});
const madeUpPaper = { id: "p-made-up", title: "Made-up paper" } as Paper;

/** RENDER cases, keyed by the SURFACES file each one exercises. */
const RENDER_CASES: Record<string, { name: string; run: () => void | Promise<void> }[]> = {
  "src/components/evidence/EvidenceBreakdown.tsx": [
    {
      name: "a dimension scoring 0 with no paper reads 'not assessed'; 0 with a paper reads 'none'",
      run: () => {
        const profile: EvidenceProfile = {
          dimensions: {
            humanEvidence: dim(0, []),
            studyQuality: dim(0, [madeUpPaper.id]),
            consistency: dim(2, [madeUpPaper.id]),
            effectSize: dim(1, [madeUpPaper.id]),
            populationRelevance: dim(3, [madeUpPaper.id]),
          },
        };
        render(<EvidenceBreakdown profile={profile} papers={[madeUpPaper]} />);
        const rating = (label: string) =>
          screen.getByText(label).parentElement!.querySelector("span.text-xs")!.textContent;
        expect(rating("Human evidence")).toBe("not assessed");
        expect(rating("Study quality")).toBe("none");
        expect(rating("Consistency")).toBe("moderate");
      },
    },
    {
      name: "the header renders the Grade D statement it is given, and none without one",
      run: () => {
        const profile: EvidenceProfile = {
          dimensions: {
            humanEvidence: dim(0, []),
            studyQuality: dim(0, []),
            consistency: dim(0, []),
            effectSize: dim(0, []),
            populationRelevance: dim(0, []),
          },
        };
        render(<EvidenceBreakdown profile={profile} papers={[]} gradeNote={COVERAGE.gradeDUncited} />);
        expectCoverage(COVERAGE.gradeDUncited);
        cleanup();
        render(<EvidenceBreakdown profile={profile} papers={[]} />);
        expect(screen.queryAllByTestId("coverage-limit")).toEqual([]);
      },
    },
  ],
  "src/components/library/InteractionSection.tsx": [
    {
      name: "none: a supplement with no interaction rules",
      run: () => {
        render(<InteractionSection supplementId={MADE_UP} />);
        expectCoverage(COVERAGE.interactionsNone);
        expectCoverage(COVERAGE.interactionsLimit);
      },
    },
    {
      name: "limit: a supplement with interaction rules",
      run: () => {
        render(
          <InteractionSection
            supplementId={firstSeed((id) => interactionsForSupplement(id).length > 0)}
          />,
        );
        expectNoCoverage(COVERAGE.interactionsNone);
        expectCoverage(COVERAGE.interactionsLimit);
      },
    },
  ],
  "src/components/library/FoodPairingSection.tsx": [
    {
      name: "none: a supplement with no food pairings",
      run: () => {
        render(<FoodPairingSection supplementId={MADE_UP} />);
        expectCoverage(COVERAGE.foodNone);
        expectCoverage(COVERAGE.foodLimit);
      },
    },
    {
      name: "limit: a supplement with food pairings",
      run: () => {
        render(
          <FoodPairingSection
            supplementId={firstSeed((id) => foodPairingsForSupplement(id).length > 0)}
          />,
        );
        expectNoCoverage(COVERAGE.foodNone);
        expectCoverage(COVERAGE.foodLimit);
      },
    },
  ],
  "src/components/library/WhatToWatch.tsx": [
    {
      name: "none: no curated profile — the section says so instead of vanishing",
      run: () => {
        render(<WhatToWatch supplementId={MADE_UP} />);
        expectCoverage(COVERAGE.watchNone);
      },
    },
    {
      name: "limit: a curated profile",
      run: () => {
        render(
          <WhatToWatch
            supplementId={firstSeed((id) => (profileForSupplement(id)?.entries.length ?? 0) > 0)}
          />,
        );
        expectNoCoverage(COVERAGE.watchNone);
        expectCoverage(COVERAGE.watchLimit);
      },
    },
  ],
  "src/components/library/SupplementDetail.tsx": [
    {
      name: "none: no contraindications does not read as 'none noted'",
      run: () => {
        renderDetail(madeUpSupplement({ contraindications: [] }), [madeUpEffect]);
        expectCoverage(COVERAGE.contraindicationsNone);
        expect(screen.queryByText("None noted.")).toBeNull();
      },
    },
    {
      name: "none: no side effects listed",
      run: () => {
        renderDetail(madeUpSupplement({ sideEffects: [] }), [madeUpEffect]);
        expectCoverage(COVERAGE.sideEffectsNone);
      },
    },
    {
      name: "limit: listed side effects and contraindications state their limit",
      run: () => {
        renderDetail(madeUpSupplement(), [madeUpEffect]);
        expectNoCoverage(COVERAGE.sideEffectsNone);
        expectNoCoverage(COVERAGE.contraindicationsNone);
        expectCoverage(COVERAGE.safetyListsLimit);
      },
    },
    {
      name: "none: no graded effects",
      run: () => {
        renderDetail(madeUpSupplement(), [], "Effects");
        expectCoverage(COVERAGE.effectsNone);
      },
    },
    {
      name: "D1: magnesium-sleep (Grade D, cites a paper) — card and breakdown header",
      run: () => {
        renderSeedEffects("magnesium");
        const d = gradeDStatements("magnesium-sleep");
        expect(d.card).toEqual([COVERAGE.gradeDLimited.text]);
        expect(d.breakdown).toEqual([COVERAGE.gradeDLimited.text]);
      },
    },
    {
      name: "D1: glycine-sleep (one verified, title-only paper) is D1, not D2",
      run: () => {
        renderSeedEffects("glycine");
        const d = gradeDStatements("glycine-sleep");
        expect(d.card).toEqual([COVERAGE.gradeDLimited.text]);
        expect(d.card).not.toContain(COVERAGE.gradeDUncited.text);
      },
    },
    {
      name: "D2: nac-antioxidant (Grade D, cites no paper) — card and breakdown header",
      run: () => {
        renderSeedEffects("nac");
        const d = gradeDStatements("nac-antioxidant");
        expect(d.card).toEqual([COVERAGE.gradeDUncited.text]);
        expect(d.breakdown).toEqual([COVERAGE.gradeDUncited.text]);
      },
    },
    {
      name: "binding: a non-D effect carries no Grade D statement",
      run: () => {
        renderSeedEffects("magnesium");
        const d = gradeDStatements("magnesium-metabolic");
        expect([...d.card, ...d.breakdown]).toEqual([]);
      },
    },
    {
      name: "limit: graded effects state that unlisted is not ruled out",
      run: () => {
        renderDetail(madeUpSupplement(), [madeUpEffect], "Effects");
        expectNoCoverage(COVERAGE.effectsNone);
        expectCoverage(COVERAGE.effectsLimit);
      },
    },
  ],
  "src/components/stack/StackWorkspace.tsx": [
    {
      name: "limit: a clean evaluation (0 flags) still states the limit",
      run: async () => {
        await evaluateClean([item({})]);
        expectCoverage(COVERAGE.stackEvaluationLimit);
        // Binding (§2.2 rule 7): no custom item, so no custom-item claim.
        expectNoCoverage(COVERAGE.stackCustomItems);
      },
    },
    {
      name: "limit: a custom item is named as unchecked",
      run: async () => {
        await evaluateClean([item({ supplementId: null, customName: "Made-up blend" })]);
        expectCoverage(COVERAGE.stackEvaluationLimit);
        expectCoverage(COVERAGE.stackCustomItems);
      },
    },
  ],
};

describe("coverage honesty — render (U7, [P3-X4])", () => {
  for (const [file, cases] of Object.entries(RENDER_CASES)) {
    for (const c of cases) {
      it(`${path.basename(file, ".tsx")} — ${c.name}`, c.run);
    }
  }
});

function componentFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return componentFiles(p);
    return /\.tsx$/.test(d.name) && !/\.test\.tsx$/.test(d.name) ? [p] : [];
  });
}

describe("coverage honesty — completeness (U7)", () => {
  const files = componentFiles(path.join(ROOT, "src/components")).map((f) =>
    path.relative(ROOT, f).split(path.sep).join("/"),
  );

  it("every component importing a dataset accessor is a registered surface", () => {
    const derived = files.filter((f) =>
      ACCESSOR_IMPORT.test(fs.readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(derived.length).toBeGreaterThan(0); // anti-vacuity
    expect(derived.filter((f) => !(f in SURFACES))).toEqual([]);
  });

  it("every registered surface exists and renders <CoverageLimit", () => {
    for (const f of Object.keys(SURFACES)) {
      expect(files, `${f} is registered but missing`).toContain(f);
      expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).toMatch(/<CoverageLimit\b/);
    }
  });

  it("every registered surface has a render case, and every case a surface", () => {
    expect(Object.keys(RENDER_CASES).sort()).toEqual(Object.keys(SURFACES).sort());
  });
});

describe("coverage honesty — copy (U7)", () => {
  it("every COVERAGE text passes the banned-language sweep", () => {
    for (const [key, copy] of Object.entries(COVERAGE)) {
      expect(containsBannedLanguage(copy.text), key).toBe(false);
    }
  });
});
