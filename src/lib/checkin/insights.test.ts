import { describe, expect, it } from "vitest";
import type { OutcomeAggregate } from "@/types/checkin";
import { deriveInsights, MIN_VISIBLE_DELTA } from "./insights";
import { MIN_NOTTAKEN_DAYS, MIN_TAKEN_DAYS } from "./feedback";

function agg(partial: Partial<OutcomeAggregate>): OutcomeAggregate {
  return {
    supplementId: "magnesium", // must resolve in the seed library
    outcome: "sleep",
    takenAvg: 5,
    notTakenAvg: 3,
    delta: 2,
    takenDays: MIN_TAKEN_DAYS,
    notTakenDays: MIN_NOTTAKEN_DAYS,
    ...partial,
  };
}

describe("deriveInsights", () => {
  it("produces a correlational card with a qualifier for a strong, well-sampled pair", () => {
    const [card] = deriveInsights([agg({})]);
    expect(card.supplementId).toBe("magnesium");
    expect(card.text.toLowerCase()).toContain("magnesium");
    expect(card.qualifier.toLowerCase()).toContain("correlational");
  });

  it("suppresses cards below the minimum visible delta", () => {
    expect(deriveInsights([agg({ delta: MIN_VISIBLE_DELTA - 0.05, takenAvg: 3.1, notTakenAvg: 3 })])).toEqual([]);
  });

  it("suppresses cards below the minimum sample", () => {
    expect(deriveInsights([agg({ takenDays: MIN_TAKEN_DAYS - 1 })])).toEqual([]);
  });

  it("drops unknown supplements (no dead card)", () => {
    expect(deriveInsights([agg({ supplementId: "does-not-exist" })])).toEqual([]);
  });

  it("orders by absolute delta, strongest first", () => {
    const cards = deriveInsights([
      agg({ supplementId: "magnesium", delta: 0.5, takenAvg: 3.5, notTakenAvg: 3 }),
      agg({ supplementId: "creatine", outcome: "training", delta: 2, takenAvg: 5, notTakenAvg: 3 }),
    ]);
    expect(cards[0].supplementId).toBe("creatine");
  });
});
