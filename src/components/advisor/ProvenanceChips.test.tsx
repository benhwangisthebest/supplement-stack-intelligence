// Phase 3 U6 (a0) — N-84's UI gap. A paper chip's text is the paper's illustrative
// title (src/lib/advisor/tools.ts, `label: p.title`), so the advisor's source chips
// must carry the same illustrative-dataset disclosure the Library mounts on that
// content. Red proof: removing the notice from ProvenanceChips fails the first two
// tests (docs/01-plan/features/p3-u6-corpus-verified.plan.md).
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Citation } from "@/types/advisor";
import { ProvenanceChips } from "./ProvenanceChips";

afterEach(cleanup);

const paper: Citation = {
  kind: "paper",
  refId: "p-creatine-strength",
  label: "Effects of creatine supplementation on strength and lean mass",
};
const grade: Citation = {
  kind: "effect-grade",
  refId: "creatine-strength",
  label: "Creatine → Strength, Grade A",
};
const interaction: Citation = { kind: "interaction-rule", refId: "rule-x", label: "Some rule" };

const notice = () => screen.queryByTestId("illustrative-dataset-notice");

describe("ProvenanceChips — illustrative-dataset notice (N-84)", () => {
  it("discloses the dataset when a paper chip is shown, alongside the chip", () => {
    render(<ProvenanceChips citations={[paper]} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText(paper.label)).toBeTruthy();
    expect(notice()?.textContent).toMatch(/Illustrative dataset\..*not real studies/);
  });

  it("discloses the dataset when only an effect-grade chip is shown", () => {
    render(<ProvenanceChips citations={[grade]} />);
    expect(notice()).not.toBeNull();
  });

  it("does not add the notice to chips that come from no evidence summary", () => {
    render(<ProvenanceChips citations={[interaction]} />);
    expect(screen.getByRole("list", { name: "Sources" })).toBeTruthy();
    expect(notice()).toBeNull();
  });

  it("renders nothing, notice included, when there are no citations", () => {
    const { container } = render(<ProvenanceChips citations={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
