// SERVER-SIDE props builder for ProvenanceChips (Phase 3 U9 (b), CLAUDE.md §4
// rule 7). The advisor page builds this once and passes it down through
// AdvisorPanel → AdvisorMessageBubble, so the chips resolve streamed citations
// without importing the evidence library into the browser. Client modules may
// import this file's TYPES only; a runtime import is a CLIENT_TAKES_PROPS failure.
//
// EXACTNESS. Each value below is the lib's own answer (citationHref,
// libraryLabel, defaultLibrary), computed for every id that can produce a
// non-null answer:
//  - an effect's grade and label come from `defaultLibrary.effects`, and
//    `citationHref` resolves an effect only through `getEffectsForSupplement`,
//    which filters that same array — so its ids are the complete key set;
//  - a paper's label comes from `libraryLabel` (`getPaperById`, i.e.
//    `defaultLibrary.papers`) and its href from `citationHref`, which finds it only
//    in some effect's `paperIds` — so the union of those two is the complete key set.
// An id outside the index gets `undefined` / `null` from the lib as well, which is
// exactly what the chip's fallback does.
//
// Phase 4 U9: `label` is `libraryLabel(kind, id).label` — the same function the
// account export uses through `currentCitationLabel` (src/lib/advisor/citation-label.ts).
//
// Phase 4 U20 (FU-76): an effect also carries its current `name`, so the chip can tell a
// renamed effect from a stored label, and `updatedCopy` carries the marker
// wording from src/lib/safety (rule 7: the copy arrives as a prop, never retyped in the client).
import { citationHref } from "@/lib/advisor/citation-href";
import { libraryLabel } from "@/lib/advisor/citation-label";
import { defaultLibrary } from "@/lib/evidence";
import { citationUpdatedCopy } from "@/lib/safety";
import type { EvidenceGrade } from "@/types";

export interface CitationIndex {
  effects: Readonly<
    Record<
      string,
      {
        grade: EvidenceGrade | undefined;
        href: string | null;
        label: string | null;
        /** Today's effect name, compared with the name a stored label carries (FU-76). */
        name: string | undefined;
      }
    >
  >;
  /** `label` is null when the paper is absent or carries no DOI or PMID. */
  papers: Readonly<Record<string, { label: string | null; href: string | null }>>;
  /** The marker wording, from src/lib/safety (Phase 4 U20, FU-76). */
  updatedCopy: { readonly [K in keyof typeof citationUpdatedCopy]: string };
}

export function buildCitationIndex(): CitationIndex {
  const effects: Record<string, CitationIndex["effects"][string]> = {};
  for (const { id } of defaultLibrary.effects) {
    if (Object.hasOwn(effects, id)) continue;
    const effect = defaultLibrary.effects.find((e) => e.id === id);
    effects[id] = {
      grade: effect?.grade,
      href: citationHref({ kind: "effect-grade", refId: id, label: "" }),
      label: libraryLabel("effect-grade", id).label,
      name: effect?.name,
    };
  }

  const paperIds = new Set<string>(defaultLibrary.papers.map((p) => p.id));
  for (const e of defaultLibrary.effects) for (const p of e.paperIds) paperIds.add(p);
  const papers: Record<string, CitationIndex["papers"][string]> = {};
  for (const id of paperIds) {
    papers[id] = {
      label: libraryLabel("paper", id).label,
      href: citationHref({ kind: "paper", refId: id, label: "" }),
    };
  }
  return { effects, papers, updatedCopy: citationUpdatedCopy };
}
