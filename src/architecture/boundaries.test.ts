// Architecture boundary guardrail — the EXECUTABLE spec for the layer rules
// documented in docs/02-design/architecture-boundaries.md (promoted from
// mvp-core-loop.design.md §9.1-§9.3).
//
// Why a Vitest test and not ESLint: this repo has no ESLint config and no
// `eslint` dependency, so `next lint` enforces nothing. Adopting ESLint would
// mean 4+ new devDependencies. `typescript` is ALREADY installed, so we use the
// compiler's own parser — identical fidelity, zero new dependencies.
//
// Why not regex: every barrel violation this was written to catch is an
// `import type`, and the barrel itself uses `export * from`. A naive
// /^import\s+\{/ pattern matches NONE of them. See the parser self-test below.
//
// Placement note: this file lives in src/architecture/ (not src/lib/) so it
// stays outside the coverage `include: ["src/lib/**/*.ts"]` glob and cannot
// perturb the src/lib/stack-evaluator/** thresholds.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Layers that are scanned. src/app is a target of rules, never a source. */
const SCANNED_LAYERS = ["src/types", "src/components", "src/lib"] as const;

/**
 * Bare package specifiers src/types/** is allowed to import. Deliberately empty:
 * the Domain layer is pure today. Adding an entry here should be a conscious,
 * reviewable decision — not a silently deleted rule.
 */
const TYPES_ALLOWED_EXTERNALS: readonly string[] = [];

const DOC = "docs/02-design/architecture-boundaries.md";

// ---------------------------------------------------------------- discovery --

function walk(dirAbs: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dirAbs)) return acc;
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) walk(abs, acc);
    else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.(test|spec)\.tsx?$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      acc.push(path.relative(REPO_ROOT, abs).split(path.sep).join("/"));
    }
  }
  return acc;
}

const ALL_FILES = SCANNED_LAYERS.flatMap((l) => walk(path.join(REPO_ROOT, l))).sort();
const TYPES_FILES = ALL_FILES.filter((f) => f.startsWith("src/types/"));

// ------------------------------------------------------------------ parsing --

interface Edge {
  specifier: string;
  line: number;
}

/**
 * Extract every module specifier using the TypeScript parser. Covers static
 * imports (incl. `import type`), `export ... from`, dynamic `import()`, and
 * `require()`. Comments and string literals can never yield false positives
 * because a real parser does not treat them as syntax.
 */
