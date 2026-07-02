// Plan SC6/SC10 — check-in copy must be correlational, never diagnostic/directive.
// Sweeps every string the check-in engine can emit through lib/safety's banned guard.
import { describe, expect, it } from "vitest";
import { checkinCopy, containsBannedLanguage } from "@/lib/safety";
import type { OutcomeAggregate } from "@/types/checkin";
import { deriveInsights } from "./insights";
import { MIN_NOTTAKEN_DAYS, MIN_TAKEN_DAYS } from "./feedback";

function collectCopy(): string[] {
  const out: string[] = [];

  // Static copy
  const insight = checkinCopy.outcomeInsight("Magnesium", "sleep", 4.2, 3.1);
  out.push(insight.text, insight.qualifier);
  out.push(checkinCopy.sideEffectDisclaimer, checkinCopy.feedbackNudgeNote);

  // Generated insight cards over seed supplements
  const aggs: OutcomeAggregate[] = [
    { supplementId: "magnesium", outcome: "sleep", takenAvg: 5, notTakenAvg: 3, delta: 2, takenDays: MIN_TAKEN_DAYS, notTakenDays: MIN_NOTTAKEN_DAYS },
    { supplementId: "creatine", outcome: "training", takenAvg: 4.5, notTakenAvg: 3.2, delta: 1.3, takenDays: MIN_TAKEN_DAYS, notTakenDays: MIN_NOTTAKEN_DAYS },
  ];
  for (const c of deriveInsights(aggs)) out.push(c.text, c.qualifier);

  return out.filter((s) => s.length > 0);
}

describe("check-in honesty sweep (Plan SC6)", () => {
  it("emits no banned/diagnostic language", () => {
    expect(collectCopy().filter(containsBannedLanguage)).toEqual([]);
  });

  it("frames outcome copy as correlational", () => {
    const insight = checkinCopy.outcomeInsight("Magnesium", "sleep", 4.2, 3.1);
    expect(insight.qualifier.toLowerCase()).toContain("correlational");
  });
});
