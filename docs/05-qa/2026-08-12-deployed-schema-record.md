# Deployed-schema record — 2026-08-12 (Phase 2 U15)

**STATUS: PROCEDURE WRITTEN, NOT YET RUN. Awaiting the owner's sitting.**
U15's closeout waits on this record being completed, the same way U27's closeout waited on the
middleware-activation smoke. Everything else in U15 is built, mutated, and CI-verified without it.

Where the Phase 2 exit criterion points: *"matching the **live** database remains a **dated manual
record**, exactly like the live-E2E baseline"* (`docs/roadmap.md`, criterion reworded 2026-08-08 under plan
§7 decision 5). This is that record.

| | |
|---|---|
| **Date** | *(fill in at run)* |
| **Run by** | repository owner |
| **Instance** | deployed Supabase |
| **Repo state** | `main` @ *(fill in)* |
| **Migrations in the set** | `0001` … `0009` (9 files) |

**Redaction posture, per the house pattern.** The project ref, any connection string, and any user UUID are
redacted to `<PROJECT_REF>` / `<UUID>` before anything is pasted here. **Every statement below is
read-only** — no `create`, no `alter`, no `drop`, no `insert`. Nothing in this procedure changes the
deployed database, so there is no rollback to plan for and no transaction to abort. Paste output verbatim
apart from redaction; do not summarise a result you did not read.

---

## 0. Operator prerequisite for `db:migrate` — and why no `config.toml` is checked in

`npm run db:migrate` runs `supabase db push`. It needs the **Supabase CLI installed** and the project
**linked** (`supabase link --project-ref <PROJECT_REF>`), which is what generates `supabase/config.toml`
and the CLI's local state.

**U15's plan listed `supabase/config.toml` as a new file and it was NOT created.** The CLI is not installed
on the machine this unit was built on, so any `config.toml` written here would be a hand-authored
approximation of a CLI-version-specific schema that nothing available could validate — authoring an
unverifiable structure, which is what §2.2 rule 8 forbids. A wrong config that *looks* official is worse
than none: it would be edited rather than regenerated. **The correct file is the one `supabase init` /
`supabase link` produces on the operator's machine**, and it can be committed then, by someone who can
verify it.

Nothing in CI depends on this: the coherence step uses `psql` against a service container and never invokes
the CLI.

---

## 1. Why this record exists — what CI cannot see

CI applies the migration set to a throwaway `postgres:16` behind
[`supabase/ci/auth-prelude.sql`](../../supabase/ci/auth-prelude.sql), a **labelled test double** for
Supabase's `auth` schema. That proves the set is *internally* coherent. It cannot prove two things, and
this record is where both are addressed:

1. **That the double resembles the real `auth` schema** in the four respects the migration set depends on.
   If it does not, CI has been proving coherence against a fiction — the N-26 instrument hazard.
2. **That the deployed database actually matches the migration set.** CI holds no credentials by design
   (P-03 — this repository is public), so no automated check can ever establish this.

The double is anchored to reality **once, on record** — not assumed to match forever. If the real `auth`
schema changes in a way that matters, this record is the artifact that goes stale visibly.

---

## 2. Prelude anchors — does the test double resemble the real thing?

Run in the Supabase SQL editor. Four questions, one statement each.

**2.1 — `auth.users` exists and its `id` is a `uuid`.** *(10 foreign keys in the migration set point here.)*

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'auth' and table_name = 'users' and column_name = 'id';
```

**Expected:** exactly one row — `id | uuid`.
**If it differs:** the double's `auth.users(id uuid primary key)` is wrong, every FK in the set is
questionable, and U15's CI step is measuring against the wrong shape. Stop and report.

**2.2 — `auth.uid()` exists and returns `uuid`.** *(43 policy clauses call it.)*

```sql
select p.proname, pg_get_function_result(p.oid) as returns
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'auth' and p.proname = 'uid';
```

**Expected:** one row — `uid | uuid`.

**2.3 — the three roles exist.** *(`0008` and `0009` grant execute to `authenticated`.)*

```sql
select rolname from pg_roles
where rolname in ('anon', 'authenticated', 'service_role')
order by rolname;
```

**Expected:** three rows — `anon`, `authenticated`, `service_role`.

**2.4 — how much of the real `auth.users` the double omits.** *Not a pass/fail; a measurement.*

```sql
select count(*) as real_column_count
from information_schema.columns
where table_schema = 'auth' and table_name = 'users';
```

**Expected:** a number well above 1 (the real table carries email, encrypted_password, confirmation
timestamps, metadata, and more). **Record it.** The double reproduces exactly one column, and the point of
writing the real figure down is that the *size of the simplification* is on record rather than implied.
This is only sound because no migration references any other column — which §3.4 re-checks from the
deployed side.

---

## 3. Deployed schema vs the migration set

**3.1 — table inventory.**

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
```

