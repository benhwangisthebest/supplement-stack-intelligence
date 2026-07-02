// Domain — daily-checkin (v10). PURE. Consistency metrics over a check-in history.
// Design Ref: §3.1, §5.1. Plan SC2: deterministic — identical rows ⇒ identical
// metrics. The premium gamification signal (heatmap %/streak), NOT points/badges.
import type { CheckinConsistency, DailyCheckin } from "@/types/checkin";

export const CONSISTENCY_WINDOW = 30; // days

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Days between two YYYY-MM-DD dates (b − a), calendar-based. */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Consistency over the trailing `windowDays`. `today` anchors the window and the
 * streak (defaults to the latest check-in date). Streak = consecutive days ending
 * at `today` (or the day before, so a not-yet-checked today doesn't break it).
 */
export function computeConsistency(
  checkins: DailyCheckin[],
  windowDays: number = CONSISTENCY_WINDOW,
  today?: string,
): CheckinConsistency {
  if (checkins.length === 0) {
    return { windowDays, checkinRate: 0, currentStreak: 0, adherenceRate: 0 };
  }

  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const dates = [...byDate.keys()].sort(); // ascending
  const anchor = today ?? dates[dates.length - 1];

  // check-in rate within the window
  const inWindow = dates.filter((d) => {
    const age = daysBetween(d, anchor);
    return age >= 0 && age < windowDays;
  });
  const checkinRate = clamp01(inWindow.length / windowDays);

  // adherence rate: taken / scheduled across the in-window check-ins
  let taken = 0;
  let scheduled = 0;
  for (const d of inWindow) {
    const c = byDate.get(d)!;
    taken += c.taken.length;
    scheduled += c.scheduled.length;
  }
  const adherenceRate = scheduled === 0 ? 0 : clamp01(taken / scheduled);

  // current streak: consecutive days ending at anchor, or anchor−1 if today unlogged
  let streak = 0;
  let cursor = byDate.has(anchor) ? anchor : shiftDate(anchor, -1);
  while (byDate.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return { windowDays, checkinRate, currentStreak: streak, adherenceRate };
}

/** Add `delta` days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function shiftDate(date: string, delta: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
