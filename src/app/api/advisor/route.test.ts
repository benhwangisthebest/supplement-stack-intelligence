// Application — route-handler tests for POST /api/advisor (Phase 1 U4).
//
// The SSE turn endpoint, and the one route in this repository whose error path
// cannot use a status code: by the time the agent loop can fail, the 200 and
// its headers are already on the wire. Phase 0 R3b replaced a streamed
// `err.message` — rendered into a role="alert" by AdvisorPanel — with the same
// generic text plus a correlation id that every 500 carries.
//
// UNTIL NOW THAT CONTRACT HAD NO ROUTE-LEVEL TEST. `error-disclosure.test.ts`
// asserts the source contains no read of `err.message`; `respond.test.ts`
// asserts `INTERNAL_ERROR_MESSAGE` is stable. Neither runs this handler, so
// neither could tell you what an actual failing turn PUTS ON THE WIRE. The
// `error` event pin below closes that gap — it reads the emitted bytes.
//
// The pre-flight key check is likewise ordering-sensitive: it must produce a
// 503 BEFORE the route commits to a 200 stream, or a missing key degrades into
// a successful-looking response carrying an error event.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotConfiguredError } from "@/lib/api/errors";
import type { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import type { AdvisorContext } from "@/types/advisor";

const getUser = vi.fn();
const runAdvisorTurn = vi.fn();
const loadAdvisorContext = vi.fn();
const reserveAdvisorTokens = vi.fn();
const getMessages = vi.fn();
const createConversation = vi.fn();
const appendMessages = vi.fn();
const settleAdvisorUsage = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/advisor/agent", () => ({
  runAdvisorTurn: (...a: unknown[]) => runAdvisorTurn(...a),
}));
// Phase 2 U25 — WIRING CHANGE, not an assertion change (U4's precedent). The
// mocked module path and class name moved with the provider swap, and the
// double now carries `usageReported`, because the route reads it to decide
// whether the ledger may settle. The stub defaults to `true`, which is what the
// pre-U25 route did unconditionally, so every existing settle assertion below
// stands unedited.
const adapterState = { usageReported: true };
vi.mock("@/lib/advisor/model-adapter", () => ({
  AdvisorModelAdapter: class {
    get usageReported() {
      return adapterState.usageReported;
    }
  },
}));
vi.mock("@/lib/advisor/context-loader", () => ({
  loadAdvisorContext: (...a: unknown[]) => loadAdvisorContext(...a),
}));
const enforceRateLimit = vi.fn();
const conversationBelongsToUser = vi.fn();
vi.mock("@/lib/api/rate-limit-guard", () => ({
  enforceRateLimit: (...a: unknown[]) => enforceRateLimit(...a),
}));
vi.mock("@/lib/advisor/repo", () => ({
  appendMessages: (...a: unknown[]) => appendMessages(...a),
  conversationBelongsToUser: (...a: unknown[]) => conversationBelongsToUser(...a),
  createConversation: (...a: unknown[]) => createConversation(...a),
  deriveTitle: (m: string) => m.slice(0, 10),
  getMessages: (...a: unknown[]) => getMessages(...a),
  reserveAdvisorTokens: (...a: unknown[]) => reserveAdvisorTokens(...a),
  settleAdvisorUsage: (...a: unknown[]) => settleAdvisorUsage(...a),
}));

import { POST } from "./route";

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

/** Collect the SSE stream into `{ event, data }` records. */
async function events(res: Response): Promise<{ event: string; data: Record<string, unknown> }[]> {
  const text = await new Response(res.body).text();
  return text
    .split("\n\n")
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1] ?? "";
      const data = /^data: (.+)$/m.exec(block)?.[1] ?? "{}";
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
}

const USER = { id: "u1" };

const CTX: AdvisorContext = {
  userId: "u1",
  profile: null,
  stack: null,
  stackItems: [],
  labMarkers: [],
  timelinePoints: [],
};

const BODY = { message: "Does my stack make sense?" };

