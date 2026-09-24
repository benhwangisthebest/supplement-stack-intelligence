// SERVER-SIDE props builder for the Stack Lab detail page (Phase 3 U9 (b),
// CLAUDE.md §4 rule 7). The page calls these and passes the results down as
// props, so StackLabClient / StackWorkspace / StackItemRow import nothing from
// src/lib or src/data at runtime. Client modules may import this file's TYPES
// only (`import type`); a runtime import from client code is a CLIENT_TAKES_PROPS
// failure, because it would pull the imports below into the browser bundle.
import { SEED_PRODUCTS } from "@/data/seed-products";
import { getProductById } from "@/lib/product-matcher";
import { COVERAGE, DISCLAIMERS, type CoverageCopy } from "@/lib/safety";
import type { DisclaimerText } from "@/components/ui/Disclaimer";

export interface StackLabCopy {
  evaluationDisclaimer: DisclaimerText;
  interactionDisclaimer: DisclaimerText;
  stackEvaluationLimit: CoverageCopy;
  stackCustomItems: CoverageCopy;
}

export function stackLabCopy(): StackLabCopy {
  return {
    evaluationDisclaimer: DISCLAIMERS.evaluation,
    interactionDisclaimer: DISCLAIMERS.interaction,
    stackEvaluationLimit: COVERAGE.stackEvaluationLimit,
    stackCustomItems: COVERAGE.stackCustomItems,
  };
}

export interface AttachedProductLabel {
  brand: string;
  name: string;
}

/** Product id → the two fields the attached-product badge renders. */
export type AttachedProductLabels = Readonly<Record<string, AttachedProductLabel>>;

/**
 * Every seed product, resolved through `getProductById` — the call the badge used
 * to make in the browser. `getProductById`'s default catalog IS `SEED_PRODUCTS`, so
 * an id outside this map resolves to `undefined` there too: the badge's "unknown id
 * renders nothing" behaviour is preserved, not approximated.
 */
export function attachedProductLabels(): AttachedProductLabels {
  const out: Record<string, AttachedProductLabel> = {};
  for (const { id } of SEED_PRODUCTS) {
    const p = getProductById(id);
    if (p && !Object.hasOwn(out, id)) out[id] = { brand: p.brand, name: p.name };
  }
  return out;
}
