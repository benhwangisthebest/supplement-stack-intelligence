// SERVER-SIDE props builder for ProvenanceChips (Phase 3 U9 (b), CLAUDE.md §4
// rule 7). The advisor page builds this once and passes it down through
// AdvisorPanel → AdvisorMessageBubble, so the chips resolve streamed citations
// without importing the evidence library into the browser. Client modules may
// import this file's TYPES only; a runtime import is a CLIENT_TAKES_PROPS failure.
//
// EXACTNESS. Each value below is the lib's own answer (citationHref,
// defaultLibrary, getPaperById), computed for every id that can produce a
// non-null answer:
//  - an effect's grade comes from `defaultLibrary.effects`, and `citationHref`
//    resolves an effect only through `getEffectsForSupplement`, which filters that
//    same array — so its ids are the complete key set;
//  - a paper resolves via `getPaperById` (`defaultLibrary.papers`) or via
//    `citationHref`, which finds it only in some effect's `paperIds` — so the union
//    of those two is the complete key set.
// An id outside the index gets `undefined` / `null` from the lib as well, which is
// exactly what the chip's fallback does.
import { citationHref } from "@/lib/advisor/citation-href";
import { defaultLibrary, getPaperById } from "@/lib/evidence";
import type { EvidenceGrade } from "@/types";

export interface CitationIndex {
  effects: Readonly<Record<string, { grade: EvidenceGrade | undefined; href: string | null }>>;
  /** `verifiedTitle` is set only when the paper carries a DOI or PMID. */
  papers: Readonly<Record<string, { verifiedTitle: string | null; href: string | null }>>;
}

export function buildCitationIndex(): CitationIndex {
  const effects: Record<string, CitationIndex["effects"][string]> = {};
  for (const { id } of defaultLibrary.effects) {
    if (Object.hasOwn(effects, id)) continue;
    effects[id] = {
      grade: defaultLibrary.effects.find((e) => e.id === id)?.grade,
      href: citationHref({ kind: "effect-grade", refId: id, label: "" }),
    };
  }

  const paperIds = new Set<string>(defaultLibrary.papers.map((p) => p.id));
  for (const e of defaultLibrary.effects) for (const p of e.paperIds) paperIds.add(p);
  const papers: Record<string, CitationIndex["papers"][string]> = {};
  for (const id of paperIds) {
    const paper = getPaperById(id);
    papers[id] = {
      verifiedTitle: paper && (paper.doi || paper.pmid) ? paper.title : null,
      href: citationHref({ kind: "paper", refId: id, label: "" }),
    };
  }
  return { effects, papers };
}
