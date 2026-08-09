// Executable guardrail binding the Postgres schema to its TypeScript row shapes
// (Phase 1 U8). Roadmap: "a schema↔type drift check exists and fails on a
// deliberately renamed column."
//
// WHY A GUARD. `src/lib/db/types.ts` and friends hand-declare the shape of rows
// that Supabase returns as `any`-ish JSON. Nothing checks the declaration against
// the migration that created the table. Rename a column in SQL and the TypeScript
// keeps compiling, every unit test keeps passing (they build row fixtures from the
// declared type, not from the database), and the failure appears in production as
// `undefined` where a value was expected. U7's mapper tests cannot catch it either:
// they prove the mapper copies `row.created_at` faithfully, not that the column is
// still called `created_at`.
//
// ---------------------------------------------------------------------------
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ---------------------------------------------------------------------------
// Two text parsers and one hand-written map between them.
//
// SQL side, over tracked `supabase/migrations/*.sql`:
//   create table [if not exists] [public.]<t> ( … )   → columns + NOT NULL
//   alter table [public.]<t> add column [if not exists] <c> <type>
// The body is split on commas at PAREN DEPTH ZERO, not on newlines. Both matter:
//   * `advisor_messages.role` carries `check (role in ('user', 'assistant'))` —
//     naive comma splitting invents two columns named `'user'` and `'assistant'`;
//   * `advisor_actions.conversation_id` puts its `references` clause on the NEXT
//     line, so a line-oriented parser reads the type as bare `uuid` and drops the
//     rest of the definition.
// Table-level constraints (`primary key (…)`, `unique (…)`, `check (…)`) are
// skipped by leading keyword — three tables declare one today (`advisor_usage`,
// `checkins`, `side_effect_reports`), and treating those as columns would
// fabricate drift.
//
// TypeScript side, over tracked `src/lib/**/*.ts` (non-test): every
// `interface <Name>Row { … }`, exported or not. Discovery is by shape, not by a
// hardcoded file list, so a row type added in a new repo module is picked up
// automatically instead of being silently unguarded.
//
// NULLABILITY is compared in both directions. A column is NOT NULL if its
// definition says so or if it is a single-column `primary key`; the test is run
// against the definition with parenthesised groups REMOVED, so a `check (…)`
// clause containing the words cannot fake it. A field is nullable if its type
// includes `| null` or the field is optional (`?`).
//
// WHAT IT DOES NOT COMPUTE, stated plainly:
//   * It does not compare TYPES. `value numeric` against `value: string` passes.
//     A faithful SQL↔TS type lattice is a much larger piece of work, and the
//     failure this guard exists for — a renamed or dropped column — is a NAME
//     failure. Recorded as a known gap rather than half-built.
//   * It is TEXT analysis, not SQL execution. It does not model `drop column`,
//     `rename column`, or `alter column … drop not null`. No migration uses any
//     of these (§2's baseline: "DDL regular, zero drops/renames"). If one ever
//     does, this guard keeps passing — the same hole RLS_COVERAGE declares.
//   * It does not know which rows a repo actually SELECTs. A query naming a
//     column absent from both sides is invisible here.
//   * `BINDING` is hand-written. That is deliberate: totality is asserted in both
//     directions below, so the map cannot silently drift out of date — but the
//     PAIRING itself (that `StackRow` describes `stacks` and not `stack_items`)
//     is a human claim this guard takes on trust.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Tracked files under `pathspec`. Discovery mirrors boundaries.test.ts,
 * error-disclosure.test.ts and rls-coverage.test.ts (Phase 0 R1): the repository
 * is Git's index, so an untracked local file cannot satisfy this rule and a sync
 * duplicate cannot break it. New files must be `git add -N`'d to be seen — see
 * the plan §4.2.
 */
