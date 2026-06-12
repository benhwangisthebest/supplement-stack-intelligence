import type { SupplementForm } from "./index";

// Design §3 — product-match types. Seeded catalog + computed match results.
export interface Product {
  id: string;
  supplementId: string; // soft ref to seed Supplement
  brand: string;
  name: string;
  form: SupplementForm;
  dosePerServing: number; // active ingredient per serving
  doseUnit: string;
  servingsPerContainer: number;
  price: number; // container price (USD)
  allergenTags: string[];
  testingTags: string[]; // e.g. ["NSF", "Informed Sport"]
  additivesTags: string[]; // e.g. ["artificial-color", "magnesium-stearate"]
  affiliateLink: string | null; // NEVER read by the scorer
  qualityNotes: string;
}

/**
 * Affiliate-free view the scorer is allowed to see (compile-time trust guard, Design §1.1).
 * Omitting affiliateLink + qualityNotes makes affiliate-independence structural.
 */
export type ScorableProduct = Omit<Product, "affiliateLink" | "qualityNotes">;

export interface MatchBreakdown {
  dose: number; // 0..1 sub-scores
  form: number;
  testing: number;
  additives: number;
  price: number;
}

export interface ProductMatch {
  product: Product; // full product (affiliate kept for display only)
  fitScore: number; // 0..100, affiliate-independent
  breakdown: MatchBreakdown;
  pricePerEffectiveDose: number; // USD per target-dose-equivalent serving
  reasons: string[]; // per-criterion "why" (via lib/safety)
}

export interface ProductMatchGroup {
  stackItemId: string;
  supplementId: string;
  supplementName: string;
  targetDose: number;
  targetUnit: string;
  matches: ProductMatch[]; // ranked; empty if none / all filtered
}

export interface ProductMatchResult {
  groups: ProductMatchGroup[];
}
