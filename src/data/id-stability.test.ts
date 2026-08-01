// Reference-data ID stability guard — Phase 0 U8.
// Spec: docs/01-plan/phase-0-integration-enforcement.plan.md (U8)
// Contract: CLAUDE.md §2.16 — reference-data IDs are an append-only PUBLIC contract.
//
// Why this exists: eight namespaces of seed IDs are persisted in user rows with
// NO foreign key. Postgres cannot refuse a rename, and `tsc` cannot see one — a
// seed ID is a string literal, and the columns holding it are plain `text` (or
// jsonb keys / array members). Renaming or deleting one today produces a blank,
// unevaluable row with no detection anywhere.
//
// Why the baseline is a JSON file and not a computed set: a test that derives
// its expectation from the same array it validates cannot detect a rename — the
// expectation renames with it. `id-manifest.json` is read from disk as an
// INDEPENDENT, checked-in ledger, so drift becomes a reviewable diff.
//
// Deliberately NOT enforced here: display labels, free text (notes, reasons,
// custom names), derived evaluation output, and runtime-composite refIds. See
// FREE_TEXT_COLUMNS below — registering one of those is itself a failure.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { SEED_PRODUCTS } from "@/data/seed-products";
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { SEED_EFFECTS } from "@/data/seed-effects";
import { SEED_PAPERS } from "@/data/seed-papers";
import { SEED_INTERACTIONS } from "@/data/seed-interactions";
import { SEED_FOOD_PAIRINGS } from "@/data/seed-food-pairings";
import { SIDE_EFFECT_VOCAB } from "@/types/side-effect";
import { OUTCOME_CATEGORIES } from "@/types/primitives";

// ------------------------------------------------------------------ manifest --

interface Tombstone {
  id: string;
  retiredIn: string;
  supersededBy: string | null;
  migration: string;
}

interface Namespace {
  source: string;
  persistedAt: string[];
  dereferenced: boolean;
  ids: string[];
  tombstones: Tombstone[];
}

interface Manifest {
  version: number;
  namespaces: Record<string, Namespace>;
}

const MANIFEST_PATH = path.join(__dirname, "id-manifest.json");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;

// -------------------------------------------------------------- live datasets --

/**
 * The live ID set per namespace. Each entry is a namespace the manifest MUST
 * register — and conversely the manifest may register nothing else, so a new
 * seed dataset cannot be quietly added without a stability decision.
 */
const LIVE: Record<string, readonly string[]> = {
  supplements: SEED_SUPPLEMENTS.map((s) => s.id),
  products: SEED_PRODUCTS.map((p) => p.id),
  biomarkers: SEED_BIOMARKERS.map((b) => b.id),
  effects: SEED_EFFECTS.map((e) => e.id),
  papers: SEED_PAPERS.map((p) => p.id),
  // Both rule sets flow through InteractionFlag.ruleId, so they share one
  // namespace — an id colliding across the two files is a real collision.
  interactionRules: [...SEED_INTERACTIONS, ...SEED_FOOD_PAIRINGS].map((r) => r.id),
  sideEffectLabels: [...SIDE_EFFECT_VOCAB],
  outcomeCategories: [...OUTCOME_CATEGORIES],
};

/**
 * Columns that are free text or derived display output. None of them may ever
 * appear in a namespace's `persistedAt`: freezing them would turn ordinary copy
 * editing into a migration, which is exactly the over-reach this guard avoids.
 */
const FREE_TEXT_COLUMNS = [
  "stack_items.custom_name",
  "stack_items.reason",
  "stack_items.notes",
  "checkins.note",
  "side_effect_reports.note",
  "evaluation_flags.title",
  "evaluation_flags.explanation",
  "evaluation_flags.recommendation",
] as const;

const namespaceNames = Object.keys(manifest.namespaces).sort();
const liveNames = Object.keys(LIVE).sort();

const dupes = (xs: readonly string[]): string[] =>
  [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))].sort();

// ------------------------------------------------------------------ the specs --

