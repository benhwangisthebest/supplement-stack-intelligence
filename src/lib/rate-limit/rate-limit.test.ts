import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_POLICIES,
  bucketKey,
  decide,
  trustedClientIp,
} from "./index";

describe("trustedClientIp — the x-forwarded-for trap (§4 rule 8)", () => {
  it("takes the LAST hop, not the first", () => {
    // THE test in this file. `split(",")[0]` — the spelling almost every example
    // on the internet shows — returns "1.1.1.1" here, which is whatever the
    // client wrote. The platform appends the address that actually connected,
    // so the trustworthy element is the last one.
    expect(trustedClientIp("1.1.1.1, 10.0.0.1, 203.0.113.7")).toBe("203.0.113.7");
  });

  it("is not fooled by a spoofed header — two spoofs share one bucket", () => {
    // The consequence, stated as the property that matters rather than as a
    // parser detail: an attacker varying the header must NOT get a fresh bucket.
    const a = bucketKey("advisor", { forwardedFor: "attacker-a, 203.0.113.7" });
    const b = bucketKey("advisor", { forwardedFor: "attacker-b, 203.0.113.7" });
    expect(a).toBe(b);
    expect(a).toBe("ip:203.0.113.7:advisor");
  });

  it("handles a single-hop header", () => {
    expect(trustedClientIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it("tolerates whitespace and empty segments", () => {
    expect(trustedClientIp("  1.1.1.1 ,, 203.0.113.7  ")).toBe("203.0.113.7");
  });

  it.each([
    ["absent", null],
    ["undefined", undefined],
    ["empty", ""],
    ["only separators", " , , "],
  ])("returns null for a %s header rather than inventing a placeholder", (_l, value) => {
    // Returning "unknown" here would bucket every anonymous caller together, so
    // one of them could exhaust the limit for all of them.
    expect(trustedClientIp(value)).toBeNull();
  });
});

describe("bucketKey", () => {
  it("prefers the authenticated user id, which cannot be spoofed", () => {
    expect(bucketKey("advisor", { userId: "u1", forwardedFor: "9.9.9.9" })).toBe(
      "user:u1:advisor",
    );
  });

  it("separates routes, so exhausting one limit leaves the other usable", () => {
    expect(bucketKey("advisor", { userId: "u1" })).not.toBe(
      bucketKey("lab-import-extract", { userId: "u1" }),
    );
  });

  it("returns null when there is neither a session nor a trustworthy address", () => {
    // The caller must decide what to do with "unattributable"; silently sharing
    // one bucket is the failure this avoids.
    expect(bucketKey("advisor", {})).toBeNull();
  });
});

describe("decide", () => {
  const policy = RATE_LIMIT_POLICIES.advisor;

  it("allows a positive count — the SQL returns the count after this request", () => {
    expect(decide(1, policy)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(decide(policy.limit, policy)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("refuses 0, which is the SQL's 'window already full'", () => {
    expect(decide(0, policy)).toEqual({
      allowed: false,
      retryAfterSeconds: policy.windowSeconds,
    });
  });

  it("refuses a negative count rather than treating it as truthy", () => {
    // `count > 0` and `!!count` agree today and disagree the moment the SQL
    // returns -1 for anything. Pinned so the convention is the function's, not
    // each call site's.
    expect(decide(-1, policy).allowed).toBe(false);
  });
});

describe("RATE_LIMIT_POLICIES", () => {
  it("covers exactly the two routes that call a paid external API", () => {
    // Bound to reality by PAID_API_BUDGET (U7), which derives the paid-route set
    // from the import graph. This asserts the policy table has not drifted from
    // it — a route added there with no policy here would have no limit.
    expect(Object.keys(RATE_LIMIT_POLICIES).sort()).toEqual([
      "advisor",
      "lab-import-extract",
    ]);
  });

  it("declares a positive window and limit for each", () => {
    for (const [name, p] of Object.entries(RATE_LIMIT_POLICIES)) {
      expect(p.windowSeconds, name).toBeGreaterThan(0);
      expect(p.limit, name).toBeGreaterThan(0);
    }
  });
});

describe("the limiter's own race — a limiter with U4's defect is not a limiter", () => {
  // The counting is a single `insert … on conflict do update … where … returning`
  // in migration 0009, for exactly the reason U4's reservation is: PostgREST
  // cannot express `col = col + n`, so any client-side spelling is a
  // read-then-write with a window in it.
  //
  // Same treatment as U4: a STATEFUL fake that yields at the start of every
  // operation, so concurrent callers genuinely interleave. A constant-returning
  // mock cannot tell an atomic limiter from a racy one — Phase 1 U10's §6.2.2
  // failure, which is why this is here and not assumed.
  function statefulCounter() {
    const windows = new Map<string, number>();
    return {
      async consume(key: string, limit: number): Promise<number> {
        await Promise.resolve();
        const current = windows.get(key) ?? 0;
        if (current >= limit) return 0; // decision and write, no await between
        windows.set(key, current + 1);
        return current + 1;
      },
      count: (key: string) => windows.get(key) ?? 0,
    };
  }

  it("admits exactly `limit` of 10 simultaneous requests and refuses the rest", async () => {
    const counter = statefulCounter();
    const key = bucketKey("advisor", { userId: "u1" })!;

    const results = await Promise.all(
      Array.from({ length: 10 }, () => counter.consume(key, 3)),
    );
    const verdicts = results.map((n) => decide(n, RATE_LIMIT_POLICIES.advisor));

    expect(verdicts.filter((v) => v.allowed)).toHaveLength(3);
    expect(verdicts.filter((v) => !v.allowed)).toHaveLength(7);
    expect(counter.count(key)).toBe(3);
  });

  it("refuses with the window as the retry hint, so a client can back off", async () => {
    const counter = statefulCounter();
    const key = bucketKey("advisor", { userId: "u1" })!;
    await counter.consume(key, 1);

    const verdict = decide(await counter.consume(key, 1), RATE_LIMIT_POLICIES.advisor);
    expect(verdict).toEqual({
      allowed: false,
      retryAfterSeconds: RATE_LIMIT_POLICIES.advisor.windowSeconds,
    });
  });
});
