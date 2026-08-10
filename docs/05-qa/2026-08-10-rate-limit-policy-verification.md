# Rate-limit policy verification — OP-6, and the N-27 addendum — 2026-08-10

**OP-6 DISCHARGED. N-27 CLOSED IN PART — its accumulation clause decisively, its `settle` clause NOT.
OP-3 REMAINS OPEN. A new instrument defect, N-28, is registered by this record.**

Third and last of the same day's owner-run database records, and the direct sequel to
`2026-08-10-ledger-policy-verification.md` (OP-2). Same instance, same technique, same session pattern.

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Run by** | repository owner |
| **Instance** | deployed Supabase (`Supplementadvisor`, branch `main`, PRODUCTION), via the Supabase SQL editor |
| **Role** | `authenticated`, per block — `begin; set local role authenticated; set local request.jwt.claims = '{"sub":"<owner sub>","role":"authenticated"}'; … rollback;` |
| **Subject** | `0009_rate_limits.sql`'s four header checks (**OP-6**) + a targeted **N-27** addendum against `0008`'s two definer functions |
| **Repo state** | `main` @ `1663ef2` |
| **Residue** | none — every block rolled back |

> **Redaction.** The owner's `sub` UUID appears in the run and is replaced by `<owner sub>` throughout,
> including inside `bucket_key` values. It is a user identifier on a production instance; §2.3 rule 15's
> posture is that it does not need to be in a version-controlled document to make this record readable.

---

## 1. OP-6 — `0009`'s four checks

Each ran as its own `begin … rollback` block at the `authenticated` role, so the superuser-bypass warning
that governs OP-2 governs these identically: **a bypassing session would have reported all four as passes
while measuring nothing.**

### Check 1 — DELETE is denied

```sql
with del as (delete from public.api_rate_limits returning 1)
select count(*) as rows_deleted_expect_0 from del;
```

| `rows_deleted_expect_0` |
|---|
| **0** |

**Note the absent `WHERE`.** This is not the `where user_id = auth.uid()` form of `0008`'s check — it
attempts to delete **every row the role can see**, which is the stronger statement, and it removed none.

### Check 2 — INSERT is denied, and denied in the *error* shape

```sql
insert into public.api_rate_limits(bucket_key, window_start, request_count)
  values ('user:me', now(), 0);
```

```
ERROR: 42501: new row violates row-level security policy for table "api_rate_limits"
```

**This is the one check in either record that produces a raised error rather than a silent filter, and that
is exactly as predicted.** §2.1 of the OP-2 record set the expectation: `DELETE`/`UPDATE` can only ever
filter, because a missing `USING` clause removes candidate rows and leaves nothing to reject; `INSERT`
fails `WITH CHECK`, and a row that fails `WITH CHECK` **is** an error — `42501`, verbatim the string
0008's header used to describe the shape it could not produce.

Its evidential value is different in kind from the other three, and better: **an error cannot be explained
by an empty table.** Checks 1, 3 and 4 are readings that a vacuous state could mimic in isolation; this one
is the policy speaking.

### Check 3 — own rows are readable

```sql
select * from public.api_rate_limits;
```

| `bucket_key` | `window_start` | `request_count` | `user_id` |
|---|---|---|---|
| `user:<owner sub>:advisor` | `2026-08-10 13:38:00+00` | `1` | `<owner sub>` |

The read the policy exists to preserve still works, and the row is **real advisor traffic** — the
`:advisor` bucket the live route composes, not anything this session created.

### Check 4 — the limiter counts, then refuses

```sql
select i as call_number,
       public.consume_rate_limit('user:op6-test', 60, 5) as count_expect_1to5_then_0
from generate_series(1, 6) i;
```

| `call_number` | `count_expect_1to5_then_0` |
|---|---|
| 1 | **1** |
| 2 | **2** |
| 3 | **3** |
| 4 | **4** |
| 5 | **5** |
| 6 | **0** |

