import { describe, expect, it } from "vitest";
import type { DailyCheckin, GoalRating } from "@/types/checkin";
import type { OutcomeCategory } from "@/types";
import { computeOutcomeAggregates } from "./outcomes";

let n = 0;
function checkin(
  taken: string[],
  ratings: Partial<Record<OutcomeCategory, GoalRating>>,
): DailyCheckin {
  n += 1;
  const date = `2026-06-${String(n).padStart(2, "0")}`;
  return { id: date, userId: "u", date, ratings, taken, scheduled: taken, note: null, sideEffect: null, createdAt: date, updatedAt: date };
}

describe("computeOutcomeAggregates", () => {
  it("splits ratings into taken vs not-taken days and computes the delta", () => {
    const checkins = [
      checkin(["magnesium"], { sleep: 4 }),
      checkin(["magnesium"], { sleep: 5 }),
      checkin([], { sleep: 3 }),
      checkin([], { sleep: 3 }),
    ];
    const aggs = computeOutcomeAggregates(checkins);
    const mag = aggs.find((a) => a.supplementId === "magnesium" && a.outcome === "sleep")!;
    expect(mag.takenAvg).toBeCloseTo(4.5, 5);
    expect(mag.notTakenAvg).toBeCloseTo(3, 5);
    expect(mag.delta).toBeCloseTo(1.5, 5);
    expect(mag.takenDays).toBe(2);
    expect(mag.notTakenDays).toBe(2);
  });

  it("yields a null delta when there are no not-taken days", () => {
    const aggs = computeOutcomeAggregates([
      checkin(["creatine"], { training: 4 }),
      checkin(["creatine"], { training: 5 }),
    ]);
    const c = aggs.find((a) => a.supplementId === "creatine")!;
    expect(c.notTakenAvg).toBeNull();
    expect(c.delta).toBeNull();
  });

  it("ignores days without a rating for the goal", () => {
    const aggs = computeOutcomeAggregates([
      checkin(["magnesium"], { sleep: 5 }),
      checkin(["magnesium"], {}), // no sleep rating → excluded
    ]);
    const mag = aggs.find((a) => a.outcome === "sleep")!;
    expect(mag.takenDays).toBe(1);
  });

  it("emits nothing for a supplement never logged as taken", () => {
    const aggs = computeOutcomeAggregates([checkin([], { sleep: 3 })]);
    expect(aggs).toEqual([]);
  });
});
