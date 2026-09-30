// NOT_FOUND_UNIFORMITY — within one route, every 404 says the same thing (Phase 2 U12).
//
// ===========================================================================
// THE DEFECT CLASS, STATED PRECISELY
// ===========================================================================
// FU-28: `/api/stacks/:id/items/:itemId` checked two things in sequence — is
// the stack yours, is the item in it — and answered each failure with a
// different `error.message` (`Stack not found.` / `Item not found.`) under the
// same status and code. The status and code were pinned equal; the message was
// not, so the message was an oracle: which check failed told the caller
// something the status was designed not to.
//
// The class is PER-ROUTE DISTINGUISHABILITY: one route, more than one 404
// literal. It is NOT "every 404 in the API must be uniform" — rule 13
// (CLAUDE.md §2.3) governs internal error text, not resource names, and a
// single-resource route has no oracle because a foreign id and a nonexistent
// id already answer identically there. That wider question is finding N-50,
// open and unassigned; this guard deliberately does not decide it.
//
// So the rule here is quantified over ROUTE FILES:
//
//   For every tracked `src/app/api/**/route.ts`, every `notFound(…)` and
//   `fail("NOT_FOUND", …)` call site must resolve to ONE message literal.
//
// No allowlist exists today, and none is provided: no route needs two 404
// messages. A route that does is a red build with a written reason to add —
// not a silent entry.
//
// WHAT IS OUTSIDE THE SCAN, AND WHY. `src/services/**` hand-writes three 404s
// that reach one route (`/api/advisor/actions`) — one ownership message and two
// that echo a caller-supplied supplement id. The rule is per route, and a
// service is not a route; whether that route's three literals are a per-route
// oracle or an input-validation echo of public reference data is part of N-50,
// stated there rather than silently decided by narrowing a regex here.
//
// THIS IS A TEXTUAL SCAN, and its soundness rests on two rules it also
// enforces: the message must be a string literal AT the call site (a variable
// or a ternary is a violation, not a token), and the helper must not be
// imported under another name (an alias would make the call invisible). Both
// were found by review of the first draft, not predicted.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { stripComments } from "./__testing__/strip";

const REPO_ROOT = join(__dirname, "..", "..");

/** Tracked `src/app/api/**\/route.ts`. Hard-fails on empty: a scan over nothing is not a guard. */
export function trackedRoutes(pathspec = "src/app/api"): string[] {
  const stdout = execFileSync(
    "git",
    ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", pathspec],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
  );
  const files = stdout
    .split("\0")
    .filter((p) => p.length > 0 && p.endsWith("/route.ts"))
    .sort();
  if (files.length === 0) {
    throw new Error(
      `NOT_FOUND_UNIFORMITY found zero tracked route files under ${pathspec}. A guard that ` +
        `scans nothing passes vacuously, so this is a hard failure rather than a silent green.`,
    );
  }
  return files;
}

// Block and line comments are removed by the shared `stripComments` (FU-47,
// Phase 4 U1): N-14's class, a guard must not match a mention in a comment. The
// N-79 blind spot (an unanchored `//` inside a URL literal blanking the rest of
// the line) closed with it. Since Phase 4 U19 the helper uses the TypeScript
// parser, so a slash-star inside a string or a line comment is no longer read as
// a block comment; its stated limits are in its header.

/** One 404 call site: either a resolved message, or an argument the scan cannot resolve. */
export interface NotFoundSite {
  message: string | null;
  /** The raw argument text when `message` is null. */
  unresolved?: string;
}

const STRING_LITERAL = /^"((?:[^"\\]|\\.)*)"$|^'((?:[^'\\]|\\.)*)'$/;

