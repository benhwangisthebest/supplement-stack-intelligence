// FU-47 / N-79 — the one comment-stripper the architecture guards share.
//
// WHY ONE, AND WHY THIS SHAPE. Four guards each carried a private
// `.replace(/\/\/[^\n]*/g, " ")`. That pattern is unanchored: a `//` inside a
// string or URL literal (`"https://…"`) blanked the REST OF THAT LINE, hiding
// whatever code shared it from the scan (N-79). The register's remedy was the
// anchored `/^\s*\/\/.*$/gm` seven other specs use (an eighth uses a `[^\n]*` variant). It was MEASURED before
// adopting it (Phase 4 U1): over tracked `src/` and `scripts/`, the anchored form
// would stop stripping 285 trailing comments (`code(); // note`). A guard asking
// "does this file call `handle(`?" could then be satisfied by a comment that
// mentions it, which is a weakening of every presence check that used it.
//
// So this strips a `//` comment wherever it STARTS OUTSIDE a string, template or
// regex literal: whole-line comments (the anchored case) and trailing comments
// alike, while a `//` inside a literal is code and stays. Measured on the tracked
// tree at U1 (and re-checked by the unit's reviewer against the TypeScript parser
// over 376 files): its output contains the pre-U1 output on every line, no real
// comment survives, and the only text it newly reveals is a `//` inside a literal.
// On ADVERSARIAL input it is a heuristic, not a lexer, and the cases the reviewer
// built are pinned as self-tests in `five-xx-is-logged.test.ts`. Line comments are removed without removing their
// newline. A multi-line block comment still collapses to one space, exactly as
// in the four sites this replaces, so the positional `codeOf` scan in
// `five-xx-is-logged` sees the same shape it always did.
//
// WHAT IT DOES NOT DO, stated beside the code (§5 rule 2's lesson):
//   * Block comments are removed first by the SAME regex the four sites used,
//     `/\/\*[\s\S]*?\*\//g`, unchanged, so this change moves only line comments.
//     That regex is itself not lexer-aware: a slash followed by a star inside a
//     string or a line comment (a glob, a wildcard path) opens a "comment" that
//     runs to the next star-slash, hiding the code between. Registered as N-88,
//     not fixed here (one behavioural change per landing). This header is worded
//     so as not to contain that sequence itself.
//   * Regex-literal detection is a heuristic: a `/` opens a regex when the
//     previous non-space token is one of `( , = : [ ! & | ? { } ; >` (so `=>`
//     counts), a keyword such as `return` or `typeof`, or the start of the file.
//     After an identifier, `)`, `]`, `++` or `--` it is division.
//   * FALLBACK: a quote or regex still open at the end of its line was probably
//     misread (JSX text like `Don't`, an unusual regex). The first `//` in the
//     rest of that line that does not follow a `:` (a URL) is then treated as a
//     comment, as the pre-U1 regex would have treated it.
//   * KNOWN LIMIT, stated because the unit's second reviewer proved it: a
//     BACKTICK that is misread (a regex containing one right after `)`, or a lone
//     backtick in JSX text) opens a "template" that runs to the next backtick, and
//     comments inside it are KEPT. That is weaker than the pre-U1 regex on that
//     input. No such construct exists in the tracked tree: measured against the
//     TypeScript parser at U1, every stripped line comment matches exactly.
//   * Template literals are skipped as a whole, `${…}` included, so a `//` inside
//     an interpolation is treated as literal text rather than as a comment.

const REGEX_PRECEDERS = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", ">", ""]);
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await"]);

/** Emit an unterminated literal span: code up to the first `//` not after a `:`, which is a comment. */
function unterminated(span: string): string {
  const m = /(^|[^:])\/\//.exec(span);
  if (!m) return span;
  const k = m.index + m[1].length;
  return span.slice(0, k) + " ";
}

/** Remove line comments that start outside a literal. Newlines are kept. */
export function stripLineComments(source: string): string {
  let out = "";
  let i = 0;
  let prev = ""; // last non-whitespace code token (a character, or a whole word), for the regex heuristic
  let word = "";
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (/[A-Za-z0-9_$]/.test(c)) {
      word += c;
      out += c;
      i++;
      continue;
    }
    if (word) {
      prev = REGEX_KEYWORDS.has(word) ? "" : "w";
      word = "";
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== c) {
        if (source[j] === "\\") j++;
        else if (c !== "`" && source[j] === "\n") break;
        j++;
      }
      if (c !== "`" && source[j] !== c) {
        out += unterminated(source.slice(i, j)); // j is the newline (or EOF); it is emitted next pass
        i = j;
        prev = c;
        continue;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      prev = c;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += " ";
      continue;
    }
    if (c === "/" && REGEX_PRECEDERS.has(prev)) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== "\n") {
        if (source[j] === "\\") j++;
        else if (source[j] === "[") inClass = true;
        else if (source[j] === "]") inClass = false;
        else if (source[j] === "/" && !inClass) break;
        j++;
      }
      if (source[j] !== "/") {
        out += unterminated(source.slice(i, j));
        i = j;
        prev = "/";
        continue;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      prev = "/";
      continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = c === "+" || c === "-" ? "w" : c;
    i++;
  }
  return out;
}

/** Block comments (the four sites' regex, unchanged), then line comments outside literals. */
export function stripComments(source: string): string {
  return stripLineComments(source.replace(/\/\*[\s\S]*?\*\//g, " "));
}
