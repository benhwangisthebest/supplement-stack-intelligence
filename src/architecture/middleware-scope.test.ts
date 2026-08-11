// MIDDLEWARE_SCOPE — the middleware is at the path Next compiles, and stays thin
// (Phase 2 U27, closing finding N-34).
//
// ===========================================================================
// WHAT WENT WRONG, AND WHY THREE GREEN THINGS DID NOT NOTICE
// ===========================================================================
// `middleware.ts` sat at the REPOSITORY ROOT from `910d773` (2026-06-12, MVP v1)
// until this unit. Next 15 resolves middleware at `src/middleware.ts` in a
// project with a `src/` directory, so the root file was never compiled and
// `updateSession` — the Supabase session refresh of Design §7 — never ran.
//
// Measured by A/B in an isolated clean clone, same file content, only the path
// changed:
//   * `middleware.ts`      -> `{"middleware": {}, "sortedMiddleware": []}`, and
//                             no `ƒ Middleware` line in the build output;
//   * `src/middleware.ts`  -> a registered matcher, and `ƒ Middleware  87.2 kB`.
//
// Nothing caught it, and the near-misses are the lesson:
//   1. `TREE_PARTITION` in `boundaries.test.ts` governs loose files under `src/`.
//      Its own comment names "`src/middleware.ts` — a standard Next.js path that
//      runs on every request". `EXEMPT_ROOT_FILES` was empty and PASSED, because
//      the file was not at that path. A guard that names a path asserts nothing
//      about the path the code is actually at.
//   2. `next build` succeeded, every time. A middleware that is not found is not
//      an error; it is an absence, and absences do not fail builds.
//   3. The E2E suite was green. Every anonymous-redirect assertion it makes is
//      satisfied by page-level `requireUser()`, so it never depended on
//      middleware running and could not report that it did not.
//
// ===========================================================================
// WHAT THIS FILE CAN AND CANNOT SEE — read before trusting it (§2.2 rule 7)
// ===========================================================================
// It is SOURCE-LEVEL and therefore ORDER-SAFE: it needs no build artifact, which
// is what lets it run in the declared CI chain, where `vitest run` executes
// BEFORE `next build`. A test asserting "the middleware manifest is non-empty"
// cannot live here — on a clean checkout it would either fail for the wrong
// reason or skip and be vacuous, and a guard whose easiest green is "no build
// present" is not a guard.
//
// So this file proves the middleware is WHERE NEXT WOULD FIND IT. It does NOT
// prove Next found it, and it does NOT prove the function executed.
//
// THE LIVENESS HALF IS NOT ENFORCED IN CI YET. Until Phase 2 U14 lands the E2E
// stage, compilation is checked by `npm run verify:middleware` — DEVELOPER-RUN.
// That is N-29's exact shape at a second site, and it is stated rather than
// glossed: a green run of this file means the path is right, not that the
// middleware runs. U14's `Content-Security-Policy-Report-Only` header is the
// liveness predicate — a header that cannot appear unless middleware executed —
// and U14's E2E stage is where it becomes CI-enforced.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/** Git's index, not the working tree — §4.2's staged-file rule. */
function trackedFiles(pathspec: string): string[] {
  return execFileSync("git", ["-C", REPO_ROOT, "ls-files", "--cached", "--", pathspec], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

/** The one path Next compiles in this project. */
const MIDDLEWARE_PATH = "src/middleware.ts";

/**
 * Paths a middleware could be written to that Next would silently ignore here.
 * `middleware.js`/`.tsx` are included because the failure is about the DIRECTORY,
 * not the extension — a root file of any of these names is equally inert.
 */
const SHADOW_PATHS = [
  "middleware.ts",
  "middleware.js",
  "middleware.tsx",
  "middleware.mjs",
];

describe("MIDDLEWARE_SCOPE: the middleware is at the path Next compiles", () => {
  it("tracks src/middleware.ts", () => {
    expect(
      trackedFiles(MIDDLEWARE_PATH),
      `MIDDLEWARE_SCOPE: ${MIDDLEWARE_PATH} is not tracked. Next resolves\n` +
        "middleware at this path only when a src/ directory exists. Moving or\n" +
        "deleting it does not fail a build — it produces an empty middleware\n" +
        "manifest and a silently inert request pipeline, which is exactly how\n" +
        "N-34 survived from 2026-06-12 to 2026-08-11.",
    ).toEqual([MIDDLEWARE_PATH]);
  });

  it("has no shadow copy at the repository root", () => {
    // The opposite direction, and the one that matters most: a root file looks
    // completely correct to a reader, is picked up by no build, and would make
    // this suite's other assertions pass while the app runs no middleware.
    const shadows = SHADOW_PATHS.filter(
      (p) => trackedFiles(p).length > 0 || existsSync(join(REPO_ROOT, p)),
    );
    expect(
      shadows,
      "MIDDLEWARE_SCOPE: a middleware file exists at the repository root:\n  " +
        `${shadows.join("\n  ")}\n` +
        "Next ignores it in a project with a src/ directory. Whatever it does, it\n" +
        `does nowhere. Move its contents into ${MIDDLEWARE_PATH}.`,
    ).toEqual([]);
  });
});

/**
 * Read LAZILY, inside each assertion — never at module scope.
 *
 * This is not a style choice; it was measured. The first version read the file
 * when the module loaded, and mutation M1 (move the middleware back to the root)
 * turned the whole file into a COLLECTION ERROR: `0 test`, `Tests no tests`. The
 * two assertions that matter most — the path is right, no shadow copy exists —
 * never executed, and the only clean red came from a different file. A guard
 * that stops running when the thing it guards is broken is the vacuity failure
 * mode this repository keeps finding. Reading here keeps every assertion
 * reportable with its own message.
 */
function middlewareCode(): string {
  const path = join(REPO_ROOT, MIDDLEWARE_PATH);
  if (!existsSync(path)) {
    // A named failure rather than an ENOENT stack trace.
    expect(
      existsSync(path),
      `MIDDLEWARE_SCOPE: ${MIDDLEWARE_PATH} does not exist, so the thinness rules\n` +
        "below cannot be evaluated. Fix the path assertion above first.",
    ).toBe(true);
  }
  // Comments stripped, so a rule cannot be tripped or satisfied by prose.
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("MIDDLEWARE_SCOPE: the middleware stays thin", () => {
  it("delegates the session refresh rather than reimplementing it", () => {
    const code = middlewareCode();
    expect(
      code,
      "MIDDLEWARE_SCOPE: the middleware no longer calls updateSession. The session\n" +
        "refresh is the reason this file exists (Design §7); a middleware that\n" +
        "stops calling it is inert in a way no other test would notice.",
    ).toContain("updateSession");
  });

  it("holds no logic that belongs in a governed module", () => {
    const code = middlewareCode();
    // A loose file directly under src/ belongs to no layer, so every rule in
    // boundaries.test.ts skips it. That skip is registered in EXEMPT_ROOT_FILES
    // with a written reason — but an exemption is a promise to keep the file
    // trivial, and nothing was checking the promise. These are the specific
    // shapes that would move real decisions into an ungoverned file.
    const FORBIDDEN: ReadonlyArray<readonly [string, string]> = [
      ["createServerClient", "Supabase client construction belongs in src/lib/supabase"],
      ["process.env", "environment reads belong in a module a unit test can drive"],
      ["default-src", "a CSP directive literal belongs in src/lib/security/csp.ts"],
      ["script-src", "a CSP directive literal belongs in src/lib/security/csp.ts"],
      ["frame-ancestors", "a CSP directive literal belongs in src/lib/security/csp.ts"],
    ];
    const found = FORBIDDEN.filter(([needle]) => code.includes(needle)).map(
      ([needle, why]) => `${needle} — ${why}`,
    );
    expect(
      found,
      "MIDDLEWARE_SCOPE: logic appeared in the middleware:\n  " +
        `${found.join("\n  ")}\n` +
        "This file is exempt from the layer rules because it must sit where Next\n" +
        "looks, not because its contents are unimportant. Put the decision in a\n" +
        "governed module and call it from here (closeout finding C-11).",
    ).toEqual([]);
  });

  it("stays short enough to read in one screen", () => {
    // A bound, not a style preference: the exemption above is only defensible
    // while the file is trivially reviewable by eye, since no layer rule reads it.
    const statements = middlewareCode()
      .split("\n")
      .filter((l) => l.trim().length > 0).length;
    expect(
      statements,
      `MIDDLEWARE_SCOPE: ${MIDDLEWARE_PATH} has ${statements} non-blank code lines.\n` +
        "An ungoverned file earns its exemption by being small. Move logic out.",
    ).toBeLessThanOrEqual(25);
  });
});
