// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag ships with a
// component test. FlagCard is the Stack Lab's evaluation flag: its severity label must
// be the flag's own severity (a critical flag may never read as "Info"), and its
// title, explanation, suggestion and evidence grade must be the flag's own text.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EvaluationFlag, FlagSeverity } from "@/types";
import { FlagCard } from "./FlagCard";

afterEach(cleanup);

const flag = (over: Partial<EvaluationFlag>): EvaluationFlag => ({
  id: "made-up-flag",
  stackId: "made-up-stack",
  stackItemId: null,
  severity: "warning",
  category: "dose-fit",
  title: "Made-up flag title",
  explanation: "Made-up explanation.",
  recommendation: "Made-up recommendation.",
  evidenceLevel: "B",
  createdAt: "2026-01-01",
  ...over,
});

const LABEL: Record<FlagSeverity, string> = { critical: "Critical", warning: "Warning", info: "Info" };

describe("FlagCard — severity, text and evidence grade (rule 8)", () => {
  it.each(Object.keys(LABEL) as FlagSeverity[])("a %s flag is labelled with its own severity", (severity) => {
    render(<FlagCard flag={flag({ severity, category: "interaction-risk" })} />);
    expect(screen.getByText(`${LABEL[severity]} · interaction-risk`)).toBeTruthy();
    for (const other of Object.values(LABEL).filter((l) => l !== LABEL[severity])) {
      expect(screen.queryByText(new RegExp(`^${other} ·`))).toBeNull();
    }
  });

  it("renders the flag's title as a heading, and its explanation and suggestion", () => {
    render(<FlagCard flag={flag({})} />);
    expect(screen.getByRole("heading", { name: "Made-up flag title" })).toBeTruthy();
    expect(screen.getByText("Made-up explanation.")).toBeTruthy();
    expect(screen.getByText("Made-up recommendation.")).toBeTruthy();
    expect(screen.getByText("Suggestion:")).toBeTruthy();
  });

  it("shows the flag's evidence grade, and no grade line for 'n/a'", () => {
    render(<FlagCard flag={flag({ evidenceLevel: "D" })} />);
    expect(screen.getByText("Evidence grade: D")).toBeTruthy();
    cleanup();
    render(<FlagCard flag={flag({ evidenceLevel: "n/a" })} />);
    expect(screen.queryByText(/Evidence grade/)).toBeNull();
  });
});
