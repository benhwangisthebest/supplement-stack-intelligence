// CLIENT_TAKES_PROPS — CLAUDE.md §4 rule 7, made mechanical.
// Phase 3 U9, on ruling D-7 ("guard first, then the refactor, in one unit").
//
// Rule 7: "Client components receive data as props from server components. They
// do not import domain engines or seed data directly." Until this file it was a
// paragraph with a hand-counted figure beside it ("8 of 31") — and the figure
// had already rotted once (7 → 8, closeout finding P2-9).
//
// WHAT IS DERIVED, AND WHY NOTHING HERE IS A HAND-KEPT LIST OF COMPONENTS.
//  1. Entries: every tracked source file under src/ whose directive prologue
//     contains "use client". Read by the TypeScript parser, so a comment or a
//     string that merely mentions the directive is not one.
//  2. The client graph: everything reachable from an entry over RUNTIME import
//     edges. A module with no directive of its own is still client code when a
//     client module imports it — Next bundles it for the browser. This is why
//     `CoverageLimit` (U7) is checked at all: it has no directive, and `StackWorkspace`
//     pulls it in (brief AC-6). Type-only edges are not followed: they carry no
//     code into the bundle.
//  3. A violation: a runtime edge from a client-graph module into src/lib or
//     src/data, spelled either `@/…` or relatively.
//
// OWNER RULING 2026-09-24: a TYPE-ONLY import (`import type …`, `export type … from`)
// from @/lib or @/data is NOT a rule-7 violation — it carries no runtime code into
// the client bundle. Deliberately NARROW: only the clause-level `import type` form
// is exempt. `import { type A } from "@/lib/x"` is flagged, because whether it is
// elided depends on compiler settings this file does not want to reason about;
// the fix is to write `import type`.
//
// `src/lib/supabase/client.ts` carries "use client" and is an entry, but it is
// INSIDE src/lib: rule 7 governs what the UI pulls in, not lib's own internals, so
// traversal stops at the layer boundary and lib→lib edges are never crossings.
//
// THE ALLOWLIST is per EDGE (file → specifier), not per file, so an allowlisted
// component cannot quietly gain a second @/lib import. It may only shrink: every
// entry must be in ALLOWLIST_ORIGIN (the U3 pattern, seed-integrity.test.ts G4d),
// and every entry must still exist (a fixed import must leave the list — the
// DOMAIN_IS_PURE ratchet). Empty since U9 (b); the one remaining edge is NAMED_EXEMPTIONS.
//
// Why a separate parser from boundaries.test.ts's `extractEdges`: that one does
// not record whether an edge is type-only, and importing one test file from
// another would register its suites twice.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Layers a client-graph module may not import at runtime (rule 7's predicate). */
const FORBIDDEN_LAYERS = ["src/lib", "src/data"] as const;

const inLayer = (p: string, layer: string) => p === layer || p.startsWith(`${layer}/`);
const inForbidden = (p: string) => FORBIDDEN_LAYERS.some((l) => inLayer(p, l));
const isSource = (p: string) =>
  /\.tsx?$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p) && !p.endsWith(".d.ts");

// ------------------------------------------------------------------ parsing --

export interface ImportEdge {
  specifier: string;
  line: number;
  typeOnly: boolean;
}

/** Directive prologue + every module edge, each marked runtime or type-only. */
export function parseModule(
  fileRel: string,
  source: string,
): { client: boolean; edges: ImportEdge[] } {
  const sf = ts.createSourceFile(
    fileRel,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  let client = false;
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt) || !ts.isStringLiteral(stmt.expression)) break;
    if (stmt.expression.text === "use client") client = true;
  }

  const edges: ImportEdge[] = [];
  const push = (node: ts.Node, typeOnly: boolean) => {
    if (!ts.isStringLiteralLike(node)) return;
    edges.push({
      specifier: node.text,
      line: ts.getLineAndCharacterOfPosition(sf, node.getStart(sf)).line + 1,
      typeOnly,
    });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      push(node.moduleSpecifier, node.importClause?.isTypeOnly === true);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      push(node.moduleSpecifier, node.isTypeOnly);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      push(node.moduleReference.expression, node.isTypeOnly);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) push(node.arguments[0], false);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return { client, edges };
}

// --------------------------------------------------------------- resolution --

const UNRESOLVED = Symbol("unresolved");

