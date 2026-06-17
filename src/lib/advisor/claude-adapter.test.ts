import { afterEach, describe, expect, it } from "vitest";
import {
  AdvisorClaudeAdapter,
  type AnthropicLike,
  buildToolResultMessage,
  parseResponse,
  seedMessages,
  toAnthropicTools,
} from "./claude-adapter";
import { ADVISOR_TOOLS } from "./tools";

// A scripted Anthropic client that records the requests it receives.
class MockAnthropic implements AnthropicLike {
  requests: any[] = [];
  messages = {
    create: async (req: unknown) => {
      this.requests.push(req);
      return this.responses[Math.min(this.requests.length - 1, this.responses.length - 1)];
    },
  };
  constructor(private readonly responses: any[]) {}
}

describe("pure mapping cores", () => {
  it("toAnthropicTools maps every tool to name/description/input_schema", () => {
    const mapped = toAnthropicTools(ADVISOR_TOOLS);
    expect(mapped).toHaveLength(6);
    for (const m of mapped) {
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("description");
      expect(m).toHaveProperty("input_schema");
    }
  });

  it("seedMessages preserves role + content", () => {
    expect(seedMessages([{ role: "user", content: "hi" }])).toEqual([
      { role: "user", content: "hi" },
    ]);
  });

  it("parseResponse extracts text + usage when no tools requested", () => {
    const { step } = parseResponse({
      content: [{ type: "text", text: "hello" }],
      usage: { input_tokens: 12, output_tokens: 8 },
    });
    expect(step.text).toBe("hello");
    expect(step.toolCalls).toEqual([]);
    expect(step.usage).toEqual({ inputTokens: 12, outputTokens: 8 });
  });

  it("parseResponse extracts tool_use blocks", () => {
    const { step, assistantContent } = parseResponse({
      content: [
        { type: "text", text: "let me check" },
        { type: "tool_use", id: "tu_1", name: "checkInteractions", input: { a: 1 } },
      ],
    });
    expect(step.text).toBe("let me check");
    expect(step.toolCalls).toEqual([
      { id: "tu_1", name: "checkInteractions", input: { a: 1 } },
    ]);
    expect(assistantContent).toHaveLength(2); // preserved for the next turn
    expect(step.usage).toEqual({ inputTokens: 0, outputTokens: 0 }); // missing usage → 0
  });

  it("buildToolResultMessage wraps results as tool_result blocks", () => {
    const msg = buildToolResultMessage([{ toolCallId: "tu_1", content: '{"ok":true}' }]);
    expect(msg.role).toBe("user");
    expect(msg.content).toEqual([
      { type: "tool_result", tool_use_id: "tu_1", content: '{"ok":true}' },
    ]);
  });
});

describe("AdvisorClaudeAdapter — stateful threading across a turn", () => {
  it("seeds on first call, then threads assistant(tool_use) → user(tool_result)", async () => {
    const mock = new MockAnthropic([
      {
        content: [{ type: "tool_use", id: "tu_1", name: "checkInteractions", input: {} }],
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      {
        content: [{ type: "text", text: "final grounded answer" }],
        usage: { input_tokens: 7, output_tokens: 3 },
      },
    ]);
    const adapter = new AdvisorClaudeAdapter({ client: mock });

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
      toolResults: [{ toolCallId: "tu_1", content: '{"ok":true}' }],
    });
    expect(step2.text).toBe("final grounded answer");

    // first request: just the seeded user message + system + tools
    expect(mock.requests[0].system).toBe("SYS");
    expect(mock.requests[0].tools).toHaveLength(6);
    expect(mock.requests[0].messages).toEqual([
      { role: "user", content: "is my stack safe?" },
    ]);

    // second request: seeded user + assistant(tool_use) + user(tool_result)
    const m = mock.requests[1].messages;
    expect(m).toHaveLength(3);
    expect(m[1].role).toBe("assistant");
    expect(m[1].content[0].type).toBe("tool_use");
    expect(m[2].role).toBe("user");
    expect(m[2].content[0]).toEqual({
      type: "tool_result",
      tool_use_id: "tu_1",
      content: '{"ok":true}',
    });
  });
});

describe("AdvisorClaudeAdapter — config guard", () => {
  const saved = process.env.API_ANTHROPIC_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.API_ANTHROPIC_KEY;
    else process.env.API_ANTHROPIC_KEY = saved;
  });

  it("throws a 'not configured' error when no client and no key", async () => {
    delete process.env.API_ANTHROPIC_KEY;
    const adapter = new AdvisorClaudeAdapter({});
    await expect(
      adapter.next({ system: "S", messages: [{ role: "user", content: "x" }], tools: ADVISOR_TOOLS, toolResults: [] }),
    ).rejects.toThrow("not configured");
  });
});
