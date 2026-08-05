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
//
// CLAIM→OBSERVED PASS, 2026-08-05 (Phase 1 U15). This header is the one in the
// repository that had never received the technique that found three real defects
// in R3b. Every factual claim above and every count below was re-measured rather
// than re-read:
//   * "no ESLint config and no `eslint` dependency" — TRUE: no config file of any
//     name, and `eslint` appears nowhere in package.json.
//   * "`typescript` is ALREADY installed" — TRUE, devDependency ^5.7.2.
//   * "the barrel itself uses `export * from`" — TRUE, 10 occurrences.
//   * "`exclude: [\"src/**/*.test.{ts,tsx}\"]`" — TRUE, vitest.config.ts:31, quoted
//     exactly.
//   * every LAYER_FLOORS "N today" comment — ALL FIVE ACCURATE (19/56/80/2/10).
// Nothing in this header was found stale. That is worth recording precisely
// because the pass was expected to find something: "we checked and it was fine"
// and "we never checked" are indistinguishable a month later, and only one of
// them justifies trusting the next claim.
//
// The audit DID find a hole, but in the code rather than the prose: the tree
// partition below saw directories only (C-11). See EXEMPT_ROOT_FILES.

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
/**
 * Directories under `src/lib` that are NOT pure engines, each with its reason.
 * Ruling 2 / D-4 (plan §7): the domain-purity rule's scope was unsettled because
 * §4.5 read literally would fail 8 files, and only 3 of those are engine code.
 * The other 5 live here — they are infrastructure, and infrastructure reaching
 * persistence is its job, not a violation.
 */
const IMPURE_BY_DESIGN: Readonly<Record<string, string>> = {
  "src/lib/auth":
    "Authentication infrastructure. It exists to talk to Supabase — session reads and sign-in/out server actions are persistence calls by definition, so forbidding them would forbid the module's entire purpose.",
  "src/lib/api":
    "The HTTP response boundary. It maps errors and envelopes onto NextResponse, so importing next/* is what it is for; an engine that must not know about HTTP is exactly why this module exists separately.",
  "src/lib/supabase":
    "The Supabase client factory itself. The rule forbids engines from reaching persistence; this module IS the persistence entry point, and cannot be forbidden from being itself.",
  "src/lib/db":
    "The persistence layer proper — repositories and row mappers. Same reasoning as src/lib/supabase: a layer cannot 'reach' the layer it is. Named explicitly rather than left implicit, so a future file here cannot be argued into engine status.",
};

/**
 * THE RATCHET. Individual engine files that violate purity today, each with the
 * reason it is not fixed yet. A ratchet, not an amnesty: the test below asserts
 * every entry STILL violates, so a fixed file cannot leave a standing permission
 * behind, and an un-allowlisted fourth violation fails immediately.
 *
 * All three reach `@/lib/db`. None is a pure engine that got sloppy; each is an
 * orchestration module sitting in an engine directory, which is the real finding
 * — the fix is relocation, not deleting an import.
 */
const DOMAIN_PURITY_ALLOWLIST: Readonly<Record<string, string>> = {
  "src/lib/advisor/actions/execute.ts":
    "ORCHESTRATION, not an engine (classified 2026-08-05, Phase 1 U18, from U20's follow-up). It is the advisor's only write path: it sequences repo calls and builds the inverse intents undo replays. It belongs in src/services alongside advisor-actions.ts, which U11 created for exactly this kind of code — U11 moved the ROUTE's logic and deliberately left this module alone. U20 additionally gave it a transitive next/* edge via @/lib/api/respond, so it is now impure by two independent readings. Moving it is a scoped refactor with its own callers to enumerate; it is not free, so it is recorded here rather than done under another unit's name.",
  "src/lib/advisor/context-loader.ts":
    "ORCHESTRATION, not an engine. It assembles the advisor's prompt context by loading from several repositories, so it is a service-shaped module in an engine directory — the same misplacement as execute.ts, and the same fix.",
  "src/lib/identity/context.ts":
    "ORCHESTRATION, not an engine. `src/lib/identity` is otherwise pure derivation (deriveUserIdentity, deriveStackArchetype are called from the route with data passed in); this one file loads that data. Splitting it out would leave src/lib/identity fully pure.",
};

