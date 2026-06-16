// Domain layer — PURE. Evaluation rules + thresholds (Design §11.4).
// Imports only lib/evidence, lib/safety, and types. No I/O, no React, no Supabase.
import {
  getBestEffectForOutcome,
  getEffectsForSupplement,
  getSupplementById,
  type EvidenceLibrary,
} from "@/lib/evidence";
import { safetyCopy } from "@/lib/safety";
import { findInteractions, normalizeMedications } from "@/lib/interactions";
import { toInteractionFlags } from "@/lib/interactions/to-flags";
import { assessLabMarkers, biomarkersForSupplement, normalizeMarker } from "@/lib/biomarkers";
import { toLabFlags } from "@/lib/biomarkers/to-flags";
import type {
  DraftFlag,
  Effect,
  EvidenceGrade,
  LabMarker,
  OutcomeCategory,
  Stack,
  StackItem,
  UserProfile,
} from "@/types";
import type { TrendSignal } from "@/types/lab";

// ---- Thresholds (Design §11.4). Tunable constants live here only. ----
export const DOSE_LOW_RATIO = 0.5; // dose < 0.5x studied min -> info
export const DOSE_EXCEED_WARN_RATIO = 1.5; // dose > 1.5x studied max -> warning
export const DOSE_CRIT_RATIO = 2.5; // dose > 2.5x studied max -> critical
export const REDUNDANCY_WARN_COUNT = 3; // group size >= 3 -> warning, else info
export const COMPLEXITY_WARN = 12; // item count > 12 -> info

