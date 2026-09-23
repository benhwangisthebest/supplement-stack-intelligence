// Phase 3 U2 — the SEED_* code generator. The JSON under content/seed/ is the
// source of truth for the nine SEED_* modules; src/data/seed-*.ts is its output.
// Register: docs/01-plan/phase-3-evidence-grounding.plan.md §4 U2 (D-2; owner
// ruling 2026-09-23: the generated TypeScript is COMMITTED, not gitignored).
//
//   npm run content:generate            write all nine modules
//   npm run content:generate -- --check exit 1 if any committed module differs
//
// Inputs, and nothing else:
//   content/modules.json      one entry per module: exportName, typeName, and the
//                             preamble (the lines before `export const`) verbatim
//   content/seed/<module>.json the module's value, an array, in its own key order
// Layout is content/emit.mjs (rules L1–L7). Editorial notes live in
// content/notes.json, a sidecar this script never reads (FU-49).
//
// The committed output is guarded byte-for-byte against this script by
// CONTENT_FIDELITY in src/architecture/canonical-layout.test.ts, so a hand edit
// to a generated file fails the build. Edit the JSON and regenerate instead.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emitModule } from "./emit.mjs";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(REPO, "content");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Render every SEED_* module from the JSON corpus.
 * Throws if content/modules.json and content/seed/ do not name the same set.
 * @returns {{ module: string, target: string, text: string }[]} target is repo-relative
 */
export function renderAll() {
  const specs = readJson(path.join(CONTENT, "modules.json"));
  const listed = specs.map((s) => s.module).sort();
  const onDisk = readdirSync(path.join(CONTENT, "seed"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
  if (listed.length === 0 || JSON.stringify(listed) !== JSON.stringify(onDisk)) {
    throw new Error(`generate: modules.json lists [${listed}] but content/seed/ holds [${onDisk}]`);
  }

  return specs.map((s) => {
    const value = readJson(path.join(CONTENT, "seed", `${s.module}.json`));
    const text = emitModule(
      { preamble: s.preamble.join("\n"), exportName: s.exportName, typeName: s.typeName },
      value,
    );
    return { module: s.module, target: `src/data/${s.module}.ts`, text };
  });
}

function main() {
  const check = process.argv.includes("--check");
  const stale = [];
  const rendered = renderAll();
  for (const { target, text } of rendered) {
    const file = path.join(REPO, target);
    let current = null;
    try {
      current = readFileSync(file, "utf8");
    } catch {
      current = null;
    }
    if (current === text) continue;
    stale.push(target);
    if (!check) writeFileSync(file, text);
  }
  if (check && stale.length) {
    console.error(`content:generate --check: ${stale.length} module(s) differ from the JSON source:\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`content:generate: ${check ? "checked" : "wrote"} ${rendered.length} modules, ${stale.length} ${check ? "stale" : "changed"}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
