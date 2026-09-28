// Phase 4 U9 — the one resolver for a cited id's label today (D-16 (b), owner ruling
// 2026-09-28). Consumed by the source chips (citation-index.ts) and the account
// export (src/lib/db/export-repo.ts). Cycle record: docs/01-plan/features/p4-u9-export-labels.plan.md.
import { describe, expect, it } from "vitest";
import { defaultLibrary, getPaperById, getSupplementById } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";
import { currentCitationLabel, libraryLabel } from "./citation-label";

const FISH_OIL = getSupplementById("fish-oil")!;

describe("currentCitationLabel — effect-grade", () => {
  it("gives a pre-U6 fish-oil label today's effect name (AC-2)", () => {
    const stored: Citation = {
      kind: "effect-grade",
      refId: "fish-oil-cardiovascular",
      label: `${FISH_OIL.name} → Cardiovascular support, Grade A`,
    };
    expect(currentCitationLabel(stored)).toEqual({
      labelResolution: "resolved",
      currentLabel: "Fish Oil (Omega-3) → Triglyceride lowering, Grade A",
    });
  });

  it("resolves every effect the Library holds, from the Library's own fields", () => {
    for (const e of defaultLibrary.effects) {
      const supp = getSupplementById(e.supplementId)!;
      expect(currentCitationLabel({ kind: "effect-grade", refId: e.id, label: "stale" }), e.id).toEqual({
        labelResolution: "resolved",
        currentLabel: `${supp.name} → ${e.name}, Grade ${e.grade}`,
      });
    }
  });
});

describe("currentCitationLabel — paper", () => {
  it("gives a pre-U6 paper label its verified title", () => {
    const stored: Citation = {
      kind: "paper",
      refId: "p-creatine-strength",
      label: "Effects of creatine supplementation on strength and lean mass",
    };
    const paper = getPaperById("p-creatine-strength")!;
    expect(paper.pmid ?? paper.doi).toBeDefined();
    expect(currentCitationLabel(stored)).toEqual({ labelResolution: "resolved", currentLabel: paper.title });
  });

  it("a paper the Library holds without a DOI or PMID resolves to the stored label", () => {
    const paper = getPaperById("p-nac-antioxidant")!;
    expect(paper.doi || paper.pmid).toBeFalsy();
    expect(libraryLabel("paper", paper.id)).toEqual({ labelResolution: "resolved", label: null });
    expect(currentCitationLabel({ kind: "paper", refId: paper.id, label: "as stored" })).toEqual({
      labelResolution: "resolved",
      currentLabel: "as stored",
    });
  });
});

describe("currentCitationLabel — ids and kinds that do not resolve (AC-4)", () => {
  const unknown = ["no-such-id", "constructor", "__proto__", "toString", ""];

  it("an effect or paper id the Library does not hold is not-in-library, with a null label", () => {
    for (const kind of ["effect-grade", "paper"] as const) {
      for (const refId of unknown) {
        expect(currentCitationLabel({ kind, refId, label: "stored" }), `${kind}:${refId}`).toEqual({
          labelResolution: "not-in-library",
          currentLabel: null,
        });
      }
    }
  });

  it("a resolved id stored with no label gets currentLabel null, never undefined", () => {
    const c = { kind: "paper", refId: "p-nac-antioxidant" } as unknown as Citation;
    expect(currentCitationLabel(c)).toEqual({ labelResolution: "resolved", currentLabel: null });
  });

  it("a malformed stored refId neither throws nor resolves", () => {
    const c = { kind: "paper", refId: 42, label: "x" } as unknown as Citation;
    expect(currentCitationLabel(c)).toEqual({ labelResolution: "not-in-library", currentLabel: null });
  });

  it("the five non-seed kinds are not-resolved, even when their refId matches a seed id", () => {
    const kinds = ["stack-eval", "interaction-rule", "biomarker-rule", "lab-trend", "side-effect"] as const;
    for (const kind of kinds) {
      expect(currentCitationLabel({ kind, refId: "fish-oil-cardiovascular", label: "stored" }), kind).toEqual({
        labelResolution: "not-resolved",
        currentLabel: null,
      });
    }
  });

  it("an unknown kind is not-resolved", () => {
    const c = { kind: "retired-kind", refId: "p-creatine-strength", label: "x" } as unknown as Citation;
    expect(currentCitationLabel(c)).toEqual({ labelResolution: "not-resolved", currentLabel: null });
  });
});