The window of 5 fills and the sixth call is refused. A fresh bucket key (`user:op6-test`) was used, so the
real `:advisor` bucket of check 3 was never touched, and the block rolled back regardless.

---

## 2. Why checks 1, 3 and 4 are discriminating — and it is not the same argument as OP-2's

The OP-2 record's §2.2 made the point that a 0-row DELETE is ambiguous on its own, and that a later SELECT
returning rows is what resolves it. **That argument applies here and needs one repair**, because unlike
OP-2 these blocks are separate transactions, each rolled back — so "later in the same session" is not what
carries it.

**What carries it is provenance, not ordering.** Check 3's row is a real `:advisor` bucket produced by live
advisor traffic. Nothing in this run could have created it: check 2's insert raised, check 4 wrote only to
`user:op6-test`, and every block rolled back. So the row **pre-existed the whole run**, and check 1 —
which named no `WHERE` and therefore targeted it — deleted nothing. The table was not empty when the DELETE
was refused. That is the discrimination, and it holds across transaction boundaries where a purely temporal
argument would not.

**Check 2 makes the point independently anyway.** `42501` is positive evidence of an enforced policy that
no empty-table story can produce, so OP-6's denial evidence does not rest on the inference above at all —
it merely also survives it. This is the first of the eight checks across both records that stands alone.

**Check 4 needs no such argument:** an incrementing 1→5 followed by a refusal is a signature no vacuous
state produces.

---

## 3. The N-27 addendum — one clause closed decisively, one clause NOT established

N-27 registered two narrownesses in OP-2's procedure: (i) `settle_advisor_tokens` was never called, and
(ii) the cap fixture could not isolate accumulation. Both were aimed at in one block:

```sql
select
  (select input_tokens  from public.advisor_usage
     where user_id = auth.uid() and usage_date = current_date) as input_before,
  (select output_tokens from public.advisor_usage
     where user_id = auth.uid() and usage_date = current_date) as output_before,
  public.reserve_advisor_tokens(1000, 1000000) as r1_expect_1000,
  public.reserve_advisor_tokens(1000, 1500)    as r2_expect_0,
  public.settle_advisor_tokens(1000, 300, 50)  as settle_expect_blank,
  (select input_tokens  from public.advisor_usage
     where user_id = auth.uid() and usage_date = current_date) as input_after_expect_before_plus_300,
  (select output_tokens from public.advisor_usage
     where user_id = auth.uid() and usage_date = current_date) as output_after_expect_before_plus_50;
```

| `input_before` | `output_before` | `r1_expect_1000` | `r2_expect_0` | `settle_expect_blank` | `input_after_…_plus_300` | `output_after_…_plus_50` |
|---|---|---|---|---|---|---|
| 4345 | 276 | **1000** | **0** | *(blank)* | **4345** | **276** |

### 3.1 N-27(ii) — accumulation: CLOSED, and more strongly than the fix asked for

`r2_expect_0 = 0` **is** the discrimination N-27 demanded, and the reason is arithmetic:

- **`1000 ≤ 1500`.** An implementation that ignored prior usage and asked only *"is the request smaller
  than the budget?"* would have **granted** this call.
- It was **refused**. Therefore prior usage demonstrably entered the decision.

This is precisely what OP-2's `reserve_advisor_tokens(1000, 500)` could not show — there, refusal followed
from `1000 > 500` alone. **N-27(ii) is closed.**

Worth recording *which* prior usage did the work: the ledger already held `4345 + 276 = 4621` real tokens
for today, which exceeds the 1500 budget by itself. So the refusal does **not** depend on `r1`'s own 1000
having landed first — and consequently this block **does not** establish evaluation order within the target
list, which SQL does not guarantee. It does not need to. Either way, prior usage is in the decision, which
is the whole claim.

### 3.2 N-27(i) — `settle_advisor_tokens`: called, but its EFFECT WAS NOT OBSERVED

