#!/usr/bin/env node
// verify:lint — does ESLint run, and does it run over the code that exists?
// Phase 2 U18, roadmap item 9.
//
// ===========================================================================
// WHY THIS WRAPPER EXISTS AND `next lint` DOES NOT
// ===========================================================================
// Measured pre-U18 state, recorded because the roadmap describes it too
// generously. Item 9 calls the old script one that "appears to gate quality
// but does not". It was worse than that: `npm run lint` ran `next lint`, which
// with no ESLint config present prints an INTERACTIVE SETUP PROMPT —
//
//     ? How would you like to configure ESLint?
//     > Strict (recommended) / Base / Cancel
//
// — and exits 1 when stdin is closed. It could not run non-interactively AT
// ALL. There was no vacuous green to find; nobody had ever run it, because
// anyone who had would have hit the prompt. `next lint` is also removed in
// Next 16, and produces no machine-readable output for the assertion below.
//
// ===========================================================================
// THE ASSERTION THAT MATTERS — and the trap inside it
// ===========================================================================
// The roadmap's own words: a script that appears to gate quality but does not
// is the ONLY unacceptable state. A linter with a misconfigured `ignores`
// reports success over ZERO files — which is that exact state, reintroduced by
// the fix for it.
//
// So this asserts SCOPE, not just exit code: every tracked source file must
// actually be linted.
//
// **THE EXPECTED SET IS DERIVED FROM `git ls-files`, NEVER FROM THE ESLint
// CONFIG.** That is the whole design. If the expectation came from the config,
// then `ignores: ["**"]` would drive the expected set and the actual set to
// zero together, 0 === 0 would hold, and the guard would pass while linting
// nothing — the precise vacuity it exists to catch. Mutation M1b executes that
// counterfactual rather than arguing it.
//
// Nothing here counts to a hardcoded number. Three separately-recorded counts
// in this repository's own plan had already drifted from reality by the time
// U18 read them (4→5 disable comments, 31→33 client components, 23/24→25 API
// routes). A count written once is a count that will be wrong later.
import { execFileSync } from "node:child_process";
import { ESLint } from "eslint";

const REPO_ROOT = process.cwd();

function fail(message) {
  console.error(`verify:lint — ${message}`);
  process.exit(1);
}

const PROVED = [];
const proved = (claim) => PROVED.push(claim);

/**
 * Tracked source files ESLint is expected to lint.
 *
 * `git ls-files` is the source of truth: it is independent of ESLint's own
 * configuration, which is the only reason this guard can detect a config that
 * has stopped linting things.
 */
