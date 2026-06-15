import type { EvidenceGrade } from "./index";

export type FlagSeverity = "info" | "warning" | "critical";

export type FlagCategory =
  | "evidence-fit"
  | "dose-fit"
  | "timing-fit"
  | "redundancy"
  | "allergy-conflict"
  | "medication-caution" // supplement↔drug interaction (medication-interactions, v2)
  | "interaction-risk" // supplement↔supplement interaction (medication-interactions, v2)
  | "lab-relevance"
  | "goal-alignment"
  | "cost-efficiency"
  | "complexity";

// Design §3.1 — persisted (Supabase). Produced by the pure evaluator.
export interface EvaluationFlag {
  id: string;
  stackId: string;
  stackItemId: string | null;
  severity: FlagSeverity;
  category: FlagCategory;
  title: string;
  explanation: string;
  recommendation: string;
  evidenceLevel: EvidenceGrade | "n/a";
  createdAt: string;
}

/**
 * Draft flag emitted by the pure evaluator before persistence.
 * Omits DB-assigned fields (id, createdAt) — the service layer fills those in.
 */
export type DraftFlag = Omit<EvaluationFlag, "id" | "stackId" | "createdAt">;

export interface EvaluationSummary {
  critical: number;
  warning: number;
  info: number;
}
