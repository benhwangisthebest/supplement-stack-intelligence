// Domain — daily-checkin (v10). PURE. Turns correlational outcome aggregates into a
// BOUNDED, MIN-SAMPLE-GATED feedback signal — the evidence-subordinate ranking nudge
// (Design §2.0 Option C). Plan SC4: clamped magnitude + refuse-when-insufficient, so
// noisy/thin self-reports can never move recommendations meaningfully, and can never
// override evidence grade (that guarantee is enforced by compareSuggestions in M2).
import type { OutcomeAggregate, FeedbackSignal } from "@/types/checkin";

/** Max absolute nudge. Same magnitude class as the v4 lab trendAdjustment (±0.2). */
export const FEEDBACK_CAP = 0.15;
/** Minimum evidence before a signal is emitted at all (both sides required). */
export const MIN_TAKEN_DAYS = 5;
export const MIN_NOTTAKEN_DAYS = 3;
/** A rating-point delta of this size maps to the full cap. */
const DELTA_AT_CAP = 1.5;

const clampCap = (n: number): number => Math.max(-FEEDBACK_CAP, Math.min(FEEDBACK_CAP, n));

/**
 * Derive bounded feedback signals. A pair is SUPPRESSED (no signal) unless it has
 * both enough taken-days and enough not-taken-days and a computable delta — this is
 * the anti-noise gate. The emitted `delta` scales the rating-point difference into
 * [-FEEDBACK_CAP, +FEEDBACK_CAP]. Deterministic.
 */
export function deriveFeedback(aggregates: OutcomeAggregate[]): FeedbackSignal[] {
  const signals: FeedbackSignal[] = [];

  for (const a of aggregates) {
    if (a.delta === null) continue; // need both sides
    if (a.takenDays < MIN_TAKEN_DAYS) continue;
    if (a.notTakenDays < MIN_NOTTAKEN_DAYS) continue;

    const delta = clampCap((a.delta / DELTA_AT_CAP) * FEEDBACK_CAP);
    if (delta === 0) continue; // no directional signal

    signals.push({
      supplementId: a.supplementId,
      outcome: a.outcome,
      delta,
      sampleDays: a.takenDays + a.notTakenDays,
    });
  }

  return signals;
}

/** Convenience lookup used by the protocol hook (M2): signal for (supplement, goal). */
export function feedbackFor(
  signals: FeedbackSignal[],
  supplementId: string,
  outcome: string,
): number {
  const hit = signals.find(
    (s) => s.supplementId === supplementId && s.outcome === outcome,
  );
  return hit?.delta ?? 0;
}
