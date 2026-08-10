# Ledger policy verification — OP-2 — 2026-08-10

**OP-2 DISCHARGED. OP-3 REMAINS OPEN.**

Where OP-2 points (`plan §4.6`, and `0008_usage_ledger_policy.sql`'s own header): *"Record the output in
`docs/05-qa/` with a date, per the U17 pattern."* This is it. Run by the repository owner against the
deployed Supabase instance; recorded here from the owner's report.

Companion to `2026-08-10-deployed-migration-record.md`, which discharged **OP-1** and recorded the same
instance's migration state. That record's §5 says of OP-2: *"NOT RUN — no output was provided with this
report. Owner will run it in a later sitting."* **This is that sitting.**

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Run by** | repository owner |
| **Instance** | deployed Supabase — the same instance as the OP-1 record, **not** the local gateway of the OP-4 record |
| **Migration state** | `0008` and `0009` applied earlier the same day (see the OP-1 record) |
| **Role** | `authenticated` — see §1, this is the load-bearing detail |
| **Repo state** | `docs/deployed-migration-record` @ `2b4f2a9` |
| **Residue** | none — the test reservation was rolled back |

---

## 1. How the `authenticated` role was obtained — and why that is the whole check

Both the migration header and the plan row warn in the same words: **a superuser session bypasses RLS and
reports a false pass.** A run that skips this is not a weaker verification, it is an inverted one — it
returns "denied" as "allowed" and vice versa, and every output below would look identical while meaning
nothing.

The owner avoided the bypass by wrapping each check in a transaction that drops to the target role and
supplies the JWT claims `auth.uid()` reads:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '…';   -- the owner's own sub
  …the check…
rollback;
```

**Why this is a faithful reproduction of the threat model, and where it stops being one.** 0008's header
states the attack precisely: `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships to the browser by construction and
PostgREST is reachable directly, so an authenticated user can issue `DELETE FROM advisor_usage WHERE
user_id = <their own id>`. What PostgREST does with such a request *is* `set role authenticated` plus the
request's JWT claims — so the database-side state under test here is the same state that attack produces.
`set local role` also genuinely drops RLS bypass: bypass is an attribute of the current role, and
`authenticated` carries neither `SUPERUSER` nor `BYPASSRLS`.

**What it does not exercise:** the HTTP and PostgREST layers above the database — schema exposure, the
`anon`→`authenticated` role switch driven by a real signed JWT, and PostgREST's own request handling. Those
are not what 0008 governs. **Stated so that this record is not later read as an end-to-end API-level
penetration check, which it is not.** It is a check of the policy, at the layer the policy lives.

---

## 2. The four checks — outputs as reported

Run in the header's order. All four came out **exactly as the header predicts**.

| # | Statement | Expected | Observed | |
|---|---|---|---|---|
| 1a | `delete from public.advisor_usage where user_id = auth.uid()` | denied | **filtered to 0 rows** | ✅ |
| 1b | `update public.advisor_usage set input_tokens = 0 where user_id = auth.uid()` | denied | **filtered to 0 rows** | ✅ |
| 2 | `select * from public.advisor_usage where user_id = auth.uid()` | own rows | **returned the owner's rows** | ✅ |
| 3a | `select public.reserve_advisor_tokens(1000, 200000)` | `1000` | **1000** — granted | ✅ |
| 3b | `select public.reserve_advisor_tokens(1000, 500)` | `0` | **0** — refused | ✅ |

**§2's finding is now closed in the migration set AND verified against the deployed database.** Those were
different claims (plan §4.6 says so explicitly); they are now both true.

### 2.1 "Filtered to 0 rows" is the denial, not a weaker version of one

The header hedges — *"0 rows deleted / `new row violates` style denial"* — because it covers two shapes.
**Only the first can occur for DELETE and UPDATE, and it is the correct one.** Under RLS a `DELETE`/`UPDATE`
with no permissive policy has its rowset filtered by the (absent) `USING` clause: there is no candidate row
to reject, so there is nothing to raise about. The `new row violates row-level security policy` error is an
`INSERT`/`WITH CHECK` shape, and **0008's four checks contain no INSERT** (0009's sibling block does — §5).

This matches 0008's design note exactly: *"there is deliberately no 'deny' policy: absence IS the denial."*
A silent 0-row result is what absence-as-denial looks like from the client.

### 2.2 Check 2 is what makes checks 1a/1b mean anything — and only because it ran after them

**A 0-row DELETE is not self-evidently a denial. An empty table returns the same reading.** Taken alone,
1a and 1b are exactly the ambiguity N-26 was registered for: one output, two opposite states, no way to
tell them apart.

The check set escapes that ambiguity, and it escapes it **structurally by ordering**: check 2 ran *after*
1a and 1b, in the same session, and returned the owner's rows. Rows that survive a DELETE aimed at them
were not deleted. Had check 2 run first, the identical four outputs would have proven strictly less.

Recorded because the header's ordering is doing real evidential work and reads like mere presentation.
Anyone re-running these must preserve it.

---

## 3. What check 3 establishes, and what it does not

