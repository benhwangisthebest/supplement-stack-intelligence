import { describe, expect, it } from "vitest";
import type { OutcomeAggregate } from "@/types/checkin";
import {
  deriveFeedback,
  feedbackFor,
  FEEDBACK_CAP,
  MIN_NOTTAKEN_DAYS,
  MIN_TAKEN_DAYS,
} from "./feedback";

function agg(partial: Partial<OutcomeAggregate>): OutcomeAggregate {
  return {
    supplementId: "magnesium",
    outcome: "sleep",
    takenAvg: 4,
    notTakenAvg: 3,
    delta: 1,
    takenDays: MIN_TAKEN_DAYS,
    notTakenDays: MIN_NOTTAKEN_DAYS,
    ...partial,
  };
}

describe("deriveFeedback — bounded + gated (Plan SC4)", () => {
  it("emits a bounded signal for a sufficiently-sampled pair", () => {
    const [s] = deriveFeedback([agg({ delta: 1 })]);
    expect(s.supplementId).toBe("magnesium");
    expect(Math.abs(s.delta)).toBeLessThanOrEqual(FEEDBACK_CAP);
    expect(s.delta).toBeGreaterThan(0);
  });

  it("clamps a large delta to ±FEEDBACK_CAP", () => {
    const [pos] = deriveFeedback([agg({ delta: 4 })]);
    const [neg] = deriveFeedback([agg({ delta: -4 })]);
    expect(pos.delta).toBeCloseTo(FEEDBACK_CAP, 5);
    expect(neg.delta).toBeCloseTo(-FEEDBACK_CAP, 5);
  });

  it("suppresses signals below the minimum sample size", () => {
    expect(deriveFeedback([agg({ takenDays: MIN_TAKEN_DAYS - 1 })])).toEqual([]);
    expect(deriveFeedback([agg({ notTakenDays: MIN_NOTTAKEN_DAYS - 1 })])).toEqual([]);
  });

  it("suppresses pairs with a null delta (one-sided data)", () => {
    expect(deriveFeedback([agg({ delta: null, notTakenAvg: null })])).toEqual([]);
  });

  it("is deterministic", () => {
    const a = [agg({ delta: 0.9 })];
    expect(deriveFeedback(a)).toEqual(deriveFeedback(a));
  });
});

describe("feedbackFor", () => {
  it("returns the matching delta or 0", () => {
    const signals = deriveFeedback([agg({ delta: 1 })]);
    expect(feedbackFor(signals, "magnesium", "sleep")).toBeGreaterThan(0);
    expect(feedbackFor(signals, "creatine", "sleep")).toBe(0);
  });
});
