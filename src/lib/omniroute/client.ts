// Infrastructure — the ONE module in `src/` permitted to make a paid model call
// (Phase 2 U25, decision 7A). Every LLM call the application makes goes through
// `createCompletion` below, and `SOLE_PAID_CLIENT` in `boundaries.test.ts`
// asserts that the completions path literal exists in exactly this file.
//
// ---------------------------------------------------------------------------
// WHY THIS MODULE EXISTS AT ALL — it is a guard surface, not just a helper
// ---------------------------------------------------------------------------
// `PAID_API_BUDGET` derives the set of routes it governs by walking the import
// graph for a marker. While the marker was the package `@anthropic-ai/sdk`, the
// package WAS the boundary — you could not spend money without importing it.
// Omniroute is reached over plain HTTP, so there is no package to match and an
// import-graph rule has nothing to bind to. Concentrating the call here
// recreates the boundary the package used to provide: "routes that reach this
// file" is once again exactly "routes that can spend money".
//
// That property is only as good as the assertion that nothing bypasses it,
// which is why `SOLE_PAID_CLIENT` ships in the same commit. Its honest limits
// are stated in its own header — this file is not magic, it is the thing the
// guard points at.
//
// ---------------------------------------------------------------------------
// ZERO IMPORTS, DELIBERATELY
// ---------------------------------------------------------------------------
// `src/lib/omniroute` is inside `DOMAIN_IS_PURE`'s scope (ruling D-4: all of
// `src/lib` except auth/api/supabase/db). It must reach neither persistence nor
// `next/*`. It imports nothing at all, so it cannot acquire either edge, and it
// carries no key resolution: the caller hands it a resolved base URL and key.
// The `NotConfiguredError` throw stays in the adapters, where
// `NOT_CONFIGURED_TOTALITY`'s sanctioned-site inverse can see it.
//
// PROTOCOL: OpenAI-compatible chat completions. Omniroute publishes `/v1/*` as
// OpenAI-compatible and no Anthropic `/v1/messages` surface, so the wire shapes
// here are OpenAI's, not Anthropic's. Mapping the advisor's neutral adapter
// types onto them is `advisor/model-adapter.ts`'s job, not this file's.

/**
 * The completions path. Exported as a named constant AND asserted to be the
 * only occurrence in `src/` — the literal is the guard's anchor, so it must not
 * be assembled from fragments anywhere.
 */
export const COMPLETIONS_PATH = "/v1/chat/completions";

/** Matches the SDK default this replaced (the old `claude-adapter.ts`'s 60s). */
export const DEFAULT_TIMEOUT_MS = 60_000;

// ---- Wire shapes (structural; no dependency on any vendor SDK) ---------------

