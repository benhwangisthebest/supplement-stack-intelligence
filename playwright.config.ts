import { defineConfig, devices } from "@playwright/test";

// Design §8 — L1/L2/L3 runtime tests. Executed during Check/QA with a live
// server + Supabase. baseURL points at the local server.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Mirrors `LIVE` in tests/e2e/helpers.ts. Kept as its own constant rather than
// imported: this file is loaded by Playwright's config loader before the test
// module graph exists.
const LIVE = process.env.E2E_LIVE === "1";

export default defineConfig({
  testDir: "./tests/e2e",

  // THE SHARED-USER RACE (Phase 1 U16).
  //
  // Every authed spec logs in as ONE seeded demo account (`SEED_DEMO_EMAIL`,
  // no default since Phase 4 U17) and writes to that single user's rows — stacks,
  // lab panels, check-ins. Under `fullyParallel` those writes interleave across
  // workers, and `tests/e2e/helpers.ts` says so out loud: "Run these specs with
  // --workers=1 (the extract-no-write count check needs no concurrent writes)."
  //
  // That mitigation was a COMMENT. It required a human to remember a flag, and
  // nothing failed if they forgot — the run just became nondeterministic, which
  // is the worst possible failure mode for a suite whose entire job is to tell
  // you the truth about a live system (CLAUDE.md §3.5: prefer a mechanism over a
  // paragraph). It is now structural: a live run cannot be parallel.
  //
  // Scoped to live runs deliberately. Without E2E_LIVE every authed block skips,
  // so nothing touches the shared account and there is no reason to give up the
  // parallelism — see the ungated public-Library specs, which are read-only.
  //
  // The real fix is per-test user isolation, which this does NOT do: signing up
  // a fresh user per spec hits Supabase's email rate limits (the reason
  // helpers.ts logs in rather than signing up). Serialising is the honest,
  // available fix; isolation is a larger piece of work than this unit.
  //
  // Guarded by LIVE_SERIAL in src/architecture/e2e-live-tagging.test.ts
  // (Phase 4 U12): removing or changing either line below is a red build.
  fullyParallel: !LIVE,
  workers: LIVE ? 1 : undefined,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Auto-start the app. To test a server you started yourself, set
  // PLAYWRIGHT_NO_SERVER (and PLAYWRIGHT_BASE_URL if it is not on :3000).
  //
  // BUILD-THEN-START, not `next dev` (Phase 1 U16). The E2E suite is the only
  // thing in this repository that exercises the app as a user meets it, and
  // `next dev` is not that app: it compiles routes on demand, skips production
  // optimisation, and renders React error overlays instead of the production
  // error boundaries these specs assert against. A suite that only ever passes
  // against the dev server cannot support a claim about the shipped build.
  //
  // The cost is the build, so the timeout rises with it: 120s covered `next dev`
  // booting, and a cold `next build` alone measured ~30–60s on this machine.
  // 300s is deliberate headroom on a slower or cold-cache machine rather than a
  // measurement of the fast path — a webServer timeout that fires mid-build
  // reports as an unreachable app, which is a maximally confusing symptom.
  //
  // NEVER REUSE (N-32, Phase 4 U12). This was `!process.env.CI`, so outside CI
  // whatever already answered on the port was trusted in place of the build
  // above. A stale `next dev` did exactly that in the U14 baseline: 12 failures,
  // all of them the substituted server. With `false`, an occupied port fails
  // the run up front, and using an existing server is an explicit choice
  // (PLAYWRIGHT_NO_SERVER). CI already ran with `false`, so CI is unchanged.
  // Guarded by SERVER_REUSE in src/architecture/e2e-live-tagging.test.ts.
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
