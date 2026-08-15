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

// --- 4. The deletion probe (Phase 2 U17) -----------------------------------
// EXECUTES what the FK text only describes. `0010_delete_user_data.sql` deletes
// nine tables explicitly and relies on CASCADE for three more; the migration's
// own comment warns that `advisor_actions.conversation_id` is ON DELETE SET
// NULL rather than cascade, which is exactly the kind of distinction a reader
// mis-scans. Reading FK definitions cannot tell you whether the deletion is
// COMPLETE. Running it can.
//
// This is only affordable because U15 already put a real Postgres in this step:
// it costs a few statements against a database that is being thrown away, and
// adds no CI step (so no GATE D1).
const PROBE_USER = "11111111-1111-1111-1111-111111111111";
const OWNED_TABLES = [
  "user_profiles", "stacks", "stack_items", "evaluation_flags", "lab_panels",
  "lab_markers", "advisor_conversations", "advisor_messages", "advisor_actions",
  "advisor_usage", "checkins", "side_effect_reports",
];

function seedOneRowPerTable() {
  psql([
    "-c",
    `
    insert into auth.users (id) values ('${PROBE_USER}');
    insert into public.user_profiles (user_id) values ('${PROBE_USER}');
    insert into public.stacks (id, user_id, name, intent)
      values ('22222222-2222-2222-2222-222222222222', '${PROBE_USER}', 'p', 'foundational');
    insert into public.stack_items (id, stack_id, dose, unit)
      values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1, 'mg');
    insert into public.evaluation_flags (stack_id, stack_item_id, severity, category, title, explanation, recommendation)
      values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'info', 'dose', 't', 'e', 'r');
    insert into public.lab_panels (user_id, collected_at) values ('${PROBE_USER}', current_date);
    insert into public.lab_markers (user_id, marker, value, unit) values ('${PROBE_USER}', 'tsh', 1.0, 'mIU/L');
    insert into public.advisor_conversations (id, user_id)
      values ('44444444-4444-4444-4444-444444444444', '${PROBE_USER}');
    insert into public.advisor_messages (conversation_id, role, content)
      values ('44444444-4444-4444-4444-444444444444', 'user', 'hello');
    insert into public.advisor_actions (user_id, conversation_id, action_type, payload, inverse)
      values ('${PROBE_USER}', '44444444-4444-4444-4444-444444444444', 'add_item', '{}', '{}');
    insert into public.advisor_usage (user_id, usage_date) values ('${PROBE_USER}', current_date);
    insert into public.checkins (user_id, checkin_date) values ('${PROBE_USER}', current_date);
    insert into public.side_effect_reports (user_id, report_date, effect_label)
      values ('${PROBE_USER}', current_date, 'nausea');
    `,
  ]);
}

/** Rows visible for the probe user, per table, as superuser (RLS bypassed). */
function remainingRows() {
  const parentOf = {
    stack_items: "stack_id in (select id from public.stacks where user_id = '" + PROBE_USER + "')",
    evaluation_flags: "stack_id in (select id from public.stacks where user_id = '" + PROBE_USER + "')",
    advisor_messages:
      "conversation_id in (select id from public.advisor_conversations where user_id = '" + PROBE_USER + "')",
  };
  const counts = {};
  for (const table of OWNED_TABLES) {
    const where = parentOf[table] ?? `user_id = '${PROBE_USER}'`;
    counts[table] = Number(scalar(`select count(*) from public.${table} where ${where}`));
  }
  return counts;
}

try {
  seedOneRowPerTable();
} catch (error) {
  fail(
    "the deletion probe could not seed its fixture — the schema and the probe have diverged.\n\n" +
      `${error.stderr ?? error.message}`,
  );
}

const seeded = remainingRows();
const unseeded = Object.entries(seeded).filter(([, n]) => n === 0).map(([t]) => t);
if (unseeded.length > 0) {
  // Anti-vacuity: "all twelve are empty afterwards" is trivially true of a table
  // that was never populated.
  fail(`the deletion probe seeded no row into: ${unseeded.join(", ")}.`);
}

try {
  psql([
    "-c",
    `begin;
     set local role authenticated;
     set local request.jwt.claims = '{"sub":"${PROBE_USER}"}';
     select public.delete_all_user_data();
     commit;`,
  ]);
} catch (error) {
  fail(`delete_all_user_data() failed when called as the owning user.\n\n${error.stderr ?? error.message}`);
}

const survivors = Object.entries(remainingRows()).filter(([, n]) => n > 0);
if (survivors.length > 0) {
  fail(
    `DELETION IS INCOMPLETE — ${survivors.length} of ${OWNED_TABLES.length} tables still hold the user's rows:\n` +
      survivors.map(([t, n]) => `    ${t}: ${n} row(s)`).join("\n") +
      "\n\nEvery one of the twelve user-owned tables must be empty after\n" +
      "`delete_all_user_data()`. A table left behind here is data a user asked to\n" +
      "have deleted and was told was deleted.\n\n" +
      "If the survivor is `advisor_usage`: it is SELECT-only for the end user\n" +
      "(migration 0008), so it can ONLY be removed from inside this definer\n" +
      "function — that is the entire reason the function exists.\n" +
      "If it is stack_items / evaluation_flags / advisor_messages: those also have\n" +
      "a CASCADE from their parent, so losing both routes at once means the\n" +
      "explicit delete AND the foreign key changed.",
  );
}

