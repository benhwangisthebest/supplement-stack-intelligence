// Phase 3 U6 (a0) — N-84's UI gap. A paper chip's text is the paper's title
// (src/lib/advisor/tools.ts, `label: p.title`), so the advisor's source chips must
// carry the same sources notice the Library mounts on that content (reworded at the
// U6 closeout, once every cited paper was verified). Red proof: removing the notice from ProvenanceChips fails the first two
// tests (docs/01-plan/features/p3-u6-corpus-verified.plan.md).
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { citationHref } from "@/lib/advisor/citation-href";
import { currentCitationLabel } from "@/lib/advisor/citation-label";
import { defaultLibrary, getPaperById, getSupplementById } from "@/lib/evidence";
import { citationUpdatedCopy } from "@/lib/safety";
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
  const supp = getSupplementById(effect.supplementId)!;
  const current = `${supp.name} → ${effect.name}, Grade ${effect.grade}`;
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
    expect(within(sources).getByText(current)).toBeTruthy();
    expect(within(sources).queryByText(stored.label)).toBeNull();
    expect(marker()?.textContent).toMatch(/grade updated since this message/);
  });

  it("shows no marker when the stored letter is still current", () => {
    const label = `Creatine → ${effect.name}, Grade ${effect.grade}`;
    render(<ProvenanceChips index={INDEX} citations={[{ kind: "effect-grade", refId: effect.id, label }]} />);
    expect(screen.getByText(current)).toBeTruthy();
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

// Phase 3 U9 (b), CLAUDE.md §4 rule 7. The chip used to call citationHref,
// defaultLibrary and getPaperById in the browser; it now reads the index the advisor
// page builds on the server. For EVERY effect and paper id the corpus holds, plus ids
// it does not (prototype names included), the rendered href and label must equal
// what the lib produces. Phase 4 U9: the label is `currentCitationLabel` — the
// resolver the account export uses — or the stored label where it gives none, so
// this is also the chip↔export binding over the whole corpus.
describe("ProvenanceChips — the server-built index answers exactly as the lib did (U9)", () => {
  const unknown = ["no-such-id", "constructor", "__proto__", "toString", "hasOwnProperty"];

  const expected = (c: Citation): { href: string | null; label: string } => ({
    href: citationHref(c),
    label: currentCitationLabel(c).currentLabel ?? c.label,
  });

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

// Phase 4 U9, owner ruling 2026-09-28 (N-100). Before this landing the chip resolved
// only an effect's grade letter, so a message written before U6 renamed
// fish-oil-cardiovascular still read "Cardiovascular support". The chip now shows the
// effect's current name, and the same string the account export carries as
// `currentLabel`. Red at 2ba950b: docs/01-plan/features/p4-u9-export-labels.plan.md.
describe("ProvenanceChips — a pre-U6 effect name shows today's name (U9, N-100)", () => {
  const stored: Citation = {
    kind: "effect-grade",
    refId: "fish-oil-cardiovascular",
    label: "Fish Oil (Omega-3) → Cardiovascular support, Grade A",
  };

  it("renders the current effect name, the same string the export carries", () => {
    render(<ProvenanceChips index={INDEX} citations={[stored]} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText("Fish Oil (Omega-3) → Triglyceride lowering, Grade A")).toBeTruthy();
    expect(within(sources).queryByText(stored.label)).toBeNull();
    expect(currentCitationLabel(stored).currentLabel).toBe("Fish Oil (Omega-3) → Triglyceride lowering, Grade A");
    // Same grade as stored, so no grade marker.
    expect(screen.queryByTestId("grade-updated")).toBeNull();
  });
});

// Phase 4 U20 (FU-76). U9 made the chip show an effect's CURRENT name, but said nothing when
// that name differed from the one the message was written with, so a reader could see
// "Cardiovascular support" in the answer and "Triglyceride lowering" on its chip with no
// link between them. The U4 R2 marker now also covers a rename. Red at HEAD (3c52ab1): the
// first test (no marker renders). docs/01-plan/features/p4-u20-evidence-hygiene.plan.md.
describe("ProvenanceChips — a renamed effect is marked (U20, FU-76)", () => {
  const nameMarker = () => screen.queryByTestId("name-updated");
  const gradeMarker = () => screen.queryByTestId("grade-updated");
  const fishOil: Citation = {
    kind: "effect-grade",
    refId: "fish-oil-cardiovascular",
    label: "Fish Oil (Omega-3) → Cardiovascular support, Grade A",
  };

  it("marks the pre-U6 fish-oil chip as renamed, with the old name visible", () => {
    render(<ProvenanceChips index={INDEX} citations={[fishOil]} />);
    expect(nameMarker(), "no rename marker on the fish-oil chip").not.toBeNull();
    expect(nameMarker()!.textContent).toBe(
      `· ${INDEX.updatedCopy.name.replace("{name}", "Cardiovascular support")}`,
    );
    expect(nameMarker()!.textContent).toContain("(was “Cardiovascular support”)");
    expect(gradeMarker()).toBeNull();
    // The chip's link carries the old name in its accessible text.
    expect(screen.getByRole("link").textContent).toContain("Cardiovascular support");
  });

  it("says both when the name and the grade changed", () => {
    const effect = defaultLibrary.effects.find((e) => e.id === "fish-oil-cardiovascular")!;
    const other = (["A", "B", "C", "D"] as const).find((g) => g !== effect.grade)!;
    render(
      <ProvenanceChips
        index={INDEX}
        citations={[{ ...fishOil, label: `Fish Oil (Omega-3) → Cardiovascular support, Grade ${other}` }]}
      />,
    );
    expect(gradeMarker()?.textContent).toBe(
      `· ${INDEX.updatedCopy.nameAndGrade.replace("{name}", "Cardiovascular support")}`,
    );
    expect(nameMarker()).toBeNull();
  });

  it("does not mark a protocol citation, which stores an outcome category in the name's place", () => {
    const effect = defaultLibrary.effects.find((e) => e.id === "creatine-strength")!;
    // The shape src/lib/advisor/actions/proposals.ts writes for a suggested protocol.
    const label = `Creatine → ${effect.outcomeCategory}, Grade ${effect.grade}`;
    render(<ProvenanceChips index={INDEX} citations={[{ kind: "effect-grade", refId: effect.id, label }]} />);
    expect(nameMarker()).toBeNull();
    expect(gradeMarker()).toBeNull();
    cleanup();
    // A category the effect does NOT have today (as if it had moved) is still not a rename.
    const moved = `Creatine → ${effect.outcomeCategory === "sleep" ? "focus" : "sleep"}, Grade ${effect.grade}`;
    render(<ProvenanceChips index={INDEX} citations={[{ kind: "effect-grade", refId: effect.id, label: moved }]} />);
    expect(nameMarker()).toBeNull();
  });

  it("does not mark, or throw on, a stored label that is not a string", () => {
    const odd = { kind: "effect-grade", refId: "fish-oil-cardiovascular", label: ["S → Old, Grade A"] };
    render(<ProvenanceChips index={INDEX} citations={[odd as unknown as Citation]} />);
    expect(nameMarker()).toBeNull();
  });

  it("marks no chip whose stored name is today's, or the outcome category, across the corpus", () => {
    const byName = defaultLibrary.effects.map(
      (e): Citation => ({ kind: "effect-grade", refId: e.id, label: `S → ${e.name}, Grade ${e.grade}` }),
    );
    const byCategory = defaultLibrary.effects.map(
      (e): Citation => ({ kind: "effect-grade", refId: e.id, label: `S → ${e.outcomeCategory}, Grade ${e.grade}` }),
    );
    expect(byName.length).toBeGreaterThan(10); // anti-vacuity: the whole corpus
    for (const citations of [byName, byCategory]) {
      render(<ProvenanceChips index={INDEX} citations={citations} />);
      expect(screen.getAllByRole("listitem")).toHaveLength(citations.length);
      expect(nameMarker()).toBeNull();
      cleanup();
    }
    // Anti-vacuity: among the same chips, the one real rename IS marked.
    const withRename = [...byName.filter((c) => c.refId !== fishOil.refId), fishOil];
    render(<ProvenanceChips index={INDEX} citations={withRename} />);
    expect(screen.getAllByTestId("name-updated")).toHaveLength(1);
  });

  it("the server-built index carries src/lib/safety's copy and each effect's current name", () => {
    expect(INDEX.updatedCopy).toEqual(citationUpdatedCopy);
    for (const e of defaultLibrary.effects) {
      expect(INDEX.effects[e.id]).toMatchObject({ name: e.name });
    }
  });

  it("renders the marker copy it is handed, placeholder filled, and retypes none of it", () => {
    const updatedCopy = { grade: "COPY-GRADE", name: "COPY-NAME <{name}>", nameAndGrade: "COPY-BOTH" };
    render(<ProvenanceChips index={{ ...INDEX, updatedCopy }} citations={[fishOil]} />);
    expect(nameMarker()?.textContent).toBe("· COPY-NAME <Cardiovascular support>");
    cleanup();
    // A stored name is inserted literally: "$&" in it is not a replacement pattern.
    const odd = { ...fishOil, label: "Fish Oil (Omega-3) → Old $& name, Grade A" };
    render(<ProvenanceChips index={{ ...INDEX, updatedCopy }} citations={[odd]} />);
    expect(nameMarker()?.textContent).toBe("· COPY-NAME <Old $& name>");
  });
});
