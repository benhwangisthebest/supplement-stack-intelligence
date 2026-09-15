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
import { describe, expect, it } from "vitest";

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

/** Block and line comments removed — N-14's class: a guard must not match a mention in a comment. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

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

interface RouteFacts {
  file: string;
  sites: NotFoundSite[];
  literals: string[];
  distinct: string[];
  unresolved: string[];
  aliases: string[];
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

  it("the resolver's model of notFound() still matches the helper it models", () => {
    // If `respond.ts` changed its template or default, the literals this file
    // computes would be fiction. Pinned against the source, not against a copy.
    const respond = stripComments(readFileSync(join(REPO_ROOT, "src/lib/api/respond.ts"), "utf8"));
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
});
