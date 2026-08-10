// REPO_SCOPING — persistence modules must bind the owner (Phase 2 U10).
//
// ===========================================================================
// WHAT THIS ENFORCES, AND WHY IT IS PHRASED OVER TABLES
// ===========================================================================
// U9 pinned, function by function, that every repository binds the owner to the
// rows it touches. Those pins are behavioural: they catch a regression in a
// function that HAS a test. This guard is the mechanical half — it catches the
// function nobody wrote a test for, including the one written next year.
//
// The obvious phrasing is the one GATE C1 uses: "every module taking a `userId`
// applies it". U9 found why that phrasing is not enough. `advisor_actions` has
// a `user_id` column, and `getAction(supabase, id)` and `markUndone(supabase,
// id)` take no owner at all — so a rule quantified over functions that ACCEPT an
// owner cannot see them, and the cheapest way to satisfy such a rule is to
// delete the parameter it protects. A guard whose easiest green is "remove the
// thing being checked" is not a guard.
//
// So the rule here is quantified over TABLES instead:
//
//   For every function that touches a table carrying a `user_id` column,
//   the owner must reach the query — as `.eq("user_id", …)` on a read,
//   update or delete, or as a `user_id:` field in the written payload.
//
// The set of user-owned tables is DERIVED from the migrations, not listed, so a
// new table with a `user_id` column is governed the day it is created rather
// than the day someone remembers to add it here.
//
// ===========================================================================
// THIS IS NOT A REPLACEMENT FOR RLS, NOR RLS FOR IT
// ===========================================================================
// Every one of these tables has a row-level policy, so the database refuses
// cross-user access whether or not the application asks correctly. The reason
// the application-side clause is required anyway is that RLS is the last line
// and not the only one: `SECURITY DEFINER` functions bypass it by construction
// (0008 added two), the seed path runs under the service-role key which bypasses
// it entirely, and a policy is one migration away from being widened — the
// ledger's over-broad `for all` shipped in 0003 and survived until 0008.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

function tracked(pathspec: string, keep: (f: string) => boolean, label: string): string[] {
  const stdout = execFileSync(
    "git",
    ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", pathspec],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
  );
  const files = stdout.split("\0").filter((p) => p.length > 0 && keep(p));
  if (files.length === 0) {
    throw new Error(
      `REPO_SCOPING: the ${label} inventory is EMPTY. A rule that scans nothing ` +
        `passes vacuously, so this is a hard failure rather than a green run.`,
    );
  }
  return files.sort();
}

// ---------------------------------------------------------------------------
// 1. Which tables are user-owned? Derived from the migrations.
// ---------------------------------------------------------------------------

/** Table name → true when the CREATE TABLE declares a `user_id` column. */
export function readUserOwnedTables(sql: string): Set<string> {
  const withoutComments = sql.replace(/--[^\n]*/g, " ");
  const owned = new Set<string>();
  const CREATE = /create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\);/gi;
  for (const m of withoutComments.matchAll(CREATE)) {
    if (/^\s*user_id\b/m.test(m[2])) owned.add(m[1]);
  }
  return owned;
}

const MIGRATIONS = tracked("supabase/migrations", (p) => p.endsWith(".sql"), "migration");
const MIGRATION_SQL = MIGRATIONS.map((f) => readFileSync(join(REPO_ROOT, f), "utf8")).join("\n");
const USER_OWNED_TABLES = readUserOwnedTables(MIGRATION_SQL);

/** Every table created by a migration, owned or not. Used by the exemption check. */
export function readAllTables(sql: string): Set<string> {
  const withoutComments = sql.replace(/--[^\n]*/g, " ");
  const all = new Set<string>();
  for (const m of withoutComments.matchAll(
    /create table (?:if not exists )?(?:public\.)?(\w+)/gi,
  )) {
    all.add(m[1]);
  }
  return all;
}
const ALL_TABLES = readAllTables(MIGRATION_SQL);

// ---------------------------------------------------------------------------
// 2. Which functions touch which tables, and do they bind the owner?
// ---------------------------------------------------------------------------

export interface FnFacts {
  name: string;
  tables: string[];
  /** `.eq("user_id", …)` appears in the body. */
  filtersOwner: boolean;
  /** A written payload carries a `user_id` field. */
  stampsOwner: boolean;
  /** The signature accepts a `userId`. Reported, not required — see the header. */
  takesUserId: boolean;
}

