// Executable guardrail for CLAUDE.md §2.3 rule 13 — "internal error text never
// crosses the API boundary" — at the one place prose repeatedly failed to hold it.
//
// R3 fixed the shared boundary (`src/lib/api/respond.ts`). It could not fix the
// handlers that never reach that boundary: `POST` in advisor/actions caught its
// own exceptions at two sites, undo at one, and the advisor SSE stream at a
// fourth streamed `err.message` into an `error` event that `AdvisorPanel` renders
// into a role="alert" element. Four sites across three handler functions — live
// rank-1 violations, in a repository whose CLAUDE.md §3.5 records that "16
// boundary violations accumulated while the rule lived only in prose".
//
// (That paragraph is history, and one detail of it has since moved: Phase 1 U11
// extracted advisor/actions' confirm-and-apply path, so the two sites it names
// now live in `src/services/advisor-actions.ts`. They are still scanned — that
// is precisely what the SERVICE_MODULES inventory below is for.)
//
// ---------------------------------------------------------------------------
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ---------------------------------------------------------------------------
// For each `catch (binding)` clause and each `.catch(handler)` callback in a
// tracked API route, it seeds a tainted set with the caught binding, follows
// simple local aliases (`const e = err`), and flags every read of `message` or
// `stack` off a tainted value in these forms:
//
//   err.message                 property access
//   (err as Error).message      through parentheses, `as`, `satisfies`, `!`,
//                               and the legacy `(<Error>err).message` assertion
//   err["message"]              element access with a string literal
//   String(err)                 whole-value stringification
//   `${err}`                    template-literal interpolation
//   catch ({ message })         destructuring the text out of the binding
//   const { message } = err     same, one statement later
//   err.cause.message           `cause` carries taint (see TAINT_CARRIERS), at
//                               any chain depth: `err.cause.cause.message` too
//
// It flags a read of the TEXT, so it does not flag a whole-value pass of the
// binding itself — `internalError(err, …)`, `reportInternalError(err, …)`,
// `validationError(err)`, `throw err` are all clean. Note this is not a callee
// allowlist: there is no list of approved functions, and a whole-value pass to
// ANY callee is unflagged, `sendStraightToClient(err)` included. The two
// exceptions are `String(err)` and `` `${err}` ``, which stringify rather than
// pass. Non-text property reads such as `e.code`, and `body.message` on a
// binding that was never caught, are likewise clean.
//
// It OVER-detects in one direction, deliberately: it flags any read of the text,
// not only reads that reach the client. A `err.message.includes(…)` predicate or
// a `console.error(err.message)` discloses nothing to a user, but both would
// fail this rule. Neither exists in a route today. If one is ever genuinely
// needed, that is a conscious change to this file — which is the point.
//
// What it does NOT catch, stated plainly rather than implied away:
//   * a derivation through any property other than `cause` — `err.foo.message`
//     is not flagged (a `cause` chain of any depth is);
//   * the BODY of a destructured handler. `catch ({ message })` and
//     `.catch(({ message }) => …)` are recorded from the pattern itself, but the
//     body is never scanned, so `catch ({ cause }) { send(cause.message) }` is
//     missed while `catch (err) { send(err.cause.message) }` is caught;
//   * a two-argument `.then(onFulfilled, onRejected)` rejection handler — only
//     `.catch(handler)` is walked. No route uses the two-argument form today;
//   * taint that escapes the handler — stashing `err` on an object field, or
//     handing it to a helper in another module that reads `.message` there;
//   * `Object.values(err)`, `JSON.stringify(err)`, or reflection;
//   * a name inside the handler that shadows the caught binding — it stays
//     tainted, so `catch (err) { rows.forEach((err) => f(err.message)) }` is a
//     false positive;
//   * anything in a file outside the scanned inventory. That inventory is
//     `src/app/api/**/route.ts` PLUS `src/services/**/*.ts` (non-test) as of
//     Phase 1 U11 — see SERVICE_MODULES below for why the second half exists.
//     Everything else is still unscanned: `src/lib/**` in particular, so a
//     helper that reads `err.message` one import away from a route is missed.
// It is a regression guard for the forms this defect actually took and the
// obvious ways to re-spell them — not a taint-analysis engine.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Error properties that carry internal text. `code`, `name`, and friends do not. */
const TEXT_PROPS = new Set(["message", "stack"]);

