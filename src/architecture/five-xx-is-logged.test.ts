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
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blankStringsAndComments, stripComments, stripLineComments } from "./__testing__/strip";

import { REDACTED_LOG_FIELDS } from "@/lib/api/redact";
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

    // [2026-09-22, N-79 → closed by Phase 4 U1] This strip used to be unanchored,
    // so a `//` inside a URL literal could blank a `handle(` beside it. It is now
    // the shared `stripComments` (FU-47), which removes exactly what the
    // TypeScript parser calls a comment (Phase 4 U19); see `./__testing__/strip.ts`.
    const unwrapped = routes.filter((f) => {
      const text = stripComments(readFileSync(path.join(ROOT, f), "utf8"), f);
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
    // STATED LIMITATION (`ecc:code-reviewer`, (d1b)), NARROWED by Phase 4 U1: the
    // strip is the shared `stripComments` (FU-47), so a `//` inside a URL literal
    // no longer blinds the rest of the line. Since Phase 4 U19 the comments are the
    // TypeScript parser's (`./__testing__/strip.ts`), and line structure is kept,
    // which this positional check needs. The CHECK is still a text scan over the
    // stripped code, not an AST walk. An AST scan remains the fix if this ever governs
    // more than two hand-read files, as U33's `readsIdentifier` had to.
    const codeOf = (f: string) => stripComments(readFileSync(path.join(ROOT, f), "utf8"), f);

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

// ---------------------------------------------------------------------------
// FU-47 / N-79 — self-tests for the shared stripper this file's two scans use.
// Driven against synthetic input with a known answer (the Phase 0 N3 pattern):
// a stripper that silently kept or dropped the wrong text would otherwise
// report "no drift" on real files. The first case is N-79's red proof: the
// pre-U1 regex is kept here verbatim as `PRE_U1`, so the contrast stays executable.
// ---------------------------------------------------------------------------
describe("STRIP_COMMENTS — the shared comment-stripper (FU-47, N-79)", () => {
  const PRE_U1 = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

  it("STRIP_COMMENTS: a `//` inside a URL literal is code, not a comment — the pre-U1 regex blanked it", () => {
    const src = 'const docs = "https://example.com/x"; return handle(async () => ok());';
    expect(PRE_U1(src)).not.toContain("handle(");
    expect(stripComments(src)).toContain("handle(");
  });

  it("STRIP_COMMENTS: trailing and whole-line comments are both removed", () => {
    const out = stripComments("run(); // handle( in a comment\n  // handle( again\nnext();");
    expect(out).not.toContain("handle(");
    expect(out).toContain("run();");
    expect(out).toContain("next();");
  });

  it("STRIP_COMMENTS: block comments are removed; line comments are removed without removing newlines", () => {
    expect(stripComments("a(); /* handle( */ b();")).not.toContain("handle(");
    const src = "a(); // x\n  // y\nb(); // c\n'x' // d";
    expect(stripComments(src).split("\n")).toHaveLength(src.split("\n").length);
  });

  it("STRIP_COMMENTS: a regex literal with escaped slashes is not a comment", () => {
    expect(stripComments("expect(s).not.toMatch(/postgres:\\/\\//i); handle(x);")).toContain("handle(x)");
  });

  it("STRIP_COMMENTS: the reviewer's adversarial cases never KEEP a comment (U1 review, MAJOR 2)", () => {
    const cases = [
      "return /'/.test(s); // handle(",
      "const r = a++ / 2; // handle(",
      "const r = a\n  / b; // handle(",
      "if (x) return /`/.test(s); // handle(\nnext();",
      "<p>Don't do that</p>; // handle(",
    ];
    for (const src of cases) expect(stripComments(src), src).not.toContain("handle(");
    expect(stripComments("if (x) return /`/.test(s); // c\nnext();")).toContain("next();");
    // Second review (U1): a regex right after `=>`, and a `//` with no space before it.
    const more = ["xs.filter((l) => /`/.test(l)); // handle(\nnext(); // handle(", "<p>Don't</p>;// handle("];
    for (const src of more) expect(stripComments(src), src).not.toContain("handle(");
    expect(stripComments('<a>Don\'t "https://x.test/y"</a>;')).toContain("https://x.test/y");
  });

  // Phase 4 U19 (FU-73, N-88): the helper now asks the TypeScript parser. The
  // U1 helper's block-comment regex is kept here verbatim as `PRE_U19_BLOCK`, so
  // each contrast below stays executable.
  const PRE_U19_BLOCK = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ");

  it("STRIP_COMMENTS: U1's KNOWN LIMIT now passes: a misread backtick no longer keeps the comments after it (FU-73)", () => {
    // A regex holding a backtick right after `)`, and a lone backtick in JSX text.
    const cases = ["if (x) /`/.test(s) ? a() : b(); // handle(\nnext();", "<p>use a ` here</p>; // handle(\nnext();"];
    for (const src of cases) {
      expect(stripComments(src), src).not.toContain("handle(");
      expect(stripComments(src), src).toContain("next();");
    }
  });

  it("STRIP_COMMENTS: a slash-star inside a LINE comment no longer hides the code after it (N-88 (2))", () => {
    const src = '// the gateway serves `/v1/*` paths\nconst model = "gpt-4o-mini";\n/* closes here */ ok();';
    expect(PRE_U19_BLOCK(src)).not.toContain("gpt-4o-mini");
    expect(stripComments(src)).toContain('const model = "gpt-4o-mini";');
    expect(stripComments(src)).toContain("ok();");
    expect(stripComments(src)).not.toContain("closes here");
  });

  it("STRIP_COMMENTS: a slash-star inside a glob STRING no longer eats code (N-88)", () => {
    const src = 'const glob = "src/lib/*.ts"; handle(x); const end = "*/";';
    expect(PRE_U19_BLOCK(src)).not.toContain("handle(x)");
    expect(stripComments(src)).toBe(src);
  });

  it("STRIP_COMMENTS: a multi-line block comment keeps its line breaks, so line numbers survive", () => {
    const src = "a();\n/**\n * doc\n */\nb(); /* x\n y */ c();";
    const out = stripComments(src);
    expect(out.split("\n")).toHaveLength(src.split("\n").length);
    expect(out.split("\n")[4]).toContain("b();");
    expect(out.split("\n")[5]).toContain("c();");
    expect(out).not.toContain("doc");
  });

  it("STRIP_COMMENTS: stripLineComments keeps block comments; JSON comments are lexed by file name", () => {
    expect(stripLineComments("a(); /* keep */ b(); // drop")).toContain("/* keep */");
    expect(stripLineComments("a(); /* keep */ b(); // drop")).not.toContain("drop");
    const json = '{\n  // note\n  "a": "https://x.test/*", /* c */ "b": 1\n}';
    expect(JSON.parse(stripComments(json, "tsconfig.json"))).toEqual({ a: "https://x.test/*", b: 1 });
  });

  it("STRIP_COMMENTS: blankStringsAndComments preserves every index, and a `//` in a URL blanks only its literal (N-88 (1))", () => {
    const src = 'go("https://x.test/{"); test("t {", () => { /* { */ skip(); }); // {';
    const out = blankStringsAndComments(src);
    expect(out).toHaveLength(src.length);
    expect(out).toContain("skip();");
    expect([...out].filter((c) => c === "{").length).toBe(1);
    expect(out.indexOf("skip();")).toBe(src.indexOf("skip();"));
  });

  it("STRIP_COMMENTS: text inside JSX and inside a JSDoc comment is never re-read as a comment", () => {
    // JSX text is one token: a `//` in it is text, and so is what follows it.
    expect(stripComments("<p>// not a comment</p>;\nnext();")).toContain("<p>// not a comment</p>");
    // A `//` inside a JSDoc block is part of that block, so stripLineComments keeps it.
    const jsdoc = "/**\n * Text // here\n * @see {@link x} // there\n */\nexport const a = 1;";
    expect(stripLineComments(jsdoc)).toBe(jsdoc);
  });

  it("STRIP_COMMENTS: source that does not parse THROWS rather than being stripped by a guess", () => {
    expect(() => stripComments("const = ;", "x.ts")).toThrow(/does not parse/);
    expect(() => stripComments("a();", "schema.sql")).toThrow(/no JS, TS or JSON lexer/);
  });
});

// ---------------------------------------------------------------------------
// LOG_REDACTION — Phase 4 U15, ruling D-7 (d); N-40 and FU-41, narrowed.
//
// Everything `respond.ts` and `src/middleware.ts` write to the console passes
// through `redactErrorLog` (`src/lib/api/redact.ts`), which keeps the owner's
// allowlist and drops the rest. The rows it narrows were STRUCTURAL: nothing
// stood between health-bearing error text and a log line. This binds the
// structure, so a future `console.error(err)` in either file is a red build.
//
// WHAT IT DOES NOT DO, stated because a guard's limits belong in it:
//   · It governs two files, by name — the brief's scope. A console call anywhere
//     else in `src/` is not this guard's business (`seed.ts` and the OpenAI
//     client's `console.warn` are outside it).
//   · There is still no sink (N-11, FU-43, FU-44 open). This proves what is
//     WRITTEN, not where it goes.
//   · Any `console` IDENTIFIER in these files that is not the compliant call
//     shape is a violation — which closes a local alias and `globalThis.console`
//     (pinned in the self-test). Not seen: a computed `globalThis["console"]`,
//     an alias built in another module, and other sinks such as
//     `process.stderr.write` (U15 review advisory 3).
// ---------------------------------------------------------------------------

/** The files whose console output must pass through the layer (U15 brief). */
const REDACTED_FILES = ["src/lib/api/respond.ts", "src/middleware.ts"] as const;

/**
 * Every `console` reference in `source` that is not exactly
 * `console.error(redactErrorLog(...))` — one argument, and that argument a direct
 * call to the layer. Returned as "line: text" so the red output names the site.
 */
function unredactedConsoleUses(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "console") {
      const access = node.parent;
      const call = access?.parent;
      const compliant =
        access !== undefined &&
        ts.isPropertyAccessExpression(access) &&
        access.expression === node &&
        access.name.text === "error" &&
        call !== undefined &&
        ts.isCallExpression(call) &&
        call.expression === access &&
        call.arguments.length === 1 &&
        ts.isCallExpression(call.arguments[0]) &&
        ts.isIdentifier(call.arguments[0].expression) &&
        call.arguments[0].expression.text === "redactErrorLog";
      if (!compliant) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        const site = (call ?? access ?? node).getText(sf).split("\n")[0];
        out.push(`${fileName}:${line + 1}: ${site}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe("LOG_REDACTION — respond.ts and middleware.ts log only through the allowlist (U15)", () => {
  it("the allowlist is exactly the owner's five fields — changing it is a ruling, not a commit", () => {
    // Owner definition, 2026-09-29: error class name, error code, HTTP status,
    // route pattern, request id. Asserted against the IMPORTED binding, for the
    // reason `EXEMPT` above is: a test that re-types what it checks checks itself.
    expect([...REDACTED_LOG_FIELDS].sort()).toEqual(["code", "errorClass", "requestId", "route", "status"]);
  });

  it("every console call in the governed files is console.error(redactErrorLog(...))", () => {
    const tracked = new Set(trackedSource());
    for (const f of REDACTED_FILES) expect(tracked, `${f} is not tracked — the scope went vacuous`).toContain(f);

    const violations = REDACTED_FILES.flatMap((f) =>
      unredactedConsoleUses(f, readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(
      violations,
      "these console uses bypass src/lib/api/redact.ts, so whatever they are handed —\n" +
        "an error message, a stack, a row — reaches the log unfiltered (N-40, §2.3 rule 15):\n  " +
        violations.join("\n  "),
    ).toEqual([]);

    // ANTI-VACUITY. respond.ts must actually log through the layer: a file with
    // no console call at all would pass the check above by matching nothing,
    // and would also have stopped recording 5xx failures.
    const respond = readFileSync(path.join(ROOT, "src/lib/api/respond.ts"), "utf8");
    expect(respond).toMatch(/console\.error\(\s*redactErrorLog\(/);
  });

  it("the detector itself goes red on the shapes it exists to catch (known-answer self-test)", () => {
    const planted = [
      "console.error(err);",
      "console.error(`[api] ${code}`, { message: err.message });",
      "console.error(redactErrorLog(x), err);",
      "console.warn(err.stack);",
      "console.log(redactErrorLog(x));",
      "const log = console.error; log(err);",
      "console['error'](err);",
      "globalThis.console.error(err);",
    ];
    for (const src of planted) expect(unredactedConsoleUses("planted.ts", src), src).toHaveLength(1);
    expect(unredactedConsoleUses("ok.ts", "console.error(redactErrorLog({ thrown: e }));")).toEqual([]);
    expect(unredactedConsoleUses("ok.ts", "// console.error(err)\nconst s = 'console.error(err)';")).toEqual([]);
  });

  it("redact.ts is pure: no imports and no console", () => {
    const text = readFileSync(path.join(ROOT, "src/lib/api/redact.ts"), "utf8");
    const sf = ts.createSourceFile("redact.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    expect(sf.statements.filter((s) => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s))).toEqual([]);
    // Not even the compliant shape: the layer builds the record, it never writes it.
    const consoleRefs: string[] = [];
    const visit = (n: ts.Node): void => {
      if (ts.isIdentifier(n) && n.text === "console") consoleRefs.push(n.getText(sf));
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(consoleRefs, "redact.ts must not write anywhere — it returns the record").toEqual([]);
  });

  it("AC-3: a 5xx is still logged, as one record carrying the allowlisted fields", async () => {
    const res = fail("EXTRACTION_FAILED", "a client-safe message", 502);
    const parsed = await body(res);
    expect(logged).toHaveLength(1);
    expect(logged[0], "one argument: the record").toHaveLength(1);
    expect(logged[0][0]).toEqual({
      errorClass: "DeclaredFailure",
      code: "EXTRACTION_FAILED",
      status: 502,
      requestId: parsed.error.correlationId,
    });
  });
});
