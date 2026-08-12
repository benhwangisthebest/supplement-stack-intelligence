#!/usr/bin/env node
// verify:migrations — is the migration set COHERENT?
// Phase 2 U15, the executable half of the reworded Phase 2 exit criterion.
//
// WHAT IT DOES. Applies `supabase/ci/auth-prelude.sql` (a labelled TEST DOUBLE
// for Supabase's `auth` schema — read its header) and then every file in
// `supabase/migrations/` IN ORDER to a throwaway database on a real Postgres,
// failing on the first error. Then it interrogates the resulting CATALOG.
//
// WHY A SCRIPT AND NOT A TEST, same reasoning as `verify:rendering` (U28): this
// needs a live Postgres, and `vitest run` must stay runnable on a laptop with
// no database. `src/architecture/migration-tooling.test.ts` holds the
// order-safe, database-free half.
//
// ---------------------------------------------------------------------------
// THE CATALOG ASSERTIONS ARE THE POINT, NOT A BONUS — and they close N-16.
// ---------------------------------------------------------------------------
// N-16 prescribed extending `rls-coverage.test.ts` with a COUNTER_TABLES rule.
// That guard's policy regex captures a policy's NAME and TABLE and discards the
// command clause, so closing it there means teaching a text parser to read
// `for all` — exactly the literal-matching fragility N-14's audit warns about.
//
// `pg_policies.cmd` is the EFFECTIVE command, computed by Postgres after every
// migration has been applied in order. It cannot be fooled by formatting, by a
// policy emitted from a `DO $$ … $$` block, or by a later migration widening an
// earlier policy — all three of which are invisible to text analysis.
//
// Mutation M7 is the demonstration: adding `create policy … for all` on
// `advisor_usage` turns THIS red while `rls-coverage.test.ts` stays GREEN. The
// prescribed fix would have been the weaker one.
//
// WHAT IT PROVES: the migration set applies cleanly and lands the intended
// protections, on a real Postgres.
// WHAT IT DOES NOT PROVE: that the DEPLOYED database matches. CI holds no
// credentials by design (P-03). That residue is a dated manual record —
// `docs/05-qa/2026-08-12-deployed-schema-record.md` — exactly as the criterion
// itself states.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = process.env.U15_MIGRATIONS_DIR ?? "supabase/migrations";
const PRELUDE = process.env.U15_PRELUDE ?? "supabase/ci/auth-prelude.sql";
const DB = "u15_coherence";

/**
 * Counter tables: rows a user must not be able to reset, because they exist to
 * CONSTRAIN that user. A user who can delete their own `advisor_usage` row
 * clears the daily token budget; one who can delete an `api_rate_limits` row
 * clears their rate limit. Both are therefore SELECT-only by design, with all
 * writes behind `SECURITY DEFINER` functions.
 *
 * A NAMED SET, not a derived one, because "this table constrains its own owner"
 * is a fact about intent that no SQL text reveals. The cost of a named set is
 * that a future counter table must be added here — so each entry is asserted to
 * EXIST and to CARRY at least one policy below. A guard whose easiest green is
 * "the table isn't there" is not a guard (U27, mutation M5).
 */
const COUNTER_TABLES = ["advisor_usage", "api_rate_limits"];

/** Commands that would let a row's owner alter or remove it. */
const WRITE_COMMANDS = ["ALL", "INSERT", "UPDATE", "DELETE"];