/** Repo-relative target of an internal specifier; null for a bare package. */
export function resolveTo(
  fromRel: string,
  spec: string,
  exists: (rel: string) => boolean,
): string | null | typeof UNRESOLVED {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  } else return null;
  base = base.replace(/\/+$/, "");
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (exists(c)) return c;
  }
  // An internal import that resolves to nothing tracked means the graph below is
  // incomplete, so it is surfaced rather than skipped (anti-vacuity).
  return UNRESOLVED;
}

// -------------------------------------------------------------------- graph --

export interface Crossing {
  file: string;
  line: number;
  specifier: string;
  target: string;
  /** Entry → … → file, the chain by which `file` is client code. */
  reachedVia: string[];
}

export const edgeKey = (c: { file: string; specifier: string }) => `${c.file} -> ${c.specifier}`;

/** Walk the client graph of a tree given as path → source. */
export function clientGraph(tree: ReadonlyMap<string, string>) {
  const parsed = new Map<string, ReturnType<typeof parseModule>>();
  const parse = (f: string) => {
    let p = parsed.get(f);
    if (!p) parsed.set(f, (p = parseModule(f, tree.get(f) ?? "")));
    return p;
  };
  const sources = [...tree.keys()].filter(isSource).sort();
  const entries = sources.filter((f) => parse(f).client);

  const parent = new Map<string, string | null>(entries.map((e) => [e, null]));
  const chain = (f: string) => {
    const out: string[] = [];
    for (let cur: string | null | undefined = f; cur; cur = parent.get(cur)) out.unshift(cur);
    return out;
  };

  const crossings: Crossing[] = [];
  const unresolved: string[] = [];
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (inForbidden(file)) continue; // lib's own internals are not rule 7's concern
    for (const e of parse(file).edges) {
      if (e.typeOnly) continue; // owner ruling 2026-09-24
      const target = resolveTo(file, e.specifier, (p) => tree.has(p));
      if (target === null) continue;
      if (target === UNRESOLVED) {
        unresolved.push(`${file}:${e.line} '${e.specifier}'`);
        continue;
      }
      if (inForbidden(target)) {
        crossings.push({ file, line: e.line, specifier: e.specifier, target, reachedVia: chain(file) });
      } else if (isSource(target) && !parent.has(target)) {
        parent.set(target, file);
        queue.push(target);
      }
    }
  }
  return { entries, members: [...parent.keys()].sort(), crossings, unresolved };
}

// ------------------------------------------------------------ the real tree --

function trackedSourceTree(): Map<string, string> {
  const out = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const tree = new Map<string, string>();
  for (const rel of out.split("\0").filter((p) => p.length > 0)) {
    // Non-source tracked files (css, json) are kept as resolvable leaves.
    tree.set(rel, isSource(rel) ? fs.readFileSync(path.join(REPO_ROOT, rel), "utf8") : "");
  }
  return tree;
}

/**
 * Frozen at `ae567fd` (2026-09-24), the tree U9 (a) measured: every runtime edge
 * from the client graph into src/lib or src/data. 11 edges in 9 files. The
 * allowlist below may only ever be a subset of this — never an addition.
 */
const ALLOWLIST_ORIGIN: ReadonlySet<string> = new Set([
  "src/components/advisor/AdvisorPanel.tsx -> @/lib/api/error-text",
  "src/components/advisor/ProvenanceChips.tsx -> @/lib/advisor/citation-href",
  "src/components/advisor/ProvenanceChips.tsx -> @/lib/evidence",
  "src/components/checkin/DailyCheckinForm.tsx -> @/lib/safety",
  "src/components/checkin/DailyCheckinForm.tsx -> @/lib/side-effects/vocab",
  "src/components/profile/LabMarkerModal.tsx -> @/lib/biomarkers",
  "src/components/profile/LabMarkerTable.tsx -> @/lib/biomarkers/marker-catalog",
  "src/components/profile/ProfileForm.tsx -> @/lib/interactions/medication-names",
  "src/components/stack/StackItemRow.tsx -> @/lib/product-matcher",
  "src/components/stack/StackWorkspace.tsx -> @/lib/safety",
  "src/components/ui/Disclaimer.tsx -> @/lib/safety",
]);

