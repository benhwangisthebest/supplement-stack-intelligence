// PATH_PARAM_VALIDATION — every dynamic route validates every id it takes from
// the URL, before it touches the database (Phase 2 U30, finding N-51).
//
// ===========================================================================
// WHAT N-51 WAS, AND WHY THE STATUS CODE IS THE DEFECT
// ===========================================================================
// A handler read `const { id } = await params` and handed the raw string to a
// repo. Postgres rejected the uuid cast, the throw reached `handle()`, and the
// route answered **500** — "we broke" — for what is a client error. Every
// scanner that tries `/api/stacks/x` got a 500 and a correlation id in the log.
//
// U30 parses each id with `uuidParam` first, so a malformed one is a ZodError,
// which `handle()` already maps to 400. The behaviour is the easy half. This
// file exists for the hard half: TWELVE handlers must each remember, and
// nothing about forgetting looks wrong at the call site.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT A TEXT SCAN FOR `uuidParam.parse(`
// ---------------------------------------------------------------------------
// Four evasions defeat a substring search, and the first is live in this very
// unit's shape:
//
//   (i)   TWO IDS, ONE PARSE. `stacks/[id]/items/[itemId]` handlers destructure
//         `id` AND `itemId`. Parsing `id` twice and never `itemId` satisfies a
//         substring scan completely. So the rule is per-IDENTIFIER, resolved
//         from the `await params` destructuring pattern itself.
//   (ii)  AN ALIASED OR LOCAL SHIM. A file-local `const uuidParam = { parse:
//         (s: string) => s }` satisfies the name. So the import is checked:
//         `uuidParam` must come from the canonical module.
//   (iii) A PARSE AFTER THE I/O. Validating on line 40 when the repo call is on
//         line 30 still 500s. So position is compared against the first I/O
//         call, in source order — the same machinery `auth-coverage.test.ts`
//         uses for the auth-before-I/O property.
//   (iv)  A THIRTEENTH ROUTE. Any hand-kept list rots. The set is DERIVED from
//         `git ls-files`: a tracked `route.ts` whose path contains a `[param]`
//         segment is in scope the day it is added.
//
// HONEST LIMITS (§2.2 rule 7). This reads the AST, not the runtime.
//
//   * It cannot see an id that reaches I/O through a helper — in another
//     module OR IN THE SAME FILE. `ioSymbols` walks IMPORTED identifiers, so a
//     local wrapper that calls a repo inside itself is not a position marker.
//     Today no handler is ordered that way (every one makes a directly
//     imported I/O call first), but the disclosure used to say "another
//     module" and that was narrower than the real gap. (ecc:code-reviewer, U30.)
//   * It treats any call to `uuidParam.parse`/`safeParse` as validating,
//     without checking what is done with the result — a `safeParse` whose
//     result is ignored passes here, and is caught only by the per-route 400
//     tests.
//   * Handler SHAPES it does not recognise no longer pass silently: see
//     "every handler in a dynamic route yields at least one id" below, which
//     turns an unseen handler into a failure instead of an absence.
//
// The two layers are one control: this file proves every id is validated;
// the route tests prove the answer is 400.
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** Module prefixes whose exports perform I/O. Derived per file from imports. */
const IO_MODULE_PREFIXES = ["@/lib/db/", "@/services/", "@/lib/supabase/", "@/lib/advisor/repo"];

/** The validator, and the ONE module it may come from. */
const VALIDATOR = "uuidParam";
const VALIDATOR_MODULE = "@/lib/validation/schemas";

/** Measured at U30: 8 files, 12 handlers, 14 ids. Anti-vacuity floors, not pins. */
const MIN_FILES = 8;
const MIN_HANDLERS = 12;
const MIN_IDS = 14;