// A syntactically valid but obviously fake value. Never a real key.
const FAKE_KEY = "test-key-not-a-real-credential";
const FAKE_BASE_URL = "https://api.openai.com";
/** Namespaced like a real gateway id, so the fixture cannot re-teach the bare form. */
const FAKE_MODEL = "test-provider/test-model-not-real";

beforeEach(() => {
  vi.clearAllMocks();
  // [U32] STUBS DO NOT CLEAN THEMSELVES UP HERE, and this line is not tidiness
  // — it is a correctness fix. `vi.stubEnv` persists past the test that set
  // it unless something unstubs, so the U32 test below that sets
  // `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1` silently disabled the new host
  // pin for every test AFTER it, including the 200 happy path. The suite went
  // green over a control that was switched off. Registered as N-67.
  vi.unstubAllEnvs();
  adapterState.usageReported = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("OPENAI_API_KEY", FAKE_KEY);
  vi.stubEnv("OPENAI_BASE_URL", FAKE_BASE_URL);
  // WIRING, not an assertion (U4's precedent): U25's follow-up made the routed
  // model a third REQUIRED setting after the first live probe found the old
  // hardcoded fallback 400s on a real gateway (N-21). Without this stub every
  // test below 503s — which is the pre-flight working, not a regression.
  vi.stubEnv("OPENAI_MODEL", FAKE_MODEL);
  loadAdvisorContext.mockResolvedValue(CTX);
  enforceRateLimit.mockResolvedValue(null);
  conversationBelongsToUser.mockResolvedValue(true);
  reserveAdvisorTokens.mockResolvedValue(25000);
  getMessages.mockResolvedValue([]);
  createConversation.mockResolvedValue({ id: "c-new" });
  appendMessages.mockResolvedValue(undefined);
  settleAdvisorUsage.mockResolvedValue(undefined);
  runAdvisorTurn.mockResolvedValue({
    answer: "Magnesium may support sleep.",
    citations: [],
    status: "answered",
    toolsUsed: ["evidence"],
    usage: { inputTokens: 10, outputTokens: 20 },
  });
});

