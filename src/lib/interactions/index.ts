// Domain layer — PURE, deterministic interaction engine (Design §11.4).
// Plan SC: detect supplement↔drug + supplement↔supplement; same engine feeds
// Stack Evaluation, Protocol Builder, and Library. No DB, no side effects.
import { SEED_INTERACTIONS } from "@/data/seed-interactions";
import { SEED_FOOD_PAIRINGS } from "@/data/seed-food-pairings";
import type { StackItem } from "@/types/stack";
import type {
  InteractionFinding,
  InteractionRule,
  InteractionSeverity,
  NormalizationResult,
} from "@/types/interaction";
import { drugClassesOf, normalizeMedications } from "./normalize";

export { normalizeMedications } from "./normalize";
export type { InteractionFinding } from "@/types/interaction";

// food-pairings (v12): the engine's default rule set includes food pairings so
// downstream callers (Stack Evaluation, advisor) pick up food guidance with no
// changes. `interactionsForSupplement` keeps using SEED_INTERACTIONS only;
// food has its own selector (`foodPairingsForSupplement`).
// Design Ref: §4.3.
export const ALL_INTERACTION_RULES: InteractionRule[] = [
  ...SEED_INTERACTIONS,
  ...SEED_FOOD_PAIRINGS,
];

const SEVERITY_ORDER: Record<InteractionSeverity, number> = {
  serious: 0,
  warning: 1,
  caution: 2,
  info: 3,
};

export interface InteractionInput {
  medications: string[];
  stackItems: StackItem[];
}

function supplementIdsOf(stackItems: StackItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of stackItems) {
    if (item.supplementId) ids.add(item.supplementId);
  }
  return ids;
}

function toFinding(rule: InteractionRule, counterpart: string): InteractionFinding {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    severity: rule.severity,
    supplementId: rule.supplementId,
    counterpart,
    // supplement-food (v12): carry direction/food/timing through to surfaces.
    direction: rule.direction,
    food: rule.food,
    timing: rule.timing,
    mechanism: rule.mechanism,
    management: rule.management,
    evidenceGrade: rule.evidenceGrade,
  };
}

/**
 * Core entry point. Returns every interaction between the user's medications
 * and stack supplements, plus supplement↔supplement pairs within the stack.
 * Deterministic: identical input → identical (deep-equal) output.
 */
export function findInteractions(
  input: InteractionInput,
  rules: InteractionRule[] = ALL_INTERACTION_RULES,
): InteractionFinding[] {
  const norm: NormalizationResult = normalizeMedications(input.medications);
  const drugClasses = drugClassesOf(norm);
  const canonicals = new Set(norm.recognized.map((m) => m.canonical));
  const suppIds = supplementIdsOf(input.stackItems);

  const findings: InteractionFinding[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (rule.kind === "supplement-drug") {
      if (!suppIds.has(rule.supplementId)) continue;
      const classMatch = rule.drugClass !== undefined && drugClasses.has(rule.drugClass);
      const genericMatch =
        rule.drugGeneric !== undefined && canonicals.has(rule.drugGeneric);
      if (!classMatch && !genericMatch) continue;
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      findings.push(toFinding(rule, rule.drugGeneric ?? rule.drugClass ?? ""));
    } else if (rule.kind === "supplement-supplement") {
      if (
        !rule.otherSupplementId ||
        !suppIds.has(rule.supplementId) ||
        !suppIds.has(rule.otherSupplementId)
      ) {
        continue;
      }
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      findings.push(toFinding(rule, rule.otherSupplementId));
    } else {
      // supplement-food (v12): triggers whenever the supplement is in the stack;
      // does not depend on the user's medications. Counterpart is the food label.
      if (!rule.food || !suppIds.has(rule.supplementId)) continue;
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      findings.push(toFinding(rule, rule.food));
    }
  }

  return findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

/**
 * Library use: every rule involving a supplement (as primary or counterpart).
 * Pure, order-stable.
 */
export function interactionsForSupplement(
  supplementId: string,
  rules: InteractionRule[] = SEED_INTERACTIONS,
): InteractionRule[] {
  return rules.filter(
    (r) =>
      r.supplementId === supplementId || r.otherSupplementId === supplementId,
  );
}

/**
 * Library use (v12): every food-pairing rule for a supplement, synergy first
 * then avoid, otherwise input order. Pure, order-stable.
 * Design Ref: §4.1.
 */
export function foodPairingsForSupplement(
  supplementId: string,
  rules: InteractionRule[] = SEED_FOOD_PAIRINGS,
): InteractionRule[] {
  const rank = (r: InteractionRule) => (r.direction === "synergy" ? 0 : 1);
  return rules
    .filter(
      (r) => r.kind === "supplement-food" && r.supplementId === supplementId,
    )
    .sort((a, b) => rank(a) - rank(b));
}

/**
 * Protocol Builder helper (module-2): does this supplement interact with any of
 * the user's medications? Replaces the v1 hardcoded MED_CAUTION_IDS placeholder.
 */
export function hasMedicationInteraction(
  supplementId: string,
  medications: string[],
  rules: InteractionRule[] = SEED_INTERACTIONS,
): boolean {
  if (medications.length === 0) return false;
  const norm = normalizeMedications(medications);
  const drugClasses = drugClassesOf(norm);
  const canonicals = new Set(norm.recognized.map((m) => m.canonical));
  return rules.some(
    (r) =>
      r.kind === "supplement-drug" &&
      r.supplementId === supplementId &&
      ((r.drugClass !== undefined && drugClasses.has(r.drugClass)) ||
        (r.drugGeneric !== undefined && canonicals.has(r.drugGeneric))),
  );
}
