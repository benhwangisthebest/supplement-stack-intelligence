// Domain: shared enums & value types (Design §3.1)
// This layer is PURE — no React, no Supabase, no I/O (Design §9.2).

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

export * from "./supplement";
export * from "./effect";
export * from "./paper";
export * from "./profile";
export * from "./stack";
export * from "./evaluation";
export * from "./protocol";
export * from "./product";
