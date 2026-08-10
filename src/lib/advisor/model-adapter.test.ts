// Phase 2 U25. REPLACES `claude-adapter.test.ts`, which tested the Anthropic
// message protocol — a protocol this application no longer speaks. The file was
// rewritten rather than adapted, because every wire shape it asserted moved.
//
// ONE PIN WAS DELIBERATELY INVERTED RATHER THAN DELETED, and it is the most
// important line in the file. The old suite asserted:
//
//     expect(step.usage).toEqual({ inputTokens: 0, outputTokens: 0 }); // missing usage → 0
//
// That was correct against a provider that always reports usage. Against a
// router it is a silent budget release: the turn settles to nothing and the
// reservation is handed back for a call that cost money. The replacement
// asserts the opposite property — a response with no `usage` object leaves
// `usageReported` FALSE, and the route does not settle. The reversal is visible
// in the diff, which is how U6 handled the same situation with lab-import's
// preservation pin.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdvisorModelAdapter,
  buildToolResultMessages,
  parseToolArguments,
  seedMessages,
  toAdapterStep,
  toOmnirouteTools,
} from "./model-adapter";
import { ADVISOR_TOOLS } from "./tools";
import type { CompletionResult } from "@/lib/omniroute/client";

/** A scripted completion function that records the requests it receives. */
function scripted(results: CompletionResult[]) {
  const requests: unknown[] = [];
  const complete = async (req: unknown) => {
    requests.push(req);
    return results[Math.min(requests.length - 1, results.length - 1)];
  };
  return { complete, requests };
}

const answer = (text: string): CompletionResult => ({
  text,
  toolCalls: [],
  usage: { inputTokens: 7, outputTokens: 3 },
});

describe("pure mapping cores", () => {
  it("toOmnirouteTools maps every tool to the function-tool shape", () => {
    const mapped = toOmnirouteTools(ADVISOR_TOOLS);
    expect(mapped).toHaveLength(ADVISOR_TOOLS.length);
    for (const m of mapped) {
      expect(m.type).toBe("function");
      expect(m.function).toHaveProperty("name");
      expect(m.function).toHaveProperty("description");
      expect(m.function).toHaveProperty("parameters");
    }
    // The Anthropic key name must be gone, not merely unused: a gateway would
    // silently ignore `input_schema` and the model would call tools blind.
    expect(JSON.stringify(mapped)).not.toContain("input_schema");
  });

  it("seedMessages puts the system prompt FIRST, then the history", () => {
    expect(seedMessages("SYS", [{ role: "user", content: "hi" }])).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "hi" },
    ]);
  });

  it("buildToolResultMessages emits ONE tool message per call, not one aggregate", () => {
    expect(
      buildToolResultMessages([
        { toolCallId: "call_1", content: '{"ok":true}' },
        { toolCallId: "call_2", content: '{"ok":false}' },
      ]),
    ).toEqual([
      { role: "tool", tool_call_id: "call_1", content: '{"ok":true}' },
      { role: "tool", tool_call_id: "call_2", content: '{"ok":false}' },
    ]);
  });

  it("parseToolArguments parses the JSON STRING the model returns", () => {
    // The shape Anthropic never had: `arguments` is text, so it can fail.
    expect(parseToolArguments('{"a":1}')).toEqual({ a: 1 });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["a JSON array", "[1,2]"],
    ["a JSON scalar", "42"],
    ["JSON null", "null"],
  ])("parseToolArguments yields {} for %s rather than throwing", (_l, raw) => {
    // A malformed tool call must reach the handler, fail its own validation and
    // route into the honest-refusal path — not 500 a turn the system can still
    // answer.
    expect(parseToolArguments(raw)).toEqual({});
  });

  it("toAdapterStep maps text and reported usage", () => {
    const { step, usageReported } = toAdapterStep(answer("hello"));
    expect(step.text).toBe("hello");
    expect(step.toolCalls).toEqual([]);
    expect(step.usage).toEqual({ inputTokens: 7, outputTokens: 3 });
    expect(usageReported).toBe(true);
  });

  it("toAdapterStep maps tool calls and threads them back as tool_calls", () => {
    const { step, assistantMessage } = toAdapterStep({
      text: "let me check",
      toolCalls: [
        { id: "call_1", name: "checkInteractions", argumentsJson: '{"a":1}' },
      ],
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    expect(step.toolCalls).toEqual([
      { id: "call_1", name: "checkInteractions", input: { a: 1 } },
    ]);
    expect(assistantMessage).toEqual({
      role: "assistant",
      content: "let me check",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "checkInteractions", arguments: '{"a":1}' },
        },
      ],
    });
  });

  it("REPLACES the old `missing usage → 0` pin with its inverse", () => {
    // The old suite asserted `{0,0}` and called it correct. It still reads
    // `{0,0}` in the step — the port requires concrete numbers — but the fact
    // that the numbers are UNKNOWN now travels alongside them, and that is what
    // stops the route settling.
    const { step, usageReported } = toAdapterStep({
      text: "hi",
      toolCalls: [],
      usage: null,
    });
    expect(step.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(usageReported).toBe(false);
  });
});

