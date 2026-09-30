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
import type { DailyCheckin, GoalRating } from "@/types/checkin";
import { SIDE_EFFECT_VOCAB } from "@/types/side-effect";
import type { CanonicalSideEffect, SideEffectReport } from "@/types/side-effect";
import type {
  CheckinRow,
  EvaluationFlagRow,
  LabMarkerRow,
  LabPanelRow,
  SideEffectReportRow,
  StackItemRow,
  StackRow,
  UserProfileRow,
} from "./types";

/**
 * A row value outside the union its column is read as (FU-29). These columns are
 * plain `text`/`text[]` with no CHECK constraint, so the database accepts any
 * string; before this, a cast passed it on to engines typed as if it could not
 * exist. Now it fails here.
 *
 * The message names the table and column, never the value: several of these
 * columns are health context (CLAUDE.md §2.3 rule 15), and a repo's caller logs
 * what it catches.
 */
export class MapperDomainError extends Error {
  readonly table: string;
  readonly column: string;

  constructor(table: string, column: string) {
    super(`${table}.${column} holds a value outside its domain`);
    this.name = "MapperDomainError";
    this.table = table;
    this.column = column;
  }
}

// One set per union, each the src/types union it guards. `Record<U, true>`
// makes the literal exact: a missing member or an extra key is a compile error,
// so a union that grows cannot leave its reader rejecting the new value.
type Domain<T extends string> = Readonly<Record<T, true>>;

const OUTCOME_CATEGORY: Domain<OutcomeCategory> = {
  sleep: true,
  focus: true,
  training: true,
  recovery: true,
  stress: true,
  gut: true,
  metabolic: true,
  longevity: true,
  foundational: true,
  mood: true,
  deficiency: true,
};
const STACK_INTENT: Domain<StackIntent> = { ...OUTCOME_CATEGORY, experimental: true };
const STACK_MODE: Domain<StackMode> = { current: true, planned: true };
const RISK_TOLERANCE: Domain<RiskTolerance> = { low: true, moderate: true, high: true };
const EXPERIENCE_LEVEL: Domain<ExperienceLevel> = {
  beginner: true,
  intermediate: true,
  advanced: true,
};
const SUPPLEMENT_FORM: Domain<SupplementForm> = {
  capsule: true,
  powder: true,
  gummy: true,
  liquid: true,
  tablet: true,
  softgel: true,
};
const LAB_SOURCE: Domain<LabPanel["source"]> = { pdf: true, csv: true, paste: true, manual: true };
const ITEM_TIMING: Domain<ItemTiming> = {
  morning: true,
  midday: true,
  evening: true,
  "pre-workout": true,
  "with-meal": true,
  bedtime: true,
};
const ITEM_FREQUENCY: Domain<ItemFrequency> = {
  daily: true,
  "workout-days": true,
  "as-needed": true,
  weekly: true,
};
const FLAG_SEVERITY: Domain<FlagSeverity> = { info: true, warning: true, critical: true };
const FLAG_CATEGORY: Domain<FlagCategory> = {
  "evidence-fit": true,
  "dose-fit": true,
  "timing-fit": true,
  redundancy: true,
  "allergy-conflict": true,
  "medication-caution": true,
  "interaction-risk": true,
  "lab-relevance": true,
  "goal-alignment": true,
  "cost-efficiency": true,
  complexity: true,
  "side-effect-caution": true,
  "food-pairing": true,
};
const EVIDENCE_LEVEL: Domain<EvidenceGrade | "n/a"> = {
  A: true,
  B: true,
  C: true,
  D: true,
  "n/a": true,
};
// The one union derived from a runtime list, so the list is exact by construction.
const SIDE_EFFECT_LABEL = Object.fromEntries(
  SIDE_EFFECT_VOCAB.map((label) => [label, true]),
) as Domain<CanonicalSideEffect>;

// `hasOwn`, not `in`: "toString" is `in` every object literal.
function isMember<T extends string>(domain: Domain<T>, value: string): value is T {
  return Object.hasOwn(domain, value);
}

