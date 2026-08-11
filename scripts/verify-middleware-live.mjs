#!/usr/bin/env node
// verify:middleware — did the last build actually COMPILE the middleware?
// Phase 2 U27, the liveness half of N-34's guard.
//
// WHY THIS IS A SCRIPT AND NOT A TEST. The predicate needs a build artifact, and
// the declared CI chain runs `vitest run` BEFORE `next build`. A vitest
// assertion over `.next/` would fail for the wrong reason on a clean checkout,
// or skip itself and be vacuous — and a guard whose easiest green is "no build
// present" is not a guard. So the order-safe, source-level half lives in
// `src/architecture/middleware-scope.test.ts` and runs on every push; this half
// needs a build and is run deliberately.
//
// THIS IS DEVELOPER-RUN, NOT CI-ENFORCED. That is N-29's exact shape at a second
// site and it is stated rather than glossed. Phase 2 U14 is where it becomes
// enforced: its `Content-Security-Policy-Report-Only` header cannot appear
// unless the middleware executed, so U14's E2E assertion is the liveness
// predicate, and U14's E2E CI stage is what makes it run.
//
// WHAT IT PROVES: Next found and compiled the middleware.
// WHAT IT DOES NOT PROVE: that the function did anything correct at runtime.
import { readFileSync } from "node:fs";

const MANIFEST = ".next/server/middleware-manifest.json";

let raw;
try {
  raw = readFileSync(MANIFEST, "utf8");
} catch {
  console.error(
    `verify:middleware — ${MANIFEST} not found.\n` +
      "Run `npm run build` first. This check reads the last build's output; it\n" +
      "does not build for you, so that a stale pass is impossible to mistake for\n" +
      "a fresh one.",
  );
  process.exit(1);
}

const manifest = JSON.parse(raw);
const entries = Object.keys(manifest.middleware ?? {});

if (entries.length === 0) {
  console.error(
    "verify:middleware — THE BUILD COMPILED NO MIDDLEWARE.\n" +
      `  ${MANIFEST} has an empty "middleware" object.\n\n` +
      "This is finding N-34 recurring. Next resolves middleware at\n" +
      "`src/middleware.ts` in a project with a src/ directory; a file at the\n" +
      "repository root is silently ignored, the build still succeeds, and every\n" +
      "request runs no middleware at all. Check where the file is.",
  );
  process.exit(1);
}

console.log(
  `verify:middleware — OK. Compiled middleware entries: ${entries.join(", ")}\n` +
    "  (Proves compilation, not correct runtime behaviour.)",
);
