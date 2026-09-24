// Phase 3 U6 (a0) — N-84's UI gap. A paper chip's text is the paper's title
// (src/lib/advisor/tools.ts, `label: p.title`), so the advisor's source chips must
// carry the same sources notice the Library mounts on that content (reworded at the
// U6 closeout, once every cited paper was verified). Red proof: removing the notice from ProvenanceChips fails the first two
// tests (docs/01-plan/features/p3-u6-corpus-verified.plan.md).
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { citationHref } from "@/lib/advisor/citation-href";
import { defaultLibrary, getPaperById } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";
import { ProvenanceChips } from "./ProvenanceChips";
import { buildCitationIndex } from "./citation-index";

// U9 (b): the chips read a server-built index; tests build it exactly as the advisor page does.
const INDEX = buildCitationIndex();

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

const notice = () => screen.queryByTestId("evidence-sources-notice");

describe("ProvenanceChips — sources notice (N-84)", () => {
  it("discloses the dataset when a paper chip is shown, alongside the chip", () => {
    render(<ProvenanceChips index={INDEX} citations={[paper]} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText(getPaperById(paper.refId)!.title)).toBeTruthy();
    expect(notice()?.textContent).toMatch(/verified against their PubMed or DOI record.*this app's own assessment/);
    expect(notice()?.textContent).not.toMatch(/illustrative|not real studies/i);
  });

  it("discloses the dataset when only an effect-grade chip is shown", () => {
    render(<ProvenanceChips index={INDEX} citations={[grade]} />);
    expect(notice()).not.toBeNull();
  });

  it("does not add the notice to chips that come from no evidence summary", () => {
    render(<ProvenanceChips index={INDEX} citations={[interaction]} />);
    expect(screen.getByRole("list", { name: "Sources" })).toBeTruthy();
    expect(notice()).toBeNull();
  });

  it("renders nothing, notice included, when there are no citations", () => {
    const { container } = render(<ProvenanceChips index={INDEX} citations={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

// Phase 3 U6 closeout: a message stored before U6 carries the paper's old illustrative
// title and note. The chip shows the paper's current verified title instead, and drops
// the note, without the stored row being edited.
describe("ProvenanceChips — historic paper citations (U6 closeout)", () => {
  it("renders the verified paper's current title, not the stored illustrative one", () => {
    const stored: Citation = {
      kind: "paper",
      refId: "p-creatine-strength",
      label: "Effects of creatine supplementation on strength and lean mass",
      detail: "Illustrative evidence summary",
    };
    const current = getPaperById("p-creatine-strength")!;
    expect(current.pmid ?? current.doi).toBeDefined();
    render(<ProvenanceChips index={INDEX} citations={[stored]} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText(current.title)).toBeTruthy();
    expect(within(sources).queryByText(stored.label)).toBeNull();
    expect(sources.querySelector("li")?.getAttribute("title")).toBeNull();
  });

  it("falls back to the stored label for a refId the corpus does not hold", () => {
    render(<ProvenanceChips index={INDEX} citations={[{ kind: "paper", refId: "p-unknown", label: "Stored label" }]} />);
    expect(screen.getByText("Stored label")).toBeTruthy();
  });
});

// Phase 3 U4, owner ruling R2: an effect-grade chip stores the letter from when the
// message was written. U4 derives grades from verified profiles, so a stored letter
// can be stale. The chip shows the current grade and says it changed. Red proof:
// removing the marker from ProvenanceChips fails the first test
// (docs/01-plan/features/p3-u4-profiles.plan.md).
describe("ProvenanceChips — effect-grade citations after a grade change (U4 R2)", () => {
  const effect = defaultLibrary.effects.find((e) => e.id === "creatine-strength")!;
  const other = (["A", "B", "C", "D"] as const).find((g) => g !== effect.grade)!;
  const marker = () => screen.queryByTestId("grade-updated");

  it("shows the current grade and marks it when the stored letter differs", () => {
    const stored: Citation = {
      kind: "effect-grade",
      refId: effect.id,
      label: `Creatine → ${effect.name}, Grade ${other}`,
    };
    render(<ProvenanceChips index={INDEX} citations={[stored]} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText(`Creatine → ${effect.name}, Grade ${effect.grade}`)).toBeTruthy();
    expect(within(sources).queryByText(stored.label)).toBeNull();
    expect(marker()?.textContent).toMatch(/grade updated since this message/);
  });

  it("shows no marker when the stored letter is still current", () => {
    const label = `Creatine → ${effect.name}, Grade ${effect.grade}`;
    render(<ProvenanceChips index={INDEX} citations={[{ kind: "effect-grade", refId: effect.id, label }]} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(marker()).toBeNull();
  });

  it("falls back to the stored label for an effect the corpus does not hold", () => {
    render(
      <ProvenanceChips index={INDEX} citations={[{ kind: "effect-grade", refId: "no-such-effect", label: "X → Y, Grade A" }]} />,
    );
    expect(screen.getByText("X → Y, Grade A")).toBeTruthy();
    expect(marker()).toBeNull();
  });
});

// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — behaviour unchanged. The chip used to call
// citationHref, defaultLibrary and getPaperById in the browser; it now reads the
// index the advisor page builds on the server. For EVERY effect and paper id the
// corpus holds, plus ids it does not (prototype names included), the rendered href
// and label must equal what those lib calls produce — computed here, independently.
describe("ProvenanceChips — the server-built index answers exactly as the lib did (U9)", () => {
  const unknown = ["no-such-id", "constructor", "__proto__", "toString", "hasOwnProperty"];
  const STORED = /Grade ([ABCD])$/;

  const expected = (c: Citation): { href: string | null; label: string } => {
    const href = citationHref(c);
    if (c.kind === "paper") {
      const p = getPaperById(c.refId);
      return { href, label: p && (p.doi || p.pmid) ? p.title : c.label };
    }
    if (c.kind === "effect-grade") {
      const stored = STORED.exec(c.label)?.[1];
      const current = defaultLibrary.effects.find((e) => e.id === c.refId)?.grade;
      if (stored && current && stored !== current) {
        return { href, label: c.label.replace(STORED, `Grade ${current}`) };
      }
    }
    return { href, label: c.label };
  };

  const citations: Citation[] = [
    ...[...defaultLibrary.effects.map((e) => e.id), ...unknown].map(
      (refId): Citation => ({ kind: "effect-grade", refId, label: `Stored ${refId}, Grade D` }),
    ),
    ...[
      ...new Set([
        ...defaultLibrary.papers.map((p) => p.id),
        ...defaultLibrary.effects.flatMap((e) => e.paperIds),
        ...unknown,
      ]),
    ].map((refId): Citation => ({ kind: "paper", refId, label: `Stored title ${refId}` })),
    { kind: "interaction-rule", refId: "constructor", label: "Inert rule" },
  ];

  it("covers the whole corpus (anti-vacuity)", () => {
    expect(defaultLibrary.effects.length).toBeGreaterThan(10);
    expect(defaultLibrary.papers.length).toBeGreaterThan(10);
    expect(citations.filter((c) => citationHref(c) !== null).length).toBeGreaterThan(20);
  });

  it("renders every chip with the lib's href and label", () => {
    render(<ProvenanceChips index={INDEX} citations={citations} />);
    const items = within(screen.getByRole("list", { name: "Sources" })).getAllByRole("listitem");
    expect(items).toHaveLength(citations.length);
    const got = items.map((li) => ({
      href: li.querySelector("a")?.getAttribute("href") ?? null,
      label: li.querySelector(".text-body")!.textContent,
    }));
    expect(got).toEqual(citations.map(expected));
  });
});
