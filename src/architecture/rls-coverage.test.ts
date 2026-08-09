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
//   * [CLOSED by Phase 2 U3 — FU-5.] It now DOES model `drop policy`,
//     `alter policy`, and `disable row level security`, because 0008 is the
//     first migration to use one and FU-5's deferral condition — "no migration
//     does any of these today" — fired. Policies are applied in migration order,
//     so a drop REMOVES the policy from the effective set and the "RLS enabled
//     but no policy" rule below is computed on what survives, not on everything
//     ever written. Every such event must additionally appear in
//     DECLARED_WEAKENINGS with a written reason (see below); an undeclared one
//     fails even when it is harmless, because "harmless" is a judgement a text
//     scanner must not make on its own.
//     What it still does NOT do: judge whether an `alter policy`'s new
//     expression is weaker than the old one. That is SQL semantics, not text.
//     The register makes the event VISIBLE and forces a human sentence about
//     it; it does not evaluate the sentence.
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

/** A statement that removes or rewrites protection an earlier migration added. */
export interface Weakening {
  kind: "drop policy" | "alter policy" | "disable rls";
  table: string;
  /** Policy name, or "" for a table-level `disable row level security`. */
  policy: string;
  file: string;
}

export interface MigrationFacts {
  /** table name → the migration that created it */
  createdTables: Map<string, string>;
  /** tables with RLS enabled and not later disabled */
  rlsEnabled: Set<string>;
  /**
   * table name → policy names IN EFFECT after every migration is applied in
   * order. A policy created in 0003 and dropped in 0008 is absent here — which
   * is the whole of FU-5.
   */
  policies: Map<string, string[]>;
  /** Every drop/alter/disable seen, in migration order. */
  weakenings: Weakening[];
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
  const weakenings: Weakening[] = [];

  const CREATE = /create table (?:if not exists )?(?:public\.)?([a-z0-9_]+)/gi;
  const ENABLE = /alter table (?:public\.)?([a-z0-9_]+) enable row level security/gi;
  const DISABLE = /alter table (?:public\.)?([a-z0-9_]+) disable row level security/gi;
  const POLICY = /create policy "([^"]+)" on (?:public\.)?([a-z0-9_]+)/gi;
  const DROP_POLICY = /drop policy (?:if exists )?"([^"]+)" on (?:public\.)?([a-z0-9_]+)/gi;
  const ALTER_POLICY = /alter policy "([^"]+)" on (?:public\.)?([a-z0-9_]+)/gi;

  /**
   * Statements are applied in FILE order, and within a file in the order they
   * appear. That ordering is the point: `drop policy "p"` followed by `create
   * policy "p"` in the same file is a replacement and must end with the policy
   * present, while the reverse order leaves the table bare. A set-union parser
   * cannot tell those apart — the old one could not.
   */
  const applyInOrder = (file: string, text: string) => {
    interface Event { at: number; run: () => void }
    const events: Event[] = [];
    const push = (re: RegExp, run: (m: RegExpMatchArray) => void) => {
      for (const m of text.matchAll(re)) {
        events.push({ at: m.index ?? 0, run: () => run(m) });
      }
    };

    push(CREATE, (m) => {
      if (!createdTables.has(m[1])) createdTables.set(m[1], file);
    });
    push(ENABLE, (m) => rlsEnabled.add(m[1]));
    push(DISABLE, (m) => {
      rlsEnabled.delete(m[1]);
      weakenings.push({ kind: "disable rls", table: m[1], policy: "", file });
    });
    push(POLICY, (m) => {
      const list = policies.get(m[2]) ?? [];
      if (!list.includes(m[1])) list.push(m[1]);
      policies.set(m[2], list);
    });
    push(DROP_POLICY, (m) => {
      const list = (policies.get(m[2]) ?? []).filter((name) => name !== m[1]);
      policies.set(m[2], list);
      weakenings.push({ kind: "drop policy", table: m[2], policy: m[1], file });
    });
    push(ALTER_POLICY, (m) =>
      weakenings.push({ kind: "alter policy", table: m[2], policy: m[1], file }),
    );

    for (const e of events.sort((a, b) => a.at - b.at)) e.run();
  };

  for (const { file, sql } of sources) applyInOrder(file, normalize(sql));

  return { createdTables, rlsEnabled, policies, weakenings };
}

/**
 * THE WEAKENING REGISTER (Phase 2 U3, closing FU-5).
 *
 * Every `drop policy`, `alter policy`, or `disable row level security` in the
 * tracked migration set must appear here with a reason. This is a ratchet, not
 * an allowlist of forgiveness: the assertion is an EQUALITY, so an entry whose
 * statement is later removed fails just as loudly as an undeclared statement.
 *
 * Why a register rather than a rule that judges the SQL: whether a rewritten
 * policy is weaker than the one it replaced is a question about Postgres row
 * security semantics, and this file is a text scanner. What it can do — and
 * what nothing did before U3 — is make the event impossible to land silently.
 */
