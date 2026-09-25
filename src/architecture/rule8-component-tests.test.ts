// RULE8_COMPONENT_TESTS — CLAUDE.md §5 rule 8, made mechanical.
// Phase 3 U10, owner ruling R2 (2026-09-24): "rule 8 becomes mechanical like rule 7.
// After the tests land, a guard derives the set of components that render a safety
// flag, evidence grade or citation, and fails any member without a component test.
// If the set can't be derived without a hand-kept list, STOP."
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md (§1 is the predicate).
//
// Rule 8: "Components rendering a safety flag, evidence grade, or citation ship with
// a component test." Until this file it was a sentence, and its residue was a
// heuristic count ("12", FU-64) that could not be reproduced from its own keywords.
//
// THE PREDICATE, and why no component is named in it. A file is a member when:
//  1. SCOPE — it is a tracked, non-test `.tsx` under src/components/** (rule 8 says
//     *components*; CLAUDE.md §4 separates src/app routes from src/components);
//  2. RENDERS — inside a JSX expression container (`{…}`, as a child OR as an
//     attribute value, spreads included) it has a sub-expression whose CHECKED TYPE
//     is an anchor type, or a union / intersection / array / tuple containing one.
//     Handing a grade to a child (`<EffectGradeBadge grade={e.grade} />`) counts;
//     using one only in logic outside JSX does not. Name slots are skipped;
//  3. ANCHORS — rule 8's three nouns, resolved by the TypeScript checker to their
//     DECLARATIONS in src/types. A local `type EvidenceGrade = string` in a component
//     is a different declaration and does not match (self-test below).
// The anchor table defines the predicate; the member set is recomputed from the
// tree on every run. A member needs a SIBLING `<Name>.test.tsx`, tracked, that
// imports it (`./<Name>` or its `@/` alias).
//
// Why the checker and not a keyword grep: BiomarkerRelevanceSection and
// FoodPairingSection render `rule.evidenceGrade` without naming any grade type.
// Why a program over src/components rather than one per file: one checker pass
// over the whole scope is ~2 s; the test timeout below allows for a cold cache.
//
// WHAT IT DOES NOT CHECK, stated so a green run is not read as more: whether a
// sibling test ASSERTS the rule-8 rendering. It checks the test exists and imports
// the component. U10 (b)'s red proofs are the evidence for the tests it wrote;
// FU-67 records two older tests that do not assert their own rendering.

import { execFileSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../..");

// ------------------------------------------------------------------ anchors --

/**
 * Rule 8's nouns → their declarations. Each entry carries its reason; R8d requires
 * one. A new safety-flag type added to src/types is seen only once it is added
 * here — that residue is stated in the cycle record §1.6.
 */
export const ANCHORS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "src/types/primitives.ts": {
    EvidenceGrade: "evidence grade: the A–D letter itself",
  },
  "src/types/evaluation.ts": {
    FlagSeverity: "safety flag: the stack evaluator's severity",
    EvaluationFlag: "safety flag: a persisted stack-evaluation flag",
    DraftFlag: "safety flag: a flag projected before apply (advisor proposals)",
  },
  "src/types/interaction.ts": {
    InteractionSeverity: "safety flag: a curated interaction's severity",
    InteractionRule: "safety flag: a curated supplement/drug/food interaction",
    InteractionFinding: "safety flag: an interaction matched to a user's context",
  },
  "src/types/biomarker.ts": {
    BiomarkerRelation: "safety flag: a marker relation whose 'caution' means may worsen",
  },
  "src/types/advisor.ts": {
    Citation: "citation: an advisor provenance record",
    CitationKind: "citation: the provenance record's kind",
  },
  "src/types/paper.ts": {
    Paper: "citation: an evidence summary, the only holder of a verified DOI/PMID",
  },
};

// ------------------------------------------------------------------ analysis --

export interface Member {
  file: string;
  /** The first anchored sub-expression found: `Anchor @ file:line \`text\``. */
  evidence: string;
}