describe("U8 — reference-data ID manifest integrity", () => {
  it("registers exactly the namespaces that exist, no more and no fewer", () => {
    // A new persisted seed dataset must be classified, not silently ungoverned.
    expect(namespaceNames).toEqual(liveNames);
  });

  it("never freezes a free-text or derived display column", () => {
    const offenders = Object.entries(manifest.namespaces).flatMap(([name, ns]) =>
      ns.persistedAt
        .filter((col) => FREE_TEXT_COLUMNS.some((ft) => col.startsWith(ft)))
        .map((col) => `${name} registers free-text column ${col}`),
    );
    expect(offenders).toEqual([]);
  });

  it("declares a real persistence site for every namespace it governs", () => {
    // A namespace with no persisted home does not belong in this contract.
    const offenders = Object.entries(manifest.namespaces)
      .filter(([, ns]) => ns.persistedAt.length === 0)
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });

  it("contains no duplicate entry within a namespace, and no id that is also a tombstone", () => {
    const offenders: string[] = [];
    for (const [name, ns] of Object.entries(manifest.namespaces)) {
      for (const d of dupes(ns.ids)) offenders.push(`${name}: duplicate manifest id "${d}"`);
      for (const d of dupes(ns.tombstones.map((t) => t.id))) {
        offenders.push(`${name}: duplicate tombstone "${d}"`);
      }
      for (const t of ns.tombstones) {
        if (ns.ids.includes(t.id)) {
          offenders.push(`${name}: "${t.id}" is listed as BOTH a live id and a tombstone`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("U8 — canonical IDs are unique within each dataset", () => {
  // A duplicate is a silent collision: two records compete for the same
  // persisted key, and whichever the lookup finds first wins.
  for (const [name, ids] of Object.entries(LIVE)) {
    it(`${name}: no duplicate canonical id`, () => {
      expect(dupes(ids), `${name} has colliding ids`).toEqual([]);
    });
  }
});

describe("U8 — persisted IDs cannot disappear silently", () => {
  // The core guarantee. A rename shows up here as a REMOVAL, which is why a
  // rename can never masquerade as a harmless delete-plus-add.
  for (const name of liveNames) {
    it(`${name}: every manifest id still resolves in live seed data`, () => {
      const ns = manifest.namespaces[name];
      if (!ns) throw new Error(`namespace "${name}" is missing from id-manifest.json`);
      const live = new Set(LIVE[name]);

      const missing = ns.ids.filter((id) => !live.has(id));
      expect(
        missing,
        `${name}: ${missing.length} persisted id(s) vanished from seed data: ${missing.join(", ")}. ` +
          `This orphans existing user rows (${ns.persistedAt.join("; ")}). ` +
          `If intentional, move each id into "tombstones" in src/data/id-manifest.json with a ` +
          `migration note — and set "supersededBy" if this is a RENAME, not a deletion.`,
      ).toEqual([]);
    });
  }
});

describe("U8 — no unregistered canonical ID", () => {
  for (const name of liveNames) {
    it(`${name}: every live id is registered in the manifest`, () => {
      const ns = manifest.namespaces[name];
      if (!ns) throw new Error(`namespace "${name}" is missing from id-manifest.json`);
      const registered = new Set(ns.ids);

      const unregistered = LIVE[name].filter((id) => !registered.has(id));
      expect(
        unregistered,
        `${name}: ${unregistered.length} unregistered id(s): ${unregistered.join(", ")}. ` +
          `Append each to namespaces.${name}.ids in src/data/id-manifest.json. ` +
          `If one replaces a removed id, tombstone the old id with "supersededBy" instead.`,
      ).toEqual([]);
    });
  }
});

describe("U8 — tombstones express an explicit migration decision", () => {
  const allTombstones = Object.entries(manifest.namespaces).flatMap(([name, ns]) =>
    ns.tombstones.map((t) => ({ name, ns, t })),
  );

  it("a retired id never reappears in live seed data", () => {
    // Resurrecting an id silently re-points existing user rows at a new meaning.
    const offenders = allTombstones
      .filter(({ name, t }) => LIVE[name]?.includes(t.id))
      .map(({ name, t }) => `${name}: retired id "${t.id}" is live again`);
    expect(offenders).toEqual([]);
  });

  it("every tombstone carries a migration note", () => {
    const offenders = allTombstones
      .filter(({ t }) => !t.migration || t.migration.trim().length < 10)
      .map(({ name, t }) => `${name}.${t.id} has no usable migration note`);
    expect(offenders).toEqual([]);
  });

  it("every supersededBy target resolves to a LIVE id in the same namespace", () => {
    const offenders = allTombstones
      .filter(({ name, t }) => t.supersededBy !== null && !LIVE[name]?.includes(t.supersededBy))
      .map(({ name, t }) => `${name}.${t.id} -> "${t.supersededBy}" does not resolve`);
    expect(offenders).toEqual([]);
  });

  it("no alias chain or cycle: a supersededBy target is never itself retired", () => {
    // Because every target must be LIVE (above) and no id may be both live and
    // retired, a chain is structurally impossible. Asserted directly so the
    // property survives any future relaxation of those rules.
    const offenders = allTombstones
      .filter(
        ({ ns, t }) => t.supersededBy !== null && ns.tombstones.some((o) => o.id === t.supersededBy),
      )
      .map(({ name, t }) => `${name}: "${t.id}" -> "${t.supersededBy}", which is itself retired`);
    expect(offenders).toEqual([]);
  });
});