export interface OmnirouteFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OmnirouteToolCallOut {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type OmnirouteMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OmnirouteToolCallOut[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface CompletionRequest {
  model: string;
  messages: OmnirouteMessage[];
  tools?: OmnirouteFunctionTool[];
  maxTokens?: number;
}

/** A tool call as it came off the wire. `argumentsJson` is RAW — see below. */
export interface OmnirouteToolCall {
  id: string;
  name: string;
  /**
   * The model's arguments, still a JSON *string*. Kept unparsed here on
   * purpose: parsing is protocol mapping, it can fail, and the failure has to
   * be handled somewhere a test can see it. The client's job is transport.
   */
  argumentsJson: string;
}

export interface CompletionResult {
  text: string;
  toolCalls: OmnirouteToolCall[];
  /**
   * Token usage, or **`null` meaning THE PROVIDER DID NOT REPORT IT**.
   *
   * This is the single most important type in the module and the reason it is
   * `| null` rather than a zeroed object. The Anthropic adapter did
   * `resp.usage?.input_tokens ?? 0`, which was harmless against one provider
   * that always reports. Behind a router that may serve a turn from any of
   * hundreds of models, "absent" and "zero" become indistinguishable — and they
   * settle in OPPOSITE directions. Absent-as-zero settles the ledger to nothing
   * and hands back a reservation for a turn that really cost money, so the
   * daily budget silently stops binding while every test stays green.
   *
   * `CLAUDE.md` §2.2 rule 7: never assert a figure the system did not compute.
   * A missing usage object is not zero usage; it is an unknown, and the caller
   * must treat it as one.
   */
  usage: { inputTokens: number; outputTokens: number } | null;
}

export type OmnirouteFailureKind = "timeout" | "aborted" | "http" | "malformed";

/**
 * A transport failure. Carries NO response body and no upstream error text —
 * only a kind and, for HTTP failures, a status. The route turns any throw from
 * here into a generic message plus a correlation id (§2.3 rule 13), and the
 * cheapest way to guarantee nothing leaks is to never read the body at all.
 */
export class OmnirouteError extends Error {
  constructor(
    message: string,
    readonly kind: OmnirouteFailureKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OmnirouteError";
  }
}

// ---- Pure cores (unit-tested, no network) -----------------------------------

/** `baseUrl` + the completions path, tolerant of a trailing slash. PURE. */
export function completionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${COMPLETIONS_PATH}`;
}

/**
 * Usage, or null when the provider did not report it. PURE.
 *
 * Both fields must be present and finite numbers. A partial usage object is
 * treated as unreported rather than half-trusted: settling on half a figure is
 * still asserting something the system did not compute.
 */
export function readUsage(raw: unknown): CompletionResult["usage"] {
  if (raw === null || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const input = u.prompt_tokens;
  const output = u.completion_tokens;
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  if (typeof output !== "number" || !Number.isFinite(output)) return null;
  return { inputTokens: input, outputTokens: output };
}

/**
 * OpenAI-compatible completion body → neutral result. PURE.
 * @throws OmnirouteError("malformed") when there is no first choice message.
 */
export function parseCompletion(body: unknown): CompletionResult {
  const root = (body ?? {}) as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;

  if (!message) {
    throw new OmnirouteError(
      "Omniroute returned no choice message",
      "malformed",
    );
  }

  const content = message.content;
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

  const toolCalls: OmnirouteToolCall[] = rawCalls
    .map((c) => c as Record<string, unknown>)
    .map((c) => {
      const fn = (c.function ?? {}) as Record<string, unknown>;
      return {
        id: typeof c.id === "string" ? c.id : "",
        name: typeof fn.name === "string" ? fn.name : "",
        argumentsJson: typeof fn.arguments === "string" ? fn.arguments : "",
      };
    })
    .filter((c) => c.id.length > 0 && c.name.length > 0);

  return {
    text: typeof content === "string" ? content : "",
    toolCalls,
    usage: readUsage(root.usage),
  };
}

// ---- The one paid call -------------------------------------------------------

export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
  /** Per-request wall clock. See the timeout note below. */
  timeoutMs?: number;
  /** The caller's connection, so a client disconnect stops an in-flight call. */
  signal?: AbortSignal;
  /** Injected in tests. Never injected in production. */
  fetchImpl?: typeof fetch;
}

/**
 * POST one chat completion. The ONLY function in `src/` that spends money.
 *
 * THE TIMEOUT IS OURS NOW, AND THAT IS AN IMPROVEMENT (finding N-20). The
 * Anthropic SDK took a `timeout` option, and U6 set it — but nothing ever
 * tested it: deleting the option reddened no test, because a mutation of an
 * SDK's internal behaviour needs a live client to observe. Implemented here as
 * an `AbortController` plus a `setTimeout`, it is observable under fake timers,
 * so the control finally has a red proof rather than a comment claiming it
 * matters.
 *
 * Why it matters is unchanged: a hung request on a serverless function burns
 * the whole `maxDuration` before anything else can react, and every second of
 * that is billable.
 */
export async function createCompletion(
  config: ClientConfig,
  request: CompletionRequest,
): Promise<CompletionResult> {
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // The caller is ALREADY gone — do not open a paid call for a connection that
  // no longer exists. `fetch` would reject on a pre-aborted signal anyway, but
  // only after the request had been constructed and handed to the platform;
  // this makes "spend nothing for an absent caller" a property of this module
  // rather than a behaviour inherited from the runtime.
  if (config.signal?.aborted) {
    throw new OmnirouteError("Caller disconnected before the request", "aborted");
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  config.signal?.addEventListener("abort", forwardAbort, { once: true });

  let response: Response;
  try {
    response = await doFetch(completionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        ...(request.tools && request.tools.length > 0
          ? { tools: request.tools, tool_choice: "auto" }
          : {}),
        ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        // The advisor route streams its OWN answer to the browser AFTER the
        // safety gate has run. Streaming from the provider would put model
        // tokens on a socket before that gate, which is the one thing the
        // design forbids (§2.1 rule 5). Explicit rather than defaulted.
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (transportFailure) {
    // A flag, not the caught error's text: reading `.message` here would be a
    // disclosure read under `error-disclosure.test.ts`, and would put upstream
    // wording one `throw` away from a client. The rethrow is untouched.
    if (timedOut) {
      throw new OmnirouteError(
        `Omniroute request timed out after ${timeoutMs}ms`,
        "timeout",
      );
    }
    throw transportFailure;
  } finally {
    clearTimeout(timer);
    config.signal?.removeEventListener("abort", forwardAbort);
  }

  if (!response.ok) {
    // The body is deliberately NOT read. An upstream 401 body can contain a key
    // fragment, and an error we never read is an error we cannot leak.
    throw new OmnirouteError(
      `Omniroute request failed with status ${response.status}`,
      "http",
      response.status,
    );
  }

  return parseCompletion(await response.json());
}