/**
 * The message each 404 call site resolves to.
 *
 * `notFound(what)` is modelled after `src/lib/api/respond.ts`, which renders
 * `` `${what} not found.` `` with `what` defaulting to `"Resource"` — and a
 * self-test below pins that this model still matches the helper's source, so
 * the resolver cannot drift away from the thing it resolves.
 *
 * A call whose argument is NOT a string literal is a VIOLATION in its own
 * right, not an opaque token. The first draft made it a token built from the
 * argument's source text, and ecc:code-reviewer showed why that is unsound:
 * two branches that each write `const msg = …; return notFound(msg)` collapse
 * to one token and read as uniform, and `notFound(cond ? "A" : "B")` is one
 * call site with two outcomes the scan never sees. The only sound rule for a
 * source-level scan is that the message must be visible at the call site.
 */
export function notFoundSites(source: string): NotFoundSite[] {
  const src = stripComments(source);
  const out: NotFoundSite[] = [];
  const literal = (arg: string) => {
    const m = STRING_LITERAL.exec(arg);
    return m ? (m[1] ?? m[2]) : null;
  };
  for (const m of src.matchAll(/\bnotFound\(\s*([^)]*?)\s*\)/g)) {
    const arg = m[1];
    if (arg === "") out.push({ message: "Resource not found." });
    else {
      const lit = literal(arg);
      out.push(lit === null ? { message: null, unresolved: arg } : { message: `${lit} not found.` });
    }
  }
  for (const m of src.matchAll(
    /\bfail\(\s*"NOT_FOUND"\s*,\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,)]*)/g,
  )) {
    const arg = m[1].trim();
    const lit = literal(arg);
    out.push(lit === null ? { message: null, unresolved: arg } : { message: lit });
  }
  return out;
}

/** Resolved messages only — the shape the uniformity rule compares. */
export function notFoundLiterals(source: string): string[] {
  return notFoundSites(source).flatMap((s) => (s.message === null ? [] : [s.message]));
}

/** `import { notFound as x }` / `fail as x` — a call the identifier scan cannot see. */
export function aliasedImports(source: string): string[] {
  const src = stripComments(source);
  return [...src.matchAll(/\b(notFound|fail)\s+as\s+(\w+)/g)].map((m) => `${m[1]} as ${m[2]}`);
}

/**
 * FU-81 (Phase 4 U19): three ways a route could tell another user's resource
 * from a missing one while every 404 message stayed equal. U11's review showed
 * each green on a scratch copy. This is an AST pass beside the message scan
 * above, so comments are not nodes and cannot trip it.
 *
 *   (i)   `forbidden`: a 403 status or a `"FORBIDDEN"` code in a route that
 *         also answers 404. The other-user branch answers a different status.
 *   (ii)  `extraArgs`: a 404 call site with an argument beyond its message:
 *         `notFound("Item", …)`, or `fail(…, …, 404, details, id)`. A
 *         `details` field distinguishes two 404s whose messages match.
 *         `otherCode`: a 404 whose code is not `"NOT_FOUND"`. The code is
 *         part of the envelope, so it distinguishes too.
 *   (iii) `valueRefs`: `notFound` or `fail` used other than as the callee of
 *         a direct call (`const nf = notFound; nf("Item")`). The message scan
 *         matches by name, so a renamed copy would make its call invisible.
 *
 * STATED LIMITS. A 403 spelled through an imported constant, or a status
 * computed at run time, is not seen by (i). Only the helper's own names are
 * tracked by (iii): a wrapper function that returns `notFound(…)` has its own
 * name, and its call site is a message the scan does not resolve.
 */
export interface NotFoundShape {
  forbidden: string[];
  extraArgs: string[];
  otherCode: string[];
  valueRefs: string[];
}

