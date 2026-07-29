// Domain — daily-checkin (v10). PURE types. Design Ref: §3.1. A check-in is one
// idempotent row per (userId, date): adherence + goal ratings (+ optional note /
// side-effect). The engine derives consistency, correlational outcome aggregates,
// and a BOUNDED, evidence-subordinate feedback signal from these rows alone.
import type { OutcomeCategory } from "./primitives";

export type GoalRating = 1 | 2 | 3 | 4 | 5;

/** One day's check-in. */
export interface DailyCheckin {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD (local calendar day)
  ratings: Partial<Record<OutcomeCategory, GoalRating>>;
  taken: string[]; // supplementIds taken that day
  scheduled: string[]; // supplementIds in the active stack that day (adherence denominator)
  note: string | null; // optional free-text (display-only)
  sideEffect: string | null; // optional side-effect flag (display-only)
  createdAt: string;
  updatedAt: string;
}

/** What a client submits to upsert today's check-in (validated in M2). */
export interface CheckinInput {
  date: string;
  ratings: Partial<Record<OutcomeCategory, GoalRating>>;
  taken: string[];
  scheduled: string[];
  note?: string | null;
  sideEffect?: string | null;
}

export interface CheckinConsistency {
  windowDays: number;
  checkinRate: number; // [0,1] days checked-in / window
  currentStreak: number; // consecutive days up to the latest check-in
  adherenceRate: number; // [0,1] taken / scheduled across the window
}

/** Correlational aggregate for one (supplement × goal). */
export interface OutcomeAggregate {
  supplementId: string;
  outcome: OutcomeCategory;
  takenAvg: number | null; // mean goal rating on days the item was taken
  notTakenAvg: number | null; // mean goal rating on days it was NOT taken
  delta: number | null; // takenAvg − notTakenAvg (null if either side empty)
  takenDays: number;
  notTakenDays: number;
}

/** Bounded, evidence-subordinate ranking nudge (Design §2.0 Option C). */
export interface FeedbackSignal {
  supplementId: string;
  outcome: OutcomeCategory;
  delta: number; // clamped to [-FEEDBACK_CAP, +FEEDBACK_CAP]
  sampleDays: number;
}

/** Non-diagnostic, correlational insight card. */
export interface CheckinInsight {
  supplementId: string;
  outcome: OutcomeCategory;
  text: string; // "You rated sleep 4.2 on days you took magnesium vs 3.1 otherwise."
  qualifier: string; // "Correlational, based on N days — not a measure of effectiveness."
}
