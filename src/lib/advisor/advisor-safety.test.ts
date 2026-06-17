// The honesty sweep (Design §8.2-6, Plan SC-4). Drives the agent with a mock
// adapter that TRIES to emit banned/diagnostic language and ungrounded claims,
// and asserts the advisor never lets them through. This is the load-bearing
// "cannot fabricate / cannot diagnose" guarantee — mirrors the v2/v5 sweeps.
import { describe, expect, it } from "vitest";
import { BANNED_PHRASES, containsBannedLanguage } from "@/lib/safety";
import { runAdvisorTurn } from "./agent";
import { REFUSAL_NO_DATA } from "./prompt";
import {
  ScriptedAdapter,
  finalStep,
  makeContext,
  toolStep,
} from "./mock-adapter";

const ctx = makeContext();

describe("honesty sweep — banned language never reaches output", () => {
  it.each(BANNED_PHRASES)(
    "blocks a grounded answer that tries to say %s",
    async (phrase) => {
      // A real tool produced grounding, but the model's prose is non-compliant.
      const adapter = new ScriptedAdapter([
        toolStep("checkInteractions"),
        finalStep(`Based on your labs, ${phrase} — it's the obvious move.`),
      ]);
      const r = await runAdvisorTurn({
        adapter,
        ctx,
        userMessage: "what should I do?",
        budgetRemaining: 10_000,
      });
      // It stays grounded (status answered) but the banned phrasing is stripped:
      expect(r.status).toBe("answered");
      expect(containsBannedLanguage(r.answer)).toBe(false);
      // and the fallback is still backed by real citations.
      expect(r.citations.length).toBeGreaterThan(0);
    },
  );
});

describe("honesty sweep — no fabrication without grounding", () => {
  it("never emits an ungrounded confident claim", async () => {
    const adapter = new ScriptedAdapter([
      finalStep("Magnesium will cure your insomnia and you should take 1g nightly."),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "does magnesium fix my sleep?",
      budgetRemaining: 10_000,
    });
    // No tool was called → no grounding → fixed refusal, NOT the model's claim.
    expect(r.status).toBe("refused-no-data");
    expect(r.answer).toBe(REFUSAL_NO_DATA);
    expect(containsBannedLanguage(r.answer)).toBe(false);
    expect(r.answer).not.toContain("cure");
    expect(r.citations).toEqual([]);
  });

  it("a clean, grounded answer passes through unchanged", async () => {
    const clean =
      "Your fish oil may interact with warfarin; the dataset is limited, so review it with a clinician or pharmacist.";
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep(clean),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "interactions?",
      budgetRemaining: 10_000,
    });
    expect(r.status).toBe("answered");
    expect(r.answer).toBe(clean); // not rewritten — it was already safe + grounded
  });

  it("the refusal copy itself is non-diagnostic", () => {
    expect(containsBannedLanguage(REFUSAL_NO_DATA)).toBe(false);
  });
});