export function extractEdges(fileRel: string, source: string): Edge[] {
  const sf = ts.createSourceFile(
    fileRel,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileRel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const edges: Edge[] = [];

  const push = (node: ts.Node) => {
    if (!ts.isStringLiteralLike(node)) return;
    edges.push({
      specifier: node.text,
      line: ts.getLineAndCharacterOfPosition(sf, node.getStart(sf)).line + 1,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) push(node.moduleSpecifier);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier) push(node.moduleSpecifier);
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      push(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((isDynamicImport || isRequire) && node.arguments.length > 0) push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sf, visit);
  return edges;
}

// ------------------------------------------------------------ normalization --

/** Canonical repo-relative path, or null when the specifier is a bare package. */
export function resolveSpecifier(fromFileRel: string, spec: string): string | null {
  let p: string;
  if (spec.startsWith("@/")) p = `src/${spec.slice(2)}`;
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    p = path.posix.normalize(path.posix.join(path.posix.dirname(fromFileRel), spec));
  } else return null; // bare package, node: builtin, css, etc.

  // Order matters. Trailing slashes are stripped FIRST: `@/types/` resolves to
  // the barrel under `moduleResolution: bundler`, but would otherwise survive as
  // "src/types/" — which fails the exact-match barrel check AND satisfies
  // inLayer(), silently bypassing both B1 and B2.
  p = p.replace(/\/{2,}/g, "/");
  p = p.replace(/\/+$/, "");
  p = p.replace(/\.(tsx?|jsx?)$/, "");
  p = p.replace(/\/index$/, "");
  return p;
}

/** Segment-aware — so `src/apparel` is NOT matched by layer `src/app`. */
export function inLayer(p: string, layer: string): boolean {
  return p === layer || p.startsWith(`${layer}/`);
}

// -------------------------------------------------------------------- rules --

export interface Violation {
  rule: string;
  file: string;
  line: number;
  specifier: string;
  resolved: string | null;
  fix: string;
}

export function classify(fromFileRel: string, spec: string, line = 0): Violation | null {
  const resolved = resolveSpecifier(fromFileRel, spec);
  const fromTypes = inLayer(fromFileRel, "src/types");
  const isBarrel = fromFileRel === "src/types/index.ts";
  const base = { file: fromFileRel, line, specifier: spec, resolved };

  if (fromTypes && resolved === null) {
    if (TYPES_ALLOWED_EXTERNALS.includes(spec)) return null;
    return {
      ...base,
      rule: "TYPES_NO_EXTERNAL_DEPS",
      fix: "src/types/ is a pure Domain leaf and must not depend on any package. Move the dependency into src/lib/.",
    };
  }
  if (resolved === null) return null;

  if (fromTypes && !isBarrel && resolved === "src/types") {
    return {
      ...base,
      rule: "TYPES_NO_BARREL_CYCLE",
      fix: 'Import the concrete sibling module (e.g. "./primitives", "./stack"), never the barrel — index -> leaf -> index is a cycle.',
    };
  }

  if (fromTypes && !inLayer(resolved, "src/types")) {
    return {
      ...base,
      rule: "TYPES_IS_A_LEAF",
      fix: "src/types/ may import only other src/types/ modules. Declare the contract in src/types/ and have the outer layer conform to it.",
    };
  }

  if (
    (inLayer(fromFileRel, "src/components") || inLayer(fromFileRel, "src/lib")) &&
    inLayer(resolved, "src/app")
  ) {
    return {
      ...base,
      rule: "NO_UPWARD_APP_IMPORT",
      fix: "src/components and src/lib must not import from src/app. Move the shared code down into src/lib/.",
    };
  }

  return null;
}

const format = (v: Violation) =>
  `${v.file}:${v.line}  [${v.rule}]\n  imports ${JSON.stringify(v.specifier)} -> ${v.resolved ?? "(external)"}\n  ${v.fix}\n  Spec: ${DOC}`;

function violationsFor(rule: string): string[] {
  const out: string[] = [];
  for (const file of ALL_FILES) {
    const source = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
    for (const edge of extractEdges(file, source)) {
      const v = classify(file, edge.specifier, edge.line);
      if (v && v.rule === rule) out.push(format(v));
    }
  }
  return out;
}

// --------------------------------------------------------------------- specs --

describe("architecture boundaries — harness sanity", () => {
  // A guardrail that scans zero files passes vacuously. These floors make that
  // failure mode loud instead of silent.
  it("discovers the source tree", () => {
    expect(ALL_FILES.length).toBeGreaterThan(50);
    expect(TYPES_FILES.length).toBeGreaterThanOrEqual(15);
  });

  it("governs every path alias declared in tsconfig", () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "tsconfig.json"), "utf8").replace(/^\s*\/\/.*$/gm, ""),
    );
    // resolveSpecifier() only understands "@/*". A new alias would silently
    // un-govern a whole import style, so adding one must fail here first.
    expect(Object.keys(tsconfig.compilerOptions.paths)).toEqual(["@/*"]);
  });
});

describe("architecture boundaries — parser", () => {
  // The highest-value test in this file: if extraction silently degrades, every
  // rule below passes vacuously.
  it("extracts every import form, and no comment or string content", () => {
    const fixture = `
// import { Fake } from "@/app/commented-out";
/** @example import x from "@/app/jsdoc" */
import type { A } from "./index";
import {
  B,
  C,
} from "@/app/multi-line";
import "./side-effect.css";
export * from "./re-export";
export type { D } from "@/app/type-reexport";
const prompt = 'import { E } from "@/app/inside-a-string"';
const lazy = () => import("@/app/dynamic");
const cjs = require("@/app/required");
`;
    expect(extractEdges("src/lib/fixture.ts", fixture).map((e) => e.specifier)).toEqual([
      "./index",
      "@/app/multi-line",
      "./side-effect.css",
      "./re-export",
      "@/app/type-reexport",
      "@/app/dynamic",
      "@/app/required",
    ]);
  });
});

describe("architecture boundaries — normalization", () => {
  it("canonicalizes every spelling of the types barrel to one path", () => {
    for (const [from, spec] of [
      ["src/types/effect.ts", "./index"],
      ["src/types/effect.ts", "../types"],
      ["src/lib/db/mappers.ts", "@/types"],
      ["src/lib/db/mappers.ts", "@/types/index"],
      ["src/lib/db/mappers.ts", "@/types/index.ts"],
      // Regression (F2): a trailing slash still resolves to the barrel under
      // `moduleResolution: bundler`, so it must canonicalize identically.
      ["src/types/effect.ts", "../types/"],
      ["src/lib/db/mappers.ts", "@/types/"],
      ["src/lib/db/mappers.ts", "@/types//index"],
    ] as const) {
      expect(resolveSpecifier(from, spec)).toBe("src/types");
    }
  });

  it("matches layers on segment boundaries, not string prefixes", () => {
    expect(inLayer("src/app/page.tsx", "src/app")).toBe(true);
    expect(inLayer("src/apparel/x.ts", "src/app")).toBe(false);
    expect(inLayer("src/types-extra/x.ts", "src/types")).toBe(false);
  });
});