describe("AdvisorModelAdapter — stateful threading across a turn", () => {
  it("seeds system+history, then threads assistant(tool_calls) → tool messages", async () => {
    const { complete, requests } = scripted([
      {
        text: "",
        toolCalls: [{ id: "call_1", name: "checkInteractions", argumentsJson: "{}" }],
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      answer("final grounded answer"),
    ]);
    const adapter = new AdvisorModelAdapter({ complete });

    const step1 = await adapter.next({
      system: "SYS",
      messages: [{ role: "user", content: "is my stack safe?" }],
      tools: ADVISOR_TOOLS,
      toolResults: [],
    });
    expect(step1.toolCalls).toHaveLength(1);

    const step2 = await adapter.next({
      system: "SYS",
      messages: [{ role: "user", content: "is my stack safe?" }],
      tools: ADVISOR_TOOLS,
      toolResults: [{ toolCallId: "call_1", content: '{"ok":true}' }],
    });
    expect(step2.text).toBe("final grounded answer");

    const first = requests[0] as { messages: unknown[]; tools: unknown[] };
    expect(first.tools).toHaveLength(ADVISOR_TOOLS.length);
    expect(first.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "is my stack safe?" },
    ]);

    // second request: system + user + assistant(tool_calls) + tool(result)
    const m = (requests[1] as { messages: Record<string, unknown>[] }).messages;
    expect(m).toHaveLength(4);
    expect(m[2].role).toBe("assistant");
    expect(m[2].tool_calls).toHaveLength(1);
    expect(m[3]).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: '{"ok":true}',
    });
  });

  it("reports usage as reported when every step reports it", async () => {
    const { complete } = scripted([answer("a")]);
    const adapter = new AdvisorModelAdapter({ complete });

    await adapter.next({ system: "S", messages: [], tools: [], toolResults: [] });

    expect(adapter.usageReported).toBe(true);
  });

  it("is sticky-false once ANY step omits usage", async () => {
    // Partial usage across a multi-step turn is still an estimate. Settling on
    // the reported subset would under-charge, which is the direction the ledger
    // must never take.
    const { complete } = scripted([
      { text: "", toolCalls: [], usage: null },
      answer("b"),
    ]);
    const adapter = new AdvisorModelAdapter({ complete });

    await adapter.next({ system: "S", messages: [], tools: [], toolResults: [] });
    expect(adapter.usageReported).toBe(false);

    await adapter.next({ system: "S", messages: [], tools: [], toolResults: [] });
    expect(adapter.usageReported).toBe(false);
  });
});

describe("AdvisorModelAdapter — config guard", () => {
  afterEach(() => vi.unstubAllEnvs());

  const call = (adapter: AdvisorModelAdapter) =>
    adapter.next({
      system: "S",
      messages: [{ role: "user", content: "x" }],
      tools: ADVISOR_TOOLS,
      toolResults: [],
    });

  it("throws a 'not configured' error when the key is absent", async () => {
    vi.stubEnv("OMNIROUTE_API_KEY", "");
    vi.stubEnv("OMNIROUTE_BASE_URL", "https://gw.example");

    await expect(call(new AdvisorModelAdapter({}))).rejects.toThrow("not configured");
  });

  it("throws a 'not configured' error when the base URL is absent", async () => {
    // Both halves are required. Omniroute's own default is a developer's local
    // gateway; a deployed app silently pointing at localhost would fail in a
    // way no operator could read.
    vi.stubEnv("OMNIROUTE_API_KEY", "k");
    vi.stubEnv("OMNIROUTE_BASE_URL", "");

    await expect(call(new AdvisorModelAdapter({}))).rejects.toThrow("not configured");
  });
});