/**
 * NAMED EXEMPTIONS — owner ruling 2026-09-24 (U9, option A). Not an allowlist:
 * an allowlist is a debt waiting to be paid, and this is a decision with a
 * reason. Exactly ONE entry (R7f), and it must still exist (R7g), following
 * DOMAIN_IS_PURE's allowlisted orchestration files. Options declined: moving
 * `errorText` out of src/lib (B), and loosening rule 7 for pure lib helpers (C),
 * which would also have admitted `markerCatalogEntry`, a seed-data lookup.
 */
const NAMED_EXEMPTIONS: Readonly<Record<string, string>> = {
  "src/components/advisor/AdvisorPanel.tsx -> @/lib/api/error-text":
    "errorText is a pure envelope-to-text mapper built by Phase 2 U19 for client use; it carries no data or business logic, and moving it would break ui-error-text.test.ts's pinned import.",
};

/**
 * Tolerated violations: EMPTY since U9 (b). Rule 7 now holds with no debt; the only
 * remaining edge is the one NAMED_EXEMPTIONS entry. R7c still binds this list to
 * ALLOWLIST_ORIGIN, so nothing can be added back that was not there at ae567fd.
 */
const CLIENT_LIB_IMPORT_ALLOWLIST: readonly string[] = [];

const REAL = clientGraph(trackedSourceTree());

const describeCrossing = (c: Crossing) =>
  `${c.file}:${c.line} imports '${c.specifier}' at runtime` +
  (c.reachedVia.length > 1 ? `  (client via ${c.reachedVia.join(" → ")})` : "  (\"use client\")");

describe("CLIENT_TAKES_PROPS — client components do not import src/lib or src/data (CLAUDE.md §4 rule 7)", () => {
  it("R7a derives the client graph from directives, transitively (anti-vacuity)", () => {
    expect(REAL.entries.length).toBeGreaterThan(0);
    expect(REAL.entries).toContain("src/components/stack/StackWorkspace.tsx");
    // A directive-less module reached only through a client import (AC-6). If
    // this ever fails, the walk has stopped being transitive.
    expect(REAL.members).toContain("src/components/evidence/CoverageLimit.tsx");
    expect(REAL.unresolved).toEqual([]);
  });

  it("R7b every runtime @/lib or @/data import in the client graph is allowlisted", () => {
    const allowed = new Set([...CLIENT_LIB_IMPORT_ALLOWLIST, ...Object.keys(NAMED_EXEMPTIONS)]);
    const offenders = REAL.crossings.filter((c) => !allowed.has(edgeKey(c)));
    expect(
      offenders.map(describeCrossing),
      `rule 7: ${offenders.length} runtime import(s) from client code into src/lib or src/data:\n  ` +
        offenders.map(describeCrossing).join("\n  ") +
        "\nFix: pass the value as a prop from the server parent, or read it from an existing API" +
        " route. `import type` is allowed (owner ruling 2026-09-24). Do NOT add to the allowlist —" +
        " it only shrinks.",
    ).toEqual([]);
  });

  it("R7c the allowlist only shrinks: every entry is in ALLOWLIST_ORIGIN", () => {
    expect(CLIENT_LIB_IMPORT_ALLOWLIST.filter((k) => !ALLOWLIST_ORIGIN.has(k))).toEqual([]);
    expect(new Set(CLIENT_LIB_IMPORT_ALLOWLIST).size).toBe(CLIENT_LIB_IMPORT_ALLOWLIST.length);
  });

  it("R7d no stale entry: every allowlisted import still exists (the ratchet)", () => {
    const live = new Set(REAL.crossings.map(edgeKey));
    expect(
      CLIENT_LIB_IMPORT_ALLOWLIST.filter((k) => !live.has(k)),
      "fixed imports must leave the allowlist in the same commit",
    ).toEqual([]);
  });

  it("R7h the allowlist is empty (U9 closeout: 0 violators, 1 named exemption)", () => {
    expect(CLIENT_LIB_IMPORT_ALLOWLIST).toEqual([]);
  });

  it("R7f the named exemptions are exactly ONE, with a written reason, and not also allowlisted", () => {
    const keys = Object.keys(NAMED_EXEMPTIONS);
    expect(keys, "the named-exemption list cannot grow: a second entry needs an owner ruling").toHaveLength(1);
    for (const [key, reason] of Object.entries(NAMED_EXEMPTIONS)) {
      expect(reason.length, `${key}: reason is too thin`).toBeGreaterThan(40);
      expect(CLIENT_LIB_IMPORT_ALLOWLIST).not.toContain(key);
    }
  });

  it("R7g no stale exemption: every exempt import still exists", () => {
    const live = new Set(REAL.crossings.map(edgeKey));
    expect(
      Object.keys(NAMED_EXEMPTIONS).filter((k) => !live.has(k)),
      "an exemption that outlives its import must be deleted, not kept as an amnesty",
    ).toEqual([]);
  });
});

