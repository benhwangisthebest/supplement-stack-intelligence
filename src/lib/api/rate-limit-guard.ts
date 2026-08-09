// Application — the shared 429 boundary for paid routes (Phase 2 U5).
//
// It lives here rather than inside a route for two reasons, both structural:
//
//   1. A Next.js `route.ts` may export ONLY route handlers and its config. An
//      exported helper there fails the build — `next build` type-checks the
//      module against `{ [x: string]: never }`. So "share it between the two
//      paid routes" and "keep it in a route file" are mutually exclusive.
//   2. CLAUDE.md §4 rule 8: a trust boundary belongs in a testable module. The
//      identity decision behind this — which `x-forwarded-for` element to
//      believe — is a security decision, and it is one import away in the pure
//      `@/lib/rate-limit`, with its own tests.
//
// `src/lib/api` is IMPURE_BY_DESIGN (boundaries.test.ts): it is the HTTP
// boundary, so importing `next/server` through `./respond` is what it is for.
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/db/rate-limit-repo";
import {
  RATE_LIMIT_POLICIES,
  bucketKey,
  decide,
  type RateLimitedRoute,
} from "@/lib/rate-limit";
import { fail, type ApiEnvelope } from "./respond";
import type { NextResponse } from "next/server";

/**
 * Count this request against its bucket. Returns a 429 `Response` when the
 * window is full, or `null` when the caller may proceed.
 *
 * Call it BEFORE any expensive work: a refused request must cost nothing, which
 * is the entire point of a rate limit on a paid endpoint.
 */
export async function enforceRateLimit(
  route: RateLimitedRoute,
  userId: string | null,
  request: Request,
): Promise<NextResponse<ApiEnvelope<never>> | null> {
  const policy = RATE_LIMIT_POLICIES[route];
  const key = bucketKey(route, {
    userId,
    forwardedFor: request.headers.get("x-forwarded-for"),
  });

  // An unattributable caller is REFUSED, not pooled into a shared bucket.
  // Both paid routes reject anonymous callers before reaching here, so a null
  // key means an assumption upstream changed — and pooling would let one caller
  // exhaust the limit for everyone in the pool.
  if (!key) return rateLimited(policy.windowSeconds);

  // The client is created HERE, not passed in. `/api/lab-import/extract`
  // carries a structural pin that its own source imports no Supabase client at
  // all — a SAFETY-CRITICAL property, since the confirm gate between transcribe
  // and commit is what stops unreviewed lab values being persisted. Threading a
  // client through its signature would have broken that pin, and weakening the
  // pin to accommodate a rate limiter would trade a real safety property for
  // convenience. See that test's comment, which now records what this write is.
  const supabase = await createClient();
  const consumed = await consumeRateLimit(supabase, key, policy.windowSeconds, policy.limit);
  const verdict = decide(consumed, policy);
  return verdict.allowed ? null : rateLimited(verdict.retryAfterSeconds);
}

function rateLimited(retryAfterSeconds: number): NextResponse<ApiEnvelope<never>> {
  const res = fail("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
  res.headers.set("Retry-After", String(retryAfterSeconds));
  return res;
}