export function notFoundShape(source: string): NotFoundShape {
  const sf = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: NotFoundShape = { forbidden: [], extraArgs: [], otherCode: [], valueRefs: [] };
  const text = (n: ts.Node) => n.getText(sf);
  const nameOf = (callee: ts.Expression) =>
    ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
  const isCallee = (n: ts.Node): boolean =>
    (ts.isCallExpression(n.parent) && n.parent.expression === n) ||
    (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n && isCallee(n.parent));

  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node) && node.text === "403") out.forbidden.push(text(node.parent));
    if (ts.isStringLiteralLike(node) && node.text === "FORBIDDEN") out.forbidden.push(text(node.parent));

    if (ts.isCallExpression(node)) {
      const name = nameOf(node.expression);
      const args = node.arguments;
      if (name === "notFound" && args.length > 1) out.extraArgs.push(text(node));
      if (name === "fail") {
        const code = args[0];
        const status = args[2];
        const isNotFoundCode = code !== undefined && ts.isStringLiteralLike(code) && code.text === "NOT_FOUND";
        const is404 = status !== undefined && ts.isNumericLiteral(status) && status.text === "404";
        if ((isNotFoundCode || is404) && args.length > 3) out.extraArgs.push(text(node));
        if (is404 && !isNotFoundCode) out.otherCode.push(text(node));
      }
    }

    if (ts.isIdentifier(node) && (node.text === "notFound" || node.text === "fail")) {
      const p = node.parent;
      const imported = ts.isImportSpecifier(p);
      const propertyName =
        (ts.isPropertyAccessExpression(p) && p.name === node && node.text === "fail") ||
        ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === node);
      if (!imported && !propertyName && !isCallee(node)) out.valueRefs.push(text(p));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

interface RouteFacts {
  file: string;
  sites: NotFoundSite[];
  literals: string[];
  distinct: string[];
  unresolved: string[];
  aliases: string[];
  shape: NotFoundShape;
}

function readRouteFacts(files: string[]): RouteFacts[] {
  return files.map((file) => {
    const source = readFileSync(join(REPO_ROOT, file), "utf8");
    const sites = notFoundSites(source);
    const literals = sites.flatMap((s) => (s.message === null ? [] : [s.message]));
    return {
      file,
      sites,
      literals,
      distinct: [...new Set(literals)].sort(),
      unresolved: sites.flatMap((s) => (s.message === null ? [s.unresolved ?? "?"] : [])),
      aliases: aliasedImports(source),
      shape: notFoundShape(source),
    };
  });
}

const ROUTES = trackedRoutes();
const FACTS = readRouteFacts(ROUTES);
const WITH_404 = FACTS.filter((f) => f.sites.length > 0);

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

