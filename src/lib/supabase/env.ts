// Infrastructure — reads Supabase env (Design §10.3). Throws only at call time,
// never at import/build time, so `next build` succeeds without configured creds.
//
// Phase 2 U1: the throw is a typed `NotConfiguredError`. This is the ONE of the
// three "not configured" sites whose exception actually reaches `handle()` — a
// route calls `createClient()` inside the shared boundary — so it is the site
// that keeps the 503 contract live rather than theoretical.
import { NotConfiguredError } from "@/lib/api/errors";

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new NotConfiguredError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
