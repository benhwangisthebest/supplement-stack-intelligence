// Executable guardrail for CLAUDE.md §2.3 rule 11 — "every route under
// src/app/api/** authenticates and returns 401 on failure" (Phase 1 U5).
//
// WHY A GUARD AND NOT JUST ROUTE TESTS. U1–U3 gave 18 of the 23 route files a
// 401 test. That is coverage of what EXISTS; it is not coverage of what gets
// ADDED. A new route file with no `getUser()` call ships with no failing test,
// because the test that would have caught it was never written. This guard
// closes that gap: it is derived from the tracked file set, so a new route is
// in scope the moment it is `git add`-ed.
//
// ---------------------------------------------------------------------------
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ---------------------------------------------------------------------------
// For each exported handler (`export async function GET|POST|PUT|PATCH|DELETE`)
// in a tracked `src/app/api/**/route.ts`, it collects every CallExpression in
// the function's subtree **in source-position order**, then asserts:
//
//   1. a call to `getUser` appears at all; and
//   2. it appears BEFORE the first call to any I/O symbol.
//
// The I/O symbol set is DERIVED PER FILE from its own import statements — every
// named import from `@/lib/db/*`, `@/services/*`, or `@/lib/supabase/*`. It is
// not a hardcoded list, so a new repository module is covered without editing
// this file. `handle`, `ok`, `unauthorized`, and pure engines are not I/O.
//
// Source-position ordering is what makes this work for BOTH auth-placement
// shapes (plan §6.2.3): a guard placed before `handle(...)` and a guard placed
// inside its callback both put `getUser` at a lower source position than the
// repo call, so neither needs a special case. The guard is checked against both
// shapes by `both auth-placement shapes are present in the scanned inventory`
// below — if the repository ever became monocultural, that test fails and the
// evidence that this file handles both would quietly have expired.
//
// WHAT IT DOES NOT COMPUTE, stated plainly:
//   * It is a STATIC ORDERING check, not a proof of authentication. It cannot
//     tell that `if (!user) return unauthorized();` follows the call, that the
//     401 body is right, or that the result is not discarded. The route tests
//     from U1–U3 assert the behaviour; this asserts the call site exists and is
//     positioned before I/O. Plan §6.2.2: do not infer a behavioural guarantee
//     from the presence of a line — these two layers are complementary.
//   * Source POSITION is not execution order. A `getUser` call inside a branch
//     that never runs, or inside a callback invoked later, still counts as
//     "before". Closing that would need control-flow analysis this repository
//     has no evidence of needing.
//   * Indirection is invisible: a handler delegating to a helper that
//     authenticates in another module reads as a violation here, and one that
//     does I/O through such a helper reads as clean.
//   * `getUser` is matched by identifier. An aliased import would not be seen.
//   * Only `src/app/api/**/route.ts` is scanned — the same limitation
//     error-disclosure.test.ts declares at its head.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The HTTP verbs Next.js treats as route handlers. */
const HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** Module prefixes whose exports perform I/O. Derived per file from imports. */
const IO_MODULE_PREFIXES = ["@/lib/db/", "@/services/", "@/lib/supabase/"];

/** The authentication call every handler must make first. */
const AUTH_FN = "getUser";

/**
 * Tracked `route.ts` files under src/app/api. Discovery mirrors
 * error-disclosure.test.ts and boundaries.test.ts (Phase 0 R1): the repository
 * is Git's index, not one developer's working directory, so an untracked
 * scratch file cannot hide a rule and a sync duplicate cannot invent one.
 */