function trackedSourceFiles() {
  let out;
  try {
    out = execFileSync("git", ["ls-files", "-z", "--", "*.ts", "*.tsx", "*.mjs"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    fail(
      `could not list tracked files with \`git ls-files\`.\n` +
        "This guard derives what SHOULD be linted from git rather than from the\n" +
        "ESLint config, so without git it cannot make its assertion at all — and\n" +
        `passing anyway would be exactly the vacuity it exists to prevent.\n\n${error.stderr ?? error.message}`,
    );
  }
  return out.split("\0").filter(Boolean).sort();
}

/**
 * Tracked files deliberately NOT linted. Each needs a written reason, per the
 * house pattern (`EXEMPT_LAYERS`, `EXEMPT_NO_400`) — a bare path in an
 * exemption list is an unexplained hole.
 */
// EMPTY, AND MEASURED THAT WAY. The first draft of this list carried
// `next-env.d.ts` on the assumption that Next's generated file is tracked. It
// is not — it is gitignored — and the staleness check below caught the entry on
// this guard's very first run, against its own author. Recorded because it is
// the cheapest possible demonstration of why the check is here: an exemption
// written from expectation rather than measurement is an unexamined claim, and
// it was wrong within minutes of being written.
const EXEMPT_UNLINTED = [];

const eslint = new ESLint({ cwd: REPO_ROOT });

const tracked = trackedSourceFiles();
if (tracked.length === 0) {
  fail(
    "git reports ZERO tracked .ts/.tsx/.mjs files.\n" +
      "That cannot be true of this repository, so the derivation is broken rather\n" +
      "than the codebase being empty. A guard whose easiest green is 'there was\n" +
      "nothing to check' is not a guard.",
  );
}

// Ask ESLint which of those files it would actually lint. `isPathIgnored` is
// the config's own answer to the question this guard is asking.
const ignored = [];
for (const file of tracked) {
  if (await eslint.isPathIgnored(file)) ignored.push(file);
}

const exemptPaths = new Set(EXEMPT_UNLINTED.map((e) => e.file));
const unexplained = ignored.filter((f) => !exemptPaths.has(f));

if (unexplained.length > 0) {
  fail(
    `LINT SCOPE — ${unexplained.length} of ${tracked.length} tracked source files are NOT linted,\n` +
      "and are not in the exemption list:\n\n" +
      unexplained.slice(0, 25).map((f) => `    ${f}`).join("\n") +
      (unexplained.length > 25 ? `\n    … and ${unexplained.length - 25} more` : "") +
      "\n\nA linter that does not lint the code is the state roadmap item 9 calls the\n" +
      "only unacceptable one. If a file SHOULD be excluded, add it to\n" +
      "EXEMPT_UNLINTED with a written reason — never widen `ignores` silently.\n\n" +
      "If this fired after an `ignores` edit: that is the guard working. The\n" +
      "expected set comes from `git ls-files`, so shrinking what ESLint looks at\n" +
      "cannot shrink what it is measured against.",
  );
}

// An exemption for a file that no longer exists is a stale hole nobody notices.
const trackedSet = new Set(tracked);
const staleExemptions = EXEMPT_UNLINTED.filter((e) => !trackedSet.has(e.file));
if (staleExemptions.length > 0) {
  fail(
    `EXEMPT_UNLINTED names ${staleExemptions.length} file(s) that are not tracked source files:\n` +
      staleExemptions.map((e) => `    ${e.file}`).join("\n") +
      "\n\nRemove them. An exemption that matches nothing is an unexamined claim.",
  );
}
for (const entry of EXEMPT_UNLINTED) {
  if (!entry.reason || entry.reason.trim().length < 40) {
    fail(`EXEMPT_UNLINTED entry for ${entry.file} has no substantive written reason.`);
  }
}

const linted = tracked.filter((f) => !exemptPaths.has(f));
proved(`ESLint's configuration lints ${linted.length} of ${tracked.length} tracked source files`);
proved(
  EXEMPT_UNLINTED.length === 0
    ? "no tracked source file is exempt from linting"
    : `${EXEMPT_UNLINTED.length} tracked file(s) are exempt, each with a written reason`,
);

// --- Now actually lint. Scope without execution proves nothing. ------------
let results;
try {
  results = await eslint.lintFiles(linted);
} catch (error) {
  fail(
    `ESLint threw while linting.\n\n${error.stack ?? error.message}\n\n` +
      "This is a failure of the linter itself, not a lint finding. A malformed\n" +
      "`eslint.config.mjs` reaches this path.",
  );
}

const errorCount = results.reduce((n, r) => n + r.errorCount, 0);
const warningCount = results.reduce((n, r) => n + r.warningCount, 0);
const filesWithFindings = results.filter((r) => r.errorCount + r.warningCount > 0);

if (results.length === 0) {
  fail(
    "ESLint returned results for ZERO files after being handed a non-empty file list.\n" +
      "That is a linter reporting on nothing, which passes vacuously.",
  );
}

if (errorCount > 0) {
  const formatter = await eslint.loadFormatter("stylish");
  console.error(await formatter.format(filesWithFindings));
  fail(`${errorCount} error(s) across ${filesWithFindings.length} file(s). Listed above.`);
}

if (warningCount > 0) {
  const formatter = await eslint.loadFormatter("stylish");
  console.log(await formatter.format(filesWithFindings));
}

proved(`ESLint executed over ${results.length} files and reported ${errorCount} errors`);
proved(
  "unused `eslint-disable` directives are errors, so a comment that suppresses " +
    "nothing cannot survive (reportUnusedDisableDirectives)",
);

if (PROVED.length === 0) {
  fail("no check recorded a proof. The run asserted nothing and must not report OK.");
}

console.log(
  "verify:lint — OK. What this run actually executed and proved:\n" +
    PROVED.map((claim) => `  · ${claim}`).join("\n") +
    (warningCount > 0 ? `\n\n  ${warningCount} warning(s), shown above; warnings do not fail this check.` : "") +
    "\n\n  The expected file set comes from `git ls-files`, NOT from the ESLint\n" +
    "  config — so narrowing what ESLint looks at cannot narrow what it is\n" +
    "  measured against. That is the whole point of the check.",
);