function member<T extends string>(
  domain: Domain<T>,
  value: string,
  table: string,
  column: string,
): T {
  if (isMember(domain, value)) return value;
  if (absent(value)) return value as T;
  throw new MapperDomainError(table, column);
}

// A key missing from the row object is shape, not value: a `select("*")` row
// never lacks a column, and SCHEMA_DRIFT owns shape (Phase 1 U8). Only a
// hand-built partial row lacks one, so absence passes through as it did before
// FU-29; the owner kept that (decision queue Q-9, 2026-09-29).
function absent(value: unknown): boolean {
  return value === undefined;
}

function nullableMember<T extends string>(
  domain: Domain<T>,
  value: string | null,
  table: string,
  column: string,
): T | null {
  return value === null ? null : member(domain, value, table, column);
}

function members<T extends string>(
  domain: Domain<T>,
  values: string[],
  table: string,
  column: string,
): T[] {
  if (absent(values)) return values as T[];
  return values.map((value) => member(domain, value, table, column));
}

// FU-17 (owner ruling (c), 2026-09-29). `checkins.ratings`, `taken` and
// `scheduled` are `jsonb not null`, which rejects SQL NULL but stores the JSON
// value `null`, and no CHECK constrains their shape. An unwritten column gets
// its DDL default, so only a direct write puts anything else there; the mapper
// refuses it instead of defaulting it away or passing it on.
function jsonObject(value: unknown, table: string, column: string): Record<string, unknown> {
  if (absent(value)) return value as Record<string, unknown>;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new MapperDomainError(table, column);
}

function stringArray(value: unknown, table: string, column: string): string[] {
  if (absent(value)) return value as string[];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  throw new MapperDomainError(table, column);
}

export function toCheckin(row: CheckinRow): DailyCheckin {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.checkin_date,
    ratings: jsonObject(row.ratings, "checkins", "ratings") as Partial<
      Record<OutcomeCategory, GoalRating>
    >,
    taken: stringArray(row.taken, "checkins", "taken"),
    scheduled: stringArray(row.scheduled, "checkins", "scheduled"),
    note: row.note,
    sideEffect: row.side_effect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// side-effect-engine v11 — one structured report row → domain shape.
export function toSideEffectReport(row: SideEffectReportRow): SideEffectReport {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.report_date,
    effectLabel: member(SIDE_EFFECT_LABEL, row.effect_label, "side_effect_reports", "effect_label"),
    severity: (row.severity ?? undefined) as 1 | 2 | 3 | undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    goals: members(OUTCOME_CATEGORY, row.goals, "user_profiles", "goals"),
    diet: row.diet,
    riskTolerance: nullableMember(RISK_TOLERANCE, row.risk_tolerance, "user_profiles", "risk_tolerance"),
    allergies: row.allergies,
    medications: row.medications,
    avoidedIngredients: row.avoided_ingredients,
    formPreferences: members(SUPPLEMENT_FORM, row.form_preferences, "user_profiles", "form_preferences"),
    caffeineSensitivity: row.caffeine_sensitivity,
    experienceLevel: nullableMember(
      EXPERIENCE_LEVEL,
      row.experience_level,
      "user_profiles",
      "experience_level",
    ),
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
    source: member(LAB_SOURCE, row.source, "lab_panels", "source"),
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
    intent: member(STACK_INTENT, row.intent, "stacks", "intent"),
    mode: member(STACK_MODE, row.mode, "stacks", "mode"),
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
    timing: nullableMember(ITEM_TIMING, row.timing, "stack_items", "timing"),
    frequency: nullableMember(ITEM_FREQUENCY, row.frequency, "stack_items", "frequency"),
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
    severity: member(FLAG_SEVERITY, row.severity, "evaluation_flags", "severity"),
    category: member(FLAG_CATEGORY, row.category, "evaluation_flags", "category"),
    title: row.title,
    explanation: row.explanation,
    recommendation: row.recommendation,
    evidenceLevel: member(EVIDENCE_LEVEL, row.evidence_level, "evaluation_flags", "evidence_level"),
    createdAt: row.created_at,
  };
}
