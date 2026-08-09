// Persistence — the rate-limit counter (Phase 2 U5).
//
// One function, one RPC. The counting, the window arithmetic and the
// compare-and-set all live in `consume_rate_limit` (migration 0009) for the same
// reason `reserve_advisor_tokens` does: PostgREST cannot express
// `col = col + n`, so any client-side spelling is a read-then-write with a race
// in it — and a limiter with a race is not a limiter.
import type { SupabaseClient } from "@supabase/supabase-js";

// The row type lives in `./types`, not here. FU-20 records that four row types
// were declared privately inside their repos and so could not be asserted
// against from anywhere — SCHEMA_DRIFT reads them as source text. A new one
// declared here would enlarge that finding under a unit that does not own it.
export type { RateLimitRow } from "./types";

/**
 * Count one request against `bucketKey`. Returns the count after this request,
 * or **0 when the window is already full** — which the caller must treat as a
 * refusal.
 *
 * The bucket key is composed by `@/lib/rate-limit` and passed in; this module
 * does not decide who is being limited. `user_id` is not a parameter: the SQL
 * derives it from `auth.uid()` so a caller cannot write a row attributed to
 * someone else.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  bucketKey: string,
  windowSeconds: number,
  limit: number,
): Promise<number> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}