describe("POST /api/advisor — guards before the stream", () => {
  it("returns 401 without loading context or running a turn", async () => {
    getUser.mockResolvedValue(null);

    const res = await POST(req(BODY));

    // Status is asserted BEFORE the body is parsed, deliberately. On this route
    // a bypassed auth check produces an SSE stream, so `await res.json()` first
    // fails with `Unexpected token 'e', "event: tok"…` — red for the right
    // cause but with a message that names JSON parsing rather than the leak.
    // Mutation testing produced exactly that; this ordering makes the red say
    // `expected 200 to be 401`.
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(loadAdvisorContext).not.toHaveBeenCalled();
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for an empty message", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(req({ message: "   " }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("returns 400 BAD_REQUEST — not VALIDATION_ERROR — when the body is unparseable", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST({
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as unknown as NextRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 503 NOT_CONFIGURED before committing to a stream", async () => {
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_API_KEY", "");

    const res = await POST(req(BODY));

    // Status before body, for the same reason as the 401 above: if this check
    // ever moves after the stream is built, the failure must read
    // `expected 200 to be 503`, not a JSON parse error.
    //
    // [2026-09-21, U33] THIS TEST IS WHY THE ROUTE MAY STILL CALL THE SHARED
    // RESOLVER AND THE ADAPTER MAY CALL IT AGAIN. Since U33 both sites ask
    // `resolveAiConfig()` the same question, so the route's call now LOOKS
    // redundant — and deleting it would pass every assertion about what is
    // decided, because nothing about the decision changes. What changes is
    // WHEN: the adapter's copy runs after the 200 SSE response is committed,
    // so the refusal would arrive as an `error` event on a stream that already
    // claimed success. The two lines below are the whole guard against that,
    // and they are the reason the duplication is not deduplicated.
    //
    // This route deliberately asserts no `reason`. It returns `fail(...)` and
    // never constructs a `NotConfiguredError`, so there is no object to read
    // one off — the four reasons are enumerated in
    // `src/lib/openai/config.test.ts` instead.
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe("NOT_CONFIGURED");
    expect(res.headers.get("Content-Type")).not.toContain("text/event-stream");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("returns 503 NOT_CONFIGURED when the base URL is absent but the key is not", async () => {
    // Phase 2 U25. Half-configured is not configured: a key with nowhere to
    // send it would otherwise commit to a 200 stream and fail inside the
    // adapter, turning an operational 503 into an error event on a stream the
    // client already believes succeeded.
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_BASE_URL", "");

    const res = await POST(req(BODY));

    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("NOT_CONFIGURED");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("returns 404 before ANY reservation when the conversation is not the caller's (U29, N-48)", async () => {
    // THE POINT OF THIS UNIT IS THE ORDER, NOT THE STATUS. Before U29 the
    // route reserved budget and called a paid model, and discovered ownership
    // afterwards — if at all. The status assertion alone would stay green if
    // the check were folded back into the `Promise.all` beside the
    // reservation, which is M2. Hence the not-called assertions below: they
    // are the guard, and the 404 is the symptom.
    getUser.mockResolvedValue(USER);
    conversationBelongsToUser.mockResolvedValue(false);

    const res = await POST(req({ ...BODY, conversationId: "11111111-1111-4111-8111-111111111111" }));

    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe("Conversation not found.");
    expect(reserveAdvisorTokens).not.toHaveBeenCalled();
    expect(runAdvisorTurn).not.toHaveBeenCalled();
    expect(getMessages).not.toHaveBeenCalled();
  });

  it("answers a NONEXISTENT conversation identically, to the byte (U29)", async () => {
    // A response that distinguishes "not yours" from "does not exist" is an
    // existence oracle for other users' conversation ids. One predicate, one
    // branch, one literal — so the two cases cannot drift apart later.
    getUser.mockResolvedValue(USER);

    conversationBelongsToUser.mockResolvedValue(false);
    const foreign = await POST(req({ ...BODY, conversationId: "11111111-1111-4111-8111-111111111111" }));
    const foreignBody = await foreign.text();

    conversationBelongsToUser.mockResolvedValue(false);
    const missing = await POST(req({ ...BODY, conversationId: "22222222-2222-4222-8222-222222222222" }));
    const missingBody = await missing.text();

    expect(foreign.status).toBe(missing.status);
    expect(foreignBody).toBe(missingBody);
    expect(foreignBody.length).toBe(missingBody.length);
  });

  it("does not check ownership when no conversation id is supplied (U29)", async () => {
    // A first turn has no conversation yet. The predicate applies only to a
    // non-null id; calling it with null would turn every new conversation
    // into a 404.
    getUser.mockResolvedValue(USER);

    const res = await POST(req({ ...BODY, conversationId: undefined }));

    expect(res.status).toBe(200);
    expect(conversationBelongsToUser).not.toHaveBeenCalled();
  });

  it("returns 503 NOT_CONFIGURED when the base URL is not first-party (U32, N-63)", async () => {
    // The pin's whole point is that this is a PRE-FLIGHT refusal. Left to the
    // client alone, a disallowed host would first be noticed inside the paid
    // call — after the 200 SSE response may already be committed, turning an
    // operational 503 into an error event on a stream that claimed success.
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_BASE_URL", "https://gw.example");

    const res = await POST(req(BODY));

    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("NOT_CONFIGURED");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("proceeds when the override is set for a non-first-party host (U32)", async () => {
    // The escape hatch stays and stops being silent. A deployment pointing at
    // a proxy keeps working BY SETTING THE VARIABLE.
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_BASE_URL", "https://gw.example");
    vi.stubEnv("OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL", "1");

    const res = await POST(req(BODY));

    expect(res.status).not.toBe(503);
  });

  it("returns 503 NOT_CONFIGURED when the model id is absent (N-21)", async () => {
    // The defect this replaces was not caught by any test: the adapter carried
    // a hardcoded default, so an unset model id produced a CONFIDENT call with
    // an id the gateway rejects — a 400 on every turn, from a green suite. A
    // model id belongs to the gateway instance, so "unset" is now the same
    // operational state as a missing key rather than a silent wrong guess.
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_MODEL", "");

    const res = await POST(req(BODY));

    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("NOT_CONFIGURED");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("names no environment variable in the 503 body", async () => {
    // §2.3: the client is told the situation, never the shape of the server's
    // configuration. The constant survived the provider swap unchanged, so this
    // pins that the swap did not reintroduce an env name into user-facing copy.
    getUser.mockResolvedValue(USER);
    vi.stubEnv("OPENAI_API_KEY", "");

    const body = await (await POST(req(BODY))).json();

    expect(body.error.message).not.toMatch(
      // OPENAI is the LIVE prefix (U31) and must lead. OMNIROUTE and ANTHROPIC are
      // retired prefixes kept deliberately: a guard that only knows today's names
      // stops covering a variable the moment it is renamed, which is exactly what
      // U31's rename did to this line before it was caught.
      /OPENAI|OMNIROUTE|ANTHROPIC|API_KEY|BASE_URL/i,
    );
  });
});

describe("POST /api/advisor — the stream", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("returns a 200 SSE response with the right headers", async () => {
    const res = await POST(req(BODY));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  });

  it("streams tokens, citations and a done event carrying the conversation id", async () => {
    const evts = await events(await POST(req(BODY)));

    const tokens = evts.filter((e) => e.event === "token").map((e) => e.data.delta).join("");
    expect(tokens).toBe("Magnesium may support sleep.");
    expect(evts.some((e) => e.event === "citations")).toBe(true);

    const done = evts.find((e) => e.event === "done");
    expect(done?.data).toEqual({
      conversationId: "c-new",
      status: "answered",
      toolsUsed: ["evidence"],
    });
  });

  it("persists the turn under the caller's own id and meters usage", async () => {
    await events(await POST(req(BODY)));

    expect(createConversation).toHaveBeenCalledWith({}, "u1", expect.any(String));
    expect(appendMessages).toHaveBeenCalledWith({}, "u1", "c-new", [
      { role: "user", content: BODY.message, citations: [] },
      { role: "assistant", content: "Magnesium may support sleep.", citations: [] },
    ]);
    // U4: the reservation is settled against the real usage, and the id is NOT
    // passed — `settle_advisor_tokens` derives it from auth.uid(), so a caller
    // cannot settle someone else's ledger.
    expect(settleAdvisorUsage).toHaveBeenCalledWith({}, 25000, {
      inputTokens: 10,
      outputTokens: 20,
    });
  });

  it("answers 429 and spends nothing when the rate limit refuses (U5)", async () => {
    // Gate B1 clause (iv). The assertions that matter are the NEGATIVE ones: a
    // refused request must not reserve budget and must not reach the model, or
    // the limiter costs money while appearing to save it.
    enforceRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: { code: "RATE_LIMITED" } }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );

    const res = await POST(req(BODY));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(reserveAdvisorTokens).not.toHaveBeenCalled();
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });

  it("settles the reservation when the client disconnects (U6)", async () => {
    // The billing half of "stops the loop and the billing". Skipping the settle
    // on abort would leave the whole reservation charged for the day, so a user
    // on a flaky connection would lose their budget to turns that produced
    // nothing. `result.usage` is what the loop really spent before stopping.
    runAdvisorTurn.mockResolvedValue({
      answer: "",
      citations: [],
      status: "aborted",
      toolsUsed: [],
      usage: { inputTokens: 40, outputTokens: 7 },
    });

    await events(await POST(req(BODY)));

    expect(settleAdvisorUsage).toHaveBeenCalledWith({}, 25000, {
      inputTokens: 40,
      outputTokens: 7,
    });
    // And nothing is persisted or streamed to a connection that is gone.
    expect(appendMessages).not.toHaveBeenCalled();
  });

  it("does NOT settle when the provider did not report usage (U25)", async () => {
    // The single most valuable pin in U25, and the difference between "never
    // estimate" and a free advisor.
    //
    // Behind a routing gateway a completion can come back with no `usage`
    // object. The old adapter mapped that to `{0,0}` and the route settled
    // anyway — which RELEASES the entire reservation for a turn that really
    // spent money. Do that on every turn and the daily budget stops binding
    // while the suite stays green, because nothing on the wire looks wrong.
    //
    // The reservation stays charged instead: over-charging by at most one
    // reservation, never under-charging, exactly as a thrown turn already does.
    adapterState.usageReported = false;

    const evts = await events(await POST(req(BODY)));

    expect(settleAdvisorUsage).not.toHaveBeenCalled();
    // And the turn still SUCCEEDS. Refusing to settle is a ledger decision, not
    // a failure: the user gets their grounded answer either way.
    expect(appendMessages).toHaveBeenCalled();
    expect(evts.find((e) => e.event === "done")?.data.status).toBe("answered");
  });

  it("does NOT settle an ABORTED turn whose usage was unreported (U25)", async () => {
    // The same rule on U6's disconnect path. Settling here would hand back the
    // reservation for a turn that made paid calls and then lost its client —
    // the one case where nobody is watching the response at all.
    adapterState.usageReported = false;
    runAdvisorTurn.mockResolvedValue({
      answer: "",
      citations: [],
      status: "aborted",
      toolsUsed: [],
      usage: { inputTokens: 40, outputTokens: 7 },
    });

    await events(await POST(req(BODY)));

    expect(settleAdvisorUsage).not.toHaveBeenCalled();
    expect(appendMessages).not.toHaveBeenCalled();
  });

  it("fails CLOSED when the adapter carries no usageReported at all", async () => {
    // A stale test double or a future adapter that forgets the property must
    // not read as "usage was reported". `?? false` in the route is what makes
    // the missing-property case over-charge rather than release.
    // @ts-expect-error — deliberately modelling an adapter without the property.
    adapterState.usageReported = undefined;

    await events(await POST(req(BODY)));

    expect(settleAdvisorUsage).not.toHaveBeenCalled();
  });

  it("declares maxDuration — PAID_ROUTE_CONFIG", async () => {
    // A paid, tool-looping SSE route with no wall-clock ceiling runs until the
    // platform's default kills it, and every second is billable. Asserted on the
    // source because the value is a module-level export the handler never reads;
    // U7 generalises this across the derived paid-route set.
    const source = readFileSync(new URL("./route.ts", import.meta.url).pathname, "utf8");
    expect(source, "PAID_ROUTE_CONFIG: /api/advisor declares no maxDuration").toMatch(
      /export const maxDuration\s*=\s*\d+/,
    );
  });

  it("checks the limit BEFORE reserving budget, not after", async () => {
    // Ordering, pinned separately: reserving first would take the reservation
    // off the ledger and then refuse, so a rate-limited caller would burn their
    // own daily budget doing nothing. The call order is the proof.
    const order: string[] = [];
    enforceRateLimit.mockImplementation(async () => {
      order.push("limit");
      return null;
    });
    reserveAdvisorTokens.mockImplementation(async () => {
      order.push("reserve");
      return 25000;
    });

    await events(await POST(req(BODY)));

    expect(order).toEqual(["limit", "reserve"]);
  });

  it("ships proposals with their cumulative safety flags when the loop halts", async () => {
    runAdvisorTurn.mockResolvedValue({
      answer: "I can add that.",
      citations: [],
      status: "proposed",
      toolsUsed: [],
      usage: { inputTokens: 1, outputTokens: 1 },
      proposals: [{ type: "add_item" }],
      newSafetyFlags: [{ severity: "warning", title: "Mild" }],
    });

    const evts = await events(await POST(req(BODY)));
    const proposals = evts.find((e) => e.event === "proposals");

    expect(proposals?.data).toEqual({
      proposals: [{ type: "add_item" }],
      safetyFlags: [{ severity: "warning", title: "Mild" }],
    });
  });
});

describe("POST /api/advisor — the R3b error-event contract", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("streams the GENERIC message plus a correlation id, never the exception text", async () => {
    // This is the pin the contract never had. error-disclosure.test.ts proves
    // the source contains no `err.message` read; respond.test.ts proves the
    // constant is stable. Only this reads what actually goes on the wire.
    runAdvisorTurn.mockRejectedValue(
      new Error("Anthropic API 401: invalid x-api-key sk-ant-SECRETVALUE"),
    );

    const res = await POST(req(BODY));
    const evts = await events(res);
    const error = evts.find((e) => e.event === "error");

    expect(error).toBeDefined();
    expect(error?.data.message).toBe("An unexpected internal error occurred.");
    expect(typeof error?.data.correlationId).toBe("string");
    expect((error?.data.correlationId as string).length).toBeGreaterThan(0);

    // The whole wire payload, not just the one field — a leak anywhere in the
    // stream is still a leak.
    const wire = JSON.stringify(evts);
    expect(wire).not.toContain("SECRETVALUE");
    expect(wire).not.toContain("x-api-key");
    expect(wire).not.toContain("Anthropic API 401");
  });

  it("still emits 200 + SSE for that failure — the status code is long gone", async () => {
    runAdvisorTurn.mockRejectedValue(new Error("boom"));

    const res = await POST(req(BODY));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
  });

  it("emits no token or done event when the turn fails", async () => {
    runAdvisorTurn.mockRejectedValue(new Error("boom"));

    const evts = await events(await POST(req(BODY)));

    expect(evts.some((e) => e.event === "token")).toBe(false);
    expect(evts.some((e) => e.event === "done")).toBe(false);
    expect(appendMessages).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ P2-R4 ----
// Check finding P2-1's remaining half, found by `ecc:security-reviewer`'s (A)
// enumeration at landing (d1).
//
// `POST` is deliberately NOT wrapped in `handle()` — it must be able to answer a
// status code before the SSE stream is committed, which `handle()` cannot do. The
// cost was that everything between `createClient()` and the `Promise.all` ran
// with no `try`/`catch` at all: a throw from `createClient`, `enforceRateLimit`,
// `conversationBelongsToUser`, `reserveAdvisorTokens`, `loadAdvisorContext` or
// `getMessages` escaped the handler entirely and became a FRAMEWORK-generated
// 500 — no correlation id, no log record, and invisible to `FIVE_XX_IS_LOGGED`,
// which scans for literal 5xx CONSTRUCTION and cannot see a reachable throw.
//
// The stream has not started in this window, so the SSE constraint that keeps
// `handle()` out does not apply: a JSON 500 is still expressible here.
describe("P2-R4 — a throw before the stream is committed is a correlated JSON 500", () => {
  const THROWERS = [
    ["enforceRateLimit", () => enforceRateLimit.mockRejectedValue(new Error("rate limiter is down"))],
    ["reserveAdvisorTokens", () => reserveAdvisorTokens.mockRejectedValue(new Error("ledger is down"))],
    ["loadAdvisorContext", () => loadAdvisorContext.mockRejectedValue(new Error("context load failed"))],
  ] as const;

  it.each(THROWERS)("a throw from %s answers 500 with a correlation id", async (_name, arrange) => {
    arrange();
    const res = await POST(req(BODY));

    expect(res.status, "the window before the stream must answer a status code, not escape the handler").toBe(500);
    const json = (await res.json()) as { error?: { code?: string; message?: string; correlationId?: string } };
    expect(json.error?.correlationId, "a 500 with no id is a failure nobody can look up").toEqual(
      expect.any(String),
    );
    expect(json.error?.message, "the client gets the generic message, never the driver text").not.toMatch(
      /down|failed/i,
    );
  });

  it("a NotConfiguredError from this window stays a 503, not a 500", async () => {
    // [2026-09-22, ecc:security-reviewer at (d1b)] The taxonomy regression this
    // landing nearly shipped. `createClient()` and `enforceRateLimit()` both
    // reach `getSupabaseEnv()`, which throws `NotConfiguredError` when Supabase
    // env is unset. An unconditional catch answered 500 for a condition every
    // other route answers 503 — the same misconfiguration reported two ways
    // depending on the route hit. And it would have minted an id for a DECLARED
    // OPERATIONAL STATE, which is exactly what U1's ruling forbids.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    enforceRateLimit.mockRejectedValue(
      new NotConfiguredError("Supabase is not configured.", "missing-key"),
    );

    const res = await POST(req(BODY));
    const json = (await res.json()) as { error?: { code?: string; correlationId?: string } };

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.correlationId, "a declared operational state mints no id (U1)").toBeUndefined();
    expect(spy, "a declared operational state writes no record (U1, T5)").not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("the thrown error reaches the server log, not just the response", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    enforceRateLimit.mockRejectedValue(new Error("rate limiter is down"));

    const res = await POST(req(BODY));
    const json = (await res.json()) as { error?: { correlationId?: string } };

    expect(spy, "the record is what makes the id worth quoting").toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls), "the log must carry the id the client was given").toContain(
      String(json.error?.correlationId),
    );
    spy.mockRestore();
  });
});

// ------------------------------------------ P2-R4, widened by owner ruling ----
// [2026-09-22] `getUser()` IS THE FIRST STATEMENT, AND IT WAS OUTSIDE THE
// WINDOW THE LANDING ABOVE CLOSED.
//
// Found by `ecc:security-reviewer`'s final (A) re-enumeration, which was given
// the expected answer "item 7 only" and falsified it. The guard added above
// opens at `createClient()`; `getUser()` runs one statement earlier and is not
// in any `try`. It is the same defect class, not a smaller one — and the route
// comment's own list of what it closed did not name it.
//
// The throw is reachable, not theoretical. `getUser()` calls `cookies()`
// UNCONDITIONALLY (U28's dynamic marker) and then `supabase.auth.getUser()`,
// whose SDK catch swallows only `isAuthError(error)` and re-throws everything
// else. Its docstring said "never throws on missing session/config", which is
// true of the two causes it names and was read as a broader promise than it
// makes.
describe("P2-R4 widened — the first statement is inside the window too", () => {
  it("a throw from getUser answers 500 with a correlated record", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUser.mockRejectedValueOnce(new Error("auth-js re-threw a non-AuthError"));

    const res = await POST(req(BODY));

    expect(res.status, "a throw from the first statement must not escape the handler").toBe(500);
    const json = (await res.json()) as { error?: { message?: string; correlationId?: string } };
    expect(json.error?.correlationId).toEqual(expect.any(String));
    expect(json.error?.message, "the client never sees the auth driver text").not.toMatch(/auth-js|AuthError/i);
    expect(spy, "the record is what makes the id worth quoting").toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).toContain(String(json.error?.correlationId));
    spy.mockRestore();
  });

  it("a NotConfiguredError from getUser stays a 503, not a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUser.mockRejectedValueOnce(new NotConfiguredError("Supabase is not configured.", "missing-key"));

    const res = await POST(req(BODY));
    const json = (await res.json()) as { error?: { code?: string; correlationId?: string } };

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.correlationId, "a declared operational state mints no id (U1)").toBeUndefined();
    expect(spy, "a declared operational state writes no record (U1, T5)").not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an unauthenticated caller still gets 401 before anything is parsed", async () => {
    // THE ORDER IS PART OF THE FIX. Guarding `getUser()` must not be done by
    // moving it after the body parse and the NOT_CONFIGURED pre-flight: that
    // would tell an anonymous caller whether their body validated and whether
    // the AI is configured. §2.3 rule 11 is about the 401; this is about what
    // precedes it.
    getUser.mockResolvedValueOnce(null);

    const res = await POST(req({ message: 42 }));
    const json = (await res.json()) as { error?: { code?: string } };

    expect(res.status).toBe(401);
    expect(json.error?.code).toBe("UNAUTHORIZED");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
  });
});
