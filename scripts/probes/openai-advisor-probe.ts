/**
 * OP-4(a) + OP-4(c) — the advisor probe. OWNER-RUN, never CI.
 *
 * Ruling 3 (2026-08-08) refuses live credentials in a public repository, so
 * every claim about the live gateway has to come from a dated record a person
 * produced. This script produces one.
 *
 * IT ANSWERS TWO QUESTIONS NO UNIT TEST CAN:
 *   (a) does the routed model return `usage.prompt_tokens` /
 *       `usage.completion_tokens` on every response, or does it omit them?
 *       This settles the absent-usage semantics that `model-adapter.ts` and the
 *       advisor route's settle gate are built around — against reality, not
 *       against a README.
 *   (c) does the tool-calling round trip work end to end against the real
 *       gateway, rather than against a scripted mock written from the same
 *       reading of the protocol as the code it tests?
 *
 * NO SECRETS. The key is read from the environment and is never printed,
 * written, defaulted, or included in any error text.
 *
 *   npm run probe:advisor
 *
 * `OPENAI_*` settings are loaded from a gitignored `.env.local` — names
 * only are reported, never values, and nothing outside that prefix is exported
 * (so the service-role key in the same file stays out of this process, §2.3
 * rule 14). An explicit shell value still wins over the file:
 *
 *   OPENAI_MODEL=claude/claude-haiku-4-5-20251001 npm run probe:advisor
 *
 * Paste the output into a copy of
 * `docs/05-qa/openai-probe-record.template.md`.
 */
import { loadProbeEnv, summarise } from "./load-env";
import {
  buildCompletionBody,
  completionsUrl,
  createCompletion,
  baseUrlPermitted,
} from "@/lib/openai/client";
import { AdvisorModelAdapter } from "@/lib/advisor/model-adapter";
import { ADVISOR_TOOLS } from "@/lib/advisor/tools";

// FIRST statement in the module body, before any `process.env` read below it.
// ES imports are evaluated ahead of the body, and none of the imports above
// reads a setting at module load, so this is the earliest useful point.
const LOADED_ENV = loadProbeEnv();

const BASE_URL = process.env.OPENAI_BASE_URL;
const API_KEY = process.env.OPENAI_API_KEY;
/**
 * The routed model id. `OPENAI_MODEL` is the SAME name the application reads,
 * deliberately — a probe reading a different variable is a probe that can pass
 * while the app fails, and that is exactly how this defect survived: the probe
 * read `OMNIROUTE_ADVISOR_MODEL`, the operator set `OMNIROUTE_MODEL`, and the
 * hardcoded fallback answered instead of anything reporting a mismatch.
 *
 * ---------------------------------------------------------------------------
 * [2026-09-14, U31] THE DEFAULT IS GONE — it was the last hardcoded model id in
 * the repository.
 * ---------------------------------------------------------------------------
 * It held `"cc/claude-haiku-4-5-20251001"`: a real id, but an *Omniroute*-
 * namespaced *Claude* id, on a probe that now talks to OpenAI. It survived U25
 * only because `NO_PINNED_MODEL_ID` scans `src/` and this file is in `scripts/`.
 *
 * It is DELETED rather than re-pointed at an OpenAI id, for N-21's reason
 * exactly: a default here is a claim about an account this code has never
 * contacted, and the probe exists precisely to find out whether such a claim
 * holds. A probe that falls back to a guess can report success for a model the
 * operator never configured — which is the failure the paragraph above already
 * describes once. Unset now fails loudly, the same way `src/` does.
 */
const MODEL = requireModel();

/**
 * Hoisted so `MODEL` above is typed `string`, not `string | undefined` — a
 * module-level `if` does not narrow a const inside later function bodies.
 */
function requireModel(): string {
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    console.error(
      "OPENAI_MODEL is not set. There is deliberately no default (U31; see N-21).\n" +
        "Set it to an id from your account's /v1/models and re-run.",
    );
    process.exit(1);
  }
  return model;
}

