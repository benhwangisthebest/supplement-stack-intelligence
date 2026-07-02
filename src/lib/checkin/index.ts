// Domain — daily-checkin (v10). PURE barrel. Orchestrates the check-in engine:
// consistency + correlational aggregates + bounded feedback + insight cards.
// Design Ref: §2.1. Plan SC2/3/4/6. No I/O — the repo (infra) supplies rows.
import { computeConsistency } from "./consistency";
import { computeOutcomeAggregates } from "./outcomes";
import { deriveFeedback } from "./feedback";
import { deriveInsights } from "./insights";
import type {
  CheckinConsistency,
  CheckinInsight,
  DailyCheckin,
  FeedbackSignal,
  OutcomeAggregate,
} from "@/types/checkin";

export interface CheckinAnalysis {
  consistency: CheckinConsistency;
  aggregates: OutcomeAggregate[];
  feedback: FeedbackSignal[];
  insights: CheckinInsight[];
}

/** One-shot derivation of everything the surfaces + protocol hook need. */
export function analyzeCheckins(checkins: DailyCheckin[]): CheckinAnalysis {
  const aggregates = computeOutcomeAggregates(checkins);
  return {
    consistency: computeConsistency(checkins),
    aggregates,
    feedback: deriveFeedback(aggregates),
    insights: deriveInsights(aggregates),
  };
}

export { computeConsistency, CONSISTENCY_WINDOW, shiftDate } from "./consistency";
export { computeOutcomeAggregates } from "./outcomes";
export {
  deriveFeedback,
  feedbackFor,
  FEEDBACK_CAP,
  MIN_TAKEN_DAYS,
  MIN_NOTTAKEN_DAYS,
} from "./feedback";
export { deriveInsights, MIN_VISIBLE_DELTA } from "./insights";
