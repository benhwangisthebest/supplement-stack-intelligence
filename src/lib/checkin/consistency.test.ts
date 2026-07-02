import { describe, expect, it } from "vitest";
import type { DailyCheckin, GoalRating } from "@/types/checkin";
import type { OutcomeCategory } from "@/types";
import { computeConsistency, shiftDate } from "./consistency";

function checkin(
  date: string,
  taken: string[],
  scheduled: string[] = taken,
  ratings: Partial<Record<OutcomeCategory, GoalRating>> = {},
): DailyCheckin {
  return {
    id: date,
    userId: "u",
    date,
    ratings,
    taken,
    scheduled,
    note: null,
    sideEffect: null,
    createdAt: date,
    updatedAt: date,
  };
}

const BASE = "2026-07-02";
const day = (offset: number) => shiftDate(BASE, offset);

describe("computeConsistency", () => {
  it("returns zeros for an empty history", () => {
    expect(computeConsistency([])).toEqual({
      windowDays: 30,
      checkinRate: 0,
      currentStreak: 0,
      adherenceRate: 0,
    });
  });

  it("counts a consecutive streak ending at the latest check-in", () => {
    const c = [checkin(day(-2), ["a"]), checkin(day(-1), ["a"]), checkin(day(0), ["a"])];
    const res = computeConsistency(c, 30, BASE);
    expect(res.currentStreak).toBe(3);
  });

  it("breaks the streak on a gap", () => {
    const c = [checkin(day(-3), ["a"]), checkin(day(-1), ["a"]), checkin(day(0), ["a"])];
    expect(computeConsistency(c, 30, BASE).currentStreak).toBe(2);
  });

  it("computes checkinRate as days / window", () => {
    const c = [checkin(day(0), ["a"]), checkin(day(-1), ["a"])];
    expect(computeConsistency(c, 10, BASE).checkinRate).toBeCloseTo(0.2, 5);
  });

  it("computes adherenceRate as taken / scheduled across the window", () => {
    const c = [checkin(day(0), ["a"], ["a", "b"]), checkin(day(-1), ["a", "b"], ["a", "b"])];
    // taken 1+2=3, scheduled 2+2=4
    expect(computeConsistency(c, 30, BASE).adherenceRate).toBeCloseTo(0.75, 5);
  });

  it("is deterministic", () => {
    const c = [checkin(day(0), ["a"]), checkin(day(-1), ["a"])];
    expect(computeConsistency(c, 30, BASE)).toEqual(computeConsistency(c, 30, BASE));
  });
});
