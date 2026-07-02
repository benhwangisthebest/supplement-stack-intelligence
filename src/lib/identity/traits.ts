// Domain — identity-cards (v9). PURE. Derives the five-axis TraitVector from an
// IdentityContext. Design Ref: §3.2 (trait derivation rules). Reuses lib/evidence
// read-only (getBestEffectForOutcome / effectComposite) — no new business logic.
// Plan SC: deterministic — identical context ⇒ identical vector (SC1).
import { getBestEffectForOutcome, effectComposite } from "@/lib/evidence";
import { OUTCOME_CATEGORIES } from "@/types";
import type { OutcomeCategory } from "@/types";
import type {
  IdentityContext,
  IdentityStack,
  IdentityTrait,
  TraitAxis,
  TraitVector,
} from "@/types/identity";

/** Number of core profile fields dataDepth counts. Shared with the loader (M2). */
export const PROFILE_FIELD_COUNT = 6;

/** Grade → evidence score. Mirrors lib/evidence grade ordering (A strongest). */
const GRADE_SCORE: Record<"A" | "B" | "C" | "D", number> = {
  A: 1,
  B: 0.66,
  C: 0.33,
  D: 0,
};

export const TRAIT_LABELS: Record<TraitAxis, string> = {
  evidenceRigor: "Evidence Rigor",
  riskAppetite: "Risk Appetite",
  breadth: "Breadth",
  foundationalFocus: "Foundational Focus",
  dataDepth: "Data Depth",
};

const FOUNDATIONAL_OUTCOMES: ReadonlySet<OutcomeCategory> = new Set([
  "foundational",
  "longevity",
  "deficiency",
]);

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** All items across all stacks, paired with their owning stack (for intent). */
function allItems(ctx: IdentityContext): { supplementId: string | null; stack: IdentityStack }[] {
  return ctx.stacks.flatMap((stack) =>
    stack.itemSupplementIds.map((supplementId) => ({ supplementId, stack })),
  );
}

/**
 * Evidence score for one item ∈ [0,1]. A graded item is scored by its best effect
 * for its stack's intent, finely refined by the v5 composite. A custom item, an
 * experimental-intent item, or one with no graded effect for its goal counts as
 * low-evidence (0) — Design §3.2.
 */
function itemEvidenceScore(supplementId: string | null, intent: IdentityStack["intent"]): number {
  if (supplementId === null || intent === "experimental") return 0;
  const best = getBestEffectForOutcome(supplementId, intent);
  if (!best) return 0;
  const base = GRADE_SCORE[best.grade];
  const composite = effectComposite(best); // [0,1] | null
  return composite === null ? base : clamp01(0.85 * base + 0.15 * composite);
}

/** Distinct outcome domains the user touches (stack intents ∪ profile goals). */
function distinctDomains(ctx: IdentityContext): Set<OutcomeCategory> {
  const set = new Set<OutcomeCategory>();
  for (const g of ctx.profile?.goals ?? []) set.add(g);
  for (const s of ctx.stacks) if (s.intent !== "experimental") set.add(s.intent);
  return set;
}

function riskToleranceSignal(rt: string | null): number {
  switch (rt) {
    case "low":
      return 0;
    case "high":
      return 1;
    case "moderate":
      return 0.5;
    default:
      return 0.5; // unknown → neutral
  }
}