function trackedDynamicRoutes(): string[] {
  const stdout = execFileSync(
    "git",
    ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src/app/api"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
  );
  return stdout
    .split("\0")
    .filter((p) => p.endsWith("/route.ts") && p.includes("["))
    .sort();
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(path.join(REPO_ROOT, file), "utf8"),
    ts.ScriptTarget.ESNext,
    true,
  );
}

/** Named imports from I/O modules — the per-file I/O symbol set. */
function ioSymbols(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!IO_MODULE_PREFIXES.some((p) => spec.startsWith(p))) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) names.add(el.name.text);
    }
  }
  return names;
}

/** Is `uuidParam` imported from the canonical module in this file? */
export function importsValidator(source: ts.SourceFile): boolean {
  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== VALIDATOR_MODULE) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) if (el.name.text === VALIDATOR) return true;
    }
  }
  return false;
}

/**
 * Exported route handlers, in BOTH declaration shapes.
 *
 * `export async function GET(...)` and `export const GET = async (...) => {}`
 * are the same thing to Next.js and different nodes to the compiler. Reading
 * only the first shape would make an arrow-exported handler invisible — not
 * "unvalidated", INVISIBLE, contributing no report and failing no assertion.
 * (ecc:code-reviewer, U30, advisory: the gap was real, and silence was the
 * problem with it. `every discovered handler yields at least one id` below is
 * the loud version.)
 */
export function exportedHandlers(source: ts.SourceFile): { name: string; node: ts.Node }[] {
  const out: { name: string; node: ts.Node }[] = [];
  for (const stmt of source.statements) {
    const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!exported) continue;

    if (ts.isFunctionDeclaration(stmt) && stmt.name && HANDLER_NAMES.has(stmt.name.text)) {
      out.push({ name: stmt.name.text, node: stmt });
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !HANDLER_NAMES.has(decl.name.text)) continue;
        if (!decl.initializer) continue;
        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
          out.push({ name: decl.name.text, node: decl.initializer });
        }
      }
    }
  }
  return out;
}

interface IdReport {
  file: string;
  handler: string;
  id: string;
  /** Source position of the first `uuidParam.parse|safeParse(<id>)`, or null. */
  validatedAt: number | null;
  /** Source position of the first I/O call in the handler, or null. */
  firstIo: number | null;
}

