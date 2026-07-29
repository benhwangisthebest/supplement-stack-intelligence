import type {
  Confidence,
  DoseRange,
  EvidenceGrade,
  OutcomeCategory,
} from "./primitives";
import type { EvidenceProfile } from "./evidence-grading";

// Design §3.1 — EFFECT-LEVEL grading is core to the trust layer.
export interface Effect {
  id: string;
  supplementId: string;
  name: string; // e.g. "Strength & power output"
  outcomeCategory: OutcomeCategory;
  grade: EvidenceGrade;
  confidence: Confidence;
  summary: string;
  relevantPopulation: string; // e.g. "trained adults"
  studiedDose: DoseRange;
  /** Mechanism tags used by the redundancy rule (Design §11.4) */
  mechanismTags: string[];
  paperIds: string[];
  // evidence-grading v5 (Design §3.2): optional multi-dimensional profile.
  // When present, lib/evidence derives `grade` from it; absent = legacy literal.
  evidenceProfile?: EvidenceProfile;
}
