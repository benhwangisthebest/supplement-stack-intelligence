# Consolidated owner sitting — 2026-08-12

**STATUS: PROCEDURE WRITTEN, NOT YET RUN.**

Three open obligations that all need the deployed database, gathered into **one sitting** so they clear
together rather than in three separate visits:

| Part | Clears | Needs |
|---|---|---|
| **1** | **U15's deployed-schema record** + the prelude anchors (Option B condition (c)) | SQL editor · read-only |
| **2** | **OP-3** — the reservation is atomic under real concurrency | **two `psql` sessions** · writes, rolled back |
| **3** | **N-28** — the separate-statement re-read (and **N-27 (i)**, which `settle` has never been run for) | one `psql` session or SQL editor · writes, rolled back |

**Part 1 is the artifact the Phase 2 exit criterion cites** (*"matching the live database remains a dated
manual record"*, `docs/roadmap.md`, reworded 2026-08-08 under plan §7 decision 5). Parts 2 and 3 are
register rows from §4.6 that have been waiting for a sitting with two backends.

| | |
|---|---|
| **Date** | *(fill in at run)* |
| **Run by** | repository owner |
| **Instance** | deployed Supabase |
| **Repo state** | `main` @ *(fill in)* |
| **Migrations in the set** | `0001` … `0009` (9 files) |

---

## 0. Before you start

**Redaction posture, per the house pattern.** Project ref, connection string, and any user UUID are
redacted to `<PROJECT_REF>` / `<UUID>` before anything is pasted here. Paste output verbatim apart from
redaction; **do not summarise a result you did not read.**

**Tooling.** Part 1 runs in the Supabase SQL editor. **Parts 2 and 3 need real `psql` sessions** — Part 2
in particular **cannot be done in the SQL editor at all**, because it requires two backends holding
transactions open at the same time, and the editor gives you neither a durable session nor a second one.
A client is already on this machine at `/Library/PostgreSQL/18/bin/psql`; the connection string is in the
Supabase dashboard under *Project Settings → Database → Connection string → URI*.

**Writes.** Part 1 is read-only. **Parts 2 and 3 write to `advisor_usage`** and both are wrapped in
`begin … rollback`. Nothing is left behind **provided every block ends in `rollback`** — check that before
running each one.

**The `authenticated` role matters.** A superuser or `postgres` session bypasses RLS and reports a false
pass. Every block below sets the role and the JWT claim explicitly, following OP-2's discharged procedure.
Pick `<UUID>` as your own demo user's id, from `select id from auth.users limit 1;`.

**Stop conditions, global.** Anything that disagrees with an expectation is a **finding, not a retry**:
record the actual output and stop that part. Do not adjust a fixture until it passes — that is how an
instrument gets tuned to produce the answer someone wanted, which is what **N-26** is about.

### 0.1 `db:migrate`, and why no `config.toml` is checked in

*(Not part of the sitting. Recorded here because `npm run db:migrate` points at this section, and because
this is where an operator setting up the CLI will be looking.)*

`npm run db:migrate` runs `supabase db push` behind a wrapper. It needs the **Supabase CLI installed** and
the project **linked** (`supabase link --project-ref <PROJECT_REF>`), which is what generates
`supabase/config.toml`.

**U15's plan listed `supabase/config.toml` as a new file and it was deliberately NOT created.** The CLI is
not installed on the machine U15 was built on, so any `config.toml` written there would have been a
hand-authored approximation of a CLI-version-specific schema **that nothing available could validate** —
authoring an unverifiable structure, which is what **§2.2 rule 8** forbids. A wrong config that *looks*
official is worse than none: it gets edited rather than regenerated. **The correct file is the one
`supabase init` / `supabase link` produces**, and it can be committed then, by someone who can verify it.

Nothing in CI depends on this: the coherence step drives `psql` against a service container and never
invokes the CLI. Neither does anything in this sitting.

---

## Part 1 — deployed schema, and the prelude anchors

### 1.1 Why this part exists — what CI cannot see

CI applies the migration set to a throwaway `postgres:16` behind
[`supabase/ci/auth-prelude.sql`](../../supabase/ci/auth-prelude.sql), a **labelled test double** for
Supabase's `auth` schema. Green as of run **`31560224886`**. That proves the set is *internally* coherent
and cannot prove two things, which is what this part is for:

1. **That the double resembles the real `auth` schema** in the four respects the migration set depends on.
   If it does not, CI has been proving coherence against a fiction — the **N-26** instrument hazard.
2. **That the deployed database actually matches the migration set.** CI holds no credentials by design
   (P-03 — this repository is public), so no automated check can ever establish this.

The double is anchored to reality **once, on record** — not assumed to match forever.

### 1.2 Prelude anchors *(read-only; Option B condition (c))*

**A — `auth.users` exists and its `id` is a `uuid`.** *(10 FKs in the migration set point here.)*

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'auth' and table_name = 'users' and column_name = 'id';
```
**Expected:** one row — `id | uuid`.
**If it differs:** every FK in the set is questionable and U15's CI step measures the wrong shape. Stop.

**B — `auth.uid()` exists and returns `uuid`.** *(43 policy clauses call it.)*

```sql
select p.proname, pg_get_function_result(p.oid) as returns
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'auth' and p.proname = 'uid';
```
**Expected:** one row — `uid | uuid`.

**C — the three roles exist.** *(0008 and 0009 grant execute to `authenticated`.)*

```sql
select rolname from pg_roles
where rolname in ('anon', 'authenticated', 'service_role') order by rolname;
```
**Expected:** three rows.

**D — how much of the real `auth.users` the double omits.** *A measurement, not a pass/fail.*

```sql
select count(*) as real_column_count
from information_schema.columns
where table_schema = 'auth' and table_name = 'users';
```
**Expected:** a number well above 1. **Record it.** The double reproduces exactly one column, and writing
the real figure down puts the *size of the simplification* on record rather than leaving it implied. This
is only sound because no migration references any other column — which 1.3 D re-checks.

### 1.3 Deployed schema vs the migration set *(read-only)*

**A — table inventory.**

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
```
**Expected: exactly these 13**, matching what the set produced against `postgres:16` — `advisor_actions`,
`advisor_conversations`, `advisor_messages`, `advisor_usage`, `api_rate_limits`, `checkins`,
`evaluation_flags`, `lab_markers`, `lab_panels`, `side_effect_reports`, `stack_items`, `stacks`,
`user_profiles`.
**A table here that is not in that list means something was applied by hand and never written down** —
the practice roadmap item 6 exists to end. A missing one means a migration never reached production.

**B — RLS is on everywhere.**

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and not rowsecurity order by tablename;
```
**Expected: zero rows.** Any row is a live §2.3 rule-12 breach, not a documentation problem.

**C — the counter tables are SELECT-only (N-16, live side).**

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('advisor_usage', 'api_rate_limits')
order by tablename, policyname;
```
**Expected:** exactly two rows, both `SELECT` — `read_own_advisor_usage`, `read_own_api_rate_limits`.
**Any `ALL`/`INSERT`/`UPDATE`/`DELETE` row means the deployed database is wider than the migration set.**
This is the same assertion U15's CI step makes against a fresh database; running it here extends it to the
one that matters.

**D — no migration depends on an `auth.users` column the double omits.** *(Repository-side, run locally.)*

```bash
grep -rn "auth\.users" supabase/migrations/ | grep -v "auth\.users(id)"
```
**Expected: no output.**

---

## Part 2 — OP-3: is the reservation atomic under real concurrency?

**What is being tested, and why nothing so far has tested it.** `reserve_advisor_tokens` grants tokens with
a single `UPDATE … WHERE input + output + amount <= budget`. U4's proof is a **stateful JS fake**: it shows
the TypeScript caller has no read-then-write window, not that **Postgres serialises the row**. OP-2 ran
both its calls in **one** transaction, so no second backend ever contended. OP-6's `generate_series(1, 6)`
is six **sequential** calls in one backend. **Neither is contention. This part is the first time two
backends race for the same row.**

**Setup.** Open **two terminals**, both connected with `psql "<CONNECTION_URI>"`. Call them **A** and **B**.

**Step 1 — in A, learn the starting point** *(read-only, no transaction)*:

```sql
select input_tokens, output_tokens, input_tokens + output_tokens as used
from public.advisor_usage
where user_id = '<UUID>' and usage_date = current_date;
```

Note `used`. If there is no row, `used` is 0. **Choose `AMOUNT` and `BUDGET` so that exactly one of two
concurrent reservations can fit:** `BUDGET = used + AMOUNT`, e.g. `AMOUNT = 1000`, `BUDGET = used + 1000`.
Both sessions will request `AMOUNT` against `BUDGET`; there is room for one.

**Step 2 — in A, open a transaction and reserve. Do NOT commit.**

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID>"}';
select public.reserve_advisor_tokens(1000, <BUDGET>) as a_granted;
```
**Expected:** `a_granted = 1000`. **Leave this transaction open** and switch to B.

**Step 3 — in B, run the same reservation.**

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID>"}';
select public.reserve_advisor_tokens(1000, <BUDGET>) as b_granted;
```
**Expected: B HANGS.** It must not return. That block is the whole point — it is Postgres holding the row
lock A took, and it is the thing no JS fake and no single-session run can demonstrate.
**If B returns immediately with `1000`, STOP — that is OP-3 failing**: two concurrent turns each got the
last of the budget, and the ledger over-grants under load.
*(While B hangs, you can confirm the lock from a third connection or from the dashboard:
`select wait_event_type, wait_event, query from pg_stat_activity where state = 'active';`)*

**Step 4 — in A, commit.**

```sql
commit;
```
**Expected:** B **unblocks immediately** and returns **`b_granted = 0`** — refused, because A's committed
row now leaves no room. **This is the pass condition: the second caller re-evaluated the predicate against
A's committed state rather than the snapshot it started with.**

**Step 5 — in B, roll back, then undo A's write.**

```sql
rollback;
```
A's reservation **was committed in step 4** and must be undone. In A:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID>"}';
select public.settle_advisor_tokens(1000, 0, 0);
select input_tokens, output_tokens from public.advisor_usage
  where user_id = '<UUID>' and usage_date = current_date;
```
**Expected:** the reads match the step-1 values exactly. **Then `commit;`** — this one *must* commit, since
it is the repair. `settle(1000, 0, 0)` releases the 1000 reserved and charges nothing.
**If the numbers do not return to step 1's values, record that and stop** — a ledger that cannot be
returned to its starting state is a finding in its own right.

> **Why step 4 has to commit rather than roll back.** A rollback would also release the lock, and B would
> then be granted `1000` — which demonstrates the lock but *not* the re-evaluation, and the re-evaluation
> is the half that stops over-granting. Committing costs one repair statement and tests the property that
> matters. **Both outcomes are informative; only one of them is OP-3.**

---

## Part 3 — N-28: the separate-statement re-read (and N-27 (i))

**What went wrong last time.** The N-27 addendum put `settle_advisor_tokens(1000, 300, 50)` **and** two
`(select input_tokens …)` "after" reads **in the same `select` target list**. Sub-selects are evaluated
against that statement's snapshot — the same snapshot the "before" columns read — so both "after" columns
returned the **before** values (`4345` where `4645` was predicted). **A correct effect and no effect
produced identical readings.** This part re-runs it with each read as its **own statement**.

**It also discharges N-27 (i):** `settle_advisor_tokens` — the half that can corrupt the ledger by
*under*-charging — has never actually been invoked against the deployed database. Every claim about it
rests on `SQL_FUNCTION_REGISTRY` reading it as text.

One `psql` session (or one SQL editor tab, provided you run the statements **one at a time**):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID>"}';
```
**Statement 1 — before:**
```sql
select input_tokens as before_input, output_tokens as before_output
from public.advisor_usage where user_id = '<UUID>' and usage_date = current_date;
```
**Statement 2 — reserve, alone:**
```sql
select public.reserve_advisor_tokens(1000, 1000000) as granted;
```
**Expected:** `1000`.

**Statement 3 — read again, its own statement:**
```sql
select input_tokens, output_tokens from public.advisor_usage
where user_id = '<UUID>' and usage_date = current_date;
```
**Expected:** `input_tokens = before_input + 1000`, `output_tokens = before_output`.
**If input is unchanged here, the re-read is still reading a stale snapshot and N-28 is NOT discharged.**

**Statement 4 — settle, alone:**
```sql
select public.settle_advisor_tokens(1000, 300, 50);
```
**Statement 5 — read a third time, its own statement:**
```sql
select input_tokens, output_tokens from public.advisor_usage
where user_id = '<UUID>' and usage_date = current_date;
```
**Expected:** `input_tokens = before_input + 300` and `output_tokens = before_output + 50`.
Derivation, so the number is checkable rather than trusted: settle sets
`input = greatest(0, input − reserved + p_input)` = `(before + 1000) − 1000 + 300`, and
`output = output + p_output`.

**Finally:**
```sql
rollback;
```
**Expected:** nothing persists. Confirm with a fresh read after the rollback — it must equal `before`.

---

## 4. The rollback story — documentation, and nothing tests it

Roadmap item 6 asks for one. Here it is, stated as what it actually is rather than dressed up as tooling.

**This schema is forward-only.** There are no down-migrations, `db:migrate` (`supabase db push`) applies
forward only, and nothing in the repository can reverse a migration. **"Rollback" means writing a new
forward migration** that restores the previous shape, reviewing it like any other, and deploying it in
order.

**The deployment-order rule already on record is the other half of this story, and the half with teeth.**
From **OP-1** (`plan §4.6`, discharged 2026-08-10 —
[`2026-08-10-deployed-migration-record.md`](./2026-08-10-deployed-migration-record.md)):

> Deploy the application code first, or both together. Never the migration alone. **Rolling back the code
> without rolling back `0008` recreates the same failure.**

That residual still stands, and it is precisely a rollback hazard: reverting a deployment is the ordinary,
low-drama operation an operator reaches for under pressure, and here it can reintroduce a fault the
forward deploy fixed. A code rollback past U4 with `0008` still applied means the advisor's usage write is
denied and every turn 500s **after the paid call has been made**.

**Practical consequence, for whoever is holding the pager:**

1. Prefer rolling **forward**. A corrective migration is reviewable; an improvised reversal is not.
2. Before any migration deploy, take a snapshot — Supabase's point-in-time recovery is the only true undo
   this project has. It is a platform feature, not something this repository provides.
3. Never roll the application code back across a migration boundary without deciding, explicitly, what
   happens to the migrations applied since.

> **§10.3's own logic, applied to this section: THIS IS A CLAIM, AND NOTHING TESTS IT.** *"Guardrails that
> do not run in CI do not exist."* A rollback procedure in a markdown file is not a guardrail — it is a
> statement of intent that has never been exercised, and the first time it is exercised will be during an
> incident. It is written down because an unwritten procedure is worse, **not** because writing it down
> makes it reliable. U15 deliberately builds no reversibility tooling: tooling would imply a reversibility
> the schema does not have, and a confident `db:rollback` that cannot restore state is the §8.3 trust
> defect, not a convenience.

---

## 5. Verdict

*(To be completed at the sitting.)*

### Part 1 — deployed schema and prelude anchors

| Check | Expected | Observed | Verdict |
|---|---|---|---|
| 1.2 A `auth.users.id` is `uuid` | one row, `id \| uuid` | | |
| 1.2 B `auth.uid()` returns `uuid` | one row | | |
| 1.2 C three roles exist | 3 rows | | |
| 1.2 D real `auth.users` column count | > 1, recorded | | *(measurement)* |
| 1.3 A table inventory | the 13 named above | | |
| 1.3 B RLS everywhere | zero rows | | |
| 1.3 C counter tables SELECT-only | 2 rows, both `SELECT` | | |
| 1.3 D no omitted-column dependency | no output | | |

### Part 2 — OP-3, concurrency

| Step | Expected | Observed | Verdict |
|---|---|---|---|
| 2 A reserves | `1000` | | |
| 3 B blocks | **hangs** — does not return | | |
| 4 after A commits, B returns | **`0`** (refused) | | |
| 5 ledger restored to step-1 values | equal | | |

### Part 3 — N-28 re-read, and N-27 (i)

| Statement | Expected | Observed | Verdict |
|---|---|---|---|
| 2 reserve | `1000` | | |
| 3 read after reserve | `before_input + 1000` | | |
| 5 read after settle | `before_input + 300`, `before_output + 50` | | |
| after rollback | equals `before` | | |

**Overall:** *(pending)*

**Anything unexpected is a finding, not a retry.** The value of this record is that it says what the
deployed database *is*, not what it was supposed to be.
