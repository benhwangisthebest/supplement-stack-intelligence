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
