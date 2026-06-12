// Domain layer — PURE. Product fit scoring rules (Design §11.4).
// Scoring functions take ScorableProduct (affiliate omitted) — affiliate cannot affect rank.
import type { ScorableProduct, SupplementForm } from "@/types";

// ---- Weights (sum to 1) + tunable constants. Constants live here only. ----
export const WEIGHTS = {
  dose: 0.35,
  price: 0.25,
  testing: 0.2,
  form: 0.1,
  additives: 0.1,
} as const;

export const FORM_MISS = 0.6; // form not in preferences
export const NO_TEST = 0.6; // no third-party testing
export const ADDITIVE_PENALTY = 0.15; // per additive tag
export const ADDITIVE_MAX_PENALTY = 0.6;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Dose sub-score: 1 at exact match, decaying with relative distance. */
export function doseSubScore(
  product: ScorableProduct,
  targetDose: number,
  targetUnit: string,
): number {
  if (norm(product.doseUnit) !== norm(targetUnit) || targetDose <= 0) return 0.5; // can't compare
  const r = product.dosePerServing / targetDose;
  return Math.max(0, 1 - Math.min(Math.abs(1 - r), 1));
}

export function formSubScore(
  product: ScorableProduct,
  formPreferences: SupplementForm[],
): number {
  if (formPreferences.length === 0) return 1; // no preference → neutral-good
  return formPreferences.includes(product.form) ? 1 : FORM_MISS;
}

export function testingSubScore(product: ScorableProduct): number {
  return product.testingTags.length > 0 ? 1 : NO_TEST;
}

export function additivesSubScore(product: ScorableProduct): number {
  return 1 - Math.min(product.additivesTags.length * ADDITIVE_PENALTY, ADDITIVE_MAX_PENALTY);
}

/** Cost per target-dose-equivalent serving (lower is better). */
export function pricePerEffectiveDose(
  product: ScorableProduct,
  targetDose: number,
  targetUnit: string,
): number {
  const perServing = product.price / Math.max(product.servingsPerContainer, 1);
  const fit = Math.max(doseSubScore(product, targetDose, targetUnit), 0.1);
  return perServing / fit;
}

/**
 * Price sub-score normalized within the candidate set: cheapest (by price-per-effective-dose)
 * scores 1, most expensive scores ~0. Single candidate → 1.
 */
export function priceSubScore(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return 1 - (value - min) / (max - min);
}

export function hasAllergenConflict(
  product: ScorableProduct,
  allergies: string[],
): boolean {
  const set = new Set(allergies.map(norm));
  return product.allergenTags.some((t) => set.has(norm(t)));
}

export interface SubScores {
  dose: number;
  form: number;
  testing: number;
  additives: number;
  price: number;
}

export function fitScore(sub: SubScores): number {
  return Math.round(
    100 *
      (WEIGHTS.dose * sub.dose +
        WEIGHTS.price * sub.price +
        WEIGHTS.testing * sub.testing +
        WEIGHTS.form * sub.form +
        WEIGHTS.additives * sub.additives),
  );
}
