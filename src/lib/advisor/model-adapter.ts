// Infrastructure layer — the ONLY non-deterministic unit (Design §9.4, §2.1).
// Implements the `ClaudeAdapter` PORT from module-1, so the Domain agent loop
// never touches transport. Phase 2 U25 replaced the provider: the paid call now
// goes through `@/lib/omniroute/client`, and this file owns the mapping between
// the advisor's neutral adapter types and the OpenAI-compatible wire protocol
// that gateway speaks.
//
// ---------------------------------------------------------------------------
// WHAT CHANGED IN U25, AND WHAT DELIBERATELY DID NOT
// ---------------------------------------------------------------------------
// CHANGED — the wire protocol, not merely the client. Omniroute publishes
// `/v1/*` as OpenAI-compatible and no Anthropic `/v1/messages`, so every shape
// below moved:
//   * tools:        {name, description, input_schema}
//                     → {type:"function", function:{name, description, parameters}}
//   * system:       a top-level `system` field → a leading {role:"system"} message
//   * tool calls:   assistant `content[{type:"tool_use", input}]`
//                     → assistant `tool_calls[{id, function:{name, arguments}}]`,
//                       where `arguments` is a JSON **string** that must be parsed
//   * tool results: ONE user message of `tool_result` blocks
//                     → ONE `{role:"tool", tool_call_id}` message PER call
//   * usage:        {input_tokens, output_tokens} → {prompt_tokens, completion_tokens}
//
// UNCHANGED — the `ClaudeAdapter` interface, exactly. `next()`'s signature and
// `AdapterStep` are byte-identical, so `src/lib/advisor/agent.ts` — a governed
// pure-engine file — was not opened by this unit, and neither was
// `src/types/advisor.ts`. The port type is still *named* `ClaudeAdapter`; that
// is residual naming debt recorded in U25's report, and renaming it would touch
// `agent.ts` for zero behavioural gain.
//
// ---------------------------------------------------------------------------
// `usageReported` — WHY IT IS ON THE CLASS AND NOT IN `AdapterStep`
// ---------------------------------------------------------------------------
// The ledger settles a reservation against what a turn really spent. The old
// adapter did `resp.usage?.input_tokens ?? 0`, which was safe against one
// provider that always reports. Behind a router, a response with no `usage`
// object is possible, and "absent" collapsed into "zero" would settle a paid
// turn to nothing and hand the whole reservation back — the daily budget would
// stop binding with every test still green.
//
// So the client returns `usage: null` for unreported, and this class exposes a
// sticky `usageReported` flag. The ROUTE reads it and skips the settle when it
// is false, leaving the reservation charged. Over-charging by at most one
// reservation is the safe direction and matches what a *thrown* turn already
// does (U6). Estimating would be asserting a figure the system did not compute
// — `CLAUDE.md` §2.2 rule 7.
//
// It lives on the class rather than in `AdapterStep` precisely so the port,
// `src/types/advisor.ts` and `agent.ts` all stay untouched: the route already
// constructs and holds the adapter, so it is the natural reader of a fact only
// it acts on.
//
// Phase 2 U1: `@/lib/api/errors` is a zero-import module by design, so importing
// it here adds no framework edge to this pure-engine directory (DOMAIN_IS_PURE).
// Importing `@/lib/api/respond` would — see that file's header.
import { AI_SERVICE_NOT_CONFIGURED, NotConfiguredError } from "@/lib/api/errors";
import {
  createCompletion,
  type CompletionResult,
  type OmnirouteFunctionTool,
  type OmnirouteMessage,
} from "@/lib/omniroute/client";
import type {
  AdapterMessage,
  AdapterStep,
  AdapterToolResult,
  AdvisorTool,
  ClaudeAdapter,
} from "@/types/advisor";

/**
 * The routed model. Omniroute takes an OpenAI-style model id and routes it; the
 * default names the same class of small, fast model the Anthropic adapter used,
 * and is overridable per deployment without a code change.
 */