/** What a pure engine may not reach. `src/app` is already covered by NO_UPWARD_APP_IMPORT. */
const PERSISTENCE_LAYERS = ["src/lib/db", "src/lib/supabase", "src/services"] as const;

/** Is this file governed by DOMAIN_IS_PURE? */
export function isPureEngineFile(fileRel: string): boolean {
  return (
    inLayer(fileRel, "src/lib") &&
    !Object.keys(IMPURE_BY_DESIGN).some((d) => inLayer(fileRel, d)) &&
    !(fileRel in DOMAIN_PURITY_ALLOWLIST)
  );
}

/**
 * Loose files tracked DIRECTLY under `src/`, each with the reason it is allowed
 * to sit outside every layer. Empty today, and that is the point: the partition
 * rule below only looks at directories, so before Phase 1 U15 a loose
 * `src/middleware.ts` — a standard Next.js path that runs on every request —
 * was governed by nothing at all and no rule could see it (closeout finding
 * C-11). Adding one must now be a conscious entry here, not a silent drop.
 */
const EXEMPT_ROOT_FILES: Readonly<Record<string, string>> = {};

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
  "src/services": 1, // 2 today (U11 added advisor-actions.ts)
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

  // Bare specifiers must be judged BEFORE the `resolved === null` return below,
  // for the same reason TYPES_NO_EXTERNAL_DEPS is: `next/server` is external, so
  // it resolves to null and would otherwise escape every rule. CLAUDE.md §4.5
  // names `next/*` explicitly — a pure engine that imports the framework is no
  // longer portable, testable without a request, or callable from a script.
  if (isPureEngineFile(fromFileRel) && resolved === null && /^next(\/|$)/.test(spec)) {
    return {
      ...base,
      rule: "DOMAIN_IS_PURE",
      fix: "pure engine directories may not import next/* (CLAUDE.md §4.5). Keep the framework at the route boundary and pass plain values in.",
    };
  }

  if (resolved === null) return null;

  // Domain purity (CLAUDE.md §4.5, ruling 2 / D-4). Scope is the ratchet above:
  // infrastructure directories are exempt wholesale, and three known engine files
  // are individually allowlisted with reasons.
  if (isPureEngineFile(fromFileRel) && PERSISTENCE_LAYERS.some((l) => inLayer(resolved, l))) {
    return {
      ...base,
      rule: "DOMAIN_IS_PURE",
      fix: "pure engine directories may not reach persistence (CLAUDE.md §4.5). Load the data at the route or service boundary and pass it into the engine.",
    };
  }

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

  // ---- C-11: the partition above sees DIRECTORIES only -------------------
  // `seg.length > 2` drops every tracked path with exactly two segments, which
  // is precisely a loose file at the root of src/. `src/middleware.ts` is a
  // standard Next.js file that runs on every matched request; it could import
  // anything, from anywhere, and no rule in this file would have applied to it.
  // Closing this was U15's job (plan §5, C-11).
  it("partitions loose files directly under src/, not only directories", () => {
    const loose = [
      ...new Set(
        TRACKED_SRC_PATHS.map((p) => p.split("/"))
          .filter((seg) => seg.length === 2)
          .map((seg) => seg.join("/")),
      ),
    ].sort();

    const ungoverned = loose.filter((f) => !(f in EXEMPT_ROOT_FILES));
    expect(
      ungoverned,
      "TREE_PARTITION: these files sit directly under src/ and are neither in a\n" +
        "scanned layer nor exempt. A loose file belongs to no layer, so every rule in\n" +
        "this file silently skips it — including the upward-import and barrel rules.\n" +
        "Move it into a layer, or add it to EXEMPT_ROOT_FILES with a written reason:\n  " +
        ungoverned.join("\n  "),
    ).toEqual([]);

    // Same anti-thin-reason bar the layer exemptions carry.
    for (const [file, reason] of Object.entries(EXEMPT_ROOT_FILES)) {
      expect(reason.length, `${file} exemption reason is too thin`).toBeGreaterThan(40);
    }
  });

  it("declares no root-file exemption for a file that is not there", () => {
    // The reverse direction. A stale exemption is a standing permission for a
    // path nobody is watching — re-create the file and it is pre-approved.
    const loose = new Set(
      TRACKED_SRC_PATHS.filter((p) => p.split("/").length === 2),
    );
    const stale = Object.keys(EXEMPT_ROOT_FILES).filter((f) => !loose.has(f)).sort();
    expect(
      stale,
      "TREE_PARTITION: these root-file exemptions name files that do not exist:\n  " +
        stale.join("\n  "),
    ).toEqual([]);
  });

  // ---- C-12: walk() and vitest disagree about .tsx ------------------------
  // This file treats `*.test.tsx` as a test (so the boundary rules skip it),
  // but `vitest.config.ts` collects `src/**/*.test.ts` only. A `.test.tsx` file
  // therefore falls in the gap: not scanned as product code, and never
  // EXECUTED — it would sit in the repository looking like coverage while
  // asserting nothing. Detector only, per plan §5: component testing itself is
  // excluded work, so this reports the gap rather than adopting jsdom (U13).
  it("collects every tracked test file it excludes from scanning", () => {
    const includes: string[] = JSON.parse(
      (/include:\s*(\[[^\]]*\])/.exec(
        fs.readFileSync(path.join(REPO_ROOT, "vitest.config.ts"), "utf8"),
      )?.[1] ?? "[]").replace(/'/g, '"'),
    );
    expect(includes.length, "could not read `include` from vitest.config.ts").toBeGreaterThan(0);

    // Minimal glob→regex for the forms this config uses: `**/` spans
    // directories, `*` does not, `.` is literal.
    //
    // Split on `**/` rather than substituting a placeholder character. The first
    // version of this used a placeholder, and the character it actually emitted
    // was a NUL — every test still passed, because the substitution round-tripped
    // consistently. The cost was invisible and nasty: two NUL bytes made `grep`
    // treat this whole file as BINARY and silently report nothing, on the one
    // file in the repository most likely to be audited with grep. Splitting needs
    // no sentinel, so there is no character left to get wrong.
    const escape = (s: string) =>
      s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
    const matchers = includes.map(
      (g) => new RegExp("^" + g.split("**/").map(escape).join("(?:.*/)?") + "$"),
    );

    const uncollected = TRACKED_SRC_PATHS.filter(
      (p) => /\.test\.tsx?$/.test(p) && !matchers.some((m) => m.test(p)),
    ).sort();

    expect(
      uncollected,
      "HARNESS_GAP: these files are tracked but not matched by vitest include;\n" +
        "they would never run. This file skips them as tests while vitest skips them\n" +
        "as uncollected, so they are governed by nothing and assert nothing:\n  " +
        uncollected.join("\n  "),
    ).toEqual([]);
  });

  // ---- U18: the domain-purity ratchet's own integrity --------------------
  it("every purity allowlist entry still violates, and names a real file", () => {
    // THE RATCHET PROPERTY. An allowlist that outlives the violation it excused
    // is a standing permission on a path nobody is watching: fix the file, leave
    // the entry, and the next import slips in pre-approved. So each entry must
    // still fail if it were judged — the list can only shrink.
    const stale: string[] = [];
    for (const file of Object.keys(DOMAIN_PURITY_ALLOWLIST)) {
      const abs = path.join(REPO_ROOT, file);
      if (!fs.existsSync(abs)) {
        stale.push(`${file} — allowlisted but does not exist`);
        continue;
      }
      const violates = extractEdges(file, fs.readFileSync(abs, "utf8")).some((e) => {
        const resolved = resolveSpecifier(file, e.specifier);
        return (
          (resolved !== null && PERSISTENCE_LAYERS.some((l) => inLayer(resolved, l))) ||
          (resolved === null && /^next(\/|$)/.test(e.specifier))
        );
      });
      if (!violates) stale.push(`${file} — allowlisted but no longer violates; delete the entry`);
    }
    expect(
      stale.sort(),
      "DOMAIN_IS_PURE: the allowlist is a ratchet, not an amnesty. These entries no\n" +
        "longer describe a real violation, so they are permissions rather than debt:\n  " +
        stale.join("\n  "),
    ).toEqual([]);

    // Same anti-thin-reason bar the layer exemptions carry: an allowlist entry
    // must say WHY, because the reason is what a future reader triages from.
    for (const [file, reason] of Object.entries(DOMAIN_PURITY_ALLOWLIST)) {
      expect(reason.length, `${file} allowlist reason is too thin`).toBeGreaterThan(40);
    }
  });

  it("every impure-by-design directory is real, reasoned, and inside src/lib", () => {
    for (const [dir, reason] of Object.entries(IMPURE_BY_DESIGN)) {
      expect(reason.length, `${dir} exemption reason is too thin`).toBeGreaterThan(40);
      expect(dir.startsWith("src/lib/"), `${dir} is not under src/lib`).toBe(true);
      expect(
        TRACKED_SRC_PATHS.some((p) => inLayer(p, dir)),
        `${dir} is exempt from DOMAIN_IS_PURE but no tracked file lives there`,
      ).toBe(true);
    }
    // An exempt directory must not ALSO carry file-level allowlist entries —
    // that would be two overlapping excuses for one file, and deleting either
    // would look safe while the other kept it hidden.
    for (const file of Object.keys(DOMAIN_PURITY_ALLOWLIST)) {
      expect(
        Object.keys(IMPURE_BY_DESIGN).some((d) => inLayer(file, d)),
        `${file} is allowlisted AND inside an exempt directory`,
      ).toBe(false);
    }
  });

  it("DOMAIN_IS_PURE fires on an un-allowlisted engine file, in both forms", () => {
    // Detector self-test (the N3 pattern): the rule above passes because the
    // tree complies, which cannot tell you the rule still works.
    expect(classify("src/lib/stack-evaluator/rules.ts", "@/lib/db/stacks")?.rule).toBe(
      "DOMAIN_IS_PURE",
    );
    expect(classify("src/lib/safety/index.ts", "@/lib/supabase/server")?.rule).toBe(
      "DOMAIN_IS_PURE",
    );
    expect(classify("src/lib/compare/index.ts", "@/services/evaluation")?.rule).toBe(
      "DOMAIN_IS_PURE",
    );
    expect(classify("src/lib/safety/index.ts", "next/server")?.rule).toBe("DOMAIN_IS_PURE");

    // ...and does NOT fire where the ratchet says it must not.
    expect(classify("src/lib/auth/session.ts", "@/lib/supabase/server")).toBeNull();
    expect(classify("src/lib/db/stack-repo.ts", "@/lib/db/types")).toBeNull();
    expect(classify("src/lib/advisor/actions/execute.ts", "@/lib/db/stack-item-repo")).toBeNull();
    // A pure engine importing another pure engine stays legal.
    expect(classify("src/lib/safety/index.ts", "@/lib/evidence")).toBeNull();
  });

  it("contains no tracked symlink under src/", () => {
    // The other half of C-11. Every rule here reasons about a path's LAYER from
    // its string. A symlink makes the string lie: `src/types/shortcut.ts` can
    // resolve into src/lib, so a file could satisfy the barrel rules by its name
    // while its contents live somewhere the rules would forbid. Git records the
    // mode, so this needs no filesystem walk.
    const listing = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-s", "-z", "--", "src"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
    const symlinks = listing
      .split("\0")
      .filter((line) => line.startsWith("120000"))
      .map((line) => line.split("\t")[1])
      .sort();
    expect(
      symlinks,
      "TREE_PARTITION: a tracked symlink under src/ makes a path's layer\n" +
        "unknowable from its name, which is what every rule in this file assumes:\n  " +
        symlinks.join("\n  "),
    ).toEqual([]);
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

  it("DOMAIN_IS_PURE: pure engine directories reach neither persistence nor next/*", () => {
    expect(violationsFor("DOMAIN_IS_PURE")).toEqual([]);
  });
});
