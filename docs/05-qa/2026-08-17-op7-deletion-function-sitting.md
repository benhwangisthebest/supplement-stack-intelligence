# OP-7 owner sitting — deploy `0010`, then verify it with safe probes

**STATUS: RUN 2026-08-17. ALL FOUR STEPS PASS. OP-7 DISCHARGED.**

`0010_delete_user_data.sql` is **live on the deployed database**, and its three pins hold there: no
parameters, empty `search_path`, and a `28000` refusal when `auth.uid()` is null. **No live deletion was
run**, by design. U17's merge blocker is cleared.

This sitting **deploys** `supabase/migrations/0010_delete_user_data.sql` to the deployed Supabase database
and then verifies the deployed function's shape with **three read-only-or-inert probes**. It clears
**OP-7**, which is U17's merge blocker.

| | |
|---|---|
| **Date** | **2026-08-17** |
| **Run by** | repository owner |
| **Instance** | deployed Supabase — server **PostgreSQL 17.6** *(carried from the 2026-08-12 sitting)* |
| **Client** | Supabase SQL editor (all four steps) |
| **Procedure authored** | **2026-08-15**, committed blank at `70525a2` **before** any result was known |
| **Repo state** | `feat/u17-data-deletion` @ **`55c74f6`** |
| **Migrations in the set after this** | `0001` … `0010` (10 files) |
| **CI cross-reference** | coherence step green on run **`31875356506`**, which applied all ten to `postgres:16` |

---

## 0. Before you start

**THE ORDER IS THE POINT, AND IT IS THE REVERSE OF OP-1's.** OP-1 (migration `0008`) was *code first, never
the migration alone*. This one is **migration first, never the code alone**:

| | |
|---|---|
| `0010` deployed, U17's code not yet merged | **Harmless.** An unused function nothing calls. |
| U17's code merged, `0010` not deployed | **A DELETE route whose RPC does not exist.** |

The second case is pinned to fail *honestly* — `route.test.ts` asserts a **500 with `data: null`, no counts,
and a correlation id**, so a user is never told their data was removed when nothing was. That pin is a
safety net, not a licence: **nothing merges until this sitting is on record.**

**Redaction posture, per the house pattern.** Project ref, connection string, and any user UUID are
redacted to `<PROJECT_REF>` / `<UUID>` before anything is pasted here. Paste output verbatim apart from
redaction; **do not summarise a result you did not read.**

**Tooling.** All four steps run in the **Supabase SQL editor**. Unlike OP-3, nothing here needs two
concurrent backends or a durable session.

**Writes.** **Step 1 is a schema change** — it creates a function. **Steps 2–4 touch no rows**, and step 4
is inert for two independent reasons (see its own note). No user data is read, modified, or deleted at any
point in this sitting.

**Stop conditions, global.** Anything that disagrees with an expectation is a **finding, not a retry**:
record the actual output and stop. Do not adjust a probe until it passes — that is how an instrument gets
tuned to produce the answer someone wanted (**N-26**).

**THE HARD BOUNDARY, STATED BEFORE THE PROCEDURE RATHER THAN AFTER.** This sitting contains **NO
LIVE-DELETION TEST**. Deletion completeness, the cascades, the `SET NULL` behaviour and cross-user
isolation are all proved in CI against a **throwaway** Postgres — which is precisely what U15 was built to
make possible, and precisely why they must not be re-run here. **If any step below appears to need
anything beyond the schema change in step 1 and the read-only/inert probes in steps 2–4 — STOP AND ASK.**
Do not improvise against a production database.

---

## 1. Apply the migration

Paste the **entire contents of `supabase/migrations/0010_delete_user_data.sql`, verbatim**, into the SQL
editor and run it. Do not retype it, do not apply it in pieces, and do not edit it to fit the editor —
if it does not fit or does not run, that is a finding.

The file is 198 lines: a header explaining why the function exists and why it takes no user id, the
`create or replace function` body, a `revoke all … from public`, a `grant execute … to authenticated`, and
a footer carrying these same three probes.

**Expected:** `Success. No rows returned.`

| Check | Expected | Actual | |
|---|---|---|---|
| 1.1 | The statement completes with no error | `Success. No rows returned` | **PASS** |

> **Why `create or replace` is safe to run here.** The function does not exist on the deployed database
> yet, so this is a create. If it somehow *does* already exist, `or replace` overwrites the body — and
> steps 2–4 then verify what is actually there rather than what you expected to put there. That is the
> reason the probes follow the apply instead of standing in for it.

---

## 2. Catalog shape — the live-side check of the repository's highest-stakes assertion

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_function_result(p.oid)             as returns,
       p.prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_all_user_data';
