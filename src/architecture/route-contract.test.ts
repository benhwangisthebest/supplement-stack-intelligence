// ROUTE_CONTRACT — CLAUDE.md §5 rule 5: "New API routes ship with tests for
// 401, validation failure, and the happy path." Phase 2 U16, closing FU-13.
//
// ===========================================================================
// WHAT THIS REPLACES
// ===========================================================================
// Phase 1 met this criterion by measuring it once, by hand, and writing the
// result down: 23 route files, 14 validating, and a NINE-FILE 400-exemption
// list living as prose in `docs/01-plan/phase-1-verification-integrity.plan.md`
// §10.1. Prose detects nothing. FU-13 sat unowned across three units because
// each one's candidate owner shipped without binding it, and a 24th route could
// have arrived at any point with no test and no exemption and nothing would
// have gone red.
//
// The list below is that prose, transcribed, with each reason preserved.
//
// ===========================================================================
// THE MATCHING STRATEGY, AND WHAT DEFEATS IT — N-14's required disclosure
// ===========================================================================
// A route is classified INPUT-VALIDATING if its source contains `.parse(`.
// That is a LITERAL match, and N-14's audit is explicit that literal matches
// are one refactor away from vacuity. Specifically:
//
//   * A route that validates by hand — `if (typeof body.name !== "string")
//     return fail(...)` — contains no `.parse(` and is classified
//     non-validating. It then needs an entry in EXEMPT_NO_400 with a written
//     reason, and the reason will be FALSE.
//   * A route using a Zod method the pattern does not name. THIS IS NOT
//     HYPOTHETICAL, AND THE FIRST VERSION OF THIS COMMENT GOT IT WRONG: it
//     claimed `safeParse` was "matched by the same substring". It is not —
//     `.safeParse(` does not contain `.parse(`. U17's DELETE route validates
//     with `safeParse`, this guard classified it as non-validating, and
//     demanded an exemption entry for a route that plainly validates input.
//     The pattern now names both forms explicitly. A future `.check(` would
//     still slip, which is the residual as originally stated — but the example
//     given for it was itself false, which is worth more than the residual:
//     A DISCLOSURE OF A GUARD'S LIMITS IS ITSELF A CLAIM, AND CAN BE WRONG.
//
// THIS RESIDUAL IS ACCEPTED, DELIBERATELY, ON THESE TERMS: the failure mode is
// a wrong entry that a human had to write a justification for, which is a
// VISIBLE wrong thing. Prose's failure mode is silence. A guard that turns an
// invisible gap into a false statement someone signed is a strict improvement,
// and it is not the same as a guard that works.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Route files with no 400 path, each with the reason it cannot have one.
 * Transcribed from Phase 1 plan §10.1, which grouped them A (no request input
 * at all) and B (path parameter only, unvalidated by design).
 *
 * A NAMED LIST WITH REASONS, in the house `EXEMPT_LAYERS` shape — never a bare
 * path. Asserted below in BOTH directions: an unlisted non-validating route is
 * red, and so is a listed route that has since started validating.
 */
const EXEMPT_NO_400: Record<string, string> = {
  // --- A: no request input of any kind. The handler signature takes nothing,
  //        so there is no value a caller could supply for it to reject.
  "src/app/api/advisor/conversations/route.ts":
    "A — no request input. `GET()` is a zero-arg handler; it lists the caller's own conversations from `user.id`.",
  "src/app/api/identity/route.ts":
    "A — no request input. `GET()` is a zero-arg handler deriving from server-loaded owned data only; no request body, no client-trusted input.",
  "src/app/api/lab-panels/route.ts":
    "A — no request input. `GET()` is a zero-arg handler; `listPanels(supabase, user.id)`.",
  "src/app/api/lab-trends/route.ts":
    "A — no request input. `GET()` is a zero-arg handler; reads owned rows, then a pure engine.",
  "src/app/api/account/export/route.ts":
    "A — no request input. `GET()` is a zero-arg handler returning the caller's own rows across the twelve user-owned tables (Phase 2 U16). There is no value a caller could supply for it to reject.",

  // --- B: path parameter only, unvalidated by design. The id is caller-supplied,
  //        but a malformed or foreign one resolves to 404 — never 400, because a
  //        400 distinguishing "not a uuid" from "not yours" is a weak existence
  //        oracle. These are exempt from 400, NOT from ownership testing.
  "src/app/api/advisor/actions/[id]/undo/route.ts":
    "B — path parameter only. `POST(_request, {params})`, request deliberately unused; unknown id → `notFound(\"Action\")`, already-undone → 409.",
  "src/app/api/advisor/conversations/[id]/route.ts":
    "B — path parameter only. `GET(_request, {params})`, request unused. Since U21 (`882d53e`) a foreign or unknown id yields `notFound(\"Conversation\")` rather than the empty list RLS used to return; U21 added no 400 path, so the exemption still holds.",
  "src/app/api/stacks/[id]/compare/route.ts":
    "B — path parameter only. `GET(_request, {params})`, request unused; unknown or foreign stack → `notFound(\"Stack\")`.",
  "src/app/api/stacks/[id]/evaluate/route.ts":
    "B — path parameter only. `POST(_request, {params})`, request unused; unknown or foreign stack → `notFound(\"Stack\")`.",

  // --- C: query parameter, coerced rather than validated.
  "src/app/api/side-effects/route.ts":
    "C — lenient coercion, not absence of input. `GET(request)` reads `?days` and coerces with `Number(...) || 90`; there is no rejection branch, so no input can produce a 400. Recorded honestly: `?days=abc` and `?days=0` both silently become 90 — that is FU-12, and the exemption holds either way, because the route cannot 400 whether or not the coercion is later tightened.",
};

