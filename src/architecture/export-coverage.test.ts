// EXPORT_COVERAGE — the data export covers every user-owned table, and the
// partition is derived from the migrations rather than maintained by hand.
// Phase 2 U16.
//
// ===========================================================================
// WHY THIS IS A DERIVED PARTITION AND NOT A LIST
// ===========================================================================
// The Phase 2 exit criterion says a user can export "all 12 tables". The
// migration set creates THIRTEEN, and which twelve was meant had never been
// written down anywhere. At the 2026-08-12 owner sitting the Supabase SQL
// editor DISPLAYED twelve tables — `advisor_actions` had scrolled off the top
// of the list view — and twelve is exactly what the criterion says. A reader
// trusting the screen would have "confirmed" the criterion against a rendering
// artifact and closed the question in the wrong direction. `count(*)` said
// thirteen.
//
// So the number is not asserted. The PARTITION is:
//
//     every table in the migrations
//       = tables the export returns  +  tables EXPORT_EXCLUSIONS names
//
// with nothing in both and nothing in neither. A table added by a future
// migration is red until somebody decides, in writing, which side it is on.
// That is the property; "12" is merely today's count of the left-hand side.
//
// ---------------------------------------------------------------------------
// WHAT THIS CAN AND CANNOT SEE
// ---------------------------------------------------------------------------
// It calls `exportUserData` against a recording stub, so it sees which tables
// the export ACTUALLY QUERIES — not which keys it declares. Those differ: an
// export could return `{ checkins: [] }` forever without ever reading the
// table, and a key-only check would call that covered. Both are asserted.
//
// It cannot see whether the rows returned are complete or correct. Windowing is
// the specific risk there — `listCheckins` and `listSideEffectReports` default
// to 90 days — and it is covered by the fixture test in `export-repo.test.ts`,
// not here.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportUserData, EXPORT_EXCLUSIONS } from "@/lib/db/export-repo";

const REPO_ROOT = join(__dirname, "..", "..");

/** Every table the migration set creates, read as text, comments stripped. */
function migrationTables(): string[] {
  const listed = execFileSync(
    "git",
    ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "supabase/migrations"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
    .split("\0")
    .filter((p) => p.endsWith(".sql"));

  const tables = new Set<string>();
  for (const file of listed) {
    const sql = readFileSync(join(REPO_ROOT, file), "utf8").replace(/--[^\n]*/g, " ");
    for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z0-9_]+)/gi)) {
      tables.add(m[1].toLowerCase());
    }
  }
  return [...tables].sort();
}

/**
 * A Supabase stand-in that records every `.from(table)` and answers every query
 * shape the repositories use. Chainable, awaitable, and deliberately dumb.
 */
function recordingClient(queried: string[]) {
  const rowsFor = (table: string) =>
    // Stacks and conversations must return one row, or the three transitively
    // owned tables are never reached and this guard would silently stop
    // covering them — the exact vacuity it exists to prevent.
    table === "stacks" || table === "advisor_conversations" ? [{ id: `${table}-1` }] : [];

  const builder = (table: string) => {
    const result = { data: rowsFor(table), error: null };
    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown) => resolve(result),
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
    };
    for (const method of ["select", "eq", "in", "gte", "lte", "order", "limit", "range"]) {
      chain[method] = () => chain;
    }
    return chain;
  };

  return {
    from: (table: string) => {
      queried.push(table);
      return builder(table);
    },
  };
}

async function runExport() {
  const queried: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await exportUserData(recordingClient(queried) as any, "u1");
  return { queried: [...new Set(queried)].sort(), keys: Object.keys(result.tables).sort(), result };
}

describe("EXPORT_COVERAGE: the export partitions every table in the schema", () => {
  it("every migration table is either exported or excluded, and none is both", async () => {
    const all = migrationTables();
    const { keys } = await runExport();
    const excluded = Object.keys(EXPORT_EXCLUSIONS);

    expect(all.length, "no tables found in the migrations — a guard that scans nothing passes vacuously").toBeGreaterThan(0);

    const unaccounted = all.filter((t) => !keys.includes(t) && !excluded.includes(t));
    expect(
      unaccounted,
      "EXPORT_COVERAGE: table(s) in the schema that the export neither returns nor excludes.\n" +
        "A user asking for 'all my data' would silently not receive these. Either add them to\n" +
        "`exportUserData`, or add them to EXPORT_EXCLUSIONS with a written reason. Do not\n" +
        "leave them undecided — an unlisted table is indistinguishable from an oversight.",
    ).toEqual([]);

    const both = keys.filter((k) => excluded.includes(k));
    expect(both, "EXPORT_COVERAGE: table both exported and listed as excluded.").toEqual([]);
  });

  it("exports nothing that the schema does not have", async () => {
    // The other direction: a key that names no real table means the export is
    // shipping something invented, or a table was renamed and this went stale.
    const all = migrationTables();
    const { keys } = await runExport();
    expect(
      keys.filter((k) => !all.includes(k)),
      "EXPORT_COVERAGE: the export returns a key that is not a table in the migrations.",
    ).toEqual([]);
  });

  it("every excluded table exists in the schema", async () => {
    // A stale exclusion is as wrong as a missing one: it silently shrinks the
    // set this guard is checking, and reads like a considered decision.
    const all = migrationTables();
    expect(
      Object.keys(EXPORT_EXCLUSIONS).filter((t) => !all.includes(t)),
      "EXPORT_COVERAGE: EXPORT_EXCLUSIONS names a table that no migration creates.",
    ).toEqual([]);
  });

  it("every exclusion carries a substantive written reason", () => {
    for (const [table, reason] of Object.entries(EXPORT_EXCLUSIONS)) {
      expect(
        reason.length,
        `EXPORT_COVERAGE: the exclusion for "${table}" needs a real reason, not a label.\n` +
          "Withholding data from a user's own export is a decision that must be arguable\n" +
          "from the data model.",
      ).toBeGreaterThan(80);
    }
  });

  it("actually QUERIES every table it claims to export", async () => {
    // The anti-vacuity assertion. `{ checkins: [] }` can be returned forever by
    // a function that never reads `checkins`, and a key-only check would call
    // that covered.
    const { keys, queried } = await runExport();
    const declaredButUnread = keys.filter((k) => !queried.includes(k));
    expect(
      declaredButUnread,
      "EXPORT_COVERAGE: the export declares table(s) it never queried. An empty array from a\n" +
        "table nobody read is indistinguishable from an empty array because the user has no rows.",
    ).toEqual([]);
  });

  it("today that partition is 12 exported + 1 excluded = 13", async () => {
    // Pinned as a SNAPSHOT of the derived partition, not as the rule. If this
    // fails alongside a green partition above, a table was added and correctly
    // dispositioned — update the numbers. If it fails alone, something is wrong
    // with the derivation.
    const { keys } = await runExport();
    expect(keys.length, `exported tables: ${keys.join(", ")}`).toBe(12);
    expect(Object.keys(EXPORT_EXCLUSIONS).length).toBe(1);
    expect(migrationTables().length).toBe(13);
  });

  it("states its omissions in the payload", async () => {
    const { result } = await runExport();
    expect(result.notIncluded.length).toBeGreaterThan(0);
    // The auth identity is the omission a user is most likely to look for, so
    // it is pinned by name rather than left to the count above.
    expect(JSON.stringify(result.notIncluded)).toMatch(/auth\.users/);
  });
});
