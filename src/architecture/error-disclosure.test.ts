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
//   err.toString(), JSON.stringify(err)   the same (U4, from the U4 review)
//   `${err}`                    template-literal interpolation
//   catch ({ message })         destructuring the text out of the binding
//   const { message } = err     same, one statement later
//   err.cause.message           `cause` carries taint (see TAINT_CARRIERS), at
//                               any chain depth: `err.cause.cause.message` too
//
// SECOND SOURCE (Phase 4 U4, FU-31 retargeted by P-04). Supabase's client does
// not throw: it returns `{ data, error }`. So the error that reached the browser
// from `src/lib/auth/actions.ts:27,44` never passed through a catch clause, and the
// model above could not see it however wide the scan. A declaration that
// destructures `error` out of an AWAITED value — `const { error } = await …`,
// `{ error: e }` included — seeds the same walk over its enclosing block, with
// its forms prefixed `result-` in the report. Two forms apply to it only:
//
//   return { error } / return error     the whole object as a server action's
//                                       return value (`"use server"` module or
//                                       function), because that return IS the
//                                       response
//   NextResponse.json({ error })        the whole object in a response body
//
// A result error returned whole from any other module is not flagged: that is a
// repository handing a result to an in-process caller, and `__testing__/fake-
// stack-db.ts` imitates Supabase that way on purpose (it was the first false
// positive measured, before this scoping). Reading `error.code` is clean, which
// is how owned copy is chosen.
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
//   * a result error not destructured from an await: `const r = await go();
//     send(r.error.message)`, a `.then(({ error }) => …)` callback, or a
//     synchronous `{ error }` such as zod's `safeParse` (pinned as a self-test);
//   * a result error in a response built any way but `NextResponse.json`/
//     `Response.json` — `new Response(body)`, or a local helper that wraps one;
//   * a result error returned whole from a module that is not a server action,
//     and then returned onward by one that is — the taint does not cross modules;
//   * anything in a file outside the scanned inventory — see the next block,
//     which states exactly what that is.
// It is a regression guard for the forms this defect actually took and the
// obvious ways to re-spell them — not a taint-analysis engine.
//
// ---------------------------------------------------------------------------
// WHAT IS AND IS NOT SCANNED — three inventories, as of Phase 2 U2
// ---------------------------------------------------------------------------
// SCANNED:
//   * `src/app/api/**/route.ts`     — API_ROUTES, the original inventory
//   * `src/services/**/*.ts`        — SERVICE_MODULES, added by Phase 1 U11
//   * `src/lib/**/*.ts`             — LIB_MODULES, added by Phase 2 U2 (FU-7)
//   (non-test files only, in all three)
//
// NOT SCANNED, named rather than left to be discovered:
//   * `src/components/**` — 31 client modules, and the place `error.message` is
//     actually RENDERED. They read a message off an API envelope, not off a
//     caught exception, so this detector's model does not apply to them; a rule
//     for that layer is a different rule, not a wider pathspec here.
//   * `src/app/**/page.tsx` and every other non-route file under `src/app`.
//   * `src/data/**`, `src/types/**` — inert.
//   * ~~**The one `"use server"` module, `src/lib/auth/actions.ts`.** It IS inside
//     LIB_MODULES' pathspec and so is walked — but its reads at :27 and :44 are
//     of a returned Supabase result object, not of a caught binding, so the
//     detector's model does not reach them and this extension does NOT close
//     them. That module is a POST endpoint the browser calls directly and
//     `AUTH_COVERAGE` does not see it either. Recorded as **FU-31**; unclosed,
//     and deliberately not papered over by a passing green here.~~
//     **[2026-09-29, Phase 4 U4] FU-31 CLOSED.** The gap was the taint model, not
//     the scope (P-04), and the second source above reaches both reads: with
//     only that change, :27 and :44 went red with no plant. Both now return
//     owned copy from `src/lib/safety`. `AUTH_COVERAGE` still does not see the
//     module; that is unchanged, since a server action has no 401 to assert.
//
// FU-7 is closed by the third inventory: the class of "a helper one import away
// from a route" is now covered. The class of "error text reaching a client by a
// route this detector cannot model" is NARROWED, not eliminated.

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
 * U4: the destructured field of an awaited result that is a second taint source.
 * Supabase's client returns `{ data, error }` rather than throwing, so its error
 * never reaches a catch clause.
 */
