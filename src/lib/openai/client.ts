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
// Omniroute was reached over plain HTTP, so there was no package to match and an
// import-graph rule had nothing to bind to. Concentrating the call here
// recreates the boundary the package used to provide: "routes that reach this
// file" is once again exactly "routes that can spend money".
//
// [2026-09-14, U31] THE PROVIDER CHANGED AGAIN — Omniroute → OpenAI's
// first-party API — AND THE REASONING ABOVE IS WHY NOTHING ELSE HAD TO. OpenAI
// is also reached over plain HTTP, so the module marker is still the only thing
// a paid boundary can bind to here, and decision 9 keeps the call on plain
// `fetch` rather than the `openai` package for exactly that reason: a package
// would not restore the old boundary, it would add a second one to keep in
// sync. The Omniroute history is retained rather than rewritten (`CLAUDE.md`
// §7) because it is the argument for the current shape, not dead background.
//
// That property is only as good as the assertion that nothing bypasses it,
// which is why `SOLE_PAID_CLIENT` ships in the same commit. Its honest limits
// are stated in its own header — this file is not magic, it is the thing the
// guard points at.
//
// ---------------------------------------------------------------------------
// ZERO IMPORTS, DELIBERATELY
// ---------------------------------------------------------------------------
// `src/lib/openai` is inside `DOMAIN_IS_PURE`'s scope (ruling D-4: all of
// `src/lib` except auth/api/supabase/db). It must reach neither persistence nor
// `next/*`. It imports nothing at all, so it cannot acquire either edge, and it
// carries no key resolution: the caller hands it a resolved base URL and key.
// The `NotConfiguredError` throw stays in the adapters, where
// `NOT_CONFIGURED_TOTALITY`'s sanctioned-site inverse can see it.
//
// PROTOCOL: OpenAI chat completions. This was already true before U31 — the
// module was written against Omniroute's OpenAI-compatible `/v1/*` surface — and
// it is the single reason the provider swap was a rename rather than a second
// wire-protocol rewrite. Mapping the advisor's neutral adapter types onto these
// shapes is `advisor/model-adapter.ts`'s job, not this file's.

/**
 * The completions path. Exported as a named constant AND asserted to be the
 * only occurrence in `src/` — the literal is the guard's anchor, so it must not
 * be assembled from fragments anywhere.
 */
export const COMPLETIONS_PATH = "/v1/chat/completions";

/** Matches the SDK default this replaced (the old `claude-adapter.ts`'s 60s). */
export const DEFAULT_TIMEOUT_MS = 60_000;

// ---- Wire shapes (structural; no dependency on any vendor SDK) ---------------

export interface OpenAIFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIToolCallOut {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/**
 * A structured user-content part. Added by U25's lab-import half, on decision
 * 7B's ruling: the OpenAI-compatible surface carries a PDF as a `file` part with
 * a base64 data URL, which the OP-4 record verified against both a text PDF and
 * an image-only one (`docs/05-qa/2026-08-10-omniroute-probe-record.md` §4).
 *
 * This is the ONLY structured content shape the application sends. Kept narrow
 * on purpose: the advisor's messages stay plain strings, so a widening here
 * cannot quietly change what the advisor puts on the wire.
 */
export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

export type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | OpenAIContentPart[] }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCallOut[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface CompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAIFunctionTool[];
  maxTokens?: number;
  /**
   * The model's reasoning budget, passed through to `reasoning_effort`.
   *
   * TYPED `string`, NOT A UNION, AND THAT IS DELIBERATE (U31, decision 9B).
   * A union — `"none" | "low" | "medium" | "high"` — would be this repository
   * asserting which values a provider it has never contacted accepts. That is
   * N-21's failure one field to the left: a hardcoded claim about a remote
   * system, green in every test, wrong on the first live call. `CLAUDE.md`
   * §2.2 rule 7. The value comes from the environment and the provider is the
   * authority on whether it is valid.
   *
   * OMITTED FROM THE BODY ENTIRELY when undefined — never sent as
   * `reasoning_effort: undefined`. `JSON.stringify` drops an undefined value,
   * so the two are indistinguishable on the wire today; the conditional spread
   * below makes the intent explicit and testable, so a future refactor that
   * serialises differently cannot silently start sending a null effort.
   */
  reasoningEffort?: string;
}