export const DEFAULT_ADVISOR_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

/**
 * Resolved per call, not at module load, so a test can stub the environment
 * after import — and so a deployment can change the routed model without a
 * rebuild. The id namespace is the GATEWAY's, not Anthropic's; **OP-4 records
 * which model a request is actually routed to**, and until that record exists
 * the default is a documented starting point rather than a verified one.
 */
function resolveModel(explicit?: string): string {
  return explicit ?? process.env.OMNIROUTE_ADVISOR_MODEL ?? DEFAULT_ADVISOR_MODEL;
}

/**
 * Phase 2 U6, carried across by U25. Without an explicit timeout a hung request
 * on a serverless function burns the whole `maxDuration` before anything else
 * can react. Set here, at the one place the call is configured, so no call site
 * can forget it. Unlike the SDK option it replaced, it is now testable — see
 * finding N-20 and `omniroute/client.test.ts`.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.OMNIROUTE_TIMEOUT_MS ?? 60_000);

/** The one call this adapter makes. Injected in tests; never injected live. */
export type CompleteFn = (args: {
  model: string;
  messages: OmnirouteMessage[];
  tools: OmnirouteFunctionTool[];
  maxTokens: number;
}) => Promise<CompletionResult>;

export interface AdapterDeps {
  complete?: CompleteFn; // injected in tests
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// ---- Pure mapping cores (unit-tested) ----------------------------------------

/** AdvisorTool[] → OpenAI-compatible function-tool array. PURE. */
export function toOmnirouteTools(tools: AdvisorTool[]): OmnirouteFunctionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

/**
 * System prompt + neutral history → the seed message array. PURE.
 *
 * The system prompt becomes the FIRST MESSAGE here; Anthropic carried it as a
 * top-level request field. Dropping it would leave the model with no grounding
 * or refusal instructions at all while still answering fluently, which is the
 * failure this repository would least like to ship green.
 */
export function seedMessages(
  system: string,
  messages: AdapterMessage[],
): OmnirouteMessage[] {
  return [
    { role: "system", content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

/**
 * Prior tool results → ONE `{role:"tool"}` message PER call. PURE.
 *
 * Plural, unlike the Anthropic mapping it replaces, which packed every result
 * into a single `user` message of `tool_result` blocks. An OpenAI-compatible
 * endpoint rejects that shape and requires one message per `tool_call_id`.
 */
export function buildToolResultMessages(
  toolResults: AdapterToolResult[],
): OmnirouteMessage[] {
  return toolResults.map((r) => ({
    role: "tool" as const,
    tool_call_id: r.toolCallId,
    content: r.content,
  }));
}

/**
 * A tool call's `arguments` string → an input object. PURE.
 *
 * The model returns arguments as JSON **text**, so this can fail — a shape the
 * Anthropic protocol never had, because `input` arrived already structured.
 * A parse failure yields `{}` rather than throwing: every tool handler
 * validates its own input and answers `ok:false`, which routes into the loop's
 * existing honest-refusal path. Throwing here would turn a malformed tool call
 * into a 500 for a turn the system can still answer honestly.
 */
export function parseToolArguments(argumentsJson: string): Record<string, unknown> {
  if (argumentsJson.trim().length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(argumentsJson);
  } catch {
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

/**
 * Completion → neutral AdapterStep + the assistant message to thread forward.
 * PURE.
 *
 * `usageReported` is returned SEPARATELY from `step.usage` on purpose: the port
 * requires concrete numbers, and the only honest number for an unreported turn
 * is zero *in the step* combined with "do not settle" *at the route*.
 */
export function toAdapterStep(result: CompletionResult): {
  step: AdapterStep;
  assistantMessage: OmnirouteMessage;
  usageReported: boolean;
} {
  const toolCalls = result.toolCalls.map((c) => ({
    id: c.id,
    name: c.name,
    input: parseToolArguments(c.argumentsJson),
  }));

  const assistantMessage: OmnirouteMessage = {
    role: "assistant",
    content: result.text.length > 0 ? result.text : null,
    ...(result.toolCalls.length > 0
      ? {
          tool_calls: result.toolCalls.map((c) => ({
            id: c.id,
            type: "function" as const,
            function: { name: c.name, arguments: c.argumentsJson },
          })),
        }
      : {}),
  };

  return {
    step: {
      text: result.text,
      toolCalls,
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      },
    },
    assistantMessage,
    usageReported: result.usage !== null,
  };
}

// ---- The adapter -------------------------------------------------------------

/**
 * One instance PER TURN. Across the loop's repeated next() calls it accumulates
 * the provider-format transcript (assistant tool_calls → tool results), which
 * the neutral ClaudeAdapter interface intentionally doesn't expose.
 */
export class AdvisorModelAdapter implements ClaudeAdapter {
  private apiMessages: OmnirouteMessage[] = [];
  private seeded = false;
  private pendingAssistant: OmnirouteMessage | null = null;
  private allUsageReported = true;

  constructor(private readonly deps: AdapterDeps = {}) {}

  /**
   * True only if EVERY completion this turn reported token usage. Sticky: one
   * unreported step makes the turn's total an estimate, and the ledger does not
   * settle estimates. Read by `src/app/api/advisor/route.ts`.
   */
  get usageReported(): boolean {
    return this.allUsageReported;
  }

  async next(args: {
    system: string;
    messages: AdapterMessage[];
    tools: AdvisorTool[];
    toolResults: AdapterToolResult[];
  }): Promise<AdapterStep> {
    if (!this.seeded) {
      this.apiMessages = seedMessages(args.system, args.messages);
      this.seeded = true;
    } else {
      // Continue the tool-use exchange: assistant(tool_calls) then one tool
      // message per result.
      if (this.pendingAssistant) this.apiMessages.push(this.pendingAssistant);
      this.apiMessages.push(...buildToolResultMessages(args.toolResults));
    }

    const complete = this.deps.complete ?? this.liveComplete();
    const result = await complete({
      model: resolveModel(this.deps.model),
      // Snapshot so each request captures the transcript at that step (the
      // internal array keeps growing across the turn).
      messages: [...this.apiMessages],
      tools: toOmnirouteTools(args.tools),
      maxTokens: MAX_TOKENS,
    });

    const { step, assistantMessage, usageReported } = toAdapterStep(result);
    if (!usageReported) this.allUsageReported = false;
    this.pendingAssistant = assistantMessage;
    return step;
  }

  /**
   * Bind the live client to resolved configuration.
   *
   * The key check lives HERE, not in the client: `NOT_CONFIGURED_TOTALITY`
   * asserts an inverse over a named list of throw sites, and moving the throw
   * into a module that list does not name would blind it — the failure mode
   * finding N-14 was raised for. Both the base URL and the key are required;
   * Omniroute's own default (`localhost:20128`) is a developer's gateway, and
   * defaulting a deployed application to it would fail obscurely instead of
   * loudly.
   *
   * NOT WIRED, DELIBERATELY: `createCompletion` accepts a caller `signal`, and
   * this adapter does not pass one. U6's contract is that a disconnect settles
   * the reservation against what the loop spent; aborting an in-flight call
   * would make that step *throw* instead, and a thrown turn does not settle.
   * Wiring it is a change to U6's declared semantics, so it is named here
   * rather than absorbed (§8.1).
   */
  private liveComplete(): CompleteFn {
    const apiKey = this.deps.apiKey ?? process.env.OMNIROUTE_API_KEY;
    const baseUrl = this.deps.baseUrl ?? process.env.OMNIROUTE_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED);
    }
    return (req) =>
      createCompletion({ baseUrl, apiKey, timeoutMs: REQUEST_TIMEOUT_MS }, req);
  }
}
