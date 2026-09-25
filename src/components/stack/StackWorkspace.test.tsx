// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag ships with a
// component test. StackWorkspace is where evaluation flags reach the user. It must
// order them critical → warning → info whatever order they arrive in, count them
// honestly, and raise the clinician-escalation banner for a critical interaction
// (and only for one). `fetch` is stubbed: no request leaves the process.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EvaluationFlag, Stack, StackItem } from "@/types";
import { StackWorkspace } from "./StackWorkspace";
import { attachedProductLabels, stackLabCopy } from "./stack-lab-props";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

const item: StackItem = {
  id: "made-up-item",
  stackId: stack.id,
  supplementId: "magnesium",
  customName: null,
  dose: 1,
  unit: "mg",
  timing: null,
  frequency: null,
  reason: null,
  notes: null,
};

const flag = (id: string, over: Partial<EvaluationFlag>): EvaluationFlag => ({
  id,
  stackId: stack.id,
  stackItemId: null,
  severity: "info",
  category: "dose-fit",
  title: `Flag ${id}`,
  explanation: "Made-up explanation.",
  recommendation: "Made-up recommendation.",
  evidenceLevel: "n/a",
  createdAt: "2026-01-01",
  ...over,
});

let evaluateResponse: { flags: EvaluationFlag[]; summary: unknown } = { flags: [], summary: null };
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ data: evaluateResponse }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
});

function renderWorkspace(initialFlags: EvaluationFlag[]) {
  function Harness() {
    const [items, setItems] = useState<StackItem[]>([item]);
    return (
      <StackWorkspace
        stack={stack}
        items={items}
        setItems={setItems}
        initialFlags={initialFlags}
        supplements={[{ id: "magnesium", name: "Magnesium" } as never]}
        copy={stackLabCopy()}
        productLabels={attachedProductLabels()}
      />
    );
  }
  render(<Harness />);
}

/** Flag card titles in document order. */
const flagOrder = () =>
  screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent).filter((t) => t?.startsWith("Flag "));

const BANNER = "A potentially serious interaction was flagged";

describe("StackWorkspace — evaluation flags (rule 8)", () => {
  it("orders flags critical → warning → info, whatever order they arrive in, and counts them", () => {
    renderWorkspace([
      flag("i", { severity: "info" }),
      flag("w", { severity: "warning" }),
      flag("c", { severity: "critical" }),
      flag("w2", { severity: "warning" }),
    ]);
    expect(flagOrder()).toEqual(["Flag c", "Flag w", "Flag w2", "Flag i"]);
    expect(screen.getByText("1 critical · 2 warning · 1 info")).toBeTruthy();
  });

  it("a critical interaction raises the clinician banner and the interaction disclaimer", () => {
    renderWorkspace([flag("c", { severity: "critical", category: "medication-caution" })]);
    expect(screen.getByRole("alert").textContent).toContain(BANNER);
    expect(screen.getByText(stackLabCopy().interactionDisclaimer)).toBeTruthy();
  });

  it("a critical flag that is not an interaction raises no banner; a warning interaction raises none either", () => {
    renderWorkspace([
      flag("c", { severity: "critical", category: "dose-fit" }),
      flag("w", { severity: "warning", category: "interaction-risk" }),
    ]);
    expect(screen.queryByText(BANNER)).toBeNull();
    expect(screen.getByText(stackLabCopy().interactionDisclaimer)).toBeTruthy();
  });

  it("an evaluation replaces the flags with the server's, in severity order", async () => {
    evaluateResponse = {
      flags: [flag("n-info", { severity: "info" }), flag("n-crit", { severity: "critical" })],
      summary: { critical: 1, warning: 0, info: 1 },
    };
    renderWorkspace([flag("old", { severity: "warning" })]);
    fireEvent.click(screen.getByRole("button", { name: "Evaluate stack" }));
    await screen.findByText("1 critical · 0 warning · 1 info");
    expect(flagOrder()).toEqual(["Flag n-crit", "Flag n-info"]);
  });
});
