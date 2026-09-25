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
// like 18.0) fails here rather than being lost later. ~~No JSON corpus is
// committed.~~ [2026-09-23, U2] One is now: content/seed/*.json is the source,
// and CONTENT_FIDELITY below is the guard that compares against it.
//
// The preamble (everything before `export const`) is read from the file under
// test, so it is reproduced by construction and proves nothing.
//
// ANTI-VACUITY: the module set comes from `git ls-files` (the R1 rule), is
// asserted non-empty, and is pinned. A test that compares zero files cannot pass.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emitModule } from "../../content/emit.mjs";
import { renderAll } from "../../content/generate.mjs";

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

// CONTENT_FIDELITY — each committed SEED_* module is byte-for-byte what
// content/generate.mjs renders from the JSON corpus in content/.
// Spec: Phase 3 plan §4 U2, landing (a); the U1 AC-2 obligation (owner, 2026-09-23).
//
// This is the half CANONICAL_LAYOUT cannot see. Its reference value is the JSON
// under content/seed/, not the file under test, so a hand-edited value, a hand
// key-reorder, or a hand-edited preamble in a generated .ts each fails here.
// The fix is never to edit src/data/seed-*.ts: edit the JSON and run
// `npm run content:generate`.
//
// ANTI-VACUITY: the rendered set must equal the tracked SEED_* set exactly, in
// both directions, and is pinned at EXPECTED_MODULES.

const rendered = renderAll();

describe(`CONTENT_FIDELITY — ${rendered.length} generated modules compared byte-for-byte with content/`, () => {
  it("renders exactly the tracked SEED_* set, never zero", () => {
    expect(rendered.length).toBe(EXPECTED_MODULES);
    expect(rendered.map((r) => r.target).sort()).toEqual(modules);
  });

  it.each(rendered.map((r) => [r.target, r.text] as const))(
    "%s — is exactly what content/generate.mjs renders from JSON",
    (rel, text) => {
      const committed = readFileSync(path.join(ROOT, rel));
      const expected = Buffer.from(text, "utf8");
      const identical = expected.equals(committed);
      expect(
        identical,
        identical ? "" : `${rel}: hand-edited? ${firstDifference(expected, committed)}. Edit content/seed/ and run npm run content:generate`,
      ).toBe(true);
    },
  );
});

// ID_CORRECTION_DIFF — [P4-X8], Phase 4 U3 (D-13 (a); owner ruling R-1, 2026-09-25).
// Cycle record: docs/01-plan/features/p4-u3-manifest-move.plan.md.
//
// A content correction that ADDS an id ships without a hand edit under src/. Its
// name-only diff may touch content/** (the seed JSON and the id ledger,
// content/id-manifest.json) plus src/ files whose line 1 is the GENERATED header,
// and nothing else under src/. The header is only a claim; CONTENT_FIDELITY above
// is what proves each headed file is generator output, so the headed set must
// equal the set CONTENT_FIDELITY renders. A hand-written file that borrows the
// header therefore fails here rather than escaping.
//
// Before U3 the ledger was src/data/id-manifest.json, so every id-adding
// correction hand-edited src/ (the [P3-X5] caveat).

const GENERATED_HEADER = /^\/\/ GENERATED from content\/seed\//;

/** Tracked src/ files whose first line is the GENERATED header. */
function generatedSrcFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "-z", "src"], { cwd: ROOT, encoding: "utf8" });
  return out
    .split("\0")
    .filter((f) => f !== "" && existsSync(path.join(ROOT, f)))
    .filter((f) => GENERATED_HEADER.test(readFileSync(path.join(ROOT, f), "utf8").split("\n", 1)[0]))
    .sort();
}

/** Paths in a name-only diff that an id-adding correction may not touch. */
function handEditedPaths(names: readonly string[], generated: ReadonlySet<string>): string[] {
  return names.filter((f) => !f.startsWith("content/") && !generated.has(f));
}