// The cascades, proven separately from the function — the function currently
// deletes those three explicitly, so the cascade is a SAFETY NET whose failure
// the check above would not notice.
try {
  psql([
  "-c",
  `insert into auth.users (id) values ('55555555-5555-5555-5555-555555555555');
   insert into public.stacks (id, user_id, name, intent)
     values ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'c', 'foundational');
   insert into public.stack_items (id, stack_id, dose, unit)
     values ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 1, 'mg');
   insert into public.advisor_conversations (id, user_id)
     values ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555');
   insert into public.advisor_messages (conversation_id, role, content)
     values ('88888888-8888-8888-8888-888888888888', 'user', 'x');
   insert into public.advisor_actions (user_id, conversation_id, action_type, payload, inverse)
     values ('55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'add_item', '{}', '{}');
   delete from public.stacks where id = '66666666-6666-6666-6666-666666666666';
   delete from public.advisor_conversations where id = '88888888-8888-8888-8888-888888888888';`,
  ]);
} catch (error) {
  // A raw throw here still exits non-zero, but it prints a stack trace instead
  // of saying what broke — which this script's own standard forbids. The most
  // likely cause is the interesting one: if a CASCADE was removed, deleting the
  // parent raises a foreign-key violation rather than silently orphaning rows.
  fail(
    "the cascade probe could not delete a parent row.\n\n" +
      `${error.stderr ?? error.message}\n` +
      "If that is a FOREIGN KEY VIOLATION on stack_items or advisor_messages, a\n" +
      "cascade has been removed. Those tables have no `user_id` column, so the\n" +
      "cascade is their only ownership link: without it, a user's rows become\n" +
      "permanently unreachable AND undeletable — `delete_all_user_data` would fail\n" +
      "outright rather than leave them behind, which is at least loud.",
  );
}

const orphanItems = Number(
  scalar("select count(*) from public.stack_items where id = '77777777-7777-7777-7777-777777777777'"),
);
const orphanMessages = Number(
  scalar("select count(*) from public.advisor_messages where conversation_id = '88888888-8888-8888-8888-888888888888'"),
);
if (orphanItems > 0 || orphanMessages > 0) {
  fail(
    `A CASCADE IS MISSING — deleting a parent left children behind ` +
      `(stack_items: ${orphanItems}, advisor_messages: ${orphanMessages}).\n` +
      "Those two tables have no `user_id` column, so a cascade is their only\n" +
      "ownership link. Without it, deleting a user's stacks would strand their\n" +
      "items permanently unreachable and undeletable.",
  );
}

// CROSS-USER ISOLATION — the assertion that matters most, and the only place it
// CAN be made. `delete_all_user_data()` takes no arguments and derives its owner
// from `auth.uid()`, so there is no TypeScript-level "wrong user id" mutation to
// write: passing one would be ignored, and the probe would pass vacuously. That
// is Phase 1 §6.2.2's lesson recurring one level down — the protection lives in
// SQL, so the proof must too.
//
// User 5555 still has rows at this point (its stack and conversation were
// deleted just above, but its advisor_actions row survives by SET NULL). Delete
// as a THIRD user and assert 5555 is untouched.
try {
  psql([
  "-c",
  `insert into auth.users (id) values ('99999999-9999-9999-9999-999999999999');
   insert into public.checkins (user_id, checkin_date)
     values ('99999999-9999-9999-9999-999999999999', current_date);
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
   select public.delete_all_user_data();
   commit;`,
  ]);
} catch (error) {
  fail(`the cross-user isolation probe could not run.\n\n${error.stderr ?? error.message}`);
}

const victimRows = Number(
  scalar("select count(*) from public.advisor_actions where user_id = '55555555-5555-5555-5555-555555555555'"),
);
if (victimRows !== 1) {
  fail(
    "CROSS-USER DELETION — calling `delete_all_user_data()` as one user removed ANOTHER\n" +
      `user's rows (advisor_actions for 5555…: expected 1, found ${victimRows}).\n\n` +
      "This is the catastrophic failure mode of a SECURITY DEFINER delete: the function\n" +
      "runs with the definer's privileges and bypasses RLS, so the ONLY thing scoping it\n" +
      "is `auth.uid()` inside the body. If the function ever takes a user id as a\n" +
      "parameter, any authenticated caller can erase any account.",
  );
}
const deleterRows = Number(
  scalar("select count(*) from public.checkins where user_id = '99999999-9999-9999-9999-999999999999'"),
);
if (deleterRows !== 0) {
  fail("the cross-user probe's own caller was not deleted — the probe proves nothing.");
}

// And the one that is NOT a cascade, asserted so the difference stays true.
const survivingActions = Number(
  scalar("select count(*) from public.advisor_actions where user_id = '55555555-5555-5555-5555-555555555555'"),
);
if (survivingActions !== 1) {
  fail(
    "advisor_actions.conversation_id is ON DELETE SET NULL, not CASCADE, so deleting a\n" +
      `conversation must LEAVE the action in place — expected 1 row, found ${survivingActions}.\n` +
      "If this became a cascade, `delete_all_user_data`'s explicit delete of\n" +
      "advisor_actions would still be correct, but the reverse change — dropping that\n" +
      "explicit delete because 'conversations cascade' — would silently orphan rows.",
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
