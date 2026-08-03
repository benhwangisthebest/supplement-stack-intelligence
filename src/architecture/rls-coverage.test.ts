// Executable guardrail for CLAUDE.md §2.3 rule 12 — "every new table ships with
// RLS enabled and a matching policy in the same migration" (Phase 1 U6).
//
// WHY A GUARD. This rule cannot be tested from the application: every repository
// call in this codebase reads through an authenticated client, so a table with
// RLS switched off behaves identically in every unit test, every route test, and
// every local run. The failure only appears in production, as one user reading
// another's rows. There is no test to write except this one — a check on the
// migrations themselves.
//
// It also catches the opposite mistake, which is quieter and more common: RLS
// enabled with NO policy. Postgres then denies every access, so the table is not
// insecure — it is simply dead, and it fails at runtime rather than at deploy.
//
// ---------------------------------------------------------------------------
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ---------------------------------------------------------------------------
// Over the tracked `supabase/migrations/*.sql` files it strips `--` line
// comments, collapses runs of whitespace, and scans for three statement forms,
// case-insensitively and schema-qualifier-insensitively:
//
//   create table [if not exists] [public.]<name>       → the table inventory
//   alter table [public.]<name> enable row level security
//   create policy "<policy>" on [public.]<table>
//
// then asserts every created table appears in BOTH of the other two sets.
//
// Whitespace collapsing is not cosmetic. `0003_advisor.sql` aligns its
// statements — `alter table public.advisor_messages      enable row level
// security;` — and a single-space pattern silently misses all three of that
// file's tables while still reporting a clean run. That exact under-report was
// observed while writing this guard, which is why `tolerates the aligned
// whitespace style used by 0003_advisor.sql` exists below.
//
// WHAT IT DOES NOT COMPUTE, stated plainly:
//   * It is TEXT analysis, not SQL execution. It cannot tell that a policy's
//     `using` clause is correct, that it references `auth.uid()`, or that it
//     covers the right commands. `own_stack_items` deriving ownership through a
//     parent-stack subquery and a policy reading `using (true)` are
//     indistinguishable here. Reviewing policy LOGIC remains a human job.
//   * It does not model `drop policy`, `disable row level security`, `alter
//     policy`, or a later migration weakening an earlier one. No migration does
//     any of these today; if one ever does, this guard would keep passing and
//     that is a hole worth closing at the time.
//   * It does not see tables created outside `supabase/migrations/*.sql`, nor
//     tables created by Supabase itself (`auth.users` and friends) — only
//     `create table` statements in this repository's own tracked migrations.
//   * It does not require the policy to be in the SAME migration as the table,
//     only that both exist somewhere in the tracked set. Splitting them across
//     migrations is legal and 0001 does exactly that at file scope.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Tracked migration files. Discovery mirrors boundaries.test.ts and
 * error-disclosure.test.ts (Phase 0 R1): the repository is Git's index, so an
 * untracked local .sql cannot satisfy this rule and a sync duplicate cannot
 * break it.
 */
function trackedMigrations(): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "supabase/migrations"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "RLS_COVERAGE could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- supabase/migrations\n` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const files = stdout.split("\0").filter((p) => p.endsWith(".sql"));
  if (files.length === 0) {
    throw new Error(
      "RLS_COVERAGE found 0 tracked migration files; a guard that scans nothing passes vacuously.",
    );
  }
  return files.sort();
}

export interface MigrationFacts {
  /** table name → the migration that created it */
  createdTables: Map<string, string>;
  /** tables with `enable row level security` */
  rlsEnabled: Set<string>;
  /** table name → policy names declared on it */
  policies: Map<string, string[]>;
}

/** `--` comments removed, whitespace collapsed. See the header on why. */
function normalize(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Parse one or more migration sources into the three sets the rules compare.
 * Exported so the anti-rot self-tests can drive it against synthetic SQL — if
 * this logic breaks, those go red without any real migration changing.
 */
export function readMigrationFacts(sources: { file: string; sql: string }[]): MigrationFacts {
  const createdTables = new Map<string, string>();
  const rlsEnabled = new Set<string>();
  const policies = new Map<string, string[]>();

  const CREATE = /create table (?:if not exists )?(?:public\.)?([a-z0-9_]+)/gi;
  const ENABLE = /alter table (?:public\.)?([a-z0-9_]+) enable row level security/gi;
  const POLICY = /create policy "([^"]+)" on (?:public\.)?([a-z0-9_]+)/gi;

  for (const { file, sql } of sources) {
    const text = normalize(sql);
    for (const m of text.matchAll(CREATE)) {
      if (!createdTables.has(m[1])) createdTables.set(m[1], file);
    }
    for (const m of text.matchAll(ENABLE)) rlsEnabled.add(m[1]);
    for (const m of text.matchAll(POLICY)) {
      const list = policies.get(m[2]) ?? [];
      list.push(m[1]);
      policies.set(m[2], list);
    }
  }
  return { createdTables, rlsEnabled, policies };
}

const MIGRATIONS = trackedMigrations();
const FACTS = readMigrationFacts(
  MIGRATIONS.map((file) => ({ file, sql: fs.readFileSync(path.join(REPO_ROOT, file), "utf8") })),
);

