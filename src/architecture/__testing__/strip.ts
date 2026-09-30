// FU-47 / N-79 / FU-73 / N-88 — the one comment-stripper the architecture guards share.
//
// WHY ONE. Four guards each carried a private `.replace(/\/\/[^\n]*/g, " ")`. That
// pattern is unanchored: a `//` inside a string or URL literal (`"https://…"`)
// blanked the REST OF THAT LINE, hiding whatever code shared it from the scan
// (N-79). Eight more carried the anchored `/^\s*\/\/.*$/gm`, whose `\s*` spans
// newlines (so it shifts line positions) and which misses every trailing comment
// (`code(); // note`): 285 of them over tracked `src/` and `scripts/` at U1, so a
// presence check could be satisfied by a comment that mentions what it looks for.
//
// WHY A PARSER (Phase 4 U19, FU-73). U1 replaced the first four with a string-aware
// heuristic. It was right on the tracked tree and wrong in two stated ways. It
// removed block comments with the regex `/\/\*[\s\S]*?\*\//g`, which is not
// lexer-aware, so a slash-star inside a line comment or a string (a glob, a
// wildcard path) opened a "comment" that ran to the next star-slash and hid the
// code between from the model-ID scan in five tracked files (N-88). And a misread
// backtick kept comments up to the next backtick. Both are questions only a lexer
// with parser context can answer (is this `/` a regex or a division? is this `'`
// JSX text or a string?), so this module now asks the TypeScript parser: the same
// `typescript` dependency `tsc` runs.
//
// HOW. The source is parsed, every token is visited through `getChildren()`, which
// re-scans with the parser's context (regex or division, JSX text, template
// continuations), and the comment trivia in front of each token is collected with
// `ts.getTrailingCommentRanges` and `ts.getLeadingCommentRanges`. JSX text is a single token, so a `//` inside it is
// text. A JSDoc node is not descended into, so text inside a comment is never
// re-read as trivia. What is removed is exactly what the parser calls a comment.
//
// SHAPE OF THE OUTPUT. A removed comment becomes one space plus every line break it
// held, so LINE STRUCTURE IS PRESERVED for block comments too (U1's heuristic
// collapsed a multi-line block comment to one space). `blankComments` and
// `blankStringsAndComments` also preserve LENGTH, for callers that index back into
// the original text.
//
// WHAT IT DOES NOT DO, stated beside the code (§5 rule 2's lesson):
//   * It does not guess on text it cannot parse. The language comes from
//     `fileName` when one is given (`.tsx`, `.ts`, `.mts`, `.cts`, `.jsx`, `.js`,
//     `.mjs`, `.cjs`, `.json`). Without one, TSX is tried and then TS, and the
//     first that parses with no syntax error is used. Source that parses under
//     none of them THROWS, naming the file. A guard that silently mis-strips is
//     the failure this module exists to end, so a loud red is the chosen
//     behaviour.
//   * It knows JS, TS and JSON only. SQL `--` comments need a different lexer,
//     and the specs that strip SQL keep their own stripper for that reason.

import ts from "typescript";

interface Range {
  pos: number;
  end: number;
}

const KIND_BY_EXTENSION: Record<string, ts.ScriptKind> = {
  ".tsx": ts.ScriptKind.TSX,
  ".ts": ts.ScriptKind.TS,
  ".mts": ts.ScriptKind.TS,
  ".cts": ts.ScriptKind.TS,
  ".jsx": ts.ScriptKind.JSX,
  ".js": ts.ScriptKind.JS,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
  ".json": ts.ScriptKind.JSON,
};

function kindsFor(fileName: string | undefined): ts.ScriptKind[] {
  if (fileName === undefined) return [ts.ScriptKind.TSX, ts.ScriptKind.TS];
  const ext = /\.[a-z]+$/i.exec(fileName)?.[0].toLowerCase() ?? "";
  const kind = KIND_BY_EXTENSION[ext];
  if (kind === undefined) throw new Error(`strip: no JS, TS or JSON lexer for "${fileName}"`);
  return [kind];
}