```

**Expected: exactly 1 row.**

| Check | Expected | Actual | |
|---|---|---|---|
| 2.1 | `proname` = `delete_all_user_data`, **one row only** | `delete_all_user_data`, 1 row | **PASS** |
| 2.2 | **`args` is EMPTY** | **empty cell** | **PASS** |
| 2.3 | `returns` = `jsonb` | `jsonb` | **PASS** |
| 2.4 | `prosecdef` true — **`t`** in `psql`, **`true`** in the SQL editor | `true` | **PASS** |

> **2.2 is the one to read carefully.** `delete_all_user_data()` runs with definer privileges and therefore
> bypasses RLS; the **only** thing scoping it to one user is `auth.uid()` inside its body. If it ever
> accepts a user id, any authenticated caller can irreversibly erase any other account. The repository pins
> this as a **hard zero** — not "no parameter that looks like a user id" — so nobody has to judge which
> parameters are safe. `SQL_FUNCTION_REGISTRY` asserts it in CI; **this step is the same assertion against
> the database that will actually run it.**
>
> **A non-empty `args` here is a STOP.** Do not merge, do not adjust, report it.

---

## 3. `search_path`

```sql
select proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_all_user_data';
```

| Check | Expected | Actual | |
|---|---|---|---|
| 3.1 | `search_path` set to the empty string — **`{search_path=""}`** in `psql`, **`["search_path=\"\""]`** in the SQL editor | `["search_path=\"\""]` | **PASS** |

> A `SECURITY DEFINER` function with a caller-controlled `search_path` is a privilege-escalation vector:
> the caller can create a same-named table or function in a schema earlier on the path and have the definer
> execute it with elevated rights. The empty `search_path` is why every reference in the body is
> schema-qualified (`public.`, `auth.`).

---

## 4. Null-claim refusal — the only probe that calls the function, and it touches nothing

```sql
begin;
set local role authenticated;
select public.delete_all_user_data();
rollback;
```

Note there is **no** `set local request.jwt.claims` — that omission is the whole probe. `auth.uid()`
returns null, and the function refuses.

| Check | Expected | Actual | |
|---|---|---|---|
| 4.1 | **ERROR, SQLSTATE `28000`**, message `delete_all_user_data requires an authenticated caller` | `ERROR:  28000: delete_all_user_data requires an authenticated caller` | **PASS** |
| 4.2 | The error names the `RAISE` line of `public.delete_all_user_data()` in its `CONTEXT` | `CONTEXT:  PL/pgSQL function public.delete_all_user_data() line 8 at RAISE` | **PASS** |

> **The deployed function raised from the SAME LINE as the local one.** The 2026-08-15 ad-hoc-Postgres run
> reported `line 8 at RAISE`; so did this one, against PostgreSQL 17.6. The guard is in the same position in
> the body that CI and the local measurement both exercised — not merely *a* refusal, but the one that was
> proved inert.

> **WHY THIS IS INERT, VERIFIED RATHER THAN ASSUMED.** Executed against the ad-hoc Postgres on 2026-08-15
> with a seeded row present: `rows before: 1` → probe raises `ERROR: 28000` at `line 8 at RAISE` →
> `rows after: 1`. Two independent reasons it cannot touch data:
>
> 1. **The guard is the function's first statement**, ahead of every `delete`. It raises before any
>    deletion is reached — the `CONTEXT` line proves which statement raised.
> 2. **The `ERROR` aborts the transaction** regardless, and the block ends in `rollback` anyway.
>
> Either alone would be sufficient; both hold. **Check the block ends in `rollback` before running it.**
>
> If instead of the error you get a **result** — a `jsonb` object of counts — that means `auth.uid()` was
> not null, i.e. the editor supplied a session claim. **STOP.** Do not re-run it, do not "try it as a
> different role". Record what came back and report it: a definer delete that ran under an identity you did
> not set is a finding of the first order.

---

## 5. Verdict

| Step | Result |
|---|---|
| 1 — migration applies | **PASS** |
| 2 — catalog shape (**no parameters**) | **PASS** |
| 3 — `search_path` | **PASS** |
| 4 — null-claim refusal | **PASS** |

**OP-7 verdict: PASS. DISCHARGED.** No redlines. **No live deletion was run.**

### Sitting notes

**THE TWO "MISMATCHES" THAT ARE NOT MISMATCHES, recorded because the next reader will hit them.** The
expected values in steps 2–4 were written in **`psql`** notation; this sitting ran in the **Supabase SQL
editor**, which renders the same catalog values differently:

| Check | Expected, as written | Observed | |
|---|---|---|---|
| 2.4 `prosecdef` | `t` | `true` | `psql` prints `boolean` as `t`/`f`; the editor prints `true`/`false`. **Same value.** |
| 3.1 `proconfig` | `{search_path=""}` | `["search_path=\"\""]` | `psql` prints `text[]` in Postgres array-literal form; the editor renders it as JSON, so the empty string arrives as an escaped `\"\"`. **Same single element, same empty value.** |

Neither is a discrepancy in the database. Both are the *client* talking. This is worth more than a
footnote: a procedure whose expected values are written against one client and run against another
produces two false alarms — or, worse, gets "corrected" until it matches, which is exactly the
instrument-tuning **N-26** warns about. **The expectations above have been rewritten to carry both
renderings** rather than the one that happened to be observed.

**Step 4's error is reported by the editor as a query failure** — *"Failed to run sql query: ERROR: 28000
…"*. That framing is the editor's, not the database's, and it is the **expected** outcome here: the probe
succeeds by failing. A reader skimming for green will misread it.

---

## 6. What this sitting does NOT establish

Recorded so the closeout cannot overstate it:

- **It does not prove the function deletes correctly.** No deletion is executed here. Completeness across
  all twelve tables, the two cascades, the `SET NULL` on `advisor_actions`, and cross-user isolation are
  proved by `npm run verify:migrations` against a throwaway Postgres — run **`31875356506`**, whose
  summary now enumerates each of those claims because the section that proved it appended it.
- **It does not prove the deployed database matches the migration set in general.** That is the standing
  P-03 residue and the 2026-08-12 record's job; this sitting adds one file to what has been checked.
- **It does not make the route live.** U17's code merges separately, and only after this record exists.
