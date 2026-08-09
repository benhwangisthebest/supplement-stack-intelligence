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

// --------------------------------------------------- Phase 2 U2 (FU-7) ------

describe("runAdvisorTurn — a failing tool handler discloses nothing to the model", () => {
  // `emptyReason` is JSON.stringify'd into the tool_result content and sent back
  // to the model on the next turn, which can quote it into its answer. Before
  // U2 it interpolated `(err as Error).message`, so a driver or filesystem
  // string was one model turn from the user — CLAUDE.md §2.3 rule 13, rank 1,
  // by a path no route-level guard could see.
  //
  // The throw is REAL, not mocked at the seam: a poisoned `stackItems` getter
  // makes the actual `checkInteractions` handler raise while reading context.
  // A mock that returned a rejected promise would not prove the loop's own
  // `catch` is what runs.
  const SECRET = "postgres password=do-not-return host=/Users/example/internal.sock";

  function poisonedContext() {
    const poisoned = makeContext();
    Object.defineProperty(poisoned, "stackItems", {
      get() {
        throw new Error(SECRET);
      },
    });
    return poisoned;
  }

  it("sends the model a reference id, never the exception text", async () => {
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("I could not check that just now."),
    ]);
    const seen: { err: unknown; code: string }[] = [];

    const r = await runAdvisorTurn({
      adapter,
      ctx: poisonedContext(),
      userMessage: "Is my stack safe with my meds?",
      budgetRemaining: 10_000,
      onInternalError: (err, code) => {
        seen.push({ err, code });
        return "corr-1234";
      },
    });

    // What the model was actually handed on the following turn.
    const content = adapter.received[1].toolResults[0].content;
    expect(content).toContain("corr-1234");
    expect(content).not.toContain("do-not-return");
    expect(content).not.toContain("internal.sock");
    expect(content).not.toContain("password");

    // The exception is not lost — it goes to the sink WHOLE, so the sink can log
    // a stack and a cause. Passing the value (rather than its text) is also what
    // keeps this line clean under error-disclosure.
    expect(seen).toHaveLength(1);
    expect(seen[0].err).toBeInstanceOf(Error);
    expect((seen[0].err as Error).message).toBe(SECRET);
    expect(seen[0].code).toBe("ADVISOR_TOOL_ERROR");

    // And the turn still completes rather than 500-ing the whole conversation.
    expect(r.status).toBe("refused-no-data");
  });

  it("omits the reference entirely when no sink is injected", async () => {
    // The failure mode worth pinning: a missing sink must degrade to LESS
    // information, never fall back to the exception's text.
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("I could not check that just now."),
    ]);

    await runAdvisorTurn({
      adapter,
      ctx: poisonedContext(),
      userMessage: "Is my stack safe with my meds?",
      budgetRemaining: 10_000,
    });

    const content = adapter.received[1].toolResults[0].content;
    expect(content).toContain('Tool \\"checkInteractions\\" failed.');
    expect(content).not.toContain("reference");
    expect(content).not.toContain("do-not-return");
    expect(content).not.toContain("internal.sock");
  });
});

// ------------------------------------------------------ Phase 2 U6 ----------

describe("runAdvisorTurn — a disconnected client stops the loop AND the billing", () => {
  it("stops before the next paid call once the signal aborts", async () => {
    // The roadmap's wording is "stops the loop *and the billing*", and the
    // second half is what this pins: the adapter must not be called again.
    // Scripted to loop forever, so only the abort can end it.
    const adapter = new ScriptedAdapter([toolStep("checkInteractions")]);
    const signal = { aborted: false };

    // Abort after the first step has been served.
    const spy = { get aborted() { return adapter.calls >= 1; } };

    const r = await runAdvisorTurn({
      adapter,
      ctx: makeContext(),
      userMessage: "hello",
      budgetRemaining: 10_000,
      signal: spy,
      maxTurns: 5,
    });

    // ONE model call, not five. Asserted BEFORE the status so that removing the
    // check reports the thing that costs money — the call count — rather than a
    // status name.
    expect(adapter.calls, "adapter.next call count").toBe(1);
    expect(r.status).toBe("aborted");
    expect(signal.aborted).toBe(false); // the fixture above is the live one
  });

  it("returns the usage spent so far, so the caller can settle the truth", async () => {
    // The failure this prevents: returning zero usage on abort would release the
    // whole reservation and charge nothing for calls that were really made.
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions", {}, { usage: { inputTokens: 40, outputTokens: 7 } }),
    ]);

    const r = await runAdvisorTurn({
      adapter,
      ctx: makeContext(),
      userMessage: "hello",
      budgetRemaining: 10_000,
      signal: { get aborted() { return adapter.calls >= 1; } },
      maxTurns: 5,
    });

    expect(r.status).toBe("aborted");
    expect(r.usage).toEqual({ inputTokens: 40, outputTokens: 7 });
  });

  it("never calls the adapter at all when the client is already gone", async () => {
    const adapter = new ScriptedAdapter([finalStep("hi")]);
    const r = await runAdvisorTurn({
      adapter,
      ctx: makeContext(),
      userMessage: "hello",
      budgetRemaining: 10_000,
      signal: { aborted: true },
    });
    expect(r.status).toBe("aborted");
    expect(adapter.calls).toBe(0);
    expect(r.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("is unaffected by a signal that never aborts", async () => {
    const adapter = new ScriptedAdapter([finalStep("Magnesium may support sleep.")]);
    const r = await runAdvisorTurn({
      adapter,
      ctx: makeContext(),
      userMessage: "hello",
      budgetRemaining: 10_000,
      signal: { aborted: false },
    });
    expect(r.status).not.toBe("aborted");
  });
});
