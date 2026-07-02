// Domain — daily-checkin (v10). PURE. Correlational outcome aggregation: for each
// (supplement × goal), the mean goal rating on days the item was taken vs not.
// Design Ref: §3.1. Plan SC3. This is DESCRIPTIVE correlation only — never a
// causal/efficacy claim (the copy layer enforces the framing).
import type { OutcomeCategory } from "@/types";
import type { DailyCheckin, OutcomeAggregate } from "@/types/checkin";

const mean = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Per (candidate supplement × rated goal): split the days that carry a rating for
 * that goal into taken-days vs not-taken-days and average each side. Candidates are
 * the supplements the user actually logs taking. Pure over check-in rows alone.
 */
export function computeOutcomeAggregates(checkins: DailyCheckin[]): OutcomeAggregate[] {
  const candidates = new Set<string>();
  for (const c of checkins) for (const s of c.taken) candidates.add(s);

  const outcomes = new Set<OutcomeCategory>();
  for (const c of checkins) {
    for (const key of Object.keys(c.ratings)) outcomes.add(key as OutcomeCategory);
  }

  const aggregates: OutcomeAggregate[] = [];

  for (const supplementId of [...candidates].sort()) {
    for (const outcome of [...outcomes].sort()) {
      const takenRatings: number[] = [];
      const notTakenRatings: number[] = [];

      for (const c of checkins) {
        const r = c.ratings[outcome];
        if (r === undefined) continue; // only days the user rated this goal
        if (c.taken.includes(supplementId)) takenRatings.push(r);
        else notTakenRatings.push(r);
      }

      const takenAvg = mean(takenRatings);
      const notTakenAvg = mean(notTakenRatings);
      const delta =
        takenAvg !== null && notTakenAvg !== null ? takenAvg - notTakenAvg : null;

      // Skip pairs with no taken-day evidence at all (nothing to say).
      if (takenRatings.length === 0) continue;

      aggregates.push({
        supplementId,
        outcome,
        takenAvg,
        notTakenAvg,
        delta,
        takenDays: takenRatings.length,
        notTakenDays: notTakenRatings.length,
      });
    }
  }

  return aggregates;
}