function trackedFiles(pathspec: string, keep: (p: string) => boolean, label: string): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", pathspec],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "SCHEMA_DRIFT could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- ${pathspec}\n` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const files = stdout.split("\0").filter((p) => p.length > 0 && keep(p));
  if (files.length === 0) {
    throw new Error(
      `SCHEMA_DRIFT found 0 tracked ${label}; a guard that scans nothing passes vacuously.`,
    );
  }
  return files.sort();
}

// ---------------------------------------------------------------------------
// SQL parsing
// ---------------------------------------------------------------------------

export interface ColumnFact {
  name: string;
  notNull: boolean;
  /** The raw definition, quoted back in failure messages so the fix is obvious. */
  definition: string;
}

/** table name → (column name → fact). */
export type TableFacts = Map<string, Map<string, ColumnFact>>;

const stripSqlComments = (sql: string) => sql.replace(/--[^\n]*/g, " ");

/** Split on commas at paren depth 0. See the header on why depth matters. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 0);
}

/** Remove parenthesised groups, so `check (…)` text cannot be read as a modifier. */
function stripParenGroups(fragment: string): string {
  let out = "";
  let depth = 0;
  for (const ch of fragment) {
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out;
}

/** Leading keywords that mark a TABLE constraint rather than a column. */
const CONSTRAINT_LEADERS = new Set([
  "primary",
  "unique",
  "check",
  "foreign",
  "constraint",
  "exclude",
  "like",
]);

/** Read the balanced `( … )` body starting at `open` (the index OF the paren). */
function balancedBody(text: string, open: number): { body: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Parse migration SQL into per-table column facts.
 *
 * Exported so the anti-rot self-tests can drive it against synthetic SQL — if
 * this logic breaks, those go red without any real migration changing.
 */
export function readTableFacts(sources: { file: string; sql: string }[]): TableFacts {
  const tables: TableFacts = new Map();

  for (const { sql } of sources) {
    const text = stripSqlComments(sql);

    // --- create table -----------------------------------------------------
    const CREATE = /create table\s+(?:if not exists\s+)?(?:public\.)?([a-z0-9_]+)\s*\(/gi;
    for (const m of text.matchAll(CREATE)) {
      const table = m[1].toLowerCase();
      const open = m.index + m[0].length - 1;
      const found = balancedBody(text, open);
      if (!found) continue;
      const columns = tables.get(table) ?? new Map<string, ColumnFact>();
      for (const fragment of splitTopLevel(found.body)) {
        const lead = fragment.split(" ")[0].toLowerCase();
        if (CONSTRAINT_LEADERS.has(lead)) continue;
        const bare = stripParenGroups(fragment);
        const notNull = /\bnot null\b/i.test(bare) || /\bprimary key\b/i.test(bare);
        columns.set(lead, { name: lead, notNull, definition: fragment });
      }
      tables.set(table, columns);
    }

    // --- alter table … add column ----------------------------------------
    const ALTER = /alter table\s+(?:public\.)?([a-z0-9_]+)([^;]*);/gi;
    for (const m of text.matchAll(ALTER)) {
      const table = m[1].toLowerCase();
      const rest = m[2];
      if (!/add column/i.test(rest)) continue;
      const columns = tables.get(table) ?? new Map<string, ColumnFact>();
      for (const fragment of splitTopLevel(rest)) {
        const add = /^add column\s+(?:if not exists\s+)?([a-z0-9_]+)\b/i.exec(fragment);
        if (!add) continue;
        const bare = stripParenGroups(fragment);
        columns.set(add[1].toLowerCase(), {
          name: add[1].toLowerCase(),
          notNull: /\bnot null\b/i.test(bare),
          definition: fragment,
        });
      }
      tables.set(table, columns);
    }
  }
  return tables;
}

// ---------------------------------------------------------------------------
// TypeScript parsing
// ---------------------------------------------------------------------------

export interface FieldFact {
  name: string;
  nullable: boolean;
  type: string;
}

export interface RowTypeFact {
  name: string;
  file: string;
  fields: Map<string, FieldFact>;
}

/**
 * Split an interface body into field declarations, breaking on `;` or newline at
 * bracket depth zero.
 *
 * Splitting on newlines alone is not enough, and the self-test below proves it:
 * `interface T { a: string; b: string | null; }` on one line then reads as a
 * single field `a` whose type carries the whole rest of the body — including a
 * `| null` belonging to a different field, which silently reports `a` as
 * nullable. Depth tracking keeps `Record<string, number>` and function types in
 * one piece.
 */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "<" || ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === ">" || ch === "}" || ch === ")" || ch === "]") depth--;
    if ((ch === ";" || ch === "\n") && depth <= 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Parse `interface <Name>Row { … }` blocks out of TypeScript source.
 *
 * Exported for the same anti-rot reason as `readTableFacts`.
 */
export function readRowTypes(sources: { file: string; ts: string }[]): Map<string, RowTypeFact> {
  const rowTypes = new Map<string, RowTypeFact>();

  for (const { file, ts } of sources) {
    const IFACE = /(?:export\s+)?interface\s+([A-Za-z0-9_]*Row)\s*\{/g;
    for (const m of ts.matchAll(IFACE)) {
      const open = ts.indexOf("{", m.index);
      let depth = 0;
      let close = -1;
      for (let i = open; i < ts.length; i++) {
        if (ts[i] === "{") depth++;
        else if (ts[i] === "}") {
          depth--;
          if (depth === 0) {
            close = i;
            break;
          }
        }
      }
      if (close === -1) continue;

      const fields = new Map<string, FieldFact>();
      for (const rawLine of splitDeclarations(ts.slice(open + 1, close))) {
        const line = rawLine.replace(/\/\/.*$/, "").trim();
        const f = /^([a-z0-9_]+)(\?)?\s*:\s*(.+?);?$/i.exec(line);
        if (!f) continue;
        const type = f[3].replace(/;$/, "").trim();
        fields.set(f[1], {
          name: f[1],
          nullable: Boolean(f[2]) || /\|\s*null\b/.test(type),
          type,
        });
      }
      rowTypes.set(m[1], { name: m[1], file, fields });
    }
  }
  return rowTypes;
}

// ---------------------------------------------------------------------------
// The binding map
// ---------------------------------------------------------------------------
//
// Row type → the table it describes. Asserted TOTAL IN BOTH DIRECTIONS below
// (plan gate B1): every discovered row type appears here, and every created
// table appears here. A real mismatch is a FINDING to triage, never something to
// silence with an exemption entry — which is why this map has no "ignore" list.
//
// FOUR of the twelve row types live OUTSIDE `src/lib/db/types.ts`, whose header
// claims to hold "DB row shapes": `ConversationRow`, `MessageRow` and `UsageRow`
// are private to `src/lib/advisor/repo.ts`, and `ActionRow` is private to
// `src/lib/db/advisor-action-repo.ts`. That placement is why discovery scans all
// of `src/lib/**` rather than the one file the unit was scoped around — binding
// only `types.ts` would leave four tables unbound and make gate B1 unsatisfiable
// without exactly the exemption it forbids. Recorded as a finding, not fixed
// here: moving them is a refactor with its own callers to enumerate.
const BINDING: Record<string, string> = {
  UserProfileRow: "user_profiles",
  LabMarkerRow: "lab_markers",
  LabPanelRow: "lab_panels",
  StackRow: "stacks",
  StackItemRow: "stack_items",
  EvaluationFlagRow: "evaluation_flags",
  CheckinRow: "checkins",
  SideEffectReportRow: "side_effect_reports",
  ConversationRow: "advisor_conversations",
  MessageRow: "advisor_messages",
  UsageRow: "advisor_usage",
  ActionRow: "advisor_actions",
  RateLimitRow: "api_rate_limits",
};

const MIGRATIONS = trackedFiles(
  "supabase/migrations",
  (p) => p.endsWith(".sql"),
  "migration files",
);
const TS_SOURCES = trackedFiles(
  "src/lib",
  (p) => p.endsWith(".ts") && !p.endsWith(".test.ts"),
  "src/lib modules",
);

const TABLES = readTableFacts(
  MIGRATIONS.map((file) => ({ file, sql: fs.readFileSync(path.join(REPO_ROOT, file), "utf8") })),
);
const ROW_TYPES = readRowTypes(
  TS_SOURCES.map((file) => ({ file, ts: fs.readFileSync(path.join(REPO_ROOT, file), "utf8") })),
);

describe("SCHEMA_DRIFT — the real schema and the real row types", () => {
  it("scans a non-empty inventory on both sides", () => {
    // Anti-vacuity: every rule below iterates one of these. If either parser
    // silently produced nothing, the rules would pass having compared nothing.
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(TS_SOURCES.length).toBeGreaterThan(0);
    expect(TABLES.size).toBeGreaterThan(0);
    expect(ROW_TYPES.size).toBeGreaterThan(0);
    // Each parsed table has columns — a table parsed to an empty column set would
    // make "every column has a field" vacuously true for it.
    for (const [table, columns] of TABLES) {
      expect(columns.size, `table ${table} parsed to zero columns`).toBeGreaterThan(0);
    }
  });

  it("binds every discovered row type to a table", () => {
    const unbound = [...ROW_TYPES.values()]
      .filter((rt) => !(rt.name in BINDING))
      .map((rt) => `${rt.name} (${rt.file})`)
      .sort();
    expect(
      unbound,
      "SCHEMA_DRIFT: RowType is not bound to a table.\n" +
        "Every `*Row` interface under src/lib describes a database row, so it must\n" +
        "appear in BINDING and be checked against its migration. An unbound row type\n" +
        "is unguarded — the drift this file exists to catch would pass silently:\n  " +
        unbound.join("\n  "),
    ).toEqual([]);
  });

  it("binds every table the migrations create", () => {
    // The reverse direction. A table with no row type is not automatically wrong,
    // but it must be a deliberate, visible decision rather than an oversight.
    const unbound = [...TABLES.keys()].filter((t) => !Object.values(BINDING).includes(t)).sort();
    expect(
      unbound,
      "SCHEMA_DRIFT: these tables are created by a migration but bound to no RowType.\n" +
        "Either a row type is missing, or one exists somewhere this guard does not\n" +
        "scan — the second case is the more dangerous, because it looks fine:\n  " +
        unbound.join("\n  "),
    ).toEqual([]);
  });

  it("names a real table in every binding", () => {
    const missing = Object.entries(BINDING)
      .filter(([, table]) => !TABLES.has(table))
      .map(([rowType, table]) => `${rowType} → ${table} (no such table)`)
      .sort();
    expect(
      missing,
      "SCHEMA_DRIFT: a binding names a table no tracked migration creates.\n" +
        "A typo here silently stops checking the real table:\n  " + missing.join("\n  "),
    ).toEqual([]);
  });

  it("names a real row type in every binding", () => {
    const missing = Object.keys(BINDING)
      .filter((rowType) => !ROW_TYPES.has(rowType))
      .sort();
    expect(
      missing,
      "SCHEMA_DRIFT: BINDING names a RowType that no longer exists.\n" +
        "A renamed or deleted interface leaves its table unchecked:\n  " + missing.join("\n  "),
    ).toEqual([]);
  });

  it("has a field for every column", () => {
    const drift: string[] = [];
    for (const [rowType, table] of Object.entries(BINDING)) {
      const columns = TABLES.get(table);
      const fields = ROW_TYPES.get(rowType)?.fields;
      if (!columns || !fields) continue; // reported by the binding rules above
      for (const column of columns.keys()) {
        if (!fields.has(column)) drift.push(`${table}.${column} → ${rowType} column has no field`);
      }
    }
    expect(
      drift.sort(),
      "SCHEMA_DRIFT: a column exists in the migration with no field on its row type.\n" +
        "Reads of that column return undefined at runtime while TypeScript stays happy:\n  " +
        drift.join("\n  "),
    ).toEqual([]);
  });

  it("has a column for every field", () => {
    const drift: string[] = [];
    for (const [rowType, table] of Object.entries(BINDING)) {
      const columns = TABLES.get(table);
      const fields = ROW_TYPES.get(rowType)?.fields;
      if (!columns || !fields) continue;
      for (const field of fields.keys()) {
        if (!columns.has(field)) drift.push(`${rowType}.${field} → ${table} field has no column`);
      }
    }
    expect(
      drift.sort(),
      "SCHEMA_DRIFT: a row type declares a field the table does not have.\n" +
        "Every read of it is undefined; every write of it is rejected by Postgres:\n  " +
        drift.join("\n  "),
    ).toEqual([]);
  });

  it("agrees on nullability, column by column", () => {
    const drift: string[] = [];
    for (const [rowType, table] of Object.entries(BINDING)) {
      const columns = TABLES.get(table);
      const fields = ROW_TYPES.get(rowType)?.fields;
      if (!columns || !fields) continue;
      for (const [name, column] of columns) {
        const field = fields.get(name);
        if (!field) continue; // reported by "has a field for every column"
        if (column.notNull && field.nullable) {
          drift.push(
            `${rowType}.${name}: type says nullable, ${table}.${name} is NOT NULL — ` +
              "dead null-handling downstream",
          );
        }
        if (!column.notNull && !field.nullable) {
          drift.push(
            `${rowType}.${name}: type says non-null, ${table}.${name} is nullable — ` +
              "an unhandled null reaches the domain",
          );
        }
      }
    }
    expect(
      drift.sort(),
      "SCHEMA_DRIFT: nullability disagrees between the migration and the row type.\n" +
        "The second direction is the dangerous one — the compiler will not ask for a\n" +
        "null check the database can still deliver:\n  " + drift.join("\n  "),
    ).toEqual([]);
  });

  it("covers every table and row type in one reported pair count", () => {
    // A single number, so a shrinking inventory shows up in the diff rather than
    // hiding behind "all green".
    expect(Object.keys(BINDING).length).toBe(TABLES.size);
    expect(Object.keys(BINDING).length).toBe(ROW_TYPES.size);
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass because the schema and the types agree. That cannot tell
// you the PARSERS still work — a parser that matches nothing also reports no
// drift. These drive both against synthetic input with a known answer.
// ---------------------------------------------------------------------------
describe("SCHEMA_DRIFT — SQL parser self-tests", () => {
  const one = (sql: string) => readTableFacts([{ file: "synthetic.sql", sql }]);

  it("reads columns and NOT NULL from a create table", () => {
    const t = one(`create table if not exists public.t (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      note text
    );`);
    const cols = t.get("t")!;
    expect([...cols.keys()].sort()).toEqual(["id", "note", "user_id"]);
    expect(cols.get("id")!.notNull).toBe(true); // primary key implies NOT NULL
    expect(cols.get("user_id")!.notNull).toBe(true);
    expect(cols.get("note")!.notNull).toBe(false);
  });

  it("does not invent columns from the commas inside a check clause", () => {
    // The advisor_messages.role shape. A naive split produces `'user'` and
    // `'assistant'` as columns and reports two phantom drifts.
    const cols = one(
      `create table public.t (
        role text not null check (role in ('user', 'assistant')),
        content text not null
      );`,
    ).get("t")!;
    expect([...cols.keys()].sort()).toEqual(["content", "role"]);
    expect(cols.get("role")!.notNull).toBe(true);
  });

  it("reads a column whose definition continues on the next line", () => {
    // The advisor_actions.conversation_id shape.
    const cols = one(`create table public.t (
      conversation_id uuid
        references public.other(id) on delete set null,
      created_at timestamptz not null default now()
    );`).get("t")!;
    expect([...cols.keys()].sort()).toEqual(["conversation_id", "created_at"]);
    expect(cols.get("conversation_id")!.notNull).toBe(false);
  });

  it("skips table-level constraints instead of reading them as columns", () => {
    const cols = one(`create table public.t (
      user_id uuid not null,
      usage_date date not null,
      primary key (user_id, usage_date),
      unique (user_id, usage_date)
    );`).get("t")!;
    expect([...cols.keys()].sort()).toEqual(["usage_date", "user_id"]);
  });

  it("is not fooled by the words `not null` inside a check clause", () => {
    const cols = one(
      `create table public.t ( c text check (c <> 'not null') );`,
    ).get("t")!;
    expect(cols.get("c")!.notNull).toBe(false);
  });

  it("adds columns from `alter table … add column`, including multi-column form", () => {
    const t = one(`create table public.t ( id uuid primary key );
      alter table public.t
        add column if not exists a uuid references public.other(id) on delete cascade,
        add column if not exists b text,
        add column if not exists c numeric not null;`);
    const cols = t.get("t")!;
    expect([...cols.keys()].sort()).toEqual(["a", "b", "c", "id"]);
    expect(cols.get("b")!.notNull).toBe(false);
    expect(cols.get("c")!.notNull).toBe(true);
  });

  it("ignores `alter table … enable row level security`", () => {
    const cols = one(
      `create table public.t ( id uuid primary key );
       alter table public.t enable row level security;`,
    ).get("t")!;
    expect([...cols.keys()]).toEqual(["id"]);
  });

  it("ignores commented-out DDL", () => {
    const t = one(`-- create table public.ghost ( id uuid );
      create table public.t ( id uuid primary key, x text -- not null
      );`);
    expect(t.has("ghost")).toBe(false);
    expect(t.get("t")!.get("x")!.notNull).toBe(false);
  });
});

describe("SCHEMA_DRIFT — TypeScript parser self-tests", () => {
  const one = (ts: string) => readRowTypes([{ file: "synthetic.ts", ts }]);

  it("reads exported and non-exported row interfaces alike", () => {
    const r = one(`export interface ARow { id: string; }
      interface BRow { id: string; }`);
    expect([...r.keys()].sort()).toEqual(["ARow", "BRow"]);
  });

  it("reads nullability from `| null` and from optionality", () => {
    const fields = one(
      `interface TRow { a: string; b: string | null; c?: string; d?: string | null; }`,
    ).get("TRow")!.fields;
    expect(fields.get("a")!.nullable).toBe(false);
    expect(fields.get("b")!.nullable).toBe(true);
    expect(fields.get("c")!.nullable).toBe(true);
    expect(fields.get("d")!.nullable).toBe(true);
  });

  it("does not mistake a union of string literals for nullability", () => {
    // MessageRow.role is `"user" | "assistant"` — a `|` that means nothing here.
    const fields = one(`interface TRow { role: "user" | "assistant"; }`).get("TRow")!.fields;
    expect(fields.get("role")!.nullable).toBe(false);
  });

  it("ignores trailing line comments on a field", () => {
    const fields = one(
      `interface TRow { batch_id: string | null; // migration 0005, NULL for legacy rows\n }`,
    ).get("TRow")!.fields;
    expect(fields.get("batch_id")!.nullable).toBe(true);
  });

  it("reads a generic field type without splitting on its comma", () => {
    // CheckinRow.ratings is `Record<string, number>`.
    const fields = one(`interface TRow { ratings: Record<string, number>; }`).get("TRow")!.fields;
    expect(fields.get("ratings")!.type).toBe("Record<string, number>");
    expect(fields.get("ratings")!.nullable).toBe(false);
  });

  it("ignores interfaces that are not row shapes", () => {
    expect([...one(`interface Props { a: string; } interface TRow { a: string; }`).keys()]).toEqual(
      ["TRow"],
    );
  });
});