/** A question that should make a grounded advisor reach for a tool. */
const TOOL_BAIT = "Is there an interaction between magnesium and zinc?";

function line(label: string, value: unknown): void {
  console.log(`${label.padEnd(34)} ${String(value)}`);
}

function requireConfig(): { baseUrl: string; apiKey: string } {
  if (!BASE_URL || !API_KEY) {
    console.error(
      "OPENAI_BASE_URL and OPENAI_API_KEY must both be set.\n" +
        `Looked in .env.local and the shell — ${summarise(LOADED_ENV)}\n` +
        "Neither value is ever printed by this script.",
    );
    process.exit(1);
  }
  // [U32, N-63] The probes are outside `SOLE_PAID_CLIENT` by design — they are
  // owner-run diagnostics the application cannot reach — but they dial the
  // same host with the same credential, so the pin has to reach them too. An
  // override here is the same explicit act it is in production: set the
  // variable, and the client logs where the bytes are going.
  const allowNonFirstParty =
    process.env.OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL === "1";
  if (!baseUrlPermitted(BASE_URL, allowNonFirstParty)) {
    console.error(
      `OPENAI_BASE_URL is not OpenAI's first-party host, and ` +
        `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL is not set. Refusing to probe.\n` +
        "The host is not printed here; it is in your .env.local.",
    );
    process.exit(1);
  }
  return { baseUrl: BASE_URL, apiKey: API_KEY };
}

/**
 * STEP 1 — RAW. A direct request, reporting the response's own field names.
 *
 * This step deliberately bypasses `parseCompletion`: the whole question is what
 * the gateway actually sends, and a parser can only report what it already
 * expects. The URL still comes from `completionsUrl`, so the probe cannot drift
 * from the application's endpoint.
 */
async function rawShape(cfg: { baseUrl: string; apiKey: string }): Promise<void> {
  console.log("\n── STEP 1 · raw response shape (answers OP-4(a)) ──");

  const response = await fetch(completionsUrl(cfg.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    // [2026-09-18, U31 / N-58] BUILT BY PRODUCTION, NOT BY THIS FILE.
    // This body used to be hand-rolled here and still said `max_tokens`, which
    // U31 replaced with `max_completion_tokens`; it 400'd on 2026-09-18 while
    // steps 2 and 3 — which go through the client — passed. A raw step exists to
    // bypass the PARSER, not the REQUEST BUILDER, and re-authoring the body made
    // it measure this file's staleness instead of the provider.
    // Red evidence: `docs/05-qa/2026-09-18-u31-openai-probe-record.md` §2.
    body: JSON.stringify(
      buildCompletionBody({
        model: MODEL,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
        maxTokens: 16,
      }),
    ),
  });

  line("http status", response.status);
  if (!response.ok) {
    line("RESULT", "FAILED — the gateway rejected the request");
    console.log(
      "  Response body deliberately not printed: an upstream 401 body can echo a key.",
    );
    return;
  }

  const body = (await response.json()) as Record<string, unknown>;
  const usage = body.usage as Record<string, unknown> | undefined;

  line("top-level keys", Object.keys(body).sort().join(", "));
  line("model echoed by the gateway", body.model ?? "(absent)");
  line("usage present?", usage ? "YES" : "NO — this is the case that matters");
  if (usage) {
    line("usage keys", Object.keys(usage).sort().join(", "));
    line("prompt_tokens", `${typeof usage.prompt_tokens} ${String(usage.prompt_tokens)}`);
    line("completion_tokens", `${typeof usage.completion_tokens} ${String(usage.completion_tokens)}`);
  }
  console.log(
    usage
      ? "  → the ledger can settle: `readUsage` will map these and `usageReported` stays true."
      : "  → `readUsage` returns null, `usageReported` goes false, and the route KEEPS the\n" +
        "    reservation rather than settling against zeros. Confirm that is acceptable\n" +
        "    operationally, or the budget over-charges on every turn.",
  );
}

