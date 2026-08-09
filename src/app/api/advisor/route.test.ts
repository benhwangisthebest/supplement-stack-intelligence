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
vi.mock("@/lib/advisor/claude-adapter", () => ({
  AdvisorClaudeAdapter: class {},
}));
vi.mock("@/lib/advisor/context-loader", () => ({
  loadAdvisorContext: (...a: unknown[]) => loadAdvisorContext(...a),
}));
const enforceRateLimit = vi.fn();
vi.mock("@/lib/api/rate-limit-guard", () => ({
  enforceRateLimit: (...a: unknown[]) => enforceRateLimit(...a),
}));
vi.mock("@/lib/advisor/repo", () => ({
  appendMessages: (...a: unknown[]) => appendMessages(...a),
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("API_ANTHROPIC_KEY", FAKE_KEY);
  loadAdvisorContext.mockResolvedValue(CTX);
  enforceRateLimit.mockResolvedValue(null);
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
    vi.stubEnv("API_ANTHROPIC_KEY", "");

    const res = await POST(req(BODY));

    // Status before body, for the same reason as the 401 above: if this check
    // ever moves after the stream is built, the failure must read
    // `expected 200 to be 503`, not a JSON parse error.
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe("NOT_CONFIGURED");
    expect(res.headers.get("Content-Type")).not.toContain("text/event-stream");
    expect(runAdvisorTurn).not.toHaveBeenCalled();
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
    expect(appendMessages).toHaveBeenCalledWith({}, "c-new", [
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
