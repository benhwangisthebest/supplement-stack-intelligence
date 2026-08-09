// Executable guardrail for Phase 2 U1 — the "not configured" 503 is now carried
// by a TYPE, and this rule is what keeps that total.
//
// ---------------------------------------------------------------------------
// WHY A TOTALITY RULE AND NOT JUST THE CLASS
// ---------------------------------------------------------------------------
// Before U1, `handle()` in `src/lib/api/respond.ts` answered 503 for any caught
// `Error` whose `message` contained the substring "not configured". That had two
// defects, and the second is the one this file exists for:
//
//   1. OVER-MATCHING. The phrase is not owned by this repository. Any
//      dependency, driver, or provider error containing it was routed to a 503
//      AND had its raw message returned to the client verbatim — CLAUDE.md §2.3
//      rule 13 territory, reached through a branch that looked like a courtesy.
//
//   2. SILENT UNDER-MATCHING, once the substring branch is deleted. A throw site
//      that keeps raising a bare `Error("… not configured")` no longer gets its
//      503; it becomes a 500 with a correlation id. That is a REAL behaviour
//      change (U1's declared change #1) and it is invisible at the throw site —
//      nothing about `new Error("X not configured")` looks wrong, and the
//      compiler is perfectly happy. A reviewer would have to remember.
//
// So the class alone is not enough: it has to be the ONLY way to author that
// state. This rule reads the tracked source tree and fails if any error is
// constructed with "not configured" text through anything other than
// `NotConfiguredError`.
//
// ---------------------------------------------------------------------------
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ---------------------------------------------------------------------------
// For every tracked non-test `.ts` file under `src/`, it walks the AST for
// `new <Identifier>(...)` where the identifier ends in `Error`, and inspects the
// argument list for a string literal, no-substitution template, or template
// expression whose literal text contains "not configured" (case-insensitive).
// If the constructed identifier is not `NotConfiguredError`, that is a
// violation.
//
// What it does NOT catch, stated plainly rather than implied away:
//   * text assembled at runtime — `new Error("not " + word)`, or a message read
//     from a constant declared elsewhere. Only literal text in the argument
//     list is inspected;
//   * a factory — `makeError("… not configured")` constructs nothing the walk
//     can see, because the `new` happens inside the factory (which this rule
//     WOULD see, at its own site);
//   * a throw of a non-Error value — `throw "not configured"`;
//   * `NotConfiguredError` subclassed and then constructed under another name;
//   * anything outside `src/`, and anything in a `*.test.ts` file. Tests are
//     excluded on purpose: `respond.test.ts` must construct a bare
//     `Error("… not configured")` to pin U1's declared behaviour change, and a
//     rule that forbade it would forbid the proof of its own necessity.
//
// It is a regression guard for the form the defect actually took, not a
// taint-analysis engine — the same posture, and the same honesty, as
// error-disclosure.test.ts.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The one class allowed to carry this state. */
const SANCTIONED = "NotConfiguredError";

/** The phrase the old boundary dispatched on, lower-cased for comparison. */
const PHRASE = "not configured";

/**
 * Tracked non-test sources under `src/`.
 *
 * `--cached` is load-bearing (§4.2): the repository is Git's index, not one
 * developer's working directory. A NEW file must be `git add -N`'d before this
 * rule can see it — which is also the state CI reviews, and is proven in both
 * directions by the mutation record for this unit.
 */
