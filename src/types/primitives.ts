// Domain: shared enums & value types (Design §3.1)
// This layer is PURE — no React, no Supabase, no I/O (Design §9.2).
//
// Architecture: this is a LEAF. It imports nothing, and every other src/types
// module imports its primitives from here — never from the barrel (./index).
// A barrel that also declares creates an index → leaf → index cycle; that is
// the defect this file exists to prevent.

export type EvidenceGrade = "A" | "B" | "C" | "D";
// A = strong human evidence … D = preliminary / mechanistic only
export const EVIDENCE_GRADES: readonly EvidenceGrade[] = ["A", "B", "C", "D"] as const;

export type Confidence = "high" | "moderate" | "low";

export type OutcomeCategory =
  | "sleep"
  | "focus"
  | "training"
  | "recovery"
  | "stress"
  | "gut"
  | "metabolic"
  | "longevity"
  | "foundational"
  | "mood"
  | "deficiency";

export const OUTCOME_CATEGORIES: readonly OutcomeCategory[] = [
  "sleep",
  "focus",
  "training",
  "recovery",
  "stress",
  "gut",
  "metabolic",
  "longevity",
  "foundational",
  "mood",
  "deficiency",
] as const;

export type SupplementForm =
  | "capsule"
  | "powder"
  | "gummy"
  | "liquid"
  | "tablet"
  | "softgel";

export const SUPPLEMENT_FORMS: readonly SupplementForm[] = [
  "capsule",
  "powder",
  "gummy",
  "liquid",
  "tablet",
  "softgel",
] as const;

export interface DoseRange {
  min: number;
  max: number;
  unit: string;
}