**Expected: exactly these 13**, matching what the migration set produced against `postgres:16` on
2026-08-12 — `advisor_actions`, `advisor_conversations`, `advisor_messages`, `advisor_usage`,
`api_rate_limits`, `checkins`, `evaluation_flags`, `lab_markers`, `lab_panels`, `side_effect_reports`,
`stack_items`, `stacks`, `user_profiles`.
**A table here that is not in that list means something was applied by hand and never written down** —
which is the practice roadmap item 6 exists to end. A missing one means a migration never reached
production.

**3.2 — RLS is on everywhere.**

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and not rowsecurity order by tablename;
```

**Expected: zero rows.** Any row is a live §2.3 rule-12 breach, not a documentation problem.

**3.3 — the counter tables are SELECT-only (finding N-16, live side).**

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('advisor_usage', 'api_rate_limits')
order by tablename, policyname;
```

**Expected:** exactly two rows, both `SELECT` — `read_own_advisor_usage`, `read_own_api_rate_limits`.
**Any `ALL`/`INSERT`/`UPDATE`/`DELETE` row means the deployed database is wider than the migration set**,
i.e. a policy was added by hand. This is the same assertion U15's CI step makes against a fresh database;
running it here is what extends it to the one that matters.

**3.4 — no migration depends on an `auth.users` column the double omits.** *Repository-side check, listed
here because it is the assumption §2.4 leaves open.*

```bash
grep -rn "auth\.users" supabase/migrations/ | grep -v "auth\.users(id)"
```

**Expected: no output.** Every reference is `references auth.users(id)`.

---

## 4. The rollback story — documentation, and nothing tests it

Roadmap item 6 asks for "a rollback story". Here it is, stated as what it actually is rather than dressed
up as tooling.

**This schema is forward-only.** There are no down-migrations, `db:migrate` (`supabase db push`) applies
forward only, and nothing in the repository can reverse a migration. **"Rollback" means writing a new
forward migration** that restores the previous shape, reviewing it like any other, and deploying it in
order.

**The deployment-order rule that already exists is the other half of this story, and it is the half with
teeth.** From **OP-1** (`plan §4.6`, discharged 2026-08-10 —
[`2026-08-10-deployed-migration-record.md`](./2026-08-10-deployed-migration-record.md)):

> Deploy the application code first, or both together. Never the migration alone. **Rolling back the code
> without rolling back `0008` recreates the same failure.**

That residual still stands, and it is precisely a rollback hazard: reverting a deployment is the ordinary,
low-drama operation an operator reaches for under pressure, and here it can reintroduce a fault the
forward deploy fixed. A code rollback past U4 with `0008` still applied means the advisor's usage write is
denied and every turn 500s **after the paid call has been made**.

**Practical consequence, for whoever is holding the pager:**

1. Prefer rolling **forward**. A corrective migration is reviewable; an improvised reversal is not.
2. Before any migration deploy, take a snapshot — Supabase's point-in-time recovery is the only true
   undo this project has. It is a platform feature, not something this repository provides.
3. Never roll the application code back across a migration boundary without deciding, explicitly, what
   happens to the migrations applied since.

> **§10.3's own logic, applied to this section: THIS IS A CLAIM, AND NOTHING TESTS IT.** *"Guardrails that
> do not run in CI do not exist."* A rollback procedure in a markdown file is not a guardrail — it is a
> statement of intent that has never been exercised, and the first time it is exercised will be during an
> incident. It is written down because an unwritten procedure is worse, **not** because writing it down
> makes it reliable. U15 deliberately builds no reversibility tooling, because tooling would imply a
> reversibility the schema does not have, and a confident `db:rollback` command that cannot actually
> restore state is a trust defect of exactly the kind §8.3 names.

---

## 5. Verdict

*(To be completed by the owner at the sitting.)*

| Check | Expected | Observed | Verdict |
|---|---|---|---|
| 2.1 `auth.users.id` is `uuid` | one row, `id \| uuid` | | |
| 2.2 `auth.uid()` returns `uuid` | one row | | |
| 2.3 three roles exist | 3 rows | | |
| 2.4 real `auth.users` column count | > 1, recorded | | *(measurement)* |
| 3.1 table inventory | the 13 named above | | |
| 3.2 RLS everywhere | zero rows | | |
| 3.3 counter tables SELECT-only | 2 rows, both `SELECT` | | |
| 3.4 no omitted-column dependency | no output | | |

**Overall:** *(pending)*

**Anything unexpected is a finding, not a retry.** If a check disagrees with the expectation, record the
actual output and stop — the value of this record is that it says what the deployed database *is*, not
what it was supposed to be.