function trackedApiRoutes(): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src/app/api"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "AUTH_COVERAGE could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- src/app/api\n` +
        "This suite defines the repository as Git's tracked files, so it cannot run\n" +
        "outside a Git worktree or without `git` on PATH.\n" +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const routes = stdout.split("\0").filter((p) => p.endsWith("/route.ts"));
  if (routes.length === 0) {
    throw new Error(
      "AUTH_COVERAGE found 0 tracked route files; a guard that scans nothing passes vacuously.",
    );
  }
  return routes.sort();
}

interface HandlerReport {
  file: string;
  handler: string;
  /** Source position of the first `getUser` call, or null if absent. */
  authPos: number | null;
  /** Source position + name of the first I/O call, or null if the handler does none. */
  firstIo: { pos: number; name: string } | null;
  /** "before" = guard outside handle(...); "inside" = guard within its callback. */
  shape: "before" | "inside" | "none";
}

/** Named imports from I/O modules — the per-file I/O symbol set. */
function ioSymbols(source: ts.SourceFile): Set<string> {
  const symbols = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const spec = statement.moduleSpecifier.text;
    if (!IO_MODULE_PREFIXES.some((p) => spec.startsWith(p))) continue;
    // Type-only imports describe data; they cannot perform I/O.
    if (statement.importClause?.isTypeOnly) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (!element.isTypeOnly) symbols.add(element.name.text);
      }
    }
  }
  return symbols;
}

/** The identifier being called, for the simple `f(...)` and `obj.f(...)` forms. */
function calleeName(call: ts.CallExpression): string | undefined {
  if (ts.isIdentifier(call.expression)) return call.expression.text;
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text;
  return undefined;
}

/**
 * Analyse one route file. Exported so the anti-rot self-tests below can drive
 * the detector against synthetic sources — if this logic is broken, those tests
 * go red without any real route needing to change.
 */
export function analyseRouteSource(file: string, text: string): HandlerReport[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const io = ioSymbols(source);
  const reports: HandlerReport[] = [];

  for (const statement of source.statements) {
    if (!ts.isFunctionDeclaration(statement)) continue;
    const name = statement.name?.text;
    if (!name || !HANDLER_NAMES.has(name)) continue;
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported || !statement.body) continue;

    const calls: ts.CallExpression[] = [];
    const walk = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) calls.push(node);
      ts.forEachChild(node, walk);
    };
    walk(statement.body);
    // forEachChild is pre-order but nested calls can be pushed out of source
    // order (`f(g())` pushes f then g). Sort so "before" means what it reads.
    calls.sort((a, b) => a.getStart(source) - b.getStart(source));

    const authCall = calls.find((c) => calleeName(c) === AUTH_FN);
    const ioCall = calls.find((c) => {
      const callee = calleeName(c);
      return callee !== undefined && io.has(callee);
    });

    let shape: HandlerReport["shape"] = "none";
    if (authCall) {
      // Inside a `handle(...)` callback iff some ancestor call is `handle`.
      let node: ts.Node | undefined = authCall.parent;
      shape = "before";
      while (node && node !== statement.body) {
        if (ts.isCallExpression(node) && calleeName(node) === "handle") {
          shape = "inside";
          break;
        }
        node = node.parent;
      }
    }

    reports.push({
      file,
      handler: name,
      authPos: authCall ? authCall.getStart(source) : null,
      firstIo: ioCall
        ? { pos: ioCall.getStart(source), name: calleeName(ioCall) as string }
        : null,
      shape,
    });
  }
  return reports;
}

const ROUTES = trackedApiRoutes();
const ALL_HANDLERS: HandlerReport[] = ROUTES.flatMap((file) =>
  analyseRouteSource(file, fs.readFileSync(path.join(REPO_ROOT, file), "utf8")),
);

describe("AUTH_COVERAGE — the real route tree", () => {
  it("scans a non-empty inventory of tracked route files", () => {
    // Anti-vacuity. Every assertion below iterates this set; if discovery
    // silently returned nothing, they would all pass having checked nothing.
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(ROUTES.every((f) => f.startsWith("src/app/api/"))).toBe(true);
  });

  it("finds at least one exported handler in every tracked route file", () => {
    const withoutHandlers = ROUTES.filter(
      (f) => !ALL_HANDLERS.some((h) => h.file === f),
    );
    expect(
      withoutHandlers,
      `AUTH_COVERAGE parsed these tracked route files but found no exported handler in them.\n` +
        `Either they export handlers this detector cannot see — in which case it is\n` +
        `under-reporting and every rule below is weaker than it looks — or they are\n` +
        `route files that serve nothing:\n  ${withoutHandlers.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every exported handler calls getUser()", () => {
    const unauthenticated = ALL_HANDLERS.filter((h) => h.authPos === null).map(
      (h) => `${h.file} → ${h.handler}`,
    );
    expect(
      unauthenticated,
      "AUTH_COVERAGE: these exported route handlers never call getUser().\n" +
        "CLAUDE.md §2.3 rule 11 requires every route under src/app/api/** to\n" +
        "authenticate and return 401 on failure:\n  " +
        unauthenticated.join("\n  "),
    ).toEqual([]);
  });

  it("every handler calls getUser() before its first I/O call", () => {
    const outOfOrder = ALL_HANDLERS.filter(
      (h) => h.authPos !== null && h.firstIo !== null && h.authPos > h.firstIo.pos,
    ).map((h) => `${h.file} → ${h.handler} (I/O via ${h.firstIo?.name} precedes getUser)`);
    expect(
      outOfOrder,
      "AUTH_COVERAGE: these handlers perform I/O before authenticating.\n" +
        "Reading or writing before the auth check runs is a disclosure even when\n" +
        "the response is later a 401:\n  " + outOfOrder.join("\n  "),
    ).toEqual([]);
  });

  it("both auth-placement shapes are present in the scanned inventory", () => {
    // Plan §6.2.3. This guard's ordering logic is shape-agnostic BY DESIGN, and
    // this test is the evidence that both designs are actually exercised. If the
    // repository ever became monocultural, the claim in this file's header would
    // silently expire — so it fails here instead.
    const shapes = new Set(ALL_HANDLERS.filter((h) => h.authPos !== null).map((h) => h.shape));
    expect(shapes.has("before")).toBe(true);
    expect(shapes.has("inside")).toBe(true);
  });

  it("derives a non-empty I/O symbol set for the routes that perform I/O", () => {
    // Guards against the I/O detection silently matching nothing — which would
    // make the ordering rule above pass vacuously for every handler.
    const withIo = ALL_HANDLERS.filter((h) => h.firstIo !== null);
    expect(withIo.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass today because the routes comply. That alone cannot tell
// you the DETECTOR still works — a broken analyser also reports zero
// violations. These drive it against synthetic sources with a known answer, so
// breaking the detection logic turns this file red on its own.
// ---------------------------------------------------------------------------
const IMPORTS = [
  'import { getUser } from "@/lib/auth/session";',
  'import { createClient } from "@/lib/supabase/server";',
  'import { listStacks } from "@/lib/db/stack-repo";',
  'import { handle, ok, unauthorized } from "@/lib/api/respond";',
].join("\n");

describe("AUTH_COVERAGE — detector self-tests", () => {
  it("accepts a compliant handler in the BEFORE-handle shape", () => {
    const [report] = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  return handle(async () => ok(await listStacks(await createClient(), user.id)));
}`,
    );
    expect(report.authPos).not.toBeNull();
    expect(report.shape).toBe("before");
    expect(report.authPos!).toBeLessThan(report.firstIo!.pos);
  });

  it("accepts a compliant handler in the INSIDE-handle shape", () => {
    const [report] = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    return ok(await listStacks(await createClient(), user.id));
  });
}`,
    );
    expect(report.authPos).not.toBeNull();
    expect(report.shape).toBe("inside");
    expect(report.authPos!).toBeLessThan(report.firstIo!.pos);
  });

  it("flags a handler with no getUser() call — BEFORE-handle shape", () => {
    const [report] = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  const supabase = await createClient();
  return ok(await listStacks(supabase, "anyone"));
}`,
    );
    expect(report.authPos).toBeNull();
    expect(report.firstIo).not.toBeNull();
  });

  it("flags a handler with no getUser() call — INSIDE-handle shape", () => {
    const [report] = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  return handle(async () => {
    const supabase = await createClient();
    return ok(await listStacks(supabase, "anyone"));
  });
}`,
    );
    expect(report.authPos).toBeNull();
    expect(report.firstIo).not.toBeNull();
  });

  it("flags I/O performed before the auth call, in either shape", () => {
    const before = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  const rows = await listStacks(await createClient(), "anyone");
  const user = await getUser();
  if (!user) return unauthorized();
  return ok(rows);
}`,
    )[0];
    expect(before.authPos!).toBeGreaterThan(before.firstIo!.pos);

    const inside = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  return handle(async () => {
    const rows = await listStacks(await createClient(), "anyone");
    const user = await getUser();
    if (!user) return unauthorized();
    return ok(rows);
  });
}`,
    )[0];
    expect(inside.authPos!).toBeGreaterThan(inside.firstIo!.pos);
  });

  it("treats only exported HTTP-verb functions as handlers", () => {
    const reports = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
async function GET() { return ok(await listStacks(await createClient(), "x")); }
export async function helper() { return ok(await listStacks(await createClient(), "x")); }
export async function POST() {
  const user = await getUser();
  return handle(async () => ok(user));
}`,
    );
    expect(reports.map((r) => r.handler)).toEqual(["POST"]);
  });

  it("does not mistake a pure or response helper for I/O", () => {
    const [report] = analyseRouteSource(
      "synthetic/route.ts",
      `${IMPORTS}
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  return handle(async () => ok({ ok: true }));
}`,
    );
    // `handle`, `ok`, `unauthorized` come from @/lib/api — not an I/O prefix.
    expect(report.firstIo).toBeNull();
  });
});