/** Syntax errors only (the parser's own diagnostics), not type errors. */
function parseErrors(sf: ts.SourceFile): readonly ts.Diagnostic[] {
  return (sf as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
}

function parse(source: string, fileName: string | undefined): ts.SourceFile {
  let first: ts.Diagnostic | undefined;
  for (const kind of kindsFor(fileName)) {
    const name = fileName ?? (kind === ts.ScriptKind.TSX ? "inline.tsx" : "inline.ts");
    const sf = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, kind);
    const errors = parseErrors(sf);
    if (errors.length === 0) return sf;
    first ??= errors[0];
  }
  const where = first?.start === undefined ? "" : ` at offset ${first.start}`;
  const why = first ? ts.flattenDiagnosticMessageText(first.messageText, " ") : "";
  throw new Error(`strip: "${fileName ?? "<inline>"}" does not parse${where}: ${why}`);
}

function commentsOf(sf: ts.SourceFile): Range[] {
  const text = sf.text;
  // A JSDoc node lives INSIDE a comment: its positions are comment text.
  const isJSDoc = (n: ts.Node) => n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode;
  const walk = (node: ts.Node, f: (n: ts.Node) => void): void => {
    f(node);
    for (const child of node.getChildren(sf)) if (!isJSDoc(child)) walk(child, f);
  };

  // JSX text is one token with no trivia, so reading "trivia" where it starts
  // would re-read its own text. Every node that starts there (the text, and the
  // list that wraps it) is skipped, which is why this is a set of positions.
  const jsxText = new Set<number>();
  walk(sf, (n) => {
    if (n.kind === ts.SyntaxKind.JsxText) jsxText.add(n.pos);
  });

  const seen = new Map<number, Range>();
  walk(sf, (n) => {
    if (jsxText.has(n.pos)) return;
    // Both calls are needed: before the first line break, a comment is the
    // previous token's TRAILING trivia, and `getLeadingCommentRanges` starts after it.
    for (const r of ts.getTrailingCommentRanges(text, n.pos) ?? []) seen.set(r.pos, r);
    for (const r of ts.getLeadingCommentRanges(text, n.pos) ?? []) seen.set(r.pos, r);
  });
  return [...seen.values()].map(({ pos, end }) => ({ pos, end })).sort((a, b) => a.pos - b.pos);
}

/** String and template literal spans (a template whole, interpolations included). */
function literalsOf(sf: ts.SourceFile): Range[] {
  const out: Range[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      out.push({ pos: node.getStart(sf), end: node.end });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const keepBreaks = (text: string) => " " + text.replace(/[^\r\n\u2028\u2029]/g, "");
const blank = (text: string) => text.replace(/[^\r\n\u2028\u2029]/g, " ");

function replaceRanges(source: string, ranges: Range[], by: (text: string) => string): string {
  let out = "";
  let at = 0;
  for (const r of [...ranges].sort((a, b) => a.pos - b.pos)) {
    if (r.pos < at) continue; // inside a range already replaced
    out += source.slice(at, r.pos) + by(source.slice(r.pos, r.end));
    at = r.end;
  }
  return out + source.slice(at);
}

/** Every comment in the source, as the parser sees it, in order. */
export function commentRanges(source: string, fileName?: string): Range[] {
  return commentsOf(parse(source, fileName));
}

/** Remove every comment. Each becomes one space plus the line breaks it held. */
export function stripComments(source: string, fileName?: string): string {
  return replaceRanges(source, commentRanges(source, fileName), keepBreaks);
}

/** Remove `//` comments only. Block and JSDoc comments stay. */
export function stripLineComments(source: string, fileName?: string): string {
  const line = commentRanges(source, fileName).filter((r) => source.startsWith("//", r.pos));
  return replaceRanges(source, line, keepBreaks);
}

/** Blank every comment, preserving length and line breaks (indices stay valid). */
export function blankComments(source: string, fileName?: string): string {
  return replaceRanges(source, commentRanges(source, fileName), blank);
}

/**
 * Blank every comment and every string or template literal, quotes included,
 * preserving length and line breaks, so an index into the result is an index into
 * the input. Regex literals and JSX text are code here, and are kept.
 */
export function blankStringsAndComments(source: string, fileName?: string): string {
  const sf = parse(source, fileName);
  return replaceRanges(source, [...commentsOf(sf), ...literalsOf(sf)], blank);
}
