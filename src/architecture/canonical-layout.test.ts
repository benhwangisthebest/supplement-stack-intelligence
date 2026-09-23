// CANONICAL_LAYOUT — each committed SEED_* module is byte-for-byte what the
// emitter produces from its own value after a JSON round trip.
// Spec: Phase 3 plan §4 U1, landing (b); owner rulings of 2026-09-23 (the (a)/(b) split,
// D-a1, and the AC-2 amendment). Cycle record: docs/01-plan/features/p3-u1-codegen-identity.plan.md.
//
// WHAT IT CLAIMS, and only this (owner ruling 2026-09-23, AC-2 amended):
// This guard proves each SEED_ file is in the emitter's canonical layout for
// its own value. It does not prove content fidelity; that begins at U2.
//
// WHY THAT IS ALL IT CAN CLAIM. While TypeScript is the source, the value the
// round trip starts from is read out of the file under test. A hand-edited
// value, or a hand key-reorder, changes that value too, and the emitter then
// reproduces the edited file faithfully. Both stay green here. Catching them
// needs a reference that is not the file itself, which is JSON as the source
// of truth: U2's obligation, with a red proof for each (register §4 U2).
//
// WHY BYTES AND NOT PARSED EQUALITY. Layout is exactly what parsed equality
// cannot see. A dropped trailing comma, a collapsed object or a hand-inserted
// comment all deep-equal the canonical file, so this guard compares Buffers.
//
// THE ROUND TRIP, per module: import the exported SEED_* value →
// JSON.stringify → JSON.parse → content/emit.mjs → compare with the file on
// disk. Anything JSON cannot carry (undefined, a Date, a function, a spelling
// like 18.0) fails here rather than being lost later. No JSON corpus is
// committed.
//
// The preamble (everything before `export const`) is read from the file under
// test, so it is reproduced by construction and proves nothing.
//
// ANTI-VACUITY: the module set comes from `git ls-files` (the R1 rule), is
// asserted non-empty, and is pinned. A test that compares zero files cannot pass.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emitModule } from "../../content/emit.mjs";

const ROOT = path.resolve(__dirname, "../..");

/** Pinned. A tenth SEED_* module must be a conscious addition, not a silent one. */
const EXPECTED_MODULES = 9;

function trackedSeedModules(): string[] {
  const out = execFileSync("git", ["ls-files", "-z", "src/data"], { cwd: ROOT, encoding: "utf8" });
  return out
    .split("\0")
    .filter((f) => /^src\/data\/seed-[^/]+\.ts$/.test(f) && !f.endsWith(".test.ts"))
    .sort();
}

const DECLARATION = /^export const (SEED_[A-Z_]+): ([A-Za-z]+)\[\] = /m;

/** Line and column of the first differing byte, so a red run points at the edit. */
function firstDifference(expected: Buffer, actual: Buffer): string {
  const n = Math.min(expected.length, actual.length);
  let i = 0;
  while (i < n && expected[i] === actual[i]) i++;
  const before = actual.subarray(0, i).toString("utf8").split("\n");
  const line = before.length;
  const col = before[before.length - 1].length + 1;
  const show = (b: Buffer) => JSON.stringify(b.subarray(i, i + 40).toString("utf8"));
  return `first difference at byte ${i} (line ${line}, col ${col}): committed ${show(actual)} vs emitted ${show(expected)}`;
}

const modules = trackedSeedModules();

describe(`CANONICAL_LAYOUT — ${modules.length} SEED_* modules compared byte-for-byte`, () => {
  it(`finds the pinned module set (${EXPECTED_MODULES}), never zero`, () => {
    expect(modules.length).toBeGreaterThan(0);
    expect(modules, "SEED_* module set changed: update EXPECTED_MODULES deliberately").toHaveLength(EXPECTED_MODULES);
  });

  it.each(modules)("%s — emitted from its JSON round trip is byte-identical", async (rel) => {
    const committed = readFileSync(path.join(ROOT, rel));
    const text = committed.toString("utf8");
    const decl = DECLARATION.exec(text);
    expect(decl, `${rel}: no \`export const SEED_*: Type[] = \` declaration`).not.toBeNull();
    const [, exportName, typeName] = decl!;

    const mod = await import(/* @vite-ignore */ path.join(ROOT, rel));
    const roundTripped: unknown = JSON.parse(JSON.stringify(mod[exportName]));
    const emitted = Buffer.from(
      emitModule({ preamble: text.slice(0, decl!.index), exportName, typeName }, roundTripped as unknown[]),
      "utf8",
    );

    const identical = emitted.equals(committed);
    expect(identical, identical ? "" : `${rel}: ${firstDifference(emitted, committed)}`).toBe(true);
  });
});
