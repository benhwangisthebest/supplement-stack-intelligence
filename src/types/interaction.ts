import type { EvidenceGrade } from "./primitives";

// Domain layer — seed/interaction entities (read-only TS modules, no DB).
// Design Ref: §3.1 — medication-interactions data model.

export type InteractionSeverity = "info" | "caution" | "warning" | "serious";

export const INTERACTION_SEVERITIES: readonly InteractionSeverity[] = [
  "info",
  "caution",
  "warning",
  "serious",
] as const;

export type InteractionKind =
  | "supplement-drug"
  | "supplement-supplement"
  | "supplement-food"; // food-pairings (v12) — absorption synergy / avoid

export const INTERACTION_KINDS: readonly InteractionKind[] = [
  "supplement-drug",
  "supplement-supplement",
  "supplement-food",
] as const;

// food-pairings (v12). Direction of a supplement↔food relationship.
// Design Ref: §3.1 — supplement-food data model.
export type FoodDirection = "synergy" | "avoid";

export const FOOD_DIRECTIONS: readonly FoodDirection[] = [
  "synergy",
  "avoid",
] as const;

// Canonical drug classes. Closed set so alias data and rule data cannot drift
// apart via typos (validated by Zod in lib/interactions/schema.ts).
export const DRUG_CLASSES = [
  "anticoagulant",
  "antiplatelet",
  "antidiabetic",
  "thyroid-medication",
  "antihypertensive",
  "thiazide-diuretic",
  "sedative",
  "immunosuppressant",
  "stimulant",
  "quinolone-antibiotic",
  "tetracycline-antibiotic",
  "nitrate-vasodilator",
  "ssri",
] as const;

export type DrugClass = (typeof DRUG_CLASSES)[number];

/** A curated interaction rule (seed-as-code). Design §3.1. */
export interface InteractionRule {
  id: string;
  kind: InteractionKind;
  supplementId: string; // FK → SEED_SUPPLEMENTS
  // supplement-drug: match a drug class (preferred) or a specific generic.
  drugClass?: DrugClass;
  drugGeneric?: string;
  // supplement-supplement: the other supplement.
  otherSupplementId?: string;
  // supplement-food (v12): direction + the food/food-class this rule concerns.
  direction?: FoodDirection; // required when kind === "supplement-food"
  food?: string; // e.g. "vitamin C–rich foods"; required for supplement-food
  timing?: string; // optional, e.g. "take with a fat-containing meal"
  severity: InteractionSeverity;
  mechanism: string; // short, factual
  management: string; // hedged guidance
  evidenceGrade: EvidenceGrade;
}

/** A finding produced by the engine for a specific user context. Design §3.1. */
export interface InteractionFinding {
  ruleId: string;
  kind: InteractionKind;
  severity: InteractionSeverity;
  supplementId: string;
  // The participant that triggered the match: a drug generic/class key
  // (supplement-drug), the other supplementId (supplement-supplement), or
  // the food label (supplement-food).
  counterpart: string;
  // supplement-food (v12): carried through so surfaces can branch on direction.
  direction?: FoodDirection;
  food?: string;
  timing?: string;
  mechanism: string;
  management: string;
  evidenceGrade: EvidenceGrade;
}

/** Medication alias map entry: brand → generic → drug class(es). Design §3.1. */
export interface MedicationAlias {
  canonical: string; // generic name, e.g. "warfarin"
  brands: string[]; // e.g. ["coumadin", "jantoven"]
  drugClasses: DrugClass[];
}

/** Result of normalizing a user's free-text medication list. Design §4.1. */
export interface NormalizedMedication {
  input: string; // original user string
  canonical: string; // resolved generic
  drugClasses: DrugClass[];
}

export interface NormalizationResult {
  recognized: NormalizedMedication[];
  unresolved: string[]; // inputs that matched nothing — never treated as "safe"
}
