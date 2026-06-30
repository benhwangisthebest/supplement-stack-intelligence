// Domain layer — PURE. matchProducts() (Design §2.2, §11.4).
// Plan SC: deterministic, explainable, allergen-safe; affiliate provably out of ranking.
import { SEED_PRODUCTS } from "@/data/seed-products";
import { getSupplementById } from "@/lib/evidence";
import { safetyCopy } from "@/lib/safety";
import type {
  Product,
  ProductMatch,
  ProductMatchGroup,
  ProductMatchResult,
  ScorableProduct,
  StackItem,
  UserProfile,
} from "@/types";
import {
  additivesSubScore,
  doseSubScore,
  fitScore,
  formSubScore,
  hasAllergenConflict,
  pricePerEffectiveDose,
  priceSubScore,
  testingSubScore,
} from "./rules";

export interface MatchProductsInput {
  stackItems: StackItem[];
  profile?: UserProfile | null;
  products?: Product[];
}

/** v8 advisor-experience — resolve a seeded product by id (for the attached-product
 *  UI badge). PURE: reads the deterministic seed catalog. Returns undefined if gone. */
export function getProductById(
  id: string,
  products: Product[] = SEED_PRODUCTS,
): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Strips affiliate/display-only fields so the scorer literally cannot read them. */
function toScorable(p: Product): ScorableProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { affiliateLink, qualityNotes, ...scorable } = p;
  return scorable;
}

function buildReasons(
  sub: { dose: number; form: number; testing: number; additives: number },
  targetDose: number,
  targetUnit: string,
  product: Product,
  formPrefSet: boolean,
): string[] {
  const reasons: string[] = [];
  if (sub.dose >= 0.85) reasons.push(safetyCopy.productReasonDoseMatch(targetDose, targetUnit));
  else reasons.push(safetyCopy.productReasonDoseOff());
  if (formPrefSet && sub.form >= 1) reasons.push(safetyCopy.productReasonFormMatch(product.form));
  if (product.testingTags.length > 0) reasons.push(safetyCopy.productReasonTested());
  if (product.additivesTags.length > 0) reasons.push(safetyCopy.productReasonAdditives());
  return reasons;
}

export function matchProducts(input: MatchProductsInput): ProductMatchResult {
  const products = input.products ?? SEED_PRODUCTS;
  const profile = input.profile ?? null;
  const allergies = profile?.allergies ?? [];
  const formPreferences = profile?.formPreferences ?? [];

  const groups: ProductMatchGroup[] = [];

  for (const item of input.stackItems) {
    if (!item.supplementId) continue; // custom items can't be matched
    const supplementId = item.supplementId;
    const supp = getSupplementById(supplementId);

    const candidates = products.filter(
      (p) => p.supplementId === supplementId && !hasAllergenConflict(toScorable(p), allergies),
    );

    const targetDose = item.dose;
    const targetUnit = item.unit;

    // Pre-compute price-per-effective-dose for in-set normalization.
    const ppedList = candidates.map((p) =>
      pricePerEffectiveDose(toScorable(p), targetDose, targetUnit),
    );
    const minP = Math.min(...ppedList);
    const maxP = Math.max(...ppedList);

    const matches: ProductMatch[] = candidates.map((p, i) => {
      const scorable = toScorable(p);
      const dose = doseSubScore(scorable, targetDose, targetUnit);
      const form = formSubScore(scorable, formPreferences);
      const testing = testingSubScore(scorable);
      const additives = additivesSubScore(scorable);
      const price = priceSubScore(ppedList[i], minP, maxP);
      const breakdown = { dose, form, testing, additives, price };
      return {
        product: p, // affiliate re-attached for display only
        fitScore: fitScore(breakdown),
        breakdown,
        pricePerEffectiveDose: Math.round(ppedList[i] * 1000) / 1000,
        reasons: buildReasons(
          breakdown,
          targetDose,
          targetUnit,
          p,
          formPreferences.length > 0,
        ),
      };
    });

    matches.sort(
      (a, b) =>
        b.fitScore - a.fitScore ||
        a.pricePerEffectiveDose - b.pricePerEffectiveDose ||
        a.product.brand.localeCompare(b.product.brand),
    );

    groups.push({
      stackItemId: item.id,
      supplementId,
      supplementName: supp?.name ?? supplementId,
      targetDose,
      targetUnit,
      matches,
    });
  }

  return { groups };
}

export * from "./rules";
