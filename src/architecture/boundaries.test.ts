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
// cannot perturb the src/lib/stack-evaluator/** coverage thresholds. Since
// Phase 0 U6 widened coverage `include` to all of `src/`, the property that
// keeps it out of the report is now the `exclude: ["src/**/*.test.{ts,tsx}"]`
// glob rather than the old lib-only `include`.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Layers that are scanned. src/app is a target of rules, never a source. */
const SCANNED_LAYERS = [
  "src/types",
  "src/components",
  "src/lib",
  // Phase 0 U7 — previously ungoverned. Nothing stopped either from importing
  // upward into src/app; that is exactly how src/services came to exist
  // outside enforcement. CLAUDE.md §4.6.
  "src/services",
  "src/data",
] as const;

/**
 * Every top-level `src/*` directory NOT in SCANNED_LAYERS, each with the reason
 * it is exempt. The tree-partition spec below asserts this map plus
 * SCANNED_LAYERS covers the whole of `src/`, so a new layer cannot appear
 * silently ungoverned — it must be scanned or consciously exempted here.
 */
const EXEMPT_LAYERS: Readonly<Record<string, string>> = {
  "src/app":
    "Composition root and top layer. It may legitimately import from every layer below, so it is a target of rules (NO_UPWARD_APP_IMPORT), never a source of them.",
  "src/architecture":
    "This guardrail itself. Contains only *.test.ts, which walk() excludes by design, so scanning it would contribute zero files and zero constraints.",
};

/**
 * Minimum non-test files each scanned layer must contribute. A single global
 * floor is not enough: it stays satisfied while an individual layer silently
 * collapses to zero (a renamed directory, a walk() regression), which would let
 * every rule pass vacuously for that layer. Floors sit below current counts so
 * ordinary deletion is not blocked, but far above zero.
 */
const LAYER_FLOORS: Readonly<Record<(typeof SCANNED_LAYERS)[number], number>> = {
  "src/types": 15, // 19 today
  "src/components": 40, // 56 today
  "src/lib": 60, // 80 today
  "src/services": 1, // 1 today
  "src/data": 8, // 10 today
};

/**
 * Layers forbidden from importing src/app. src/types is deliberately absent:
 * TYPES_IS_A_LEAF is stricter and fires first, giving a better message.
 */
const NO_APP_IMPORT_FROM = ["src/components", "src/lib", "src/services", "src/data"] as const;

/**
 * Layers forbidden from importing src/components. Business and persistence code
 * must not reach into the UI layer. src/types and src/data are absent because
 * their own leaf rules are stricter and already forbid it.
 */
const NO_UI_IMPORT_FROM = ["src/lib", "src/services"] as const;

/**
 * Bare package specifiers src/types/** is allowed to import. Deliberately empty:
 * the Domain layer is pure today. Adding an entry here should be a conscious,
 * reviewable decision — not a silently deleted rule.
 */
const TYPES_ALLOWED_EXTERNALS: readonly string[] = [];

/**
 * Bare package specifiers src/data/** is allowed to import. Deliberately empty
 * for the same reason as TYPES_ALLOWED_EXTERNALS: reference data is inert data,
 * and every non-test seed file today imports nothing but src/types.
 */
const DATA_ALLOWED_EXTERNALS: readonly string[] = [];

const DOC = "docs/02-design/architecture-boundaries.md";

// ---------------------------------------------------------------- discovery --

/**
 * The repository inventory is Git's tracked-file set, NOT the filesystem.
 *
 * Phase 0 R1. This previously walked `src/` with `fs.readdirSync`, so the
 * verdict was a property of one developer's working directory rather than of
 * the repository. A macOS/iCloud sync duplicate — `src/data/id-stability.test
 * 2.ts` — ends in `" 2.ts"`, not `".test.ts"`, so the old basename-suffix test
 * exemption did not match it and it was linted as product data, failing B4b
 * against a file that is not in Git, not in the build, and not in the clean CI
 * checkout. Widening that regex would have hidden the symptom and left the
 * filesystem dependence in place; the defect is the *source of truth*, not the
 * pattern.
 *
 * `--cached` is what makes this correct: it yields tracked paths only, so
 * untracked pollution and ignored generated output are both structurally
 * incapable of reaching a rule. A file only earns architectural scrutiny by
 * being committed — which is also exactly what CI reviews.
 *
 * Robustness notes:
 *  - `execFileSync` takes an argv array, so no filename is ever interpolated
 *    into a shell string.
 *  - `-z` emits NUL-delimited paths, which survives spaces, newlines, and
 *    non-ASCII bytes, and bypasses git's `core.quotePath` escaping entirely.
 *  - `-C REPO_ROOT` makes the result independent of the process cwd.
 *  - git always reports repo-relative POSIX paths, on every platform, so the
 *    strings below need no separator normalization and stay comparable to the
 *    `src/...` literals in SCANNED_LAYERS on Windows as well.
 */
