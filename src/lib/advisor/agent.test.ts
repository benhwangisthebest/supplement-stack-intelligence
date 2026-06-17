import { describe, expect, it } from "vitest";
import { MAX_TURNS, runAdvisorTurn } from "./agent";
import { REFUSAL_BUDGET, REFUSAL_NO_DATA, TURN_CAP_NOTE } from "./prompt";
import {
  ScriptedAdapter,
  finalStep,
  makeContext,
  toolStep,
} from "./mock-adapter";

const ctx = makeContext();

describe("runAdvisorTurn — grounding", () => {
  it("returns a grounded answer with citations when a tool produced data", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("Your fish oil may interact with warfarin; review with a clinician."),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "Is my stack safe with my meds?",
      budgetRemaining: 10_000,
    });
    expect(r.status).toBe("answered");
    expect(r.toolsUsed).toEqual(["checkInteractions"]);
    expect(r.citations.length).toBeGreaterThan(0);
    expect(r.citations[0].kind).toBe("interaction-rule");
    expect(r.answer).toContain("warfarin");
  });

  it("refuses honestly when the model answers without any tool grounding", async () => {
    const adapter = new ScriptedAdapter([
      finalStep("Creatine definitely fixes everything, trust me."),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "tell me anything",
      budgetRemaining: 10_000,
    });
    expect(r.status).toBe("refused-no-data");
    expect(r.answer).toBe(REFUSAL_NO_DATA);
    expect(r.citations).toEqual([]);
  });

  it("refuses honestly when every tool call returns no grounding", async () => {
    // checkInteractions on a context with no meds → ok:false.
    const noMeds = makeContext({ profile: { ...ctx.profile!, medications: [] } });
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("...should not be used..."),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx: noMeds,
      userMessage: "interactions?",
      budgetRemaining: 10_000,
    });
    expect(r.status).toBe("refused-no-data");
    expect(r.answer).toBe(REFUSAL_NO_DATA);
  });
});

describe("runAdvisorTurn — bounds", () => {
  it("short-circuits to a budget refusal before any model call", async () => {
    const adapter = new ScriptedAdapter([finalStep("never reached")]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "hi",
      budgetRemaining: 0,
    });
    expect(r.status).toBe("refused-budget");
    expect(r.answer).toBe(REFUSAL_BUDGET);
    expect(adapter.calls).toBe(0);
  });

  it("terminates at the turn cap when the model keeps calling tools", async () => {
    // Only ever returns a tool step → loop must stop at MAX_TURNS.
    const adapter = new ScriptedAdapter([toolStep("checkInteractions")]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "loop forever",
      budgetRemaining: 10_000,
    });
    expect(adapter.calls).toBe(MAX_TURNS);
    expect(r.status).toBe("refused-turn-cap");
    expect(r.answer).toContain(TURN_CAP_NOTE.trim());
    // still grounded — the interaction was found
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("stops mid-loop when cumulative usage exceeds the budget", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions", {}, { usage: { inputTokens: 60, outputTokens: 60 } }),
      finalStep("unreached"),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "expensive",
      budgetRemaining: 100,
    });
    expect(r.status).toBe("refused-turn-cap"); // grounded summary, loop cut short
    expect(r.usage.inputTokens + r.usage.outputTokens).toBeGreaterThanOrEqual(100);
    expect(adapter.calls).toBe(1);
  });

  it("accumulates usage across steps", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions", {}, { usage: { inputTokens: 10, outputTokens: 5 } }),
      finalStep("ok grounded answer", { inputTokens: 8, outputTokens: 4 }),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "q",
      budgetRemaining: 10_000,
    });
    expect(r.usage).toEqual({ inputTokens: 18, outputTokens: 9 });
  });
});

describe("runAdvisorTurn — dispatch robustness", () => {
  it("treats an unknown tool as no-grounding, never throwing", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("doesNotExist"),
      finalStep("anything"),
    ]);
    const r = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "q",
      budgetRemaining: 10_000,
    });
    expect(r.status).toBe("refused-no-data");
    expect(r.toolsUsed).toEqual([]); // unknown tool is not recorded as used
  });

  it("passes prior tool results back to the adapter on the next step", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("grounded"),
    ]);
    await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: "q",
      budgetRemaining: 10_000,
    });
    // first call: no prior tool results; second call: the interaction result.
    expect(adapter.received[0].toolResults).toEqual([]);
    expect(adapter.received[1].toolResults).toHaveLength(1);
    expect(adapter.received[1].toolResults[0].toolCallId).toBe("call_checkInteractions");
  });
});