/** Declarations of the anchor types in `program`, keyed by node. */
function anchorDeclarations(program: ts.Program, root: string): Map<ts.Node, string> {
  const decl = new Map<ts.Node, string>();
  for (const [file, names] of Object.entries(ANCHORS)) {
    const sf = program.getSourceFile(path.join(root, file));
    if (!sf) continue;
    for (const st of sf.statements) {
      if ((ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) && Object.hasOwn(names, st.name.text)) {
        decl.set(st, st.name.text);
      }
    }
  }
  return decl;
}

const isNameSlot = (n: ts.Node): boolean => {
  const p = n.parent;
  if (!ts.isIdentifier(n) || !p) return false;
  return (
    (ts.isPropertyAccessExpression(p) && p.name === n) ||
    (ts.isParameter(p) && p.name === n) ||
    (ts.isVariableDeclaration(p) && p.name === n) ||
    (ts.isBindingElement(p) && p.name === n) ||
    (ts.isPropertyAssignment(p) && p.name === n) ||
    (ts.isJsxAttribute(p) && p.name === n)
  );
};

/** Apply the predicate to every `scope` file of `program`. */
export function deriveMembers(program: ts.Program, root: string, scope: readonly string[]) {
  const checker = program.getTypeChecker();
  const decl = anchorDeclarations(program, root);
  const named = (s: ts.Symbol | undefined) =>
    s?.declarations?.map((d) => decl.get(d)).find(Boolean) ?? null;
  const anchorOf = (t: ts.Type, depth = 0): string | null => {
    if (depth > 4) return null;
    const a = named(t.aliasSymbol) ?? named(t.getSymbol());
    if (a) return a;
    const parts =
      t.isUnion() || t.isIntersection()
        ? t.types
        : checker.isArrayType(t) || checker.isTupleType(t)
          ? checker.getTypeArguments(t as ts.TypeReference)
          : [];
    for (const p of parts) {
      const r = anchorOf(p, depth + 1);
      if (r) return r;
    }
    return null;
  };

  // A union of LITERAL types is flattened by the checker: `EvidenceGrade | "n/a"`
  // becomes "A" | "B" | "C" | "D" | "n/a" with no alias left to see. So the value's
  // DECLARED type annotation is read as well, where the reference survives. A
  // destructured binding has no annotation of its own; its property's does.
  // Only the shapes anchorOf follows (union, intersection, array, tuple), so a
  // lookup table typed `Record<EvidenceGrade, string>` does not count by itself.
  const anchorInTypeNode = (node: ts.TypeNode): string | null => {
    const first = (nodes: readonly ts.TypeNode[]) => {
      for (const t of nodes) {
        const r = anchorInTypeNode(t);
        if (r) return r;
      }
      return null;
    };
    if (ts.isTypeReferenceNode(node)) {
      let s = checker.getSymbolAtLocation(node.typeName);
      if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
      const a = named(s);
      if (a) return a;
      const n = node.typeName.getText();
      return (n === "Array" || n === "ReadonlyArray") && node.typeArguments ? first(node.typeArguments) : null;
    }
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) return first(node.types);
    if (ts.isArrayTypeNode(node)) return anchorInTypeNode(node.elementType);
    if (ts.isTupleTypeNode(node)) {
      return first(node.elements.map((e) => (ts.isNamedTupleMember(e) ? e.type : e)));
    }
    if (ts.isParenthesizedTypeNode(node) || ts.isTypeOperatorNode(node)) return anchorInTypeNode(node.type);
    return null;
  };
  const anchorOfDeclared = (s: ts.Symbol | undefined, depth = 0): string | null => {
    if (!s || depth > 2) return null;
    for (const d of s.declarations ?? []) {
      if (ts.isBindingElement(d)) {
        const prop = checker.getPropertyOfType(
          checker.getTypeAtLocation(d.parent),
          (d.propertyName ?? d.name).getText(),
        );
        const r = anchorOfDeclared(prop, depth + 1);
        if (r) return r;
      } else if (
        (ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) &&
        d.type
      ) {
        const r = anchorInTypeNode(d.type);
        if (r) return r;
      }
    }
    return null;
  };
  const anchorOfExpression = (n: ts.Expression): string | null =>
    anchorOf(checker.getTypeAtLocation(n)) ??
    (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)
      ? anchorOfDeclared(checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n) ? n.name : n))
      : null);

  const members: Member[] = [];
  const missing: string[] = [];
  for (const file of scope) {
    const sf = program.getSourceFile(path.join(root, file));
    if (!sf) {
      missing.push(file);
      continue;
    }
    let hit: string | null = null;
    const visit = (n: ts.Node, inJsx: boolean): void => {
      if (hit) return;
      const here = inJsx || ts.isJsxExpression(n) || ts.isJsxSpreadAttribute(n);
      if (inJsx && ts.isExpression(n) && !isNameSlot(n)) {
        const a = anchorOfExpression(n);
        if (a) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          hit = `${a} @ ${file}:${line} \`${n.getText(sf).replace(/\s+/g, " ").slice(0, 36)}\``;
        }
      }
      ts.forEachChild(n, (c) => visit(c, here));
    };
    visit(sf, false);
    if (hit) members.push({ file, evidence: hit });
  }
  return { members, anchorsResolved: decl.size, missing };
}

