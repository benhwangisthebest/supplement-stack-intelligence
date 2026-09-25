// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a safety flag ships with a
// component test. ActionProposalCard shows the safety flags a proposed change would
// introduce, before anything is saved. A critical flag must be marked as such and
// must HARD-BLOCK Confirm, with an escalation to a clinician (SC-4). A non-critical
// flag is shown but does not block. The server re-checks either way; this is the
// user-facing half. No request is made: Confirm is never clicked.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";
import { ActionProposalCard } from "./ActionProposalCard";

afterEach(cleanup);

const proposal: ActionProposal = {
  type: "add_item",
  stackId: "made-up-stack",
  payload: { supplementId: "magnesium", dose: 200, unit: "mg", timing: null, frequency: null, reason: null },
  diff: [{ label: "Add Magnesium", after: "200 mg" }],
  editable: null,
  rationaleCitations: [],
};

const flag = (severity: DraftFlag["severity"], title: string): DraftFlag => ({
  stackItemId: null,
  severity,
  category: "medication-caution",
  title,
  explanation: "Made-up explanation.",
  recommendation: `Recommendation for ${title}`,
  evidenceLevel: "B",
});

const renderCard = (safetyFlags: DraftFlag[]) =>
  render(
    <ActionProposalCard
      proposals={[proposal]}
      safetyFlags={safetyFlags}
      conversationId={null}
      onConfirmed={vi.fn()}
      onRejected={vi.fn()}
    />,
  );

const BLOCK = /introduce a serious safety flag, so it can.t be applied here\. Consider discussing it with a clinician\./;

describe("ActionProposalCard — projected safety flags (rule 8)", () => {
  it("lists each flag with its title and recommendation; only a critical one is marked ⚠", () => {
    renderCard([flag("critical", "Made-up critical"), flag("warning", "Made-up warning")]);
    const list = screen.getByRole("list", { name: "Safety flags" });
    const [critical, warning] = within(list).getAllByRole("listitem");
    expect(within(critical).getByText("⚠ Made-up critical")).toBeTruthy();
    expect(within(critical).getByText("Recommendation for Made-up critical")).toBeTruthy();
    expect(within(warning).getByText("Made-up warning")).toBeTruthy();
    expect(within(warning).queryByText(/⚠/)).toBeNull();
  });

  it("a critical flag disables Confirm and escalates to a clinician", () => {
    renderCard([flag("critical", "Made-up critical")]);
    expect(screen.getByRole("button", { name: "Confirm" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(BLOCK)).toBeTruthy();
  });

  it("a warning alone is shown but does not block Confirm", () => {
    renderCard([flag("warning", "Made-up warning")]);
    expect(screen.getByRole("button", { name: "Confirm" }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText(BLOCK)).toBeNull();
  });

  it("no flags: no Safety flags list", () => {
    renderCard([]);
    expect(screen.queryByRole("list", { name: "Safety flags" })).toBeNull();
  });
});