/** STEP 2 — the application's own client, on the same call. */
async function throughClient(cfg: { baseUrl: string; apiKey: string }): Promise<void> {
  console.log("\n── STEP 2 · through src/lib/openai/client.ts ──");

  const result = await createCompletion(cfg, {
    model: MODEL,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    maxTokens: 16,
  });

  line("text length", result.text.length);
  line("usage parsed as", result.usage === null ? "null (UNREPORTED)" : JSON.stringify(result.usage));
  line(
    "agrees with step 1?",
    "compare by eye — a disagreement means `readUsage` is stricter than the gateway",
  );
}

/**
 * STEP 3 — the real adapter, two steps, with the real tool schemas
 * (answers OP-4(c)).
 *
 * The tool RESULT is fabricated on purpose: this probes transport and protocol,
 * not grounding. Running a real handler would need a database and a user, and
 * would tell us nothing more about the wire.
 */
async function toolRoundTrip(): Promise<void> {
  console.log("\n── STEP 3 · tool round trip through the real adapter (OP-4(c)) ──");

  const adapter = new AdvisorModelAdapter({ model: MODEL });

  const first = await adapter.next({
    system:
      "You answer only from tool results. Call a tool before answering. Never guess.",
    messages: [{ role: "user", content: TOOL_BAIT }],
    tools: ADVISOR_TOOLS,
    toolResults: [],
  });

  line("tools offered", ADVISOR_TOOLS.length);
  line("tool calls returned", first.toolCalls.length);
  line("tool names", first.toolCalls.map((c) => c.name).join(", ") || "(none)");
  line("arguments parsed to objects", JSON.stringify(first.toolCalls.map((c) => c.input)));
  line("usageReported after step 1", adapter.usageReported);

  if (first.toolCalls.length === 0) {
    console.log(
      "  → NO TOOL CALL. Either the model declined (retry / try another model id), or the\n" +
        "    tool schema is not reaching it. Check `tools` in step 1's request shape before\n" +
        "    concluding the round trip fails — a model may legitimately answer directly.",
    );
    return;
  }

  const second = await adapter.next({
    system:
      "You answer only from tool results. Call a tool before answering. Never guess.",
    messages: [{ role: "user", content: TOOL_BAIT }],
    tools: ADVISOR_TOOLS,
    toolResults: first.toolCalls.map((c) => ({
      toolCallId: c.id,
      content: JSON.stringify({ ok: true, data: { note: "probe fixture" }, citations: [] }),
    })),
  });

  line("second step produced text", second.text.length > 0 ? "YES" : "NO");
  line("usageReported after step 2", adapter.usageReported);
  console.log(
    "  → a non-empty second-step answer means assistant tool_calls + role:'tool' messages\n" +
      "    were accepted. That is the whole of OP-4(c).",
  );
}

async function main(): Promise<void> {
  const cfg = requireConfig();

  console.log("OpenAI advisor probe — U31 (shape inherited from OP-4(a)/(c))");
  // Names and sources only. Safe to paste into the probe record.
  line("settings", summarise(LOADED_ENV));
  line("base URL host", new URL(cfg.baseUrl).host);
  line("model requested (effective)", MODEL);
  // Not a conditional: `requireModel()` exits 1 when OPENAI_MODEL is unset, so
  // the false branch was unreachable AND named a "probe default" that U31
  // deleted (N-53). An unreachable string asserting a behaviour the code does
  // not have is §2.2 rule 7 at diagnostic scale. Matches the lab-import probe.
  line("model source", "OPENAI_MODEL (there is no probe default — U31)");
  line("api key", "read from env; not printed, not written");

  await rawShape(cfg);
  await throughClient(cfg);
  await toolRoundTrip();

  console.log("\nDone. Record this output in a dated copy of");
  console.log("docs/05-qa/openai-probe-record.template.md");
}

main().catch((error: unknown) => {
  // Printed in full: this is an owner-run diagnostic on the owner's own
  // terminal, not an API response, so §2.3 rule 13's boundary does not apply.
  // The key is not in the error — the client never puts it there, and no
  // response body is read on a failure path.
  console.error("\nPROBE FAILED:", error);
  process.exit(1);
});