**Establishes:** `reserve_advisor_tokens` is callable by `authenticated` (so the `grant execute` in 0008 §3
is live), it returns the granted amount, and it applies a cap — the whole sanctioned write path works from
the role that has no direct write. Combined with 1a/1b that is the design's central claim: **the ledger is
writable only through the definer function, and not by the user.**

**Does not establish, and both are registered as N-27:**

1. **The cap check does not isolate accumulation.** `1000` against a budget of `500` is refused by any
   reading — a single request larger than the whole budget fails whether or not prior usage is counted. The
   property the function actually exists for is that *the sum across a day* is capped, and that needs a
   fixture where each request fits and the total does not (budget `1500`, two grants of `1000` → `1000`
   then `0`). The header asked for `0`, and `0` is what came back; the check passes as specified. The
   specification is the narrow part.
2. **`settle_advisor_tokens` was never called.** The four header statements exercise **one** of the two
   `SECURITY DEFINER` functions. OP-2's register summary says *"the two `SECURITY DEFINER` functions work
   and cap correctly"* — its **Exact procedure** column is the authority and this run satisfies it in full,
   so OP-2 discharges; but the summary claims more than the procedure collects.

Neither weakens the discharge. Both are the kind of gap that becomes a false claim once it is summarised
by someone reading only the row title.

**Residue: none.** Every block was rolled back, so the granted 1000 tokens never persisted and the owner's
real daily budget is untouched.

---

## 4. OP-3 is untouched by this run — and could not have been

OP-3 needs **two concurrent sessions**. This was one session, and check 3's two calls ran inside a single
transaction that then rolled back. No second backend ever contended for the row, so **no row lock was
exercised and no serialisation was observed.** The compare-and-set in the `UPDATE … WHERE input_tokens +
output_tokens + p_amount <= p_daily_budget` remains verified only as SQL text.

Stated explicitly because "the reservation function was tested and capped correctly" is one paraphrase away
from being read as the atomicity claim, which is precisely what OP-3 exists to obtain. **Separate sitting,
per the owner.**

---

## 5. Also not run: `0009`'s sibling verification block

`0009_rate_limits.sql`'s header carries its own four owner-run statements against `api_rate_limits` —
`delete` (expect denied), `insert` (expect denied), `select` (expect own rows), and
`select public.consume_rate_limit('user:me', 60, 5)` (expect `1..5` then `0`). It labels itself *"plan §4.6
OP-2's sibling"*.

**No output for those was reported with this run, and there is no register row that would have made their
absence visible.** OP-2's procedure column names `0008`'s statements and only those.

`api_rate_limits` is the schema's **second counter table**, born with 0008's corrected policy shape rather
than acquiring it later — so it carries the same hole, closed the same way, verified by nothing. Its
`insert` check is also the only one of the eight that can produce the `new row violates` error shape
(§2.1), which is worth having observed once.

Registered as **OP-6** rather than folded into OP-2, because §4.6's stated purpose is that these items are
*"listed here, not buried in a file header, so that 'Phase 2 closed' cannot be read as 'these were done'"* —
and a header block with no register row is exactly the burial that section exists to prevent.

---

## 6. Status after this record

| | |
|---|---|
| **OP-1** | ✅ DISCHARGED 2026-08-10 — `2026-08-10-deployed-migration-record.md`. Residual stands: a code rollback leaving `0008` applied reproduces the original failure |
| **OP-2** | ✅ **DISCHARGED — this record.** Ledger policy verified as `authenticated` against the deployed database |
| **OP-3** | **OPEN.** Two concurrent `reserve_advisor_tokens` sessions. Not runnable in one sitting with OP-2; separate sitting |
| **OP-4** | ✅ DISCHARGED 2026-08-10 — `2026-08-10-omniroute-probe-record.md`, with one verdict withdrawn by the OP-1 record |
| **OP-5** | **OPEN — owner condition, pre-deployment.** Gateway provider set (§2.3 rule 15) |
| **OP-6** | ~~**OPEN — new, §5 above.**~~ ✅ **DISCHARGED the same day** — `2026-08-10-rate-limit-policy-verification.md`. All four `0009` checks passed, including the `42501` error shape this record's §2.1 predicted could only come from an INSERT |
| **N-27** | ~~**OPEN — new, §3 above.**~~ **CLOSED IN PART the same day**, same record §3. The **accumulation** clause closed decisively — `reserve_advisor_tokens(1000, 1500)` returned 0, and `1000 ≤ 1500`, so an accumulation-blind implementation would have granted. The **`settle`** clause did NOT close: it was called and returned cleanly, but its effect was unobservable through the fixture used. Residue carried by **N-28** |
| **N-28** | **OPEN — new.** A fixture whose reads cannot see its own writes: the "after" sub-selects shared a statement with the mutating calls, so both returned the "before" values |

> The sentence this record retires: *"the deployed instance has the migration but no evidence the policy
> behaves as intended."* It now has that evidence, for `advisor_usage`. **It does not yet have it for
> `api_rate_limits`, and it does not have it for concurrency.**
