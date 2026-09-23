// Phase 3 U1 landing (a) — TOKEN proof.
// Scans each SEED_* module at the base ref (default b5aaab8) and in the working
// tree with the TypeScript scanner, skipping trivia (whitespace, comments), and
// compares the significant tokens by kind AND text. Allowed change classes:
//
//   - trivia (never seen: the scanner skips it)
//   - trailing commas: a comma immediately before `]` or `}` is dropped on both sides
//   - same-value numeric spellings (`18.0` -> `18`) — owner ruling D-a1, 2026-09-23,
//     because a JSON source cannot keep them
//
// Everything else is an UNEXPLAINED change.
//
//   npx tsx content/proofs/prove-tokens.mjs [ref]
//
// Exit 0 only if every module has 0 unexplained changes. Exit 1 otherwise, or on zero modules.

import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { REPO, exportName, materialiseBase, refFromArgv } from "./base.mjs";

const CLOSERS = new Set([ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseBraceToken]);

function significantTokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.ES2022, /* skipTrivia */ true, ts.LanguageVariant.Standard, text);
  const all = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    all.push({ kind, text: scanner.getTokenText() });
  }
  const trailingCommas = all.filter((t, i) => t.kind === ts.SyntaxKind.CommaToken && CLOSERS.has(all[i + 1]?.kind)).length;
  const tokens = all.filter((t, i) => !(t.kind === ts.SyntaxKind.CommaToken && CLOSERS.has(all[i + 1]?.kind)));
  return { tokens, trailingCommas };
}

const ref = refFromArgv();
const { dir, names } = materialiseBase(ref);
let failures = 0;
let compared = 0;

for (const n of names) {
  const baseText = readFileSync(path.join(dir, n), "utf8");
  const a = significantTokens(baseText);
  const b = significantTokens(readFileSync(path.join(REPO, "src/data", n), "utf8"));

  let unexplained = Math.abs(a.tokens.length - b.tokens.length);
  const numeric = [];
  for (let i = 0; i < Math.min(a.tokens.length, b.tokens.length); i++) {
    const x = a.tokens[i];
    const y = b.tokens[i];
    if (x.kind === y.kind && x.text === y.text) continue;
    if (x.kind === ts.SyntaxKind.NumericLiteral && y.kind === x.kind && Number(x.text) === Number(y.text)) {
      numeric.push(`${x.text}->${y.text}`);
      continue;
    }
    unexplained++;
  }
  compared += b.tokens.length;
  if (unexplained) failures++;
  const spelled = numeric.length ? ` [${numeric.join(", ")}]` : "";
  console.log(
    `${exportName(baseText, n).padEnd(26)} tokens=${String(b.tokens.length).padStart(4)} ` +
      `trailingCommas ${a.trailingCommas}->${b.trailingCommas} ` +
      `numericSpellingSameValue=${numeric.length}${spelled} unexplained=${unexplained}`,
  );
}

console.log(`\ntokens: ${names.length} modules, ${compared} significant tokens compared against ${ref}, failures=${failures}`);
process.exit(names.length === 0 || failures ? 1 : 0);