export interface EvalContext {
  stack: Stack;
  items: StackItem[];
  profile: UserProfile | null;
  labMarkers: LabMarker[];
  trends: TrendSignal[]; // lab-timeline v4 — per-biomarker trajectory (may be empty)
  library: EvidenceLibrary;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function gradeToEvidenceLevel(grade: EvidenceGrade | undefined): EvidenceGrade | "n/a" {
  return grade ?? "n/a";
}

/** Representative effect for an item: best for the stack intent, else highest-grade overall. */
function representativeEffect(
  item: StackItem,
  ctx: EvalContext,
): Effect | undefined {
  if (!item.supplementId) return undefined;
  const intent = ctx.stack.intent;
  if (intent !== "experimental") {
    const best = getBestEffectForOutcome(
      item.supplementId,
      intent as OutcomeCategory,
      ctx.library,
    );
    if (best) return best;
  }
  return getEffectsForSupplement(item.supplementId, ctx.library)[0];
}

function itemLabel(item: StackItem, ctx: EvalContext): string {
  if (item.supplementId) {
    const supp = getSupplementById(item.supplementId, ctx.library);
    if (supp) return supp.name;
  }
  return item.customName ?? "this item";
}

// ---- Rule 1: evidence-fit (Design §11.4) ----
export function ruleEvidenceFit(ctx: EvalContext): DraftFlag[] {
  if (ctx.stack.intent === "experimental") return [];
  const intent = ctx.stack.intent as OutcomeCategory;
  const flags: DraftFlag[] = [];

  for (const item of ctx.items) {
    if (!item.supplementId) continue;
    const best = getBestEffectForOutcome(item.supplementId, intent, ctx.library);
    if (best && (best.grade === "A" || best.grade === "B")) continue; // good fit, no flag
    const grade = best?.grade;
    if (grade === "C" || grade === undefined || grade === "D") {
      const copy = safetyCopy.evidenceLimited(itemLabel(item, ctx), intent);
      flags.push({
        stackItemId: item.id,
        severity: "info",
        category: "evidence-fit",
        ...copy,
        evidenceLevel: gradeToEvidenceLevel(grade),
      });
    }
  }
  return flags;
}

// ---- Rule 2: dose-fit (Design §11.4) ----
export function ruleDoseFit(ctx: EvalContext): DraftFlag[] {
  const flags: DraftFlag[] = [];

  for (const item of ctx.items) {
    if (!item.supplementId) continue;
    const eff = representativeEffect(item, ctx);
    const supp = getSupplementById(item.supplementId, ctx.library);
    const range = eff?.studiedDose ?? supp?.generalDose;
    if (!range) continue;
    if (norm(range.unit) !== norm(item.unit)) continue; // can't compare across units

    const label = itemLabel(item, ctx);
    const evidenceLevel = gradeToEvidenceLevel(eff?.grade);
    const overMax = item.dose / range.max;
    const underMin = item.dose / range.min;

    if (overMax > DOSE_CRIT_RATIO) {
      const copy = safetyCopy.doseCritical(label, item.dose, range.max, range.unit);
      flags.push({ stackItemId: item.id, severity: "critical", category: "dose-fit", ...copy, evidenceLevel });
    } else if (overMax > DOSE_EXCEED_WARN_RATIO) {
      const copy = safetyCopy.doseExceedsRange(label, item.dose, range.max, range.unit);
      flags.push({ stackItemId: item.id, severity: "warning", category: "dose-fit", ...copy, evidenceLevel });
    } else if (underMin < DOSE_LOW_RATIO) {
      const copy = safetyCopy.doseBelowRange(label, range.min, range.unit);
      flags.push({ stackItemId: item.id, severity: "info", category: "dose-fit", ...copy, evidenceLevel });
    }
  }
  return flags;
}

// ---- Rule 3: redundancy (Design §11.4) ----
export function ruleRedundancy(ctx: EvalContext): DraftFlag[] {
  // Group items by their representative effect's outcomeCategory.
  const groups = new Map<OutcomeCategory, { item: StackItem; effect: Effect }[]>();
  for (const item of ctx.items) {
    const eff = representativeEffect(item, ctx);
    if (!eff) continue;
    const arr = groups.get(eff.outcomeCategory) ?? [];
    arr.push({ item, effect: eff });
    groups.set(eff.outcomeCategory, arr);
  }

  const flags: DraftFlag[] = [];
  for (const [outcome, members] of groups) {
    if (members.length < 2) continue;
    // Require an overlapping mechanism tag across at least two members.
    const tagCount = new Map<string, number>();
    for (const m of members) {
      for (const tag of new Set(m.effect.mechanismTags)) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }
    const overlaps = [...tagCount.values()].some((c) => c >= 2);
    if (!overlaps) continue;

    const names = members.map((m) => itemLabel(m.item, ctx));
    const copy = safetyCopy.redundancy(names, outcome);
    flags.push({
      stackItemId: null,
      severity: members.length >= REDUNDANCY_WARN_COUNT ? "warning" : "info",
      category: "redundancy",
      ...copy,
      evidenceLevel: "n/a",
    });
  }
  return flags;
}

// ---- Rule 4: allergy-conflict (Design §11.4) ----
export function ruleAllergyConflict(ctx: EvalContext): DraftFlag[] {
  if (!ctx.profile || ctx.profile.allergies.length === 0) return [];
  const allergies = new Set(ctx.profile.allergies.map(norm));
  const meds = new Set(ctx.profile.medications.map(norm));
  const flags: DraftFlag[] = [];

  for (const item of ctx.items) {
    if (!item.supplementId) continue;
    const supp = getSupplementById(item.supplementId, ctx.library);
    if (!supp) continue;
    const hits = supp.allergenTags.filter((t) => allergies.has(norm(t)));
    if (hits.length === 0) continue;

    // Critical when the allergen is also a medication-class ingredient the user takes.
    const critical = hits.some((h) => meds.has(norm(h)));
    const copy = critical
      ? safetyCopy.allergyCritical(supp.name, hits)
      : safetyCopy.allergyConflict(supp.name, hits);
    flags.push({
      stackItemId: item.id,
      severity: critical ? "critical" : "warning",
      category: "allergy-conflict",
      ...copy,
      evidenceLevel: "n/a",
    });
  }
  return flags;
}

// ---- Rule 5: goal-alignment (Design §11.4) ----
export function ruleGoalAlignment(ctx: EvalContext): DraftFlag[] {
  if (!ctx.profile || ctx.profile.goals.length === 0) return [];
  const goals = new Set(ctx.profile.goals);
  const flags: DraftFlag[] = [];

  for (const item of ctx.items) {
    if (!item.supplementId) continue;
    const effects = getEffectsForSupplement(item.supplementId, ctx.library);
    if (effects.length === 0) continue;
    const aligned = effects.some((e) => goals.has(e.outcomeCategory));
    if (aligned) continue;
    const copy = safetyCopy.goalMisalignment(itemLabel(item, ctx));
    flags.push({
      stackItemId: item.id,
      severity: "info",
      category: "goal-alignment",
      ...copy,
      evidenceLevel: "n/a",
    });
  }
  return flags;
}

// ---- Rule 6: lab-relevance (Design §11.4) ----
// biomarker-intelligence v3: replaces the v1 naive string-match with the real
// pure biomarker engine (canonical-unit conversion + curated relevance rules).
export function ruleLabRelevance(ctx: EvalContext): DraftFlag[] {
  if (ctx.labMarkers.length === 0) return [];

  const supplementToItemId: Record<string, string> = {};
  for (const item of ctx.items) {
    if (item.supplementId && !(item.supplementId in supplementToItemId)) {
      supplementToItemId[item.supplementId] = item.id;
    }
  }

  const findings = assessLabMarkers({
    labMarkers: ctx.labMarkers,
    stackItems: ctx.items,
  });
  const flags = toLabFlags(findings, { supplementToItemId });

  // Curation honesty (Plan FR-9): a marker we can't recognize is NOT "fine" —
  // surface it as an info flag rather than silently skipping it.
  const seen = new Set<string>();
  for (const marker of ctx.labMarkers) {
    if (normalizeMarker(marker.marker) !== null) continue;
    const key = marker.marker.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    flags.push({
      stackItemId: null,
      severity: "info",
      category: "lab-relevance",
      ...safetyCopy.unrecognizedMarker(marker.marker),
      evidenceLevel: "n/a",
    });
  }

  return flags;
}

// ---- Rule 7: interactions (medication-interactions v2; Design §11.4) ----
// Replaces the v1 placeholder (MED_CAUTION_IDS + generic copy) with the real
// pure engine. Emits supplement↔drug (medication-caution) and supplement↔supplement
// (interaction-risk) flags, severity-graded via lib/interactions/to-flags.
export function ruleInteractions(ctx: EvalContext): DraftFlag[] {
  const medications = ctx.profile?.medications ?? [];

  // Resolve supplementId → stackItem id so flags can target the offending row.
  const supplementToItemId: Record<string, string> = {};
  for (const item of ctx.items) {
    if (item.supplementId && !(item.supplementId in supplementToItemId)) {
      supplementToItemId[item.supplementId] = item.id;
    }
  }

  const findings = findInteractions({ medications, stackItems: ctx.items });
  const flags = toInteractionFlags(findings, { supplementToItemId });

  // Curation honesty (Plan FR-10): a medication we can't recognize is NOT "safe" —
  // surface it as an info flag rather than failing silently.
  if (medications.length > 0) {
    const { unresolved } = normalizeMedications(medications);
    for (const name of unresolved) {
      flags.push({
        stackItemId: null,
        severity: "info",
        category: "medication-caution",
        ...safetyCopy.unrecognizedMedication(name),
        evidenceLevel: "n/a",
      });
    }
  }

  return flags;
}

// ---- Rule 9: lab-trend (lab-timeline v4; Design §2.1, §11.4) ----
// Supplement-anchored trajectory notes: for each stacked supplement, if a
// biomarker it's curated-relevant to is trending, describe the movement toward
// or away from range. Anchored to a relevance rule (never a standalone
// out-of-range insight) and routed through lib/safety (non-diagnostic).
export function ruleLabTrend(ctx: EvalContext): DraftFlag[] {
  if (ctx.trends.length === 0) return [];

  const trendByBiomarker = new Map<string, TrendSignal>(
    ctx.trends.map((t) => [t.biomarkerId, t]),
  );

  const flags: DraftFlag[] = [];
  const seen = new Set<string>(); // dedupe per (supplement, biomarker)

  for (const item of ctx.items) {
    if (!item.supplementId) continue;
    const supp = getSupplementById(item.supplementId, ctx.library);
    if (!supp) continue;

    for (const { rule } of biomarkersForSupplement(item.supplementId)) {
      // Deficiency-support rules give the clearest toward/away-from-range story;
      // caution rules are deferred (avoids canceling/ambiguous trajectory copy).
      if (rule.relation !== "support") continue;
      const trend = trendByBiomarker.get(rule.biomarkerId);
      if (!trend || trend.pctChange === null) continue;
      if (trend.direction !== "rising" && trend.direction !== "falling") continue;

      // "improving" = moving toward the healthy side. trigger 'low' means a low
      // value is the concern → rising is improving; trigger 'high' → falling is.
      const improving =
        rule.trigger === "low"
          ? trend.direction === "rising"
          : trend.direction === "falling";

      const key = `${item.supplementId}:${rule.biomarkerId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      flags.push({
        stackItemId: item.id,
        severity: "info",
        category: "lab-relevance",
        ...safetyCopy.biomarkerTrend(
          supp.name,
          trend.biomarkerName,
          improving ? "improving" : "worsening",
          trend.pctChange,
        ),
        evidenceLevel: gradeToEvidenceLevel(rule.evidenceGrade),
      });
    }
  }
  return flags;
}

// ---- Rule 8: complexity (Design §11.4) ----
export function ruleComplexity(ctx: EvalContext): DraftFlag[] {
  if (ctx.items.length <= COMPLEXITY_WARN) return [];
  const copy = safetyCopy.complexity(ctx.items.length);
  return [
    {
      stackItemId: null,
      severity: "info",
      category: "complexity",
      ...copy,
      evidenceLevel: "n/a",
    },
  ];
}

export const ALL_RULES: ((ctx: EvalContext) => DraftFlag[])[] = [
  ruleEvidenceFit,
  ruleDoseFit,
  ruleRedundancy,
  ruleAllergyConflict,
  ruleGoalAlignment,
  ruleLabRelevance,
  ruleLabTrend,
  ruleInteractions,
  ruleComplexity,
];