describe("ID_CORRECTION_DIFF — an id-adding correction touches content/ and GENERATED src/ files only ([P4-X8])", () => {
  const generated = generatedSrcFiles();
  const allowed = new Set(generated);

  it("the GENERATED-header set is exactly the set CONTENT_FIDELITY renders, never zero", () => {
    expect(generated).toHaveLength(EXPECTED_MODULES);
    expect(generated).toEqual(rendered.map((r) => r.target).sort());
  });

  it("the id ledger lives under content/, not src/", () => {
    expect(existsSync(path.join(ROOT, "content/id-manifest.json"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/data/id-manifest.json"))).toBe(false);
  });

  it("an in-memory id-adding correction produces a diff with no hand-edited src/ path", () => {
    // Drive the real emitter: append one paper (a clone under a new id) to the
    // authored JSON and to the ledger, and list every file whose bytes would change.
    const specs = JSON.parse(readFileSync(path.join(ROOT, "content/modules.json"), "utf8")) as {
      module: string;
      exportName: string;
      typeName: string;
      preamble: string[];
    }[];
    const papers = JSON.parse(readFileSync(path.join(ROOT, "content/seed/seed-papers.json"), "utf8")) as {
      id: string;
    }[];
    const added = { ...papers[0], id: "u3-probe-added-paper" };
    const changed = ["content/seed/seed-papers.json", "content/id-manifest.json"];
    for (const s of specs) {
      const authored: unknown[] = JSON.parse(readFileSync(path.join(ROOT, "content/seed", `${s.module}.json`), "utf8"));
      const value = s.module === "seed-papers" ? [...authored, added] : authored;
      const text = emitModule({ preamble: s.preamble.join("\n"), exportName: s.exportName, typeName: s.typeName }, value);
      const target = `src/data/${s.module}.ts`;
      if (!Buffer.from(text, "utf8").equals(readFileSync(path.join(ROOT, target)))) changed.push(target);
    }
    // Non-vacuous: the correction does reach src/, through the generated module only.
    expect(changed.filter((f) => f.startsWith("src/"))).toEqual(["src/data/seed-papers.ts"]);
    expect(handEditedPaths(changed, allowed)).toEqual([]);
  });

  it("red on a planted diff that also hand-edits the id test or names the old ledger path", () => {
    const planted = [
      "content/seed/seed-papers.json",
      "content/id-manifest.json",
      "src/data/seed-papers.ts",
      "src/data/id-stability.test.ts",
      "src/data/id-manifest.json",
    ];
    expect(handEditedPaths(planted, allowed)).toEqual(["src/data/id-stability.test.ts", "src/data/id-manifest.json"]);
  });

  it("red on a planted diff with any other non-GENERATED src/ path", () => {
    const planted = ["content/seed/seed-effects.json", "src/data/seed-effects.ts", "src/lib/evidence/index.ts"];
    expect(handEditedPaths(planted, allowed)).toEqual(["src/lib/evidence/index.ts"]);
  });
});

// FU-49 — editorial notes live in content/notes.json, a sidecar the generator
// never reads. A note must still point at a record that exists, or it rots.
describe("CONTENT_NOTES — every sidecar note anchors to a real record", () => {
  const notes = JSON.parse(readFileSync(path.join(ROOT, "content/notes.json"), "utf8")) as {
    module: string;
    anchorId: string;
  }[];

  it.each(notes.map((n) => [`${n.module}#${n.anchorId}`, n] as const))("%s resolves", (_label, n) => {
    const file = path.join(ROOT, "content/seed", `${n.module}.json`);
    const ids = (JSON.parse(readFileSync(file, "utf8")) as { id?: unknown }[]).map((r) => r.id);
    expect(ids, `${n.module} has no record with id ${n.anchorId}`).toContain(n.anchorId);
  });
});

// CONTENT_EDIT_PROPAGATES — P-12, [P3-X5] (Phase 3 U4, owner ruling FU-53).
// A content correction ships by editing the authored JSON alone: content/generate.mjs
// turns that one edit into the emitted constant, and nothing under src/ is written
// by hand (CONTENT_FIDELITY above fails a hand edit). This drives the real emitter
// over the real authored effects. Unchanged JSON must emit the committed module
// byte for byte, and a single-field edit must reach the emitted text. Red proof:
// making the emitter drop `summary` fails both tests
// (docs/01-plan/features/p3-u4-profiles.plan.md, the melatonin correction).
describe("CONTENT_EDIT_PROPAGATES — an edit to the authored JSON alone changes the emitted constant (P-12)", () => {
  const specs = JSON.parse(readFileSync(path.join(ROOT, "content/modules.json"), "utf8")) as {
    module: string;
    exportName: string;
    typeName: string;
    preamble: string[];
  }[];
  const spec = specs.find((s) => s.module === "seed-effects")!;
  const emit = (value: unknown[]) =>
    emitModule({ preamble: spec.preamble.join("\n"), exportName: spec.exportName, typeName: spec.typeName }, value);
  const authored = JSON.parse(readFileSync(path.join(ROOT, "content/seed/seed-effects.json"), "utf8")) as {
    id: string;
    summary: string;
  }[];
  const committed = readFileSync(path.join(ROOT, "src/data/seed-effects.ts"), "utf8");

  it("unchanged authored JSON emits the committed module byte for byte", () => {
    expect(emit(authored)).toBe(committed);
  });

  it("a one-field edit to the authored JSON reaches the emitted constant", () => {
    const edited = structuredClone(authored);
    const target = edited.find((e) => e.id === "melatonin-sleep")!;
    const before = target.summary;
    target.summary = "P-12 probe: an edited summary.";
    const out = emit(edited);
    expect(out).not.toBe(committed);
    expect(out).toContain(`summary: ${JSON.stringify(target.summary)},`);
    expect(out).not.toContain(JSON.stringify(before));
  });
});