const inScope = (f: string) =>
  f.startsWith("src/components/") && f.endsWith(".tsx") && !f.endsWith(".test.tsx");

/** The sibling test path for a component, and whether its source imports `./<Name>`. */
export const siblingTest = (file: string) => file.replace(/\.tsx$/, ".test.tsx");

export function importsComponent(testSource: string, component: string): boolean {
  // Either spelling of the same module: `./Name` beside it, or the `@/` alias.
  const spellings = new Set([
    `./${path.posix.basename(component, ".tsx")}`,
    `@/${component.replace(/^src\//, "").replace(/\.tsx$/, "")}`,
  ]);
  const sf = ts.createSourceFile("t.tsx", testSource, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  return sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      spellings.has(s.moduleSpecifier.text) &&
      s.importClause?.isTypeOnly !== true,
  );
}

/** Members whose sibling test is absent from `tests`, or does not import them. */
export function untested(members: readonly Member[], tests: ReadonlyMap<string, string>): Member[] {
  return members.filter((m) => {
    const src = tests.get(siblingTest(m.file));
    return src === undefined || !importsComponent(src, m.file);
  });
}

// ------------------------------------------------------------- the real tree --

function tracked(): string[] {
  return execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter((p) => p.length > 0);
}

const TRACKED = tracked();
const SCOPE = TRACKED.filter(inScope).sort();
const TESTS = new Map(
  TRACKED.filter((f) => f.startsWith("src/components/") && f.endsWith(".test.tsx")).map((f) => [
    f,
    ts.sys.readFile(path.join(REPO_ROOT, f)) ?? "",
  ]),
);

function realProgram(): ts.Program {
  const cfgPath = path.join(REPO_ROOT, "tsconfig.json");
  const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, REPO_ROOT);
  const roots = [...SCOPE, ...Object.keys(ANCHORS)].map((f) => path.join(REPO_ROOT, f));
  return ts.createProgram(roots, { ...cfg.options, incremental: false, noEmit: true });
}

const REAL = deriveMembers(realProgram(), REPO_ROOT, SCOPE);
const ANCHOR_COUNT = Object.values(ANCHORS).reduce((n, names) => n + Object.keys(names).length, 0);

