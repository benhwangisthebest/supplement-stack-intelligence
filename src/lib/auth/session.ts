// Application — auth/session helpers (Design §7). Server-only.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Returns the current user or null. Never throws on missing session/config.
 *
 * ---------------------------------------------------------------------------
 * THE `cookies()` CALL BELOW IS LORE-BEARING. DO NOT "OPTIMISE" IT AWAY.
 * ---------------------------------------------------------------------------
 * Phase 2 U28, closing finding N-38. It is a DYNAMIC MARKER, not a data read —
 * the return value is deliberately discarded.
 *
 * Until U28 this function short-circuited on `!isSupabaseConfigured()` BEFORE
 * reaching `createClient()`, and `createClient()` is the only thing that called
 * `cookies()`. `cookies()` is what opts a route out of static generation, and
 * `TopNav` calls this function from the root layout on every page. So the
 * app's RENDERING MODE depended on whether Supabase env vars happened to be
 * present at BUILD time:
 *
 *   credentialed build -> `cookies()` reached  -> pages render per request
 *                                                 (0 prerendered .html)
 *   clean-env build    -> short-circuited      -> pages prerendered at build
 *                                                 (20 prerendered .html)
 *
 * CI has no credentials by design (P-03 — this repository is public), so CI was
 * building a materially different app from production, and any CI result was a
 * claim about that other app. U14's CSP was the first thing to depend on the
 * difference: a per-request nonce cannot exist inside a build-time prerender,
 * so its E2E reported 72 `script-src-elem` violations in CI and none locally.
 *
 * Calling `cookies()` unconditionally makes the unconfigured path do exactly
 * what the configured path already did, so the two builds converge BY
 * CONSTRUCTION rather than by anyone maintaining a list of dynamic routes.
 *
 * SAFETY OF THE CALL ITSELF: every caller is a request scope — route handlers,
 * server components, and `TopNav`. Checked at U28: `generateStaticParams` in
 * `src/app/library/[slug]/page.tsx` calls `getAllSupplements()` and never
 * reaches here, so no build-time context invokes it. If a future caller does,
 * `cookies()` will throw rather than silently reverting the app to
 * environment-dependent rendering — which is the correct failure direction.
 *
 * Guarded by `src/architecture/rendering-determinism.test.ts` (source-level)
 * and `npm run verify:rendering` (build output, in CI).
 */
export async function getUser(): Promise<User | null> {
  await cookies();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Redirects unauthenticated visitors to login (for protected Server Components). */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/auth/login");
  return user;
}