describe("CLIENT_TAKES_PROPS — predicate self-test", () => {
  const lib = ["src/lib/x/index.ts", "export const X = 1; export type T = number;"] as const;
  const run = (files: Record<string, string>) =>
    clientGraph(new Map([lib, ["src/data/seed.ts", "export const S = [];"], ...Object.entries(files)]));
  const keys = (files: Record<string, string>) => run(files).crossings.map(edgeKey);
  const C = "src/components/C.tsx";

  it("flags a runtime named, default, namespace or side-effect import", () => {
    expect(keys({ [C]: `"use client";\nimport { X } from "@/lib/x";` })).toEqual([`${C} -> @/lib/x`]);
    expect(keys({ [C]: `"use client";\nimport * as L from "@/lib/x";` })).toHaveLength(1);
    expect(keys({ [C]: `"use client";\nimport "@/lib/x";` })).toHaveLength(1);
    expect(keys({ [C]: `"use client";\nexport { X } from "@/lib/x";` })).toHaveLength(1);
  });

  it("allows `import type` and `export type … from` (owner ruling 2026-09-24)", () => {
    expect(keys({ [C]: `"use client";\nimport type { T } from "@/lib/x";` })).toEqual([]);
    expect(keys({ [C]: `"use client";\nexport type { T } from "@/lib/x";` })).toEqual([]);
  });

  it("flags inline `{ type T }` — only the clause-level form is exempt", () => {
    expect(keys({ [C]: `"use client";\nimport { type T } from "@/lib/x";` })).toHaveLength(1);
  });

  it("flags the relative spelling, src/data, dynamic import() and require()", () => {
    expect(keys({ [C]: `"use client";\nimport { X } from "../lib/x";` })).toEqual([`${C} -> ../lib/x`]);
    expect(keys({ [C]: `"use client";\nimport { S } from "@/data/seed";` })).toHaveLength(1);
    expect(keys({ [C]: `"use client";\nconst m = import("@/lib/x");` })).toHaveLength(1);
    expect(keys({ [C]: `"use client";\nconst m = require("@/lib/x");` })).toHaveLength(1);
  });

  it("follows runtime edges into directive-less modules, and reports the chain", () => {
    const g = run({
      [C]: `"use client";\nimport { Child } from "./Child";`,
      "src/components/Child.tsx": `import { X } from "@/lib/x";\nexport const Child = X;`,
    });
    expect(g.crossings.map((c) => c.reachedVia)).toEqual([[C, "src/components/Child.tsx"]]);
  });

  it("does not follow a type-only edge, and ignores server components", () => {
    expect(
      keys({
        [C]: `"use client";\nimport type { P } from "./Child";`,
        "src/components/Child.tsx": `import { X } from "@/lib/x";\nexport type P = typeof X;`,
      }),
    ).toEqual([]);
    expect(keys({ "src/app/page.tsx": `import { X } from "@/lib/x";` })).toEqual([]);
  });

  it("reads the directive prologue, not a comment or a later string", () => {
    expect(keys({ [C]: `// header\n"use strict";\n'use client';\nimport { X } from "@/lib/x";` })).toHaveLength(1);
    expect(keys({ [C]: `// "use client"\nimport { X } from "@/lib/x";` })).toEqual([]);
    expect(keys({ [C]: `import { X } from "@/lib/x";\n"use client";` })).toEqual([]);
  });

  it("does not treat lib's own internals as crossings", () => {
    expect(
      keys({ "src/lib/y/client.ts": `"use client";\nimport { X } from "../x";` }),
    ).toEqual([]);
  });

  it("surfaces an internal import that resolves to nothing", () => {
    expect(run({ [C]: `"use client";\nimport { Z } from "./Missing";` }).unresolved).toHaveLength(1);
  });
});