describe("NOT_FOUND_UNIFORMITY: within one route, every 404 says the same thing", () => {
  it("scans a non-empty set of routes, and a non-empty subset of them answer 404", () => {
    // Anti-vacuity, both halves. The first would be satisfied by an empty
    // `git ls-files` pathspec being caught upstream; the second is what notices
    // a regex that has stopped matching — every route "uniform" because none is
    // seen to answer 404 at all.
    expect(ROUTES.length).toBeGreaterThanOrEqual(20);
    expect(ROUTES).toContain("src/app/api/stacks/[id]/items/[itemId]/route.ts");
    expect(WITH_404.length).toBeGreaterThanOrEqual(8);
    expect(WITH_404.map((f) => f.file)).toContain("src/app/api/stacks/[id]/items/[itemId]/route.ts");
  });

  it("no route resolves its 404 call sites to more than one message", () => {
    const violations = FACTS.filter((f) => f.distinct.length > 1).map(
      (f) => `${f.file} answers ${f.distinct.length} different 404 messages: ${f.distinct.map((d) => JSON.stringify(d)).join(" · ")}`,
    );
    expect(violations).toEqual([]);
  });

  it("every 404 call site's message is visible at the call site — no variable, no ternary", () => {
    // The soundness condition. A message the scan cannot read is a message it
    // cannot compare, so it is a violation rather than an opaque token.
    const violations = FACTS.filter((f) => f.unresolved.length > 0).map(
      (f) => `${f.file} has a 404 whose message is not a string literal at the call site: ${f.unresolved.map((u) => JSON.stringify(u)).join(" · ")}`,
    );
    expect(violations).toEqual([]);
  });

  it("no route imports notFound or fail under another name", () => {
    // The identifier scan matches `notFound(` and `fail("NOT_FOUND"` by name.
    // An alias would make a call site invisible; forbidding the alias is what
    // keeps a textual scan honest.
    const violations = FACTS.filter((f) => f.aliases.length > 0).map(
      (f) => `${f.file} aliases the 404 helper: ${f.aliases.join(", ")}`,
    );
    expect(violations).toEqual([]);
  });

  it("FU-81 (i): no route that answers 404 also answers 403", () => {
    // The other-user branch answering FORBIDDEN while the missing branch
    // answers NOT_FOUND is the oracle this guard exists for, spelled by status
    // instead of by message. Two routes already say so in their headers.
    const violations = WITH_404.filter((f) => f.shape.forbidden.length > 0).map(
      (f) => `${f.file} answers 404 and also 403: ${f.shape.forbidden.map((s) => JSON.stringify(s)).join(" · ")}`,
    );
    expect(violations).toEqual([]);
  });

  it("FU-81 (ii): no 404 carries details, a correlation id, or a code other than NOT_FOUND", () => {
    const violations = FACTS.filter((f) => f.shape.extraArgs.length + f.shape.otherCode.length > 0).map(
      (f) =>
        `${f.file} distinguishes a 404 outside its message: ` +
        [...f.shape.extraArgs, ...f.shape.otherCode].map((s) => JSON.stringify(s)).join(" · "),
    );
    expect(violations).toEqual([]);
  });

  it("FU-81 (iii): no route uses notFound or fail other than by calling it", () => {
    // `const nf = notFound; nf("Item")` is an alias the import check cannot see.
    const violations = FACTS.filter((f) => f.shape.valueRefs.length > 0).map(
      (f) => `${f.file} references the 404 helper by value: ${f.shape.valueRefs.map((s) => JSON.stringify(s)).join(" · ")}`,
    );
    expect(violations).toEqual([]);
  });

  it("the resolver's model of notFound() still matches the helper it models", () => {
    // If `respond.ts` changed its template or default, the literals this file
    // computes would be fiction. Pinned against the source, not against a copy.
    const respond = stripComments(readFileSync(join(REPO_ROOT, "src/lib/api/respond.ts"), "utf8"), "src/lib/api/respond.ts");
    expect(respond).toContain("`${what} not found.`");
    expect(respond).toMatch(/notFound = \(what = "Resource"\)/);
  });
});

// ---------------------------------------------------------------------------
// Anti-rot — the detector's own logic, driven on synthetic source
// ---------------------------------------------------------------------------