/**
 * Extract one fact row per exported function.
 *
 * Bodies are found by brace matching from the signature's opening `{`. That is
 * a parser, not a regex over the whole file, and the difference matters: a
 * file-level scan would credit one function's `.eq("user_id", …)` to every other
 * function in the same module, which is precisely the false green this guard
 * exists to avoid. The self-tests below drive this on synthetic source.
 */
export function readFunctionFacts(source: string): FnFacts[] {
  const out: FnFacts[] = [];
  const SIG = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g;
  for (const m of source.matchAll(SIG)) {
    const name = m[1];
    // Walk from the end of the signature to the body's opening brace.
    let i = m.index! + m[0].length;
    let depth = 1; // we are inside the parameter list
    while (i < source.length && depth > 0) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
      i++;
    }
    const params = source.slice(m.index! + m[0].length, i - 1);
    const open = source.indexOf("{", i);
    if (open === -1) continue;
    let braces = 0;
    let j = open;
    for (; j < source.length; j++) {
      if (source[j] === "{") braces++;
      else if (source[j] === "}") {
        braces--;
        if (braces === 0) break;
      }
    }
    const body = source.slice(open, j + 1);
    const tables = [...body.matchAll(/\.from\(\s*"(\w+)"\s*\)/g)].map((t) => t[1]);
    out.push({
      name,
      tables: [...new Set(tables)],
      filtersOwner: /\.eq\(\s*"user_id"\s*,/.test(body),
      stampsOwner: /\buser_id\s*:/.test(body),
      takesUserId: /\buserId\s*:/.test(params),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. The registers
// ---------------------------------------------------------------------------

/**
 * Tables exempt because they have NO `user_id` column: ownership is derived
 * from a parent row, and there is no column for a repository to filter on.
 *
 * GATE C1 sizes this list at three and requires each entry to name a table with
 * no `user_id` column in the migrations — both asserted below, against the
 * migrations rather than against this comment.
 */
const EXEMPT_TABLES: Record<string, string> = {
  stack_items:
    "Owned through `stacks`. The 0001 policy is an `exists (select 1 from stacks s where " +
    "s.id = stack_items.stack_id and s.user_id = auth.uid())`, and the repository's substitute " +
    "— every function scoped to `stack_id` — is pinned in stack-item-repo.test.ts.",
  evaluation_flags:
    "Owned through `stacks`, same policy shape. Scoped by `stack_id`; see evaluation-flag-repo.test.ts.",
  advisor_messages:
    "Owned through `advisor_conversations`. Scoped by `conversation_id`; the route establishes " +
    "ownership first via `conversationBelongsToUser` (Phase 1 U21).",
};

/**
 * Modules exempt as a whole, with the reason each is not a request-path repo.
 */
const EXEMPT_MODULES: Record<string, string> = {
  "src/lib/db/seed.ts":
    "The development seed script. It runs under the service-role key by design (§2.3 rule 14), " +
    "has no `auth.uid()` to scope to, and is never reachable from `src/app`.",
};

/**
 * THE RATCHET — functions that touch a user-owned table today without binding
 * the owner, relying on RLS alone.
 *
 * This is the Phase 1 U18 shape: every entry is asserted to STILL violate, and
 * the register is compared as an EQUALITY, so the list can only shrink. A fourth
 * unscoped function is a red build; fixing one of these without removing its row
 * is also a red build, which is what stops the register outliving the problem.
 *
 * None of these is a live defect: each is reached from a route that has already
 * established the caller's identity, and RLS refuses the row regardless. They
 * are here because "protected by one mechanism" and "protected by the mechanism
 * this codebase claims to apply" are different statements, and because each is
 * one `SECURITY DEFINER` refactor away from having no protection at all.
 */
const UNSCOPED_FUNCTIONS: Record<string, string> = {
  "src/lib/db/advisor-action-repo.ts::getAction":
    "Reads `advisor_actions` by primary key with no owner clause. Fixing it means adding a " +
    "`userId` parameter and updating callers — a signature change U9/U10 did not own.",
  "src/lib/db/advisor-action-repo.ts::markUndone":
    "Updates `advisor_actions` by primary key with no owner clause. Same remedy as `getAction`, " +
    "and the higher-stakes of the two: it is a write.",
  "src/lib/db/advisor-action-repo.ts::getActionsByBatch":
    "Reads `advisor_actions` by `batch_id`. The batch id is generated per user action and is not " +
    "guessable, but that is obscurity, not scoping.",
  "src/lib/advisor/repo.ts::appendMessages":
    "Bumps `advisor_conversations.updated_at` by conversation id with no owner clause. The route " +
    "checks ownership first (`conversationBelongsToUser`), so this is a check-then-act pair whose " +
    "gap only RLS closes.",
};

const PERSISTENCE_MODULES = tracked(
  "src/lib",
  (p) => p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.includes("/__testing__/"),
  "library module",
).filter((p) => {
  const src = readFileSync(join(REPO_ROOT, p), "utf8");
  return /\.from\(\s*"\w+"\s*\)/.test(src);
});

interface Violation {
  key: string;
  table: string;
  takesUserId: boolean;
}

function findViolations(): Violation[] {
  const found: Violation[] = [];
  for (const file of PERSISTENCE_MODULES) {
    if (file in EXEMPT_MODULES) continue;
    const source = readFileSync(join(REPO_ROOT, file), "utf8");
    for (const fn of readFunctionFacts(source)) {
      if (fn.filtersOwner || fn.stampsOwner) continue;
      for (const table of fn.tables) {
        if (!USER_OWNED_TABLES.has(table)) continue;
        if (table in EXEMPT_TABLES) continue;
        found.push({ key: `${file}::${fn.name}`, table, takesUserId: fn.takesUserId });
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// 4. The rules
// ---------------------------------------------------------------------------

describe("REPO_SCOPING: every persistence function binds the owner", () => {
  it("scans a non-empty set of persistence modules", () => {
    // Anti-vacuity. `PERSISTENCE_MODULES` is filtered by content, so a refactor
    // that renamed `.from(` would silently empty it and turn this file green.
    expect(PERSISTENCE_MODULES.length).toBeGreaterThanOrEqual(10);
    expect(PERSISTENCE_MODULES).toContain("src/lib/db/stack-repo.ts");
  });

  it("derives a non-empty set of user-owned tables from the migrations", () => {
    expect(USER_OWNED_TABLES.size).toBeGreaterThanOrEqual(8);
    expect([...USER_OWNED_TABLES]).toContain("stacks");
  });

  it("reports no unscoped access to a user-owned table outside the ratchet", () => {
    const unexpected = findViolations()
      .filter((v) => !(v.key in UNSCOPED_FUNCTIONS))
      .map(
        (v) =>
          `${v.key} touches "${v.table}" (a user-owned table) without binding the owner — ` +
          `${v.takesUserId ? "it takes a `userId` and never applies it" : "it takes no owner at all"}`,
      );
    expect(unexpected).toEqual([]);
  });
});

describe("REPO_SCOPING: the exemption list is exactly GATE C1's three, and earns it", () => {
  it("names exactly three tables", () => {
    expect(Object.keys(EXEMPT_TABLES).sort()).toEqual([
      "advisor_messages",
      "evaluation_flags",
      "stack_items",
    ]);
  });

  it("each exempt table EXISTS and has no user_id column, per the migrations", () => {
    // Checked against the schema, not against the comment beside it. An exempt
    // table that gained a `user_id` column would stop deserving the exemption,
    // and this is what notices.
    for (const table of Object.keys(EXEMPT_TABLES)) {
      expect(ALL_TABLES, `${table} is not created by any migration`).toContain(table);
      expect(
        USER_OWNED_TABLES.has(table),
        `${table} now has a user_id column, so it can no longer be exempt`,
      ).toBe(false);
    }
  });

  it("each exemption carries a written reason", () => {
    for (const [table, reason] of Object.entries(EXEMPT_TABLES)) {
      expect(reason.length, `${table} has no written reason`).toBeGreaterThan(60);
    }
    for (const [mod, reason] of Object.entries(EXEMPT_MODULES)) {
      expect(reason.length, `${mod} has no written reason`).toBeGreaterThan(60);
    }
  });
});

describe("REPO_SCOPING: the ratchet can only shrink", () => {
  it("every registered function STILL violates — a fixed one must be removed", () => {
    // The U18 property, as an equality rather than a subset check. A register
    // whose entries stopped being true would quietly become an allowlist for
    // code that no longer needs it.
    const actual = findViolations().map((v) => v.key);
    expect([...new Set(actual)].sort()).toEqual(Object.keys(UNSCOPED_FUNCTIONS).sort());
  });

  it("every registered function carries a reason and a remedy", () => {
    for (const [key, reason] of Object.entries(UNSCOPED_FUNCTIONS)) {
      expect(reason.length, `${key} has no written reason`).toBeGreaterThan(60);
    }
  });

  it("the ratchet is the only thing standing between here and GATE C1", () => {
    // Stated as an assertion so the count cannot drift out of the report: four
    // functions, all reached from routes that have already authenticated.
    expect(Object.keys(UNSCOPED_FUNCTIONS)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 5. Anti-rot — the detector's own logic, driven on synthetic source
// ---------------------------------------------------------------------------

describe("REPO_SCOPING self-tests: break the detector and these go red", () => {
  const OWNED = `create table public.things (\n  id uuid,\n  user_id uuid not null\n);`;
  const CHILD = `create table public.bits (\n  id uuid,\n  thing_id uuid not null\n);`;

  it("reads user_id ownership from a CREATE TABLE", () => {
    expect([...readUserOwnedTables(`${OWNED}\n${CHILD}`)]).toEqual(["things"]);
  });

  it("is not fooled by a user_id mentioned only in a comment", () => {
    const sql = `create table public.bits (\n  -- no user_id here on purpose\n  id uuid\n);`;
    expect(readUserOwnedTables(sql).has("bits")).toBe(false);
  });

  it("does not credit one function's owner clause to its neighbour", () => {
    // THE self-test. A file-level regex would mark both functions scoped,
    // which is the false green that would make this whole guard decorative.
    const src = `
      export async function scoped(supabase: X, userId: string) {
        return supabase.from("things").select("*").eq("user_id", userId);
      }
      export async function unscoped(supabase: X, id: string) {
        return supabase.from("things").select("*").eq("id", id);
      }
    `;
    const facts = readFunctionFacts(src);
    expect(facts.map((f) => f.name)).toEqual(["scoped", "unscoped"]);
    expect(facts[0].filtersOwner).toBe(true);
    expect(facts[1].filtersOwner).toBe(false);
  });

  it("counts a written user_id payload as binding the owner", () => {
    const src = `
      export async function creates(supabase: X, userId: string) {
        return supabase.from("things").insert({ user_id: userId, name: "x" });
      }
    `;
    const [fn] = readFunctionFacts(src);
    expect(fn.stampsOwner).toBe(true);
    expect(fn.filtersOwner).toBe(false);
  });

  it("records every table a function touches, not just the first", () => {
    const src = `
      export async function two(supabase: X) {
        await supabase.from("things").insert({});
        return supabase.from("bits").insert({});
      }
    `;
    expect(readFunctionFacts(src)[0].tables).toEqual(["things", "bits"]);
  });

  it("survives a nested brace in the body without swallowing the next function", () => {
    const src = `
      export async function first(supabase: X) {
        const shape = { a: { b: 1 } };
        return supabase.from("things").insert(shape);
      }
      export async function second(supabase: X, userId: string) {
        return supabase.from("bits").select("*").eq("user_id", userId);
      }
    `;
    const facts = readFunctionFacts(src);
    expect(facts.map((f) => f.name)).toEqual(["first", "second"]);
    expect(facts[0].filtersOwner).toBe(false);
    expect(facts[1].filtersOwner).toBe(true);
  });

  it("sees a userId in a multi-line parameter list", () => {
    const src = `
      export async function wide(
        supabase: SupabaseClient,
        userId: string,
        id: string,
      ): Promise<void> {
        await supabase.from("things").delete().eq("id", id);
      }
    `;
    const [fn] = readFunctionFacts(src);
    expect(fn.takesUserId).toBe(true);
    expect(fn.filtersOwner).toBe(false);
  });

  it("flags exactly the synthetic function that takes an owner and drops it", () => {
    // End to end on synthetic input: parse, classify, and report.
    const owned = readUserOwnedTables(OWNED);
    const facts = readFunctionFacts(`
      export async function bad(supabase: X, userId: string) {
        return supabase.from("things").select("*").eq("id", "x");
      }
    `);
    const flagged = facts.filter(
      (f) => !f.filtersOwner && !f.stampsOwner && f.tables.some((t) => owned.has(t)),
    );
    expect(flagged.map((f) => f.name)).toEqual(["bad"]);
  });
});