const DECLARED_WEAKENINGS: Readonly<Record<string, string>> = {
  'drop policy own_advisor_usage on advisor_usage (supabase/migrations/0008_usage_ledger_policy.sql)':
    "Phase 2 U3. The dropped policy was `for all using (user_id = auth.uid())`, which includes DELETE — so a user could delete their own row in `advisor_usage` and reset the daily token budget that exists to constrain them. REPLACED IN THE SAME MIGRATION by `read_own_advisor_usage` (SELECT only); writes move to two SECURITY DEFINER functions. This is a NARROWING, and it is the only weakening-shaped statement in the repository.",
};

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

  it("declares every policy drop, alter, or RLS disable — and no more (FU-5)", () => {
    // The gap FU-5 named: before U3 this guard unioned every `create policy`
    // ever written and never looked for their removal, so a later migration
    // dropping one left the guard green and the table bare. 0008 is the first
    // migration to contain such a statement, which is exactly the condition
    // FU-5's deferral was waiting on.
    const seen = FACTS.weakenings
      .map((w) => `${w.kind} ${w.policy || "-"} on ${w.table} (${w.file})`)
      .sort();
    const declared = Object.keys(DECLARED_WEAKENINGS).sort();

    expect(
      seen,
      "RLS_COVERAGE: the set of protection-removing statements does not match the\n" +
        "register in this file.\n\n" +
        "An EXTRA line below means a migration drops, alters, or disables RLS protection\n" +
        "without a written reason. Add an entry to DECLARED_WEAKENINGS saying what the old\n" +
        "policy allowed, what replaces it, and why the replacement is not weaker.\n\n" +
        "A MISSING line means a declared statement is gone: delete its entry, or the\n" +
        "register is claiming a protection change that no longer happens.\n\n" +
        `  seen:     ${JSON.stringify(seen, null, 2)}\n` +
        `  declared: ${JSON.stringify(declared, null, 2)}`,
    ).toEqual(declared);
  });

  it("leaves no table RLS-enabled with every policy dropped", () => {
    // The consequence rule. `every RLS-enabled table has at least one policy`
    // above now runs on the EFFECTIVE set, so an unreplaced drop already fails
    // it — this asserts the same property against the drops specifically, so
    // the failure message names the migration that did it rather than only the
    // table.
    const stranded = FACTS.weakenings
      .filter((w) => w.kind === "drop policy")
      .filter((w) => (FACTS.policies.get(w.table) ?? []).length === 0)
      .map((w) => `${w.table}: "${w.policy}" dropped in ${w.file}, nothing replaced it`);

    expect(
      stranded,
      "RLS_COVERAGE: a migration dropped a policy and left the table with none.\n" +
        "Under RLS that is not a loosening — it is a total denial, so the table becomes\n" +
        "unreadable and unwritable through the anon key, and the failure shows up at\n" +
        "runtime rather than here. Drop and replace in the SAME migration:\n  " +
        stranded.join("\n  "),
    ).toEqual([]);
  });

  it("never disables row level security on a table", () => {
    const disabled = FACTS.weakenings.filter((w) => w.kind === "disable rls").map((w) => `${w.table} (${w.file})`);
    expect(
      disabled,
      "RLS_COVERAGE: `disable row level security` removes the only barrier between one\n" +
        "user's rows and every other user. There is no reason this repository would need\n" +
        "it, and CLAUDE.md §2.3 rule 12 forbids the state it produces:\n  " +
        disabled.join("\n  "),
    ).toEqual([]);
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

  it("removes a dropped policy from the effective set", () => {
    // FU-5's core case. Before U3 the parser unioned every `create policy` and
    // never saw the drop, so this returned ["own_a"] and the table read as
    // covered while Postgres had no policy on it at all.
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: `create table public.a (id uuid); alter table public.a enable row level security; create policy "own_a" on public.a for all using (true);` },
      { file: "0002.sql", sql: `drop policy if exists "own_a" on public.a;` },
    ]);
    expect(facts.policies.get("a")).toEqual([]);
    expect(facts.weakenings).toEqual([
      { kind: "drop policy", table: "a", policy: "own_a", file: "0002.sql" },
    ]);
  });

  it("keeps the policy when a drop is replaced in the same migration", () => {
    // The 0008 shape. Order within the file decides the answer, which is why
    // the parser sorts events by position instead of applying them by kind.
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: `create table public.a (id uuid); alter table public.a enable row level security; create policy "own_a" on public.a for all using (true);` },
      { file: "0002.sql", sql: `drop policy if exists "own_a" on public.a; create policy "read_a" on public.a for select using (true);` },
    ]);
    expect(facts.policies.get("a")).toEqual(["read_a"]);
  });

  it("respects statement ORDER — a create then a drop leaves nothing", () => {
    // The inverse of the test above, and the one that catches a parser applying
    // creates before drops regardless of where they appear.
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: `create table public.a (id uuid);` },
      { file: "0002.sql", sql: `create policy "read_a" on public.a for select using (true); drop policy "read_a" on public.a;` },
    ]);
    expect(facts.policies.get("a")).toEqual([]);
  });

  it("detects `disable row level security` and un-enables the table", () => {
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: `create table public.a (id uuid); alter table public.a enable row level security;` },
      { file: "0002.sql", sql: `alter table public.a disable row level security;` },
    ]);
    expect(facts.rlsEnabled.has("a")).toBe(false);
    expect(facts.weakenings.map((w) => w.kind)).toEqual(["disable rls"]);
  });

  it("records an `alter policy` as a weakening event without judging it", () => {
    const facts = readMigrationFacts([
      { file: "0001.sql", sql: `create table public.a (id uuid); create policy "own_a" on public.a for all using (user_id = auth.uid());` },
      { file: "0002.sql", sql: `alter policy "own_a" on public.a using (true);` },
    ]);
    // The policy is still in effect — an alter does not remove it. What the
    // guard provides is that the rewrite cannot land unmentioned.
    expect(facts.policies.get("a")).toEqual(["own_a"]);
    expect(facts.weakenings).toEqual([
      { kind: "alter policy", table: "a", policy: "own_a", file: "0002.sql" },
    ]);
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
