// Unit — the agent loop's v7 proposal-halt (Design §2.2; Plan SC-2/3/4).
import { describe, expect, it } from "vitest";
import { containsBannedLanguage } from "@/lib/safety";
import { runAdvisorTurn } from "./agent";
import { ScriptedAdapter, finalStep, makeContext, toolStep } from "./mock-adapter";

const BUDGET = 100_000;

describe("runAdvisorTurn — proposal halt", () => {
  it("halts and returns a 'proposed' result when a proposal tool grounds", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("propose_add_item", { supplementId: "magnesium", dose: 300, unit: "mg", timing: "bedtime" }),
      finalStep("(the model should never reach here)"),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "add magnesium", budgetRemaining: BUDGET });

    expect(r.status).toBe("proposed");
    expect(r.proposal?.type).toBe("add_item");
    expect(r.proposal?.payload).toMatchObject({ supplementId: "magnesium" });
    expect(Array.isArray(r.newSafetyFlags)).toBe(true);
    expect(r.toolsUsed).toContain("propose_add_item");
    expect(adapter.calls).toBe(1); // halted after the proposal; did NOT loop on
  });

  it("the proposal summary carries no banned/diagnostic language (honesty sweep)", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("propose_remove_item", { stackItemId: "si-1" }),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "remove fish oil", budgetRemaining: BUDGET });
    expect(r.status).toBe("proposed");
    expect(containsBannedLanguage(r.answer)).toBe(false);
    expect(r.answer).toMatch(/nothing has been saved yet/i);
  });

  it("an UNGROUNDED proposal does not halt — it falls through to honest refusal (SC-3)", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("propose_add_item", { supplementId: "unobtanium", dose: 1, unit: "mg" }),
      finalStep("I cannot do that."),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "add unobtanium", budgetRemaining: BUDGET });
    expect(r.status).toBe("refused-no-data");
    expect(r.proposal).toBeUndefined();
  });

  it("read tools still work unchanged alongside the action tools", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("warfarin and fish oil may interact."),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "is my stack safe?", budgetRemaining: BUDGET });
    expect(r.status).toBe("answered");
    expect(r.proposal).toBeUndefined();
  });
});
