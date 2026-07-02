// Domain — daily-checkin (v10). PURE. Turns outcome aggregates into non-diagnostic,
// correlational insight cards that explain WHY a suggestion was nudged. Design Ref:
// §5.1. Plan SC6. Gated on the same sample floor as the feedback signal + a minimum
// visible delta, so cards never surface noise. All copy via lib/safety.
import { getSupplementById } from "@/lib/evidence";
import { checkinCopy } from "@/lib/safety";
import { MIN_NOTTAKEN_DAYS, MIN_TAKEN_DAYS } from "./feedback";
import type { CheckinInsight, OutcomeAggregate } from "@/types/checkin";

/** Minimum rating-point difference before a card is worth showing. */
export const MIN_VISIBLE_DELTA = 0.3;
/** Cap on cards surfaced at once (Design §5.1). */
const MAX_INSIGHTS = 4;

export function deriveInsights(aggregates: OutcomeAggregate[]): CheckinInsight[] {
  const cards: { rank: number; card: CheckinInsight }[] = [];

  for (const a of aggregates) {
    if (a.delta === null || a.takenAvg === null || a.notTakenAvg === null) continue;
    if (a.takenDays < MIN_TAKEN_DAYS || a.notTakenDays < MIN_NOTTAKEN_DAYS) continue;
    if (Math.abs(a.delta) < MIN_VISIBLE_DELTA) continue;

    const supp = getSupplementById(a.supplementId);
    if (!supp) continue;

    const { text, qualifier } = checkinCopy.outcomeInsight(
      supp.name,
      a.outcome,
      a.takenAvg,
      a.notTakenAvg,
    );
    cards.push({
      rank: Math.abs(a.delta),
      card: { supplementId: a.supplementId, outcome: a.outcome, text, qualifier },
    });
  }

  return cards
    .sort((x, y) => y.rank - x.rank)
    .slice(0, MAX_INSIGHTS)
    .map((c) => c.card);
}
