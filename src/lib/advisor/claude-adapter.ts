// Infrastructure layer — the ONLY non-deterministic unit (Design §9.4, §2.1).
// Implements the ClaudeAdapter PORT from module-1, so the Domain agent loop never
// imports the SDK. The @anthropic-ai/sdk client is lazy-imported (server-only) and
// injectable, mirroring lib/lab-import/pdf-adapter.ts. The pure mapping cores
// (toAnthropicTools / parseResponse / buildToolResultMessage) are unit-tested with
// a canned client — no network. Plan SC-9 (isolation).
// Phase 2 U1: `@/lib/api/errors` is a zero-import module by design, so importing
// it here adds no framework edge to this pure-engine directory (DOMAIN_IS_PURE).
// Importing `@/lib/api/respond` would — see that file's header.
import { NotConfiguredError } from "@/lib/api/errors";
import type {
  AdapterMessage,
  AdapterStep,
  AdapterToolResult,
  AdvisorTool,
  ClaudeAdapter,
} from "@/types/advisor";

// ---- Structural Anthropic types (avoid a build-time dep on the SDK) ----------
type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface AnthropicLike {
  messages: { create: (req: unknown) => Promise<AnthropicResponse> };
}

export const DEFAULT_ADVISOR_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

export interface AdapterDeps {
  client?: AnthropicLike; // injected in tests
  apiKey?: string;
  model?: string;
}

// ---- Pure mapping cores (unit-tested) ----------------------------------------

/** AdvisorTool[] → Anthropic tool schema array. PURE. */
export function toAnthropicTools(tools: AdvisorTool[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

/** Neutral history → seed Anthropic messages. PURE. */
export function seedMessages(messages: AdapterMessage[]): AnthropicMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/** Prior tool results → one Anthropic `user` message of tool_result blocks. PURE. */
export function buildToolResultMessage(
  toolResults: AdapterToolResult[],
): AnthropicMessage {
  return {
    role: "user",
    content: toolResults.map((r) => ({
      type: "tool_result" as const,
      tool_use_id: r.toolCallId,
      content: r.content,
    })),
  };
}

/** Anthropic response → neutral AdapterStep (text + tool calls + usage). PURE. */
export function parseResponse(resp: AnthropicResponse): {
  step: AdapterStep;
  assistantContent: AnthropicContentBlock[];
} {
  const text = resp.content
    .filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  const toolCalls = resp.content
    .filter(
      (b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> =>
        b.type === "tool_use",
    )
    .map((b) => ({ id: b.id, name: b.name, input: b.input ?? {} }));
  const usage = {
    inputTokens: resp.usage?.input_tokens ?? 0,
    outputTokens: resp.usage?.output_tokens ?? 0,
  };
  return { step: { text, toolCalls, usage }, assistantContent: resp.content };
}

// ---- The adapter -------------------------------------------------------------

/**
 * One instance PER TURN. Across the loop's repeated next() calls it accumulates
 * the Anthropic-format transcript (assistant tool_use → user tool_result), which
 * the neutral ClaudeAdapter interface intentionally doesn't expose.
 */
export class AdvisorClaudeAdapter implements ClaudeAdapter {
  private apiMessages: AnthropicMessage[] = [];
  private seeded = false;
  private pendingAssistant: AnthropicMessage | null = null;
  private client: AnthropicLike | null;

  constructor(private readonly deps: AdapterDeps = {}) {
    this.client = deps.client ?? null;
  }

  async next(args: {
    system: string;
    messages: AdapterMessage[];
    tools: AdvisorTool[];
    toolResults: AdapterToolResult[];
  }): Promise<AdapterStep> {
    if (!this.seeded) {
      this.apiMessages = seedMessages(args.messages);
      this.seeded = true;
    } else {
      // Continue the tool-use exchange: assistant(tool_use) then user(tool_result).
      if (this.pendingAssistant) this.apiMessages.push(this.pendingAssistant);
      if (args.toolResults.length > 0) {
        this.apiMessages.push(buildToolResultMessage(args.toolResults));
      }
    }

    const client = await this.resolveClient();
    const resp = await client.messages.create({
      model: this.deps.model ?? DEFAULT_ADVISOR_MODEL,
      max_tokens: MAX_TOKENS,
      system: args.system,
      tools: toAnthropicTools(args.tools),
      // Snapshot so each request captures the transcript at that step (the
      // internal array keeps growing across the turn).
      messages: [...this.apiMessages],
    });

    const { step, assistantContent } = parseResponse(resp);
    this.pendingAssistant = { role: "assistant", content: assistantContent };
    return step;
  }

  private async resolveClient(): Promise<AnthropicLike> {
    if (this.client) return this.client;
    const apiKey = this.deps.apiKey ?? process.env.API_ANTHROPIC_KEY;
    if (!apiKey) {
      throw new NotConfiguredError("API_ANTHROPIC_KEY not configured");
    }
    // Lazily imported so the SDK loads only on the live server path.
    const mod = await import("@anthropic-ai/sdk");
    this.client = new mod.default({ apiKey }) as unknown as AnthropicLike;
    return this.client;
  }
}