/** The pure five-axis derivation used by the classifier (Design §3.2). */
export function computeTraitVector(ctx: IdentityContext): TraitVector {
  const items = allItems(ctx);
  const itemCount = items.length;

  // evidenceRigor — mean per-item evidence score.
  const rigor =
    itemCount === 0
      ? 0
      : items.reduce((sum, it) => sum + itemEvidenceScore(it.supplementId, it.stack.intent), 0) /
        itemCount;

  // riskAppetite — low-evidence share + experimental-intent + risk tolerance.
  const lowEvidenceShare =
    itemCount === 0
      ? 0
      : items.filter((it) => itemEvidenceScore(it.supplementId, it.stack.intent) < 0.34).length /
        itemCount;
  const anyExperimental = ctx.stacks.some((s) => s.intent === "experimental") ? 1 : 0;
  const rtSignal = riskToleranceSignal(ctx.profile?.riskTolerance ?? null);
  const risk = clamp01(0.5 * lowEvidenceShare + 0.2 * anyExperimental + 0.3 * rtSignal);

  // breadth — distinct outcome domains over the full outcome space.
  const breadth = clamp01(distinctDomains(ctx).size / OUTCOME_CATEGORIES.length);

  // foundationalFocus — share of items that are foundational by intent or outcome.
  const foundationalItems =
    itemCount === 0
      ? 0
      : items.filter((it) => {
          if (it.stack.intent !== "experimental" && FOUNDATIONAL_OUTCOMES.has(it.stack.intent)) {
            return true;
          }
          if (it.supplementId && it.stack.intent !== "experimental") {
            const best = getBestEffectForOutcome(it.supplementId, it.stack.intent);
            if (best && FOUNDATIONAL_OUTCOMES.has(best.outcomeCategory)) return true;
          }
          return false;
        }).length / itemCount;

  // dataDepth — weighted completeness; also the primary confidence input (M confidence.ts).
  const profileCompleteness = ctx.profile
    ? clamp01(ctx.profile.filledFieldCount / PROFILE_FIELD_COUNT)
    : 0;
  const stackSignal = clamp01(ctx.stacks.length / 2);
  const itemSignal = clamp01(itemCount / 6);
  const labSignal = ctx.hasLabs ? 1 : 0;
  // daily-checkin v10: consistency is strong invested signal. Additive + bounded —
  // absent (undefined ⇒ 0) leaves the v9 value unchanged (backward-compatible).
  const checkinSignal = clamp01(ctx.checkinConsistency ?? 0);
  const dataDepth = clamp01(
    0.35 * profileCompleteness +
      0.2 * stackSignal +
      0.2 * itemSignal +
      0.1 * labSignal +
      0.15 * checkinSignal,
  );

  return {
    evidenceRigor: clamp01(rigor),
    riskAppetite: risk,
    breadth,
    foundationalFocus: clamp01(foundationalItems),
    dataDepth,
  };
}

/** Non-diagnostic, human-readable derivation lines for the card (Design §5.1). */
export function describeTraits(ctx: IdentityContext, v: TraitVector): IdentityTrait[] {
  const items = allItems(ctx);
  const itemCount = items.length;
  const graded = items.filter(
    (it) => itemEvidenceScore(it.supplementId, it.stack.intent) >= 0.66,
  ).length;
  const domains = distinctDomains(ctx).size;

  const derivation: Record<TraitAxis, string> = {
    evidenceRigor:
      itemCount === 0
        ? "No stack items yet to assess."
        : `${graded}/${itemCount} items map to B-grade or stronger evidence for their goal.`,
    riskAppetite:
      ctx.profile?.riskTolerance
        ? `Reflects a ${ctx.profile.riskTolerance} stated risk tolerance and your mix of experimental items.`
        : "Reflects your mix of well-supported vs experimental items.",
    breadth: `Spans ${domains} distinct outcome ${domains === 1 ? "area" : "areas"} across goals and stacks.`,
    foundationalFocus:
      itemCount === 0
        ? "No items yet to weigh foundational vs targeted."
        : "Share of items oriented to foundational, longevity, or deficiency goals.",
    dataDepth: `Based on profile completeness, ${ctx.stacks.length} stack(s), ${itemCount} item(s)${ctx.hasLabs ? ", and lab data" : ""}.`,
  };

  return (Object.keys(TRAIT_LABELS) as TraitAxis[]).map((axis) => ({
    axis,
    label: TRAIT_LABELS[axis],
    value: v[axis],
    derivation: derivation[axis],
  }));
}