function trackedSources(): string[] {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (cause) {
    throw new Error(
      "NOT_CONFIGURED_TOTALITY could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- src\n` +
        "This suite defines the repository as Git's tracked files, so it cannot run\n" +
        "outside a Git worktree or without `git` on PATH.\n" +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  const files = stdout
    .split("\0")
    .filter((p) => p.length > 0 && p.endsWith(".ts") && !p.endsWith(".test.ts"));

  if (files.length === 0) {
    throw new Error(
      "NOT_CONFIGURED_TOTALITY found zero tracked sources under src/.\n" +
        "A guardrail that scans nothing passes vacuously, so this is a hard failure\n" +
        "rather than a silent green.",
    );
  }
  return files.sort();
}

const SOURCES = trackedSources();

interface Construction {
  file: string;
  line: number;
  ctor: string;
  text: string;
}

/**
 * Module-level `const NAME = "… not configured …"` declarations.
 *
 * Phase 2 U6 forced this. U1's rule found the phrase in the ARGUMENT of a
 * construction, which worked while every throw site spelled its own text. U6
 * replaced three hand-authored copies with one shared constant
 * (`AI_SERVICE_NOT_CONFIGURED`, finding N-10) — and the moment it did,
 * `new Error(AI_SERVICE_NOT_CONFIGURED)` became invisible to a literal-only
 * scan. The guard would have gone green while the property it protects
 * silently stopped being enforced: the exact "green about nothing" failure
 * every anti-vacuity assertion in this repository exists to prevent.
 *
 * So the phrase is tracked through NAMES as well as literals. Collected across
 * the whole scanned set, because the constant is declared in one module and
 * used in three others.
 */
export function readPhraseConstants(sources: { file: string; ts: string }[]): Set<string> {
  const names = new Set<string>();
  const DECL = /\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(["'`])([\s\S]*?)\2/g;
  for (const { ts } of sources) {
    for (const m of stripLineComments(ts).matchAll(DECL)) {
      if (m[3].toLowerCase().includes(PHRASE)) names.add(m[1]);
    }
  }
  return names;
}

function stripLineComments(text: string): string {
  return text.replace(/^\s*\/\/[^\n]*$/gm, "");
}

/** Literal text of an argument, or null when it is not a literal this rule reads. */
function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join("");
  }
  return null;
}

/**
 * Every `new SomethingError(… "not configured" …)` in one source file.
 *
 * Takes source *text*, not a path, so the self-tests below exercise it on
 * in-memory fixtures. A guard that must write files into `src/` to test itself
 * can leave debris in a live tree if the process dies.
 */
export function findConstructions(
  fileName: string,
  sourceText: string,
  phraseConstants: ReadonlySet<string> = new Set(),
): Construction[] {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const found: Construction[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const ctor = node.expression.text;
      if (ctor.endsWith("Error")) {
        for (const arg of node.arguments ?? []) {
          const literal = literalText(arg);
          const named =
            ts.isIdentifier(arg) && phraseConstants.has(arg.text) ? arg.text : null;
          const text = literal ?? named;
          if (text && (named !== null || text.toLowerCase().includes(PHRASE))) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            found.push({ file: fileName, line: line + 1, ctor, text });
            break;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return found;
}

const READ = (file: string) => fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
const PHRASE_CONSTANTS = readPhraseConstants(SOURCES.map((file) => ({ file, ts: READ(file) })));

function constructionsInFile(file: string): Construction[] {
  return findConstructions(file, READ(file), PHRASE_CONSTANTS);
}

const ALL = SOURCES.flatMap(constructionsInFile);

describe("NOT_CONFIGURED_TOTALITY — one class owns the 503 (Phase 2 U1)", () => {
  it("finds sources to scan", () => {
    // Anti-vacuity. 80+ non-test modules live under src/lib alone.
    expect(SOURCES.length).toBeGreaterThanOrEqual(100);
  });

  it("every 'not configured' error is a NotConfiguredError", () => {
    const violations = ALL.filter((c) => c.ctor !== SANCTIONED);

    expect(
      violations,
      violations.length === 0
        ? ""
        : "An error carrying 'not configured' text is being constructed through a class\n" +
            "other than NotConfiguredError.\n\n" +
            "Since Phase 2 U1, `handle()` recognises this state by TYPE, not by substring.\n" +
            "A bare Error with that text is no longer a 503 — it is a 500 with a correlation\n" +
            "id and a generic client message, and the authored operational text never\n" +
            "reaches the user. That is a real behaviour change and nothing at the throw\n" +
            "site looks wrong, which is why this rule exists.\n\n" +
            "Fix:\n" +
            '  import { NotConfiguredError } from "@/lib/api/errors";\n' +
            '  throw new NotConfiguredError("SETTING_NAME not configured");\n\n' +
            violations.map((v) => `  ${v.file}:${v.line}  new ${v.ctor}(${JSON.stringify(v.text)})`).join("\n"),
    ).toEqual([]);
  });

  it("tracks the phrase through a shared constant, not only through literals", () => {
    // Anti-vacuity for U6's change. If `readPhraseConstants` ever stops finding
    // `AI_SERVICE_NOT_CONFIGURED`, the three throw sites below become invisible
    // and the totality rule passes having checked nothing.
    expect(PHRASE_CONSTANTS.has("AI_SERVICE_NOT_CONFIGURED")).toBe(true);
  });

  it("the sanctioned throw sites still exist, and are the ones U1 converted", () => {
    // The inverse assertion, and the one that makes the rule above non-vacuous:
    // a repository where every such throw was DELETED would satisfy "no bad
    // constructions" perfectly. These three are the sites U1 enumerated by
    // command before editing (§9.4), and each reaches the client differently:
    //   supabase/env.ts       → through handle() → 503 NOT_CONFIGURED (live)
    //   advisor/claude-adapter → the SSE stream, never through handle()
    //   lab-import/pdf-adapter → re-wrapped as ExtractionError → 502 (preserved)
    const sanctionedFiles = ALL.filter((c) => c.ctor === SANCTIONED).map((c) => c.file);

    expect(sanctionedFiles).toEqual(
      expect.arrayContaining([
        "src/lib/supabase/env.ts",
        "src/lib/advisor/claude-adapter.ts",
        "src/lib/lab-import/pdf-adapter.ts",
      ]),
    );
  });

  it("the substring dispatch is gone from the boundary, not merely bypassed", () => {
    // U1's spec: "deleted, not bypassed". A `NotConfiguredError` branch sitting
    // in front of a surviving substring branch would pass every test above while
    // leaving the over-matching defect live for third-party error text.
    const respond = fs.readFileSync(path.join(REPO_ROOT, "src/lib/api/respond.ts"), "utf8");
    const code = respond
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("*") && !l.trimStart().startsWith("//"))
      .join("\n");

    expect(code).not.toMatch(/\.message[\s\S]{0,40}includes\(\s*["'`]not configured/i);
    expect(code).toContain("err instanceof NotConfiguredError");
  });

  // Without these, a visit() regression would make the rule above pass vacuously
  // and look like proof of totality. CLAUDE.md §5.2: a guard not shown to go red
  // is not a guard. Fixtures are parsed from memory — nothing is written to disk.
  describe("parser self-test", () => {
    const scan = (src: string) => findConstructions("fixture.ts", src);

    it.each([
      ["a bare Error", 'throw new Error("API_KEY not configured");'],
      ["a custom Error subclass", 'throw new ExtractionError("API_KEY not configured", "X");'],
      ["the phrase mid-sentence", 'throw new Error("Supabase is not configured. Set X.");'],
      ["different casing", 'throw new Error("Redis is NOT CONFIGURED");'],
      ["a template literal", "throw new Error(`${name} not configured`);"],
      ["a no-substitution template", "throw new Error(`API_KEY not configured`);"],
      ["a non-first argument", 'throw new ExtractionError("X", "thing not configured");'],
      ["nested inside a function", 'function f(){ if (!k) throw new Error("k not configured"); }'],
    ])("detects %s", (_label, src) => {
      expect(scan(src).length).toBeGreaterThan(0);
    });

    it.each([
      ["the sanctioned class itself", 'throw new NotConfiguredError("API_KEY not configured");'],
      ["an unrelated error", 'throw new Error("network down");'],
      ["a non-Error constructor", 'const x = new Map("not configured");'],
      ["the phrase in a comment", '// this is not configured yet\nthrow new Error("boom");'],
      ["the phrase in a plain string", 'const s = "not configured"; use(s);'],
    ])("does not flag %s", (_label, src) => {
      expect(scan(src).filter((c) => c.ctor !== SANCTIONED)).toEqual([]);
    });

    it("flags a construction that passes a phrase CONSTANT rather than a literal", () => {
      const consts = readPhraseConstants([
        { file: "c.ts", ts: 'export const MSG = "the thing is not configured";' },
      ]);
      expect(consts.has("MSG")).toBe(true);
      const hits = findConstructions("f.ts", "throw new Error(MSG);", consts);
      expect(hits.map((h) => [h.ctor, h.text])).toEqual([["Error", "MSG"]]);
    });

    it("accepts the sanctioned class passing that same constant", () => {
      const consts = new Set(["MSG"]);
      expect(
        findConstructions("f.ts", "throw new NotConfiguredError(MSG);", consts).filter(
          (c) => c.ctor !== SANCTIONED,
        ),
      ).toEqual([]);
    });

    it("does not treat an unrelated constant as the phrase", () => {
      const consts = readPhraseConstants([
        { file: "c.ts", ts: 'const OTHER = "everything is fine";' },
      ]);
      expect(consts.size).toBe(0);
      expect(findConstructions("f.ts", "throw new Error(OTHER);", consts)).toEqual([]);
    });

    it("ignores a phrase constant that exists only in a comment", () => {
      expect(
        readPhraseConstants([{ file: "c.ts", ts: '// const MSG = "not configured";' }]).size,
      ).toBe(0);
    });

    it("reports the offending line, constructor and text", () => {
      const hits = scan(
        [
          'export function a(){ throw new Error("A not configured"); }',
          'export function b(){ throw new NotConfiguredError("B not configured"); }',
          'export function c(){ throw new Error("unrelated"); }',
        ].join("\n"),
      );
      expect(hits.map((h) => [h.line, h.ctor, h.text])).toEqual([
        [1, "Error", "A not configured"],
        [2, "NotConfiguredError", "B not configured"],
      ]);
    });
  });
});
