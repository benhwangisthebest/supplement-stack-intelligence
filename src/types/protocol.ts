import type { DoseRange, EvidenceGrade, ItemTiming, OutcomeCategory } from "./index";

// Design §3 — ephemeral protocol generation types (no persisted table).
export type ProtocolTier =
  | "foundational"
  | "targeted"
  | "advanced"
  | "experimental";

export interface ProtocolSuggestion {
  supplementId: string;
  supplementName: string;
  outcomeCategory: OutcomeCategory; // the goal this suggestion serves
  effectId: string;
  grade: EvidenceGrade;
  tier: ProtocolTier;
  dose: DoseRange; // suggested (from the best effect's studiedDose, fallback generalDose)
  timing: ItemTiming | null;
  rationale: string; // "why it fits" — via lib/safety
  confidenceNote: string | null; // "what would raise confidence"
  labBoosted: boolean; // prioritized due to a relevant lab marker (derived: labSignal > 0)
  labSignal?: number; // biomarker-intelligence v3 — bounded ranking signal (+boost / −demote)
  labRationale?: string | null; // biomarker-intelligence v3 — explainable lab note
  medicationCaution: boolean; // flagged because the profile lists medications
  alreadyInStack: boolean; // already present in the target stack
}

export interface ProtocolGroup {
  goal: OutcomeCategory;
  suggestions: ProtocolSuggestion[]; // ranked
}

export interface ProtocolResult {
  groups: ProtocolGroup[];
  generatedFor: { goals: OutcomeCategory[]; hasLabs: boolean };
}
