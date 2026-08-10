// Ownership pins for `rate-limit-repo` (Phase 2 U9).
//
// `api_rate_limits` HAS a `user_id` column and this module never filters on it,
// which looks like the defect the rest of U9 pins against and is the opposite.
// The table is a COUNTER THAT CONSTRAINS THE USER (migration 0008's rule): the
// end user holds SELECT and nothing else, and the only write path is
// `consume_rate_limit`, a `SECURITY DEFINER` function that derives the identity
// from `auth.uid()` internally. Passing a user id from the application would be
// the privilege-escalation shape `sql-function-registry.test.ts` fails on.
//
// So what is pinned here is that the module goes through the function and does
// NOT touch the table — a future `.from("api_rate_limits").insert(...)` would be
// denied in production and must not be written in the first place.
import { describe, expect, it } from "vitest";
import { querySpy } from "./__testing__/query-spy";
import { consumeRateLimit } from "./rate-limit-repo";

describe("rate-limit-repo — writes go through the definer function, not the table", () => {
  it("calls consume_rate_limit and touches no table directly", async () => {
    const spy = querySpy({ data: 3 });
    await consumeRateLimit(spy.client, "user:u1:advisor", 60, 20);
    expect(spy.tables).toEqual([]);
    expect(spy.calls.map((c) => c.method)).toEqual(["rpc"]);
    expect(spy.calls[0].args[0]).toBe("consume_rate_limit");
  });

  it("passes the bucket key, window and limit — and no user id", async () => {
    // The absent parameter is the assertion. A `p_user_id` argument here would
    // let any caller spend another user's allowance, or clear their own.
    const spy = querySpy({ data: 1 });
    await consumeRateLimit(spy.client, "user:u1:advisor", 60, 20);
    const args = spy.calls[0].args[1] as Record<string, unknown>;
    expect(args).toEqual({
      p_bucket_key: "user:u1:advisor",
      p_window_seconds: 60,
      p_limit: 20,
    });
    expect(Object.keys(args).some((k) => k.includes("user"))).toBe(false);
  });

  it("surfaces a database error rather than failing open", async () => {
    // Failing open on a rate limiter is not a degraded mode, it is no limiter.
    const spy = querySpy({ error: { message: "boom" } });
    await expect(consumeRateLimit(spy.client, "user:u1:advisor", 60, 20)).rejects.toBeTruthy();
  });
});