describe("architecture boundaries — rules fire (negative controls)", () => {
  // Proves each rule is REACHABLE. A rule that never fires is indistinguishable
  // from no rule at all.
  it("TYPES_NO_BARREL_CYCLE fires on a leaf importing the barrel", () => {
    expect(classify("src/types/effect.ts", "./index")?.rule).toBe("TYPES_NO_BARREL_CYCLE");
    expect(classify("src/types/effect.ts", "@/types")?.rule).toBe("TYPES_NO_BARREL_CYCLE");
    // Regression (F2): the trailing-slash spelling previously bypassed BOTH B1
    // (exact-match failed) and B2 (inLayer() accepted "src/types/" as internal).
    expect(classify("src/types/effect.ts", "@/types/")?.rule).toBe("TYPES_NO_BARREL_CYCLE");
    expect(classify("src/types/effect.ts", "../types/")?.rule).toBe("TYPES_NO_BARREL_CYCLE");
  });

  it("TYPES_IS_A_LEAF fires on Domain reaching into lib", () => {
    expect(classify("src/types/advisor-action.ts", "@/lib/validation/schemas")?.rule).toBe(
      "TYPES_IS_A_LEAF",
    );
  });

  it("TYPES_NO_EXTERNAL_DEPS fires on Domain importing a package", () => {
    expect(classify("src/types/stack.ts", "zod")?.rule).toBe("TYPES_NO_EXTERNAL_DEPS");
  });

  it("NO_UPWARD_APP_IMPORT fires via alias AND relative spelling", () => {
    expect(classify("src/components/layout/TopNav.tsx", "@/app/auth/actions")?.rule).toBe(
      "NO_UPWARD_APP_IMPORT",
    );
    expect(classify("src/components/layout/TopNav.tsx", "../../app/auth/actions")?.rule).toBe(
      "NO_UPWARD_APP_IMPORT",
    );
    expect(classify("src/lib/auth/actions.ts", "@/app/anything")?.rule).toBe("NO_UPWARD_APP_IMPORT");
  });
});

describe("architecture boundaries — legal edges stay silent (positive controls)", () => {
  it("allows the barrel to re-export its leaves", () => {
    expect(classify("src/types/index.ts", "./supplement")).toBeNull();
    expect(classify("src/types/index.ts", "./primitives")).toBeNull();
  });

  it("allows real intra-Domain leaf-to-leaf edges", () => {
    for (const [from, spec] of [
      ["src/types/advisor.ts", "./lab"],
      ["src/types/identity.ts", "./advisor"],
      ["src/types/advisor-action.ts", "./evaluation"],
      ["src/types/effect.ts", "./evidence-grading"],
      ["src/types/protocol.ts", "./stack"],
    ] as const) {
      expect(classify(from, spec)).toBeNull();
    }
  });

  it("allows components and lib to import lib, types, and packages", () => {
    expect(classify("src/components/layout/TopNav.tsx", "@/lib/auth/actions")).toBeNull();
    expect(classify("src/lib/validation/schemas.ts", "@/types/stack")).toBeNull();
    expect(classify("src/lib/validation/schemas.ts", "zod")).toBeNull();
    expect(classify("src/components/layout/TopNav.tsx", "next/link")).toBeNull();
  });
});

describe("architecture boundaries — the real source tree", () => {
  it("B1: no file in src/types imports the barrel", () => {
    expect(violationsFor("TYPES_NO_BARREL_CYCLE")).toEqual([]);
  });

  it("B2: src/types is a dependency-free leaf", () => {
    expect(violationsFor("TYPES_IS_A_LEAF")).toEqual([]);
  });

  it("B2b: src/types depends on no external package", () => {
    expect(violationsFor("TYPES_NO_EXTERNAL_DEPS")).toEqual([]);
  });

  it("B3: no file in src/components or src/lib imports from src/app", () => {
    expect(violationsFor("NO_UPWARD_APP_IMPORT")).toEqual([]);
  });
});
