// Domain layer — PURE. The label the Library gives a cited id TODAY.
// Phase 4 U9 (D-16 (b); owner ruling 2026-09-28, option 2). A citation's `label` is
// PERSISTED in advisor_messages.citations and loaded as stored (src/lib/advisor/repo.ts),
// so a message written before a content correction still carries the old wording: a
// pre-U6 paper title, or an effect's old name ("Cardiovascular support" before U6
// renamed fish-oil-cardiovascular to "Triglyceride lowering"). The rows are never
// edited. This module is the ONE place that answers "what does the Library call this
// id now"; the advisor's source chips (via the server-built CitationIndex) and the
// account export both consume it, so the two cannot disagree.
//
// Only kinds whose refId is a seed id resolve (owner clarification 2026-09-28):
// effect-grade (effect.id) and paper (paper.id). Every other kind's refId is an
// engine rule or a composite key with no Library label, so it is "not-resolved".
import { defaultLibrary, getPaperById, getSupplementById } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";

export type LabelResolution = "resolved" | "not-in-library" | "not-resolved";

/** Where the Library stands on one (kind, refId), independent of any stored label. */
export type LibraryLabel =
  /** `label: null` — the Library holds the id but offers no label of its own; the stored one stands. */
  | { labelResolution: "resolved"; label: string | null }
  | { labelResolution: "not-in-library" | "not-resolved"; label: null };

export interface CurrentCitationLabel {
  labelResolution: LabelResolution;
  /** Today's label when "resolved"; null otherwise. */
  currentLabel: string | null;
}

/**
 * The Library's own answer for an id. Lookups compare with `===` over arrays, so a
 * refId like "constructor" cannot resolve through Object.prototype, and a malformed
 * stored refId (not a string) is simply absent.
 *  - effect-grade → `${supp.name} → ${effect.name}, Grade ${grade}`, the grade the
 *    Library resolves today (`defaultLibrary.effects` is pre-resolved).
 *  - paper → its title when it carries a DOI or PMID (verified). A paper the Library
 *    holds WITHOUT one resolves with `label: null`: the id is present, so it is not
 *    "not-in-library", but there is no verified title to offer in place of what was
 *    stored (today only `p-nac-antioxidant`, FU-57).
 */
export function libraryLabel(kind: Citation["kind"], refId: string): LibraryLabel {
  if (kind === "effect-grade") {
    const effect = defaultLibrary.effects.find((e) => e.id === refId);
    const supp = effect && getSupplementById(effect.supplementId);
    if (!effect || !supp) return { labelResolution: "not-in-library", label: null };
    return { labelResolution: "resolved", label: `${supp.name} → ${effect.name}, Grade ${effect.grade}` };
  }
  if (kind === "paper") {
    const paper = getPaperById(refId);
    if (!paper) return { labelResolution: "not-in-library", label: null };
    return { labelResolution: "resolved", label: paper.doi || paper.pmid ? paper.title : null };
  }
  return { labelResolution: "not-resolved", label: null };
}

/**
 * A stored citation's current label. "resolved" carries today's label — the Library's
 * own, or the stored label when the Library holds the id but offers none. Anything
 * else carries null. Never throws for an unknown id and never guesses one.
 */
export function currentCitationLabel(c: Pick<Citation, "kind" | "refId" | "label">): CurrentCitationLabel {
  const r = libraryLabel(c.kind, c.refId);
  if (r.labelResolution !== "resolved") return { labelResolution: r.labelResolution, currentLabel: null };
  // A stored row is jsonb read unvalidated: a missing label must export as null, never
  // as `undefined` (which JSON.stringify drops, losing the field).
  return { labelResolution: "resolved", currentLabel: r.label ?? (typeof c.label === "string" ? c.label : null) };
}
