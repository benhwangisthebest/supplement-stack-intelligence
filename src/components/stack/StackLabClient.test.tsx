// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — the Stack Lab client tree takes props.
// StackWorkspace used to import COVERAGE / DISCLAIMERS from `@/lib/safety`, and
// StackItemRow called `getProductById` from `@/lib/product-matcher`, in the browser.
// Both now receive what the server page builds (`stackLabCopy()`,
// `attachedProductLabels()`). Behaviour unchanged: the same copy renders in the same
// places, and the attached-product badge shows exactly what `getProductById` returns
// — nothing for an unknown id, including prototype names.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "@/data/seed-products";
import { getProductById } from "@/lib/product-matcher";
import { COVERAGE, DISCLAIMERS } from "@/lib/safety";
import type { EvaluationFlag, Stack, StackItem } from "@/types";
import { StackLabClient } from "./StackLabClient";
import { attachedProductLabels, stackLabCopy } from "./stack-lab-props";

afterEach(cleanup);

const stack = {
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
  id: "item",
  stackId: stack.id,
  supplementId: "magnesium",
  customName: null,
  dose: 1,
  unit: "mg",
  timing: null,
  frequency: null,
  reason: null,
  notes: null,
  ...over,
});

const interactionFlag: EvaluationFlag = {
  id: "flag-1",
  stackId: stack.id,
  stackItemId: null,
  severity: "warning",
  category: "interaction-risk",
  title: "Made-up interaction",
  explanation: "Made-up explanation.",
  recommendation: "Made-up recommendation.",
  evidenceLevel: "n/a",
  createdAt: "2026-01-01",
};

function renderLab(items: StackItem[], flags: EvaluationFlag[] = []) {
  render(
    <StackLabClient
      stack={stack}
      initialItems={items}
      initialFlags={flags}
      supplements={[]}
      copy={stackLabCopy()}
      productLabels={attachedProductLabels()}
    />,
  );
}

const badges = () => screen.queryAllByText(/matched by advisor/).map((el) => el.parentElement!);

describe("StackItemRow — attached-product badge from server-built labels (U9)", () => {
  it("covers every seed product (anti-vacuity)", () => {
    expect(SEED_PRODUCTS.length).toBeGreaterThan(5);
    expect(Object.keys(attachedProductLabels()).sort()).toEqual(SEED_PRODUCTS.map((p) => p.id).sort());
  });

  it("shows, for every seed product, the brand and name getProductById resolves", () => {
    renderLab(SEED_PRODUCTS.map((p, i) => item({ id: `i-${i}`, productId: p.id })));
    const shown = badges().map((b) => b.textContent);
    expect(shown).toEqual(
      SEED_PRODUCTS.map((p) => {
        const product = getProductById(p.id)!;
        return `🧴${product.brand}${product.name}· matched by advisor`;
      }),
    );
  });

  it("renders no badge for an id getProductById does not know, prototype names included", () => {
    for (const id of ["no-such-product", "constructor", "__proto__", "toString"]) {
      expect(getProductById(id)).toBeUndefined();
    }
    renderLab(
      ["no-such-product", "constructor", "__proto__", "toString"].map((productId, i) =>
        item({ id: `u-${i}`, productId }),
      ),
    );
    expect(badges()).toEqual([]);
  });
});

// Phase 3 closeout (a), FU-67. StackLabClient is a rule-8 member because it hands
// `initialFlags` (EvaluationFlag[]) down to StackWorkspace, yet no test here looked
// at a flag: the U9 tests above assert disclaimers and badges. These assert that the
// flags this component is given are the flags the page shows. Red proof: passing
// `initialFlags={[]}`, or dropping a flag, fails the first test (closeout artifact).
const flagOf = (id: string, over: Partial<EvaluationFlag>): EvaluationFlag => ({
  ...interactionFlag,
  id,
  title: `Made-up flag ${id}`,
  explanation: `Made-up explanation ${id}.`,
  recommendation: `Made-up recommendation ${id}.`,
  ...over,
});

describe("StackLabClient — the evaluation flags it is handed reach the page (rule 8, FU-67)", () => {
  it("renders every flag's title, severity, category, explanation, suggestion and evidence grade, and counts them", () => {
    renderLab(
      [item({ id: "mg" })],
      [
        flagOf("info", { severity: "info", category: "timing-fit", evidenceLevel: "C" }),
        flagOf("crit", { severity: "critical", category: "interaction-risk", evidenceLevel: "B" }),
        flagOf("warn", { severity: "warning", category: "dose-fit" }),
      ],
    );
    const cards = screen
      .getAllByRole("heading", { level: 4 })
      .filter((h) => h.textContent?.startsWith("Made-up flag "))
      .map((h) => h.closest("article")!);
    expect(cards.map((c) => within(c).getByRole("heading", { level: 4 }).textContent)).toEqual([
      "Made-up flag crit",
      "Made-up flag warn",
      "Made-up flag info",
    ]);
    const [crit, warn, info] = cards;
    expect(within(crit).getByText("Critical · interaction-risk")).toBeTruthy();
    expect(within(crit).getByText("Made-up explanation crit.")).toBeTruthy();
    expect(within(crit).getByText("Made-up recommendation crit.")).toBeTruthy();
    expect(within(crit).getByText("Evidence grade: B")).toBeTruthy();
    expect(within(warn).getByText("Warning · dose-fit")).toBeTruthy();
    expect(within(warn).queryByText(/^Evidence grade:/)).toBeNull();
    expect(within(info).getByText("Info · timing-fit")).toBeTruthy();
    expect(within(info).getByText("Evidence grade: C")).toBeTruthy();
    expect(screen.getByText("1 critical · 1 warning · 1 info")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("A potentially serious interaction was flagged");
  });

  it("renders no flag card and no count when it is handed no flags (anti-vacuity)", () => {
    renderLab([item({ id: "mg" })], []);
    expect(
      screen.queryAllByRole("heading", { level: 4 }).filter((h) => h.textContent?.startsWith("Made-up flag ")),
    ).toEqual([]);
    expect(screen.queryByText(/critical · .* warning · .* info/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("StackWorkspace / StackLabClient — safety copy from the server page (U9)", () => {
  it("renders the interaction disclaimer, both coverage limits and the evaluation disclaimer verbatim", () => {
    renderLab([item({ id: "custom", supplementId: null, customName: "Custom" })], [interactionFlag]);
    expect(screen.getByText(DISCLAIMERS.interaction)).toBeTruthy();
    const limits = screen.getAllByTestId("coverage-limit").map((el) => el.textContent);
    expect(limits).toEqual([COVERAGE.stackEvaluationLimit.text, COVERAGE.stackCustomItems.text]);
    expect(screen.getByRole("note").textContent).toBe(DISCLAIMERS.evaluation);
  });
});