function tracked(pattern: string): string[] {
  return execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", pattern], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\0")
    .filter(Boolean)
    .sort();
}

const ROUTES = tracked("src/app/api").filter((f) => f.endsWith("/route.ts"));

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), "utf8");
}

/** Comments stripped: a `.parse(` inside a header comment classifies nothing. */
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

const testFileFor = (route: string) => route.replace(/\.ts$/, ".test.ts");
/**
 * Both Zod entry points. `.safeParse(` does NOT contain `.parse(` — see the
 * header; assuming it did is how U17's route was misclassified.
 */
const VALIDATION_CALL = /\.(?:safeParse|parse)\s*\(/;
const validates = (route: string) => VALIDATION_CALL.test(code(route));

describe("ROUTE_CONTRACT: every route has a test, and it covers the contract", () => {
  it("scans a non-empty route set", () => {
    // A guard that scans nothing passes vacuously — the failure U27's M5 and
    // U15's M2 both target.
    expect(ROUTES.length, "no tracked src/app/api/**/route.ts files found").toBeGreaterThan(0);
  });

  it("every route file has a colocated test file", () => {
    const missing = ROUTES.filter((r) => !existsSync(join(REPO_ROOT, testFileFor(r))));
    expect(missing, "ROUTE_CONTRACT: route file(s) with no test file.").toEqual([]);
  });

  it("every route test asserts 401", () => {
    // The one assertion no route is exempt from. Every route under src/app/api
    // authenticates (§2.3 rule 11), so every route can return 401.
    const missing = ROUTES.filter((r) => !read(testFileFor(r)).includes("toBe(401)"));
    expect(
      missing,
      "ROUTE_CONTRACT: route test(s) that never assert 401. §2.3 rule 11 — every route under\n" +
        "src/app/api authenticates and returns 401 on failure. An untested auth boundary is the\n" +
        "one that serves another user's data.",
    ).toEqual([]);
  });

  it("every route test asserts a success status", () => {
    const missing = ROUTES.filter((r) => !/toBe\(20[0-9]\)/.test(read(testFileFor(r))));
    expect(missing, "ROUTE_CONTRACT: route test(s) with no happy-path status assertion.").toEqual([]);
  });

  it("every INPUT-VALIDATING route test asserts 400", () => {
    const validating = ROUTES.filter(validates);
    expect(validating.length, "no validating routes detected — the `.parse(` probe has stopped matching").toBeGreaterThan(0);

    const missing = validating.filter((r) => !read(testFileFor(r)).includes("toBe(400)"));
    expect(
      missing,
      "ROUTE_CONTRACT: route(s) that validate request input but whose test never asserts 400.",
    ).toEqual([]);
  });
});

describe("ROUTE_CONTRACT: the 400-exemption list is a ratchet in both directions", () => {
  it("every non-validating route is listed with a reason", () => {
    const unlisted = ROUTES.filter((r) => !validates(r) && !(r in EXEMPT_NO_400));
    expect(
      unlisted,
      "ROUTE_CONTRACT: route(s) with no 400 test and no exemption entry.\n" +
        "Either the route validates input and its test must assert 400, or it structurally cannot\n" +
        "and belongs in EXEMPT_NO_400 with a written reason. Silence is not a disposition — this\n" +
        "list existed as PROSE for three units precisely because nothing forced the choice.",
    ).toEqual([]);
  });

  it("no exemption entry names a route that now validates input", () => {
    // The direction a hand-maintained list always rots in. A route that gains
    // input validation keeps its exemption, and its 400 path goes untested
    // while the list still reads like a considered decision.
    const stale = Object.keys(EXEMPT_NO_400).filter((r) => ROUTES.includes(r) && validates(r));
    expect(
      stale,
      "ROUTE_CONTRACT: exempted route(s) that now validate request input. The exemption is stale —\n" +
        "remove the entry and assert 400 in the test.",
    ).toEqual([]);
  });

  it("no exemption entry names a route that no longer exists", () => {
    const orphaned = Object.keys(EXEMPT_NO_400).filter((r) => !ROUTES.includes(r));
    expect(orphaned, "ROUTE_CONTRACT: exemption entry for a route file that is not tracked.").toEqual([]);
  });

  it("every exemption carries a substantive reason", () => {
    for (const [route, reason] of Object.entries(EXEMPT_NO_400)) {
      expect(reason.length, `ROUTE_CONTRACT: the exemption for ${route} needs a real reason.`).toBeGreaterThan(40);
    }
  });

  it("the exemption list is exactly the non-validating routes — no more, no less", () => {
    // Set equality, so the two directions above cannot both pass while the list
    // drifts in size. Also the anti-vacuity check on the list itself: an empty
    // EXEMPT_NO_400 would satisfy "every entry has a reason" trivially.
    const nonValidating = ROUTES.filter((r) => !validates(r)).sort();
    expect(Object.keys(EXEMPT_NO_400).sort()).toEqual(nonValidating);
  });
});