function handlerReports(file: string): IdReport[] {
  const source = parse(file);
  const io = ioSymbols(source);
  const out: IdReport[] = [];

  for (const { name: handler, node: body } of exportedHandlers(source)) {

    const ids: string[] = [];
    const validated = new Map<string, number>();
    let firstIo: number | null = null;

    const walk = (node: ts.Node): void => {
      // `const { id, itemId } = await params`
      if (
        ts.isVariableDeclaration(node) &&
        ts.isObjectBindingPattern(node.name) &&
        node.initializer &&
        ts.isAwaitExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === "params"
      ) {
        for (const el of node.name.elements) {
          if (ts.isIdentifier(el.name)) ids.push(el.name.text);
        }
      }

      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        // uuidParam.parse(x) / uuidParam.safeParse(x)
        if (
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === VALIDATOR &&
          (callee.name.text === "parse" || callee.name.text === "safeParse")
        ) {
          const arg = node.arguments[0];
          if (arg && ts.isIdentifier(arg) && !validated.has(arg.text)) {
            validated.set(arg.text, node.getStart(source));
          }
        }
        // first I/O call
        if (ts.isIdentifier(callee) && io.has(callee.text)) {
          const pos = node.getStart(source);
          if (firstIo === null || pos < firstIo) firstIo = pos;
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(body);

    for (const id of ids) {
      out.push({ file, handler, id, validatedAt: validated.get(id) ?? null, firstIo });
    }
  }
  return out;
}

const ROUTES = trackedDynamicRoutes();
const REPORTS = ROUTES.flatMap(handlerReports);

describe("PATH_PARAM_VALIDATION: every URL id is validated before any I/O", () => {
  it("discovers the dynamic routes from git, and finds enough of them", () => {
    // Anti-vacuity on the derivation itself. A rename, a restructure, or a
    // discovery filter that stops matching `[` would make every assertion
    // below pass over an empty set — the failure mode CLAUDE.md §5 names first.
    expect(
      ROUTES.length,
      `PATH_PARAM_VALIDATION found ${ROUTES.length} dynamic route files; U30 measured ${MIN_FILES}. ` +
        "A guard that scans nothing passes vacuously.",
    ).toBeGreaterThanOrEqual(MIN_FILES);

    const handlers = new Set(REPORTS.map((r) => `${r.file}#${r.handler}`));
    expect(handlers.size, "fewer handlers than U30 measured").toBeGreaterThanOrEqual(MIN_HANDLERS);
    expect(REPORTS.length, "fewer path ids than U30 measured").toBeGreaterThanOrEqual(MIN_IDS);
  });

  it("every handler in a dynamic route yields at least one id — no silent skips", () => {
    // The gap this closes is not "an unvalidated id"; it is an id the scanner
    // never saw. A handler shape the walker does not recognise — an arrow
    // export, `(await params).id` instead of destructuring — contributes zero
    // reports and therefore fails nothing. A route in a `[param]` directory
    // whose handler yields no id is that situation, and it is now LOUD.
    // (ecc:code-reviewer, U30.)
    const seen = new Set(REPORTS.map((r) => `${r.file}#${r.handler}`));
    const blind: string[] = [];
    for (const file of ROUTES) {
      for (const { name } of exportedHandlers(parse(file))) {
        if (!seen.has(`${file}#${name}`)) blind.push(`${file}#${name}`);
      }
    }
    expect(
      blind,
      "PATH_PARAM_VALIDATION: these handlers live in a dynamic route and yielded NO path id.\n" +
        "Either they read `params` in a shape this scanner does not recognise — in which case the\n" +
        "scanner is wrong and must be widened — or they ignore the path entirely, which is its own\n" +
        "defect. Silence is not a pass:\n  " + blind.join("\n  "),
    ).toEqual([]);
  });

  it("every id destructured from `params` is validated", () => {
    // PER IDENTIFIER, not per handler: the two-id handlers are the reason.
    // Parsing `id` twice and never `itemId` satisfies a substring scan and
    // fails here.
    const unvalidated = REPORTS.filter((r) => r.validatedAt === null).map(
      (r) => `${r.file}#${r.handler}(${r.id})`,
    );
    expect(
      unvalidated,
      "PATH_PARAM_VALIDATION: these path ids reach the handler unvalidated, so a malformed one\n" +
        "is a 500 from Postgres rather than a 400 from the boundary (N-51):\n  " +
        unvalidated.join("\n  "),
    ).toEqual([]);
  });

  it("each id is validated BEFORE the handler's first I/O call", () => {
    // A parse after the repo call still 500s. Source-position ordering is the
    // same property `auth-coverage.test.ts` asserts for authentication.
    const late = REPORTS.filter(
      (r) => r.validatedAt !== null && r.firstIo !== null && r.validatedAt > r.firstIo,
    ).map((r) => `${r.file}#${r.handler}(${r.id})`);
    expect(
      late,
      "PATH_PARAM_VALIDATION: validated, but only after I/O had already been attempted:\n  " +
        late.join("\n  "),
    ).toEqual([]);
  });

  it("the validator comes from the canonical module, not a local shim", () => {
    // Kills the aliased/shimmed evasion: a file-local `uuidParam` that returns
    // its argument would satisfy every assertion above.
    const files = [...new Set(REPORTS.map((r) => r.file))].sort();
    const notImported = files.filter((f) => !importsValidator(parse(f)));
    expect(
      notImported,
      `PATH_PARAM_VALIDATION: these files use \`${VALIDATOR}\` without importing it from ` +
        `\`${VALIDATOR_MODULE}\`:\n  ` + notImported.join("\n  "),
    ).toEqual([]);
  });
});
