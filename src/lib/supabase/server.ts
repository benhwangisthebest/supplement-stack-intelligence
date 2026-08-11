// Infrastructure — server Supabase client bound to the request cookie store.
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll called from a Server Component, where Next forbids cookie
          // writes. The refreshed tokens are computed and DISCARDED here; the
          // render still succeeds, because getUser() already resolved a user.
          //
          // Swallowing is only safe because `src/middleware.ts` persists the
          // refresh on navigation instead. That premise is load-bearing, and
          // from 2026-06-12 to 2026-08-11 it was FALSE: the middleware sat at
          // the repository root, where Next never compiled it, so nothing
          // persisted a navigation-time refresh at all (finding N-34, fixed by
          // Phase 2 U27). Sessions survived on API traffic — every Route
          // Handler under src/app/api/** may write cookies, so refreshes
          // persisted there — which is why the breakage was invisible.
          //
          // The comment that used to sit here asserted the invariant as though
          // it held. If this catch ever looks safe again, check that
          // `src/architecture/middleware-scope.test.ts` is green: it is what
          // keeps the premise true.
        }
      },
    },
  });
}