function trackedPathsUnderSrc(): string[] {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (cause) {
    throw new Error(
      "Architecture boundary guardrail could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- src\n` +
        "This suite defines the repository as Git's tracked files, so it cannot run outside a\n" +
        "Git worktree or without `git` on PATH. If you are running from a source archive rather\n" +
        "than a clone, initialise a repository or run the suite from the clone.\n" +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  const paths = stdout.split("\0").filter((p) => p.length > 0);
  if (paths.length === 0) {
    throw new Error(
      "Architecture boundary guardrail found zero tracked files under src/.\n" +
        "A guardrail that scans nothing passes vacuously, so this is a hard failure rather\n" +
        "than a silent green. Check that the working directory is the repository clone.",
    );
  }
  return paths;
}

/** Every tracked path under src/, any extension — the partition rule needs non-.ts files too. */
const TRACKED_SRC_PATHS = trackedPathsUnderSrc();

/**
 * Test files are excluded by the repository's own naming convention — the same
 * `*.test.*` / `*.spec.*` contract that `vitest.config.ts` and
 * `playwright.config.ts` use to decide what is a test. They are tracked, and
 * they are legitimately allowed to import `vitest`, `node:fs` and friends,
 * which product code under src/types and src/data may not.
 *
 * This regex no longer has to be defensive: the pathological inputs that
 * defeated it were untracked, and untracked paths can no longer get here.
 */
const isTestPath = (p: string) => /\.(test|spec)\.tsx?$/.test(p);
const isSourcePath = (p: string) =>
  /\.tsx?$/.test(p) && !isTestPath(p) && !p.endsWith(".d.ts");

const ALL_FILES = TRACKED_SRC_PATHS.filter(
  (p) => isSourcePath(p) && SCANNED_LAYERS.some((l) => inLayer(p, l)),
).sort();
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
  const fromData = inLayer(fromFileRel, "src/data");
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

  // Mirrors TYPES_NO_EXTERNAL_DEPS. Bare specifiers must be judged before the
  // `resolved === null` early return below, or they escape every rule.
  if (fromData && resolved === null) {
    if (DATA_ALLOWED_EXTERNALS.includes(spec)) return null;
    return {
      ...base,
      rule: "DATA_NO_EXTERNAL_DEPS",
      fix: "src/data/ is reference data, not runtime code, and must not depend on any package. Parsing, validation, and I/O belong in src/lib/.",
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

  if (NO_APP_IMPORT_FROM.some((l) => inLayer(fromFileRel, l)) && inLayer(resolved, "src/app")) {
    return {
      ...base,
      rule: "NO_UPWARD_APP_IMPORT",
      fix: `${NO_APP_IMPORT_FROM.join(", ")} must not import from src/app. Move the shared code down into src/lib/.`,
    };
  }

  // Reference data is a leaf: it may describe the domain (src/types) and
  // compose with itself, nothing else. Keeps the future codegen path open —
  // a seed file that reaches into an engine cannot be regenerated from source
  // data alone. CLAUDE.md §4.4.
  if (fromData && !inLayer(resolved, "src/types") && !inLayer(resolved, "src/data")) {
    return {
      ...base,
      rule: "DATA_IS_A_LEAF",
      fix: "src/data/ may import only src/types/ and other src/data/ modules. Reference data must not depend on engines, persistence, or UI — move the logic into src/lib/ and pass the data in.",
    };
  }

  if (NO_UI_IMPORT_FROM.some((l) => inLayer(fromFileRel, l)) && inLayer(resolved, "src/components")) {
    return {
      ...base,
      rule: "NO_UI_IMPORT",
      fix: `${NO_UI_IMPORT_FROM.join(", ")} must not import from src/components. Dependencies point inward: UI consumes business logic, never the reverse.`,
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

  // A global floor stays green while one layer silently collapses to zero, so
  // assert every scanned layer individually. This is what stops the suite from
  // "passing" on a subset of the tree.
  it("scans every layer to its own floor, not just the tree as a whole", () => {
    const counts = Object.fromEntries(
      SCANNED_LAYERS.map((l) => [l, ALL_FILES.filter((f) => inLayer(f, l)).length]),
    ) as Record<(typeof SCANNED_LAYERS)[number], number>;

    for (const layer of SCANNED_LAYERS) {
      expect(
        Object.prototype.hasOwnProperty.call(LAYER_FLOORS, layer),
        `${layer} is scanned but has no floor in LAYER_FLOORS`,
      ).toBe(true);
      expect(counts[layer], `${layer} contributed ${counts[layer]} files, floor ${LAYER_FLOORS[layer]}`).toBeGreaterThanOrEqual(LAYER_FLOORS[layer]);
    }

    // No floor may exist for a layer that is not actually scanned.
    expect(Object.keys(LAYER_FLOORS).sort()).toEqual([...SCANNED_LAYERS].sort());
  });

  // The gap that let src/services exist ungoverned: nothing asserted that the
  // scanned set covered src/. A new top-level layer must now be a conscious
  // decision — scanned, or exempted with a written reason.
  it("partitions every top-level src/ directory into scanned or exempt", () => {
    // Derived from the tracked set, not readdir, for the same reason as
    // ALL_FILES: an untracked scratch directory is not a layer of this
    // repository, and must not be able to fail — or pass — this rule. A layer
    // becomes real when a file in it is committed, which is precisely when it
    // starts needing governance.
    const actual = [
      ...new Set(
        TRACKED_SRC_PATHS.map((p) => p.split("/"))
          .filter((seg) => seg.length > 2)
          .map((seg) => `${seg[0]}/${seg[1]}`),
      ),
    ].sort();

    expect(actual).toEqual([...SCANNED_LAYERS, ...Object.keys(EXEMPT_LAYERS)].sort());

    // An exemption without a real justification is an ungoverned layer wearing
    // a label, so require substantive prose rather than a placeholder.
    for (const [layer, reason] of Object.entries(EXEMPT_LAYERS)) {
      expect(reason.length, `${layer} exemption reason is too thin`).toBeGreaterThan(40);
    }

    // Scanned and exempt must be disjoint.
    for (const layer of SCANNED_LAYERS) {
      expect(Object.keys(EXEMPT_LAYERS)).not.toContain(layer);
    }
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

  it("NO_UPWARD_APP_IMPORT covers the newly scanned services and data layers", () => {
    expect(classify("src/services/evaluation.ts", "@/app/api/stacks/route")?.rule).toBe(
      "NO_UPWARD_APP_IMPORT",
    );
    expect(classify("src/data/seed-effects.ts", "@/app/library/page")?.rule).toBe(
      "NO_UPWARD_APP_IMPORT",
    );
  });

  it("DATA_IS_A_LEAF fires on reference data reaching into engines, services, or UI", () => {
    expect(classify("src/data/seed-effects.ts", "@/lib/evidence")?.rule).toBe("DATA_IS_A_LEAF");
    expect(classify("src/data/seed-effects.ts", "@/services/evaluation")?.rule).toBe(
      "DATA_IS_A_LEAF",
    );
    expect(classify("src/data/seed-effects.ts", "@/components/ui/Tabs")?.rule).toBe(
      "DATA_IS_A_LEAF",
    );
    // Relative spelling must not be an escape hatch.
    expect(classify("src/data/seed-effects.ts", "../lib/evidence")?.rule).toBe("DATA_IS_A_LEAF");
  });

  it("DATA_NO_EXTERNAL_DEPS fires on reference data importing a package", () => {
    expect(classify("src/data/seed-papers.ts", "zod")?.rule).toBe("DATA_NO_EXTERNAL_DEPS");
    expect(classify("src/data/seed-papers.ts", "node:fs")?.rule).toBe("DATA_NO_EXTERNAL_DEPS");
  });

  it("NO_UI_IMPORT fires on lib or services reaching into the UI layer", () => {
    expect(classify("src/lib/evidence/index.ts", "@/components/ui/Tabs")?.rule).toBe("NO_UI_IMPORT");
    expect(classify("src/services/evaluation.ts", "@/components/stack/FlagCard")?.rule).toBe(
      "NO_UI_IMPORT",
    );
    expect(classify("src/lib/evidence/index.ts", "../../components/ui/Tabs")?.rule).toBe(
      "NO_UI_IMPORT",
    );
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

  it("allows the real edges src/services depends on today", () => {
    for (const spec of [
      "@supabase/supabase-js",
      "@/types",
      "@/lib/db/stack-repo",
      "@/lib/lab-trends",
      "@/lib/stack-evaluator",
    ]) {
      expect(classify("src/services/evaluation.ts", spec), spec).toBeNull();
    }
  });

  it("allows the real edges src/data depends on today", () => {
    for (const [from, spec] of [
      ["src/data/seed-supplements.ts", "@/types"],
      ["src/data/seed-biomarkers.ts", "@/types/biomarker"],
      ["src/data/medication-aliases.ts", "@/types/interaction"],
      // Intra-layer composition stays legal.
      ["src/data/seed-effects.ts", "@/data/seed-papers"],
      ["src/data/seed-effects.ts", "./seed-papers"],
    ] as const) {
      expect(classify(from, spec), `${from} -> ${spec}`).toBeNull();
    }
  });

  it("allows src/components to keep importing lib and data", () => {
    // NO_UI_IMPORT is one-directional: the UI layer consuming business logic
    // is the intended dependency direction, and must stay silent.
    expect(classify("src/components/stack/FlagCard.tsx", "@/lib/safety")).toBeNull();
    expect(classify("src/components/library/SupplementCard.tsx", "@/data/seed-supplements")).toBeNull();
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

  it("B3: no scanned layer imports from src/app", () => {
    expect(violationsFor("NO_UPWARD_APP_IMPORT")).toEqual([]);
  });

  it("B4: src/data is a leaf over src/types", () => {
    expect(violationsFor("DATA_IS_A_LEAF")).toEqual([]);
  });

  it("B4b: src/data depends on no external package", () => {
    expect(violationsFor("DATA_NO_EXTERNAL_DEPS")).toEqual([]);
  });

  it("B5: no business or persistence module imports src/components", () => {
    expect(violationsFor("NO_UI_IMPORT")).toEqual([]);
  });
});
