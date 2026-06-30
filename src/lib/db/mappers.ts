// Infrastructure — single place mapping DB rows (snake_case) to domain (camelCase).
// Design Ref: §9.1 — keeps DB shape out of the domain/presentation layers.
import type {
  EvaluationFlag,
  ExperienceLevel,
  FlagCategory,
  FlagSeverity,
  EvidenceGrade,
  ItemFrequency,
  ItemTiming,
  LabMarker,
  OutcomeCategory,
  RiskTolerance,
  Stack,
  StackIntent,
  StackItem,
  StackMode,
  SupplementForm,
  UserProfile,
} from "@/types";
import type { LabPanel, LabMarkerTimelinePoint } from "@/types/lab";
import type {
  EvaluationFlagRow,
  LabMarkerRow,
  LabPanelRow,
  StackItemRow,
  StackRow,
  UserProfileRow,
} from "./types";

export function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    goals: row.goals as OutcomeCategory[],
    diet: row.diet,
    riskTolerance: row.risk_tolerance as RiskTolerance | null,
    allergies: row.allergies,
    medications: row.medications,
    avoidedIngredients: row.avoided_ingredients,
    formPreferences: row.form_preferences as SupplementForm[],
    caffeineSensitivity: row.caffeine_sensitivity,
    experienceLevel: row.experience_level as ExperienceLevel | null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLabMarker(row: LabMarkerRow): LabMarker {
  return {
    id: row.id,
    userId: row.user_id,
    marker: row.marker,
    value: row.value,
    unit: row.unit,
    referenceLow: row.reference_low,
    referenceHigh: row.reference_high,
    date: row.date,
    notes: row.notes,
  };
}

export function toLabPanel(row: LabPanelRow): LabPanel {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source as LabPanel["source"],
    collectedAt: row.collected_at,
    createdAt: row.created_at,
  };
}

/**
 * Build a trend timeline point from a lab_markers row. Returns null for rows
 * that can't anchor a trend: no canonical biomarker/value (unrecognized marker
 * or unconvertible unit) or no date. The timeline axis is panel.collected_at if
 * present, else the row's own legacy `date` (Design §3.3 coalesce rule).
 */
export function toTimelinePoint(
  row: LabMarkerRow,
  panelCollectedAt: string | null,
): LabMarkerTimelinePoint | null {
  const collectedAt = panelCollectedAt ?? row.date;
  if (
    row.biomarker_id === null ||
    row.canonical_value === null ||
    row.canonical_unit === null ||
    collectedAt === null
  ) {
    return null;
  }
  return {
    biomarkerId: row.biomarker_id,
    canonicalValue: row.canonical_value,
    canonicalUnit: row.canonical_unit,
    collectedAt,
  };
}

export function toStack(row: StackRow): Stack {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    intent: row.intent as StackIntent,
    mode: row.mode as StackMode,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStackItem(row: StackItemRow): StackItem {
  return {
    id: row.id,
    stackId: row.stack_id,
    supplementId: row.supplement_id,
    customName: row.custom_name,
    dose: row.dose,
    unit: row.unit,
    timing: row.timing as ItemTiming | null,
    frequency: row.frequency as ItemFrequency | null,
    reason: row.reason,
    notes: row.notes,
    productId: row.product_id ?? null, // v8: read-only attached-product surface
  };
}

export function toEvaluationFlag(row: EvaluationFlagRow): EvaluationFlag {
  return {
    id: row.id,
    stackId: row.stack_id,
    stackItemId: row.stack_item_id,
    severity: row.severity as FlagSeverity,
    category: row.category as FlagCategory,
    title: row.title,
    explanation: row.explanation,
    recommendation: row.recommendation,
    evidenceLevel: row.evidence_level as EvidenceGrade | "n/a",
    createdAt: row.created_at,
  };
}