/**
 * Properties that carry the taint onward rather than being text themselves.
 * `err.cause` is another exception: `respond.ts` has a whole `describeCause`
 * helper precisely because a cause's message is internal text worth confining to
 * the log, so `err.cause.message` must not be a hole in this rule.
 */
const TAINT_CARRIERS = new Set(["cause"]);

/**
 * Tracked files under `pathspec`, filtered by `keep`. Tracked-file discovery
 * mirrors boundaries.test.ts (Phase 0 R1): the repository is Git's index, not
 * one developer's working directory, so untracked scratch files and iCloud sync
 * duplicates cannot reach a rule or hide one.
 *
 * A `label` is required because an empty result is a HARD failure, and the
 * message has to say which inventory came back empty.
 */
function trackedFiles(
  pathspec: string,
  keep: (file: string) => boolean,
  label: string,
): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", pathspec],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "Error-disclosure guardrail could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- ${pathspec}\n` +
        "This suite defines the repository as Git's tracked files, so it cannot run\n" +
        "outside a Git worktree or without `git` on PATH.\n" +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const files = stdout.split("\0").filter((p) => p.length > 0 && keep(p));
  if (files.length === 0) {
    throw new Error(
      `Error-disclosure guardrail found zero tracked ${label}.\n` +
        "A guardrail that scans nothing passes vacuously, so this is a hard failure\n" +
        "rather than a silent green.",
    );
  }
  return files.sort();
}

const API_ROUTES = trackedFiles("src/app/api", (p) => p.endsWith("/route.ts"), "route files");

/**
 * Application-service modules (Phase 1 U11). These are scanned for the same
 * rule as routes, and the reason is specific rather than precautionary: U11
 * moved the advisor's confirm-and-apply catch blocks out of a route handler and
 * into `src/services/advisor-actions.ts`. Without this inventory, that move
 * would have taken the repository's most safety-critical error boundary out of
 * its own guard — a net REDUCTION in enforcement wearing the clothes of a
 * behaviour-preserving refactor, which nothing would have reported.
 *
 * Test files are excluded: they assert about error text on purpose.
 */
const SERVICE_MODULES = trackedFiles(
  "src/services",
  (p) => p.endsWith(".ts") && !p.endsWith(".test.ts"),
  "service modules",
);

/** Everything this rule applies to. */
const SCANNED_FILES = [...API_ROUTES, ...SERVICE_MODULES];

interface Violation {
  file: string;
  line: number;
  form: string;
  text: string;
}

/** Strips wrappers that change nothing about which value is being read. */
function unwrap(node: ts.Node): ts.Node {
  let current = node;
  for (;;) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      // `satisfies` predates neither our TS floor nor a future bump; feature-detect
      // so the guard cannot crash on a toolchain that lacks the predicate.
      (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(current))
    ) {
      current = (current as { expression: ts.Node }).expression;
      continue;
    }
    return current;
  }
}

/**
 * Every read of error text off a caught binding in one source file.
 *
 * Takes source *text*, not a path, so the self-test below can exercise it on
 * fixtures held in memory — a guard that has to write files into `src/app/api`
 * to test itself can leave debris in a live route tree if the process dies.
 */
function findViolations(fileName: string, sourceText: string): Violation[] {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const found: Violation[] = [];
  const record = (node: ts.Node, form: string) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    found.push({ file: fileName, line: line + 1, form, text: node.getText(source) });
  };

  /** Is this expression the caught value, a local alias, or `<tainted>.cause`? */
  const isTainted = (node: ts.Node, tainted: ReadonlySet<string>): boolean => {
    const inner = unwrap(node);
    if (ts.isIdentifier(inner)) return tainted.has(inner.text);
    if (ts.isPropertyAccessExpression(inner) && TAINT_CARRIERS.has(inner.name.text)) {
      return isTainted(inner.expression, tainted);
    }
    if (
      ts.isElementAccessExpression(inner) &&
      inner.argumentExpression &&
      ts.isStringLiteralLike(inner.argumentExpression) &&
      TAINT_CARRIERS.has(inner.argumentExpression.text)
    ) {
      return isTainted(inner.expression, tainted);
    }
    return false;
  };

  /** Names bound by a destructuring pattern that pull out error text. */
  const textNamesInPattern = (pattern: ts.ObjectBindingPattern): ts.BindingElement[] =>
    pattern.elements.filter((el) => {
      const key = el.propertyName ?? el.name;
      return ts.isIdentifier(key) && TEXT_PROPS.has(key.text);
    });

  const scanBody = (body: ts.Node, seed: string) => {
    const tainted = new Set<string>([seed]);

    const walk = (node: ts.Node) => {
      // `const e = err;` — follow the alias. Source order means a declaration is
      // visited before the reads that depend on it.
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name) && isTainted(node.initializer, tainted)) {
          tainted.add(node.name.text);
        }
        // `const { message } = err` / `const { message: m } = err`
        if (ts.isObjectBindingPattern(node.name) && isTainted(node.initializer, tainted)) {
          for (const el of textNamesInPattern(node.name)) record(el, "destructured-text");
        }
      }

      // err.message / (err as Error).message / err!.message
      if (
        ts.isPropertyAccessExpression(node) &&
        TEXT_PROPS.has(node.name.text) &&
        isTainted(node.expression, tainted)
      ) {
        record(node, "property-access");
      }

      // err["message"]
      if (
        ts.isElementAccessExpression(node) &&
        node.argumentExpression &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        TEXT_PROPS.has(node.argumentExpression.text) &&
        isTainted(node.expression, tainted)
      ) {
        record(node, "element-access");
      }

      // String(err) — a whole-value stringification is `err.message` with extra steps.
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "String" &&
        node.arguments.some((arg) => isTainted(arg, tainted))
      ) {
        record(node, "String()");
      }

      // `${err}` — same, via the template machinery.
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (isTainted(span.expression, tainted)) record(span.expression, "template-interpolation");
        }
      }

      ts.forEachChild(node, walk);
    };

    walk(body);
  };

  const visit = (node: ts.Node) => {
    if (ts.isCatchClause(node)) {
      const decl = node.variableDeclaration;
      if (decl) {
        if (ts.isIdentifier(decl.name)) {
          if (node.block) scanBody(node.block, decl.name.text);
        } else if (ts.isObjectBindingPattern(decl.name)) {
          // `catch ({ message })` — the pattern itself is the read.
          for (const el of textNamesInPattern(decl.name)) record(el, "destructured-text");
        }
      }
    }

    // `promise.catch(err => …)` never creates a CatchClause, but it is the same
    // handler with the same caught value.
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "catch" &&
      node.arguments.length > 0
    ) {
      const handler = unwrap(node.arguments[0]);
      if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
        const param = handler.parameters[0];
        if (param && ts.isIdentifier(param.name)) {
          scanBody(handler.body, param.name.text);
        } else if (param && ts.isObjectBindingPattern(param.name)) {
          for (const el of textNamesInPattern(param.name)) record(el, "destructured-text");
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  return found;
}

/** Same rule, applied to a tracked file on disk. */
function violationsInFile(file: string): Violation[] {
  return findViolations(file, fs.readFileSync(path.join(REPO_ROOT, file), "utf8"));
}

describe("API error disclosure — CLAUDE.md §2.3 rule 13", () => {
  it("finds route files to scan", () => {
    // A guardrail that scans nothing passes vacuously. 23 routes today.
    expect(API_ROUTES.length).toBeGreaterThanOrEqual(20);
    // The three handlers this rule was written for must be in the scanned set —
    // a pathspec or filter regression that dropped them would otherwise leave the
    // rule green while scanning only the routes that never had the defect.
    for (const required of [
      "src/app/api/advisor/route.ts",
      "src/app/api/advisor/actions/route.ts",
      "src/app/api/advisor/actions/[id]/undo/route.ts",
    ]) {
      expect(API_ROUTES, `${required} is not being scanned`).toContain(required);
    }
  });

  it("finds service modules to scan, including the extracted advisor boundary", () => {
    // Phase 1 U11 gate C2. `advisor-actions.ts` holds the two `internalError`
    // call sites that used to live in the route above; if this assertion ever
    // fails, the confirm-and-apply boundary has left this guard's inventory and
    // the rule below is green about a file it no longer reads.
    expect(SERVICE_MODULES.length).toBeGreaterThanOrEqual(1);
    expect(
      SERVICE_MODULES,
      "src/services/advisor-actions.ts is not being scanned",
    ).toContain("src/services/advisor-actions.ts");
    // Test files must not be in the inventory: they discuss error text on purpose.
    expect(SERVICE_MODULES.filter((f) => f.endsWith(".test.ts"))).toEqual([]);
  });

  it("no API route or service module reads a caught exception's error text", () => {
    const violations = SCANNED_FILES.flatMap(violationsInFile);

    expect(
      violations,
      violations.length === 0
        ? ""
        : "A route handler is reading a caught exception's text. This rule flags the READ,\n" +
            "not proof of disclosure — but this repo renders `error.message` at 17 call sites\n" +
            "across 15 files, and AdvisorPanel renders the SSE `error` event, so a read here\n" +
            "is one edit away from CLAUDE.md §2.3 rule 13 — rank 1.\n\n" +
            "Pass the whole value to the shared boundary instead:\n" +
            '  return internalError(err, { code: "YOUR_CODE" });   // 500 + correlation id\n' +
            '  const id = reportInternalError(err, "YOUR_CODE");   // already-streaming responses\n\n' +
            violations.map((v) => `  ${v.file}:${v.line}  [${v.form}]  ${v.text}`).join("\n"),
    ).toEqual([]);
  });

  // Without these, a walk() regression would make the rule above pass vacuously
  // and look like proof of safety. CLAUDE.md §5.2: a guard not shown to go red is
  // not a guard. Fixtures are parsed from memory — nothing is written to disk.
  describe("parser self-test", () => {
    const scan = (src: string) => findViolations("fixture.ts", src);

    it.each([
      ["property access", "try { go(); } catch (err) { return send(err.message); }"],
      ["cast through as", "try { go(); } catch (err) { return send((err as Error).message); }"],
      ["non-null assertion", "try { go(); } catch (err) { return send(err!.message); }"],
      [
        "satisfies wrapper",
        "try { go(); } catch (err) { return send((err satisfies unknown as Error).message); }",
      ],
      ["element access", 'try { go(); } catch (err) { return send(err["message"]); }'],
      ["stack, not just message", "try { go(); } catch (err) { return send(err.stack); }"],
      ["String()", "try { go(); } catch (err) { return send(String(err)); }"],
      ["template interpolation", "try { go(); } catch (err) { return send(`failed: ${err}`); }"],
      ["alias then read", "try { go(); } catch (err) { const e = err; return send(e.message); }"],
      [
        "alias then cast",
        "try { go(); } catch (err) { const e = err; return send((e as Error).message); }",
      ],
      ["catch destructuring", "try { go(); } catch ({ message }) { return send(message); }"],
      [
        "declared destructuring",
        "try { go(); } catch (err) { const { message: m } = err as Error; return send(m); }",
      ],
      [
        "promise .catch handler",
        "go().catch((err) => send(err.message));",
      ],
      [
        "promise .catch with destructured param",
        "go().catch(({ message }) => send(message));",
      ],
      ["cause hop", "try { go(); } catch (err) { return send((err as Error).cause.message); }"],
      [
        "cause hop through element access",
        'try { go(); } catch (err) { return send(err["cause"].message); }',
      ],
      ["String of a cause", "try { go(); } catch (err) { return send(String(err.cause)); }"],
      [
        "aliased cause",
        "try { go(); } catch (err) { const c = err.cause; return send(c.message); }",
      ],
    ])("detects %s", (_label, src) => {
      expect(scan(src).length).toBeGreaterThan(0);
    });

    it.each([
      ["a hand-authored message", "try { go(); } catch (err) { return send('safe'); }"],
      ["body.message outside any catch", "const body = { message: 'hi' }; send(body.message);"],
      [
        "body.message inside a catch",
        "try { go(); } catch (err) { return send(body.message); }",
      ],
      ["a non-text property", "try { go(); } catch (e) { if (e.code === 'X') return send('safe'); }"],
      ["an instanceof narrowing", "try { go(); } catch (err) { if (err instanceof ZodError) return v(err); }"],
      ["a rethrow", "try { go(); } catch (err) { throw err; }"],
      [
        "a whole-value pass to the boundary helper",
        "try { go(); } catch (err) { return internalError(err, { code: 'ACTION_ERROR' }); }",
      ],
      [
        "a whole-value pass to reportInternalError",
        "try { go(); } catch (err) { const id = reportInternalError(err, 'ADVISOR_ERROR'); return sse(id); }",
      ],
    ])("does not flag %s", (_label, src) => {
      expect(scan(src)).toEqual([]);
    });

    it("reports the offending line and form", () => {
      const hits = scan(
        [
          "export function a(){ try { go(); } catch (err) { return send(err.message); } }",
          "export function b(){ try { go(); } catch (err) { return send(String(err)); } }",
          "export function c(){ try { go(); } catch (e) { return send('safe'); } }",
        ].join("\n"),
      );
      expect(hits.map((h) => [h.line, h.form])).toEqual([
        [1, "property-access"],
        [2, "String()"],
      ]);
    });
  });
});