describe("RULE8_COMPONENT_TESTS — components rendering a flag, grade or citation have a test (CLAUDE.md §5 rule 8)", () => {
  it("R8a derives a non-empty member set from the tree, over resolved anchors (anti-vacuity)", () => {
    expect(SCOPE.length).toBeGreaterThan(0);
    expect(REAL.missing).toEqual([]);
    expect(REAL.anchorsResolved, "an anchor type was renamed or removed: fix ANCHORS, do not drop it").toBe(
      ANCHOR_COUNT,
    );
    // Sentinels, one per noun: FU-64's named examples. If one drops out, the
    // predicate has stopped seeing what it was built to see.
    const files = REAL.members.map((m) => m.file);
    expect(files).toContain("src/components/evidence/EffectGradeBadge.tsx"); // grade
    expect(files).toContain("src/components/stack/FlagCard.tsx"); // flag
    expect(files).toContain("src/components/library/BiomarkerRelevanceSection.tsx"); // grade, no type named
    expect(files).toContain("src/components/advisor/ProvenanceChips.tsx"); // citation
  });

  it("R8b every member has a tracked sibling .test.tsx that imports it", () => {
    const offenders = untested(REAL.members, TESTS);
    expect(
      offenders.map((m) => m.evidence),
      `rule 8: ${offenders.length} component(s) render a safety flag, evidence grade or citation with no component test:\n  ` +
        offenders.map((m) => `${m.file}  — renders ${m.evidence}`).join("\n  ") +
        "\nFix: add a sibling <Name>.test.tsx that imports ./<Name> and asserts the rendering, red-proved" +
        " (CLAUDE.md §5 rule 2). There is no allowlist.",
    ).toEqual([]);
  }, 60_000);

  it("R8d every anchor carries a written reason", () => {
    for (const [file, names] of Object.entries(ANCHORS)) {
      expect(file.startsWith("src/types/"), file).toBe(true);
      for (const [name, reason] of Object.entries(names)) {
        expect(reason.length, `${file} ${name}: reason is too thin`).toBeGreaterThan(20);
        expect(/^(evidence grade|safety flag|citation):/.test(reason), `${name}: name its rule-8 noun`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------- predicate self-test --

const VROOT = "/virtual";

/** A program over in-memory files; the TypeScript lib comes from disk. */
function virtualProgram(files: Record<string, string>): ts.Program {
  const options: ts.CompilerOptions = {
    strict: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: VROOT,
    paths: { "@/*": ["src/*"] },
    noEmit: true,
    types: [],
  };
  const real = ts.createCompilerHost(options);
  const abs = new Map(Object.entries(files).map(([k, v]) => [path.posix.join(VROOT, k), v]));
  const host: ts.CompilerHost = {
    ...real,
    fileExists: (f) => abs.has(f) || real.fileExists(f),
    directoryExists: (d) => [...abs.keys()].some((k) => k.startsWith(`${d}/`)) || (real.directoryExists?.(d) ?? false),
    realpath: (p) => (abs.has(p) ? p : (real.realpath?.(p) ?? p)),
    readFile: (f) => abs.get(f) ?? real.readFile(f),
    getSourceFile: (f, lang) => {
      const text = abs.get(f);
      return text !== undefined ? ts.createSourceFile(f, text, lang, true) : real.getSourceFile(f, lang);
    },
  };
  return ts.createProgram([...abs.keys()], options, host);
}

const TYPES: Record<string, string> = {
  "src/types/primitives.ts": `export type EvidenceGrade = "A" | "B" | "C" | "D";`,
  "src/types/evaluation.ts": `export type FlagSeverity = "info" | "critical";
export interface EvaluationFlag { severity: FlagSeverity; title: string }
export type DraftFlag = Omit<EvaluationFlag, "title">;`,
  "src/types/interaction.ts": `export type InteractionSeverity = "info" | "serious";
export interface InteractionRule { severity: InteractionSeverity }
export interface InteractionFinding { severity: InteractionSeverity }`,
  "src/types/biomarker.ts": `export type BiomarkerRelation = "support" | "caution";`,
  "src/types/advisor.ts": `export type CitationKind = "paper";
export interface Citation { kind: CitationKind; label: string }`,
  "src/types/paper.ts": `export interface Paper { id: string; title: string }`,
};

const C = "src/components/C.tsx";
const isMember = (source: string) => {
  const program = virtualProgram({ ...TYPES, [C]: source });
  return deriveMembers(program, VROOT, [C]).members.length === 1;
};

describe("RULE8_COMPONENT_TESTS — predicate self-test", () => {
  it("resolves every anchor in a synthetic tree", () => {
    expect(deriveMembers(virtualProgram(TYPES), VROOT, []).anchorsResolved).toBe(ANCHOR_COUNT);
  });

  it("a grade written into the DOM is a member", () => {
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
export const C = ({ g }: { g: EvidenceGrade }) => <span>{g}</span>;`)).toBe(true);
  });

  it("a grade handed to a child is a member (the parent renders a component that is)", () => {
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
declare const Badge: (p: { grade: EvidenceGrade }) => null;
export const C = ({ g }: { g: EvidenceGrade }) => <Badge grade={g} />;`)).toBe(true);
  });

  it("a grade read through a property, with no grade type named in the file, is a member", () => {
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
interface Row { evidenceGrade: EvidenceGrade }
declare function rows(): Row[];
export const C = () => <ul>{rows().map((r) => <li key="k">evidence {r.evidenceGrade}</li>)}</ul>;`)).toBe(true);
  });

  it("a flag's text, a flag array, a union with a grade and a citation array are members", () => {
    expect(isMember(`import type { EvaluationFlag } from "@/types/evaluation";
export const C = ({ f }: { f: EvaluationFlag }) => <h4>{f.title}</h4>;`)).toBe(true);
    expect(isMember(`import type { DraftFlag } from "@/types/evaluation";
declare const L: (p: { flags: DraftFlag[] }) => null;
export const C = ({ fs }: { fs: DraftFlag[] }) => <L flags={fs} />;`)).toBe(true);
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
export const C = ({ g }: { g: EvidenceGrade | "n/a" }) => <p>{g}</p>;`)).toBe(true);
    expect(isMember(`import type { Citation } from "@/types/advisor";
declare const Chips: (p: { citations: Citation[] }) => null;
export const C = ({ cs }: { cs: Citation[] }) => <Chips citations={cs} />;`)).toBe(true);
  });

  it("strings only, or a grade used only outside JSX, is not a member", () => {
    expect(isMember(`export const C = ({ s }: { s: string }) => <p>{s}</p>;`)).toBe(false);
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
export const C = ({ g }: { g: EvidenceGrade }) => { const strong = g === "A"; return <p>{strong ? "yes" : "no"}</p>; };`)).toBe(false);
    // A lookup table keyed by grade is not a grade: only unions, arrays and tuples are followed.
    expect(isMember(`import type { EvidenceGrade } from "@/types/primitives";
const STYLE: Record<EvidenceGrade, string> = { A: "a", B: "b", C: "c", D: "d" };
export const C = () => <p className={STYLE.A}>x</p>;`)).toBe(false);
  });

  it("a same-named LOCAL type is a different declaration and is not a member", () => {
    expect(isMember(`type EvidenceGrade = string;
export const C = ({ g }: { g: EvidenceGrade }) => <span>{g}</span>;`)).toBe(false);
  });

  it("a member needs a sibling test that imports it at runtime", () => {
    const m: Member[] = [{ file: C, evidence: "x" }];
    const T = "src/components/C.test.tsx";
    expect(untested(m, new Map())).toHaveLength(1);
    expect(untested(m, new Map([[T, `import { render } from "x";`]]))).toHaveLength(1);
    expect(untested(m, new Map([[T, `import type { P } from "./C";`]]))).toHaveLength(1);
    expect(untested(m, new Map([["src/components/other/C.test.tsx", `import { C } from "./C";`]]))).toHaveLength(1);
    expect(untested(m, new Map([[T, `import { D } from "./D";`]]))).toHaveLength(1);
    expect(untested(m, new Map([[T, `import { C } from "./C";`]]))).toEqual([]);
    expect(untested(m, new Map([[T, `import { C } from "@/components/C";`]]))).toEqual([]);
  });
});