**The two `after` columns returned the `before` values.** `input_after_expect_before_plus_300` came back
**4345**, identical to `input_before`; `output_after_expect_before_plus_50` came back **276**, identical to
`output_before`. The predicted values were **4645** and **326**. On the fixture's own stated expectation
this is a **miss**, and it must not be recorded as a pass.

**The cause is the fixture, and the function is not implicated.** Both `after` sub-selects sit in the
**same `select` statement** as the mutating calls, so they are evaluated against **that statement's
snapshot** — the very snapshot `input_before` and `output_before` read. A plain sub-query in a target list
cannot see writes performed by volatile functions in the same target list. The two pairs of identical
numbers are exactly what that predicts, which is why this reads as an instrument fault rather than a
finding about `settle_advisor_tokens`.

**Check 4 is the control that proves the mechanism is snapshot visibility and nothing worse.** Six
`consume_rate_limit` calls in one statement returned 1,2,3,4,5,0 — so **volatile function calls do observe
each other's writes** (each statement inside a plpgsql body takes a fresh command snapshot), in the same
run, on the same instance. Writes are landing. It is only the *plain sub-select* that is blind to them.

**What N-27(i) therefore does and does not now have:**

| | |
|---|---|
| **Established** | `settle_advisor_tokens` is **callable by `authenticated`** and completed without error, returning `void` (the blank cell). 0008 §3's `grant execute` is live for both functions, not just the one OP-2 exercised |
| **NOT established** | That it moves the ledger by the amounts it computes — the release of `p_reserved` and the charge of real usage. `greatest(0, input − reserved + actual)` remains verified only as SQL text |

**N-27(i) stays open**, carried forward by N-28 below. The fix is one line of shape, not new apparatus:
**read in a separate statement inside the same transaction**, still before the `rollback`.

---

## 4. N-28 — a verification fixture cannot read its own writes inside one statement

Registered as a finding rather than fixed in place, and it is the **third member of the N-26 family**:

| | The defect |
|---|---|
| **N-26** | A fixture whose **output** could not discriminate two opposite states (empty answer = obedience *or* breakage) |
| **N-27** | A fixture whose **input** was over-strong, so it passed without exercising the mechanism (`1000` against a budget of `500`) |
| **N-28** | A fixture whose **reads cannot see its own writes**, so a correct effect and no effect return identical values |

All three were found by *running* the checks, never by reading them — which is the argument for these
owner-run items existing at all, and the argument against ever recording a predicted output as an observed
one. Had the `after` columns not been printed beside the `before` columns in the same row, this would have
been invisible: the numbers are only obviously wrong because the pair is adjacent.

---

## 5. Status after this record

| | |
|---|---|
| **OP-1** | ✅ DISCHARGED 2026-08-10. **Residual stands:** a code rollback leaving `0008` applied reproduces the original failure |
| **OP-2** | ✅ DISCHARGED 2026-08-10 — `2026-08-10-ledger-policy-verification.md` |
| **OP-3** | **OPEN.** Two genuinely concurrent `reserve_advisor_tokens` sessions. **Nothing in this record advances it** — every block was one session, and `generate_series` is six sequential calls in one backend, not contention |
| **OP-4** | ✅ DISCHARGED 2026-08-10, with one verdict withdrawn |
| **OP-5** | **OPEN — owner condition, pre-deployment.** Gateway provider set (§2.3 rule 15) |
| **OP-6** | ✅ **DISCHARGED — this record.** All four `0009` checks, as `authenticated` |
| **N-27** | **CLOSED IN PART.** (ii) accumulation — closed decisively. (i) `settle` — callable, effect unobserved; carried by N-28 |
| **N-28** | **OPEN — new.** The snapshot-blind fixture, and the residue of N-27(i) |

> Both counter tables' policies are now verified against the deployed database: `advisor_usage` by OP-2,
> `api_rate_limits` by OP-6. **What remains unverified there is behaviour under concurrency (OP-3) and one
> function's effect on the ledger (N-28).** The policies are done; two mechanisms are not.
