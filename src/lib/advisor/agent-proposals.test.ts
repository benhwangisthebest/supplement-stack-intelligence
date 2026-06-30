// Unit — the agent loop's v7 proposal-halt + v8 batch collection (Design §2.2/§3.2;
// Plan SC-2/3/4 + SC1/SC4).
import { describe, expect, it } from "vitest";
import { containsBannedLanguage } from "@/lib/safety";
import { MAX_BATCH_PROPOSALS, runAdvisorTurn } from "./agent";
import {
  ScriptedAdapter,
  finalStep,
  makeContext,
  multiToolStep,
  toolStep,
} from "./mock-adapter";
import type { ProgressEvent } from "@/types/advisor";

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

describe("runAdvisorTurn — v8 batch collection (SC4)", () => {
  it("collects ALL grounded proposals in one step into a batch", async () => {
    const adapter = new ScriptedAdapter([
      multiToolStep([
        { name: "propose_add_item", input: { supplementId: "magnesium", dose: 300, unit: "mg", timing: "bedtime" }, id: "c1" },
        { name: "propose_edit_item", input: { stackItemId: "si-2", dose: 4000, unit: "IU" }, id: "c2" },
      ]),
      finalStep("(never reached)"),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "add magnesium and bump my vitamin D", budgetRemaining: BUDGET });

    expect(r.status).toBe("proposed");
    expect(r.proposals).toHaveLength(2);
    expect(r.proposals?.map((p) => p.type)).toEqual(["add_item", "edit_item"]);
    expect(r.proposal).toBe(r.proposals?.[0]); // back-compat: singular == proposals[0]
    expect(adapter.calls).toBe(1); // halted after the batch step
    // Cumulative summary lists BOTH changes.
    expect(r.answer).toMatch(/2 changes/i);
    expect(containsBannedLanguage(r.answer)).toBe(false);
  });

  it("caps the batch at maxBatch and drops the overflow (not an error)", async () => {
    const adapter = new ScriptedAdapter([
      multiToolStep([
        { name: "propose_add_item", input: { supplementId: "magnesium", dose: 300, unit: "mg" }, id: "c1" },
        { name: "propose_edit_item", input: { stackItemId: "si-2", dose: 4000, unit: "IU" }, id: "c2" },
      ]),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "two changes", budgetRemaining: BUDGET, maxBatch: 1 });
    expect(r.status).toBe("proposed");
    expect(r.proposals).toHaveLength(1); // capped
  });

  it("only grounded proposals enter the batch; ungrounded ones are dropped", async () => {
    const adapter = new ScriptedAdapter([
      multiToolStep([
        { name: "propose_add_item", input: { supplementId: "magnesium", dose: 300, unit: "mg" }, id: "c1" },
        { name: "propose_add_item", input: { supplementId: "unobtanium", dose: 1, unit: "mg" }, id: "c2" },
      ]),
      finalStep("(never reached — one grounded proposal halts)"),
    ]);
    const r = await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "add two", budgetRemaining: BUDGET });
    expect(r.status).toBe("proposed");
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals?.[0].payload).toMatchObject({ supplementId: "magnesium" });
  });

  it("MAX_BATCH_PROPOSALS is a small fixed default", () => {
    expect(MAX_BATCH_PROPOSALS).toBe(4);
  });
});

describe("runAdvisorTurn — v8 progress events (SC1)", () => {
  it("emits turn-start, a tool-call per dispatched tool, then composing on an answer", async () => {
    const events: ProgressEvent[] = [];
    const adapter = new ScriptedAdapter([
      toolStep("checkInteractions"),
      finalStep("warfarin and fish oil may interact."),
    ]);
    await runAdvisorTurn({
      adapter,
      ctx: makeContext(),
      userMessage: "is my stack safe?",
      budgetRemaining: BUDGET,
      onProgress: (e) => events.push(e),
    });
    expect(events[0]).toEqual({ type: "turn-start" });
    expect(events).toContainEqual({ type: "tool-call", name: "checkInteractions" });
    expect(events.at(-1)).toEqual({ type: "composing" });
  });

  it("emits one tool-call event per proposal tool, in order, on a batch halt", async () => {
    const events: ProgressEvent[] = [];
    const adapter = new ScriptedAdapter([
      multiToolStep([
        { name: "propose_add_item", input: { supplementId: "magnesium", dose: 300, unit: "mg" }, id: "c1" },
        { name: "propose_edit_item", input: { stackItemId: "si-2", dose: 4000, unit: "IU" }, id: "c2" },
      ]),
    ]);
    await runAdvisorTurn({ adapter, ctx: makeContext(), userMessage: "two changes", budgetRemaining: BUDGET, onProgress: (e) => events.push(e) });
    const toolCalls = events.filter((e) => e.type === "tool-call").map((e) => (e as { name: string }).name);
    expect(toolCalls).toEqual(["propose_add_item", "propose_edit_item"]);
    // A proposal halt does NOT emit composing (no model answer is produced).
    expect(events).not.toContainEqual({ type: "composing" });
  });
});
