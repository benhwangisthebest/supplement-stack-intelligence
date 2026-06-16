import type { EvidenceGrade } from "./index";

// Domain layer — biomarker registry + relevance entities (seed-as-code, no DB).
// Design Ref: §3.1 — biomarker-intelligence data model.

export type BiomarkerDirection = "low" | "high"; // which side triggers relevance
export type BiomarkerRelation = "support" | "caution";

export const BIOMARKER_DIRECTIONS: readonly BiomarkerDirection[] = [
  "low",
  "high",
] as const;
export const BIOMARKER_RELATIONS: readonly BiomarkerRelation[] = [
  "support",
  "caution",
] as const;

/** Canonical biomarker registry entry. Reference data. */
export interface Biomarker {
  id: string; // e.g. "vitamin-d-25oh", "ldl-cholesterol"
  name: string; // display name
  aliases: string[]; // free-text variants (lowercased at match time)
  canonicalUnit: string; // e.g. "ng/mL"
  // unit (normalized) → multiply factor to reach canonicalUnit (canonical = 1).
  unitConversions: Record<string, number>;
  refLow: number | null; // population reference, in canonical unit
  refHigh: number | null;
}

/** Curated biomarker↔supplement relevance rule. */
export interface BiomarkerRelevanceRule {
  id: string;
  biomarkerId: string; // FK → seed-biomarkers
  supplementId: string; // FK → SEED_SUPPLEMENTS
  trigger: BiomarkerDirection; // low → below range; high → above range
  relation: BiomarkerRelation; // support (may help) | caution (may worsen)
  evidenceGrade: EvidenceGrade;
  rationale: string; // short, factual, hedged
}

/** Per-context finding for the evaluator surface. */
export interface LabFinding {
  ruleId: string;
  biomarkerId: string;
  biomarkerName: string;
  supplementId: string;
  status: BiomarkerDirection; // the user's marker status that triggered it
  relation: BiomarkerRelation;
  rationale: string;
  evidenceGrade: EvidenceGrade;
}

/** Bounded lab ranking signal for one supplement (protocol surface). */
export interface LabSignal {
  score: number; // bounded [-1, 1]: + boost, − demote
  biomarkerName: string | null; // top contributing marker
  rationale: string | null; // explainable note
}