describe("NOT_FOUND_UNIFORMITY self-tests: break the detector and these go red", () => {
  it("resolves notFound(literal) through the helper's template, and the bare call to the default", () => {
    expect(notFoundLiterals(`return notFound("Stack");`)).toEqual(["Stack not found."]);
    expect(notFoundLiterals(`return notFound();`)).toEqual(["Resource not found."]);
  });

  it("resolves a hand-written fail(\"NOT_FOUND\", …) to its literal", () => {
    expect(notFoundLiterals(`return fail("NOT_FOUND", "Gone.", 404);`)).toEqual(["Gone."]);
  });

  it("flags two literals in one file, and not two call sites of the same literal", () => {
    const two = notFoundLiterals(`if (a) return notFound("Stack");\nif (b) return notFound("Item");`);
    expect([...new Set(two)]).toHaveLength(2);
    const same = notFoundLiterals(`if (a) return notFound("Stack");\nif (b) return notFound("Stack");`);
    expect([...new Set(same)]).toHaveLength(1);
  });

  it("is not fooled by a 404 mentioned only in a comment", () => {
    const src = `// used to answer notFound("Item") here\n/* fail("NOT_FOUND", "x", 404) */\nreturn notFound("Stack");`;
    expect(notFoundLiterals(src)).toEqual(["Stack not found."]);
  });

  it("reports a non-literal argument as UNRESOLVED rather than as a message", () => {
    const [site] = notFoundSites(`return notFound(label);`);
    expect(site.message).toBeNull();
    expect(site.unresolved).toBe("label");
  });

  it("does NOT read two call sites with the same variable name as uniform (ecc:code-reviewer, blocking)", () => {
    // `const msg = "Stack"; notFound(msg)` in one branch and
    // `const msg = "Item"; notFound(msg)` in the other is FU-28 exactly, hidden
    // behind a name. The first draft collapsed both to one token and called the
    // file uniform. Now each is unresolved, and unresolved is a violation.
    const src = `if (a) { const msg = "Stack"; return notFound(msg); }\nif (b) { const msg = "Item"; return notFound(msg); }`;
    const sites = notFoundSites(src);
    expect(sites.filter((s) => s.message === null)).toHaveLength(2);
    expect(notFoundLiterals(src)).toEqual([]);
  });

  it("does NOT read a ternary inside one call site as a single message", () => {
    const [site] = notFoundSites(`return notFound(isStack ? "Stack" : "Item");`);
    expect(site.message).toBeNull();
    expect(site.unresolved).toContain("?");
  });

  it("reads a fail(\"NOT_FOUND\") message that contains a comma in full", () => {
    // The first draft's capture stopped at the first comma, turning
    // `"Sorry, not found."` into an unresolved fragment.
    expect(notFoundLiterals(`return fail("NOT_FOUND", "Sorry, not found.", 404);`)).toEqual([
      "Sorry, not found.",
    ]);
  });

  it("sees an aliased import of the helper", () => {
    expect(aliasedImports(`import { notFound as nf, ok } from "@/lib/api/respond";`)).toEqual([
      "notFound as nf",
    ]);
    expect(aliasedImports(`import { notFound, fail } from "@/lib/api/respond";`)).toEqual([]);
  });

  it("hard-fails rather than passing over an empty route inventory", () => {
    expect(() => trackedRoutes("src/app/api/does-not-exist")).toThrow(/zero tracked route files/);
  });

  // FU-81 (Phase 4 U19): the three shapes U11's review left green, each as the
  // reviewer built it, plus the negative controls that keep the pass honest.
  it("FU-81 (i): sees a 403 branch beside a 404, by status or by code", () => {
    const src = `if (!stack) return notFound("Stack");\nif (stack.user_id !== user.id) return fail("FORBIDDEN", "Stack not found.", 403);`;
    expect(notFoundShape(src).forbidden.length).toBeGreaterThanOrEqual(1);
    expect(notFoundShape(`return NextResponse.json(body, { status: 403 });`).forbidden).toHaveLength(1);
    expect(notFoundShape(`// a 403 would confirm it exists\nreturn notFound("Stack");`).forbidden).toEqual([]);
  });

  it("FU-81 (ii): sees details on a 404, and a 404 under another code", () => {
    expect(notFoundShape(`return fail("NOT_FOUND", "Item not found.", 404, { which: "item" });`).extraArgs).toHaveLength(1);
    expect(notFoundShape(`return notFound("Item", { which: "item" });`).extraArgs).toHaveLength(1);
    expect(notFoundShape(`return fail("ITEM_MISSING", "Item not found.", 404);`).otherCode).toHaveLength(1);
    const clean = notFoundShape(`return notFound("Stack");\nreturn fail("NOT_FOUND", "Gone.", 404);\nreturn fail("VALIDATION_ERROR", "Bad.", 400, { f: 1 });`);
    expect([...clean.extraArgs, ...clean.otherCode]).toEqual([]);
  });

  it("FU-81 (iii): sees a renamed copy of the helper, and not a direct or namespaced call", () => {
    expect(notFoundShape(`const nf = notFound;\nreturn nf("Item");`).valueRefs).toEqual(["nf = notFound"]);
    expect(notFoundShape(`handler(fail);`).valueRefs).toHaveLength(1);
    expect(notFoundShape(`const nf = respond.notFound;`).valueRefs).toHaveLength(1);
    const clean = notFoundShape(
      `import { notFound, fail } from "@/lib/api/respond";\nreturn notFound("Stack");\nreturn respond.notFound("Stack");\nreturn fail("NOT_FOUND", "x", 404);\nconst r = { fail: true }; if (r.fail) run();`,
    );
    expect(clean.valueRefs).toEqual([]);
  });
});