describe("RLS_COVERAGE — the real migration set", () => {
  it("scans a non-empty inventory of tracked migrations and finds tables in it", () => {
    // Anti-vacuity: every rule below iterates the created-table set. If parsing
    // silently produced nothing, all of them would pass having checked nothing.
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(FACTS.createdTables.size).toBeGreaterThan(0);
  });

  it("every created table has row level security enabled", () => {
    const missing = [...FACTS.createdTables]
      .filter(([table]) => !FACTS.rlsEnabled.has(table))
      .map(([table, file]) => `${table} (created in ${file})`);
    expect(
      missing,
      "RLS_COVERAGE: these tables are created with no `enable row level security`.\n" +
        "CLAUDE.md §2.3 rule 12 requires every new table to ship with RLS enabled and a\n" +
        "matching policy in the same migration. Without it, any authenticated user can\n" +
        "read every row:\n  " + missing.join("\n  "),
    ).toEqual([]);
  });

  it("every RLS-enabled table has at least one policy", () => {
    const noPolicy = [...FACTS.rlsEnabled]
      .filter((table) => (FACTS.policies.get(table) ?? []).length === 0)
      .sort();
    expect(
      noPolicy,
      "RLS_COVERAGE: RLS enabled but no policy — denies all access, a silent outage,\n" +
        "not a safe default. Postgres rejects every read and write on these tables until\n" +
        "a policy exists:\n  " + noPolicy.join("\n  "),
    ).toEqual([]);
  });

  it("declares no policy on a table this repository never creates", () => {
    // A policy on an unknown table is either a typo in the table name — which
    // leaves the real table unprotected while looking covered — or a policy on
    // something outside this repository's schema.
    const orphans = [...FACTS.policies.keys()]
      .filter((table) => !FACTS.createdTables.has(table))
      .sort();
    expect(
      orphans,
      "RLS_COVERAGE: these policies name a table no tracked migration creates.\n" +
        "A misspelled table name here leaves the real table with no policy at all:\n  " +
        orphans.join("\n  "),
    ).toEqual([]);
  });

  it("enables RLS on no table this repository never creates", () => {
    const orphans = [...FACTS.rlsEnabled].filter((t) => !FACTS.createdTables.has(t)).sort();
    expect(orphans, `Unknown tables in \`enable row level security\`: ${orphans.join(", ")}`).toEqual([]);
  });

  it("covers every table the tracked migrations create", () => {
    // A single reported number, so a shrinking inventory is visible in the diff
    // rather than hidden behind "all green".
    const tables = [...FACTS.createdTables.keys()].sort();
    expect(tables.length).toBe(FACTS.rlsEnabled.size);
    expect(tables.every((t) => (FACTS.policies.get(t) ?? []).length > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass because the migrations comply. That cannot tell you the
// PARSER still works — a parser that matches nothing also reports no
// violations. These drive it against synthetic SQL with a known answer.
// ---------------------------------------------------------------------------
describe("RLS_COVERAGE — parser self-tests", () => {
  const one = (sql: string) => readMigrationFacts([{ file: "synthetic.sql", sql }]);

  it("detects a table created with no RLS enable", () => {
    const facts = one(`create table if not exists public.widgets (id uuid primary key);`);
    expect([...facts.createdTables.keys()]).toEqual(["widgets"]);
    expect(facts.rlsEnabled.has("widgets")).toBe(false);
  });

  it("detects RLS enabled with no policy", () => {
    const facts = one(`
      create table if not exists public.widgets (id uuid primary key);
      alter table public.widgets enable row level security;
    `);
    expect(facts.rlsEnabled.has("widgets")).toBe(true);
    expect(facts.policies.get("widgets") ?? []).toEqual([]);
  });

  it("accepts a fully compliant table", () => {
    const facts = one(`
      create table if not exists public.widgets (id uuid primary key);
      alter table public.widgets enable row level security;
      create policy "own_widgets" on public.widgets for all using (user_id = auth.uid());
    `);
    expect(facts.rlsEnabled.has("widgets")).toBe(true);
    expect(facts.policies.get("widgets")).toEqual(["own_widgets"]);
  });

  it("tolerates the aligned whitespace style used by 0003_advisor.sql", () => {
    // The under-report that motivated `normalize`. A single-space pattern reads
    // this file as three tables with no RLS at all — and reports nothing.
    const facts = one(`
      create table if not exists public.a (id uuid);
      alter table public.a      enable row level security;
      create policy "own_a"   on public.a for all using (true);
    `);
    expect(facts.rlsEnabled.has("a")).toBe(true);
    expect(facts.policies.get("a")).toEqual(["own_a"]);
  });

  it("ignores statements that appear only inside `--` comments", () => {
    const facts = one(`
      create table if not exists public.widgets (id uuid);
      -- alter table public.widgets enable row level security;
      -- create policy "own_widgets" on public.widgets for all using (true);
    `);
    expect(facts.rlsEnabled.has("widgets")).toBe(false);
    expect(facts.policies.get("widgets")).toBeUndefined();
  });

  it("parses case-insensitively and without the schema qualifier", () => {
    const facts = one(`
      CREATE TABLE widgets (id uuid);
      ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "own_widgets" ON widgets FOR ALL USING (true);
    `);
    expect([...facts.createdTables.keys()]).toEqual(["widgets"]);
    expect(facts.rlsEnabled.has("widgets")).toBe(true);
    expect(facts.policies.get("widgets")).toEqual(["own_widgets"]);
  });

  it("attributes each table to the migration that created it", () => {
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: "create table public.a (id uuid);" },
      { file: "0002.sql", sql: "create table public.b (id uuid);" },
    ]);
    expect(facts.createdTables.get("a")).toBe("0001.sql");
    expect(facts.createdTables.get("b")).toBe("0002.sql");
  });

  it("collects multiple policies declared on one table", () => {
    const facts = one(`
      create table public.a (id uuid);
      alter table public.a enable row level security;
      create policy "read_a" on public.a for select using (true);
      create policy "write_a" on public.a for insert with check (true);
    `);
    expect(facts.policies.get("a")).toEqual(["read_a", "write_a"]);
  });
});
