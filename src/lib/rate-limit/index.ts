// Domain — request rate limiting (Phase 2 U5). PURE: no HTTP, no database, no
// clock reads that are not passed in. The counter itself lives in Postgres
// (`consume_rate_limit`, migration 0009); this module decides WHO is being
// limited and WHAT the answer means.
//
// ===========================================================================
// THE TRAP THIS MODULE EXISTS TO NOT FALL INTO
// ===========================================================================
// `x-forwarded-for` is a LIST, and its FIRST element is written by the client.
// The near-universal spelling —
//
//     const ip = request.headers.get("x-forwarded-for")?.split(",")[0];
//
// — reads a value the attacker chose. A limiter keyed on it is defeated by
// sending a different header on every request: each one lands in its own bucket
// and the limit is never reached. It passes every test written against a
// well-behaved client, which is exactly why it survives review.
//
// The trustworthy element is the one the platform APPENDED — the last hop, the
// address that actually opened the connection to the edge. Everything to its
// left is hearsay forwarded from upstream.
//
// This is `CLAUDE.md` §4 rule 8 ("every trust boundary belongs in a testable
// module, not in a route handler") applied literally: the parsing is a named
// exported function with its own tests, not an expression inside a handler.

/** A rate-limit policy: at most `limit` requests per `windowSeconds`. */
export interface RateLimitPolicy {
  windowSeconds: number;
  limit: number;
}

/**
 * Per-route policies for the two endpoints that call a paid external API.
 *
 * The numbers are deliberately generous — this is an abuse ceiling, not a
 * product quota. The advisor's real cost control is the token budget
 * (`reserve_advisor_tokens`); this stops a loop, not a heavy user.
 */
export const RATE_LIMIT_POLICIES = {
  "advisor": { windowSeconds: 60, limit: 20 },
  "lab-import-extract": { windowSeconds: 60, limit: 10 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitedRoute = keyof typeof RATE_LIMIT_POLICIES;

/**
 * The client address this application is willing to trust, or `null`.
 *
 * Takes the LAST element of `x-forwarded-for`, not the first. See the header:
 * the first is attacker-supplied, the last is what the platform appended.
 *
 * Returns `null` for an absent, empty, or all-blank header rather than
 * inventing a placeholder — a caller must decide what to do with "unknown",
 * and silently bucketing every unknown caller together would let one of them
 * exhaust the limit for all of them.
 */
export function trustedClientIp(forwardedFor: string | null | undefined): string | null {
  if (!forwardedFor) return null;
  const hops = forwardedFor
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
  return hops.length > 0 ? hops[hops.length - 1] : null;
}

/**
 * The key a request is counted against.
 *
 * An authenticated user is keyed by id: it is stable, it is not spoofable, and
 * it survives the user changing networks. The IP is a FALLBACK for callers with
 * no session — both paid routes reject those today, so this branch is not
 * currently reachable from them, and it exists so that adding an unauthenticated
 * paid endpoint later cannot silently ship with no key at all.
 *
 * The route name is part of the key so a user exhausting the lab-import limit
 * can still use the advisor.
 */
export function bucketKey(
  route: RateLimitedRoute,
  identity: { userId?: string | null; forwardedFor?: string | null },
): string | null {
  if (identity.userId) return `user:${identity.userId}:${route}`;
  const ip = trustedClientIp(identity.forwardedFor);
  return ip ? `ip:${ip}:${route}` : null;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds the caller should wait before retrying. Only meaningful when refused. */
  retryAfterSeconds: number;
}

/**
 * Interpret what `consume_rate_limit` returned.
 *
 * The SQL contract is: a positive number is the request count after this
 * request (allowed), and 0 means the window was already full (refused). Kept as
 * a named function so the "0 means refused" convention is stated once and
 * tested, rather than re-derived at each call site — a route reading `count > 0`
 * as truthy would be correct today and wrong the moment the SQL returns -1 for
 * anything.
 */
export function decide(consumed: number, policy: RateLimitPolicy): RateLimitDecision {
  return consumed > 0
    ? { allowed: true, retryAfterSeconds: 0 }
    : { allowed: false, retryAfterSeconds: policy.windowSeconds };
}