function psql(args, { db = DB } = {}) {
  // execFileSync THROWS on a non-zero exit. That is deliberate and is the whole
  // of this script's error handling: mutation M4 is "swallow the exit code",
  // and the only reliable way not to swallow it is never to catch it. A `psql`
  // that fails must take the process down with it.
  return execFileSync(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-q", "-d", db, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

/** One scalar back from the catalog, trimmed. */
function scalar(sql) {
  return psql(["-tA", "-c", sql]).trim();
}

function fail(message) {
  console.error(`verify:migrations — ${message}`);
  process.exit(1);
}

// --- 1. The file set -------------------------------------------------------
// Read from the DIRECTORY, never from a hardcoded list. A literal list is how a
// new `0010` gets silently skipped while the check still reports success — that
// is mutation M3, and the guard in migration-tooling.test.ts asserts no `.sql`
// filename is hardcoded in this file.
let migrations;
try {
  migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
} catch {
  fail(
    `${MIGRATIONS_DIR} could not be read.\n` +
      "This check applies the tracked migration set to a real Postgres; if the\n" +
      "directory is missing, that is a failure, not an excuse to pass.",
  );
}

if (migrations.length === 0) {
  // U27 M5's lesson at a second site: a check whose easiest green is "there was
  // nothing to check" is not a check.
  fail(
    `applied 0 migrations from ${MIGRATIONS_DIR}.\n` +
      "An empty set applies without error, which would make this script report\n" +
      "success while proving nothing at all.",
  );
}

// --- 2. Apply prelude, then every migration in order -----------------------
try {
  psql(["-c", `drop database if exists ${DB}`], { db: "postgres" });
  psql(["-c", `create database ${DB}`], { db: "postgres" });
} catch (error) {
  fail(
    `could not create the throwaway database "${DB}".\n` +
      "Is a Postgres reachable? This script reads the standard libpq\n" +
      "environment (PGHOST, PGPORT, PGUSER, PGPASSWORD) and does not start a\n" +
      `server for you.\n\n${error.stderr ?? error.message}`,
  );
}

try {
  psql(["-f", PRELUDE]);
} catch (error) {
  fail(`the auth prelude (${PRELUDE}) failed to apply.\n\n${error.stderr ?? error.message}`);
}

let applied = 0;
for (const file of migrations) {
  try {
    psql(["-f", join(MIGRATIONS_DIR, file)]);
    applied += 1;
  } catch (error) {
    fail(
      `MIGRATION SET IS NOT COHERENT — ${file} failed to apply.\n\n` +
        `${error.stderr ?? error.message}\n` +
        `Applied cleanly before it: ${applied} of ${migrations.length}.\n` +
        "Every earlier migration succeeded, so this is a fault in this file or\n" +
        "in an assumption it makes about the state the earlier ones left.",
    );
  }
}

if (applied !== migrations.length) {
  fail(`applied ${applied} of ${migrations.length} migrations without reporting an error.`);
}

// --- 3. Interrogate the catalog --------------------------------------------
const tables = Number(scalar("select count(*) from pg_tables where schemaname = 'public'"));
if (tables === 0) {
  fail("the migration set applied but created no tables in `public`.");
}

const unprotected = scalar(
  "select coalesce(string_agg(tablename, ', ' order by tablename), '') " +
    "from pg_tables where schemaname = 'public' and not rowsecurity",
);
if (unprotected !== "") {
  fail(
    `RLS IS OFF on: ${unprotected}.\n` +
      "§2.3 rule 12 — every table ships with RLS enabled and a matching policy.\n" +
      "`rls-coverage.test.ts` asserts this from the migration TEXT; this is the\n" +
      "same property decided by Postgres, and the two disagreeing means the text\n" +
      "analysis has a blind spot.",
  );
}

// N-16. The effective command, per Postgres, after the whole set is applied.
for (const table of COUNTER_TABLES) {
  const exists = scalar(
    `select count(*) from pg_tables where schemaname = 'public' and tablename = '${table}'`,
  );
  if (exists === "0") {
    fail(
      `counter table "${table}" does not exist after the migration set applied.\n` +
        "It is named in COUNTER_TABLES because it constrains its own owner. If it\n" +
        "was renamed or removed, update that list deliberately — this assertion\n" +
        "must not pass merely because its subject vanished.",
    );
  }

  const policies = scalar(
    `select count(*) from pg_policies where schemaname = 'public' and tablename = '${table}'`,
  );
  if (policies === "0") {
    fail(
      `counter table "${table}" has NO policy at all.\n` +
        "With RLS on and no policy, Postgres denies everything — the table is not\n" +
        "insecure, it is dead, and it fails at runtime rather than at deploy.",
    );
  }

  const widening = scalar(
    `select coalesce(string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname), '') ` +
      `from pg_policies where schemaname = 'public' and tablename = '${table}' ` +
      `and cmd in (${WRITE_COMMANDS.map((c) => `'${c}'`).join(", ")})`,
  );
  if (widening !== "") {
    fail(
      `COUNTER TABLE WIDENED — "${table}" carries a write policy: ${widening}.\n\n` +
        "This is finding N-16. A user who can write this table can reset the\n" +
        "limit it exists to impose: deleting an `advisor_usage` row clears the\n" +
        "daily token budget, and deleting an `api_rate_limits` row clears the\n" +
        "rate limit. Writes belong in `SECURITY DEFINER` functions, which is what\n" +
        "migration 0008 established and 0009 applied at birth.\n\n" +
        "NOTE FOR WHOEVER SEES THIS FAIL: `rls-coverage.test.ts` is very likely\n" +
        "still green. It reads the migration TEXT and its policy pattern discards\n" +
        "the command clause, so a widening policy is invisible to it. That is the\n" +
        "reason this assertion lives here against `pg_policies.cmd` instead.",
    );
  }
}

const definers = Number(
  scalar(
    "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace " +
      "where n.nspname = 'public' and p.prosecdef",
  ),
);
if (definers === 0) {
  fail(
    "no SECURITY DEFINER functions exist after the migration set applied.\n" +
      "The counter tables are SELECT-only precisely because their writes moved\n" +
      "into definer functions; zero of them means those writes have no route.",
  );
}

console.log(
  `verify:migrations — OK. ${applied} migrations applied in order to a real\n` +
    `  Postgres behind the auth test double. ${tables} tables, all with RLS;\n` +
    `  ${definers} SECURITY DEFINER functions; counter tables SELECT-only\n` +
    `  (${COUNTER_TABLES.join(", ")}).\n` +
    "  Proves the SET is coherent. Says nothing about the deployed database —\n" +
    "  that is the dated record in docs/05-qa/.",
);
