// Phase 3 U1 landing (a) — shared helper for the three proofs in this folder.
//
// Materialises the nine SEED_* modules exactly as they stood at a git ref
// (default b5aaab8, the anchor landing (a) is proven against) into a fresh
// temporary directory, read with `git show` — never from the working tree and
// never from memory. Runs from a clean clone: it needs only git and the repo's
// own devDependencies (`tsx` to import TypeScript, `typescript` for the scanner).

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_REF = "b5aaab8";

function git(args) {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

/** The SEED_* module file names at `ref` — derived from the tree, not listed by hand. */
export function seedModuleNames(ref) {
  return git(["ls-tree", "--name-only", `${ref}:src/data/`])
    .split("\n")
    .filter((n) => /^seed-.+\.ts$/.test(n) && !n.endsWith(".test.ts"));
}

/** Write every SEED_* module at `ref` into a temp dir; returns { dir, names }. */
export function materialiseBase(ref = DEFAULT_REF) {
  const dir = mkdtempSync(path.join(tmpdir(), `seed-${ref}-`));
  const names = seedModuleNames(ref);
  for (const n of names) writeFileSync(path.join(dir, n), git(["show", `${ref}:src/data/${n}`]));
  return { dir, names };
}

/** The name of the SEED_* constant a module's text exports. */
export function exportName(text, file) {
  const m = text.match(/^export const (SEED_[A-Z_]+)\b/m);
  if (!m) throw new Error(`no exported SEED_* constant in ${file}`);
  return m[1];
}

/** Import a TypeScript module by absolute path (requires running under tsx). */
export async function importValue(file, name) {
  return (await import(pathToFileURL(file).href))[name];
}

export function refFromArgv() {
  return process.argv[2] ?? DEFAULT_REF;
}
