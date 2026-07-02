// Domain — identity-cards (v9). PURE. Maps signal richness (dataDepth + context)
// to a ConfidenceLevel and actionable "sharpen" suggestions. Design Ref: §3.3,
// §5.1. Plan SC5: the anti-over-claim guard — thin data yields `emerging`, never
// a confident-but-hollow archetype. Copy is non-diagnostic (honesty.test.ts).
import type { ConfidenceLevel, IdentityContext } from "@/types/identity";

/** dataDepth below this ⇒ emerging (classifier forced to `emerging`). */
export const EMERGING_DATA_DEPTH = 0.25;
/** dataDepth below this (but ≥ emerging) ⇒ developing. */
export const DEVELOPING_DATA_DEPTH = 0.6;

export function confidenceLevel(dataDepth: number): ConfidenceLevel {
  if (dataDepth < EMERGING_DATA_DEPTH) return "emerging";
  if (dataDepth < DEVELOPING_DATA_DEPTH) return "developing";
  return "established";
}

const totalItems = (ctx: IdentityContext): number =>
  ctx.stacks.reduce((n, s) => n + s.itemSupplementIds.length, 0);

/**
 * Ordered, non-diagnostic suggestions to enrich the card. Only surfaces the gaps
 * that actually apply, so the checklist stays honest and actionable (Design §5.1).
 */
export function sharpenSuggestions(ctx: IdentityContext): string[] {
  const tips: string[] = [];
  if (!ctx.profile || (ctx.profile.goals?.length ?? 0) === 0) {
    tips.push("Add your health goals so your archetype reflects what you're aiming for.");
  }
  if (!ctx.profile?.riskTolerance) {
    tips.push("Set your risk tolerance to refine your Risk Appetite.");
  }
  if (ctx.stacks.length === 0) {
    tips.push("Build a stack to reveal how you actually supplement.");
  } else if (totalItems(ctx) < 3) {
    tips.push("Add a few more items to your stacks to sharpen the read.");
  }
  if (!ctx.hasLabs) {
    tips.push("Add lab markers to sharpen your card.");
  }
  return tips;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  sharpen: string[];
}

export function deriveConfidence(ctx: IdentityContext, dataDepth: number): ConfidenceResult {
  return { level: confidenceLevel(dataDepth), sharpen: sharpenSuggestions(ctx) };
}
