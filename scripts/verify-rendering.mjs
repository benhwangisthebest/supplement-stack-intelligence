#!/usr/bin/env node
// verify:rendering — did this build produce the SAME app production runs?
// Phase 2 U28, the build-output half of N-38's guard.
//
// THE INVARIANT, and why it is phrased as a zero rather than a route list.
// A credentialed build of this app emits NO prerendered page HTML at all —
// measured, 0 files — because `getUser()` reaches `cookies()` from the root
// layout on every page. A clean-env build used to emit 20. So the honest
// predicate is not "these five routes must be dynamic" (a list, and lists go
// stale the first time someone adds a route) but:
//
//     .next/server/app contains no prerendered page .html
//
// That needs no enumeration, cannot drift, and governs routes nobody has
// written yet. It is also meaningful precisely where CI stands: CI cannot build
// credentialed, but it CAN assert its clean-env build reached the same zero.
//
// WHY A SCRIPT AND NOT A TEST. It reads build output, and the declared CI chain
// runs `vitest run` BEFORE `next build`. A vitest assertion over `.next/` would
// fail for the wrong reason on a clean checkout or skip itself and be vacuous —
// U27's lesson, learned when a guard's module-scope read collapsed the whole
// file to `0 test` under mutation. The order-safe half lives in
// `src/architecture/rendering-determinism.test.ts`.
//
// UNLIKE `verify:middleware`, THIS ONE RUNS IN CI. Three units in a row shipped
// a developer-run guard (N-29, then U27's liveness half); this check costs a
// directory read with no rebuild, so deferring it would have been habit rather
// than constraint.
//
// WHAT IT PROVES: the build did not statically prerender pages, so it matches
// the shape production runs.
// WHAT IT DOES NOT PROVE: that any page renders correctly, or that the two
// builds are identical in every other respect. It is one axis, checked exactly.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = ".next/server/app";

/** Every `.html` under `.next/server/app`, recursively, as app-relative paths. */
function prerenderedPages(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...prerenderedPages(full, `${prefix}${entry}/`));
    } else if (entry.endsWith(".html")) {
      out.push(prefix + entry);
    }
  }
  return out;
}

let pages;
try {
  pages = prerenderedPages(APP_DIR);
} catch {
  // A missing build must FAIL, never pass quietly. A guard whose easiest green
  // is "there is no build" is not a guard (U27, mutation M5).
  console.error(
    `verify:rendering — ${APP_DIR} not found.\n` +
      "Run `npm run build` first. This check reads the last build's output and\n" +
      "deliberately does not build for you, so a stale pass cannot be mistaken\n" +
      "for a fresh one.",
  );
  process.exit(1);
}

if (pages.length > 0) {
  console.error(
    `verify:rendering — THIS BUILD PRERENDERED ${pages.length} PAGE(S) TO STATIC HTML.\n\n` +
      pages
        .slice(0, 25)
        .map((p) => `    ${p}`)
        .join("\n") +
      (pages.length > 25 ? `\n    …and ${pages.length - 25} more` : "") +
      "\n\nThis is finding N-38 recurring. A credentialed build emits ZERO of\n" +
      "these, so this build is NOT the app production runs — pages that are\n" +
      "server-rendered in production are being frozen at build time here.\n\n" +
      "The usual cause is that `getUser()` in src/lib/auth/session.ts stopped\n" +
      "calling `cookies()` unconditionally. That call is a dynamic marker, not a\n" +
      "data read; removing it makes rendering mode depend on whether Supabase\n" +
      "env vars happen to be set at BUILD time, which is how CI spent months\n" +
      "building a different app from production.",
  );
  process.exit(1);
}

console.log(
  "verify:rendering — OK. No prerendered page HTML; this build matches the\n" +
    "  shape production runs. (Proves rendering mode, not page correctness.)",
);
