// FIVE_XX_IS_LOGGED — no 5xx response leaves this application without a
// correlated server-side log record. Spec: the Phase 2 closeout, landing (d1),
// remediation P2-R1; Check finding P2-1.
//
// WHAT WENT WRONG WITHOUT IT. `docs/roadmap.md`'s `[P2-X1]` says "every 5xx has
// a correlating server-side log entry with a request ID". It was ticked at the
// Phase 2 closeout and the independent Check found the clause FALSE: three
// sites answered 5xx and returned before `logInternalError()` ever ran —
//   · `respond.ts`         NotConfiguredError caught inside handle()'s catch,
//                          returning fail(…, 503) before internalError()
//   · `advisor/route.ts`   fail(…, 503) returned before handle() is entered
//   · `extract/route.ts`   a LOCAL try/catch returning fail(…, 502), so
//                          handle()'s outer catch never sees it
// Each answered a client with a code and no correlation id, and left no record
// a support path could join it to. The criterion was ticked anyway, because
// nothing checked it — `error-disclosure` proves no internal TEXT escapes, and
// that is a different property from "the failure was recorded at all".
//
// WHY THE FIX IS IN `fail()` AND NOT AT THE THREE SITES. Three hand-routed call
// sites are three things to remember. A status-keyed rule inside `fail()` is one
// thing that cannot be forgotten, and it governs the fourth site nobody has
// written yet — §3 rule 5's ceiling, the difference between a rule that is
// checked and a rule that cannot be broken. The threshold is >= 500 because that
// is the criterion's own word, "5xx": 4xx is the caller's fault and is not an
// internal failure to record. 422 UNREADABLE_DOCUMENT is deliberately untouched.
//
// WHAT THIS GUARD DOES NOT DO, stated because a guard's limits belong in it:
//   · It does not prove the record REACHES anywhere. There is still no sink
//     beyond console.error — roadmap item 1's residue, carried as N-11 + U23.
//     This guard proves the record is WRITTEN, not that it is retained.
//   · Its structural half matches `NextResponse.json(`/`new Response(` with a
//     numeric status literal. A status computed at runtime is invisible to it
//     (N-14's class). The behavioural half is what actually binds the property.
//   · IT SEES CONSTRUCTION, NOT REACHABILITY — and that limit has a name and a
//     cost. `ecc:security-reviewer` enumerated the 5xx paths at (d1) and found
//     two this guard structurally cannot see, because neither constructs a
//     literal 5xx: an unguarded window in a route that is not wrapped in
//     `handle()` (a throw escapes and Next.js generates the 500), and a throw in
//     edge middleware. The first is closed by **P2-R4** and BOUND BELOW by
//     `UNWRAPPED_ROUTES` — because a fix nothing asserts is a fix that lasts
//     until the next refactor. The second is **FU-43**, owned by the phase that
//     adds a logging sink, alongside N-11.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DECLARED_OPERATIONAL_STATES, fail, INTERNAL_ERROR_MESSAGE } from "@/lib/api/respond";

const ROOT = path.resolve(__dirname, "../..");

