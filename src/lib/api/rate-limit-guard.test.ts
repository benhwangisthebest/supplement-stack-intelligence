// The seam between the pure limiter and the HTTP boundary (Phase 2 U5).
//
// Both paid routes mock `enforceRateLimit` wholesale, which is right for them —
// they are asserting their own ordering and their own 429 bytes. But it leaves
// the guard's OWN wiring untested: which policy it picks, what it does with the
// repo's answer, and what it does when the caller cannot be attributed. That is
// this file.
import { beforeEach, describe, expect, it, vi } from "vitest";

const consumeRateLimit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/rate-limit-repo", () => ({
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
}));

import { enforceRateLimit } from "./rate-limit-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/advisor", { headers });

beforeEach(() => vi.clearAllMocks());

describe("enforceRateLimit", () => {
  it("returns null — meaning proceed — while the window has room", async () => {
    consumeRateLimit.mockResolvedValue(1);
    expect(await enforceRateLimit("advisor", "u1", req())).toBeNull();
  });

  it("returns 429 with Retry-After once the window is full", async () => {
    // The SQL's contract: 0 means the window was already full. This is the only
    // place that convention becomes a status code.
    consumeRateLimit.mockResolvedValue(0);

    const res = await enforceRateLimit("advisor", "u1", req());

    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_POLICIES.advisor.windowSeconds),
    );
    expect((await res!.json()).error.code).toBe("RATE_LIMITED");
  });

  it("passes the route's own policy, not another route's", async () => {
    consumeRateLimit.mockResolvedValue(1);
    await enforceRateLimit("lab-import-extract", "u1", req());

    const policy = RATE_LIMIT_POLICIES["lab-import-extract"];
    expect(consumeRateLimit).toHaveBeenCalledWith(
      {},
      "user:u1:lab-import-extract",
      policy.windowSeconds,
      policy.limit,
    );
  });

  it("keys an authenticated caller by id, ignoring a spoofable header", async () => {
    consumeRateLimit.mockResolvedValue(1);
    await enforceRateLimit("advisor", "u1", req({ "x-forwarded-for": "9.9.9.9" }));
    expect(consumeRateLimit).toHaveBeenCalledWith({}, "user:u1:advisor", 60, 20);
  });

  it("keys an anonymous caller by the LAST forwarded hop", async () => {
    // The trap, at the boundary rather than only in the unit: `split(",")[0]`
    // would key this on "1.1.1.1", which the caller wrote.
    consumeRateLimit.mockResolvedValue(1);
    await enforceRateLimit("advisor", null, req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));
    expect(consumeRateLimit).toHaveBeenCalledWith({}, "ip:203.0.113.7:advisor", 60, 20);
  });

  it("refuses an unattributable caller instead of pooling them", async () => {
    // No session and no trustworthy address. Pooling every such caller into one
    // bucket would let one of them exhaust the limit for all of them; refusing
    // is the safe direction, and the counter is never touched.
    const res = await enforceRateLimit("advisor", null, req());

    expect(res?.status).toBe(429);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });
});