const RESULT_ERROR_KEYS = new Set(["error"]);

/** `X.json(body)` on these is a response body leaving the server. */
const RESPONSE_CLASSES = new Set(["NextResponse", "Response"]);

/** A `"use server"` directive as the first statement of these statements. */
function hasUseServer(statements: ts.NodeArray<ts.Statement>): boolean {
  const first = statements[0];
  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use server"
  );
}

/** Is this node inside a server action: a "use server" module, or a function that opens with one? */
function inServerAction(node: ts.Node): boolean {
  for (let at: ts.Node | undefined = node; at; at = at.parent) {
    if (ts.isSourceFile(at)) return hasUseServer(at.statements);
    if (ts.isFunctionLike(at) && "body" in at && at.body && ts.isBlock(at.body as ts.Node)) {
      if (hasUseServer((at.body as ts.Block).statements)) return true;
    }
  }
  return false;
}

/** The block a declaration lives in: the span its binding is visible over. */
function enclosingScope(node: ts.Node): ts.Node {
  let scope: ts.Node = node;
  while (scope.parent && !ts.isBlock(scope) && !ts.isSourceFile(scope) && !ts.isCaseClause(scope)) {
    scope = scope.parent;
  }
  return scope;
}

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

/**
 * Library modules (Phase 2 U2, closing follow-up FU-7).
 *
 * The inventory above stopped at the route and service layers, which meant the
 * rule could be satisfied by *moving* a read one import away: a helper under
 * `src/lib` reading `err.message` and returning it to a caller in a scanned file
 * was invisible, because the guard flags the read, and the read had left the
 * scanned set. The Phase 1 closeout demonstrated that the leak was real and
 * undetected, not hypothetical.
 *
 * `src/lib` is also where the two *live* instances were: `advisor/agent.ts`
 * interpolated a caught tool error into text that is JSON-serialised into a
 * tool result and fed back to the model, which can echo it to the user; and
 * `lab-import/pdf-adapter.ts` wrapped one into an `ExtractionError` message.
 * Neither is a route, and neither would ever have been caught by an inventory
 * of routes.
 *
 * Test files are excluded for the same reason as above: they discuss error text
 * on purpose.
 */
const LIB_MODULES = trackedFiles(
  "src/lib",
  (p) => p.endsWith(".ts") && !p.endsWith(".test.ts"),
  "library modules",
);