/** A tool call as it came off the wire. `argumentsJson` is RAW — see below. */
export interface OpenAIToolCall {
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
  toolCalls: OpenAIToolCall[];
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

export type OpenAIFailureKind = "timeout" | "aborted" | "http" | "malformed";

/**
 * A transport failure. Carries NO response body and no upstream error text —
 * only a kind and, for HTTP failures, a status. The route turns any throw from
 * here into a generic message plus a correlation id (§2.3 rule 13), and the
 * cheapest way to guarantee nothing leaks is to never read the body at all.
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly kind: OpenAIFailureKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenAIError";
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
 * @throws OpenAIError("malformed") when there is no first choice message.
 */
export function parseCompletion(body: unknown): CompletionResult {
  const root = (body ?? {}) as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;

  if (!message) {
    throw new OpenAIError(
      "The model returned no choice message",
      "malformed",
    );
  }

  const content = message.content;
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

  const toolCalls: OpenAIToolCall[] = rawCalls
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

/**
 * `CompletionRequest` → the exact object that is serialised onto the wire. PURE.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SEPARATE, EXPORTED FUNCTION (U31, and it is a guard, not tidying)
 * ---------------------------------------------------------------------------
 * `JSON.stringify` DELETES keys whose value is `undefined`. So
 * `{reasoning_effort: undefined}` and an omitted `reasoning_effort` produce
 * byte-identical bodies, and any test that inspects the PARSED body cannot tell
 * them apart. U31's first attempt at the "omitted when unset" guard did exactly
 * that, and its mutation — sending the field unconditionally — stayed GREEN.
 *
 * A test that cannot go red against the bug it names is not a guard
 * (`CLAUDE.md` §5 rule 2). Building the body here, before serialisation, makes
 * key PRESENCE observable with `in`, so the intent — "the field is absent, not
 * present-and-undefined" — is finally the thing being asserted.
 *
 * Why the distinction is worth a guard at all, given the wire is identical
 * today: it stops being identical the moment anything serialises differently.
 * `?? null` instead of a conditional spread puts an explicit `null` on the
 * wire; so does a custom replacer, a proxy, or a provider SDK that normalises
 * undefined to null. Each of those is a plausible future edit, and each sends a
 * field this repository decided not to send.
 */
export function buildCompletionBody(
  request: CompletionRequest,
): Record<string, unknown> {
  return {
    model: request.model,
    messages: request.messages,
    ...(request.tools && request.tools.length > 0
      ? { tools: request.tools, tool_choice: "auto" }
      : {}),
    // `max_completion_tokens`, NOT `max_tokens` (U31). OpenAI's GPT-5-era
    // models reject the older field outright, so this is a correctness change
    // and not a rename — and it is a one-way bet on model era, registered as R2
    // in the unit plan rather than guarded with a fallback that would hide
    // which field the deployment is using.
    ...(request.maxTokens
      ? { max_completion_tokens: request.maxTokens }
      : {}),
    // Present only when configured. See `reasoningEffort` on the request type.
    ...(request.reasoningEffort
      ? { reasoning_effort: request.reasoningEffort }
      : {}),
    // The advisor route streams its OWN answer to the browser AFTER the safety
    // gate has run. Streaming from the provider would put model tokens on a
    // socket before that gate, which is the one thing the design forbids
    // (§2.1 rule 5). Explicit rather than defaulted.
    stream: false,
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
    throw new OpenAIError("Caller disconnected before the request", "aborted");
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
      body: JSON.stringify(buildCompletionBody(request)),
      signal: controller.signal,
    });
  } catch (transportFailure) {
    // A flag, not the caught error's text: reading `.message` here would be a
    // disclosure read under `error-disclosure.test.ts`, and would put upstream
    // wording one `throw` away from a client. The rethrow is untouched.
    if (timedOut) {
      throw new OpenAIError(
        `Model request timed out after ${timeoutMs}ms`,
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
    throw new OpenAIError(
      `Model request failed with status ${response.status}`,
      "http",
      response.status,
    );
  }

  return parseCompletion(await response.json());
}
