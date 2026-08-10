# Deployed-instance migration record — 2026-08-10

**OP-1 DISCHARGED. OP-2 and OP-3 remain OPEN.**

Where OP-1/OP-2 point (`plan §4.6`): a dated record under `docs/05-qa/`, per the U17 pattern. This is it.
Run by the repository owner against the deployed Supabase instance; recorded here from the owner's report.

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Run by** | repository owner |
| **Instance** | deployed Supabase (not the local gateway of the OP-4 record) |
| **Migrations applied** | `0008_usage_ledger_policy.sql`, then `0009_rate_limits.sql` |
| **Code state** | already deployed **before** the migrations |
| **Repo state** | `main` @ `306ce9f` |

---

## 1. OP-1 — migration/code deploy order

**DISCHARGED. The order held, and it held the way OP-1 specified it.**

OP-1: *"Deploy the application code first, or both together. Never the migration alone. Rolling back the
code without rolling back 0008 recreates the same failure."*

Applied: code already deployed → `0008` → `0009`. That is the "code first" branch, and 0008 preceded 0009,
which matters independently — 0009 creates `api_rate_limits` and `consume_rate_limit`, and nothing in 0008
depends on it, so the reverse order would have left a window with a ledger policy change and no limiter.

**The residual OP-1 names is unchanged and is not discharged by this run:** a code rollback that leaves
0008 in place reproduces the original failure. Applying a migration does not retire its rollback hazard.

---

## 2. The pre-migration failure — PGRST202 on `consume_rate_limit`

Before the migrations were applied, **the advisor returned 500** with PostgREST error **`PGRST202`** on
`consume_rate_limit`.

**Fully explained, and the explanation is mundane:** `consume_rate_limit` is created in
`0009_rate_limits.sql:78`, alongside `api_rate_limits` (`:46`). With 0009 unapplied, the function did not
exist on the instance; `enforceRateLimit` is called on the advisor route **before** the reservation and
before the model call (Phase 2 U5 — the cheapest check goes first), so every advisor request failed at
that call and never reached the gateway at all.

### This is NOT N-22, and no UI evidence attaches to it

Recorded explicitly because the two failures look alike from a user's seat — the advisor does not answer —
and are unrelated in every other respect:

| | PGRST202 | N-22 |
|---|---|---|
| Layer | persistence: a missing SQL function | gateway routing: model behaviour |
| Reached the model? | **No** — failed before the paid call | Yes — a full tool loop ran |
| Symptom | HTTP **500**, no answer | HTTP 200, tool calls, then an **empty** answer |
| Now | **Resolved** by applying 0009 | see §4 — the finding itself is in doubt |

**N-22 carries no UI evidence and must not acquire any from this episode.**

---

## 3. Post-migration verification — advisor works end to end

Verified by the owner **in the UI**, through the gateway, on the deployed instance:

| Model id | Result |
|---|---|
| `cc/claude-haiku-4-5-20251001` | **Works end to end** |
| `auto/best-free` | **Works end to end** |

This is a stronger measurement than anything in the OP-4 record: real tool handlers, real seed data, the
real safety and grounding gates, the real ledger and limiter — not a two-step probe with a fabricated tool
result.

---

## 4. THIS CONTRADICTS THE OP-4 RECORD, AND THE OP-4 RECORD IS THE ONE THAT IS WRONG

The OP-4 record (2026-08-10, §2–§3) verdicts `auto/best-free` **"NOT viable, not even for dev"** on the
ground that its second tool step produced no text. The UI run above shows it answering end to end.

**The measurement wins, and the discrepancy is not smoothed over: the probe's step 3 cannot support the
verdict it was used for.** Its fabricated tool result is

```js
JSON.stringify({ ok: true, data: { note: "probe fixture" }, citations: [] })
```

fed under the system prompt *"You answer only from tool results. Call a tool before answering. **Never
guess.**"*

A model that **correctly obeys** that instruction, handed a tool result containing no answerable content,
has nothing to say — and says nothing. **An empty second step is a plausible CORRECT response to that
fixture, not evidence of a broken round trip.** The clause cannot distinguish the two, and by that reading
`cc/claude-haiku-4-5-20251001` producing text was the *less* obedient behaviour, not the better one.

**What the probe DID establish, and still does:** that the gateway accepts the migrated protocol — an
`assistant` message carrying `tool_calls` followed by one `{role:"tool", tool_call_id}` per call — because
the second request was accepted (HTTP 200, usage reported) rather than rejected. That is OP-4(c)'s actual
question, and it passes for every id tested. Only the *content* clause was overloaded.

**Consequences, all recorded rather than quietly applied:**

1. **N-22 is re-scoped, not merely re-evidenced.** Its sole evidence was this clause. See the plan row.
2. **The model-policy verdict on `auto/best-free` is withdrawn.** It is not "not viable"; it is
   **unassessed against a criterion that could assess it**. It remains **not adopted** — the pinned
   default is unchanged at `cc/claude-haiku-4-5-20251001` — but for want of evidence, not against it.
3. **The probe has a defect**, registered as **N-26**: a fixture that cannot discriminate the property it
   is read as measuring.

**Whose error this was:** the probe is mine, the "NOT VIABLE" verdict is mine, and the criterion it was
scored against was applied by me without noticing the fixture could not support it. It surfaced only
because the owner exercised the real UI.

---

## 5. Still open

| | |
|---|---|
| **OP-2** | The four `0008` header checks, **run as `authenticated`** (a superuser session bypasses RLS and reports a false pass). **NOT RUN** — no output was provided with this report. Owner will run it in a later sitting |
| **OP-3** | Two concurrent `reserve_advisor_tokens` sessions against a budget admitting one. **NOT RUN**, same sitting as OP-2 |
| **OP-1 residual** | A code rollback leaving `0008` applied still reproduces the original failure |
| **N-22** | Re-scoped — see the plan |
| **N-26** | The probe fixture defect |

> Applying a migration is not the same as verifying the policy it installs. **`0008`'s whole subject is
> that the ledger must not be user-writable**, and that property is exactly what OP-2 checks and what
> nothing here has checked. Until OP-2 runs as `authenticated`, the deployed instance has the migration
> but no evidence the policy behaves as intended.