/** Everything this rule applies to. */
const SCANNED_FILES = [...API_ROUTES, ...SERVICE_MODULES, ...LIB_MODULES];

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

  /**
   * `source` names where the seed came from. A caught binding (`catch (err)`,
   * `.catch(err => …)`) is the original model. A result error (`const { error } =
   * await …`, U4) is the second source: its forms are prefixed `result-`, and it
   * additionally flags the whole object reaching a `return` or a response body,
   * because a returned result error is sent to the client as-is.
   */
  const scanBody = (body: ts.Node, seed: string, source: "caught" | "result" = "caught") => {
    const tainted = new Set<string>([seed]);
    const mark = (node: ts.Node, form: string) =>
      record(node, source === "result" ? `result-${form}` : form);

    /** Is the tainted value itself (not a call on it) what this expression hands over? */
    const handsOverTainted = (node: ts.Node): boolean => {
      const inner = unwrap(node);
      if (isTainted(inner, tainted)) return true;
      if (ts.isObjectLiteralExpression(inner)) {
        return inner.properties.some((p) =>
          ts.isShorthandPropertyAssignment(p)
            ? tainted.has(p.name.text)
            : ts.isPropertyAssignment(p)
              ? handsOverTainted(p.initializer)
              : ts.isSpreadAssignment(p) && handsOverTainted(p.expression),
        );
      }
      if (ts.isArrayLiteralExpression(inner)) return inner.elements.some(handsOverTainted);
      if (ts.isConditionalExpression(inner)) {
        return handsOverTainted(inner.whenTrue) || handsOverTainted(inner.whenFalse);
      }
      return false;
    };

    const walk = (node: ts.Node) => {
      // `const e = err;` — follow the alias. Source order means a declaration is
      // visited before the reads that depend on it.
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name) && isTainted(node.initializer, tainted)) {
          tainted.add(node.name.text);
        }
        // `const { message } = err` / `const { message: m } = err`
        if (ts.isObjectBindingPattern(node.name) && isTainted(node.initializer, tainted)) {
          for (const el of textNamesInPattern(node.name)) mark(el, "destructured-text");
        }
      }

      // err.message / (err as Error).message / err!.message
      if (
        ts.isPropertyAccessExpression(node) &&
        TEXT_PROPS.has(node.name.text) &&
        isTainted(node.expression, tainted)
      ) {
        mark(node, "property-access");
      }

      // err["message"]
      if (
        ts.isElementAccessExpression(node) &&
        node.argumentExpression &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        TEXT_PROPS.has(node.argumentExpression.text) &&
        isTainted(node.expression, tainted)
      ) {
        mark(node, "element-access");
      }

      // String(err) — a whole-value stringification is `err.message` with extra steps.
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "String" &&
        node.arguments.some((arg) => isTainted(arg, tainted))
      ) {
        mark(node, "String()");
      }

      // err.toString() / JSON.stringify(err) — U4, raised by the U4 review: two
      // more whole-value stringifications. (`JSON.stringify` of an Error drops
      // `message`, but a Supabase result error is a plain-ish object that keeps it.)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "toString" &&
        isTainted(node.expression.expression, tainted)
      ) {
        mark(node, "toString()");
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "JSON" &&
        node.expression.name.text === "stringify" &&
        node.arguments.some((arg) => isTainted(arg, tainted))
      ) {
        mark(node, "JSON.stringify()");
      }

      // `${err}` — same, via the template machinery.
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (isTainted(span.expression, tainted)) mark(span.expression, "template-interpolation");
        }
      }

      if (source === "result") {
        // `return { error }` / `return error` — the object itself leaves, but only
        // where a return IS the response: a server action. Elsewhere a return goes
        // to an in-process caller, which is how a repository hands a result upward
        // (and how `__testing__/fake-stack-db.ts` imitates Supabase itself).
        if (
          ts.isReturnStatement(node) &&
          node.expression &&
          inServerAction(node) &&
          handsOverTainted(node.expression)
        ) {
          mark(node, "returned");
        }
        // `NextResponse.json({ error })` / `Response.json(error)`.
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "json" &&
          ts.isIdentifier(node.expression.expression) &&
          RESPONSE_CLASSES.has(node.expression.expression.text) &&
          node.arguments.some(handsOverTainted)
        ) {
          mark(node, "response-body");
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

    // U4 (FU-31, retargeted by P-04): a Supabase-style result, `const { error } =
    // await supabase.auth.signUp(…)`. The error is not thrown, so no catch clause
    // ever sees it; it arrives as a destructured field of an awaited value. The
    // seed is the local name the pattern binds (`error`, or `e` for
    // `{ error: e }`), scanned over the enclosing block.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isAwaitExpression(unwrap(node.initializer))
    ) {
      for (const el of node.name.elements) {
        const key = el.propertyName ?? el.name;
        if (!ts.isIdentifier(key) || !RESULT_ERROR_KEYS.has(key.text)) continue;
        if (ts.isIdentifier(el.name)) {
          scanBody(enclosingScope(node), el.name.text, "result");
        } else if (ts.isObjectBindingPattern(el.name)) {
          // `const { error: { message } } = await …` — the pattern is the read.
          for (const inner of textNamesInPattern(el.name)) record(inner, "result-destructured-text");
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

  it("finds library modules to scan, including the two U2 fixed", () => {
    // Phase 2 U2, GATE A1. Anti-vacuity first: 81 non-test modules live under
    // src/lib today, so a pathspec regression that collapsed this to a handful
    // would be caught by the floor rather than by nobody.
    expect(LIB_MODULES.length).toBeGreaterThanOrEqual(60);
    // Then the specific files, for the same reason the route list names three:
    // these are where the live reads WERE. `agent.ts:154` interpolated a caught
    // tool error into text fed back to the model; `pdf-adapter.ts` wrapped one
    // into an ExtractionError message at two sites. If either leaves this
    // inventory, the guard goes green about the exact files it was written for.
    for (const required of [
      "src/lib/advisor/agent.ts",
      "src/lib/lab-import/pdf-adapter.ts",
      "src/lib/api/respond.ts",
    ]) {
      expect(LIB_MODULES, `${required} is not being scanned`).toContain(required);
    }
    expect(LIB_MODULES.filter((f) => f.endsWith(".test.ts"))).toEqual([]);
  });

  it("no API route, service module, or library module reads a caught exception's or a result error's text", () => {
    const violations = SCANNED_FILES.flatMap(violationsInFile);

    expect(
      violations,
      violations.length === 0
        ? ""
        : "A route, service, or library module is reading a caught exception's text,\n" +
            "or (forms prefixed `result-`) the text of a destructured `{ error }` result.\n" +
            "This rule flags the READ,\n" +
            "not proof of disclosure — but this repo renders `error.message` at 17 call sites\n" +
            "across 15 files, and AdvisorPanel renders the SSE `error` event, so a read here\n" +
            "is one edit away from CLAUDE.md §2.3 rule 13 — rank 1.\n\n" +
            "Pass the whole value to the shared boundary instead:\n" +
            '  return internalError(err, { code: "YOUR_CODE" });   // 500 + correlation id\n' +
            '  const id = reportInternalError(err, "YOUR_CODE");   // already-streaming responses\n' +
            "A result error shown to a user gets owned copy from src/lib/safety instead, chosen by\n" +
            "its non-text `code` if at all (see src/lib/auth/actions.ts).\n\n" +
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
      ["toString()", "try { go(); } catch (err) { return send(err.toString()); }"],
      ["JSON.stringify", "try { go(); } catch (err) { return send(JSON.stringify(err)); }"],
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

    // U4 (FU-31): the second taint source, a destructured result error.
    it.each([
      [
        "a result error's message",
        "async function f() { const { error } = await supabase.auth.signUp(x); if (error) return { error: error.message }; }",
      ],
      [
        "a renamed result error",
        "async function f() { const { data, error: e } = await db.from('t').select(); if (e) return send(e.message); }",
      ],
      ["String() of a result error", "async function f() { const { error } = await go(); send(String(error)); }"],
      ["toString() of a result error", "async function f() { const { error } = await go(); send(error.toString()); }"],
      ["JSON.stringify of a result error", "async function f() { const { error } = await go(); send(JSON.stringify(error)); }"],
      ["a result error interpolated", "async function f() { const { error } = await go(); send(`no: ${error}`); }"],
      ["a result error's text destructured", "async function f() { const { error: { message } } = await go(); send(message); }"],
      [
        "a result error returned whole from a server action module",
        '"use server";\nexport async function a() { const { error } = await go(); if (error) return { error }; }',
      ],
      [
        "a result error returned whole from an inline server action",
        'export async function a() { "use server"; const { error } = await go(); return error; }',
      ],
      [
        "a result error in a response body",
        "export async function GET() { const { error } = await go(); return NextResponse.json({ error }); }",
      ],
    ])("detects %s", (_label, src) => {
      expect(scan(src).length).toBeGreaterThan(0);
    });

    it.each([
      ["a rethrown result error", "async function f() { const { error } = await go(); if (error) throw error; }"],
      [
        "a result error passed whole to the boundary helper",
        "async function f() { const { error } = await go(); if (error) return internalError(error, { code: 'X' }); }",
      ],
      [
        "owned copy chosen by a result error's code",
        '"use server";\nexport async function a() { const { error } = await go(); if (error?.code === "weak_password") return { error: COPY.weak }; }',
      ],
      [
        "a result handed upward by a module that is not a server action",
        "export async function repo() { const { data, error } = await go(); return { data, error }; }",
      ],
      [
        // A STATED LIMIT, pinned so that widening it is a deliberate edit: the
        // source is an AWAITED result. zod's synchronous `safeParse` also returns
        // `{ error }`, and its text is validation detail, not a provider's.
        "a destructured error that was never awaited (zod's safeParse; a stated limit)",
        "function f() { const { error } = schema.safeParse(x); if (error) return send(error.message); }",
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
