// Domain layer — PURE. Resolves a provenance Citation to a deep-link into the
// Library, or null when it isn't directly linkable (Design §5.3, Plan SC8).
// v8 advisor-experience: v6/v7 attached provenance but chips were inert; this
// turns the linkable kinds (effect-grade / paper) into hrefs over the existing
// pure evidence library — no new data, no I/O. Unresolved kinds degrade to null
// so the UI renders an inert tag (never a dead link).
import {
  getAllSupplements,
  getEffectsForSupplement,
} from "@/lib/evidence";
import type { Citation } from "@/types/advisor";

/**
 * `(kind, refId) → "/library/{slug}#…" | null`.
 *  - effect-grade: refId is an effect.id → owning supplement's page, anchored to
 *    its EvidenceBreakdown (`#effect-{id}`).
 *  - paper: refId is a paper.id → the supplement whose effect cites it, anchored
 *    (`#paper-{id}`).
 *  - interaction-rule / biomarker-rule / lab-trend / stack-eval: no stable public
 *    route → null (inert tag).
 * Pure: reads only the deterministic, DB-agnostic default evidence library.
 */
export function citationHref(c: Citation): string | null {
  switch (c.kind) {
    case "effect-grade":
      return hrefForEffect(c.refId);
    case "paper":
      return hrefForPaper(c.refId);
    default:
      return null;
  }
}

function hrefForEffect(effectId: string): string | null {
  for (const supp of getAllSupplements()) {
    if (getEffectsForSupplement(supp.id).some((e) => e.id === effectId)) {
      return `/library/${supp.slug}#effect-${effectId}`;
    }
  }
  return null;
}

function hrefForPaper(paperId: string): string | null {
  for (const supp of getAllSupplements()) {
    if (
      getEffectsForSupplement(supp.id).some((e) => e.paperIds.includes(paperId))
    ) {
      return `/library/${supp.slug}#paper-${paperId}`;
    }
  }
  return null;
}