/** Tracked source, from the repository index — not the working tree (R1). */
function trackedSource(): string[] {
  const out = execFileSync("git", ["ls-files", "-z", "src"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
  return out.split("\0").filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
}

const SOURCE = trackedSource().filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

/**
 * The three shapes the Check found unlogged, named here so the red output names
 * them. Each is a real `fail(...)` call from the repository, reduced to its
 * arguments — the site is identified by the pair it answers with.
 */
const FIVE_XX_SITES = [
  { site: "src/app/api/lab-import/extract/route.ts (local catch, handle never sees it)", code: "EXTRACTION_FAILED", status: 502 },
] as const;

/**
 * THE ONE 5xx CODE THAT IS DELIBERATELY NOT RECORDED, and why this list exists
 * rather than the criterion simply saying "every 5xx".
 *
 * Phase 2 **U1** ruled that a configuration gap is a known operational state and
 * minted no id for it. P2-R1 discovered that ruling by breaking it: making every
 * 5xx log turned **six** tests red across two guards — `respond.test.ts`'s **T5**
 * (*"no id is minted and nothing is written to the error log"*) and U33's
 * `NOT_CONFIGURED_TOTALITY` assertion that the 503 body is **byte-identical**
 * across all four AI reasons, which a per-request id breaks by construction.
 *
 * Neither guard was weakened to accommodate P2-R1. The criterion is narrowed
 * instead, which is the disposition the Check's certifier offered first.
 *
 * Pinned as an EQUALITY: a second exempt code cannot appear without this going
 * red and someone writing the reason beside it.
 */
const EXEMPT = [...DECLARED_OPERATIONAL_STATES].sort();

/** A 4xx control — this one must NOT acquire a correlation id or a log line. */
const FOUR_XX_CONTROL = { code: "UNREADABLE_DOCUMENT", status: 422 } as const;

let logged: unknown[][];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function body(res: Response): Promise<{ error: { code: string; message: string; correlationId?: string } }> {
  return (await res.json()) as { error: { code: string; message: string; correlationId?: string } };
}

describe("FIVE_XX_IS_LOGGED — every 5xx carries a correlated record", () => {
  it.each(FIVE_XX_SITES)(
    "$site → $status answers with a correlation id",
    async ({ site, code, status }) => {
      const res = fail(code, "a client-safe message", status);
      const parsed = await body(res);
      expect(
        parsed.error.correlationId,
        `${site}: a ${status} reached the client with NO correlation id. ` +
          `[P2-X1] claims every 5xx carries one; a client cannot quote an id that was never issued, ` +
          `and no support path can find this failure.`,
      ).toEqual(expect.any(String));
    },
  );

  it.each(FIVE_XX_SITES)(
    "$site → $status writes exactly one server-side record carrying that id",
    async ({ site, code, status }) => {
      const res = fail(code, "a client-safe message", status);
      const parsed = await body(res);
      expect(logged.length, `${site}: ${status} wrote ${logged.length} log records, expected exactly 1`).toBe(1);
      expect(
        JSON.stringify(logged[0]),
        `${site}: the log record does not carry the id the client was given (${parsed.error.correlationId}). ` +
          `An id with no matching record is worse than no id: it invites a support path that dead-ends.`,
      ).toContain(String(parsed.error.correlationId));
    },
  );

  it.each(EXEMPT)(
    "%s is a declared operational state: 5xx, and deliberately NOT recorded (U1)",
    async (code) => {
      const res = fail(code, "a client-safe message", 503);
      const parsed = await body(res);
      expect(parsed.error.correlationId, `${code} must mint no id — U1's ruling, pinned by T5`).toBeUndefined();
      expect(logged.length, `${code} must write no record — a per-request id also breaks U33's byte-identical 503`).toBe(0);
    },
  );

  it("the exempt set is exactly one code — a second needs a reason, not a commit", () => {
    // An equality, not a subset: this is what stops the exemption becoming a
    // general-purpose opt-out, which is the arrangement P2-R1 exists to remove.
    // Asserted against the set IMPORTED from respond.ts, not a literal re-typed
    // here. `ecc:code-reviewer` proved the re-typed form vacuous: a second,
    // unused entry added to the production set left this file 7/7 green. A test
    // that re-types what it checks is checking itself — which is the exact
    // anti-vacuity defect this closeout exists to remove, found inside the
    // closeout's own remediation.
    expect(EXEMPT).toEqual(["NOT_CONFIGURED"]);
  });

  it("a 4xx acquires neither an id nor a record — the threshold is 5xx, not 'any failure'", async () => {
    const res = fail(FOUR_XX_CONTROL.code, "Couldn't read this file — try CSV or paste.", FOUR_XX_CONTROL.status);
    const parsed = await body(res);
    expect(parsed.error.correlationId, "a 422 must not acquire a correlation id").toBeUndefined();
    expect(logged.length, "a 422 is the caller's input, not an internal failure to record").toBe(0);
  });

  it("an explicitly supplied correlation id is used as given and not double-logged", async () => {
    // internalError() already logs and passes its id through. If fail() logged
    // again, every unexpected 500 would write two records under one id.
    const res = fail("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500, undefined, "supplied-id-0001");
    const parsed = await body(res);
    expect(parsed.error.correlationId).toBe("supplied-id-0001");
    expect(logged.length, "fail() must not re-log an id its caller already logged").toBe(0);
  });

  it("every route handler is wrapped in handle(), or guards its own window — P2-R4", () => {
    // REACHABILITY, not construction. A route not wrapped in `handle()` lets a
    // throw escape into a framework-generated 500 with no id and no record, and
    // the structural scan above cannot see it because nothing in the file
    // constructs a 5xx.
    //
    // Two routes are deliberately unwrapped, each for a stated reason, and each
    // must therefore carry its own catch. Pinned as an EQUALITY so a third
    // cannot appear silently: a new unwrapped route is a red build and a written
    // reason, not a quiet regression.
    const routes = SOURCE.filter((f) => /^src\/app\/api\/.*\/route\.ts$/.test(f));
    expect(routes.length, "found no API routes to check").toBeGreaterThan(20);

    const unwrapped = routes.filter((f) => {
      const text = readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
      return !/\bhandle[(<]/.test(text);
    });

    expect(
      unwrapped.sort(),
      "these API routes are not wrapped in handle(). Each must guard its own\n" +
        "pre-response window with a try/catch that reports through\n" +
        "internalError/reportInternalError, or a throw becomes a framework 500\n" +
        "with no correlation id and no log record — invisible to the scan above:\n  " +
        unwrapped.join("\n  "),
    ).toEqual(["src/app/api/advisor/actions/route.ts", "src/app/api/advisor/route.ts"]);

    // BOTH unwrapped routes must carry a reporting catch. No exemptions.
    //
    // [2026-09-22, N-76] This block previously exempted
    // `advisor/actions/route.ts` on the ground that it delegates to
    // `confirmAndApply`, which reports its own failures. True of the WORK and
    // false of the WINDOW before it: a throw from `createClient()` escaped and
    // became an uncorrelated framework 500. The exemption was removed by owner
    // ruling in the same landing that closed the gap, so the pin now says what a
    // reader would assume it said.
    //
    // A literal check, deliberately: proving each catch is REACHED is what the
    // route tests do (P2-R4's cases in advisor/route.test.ts, N-76's in
    // actions/route.test.ts). This stops one being deleted.
    // KEYED ON THE PRE-STREAM CODE, not on "the file reports somewhere".
    //
    // [2026-09-22] The first form of this check asked only whether the file
    // contained `internalError(` or `reportInternalError(` anywhere. It passed
    // with the pre-stream catch DELETED from `advisor/route.ts`, because that
    // file also reports from its in-stream SSE handler — a guard satisfied by an
    // unrelated call elsewhere in the same file. Found by mutating the fix it
    // was written to protect, which is the only way this class is ever found.
    //
    // The two pre-stream catches share a naming convention ending
    // `PRESTREAM_ERROR`; keying on it makes the check specific to the window
    // being guarded. Brittle by design: renaming the code is a deliberate act
    // that should redden and be re-read, not a silent one.
    const unreported = unwrapped.filter((f) => {
      const text = readFileSync(path.join(ROOT, f), "utf8");
      return !(
        /catch\s*\(/.test(text) &&
        /internalError\(\s*e\s*,\s*\{\s*code:\s*"[A-Z_]*PRESTREAM_ERROR"/.test(text)
      );
    });
    expect(
      unreported,
      "these routes are unwrapped AND do not report a caught throw, so a failure in\n" +
        "them becomes a framework 500 with no correlation id and no log record:\n  " +
        unreported.join("\n  "),
    ).toEqual([]);

    // THE WINDOW MUST OPEN AT THE FIRST STATEMENT, NOT THE SECOND.
    //
    // [2026-09-22, widened on owner ruling] The first form of this landing
    // opened each route's guarded window at `createClient()`. `getUser()` runs
    // one statement earlier, outside every `try` — so the very defect being
    // closed survived in the same handler, at its first line. Found by
    // `ecc:security-reviewer`'s final (A) re-enumeration, which was handed the
    // expected answer and falsified it.
    //
    // Positional, because the defect was positional: a route may call
    // `getUser()` wherever it likes, but not before it has somewhere for a
    // throw to land.
    // STATED LIMITATION (`ecc:code-reviewer`, (d1b)): this strips comments with
    // two regexes and is NOT lexer-aware. A `//` inside a string or template
    // literal — a URL, say — would blind the rest of that line, hiding a real
    // `try {` or `getUser(` from the scan. Neither scanned file contains one
    // today, checked; it is recorded because a guard's blind spot belongs beside
    // the guard, not in a review nobody reads again. An AST scan is the fix if
    // this ever governs more than two hand-read files — the same trade U33's
    // `readsIdentifier` eventually had to make, for the same reason.
    const codeOf = (f: string) =>
      readFileSync(path.join(ROOT, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ");

    // ANTI-VACUITY FIRST. The positional check below is a no-op for a route that
    // does not call `getUser` at all, so a rename would silence it rather than
    // redden it. Pinning that every unwrapped route authenticates removes that
    // exit — and is §2.3 rule 11 for the two routes `handle()` does not cover.
    expect(
      unwrapped.filter((f) => /\bgetUser\s*\(/.test(codeOf(f))),
      "an unwrapped route stopped calling getUser(), which both drops §2.3 rule 11\n" +
        "and makes the position check below pass by matching nothing",
    ).toEqual(unwrapped);

    const authOutsideWindow = unwrapped.filter((f) => {
      const text = codeOf(f);
      const firstTry = text.search(/\btry\s*\{/);
      const firstAuth = text.search(/\bgetUser\s*\(/);
      return firstAuth >= 0 && (firstTry < 0 || firstAuth < firstTry);
    });
    expect(
      authOutsideWindow,
      "these unwrapped routes call getUser() before opening any try, so a throw from\n" +
        "it — cookies() outside a request scope, or any non-AuthError the SDK re-throws —\n" +
        "escapes as a framework 500 with no correlation id and no log record, exactly as\n" +
        "the rest of the pre-response window did before this landing:\n  " +
        authOutsideWindow.join("\n  "),
    ).toEqual([]);

    // Each must also answer a NotConfiguredError as the declared operational
    // state it is, rather than collapsing it into a generic 500 — the taxonomy
    // regression `ecc:security-reviewer` caught in this landing's own new code.
    for (const f of unwrapped) {
      const text = readFileSync(path.join(ROOT, f), "utf8");
      expect(
        /instanceof NotConfiguredError/.test(text),
        `${f} no longer special-cases NotConfiguredError, so unset Supabase env answers\n` +
          "500 here and 503 everywhere else, and mints an id U1's ruling forbids.",
      ).toBe(true);
    }
  });

  it("no 5xx response is constructed outside fail() — inventory non-empty and pinned", () => {
    expect(SOURCE.length, "scanned no source files — the inventory cannot be empty").toBeGreaterThan(100);
    const raw: string[] = [];
    for (const rel of SOURCE) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      const re = /(?:NextResponse\.json|new Response)\([\s\S]{0,400}?status:\s*(5\d\d)/g;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        if (rel === "src/lib/api/respond.ts") continue; // fail() itself is the one sanctioned constructor
        raw.push(`${rel}: status ${m[1]}`);
      }
    }
    expect(
      raw,
      `these construct a 5xx response without going through fail(), so the logging rule inside fail() ` +
        `cannot govern them:\n  ${raw.join("\n  ")}`,
    ).toEqual([]);
  });
});
