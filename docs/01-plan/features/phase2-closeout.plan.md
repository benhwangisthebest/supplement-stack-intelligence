# phase2-closeout — PDCA cycle artifact for the Phase 2 closeout

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for the **closeout** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's **§10 Closeout** is the authoritative record. This file carries **no
> approval status of its own**, and **mirrors the register rather than replacing it** (standing rule,
> 2026-09-18).
>
> **Project**: Supplement Stack Intelligence Platform
> **Cycle**: Phase 2 closeout — §8 re-derivation, register re-derivation, two binding guards, phase report,
> independent Check
> **Date**: 2026-09-22 · measurements re-derived 2026-09-21 against `main` @ `82f9109`
> **Status**: cycle artifact — the phase plan's **§10 is AWAITING OWNER APPROVAL**. Nothing is implemented.
> **Method**: bkit PDCA (plan → design → do → check → report)
>
> **Checkpoint note.** The bkit `plan` action's two interactive checkpoints (requirements confirmation,
> clarifying questions) are **satisfied in advance** by the owner's CLOSEOUT RULINGS block of 2026-09-22,
> which specifies every criterion disposition, both guard shapes with their mutations, every register
> action, all six classification changes, the residue list and the four-landing sequence. Re-asking them
> would be ceremony, not verification.

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | Phase 2 landed 28 units and cannot be closed by assertion. Four things are measurably untrue at `82f9109`: two §8 check texts are literal greps that **comments** can fail while their guards are green; the FU register **skips 29, 30 and 31** although all three were promised in writing; eight N rows name an owner whose unit has since landed and were never re-dispositioned; and the roadmap still reads *"Phase 2 — not started."* C18 owes two binding guards that do not exist. |
| **Solution** | Four landings on the standard path with separate approvals. **(a)** the two binding guards — §8↔roadmap criterion parity and the architecture-spec count — each shown red. **(b)** the §8 and register re-derivation plus the phase report. **(c)** an independent four-reviewer Check against (b)'s pushed SHA, this session clerk only. **(d)** the Check's findings, six classification changes, the roadmap phase-status line and `CLAUDE.md` §5's baseline. |
| **Function/UX Effect** | **None.** No product behaviour changes. Landing (a) adds two vitest specs under `src/architecture/`; (b)–(d) are documentation. |
| **Core Value** | The phase closes on measurements that were re-derived rather than re-typed, and the two claims that were prose in two places with nothing between them become executable — which is the property C18 asserts for the register, applied to the criteria list and to a count. |

---

## Context Anchor

| | |
|---|---|
| **WHY** | A green suite is not a closed phase (`CLAUDE.md` §5). Phase 2 shipped the guards; the closeout is where the *claims about them* are re-measured, and where two of them stop being prose. |
| **WHO** | The repository owner, who approves each landing; the four independent reviewers who own §§ of the Check; this session, which measures and clerks and authors no verdict in (c). |
| **RISK** | Re-typing a figure instead of re-deriving it — the exact failure C18 was written against (FU-22's figures survived U13→closeout unchallenged). Second risk: a parity guard that passes vacuously, the `LINT_SCOPE` M1c shape. |
| **SUCCESS** | 19 §8 criteria each with a check that a comment cannot fail; FU contiguous 1–38; every N row dispositioned or explicitly re-owned with a date; both guards red-proven; the Check's findings landed. |
| **SCOPE** | **In:** §8, §4.3–§4.6, two `src/architecture/` specs, `docs/04-report/phase-2-*.report.md`, `docs/reviews/phase-2-closeout-check.md`, `docs/project-status.md` §3, `docs/roadmap.md`, `CLAUDE.md` §5. **Out:** any product feature; any new unit; OP-5's account facts (owner-held, not closeable here). |

---

## Landings and their gates

| | Landing | Gate |
|---|---|---|
| **(a)** | `feat` — `criteria-parity.test.ts` + `spec-count.test.ts`, both red-proven | GATE D1 **does not apply** (no CI step added); discharged by a zero-line diff against `.github/workflows/ci.yml`, stated |
| **(b)** | `docs` — §8 + register re-derivation, `docs/04-report/phase-2-operational-dependability.report.md` | C3, C16, C17, C18 close here by construction |
| **(c)** | `docs` — independent Check against (b)'s pushed SHA, `phase-1-closeout-check.md`'s shape | Four reviewers, one section each; this session authors no finding and no verdict |
| **(d)** | `docs` — Check findings, classification refresh, roadmap status line, `CLAUDE.md` §5 baseline | Baseline **re-measured at (d)**, not copied from (b) |

Each landing takes its own approval to commit, push and merge (`CLAUDE.md` §10 rule 5).

---

## Landing (d1) — remediation plan. **NOTHING BELOW IS IMPLEMENTED.**

**Dated 2026-09-22.** Three remediations, not four: the **P2-7 probe settled it** (below). Each is
red-first, mutation-shown, and carries its GATE D1 status.

### P2-7 — SETTLED BY PROBE. Not a remediation.

**Probe run `35700784778`, SHA `b9dc6fb`, branch `probe/p2-7-rls-widening` — pushed, run, deleted
unmerged.** It carried only M-B's in-place widening of `api_rate_limits` (`for select` →
`for all … with check`, no `drop`/`alter`/`disable`).

| Step | Result |
|---|---|
| **Unit and architecture tests** | **success** — `RLS_COVERAGE` green on the widened tree, exactly as M-B showed (22/22 locally on the same commit) |
| **Migration coherence** | **FAILURE** — `##[error]Process completed with exit code 1` |
| Build · Rendering determinism · Playwright · E2E | skipped |

**Verbatim, from run `35700784778`:**

```
verify:migrations — COUNTER TABLE WIDENED — "api_rate_limits" carries a write policy:
read_own_api_rate_limits (ALL).

This is finding N-16. A user who can write this table can reset the
limit it exists to impose: deleting an `advisor_usage` row clears the
daily token budget, and deleting an `api_rate_limits` row clears the
rate limit. Writes belong in `SECURITY DEFINER` functions, which is what
migration 0008 established and 0009 applied at birth.

NOTE FOR WHOEVER SEES THIS FAIL: `rls-coverage.test.ts` is very likely
still green. It reads the migration TEXT and its policy pattern discards
the command clause, so a widening policy is invisible to it. That is the
reason this assertion lives here against `pg_policies.cmd` instead.
```

**Disposition, per the owner's rule: the CI step is the control.** U15 predicted this failure **in its own
failure text**, named the guard that would stay green, and said why the assertion lives against
`pg_policies.cmd` instead. The probe did not discover a gap — **it confirmed a control, and confirmed that
the control's author had already described the exact hole the Check later found independently.**
`FU-40` is registered at (d2) for `RLS_COVERAGE` to see it too. **P2-7 does not join (d1).**

*(Worth its line: the Check found P2-7 by mutation and called `RLS_COVERAGE` blind. Both are true. The
repository was never unguarded — the guard that covers it is one CI step away and was built for this
reason. A finding can be correct about a guard and wrong about the system.)*

---

### P2-R1 — every 5xx reaches the logger (P2-1)

**Defect.** Three sites answer 5xx and return before `logInternalError()` runs, so those responses carry no
server-side log entry and no correlation id — while `[P2-X1]`/R1 claims *"every 5xx has a correlating
server-side log entry with a request ID"*.

| Site | Shape |
|---|---|
| `src/lib/api/respond.ts:272` | `NotConfiguredError` caught **inside** `handle()`'s catch; returns `fail("NOT_CONFIGURED", err.publicMessage, 503)` before reaching `internalError()` |
| `src/app/api/advisor/route.ts:101` | `fail("NOT_CONFIGURED", AI_SERVICE_NOT_CONFIGURED, 503)` — returned before `handle()` is entered; this route's `POST` is not wrapped |
| `src/app/api/lab-import/extract/route.ts:91` | a **local** `try/catch` intercepts `ExtractionError` → `fail("EXTRACTION_FAILED", …, 502)`; `handle()`'s outer catch never sees it |

**Approach — `fail()` logs by construction at status ≥ 500, rather than routing three sites by hand.**
Three hand-routed sites is three things to remember; a status-keyed rule in `fail()` is one thing that
cannot be forgotten, and it governs the fourth site nobody has written yet. *(§3 rule 5's ceiling — the
difference between a rule that is checked and a rule that cannot be broken, which is the same argument
FU-33 makes against U30's guard.)* **`422` and every 4xx are unaffected** — the threshold is the criterion's
own word, "5xx".

**Guard: `FIVE_XX_IS_LOGGED`.** Asserts no 5xx response is constructed outside the logging path; inventory
of 5xx construction sites asserted **non-empty** and pinned. **Red-first evidence: the three sites as they
stand today** — the guard must name all three before the fix, which is the strongest available proof it
is not measuring itself.

**Also in this landing:** `[P2-X1]`'s Check clause names `src/lib/api/respond.test.ts`'s **T2** explicitly,
so the mechanism that proves the logging half is pointed at by the criterion `CRITERIA_PARITY` reads.
**Files:** `src/lib/api/respond.ts`, `src/app/api/advisor/route.ts`,
`src/app/api/lab-import/extract/route.ts`, `src/architecture/five-xx-is-logged.test.ts` (new),
plan §8. **GATE D1: does not apply** — no CI step; discharge with a zero-line `ci.yml` diff.
**Note: this adds a 27th architecture spec, so `SPEC_COUNT`'s four sites move 26 → 27 in the same commit.**

---

### P2-R2 — `DOC_TRUTH` validates named-guard tokens (P2-4)

**Defect.** `readRuleTable()`'s id capture is `/\bB\d+[a-z]?\b/g`, so rows naming **derived-set guards**
are never checked against anything. **M-G:** renaming `PAID_API_BUDGET` in `CLAUDE.md` row 9 to a fictional
token left `Tests 21 passed (21)` — fully green.

**A design constraint found before building, which changes the guard's shape.** The naive rule — *every
named-guard token in §4's table must be an `it()` title in `src/architecture/`* — **would go red today on
correct documentation.** Measured: §4's table names five tokens (`DOMAIN_IS_PURE`, `PAID_API_BUDGET`,
`PAID_PACKAGES`, `RETIRED_PACKAGE`, `SOLE_PAID_CLIENT`), and **`PAID_PACKAGES` is not a test title** —
`grep -c 'it("PAID_PACKAGES' src/architecture/boundaries.test.ts` → **0**. It is a `const` at
`boundaries.test.ts:923`, cited by row 9 as the *marker set*, which is a true and useful thing for the row
to say.

**So the guard resolves a token against either an `it()` title or a declared identifier in
`src/architecture/`**, and asserts the resolved set is non-empty. A token that is neither is the failure.
*(The alternative — forcing every cited token to be a test title — would make the documentation worse to
make the guard simpler.)*

**Red-first: M-G verbatim.** **C7 then becomes MET on its own justification** rather than on a
justification that does not establish it. **Files:** `src/architecture/doc-truth.test.ts`, plan §8.
**GATE D1: does not apply.**

---

### P2-R3 — the service-role key has a reader ratchet (P2-12)

**Defect.** `CLAUDE.md` §2.3 rule 14 is **rank-1** and holds today only by convention and grep.

**A design constraint found before building, and it is C1/C5's lesson recurring inside the fix for it.**
`git grep -ln "SUPABASE_SERVICE_ROLE_KEY" -- src/ scripts/` returns **two** files:
`src/lib/db/seed.ts` **and** `scripts/probes/load-env.ts`. The second is **not a reader** — it mentions the
key in a comment explaining why it deliberately does *not* load it:

> *"`.env.local` on a developer machine also carries `SUPABASE_SERVICE_ROLE_KEY`. `CLAUDE.md` §2.3 rule 14
> confines that key to the dev seed script, and a general-purpose loader would put it into the environment
> of every probe process for no reason at all… So this reads the file and exports ONLY names matching
> `OPENAI_`."*

**A grep-based ratchet would pin two files, one of which exists to exclude the key** — and would redden if
that comment were ever improved. **The guard must key on a read** (`process.env.SUPABASE_SERVICE_ROLE_KEY`
or equivalent access), **not a mention.** This is exactly the defect C1 and C5 were struck for, appearing
in the remediation for a different finding, and it is the reason this constraint is written down before any
code rather than discovered by a false red.

**Pinned set: exactly one file**, `src/lib/db/seed.ts`. **Red-first: a planted read in `src/lib`.**
**Files:** `src/architecture/service-role-confinement.test.ts` (new), or an assertion added to
`boundaries.test.ts` beside `SOLE_PAID_CLIENT`'s reader ratchet, whose shape this mirrors.
**GATE D1: does not apply.** **If written as a new spec, `SPEC_COUNT` moves again — see the note below.**

---

### Cross-cutting: the spec count moves, and the guard is why we know

P2-R1 and possibly P2-R3 add architecture specs. `SPEC_COUNT` pins **26** and binds four documented sites,
so **(d1) must move all four in the same commit** or land red. **This is the guard working as designed** —
the count cannot drift silently any more — and it is the first time it constrains a landing rather than
recording one. The exact target (27 or 28) depends on whether P2-R3 is a new spec or an addition to
`boundaries.test.ts`; **P2-R3's placement is the one open design question in this block.**

### Verification for (d1)

`npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npm run test:coverage` · `npx next build`, plus
each guard shown red then green, and `git diff -- .github/workflows/ci.yml | wc -l` → **0** for GATE D1.
`ecc:code-reviewer` on the diff. `ecc:security-reviewer` **is** warranted this time, unlike (a):
**P2-R1 changes a response path and P2-R3 touches a rank-1 credential rule.**

---

## Registered for (d2) — findings raised by landing (d1) itself

### N-75 — `readsIdentifier` terminated at the first substitution template, blinding all four credential ratchets

**Raised 2026-09-22 by P2-R3's red proof failing to redden. Owner: registered here, fixed in (d1).**

`readsIdentifier` in `boundaries.test.ts` was a raw `ts.createScanner` loop. Bare `scan()` carries no
template-continuation state, so after a `TemplateHead` it mis-tokenises and **stops**. Everything after the
first `` `x ${…}` `` in a file was invisible to it. Two-line repro:

```ts
const a = `x ${1} y`;
const k = process.env.SUPABASE_SERVICE_ROLE_KEY;   // NOT detected
```

Remove the template and the same read **is** detected. In the real case the scan died at token **964**; the
planted read sat at offset **18552**.

**Blast radius — four pins, all of them credential ratchets:** `OPENAI_API_KEY` and `OPENAI_BASE_URL` (both
halves of the paid boundary), `OPENAI_MODEL`, and the `SUPABASE_SERVICE_ROLE_KEY` pin P2-R3 was adding.
Every one was **narrower than it claimed**: a module reading any of those after a substitution template was
governed by nothing.

**It was certified sound.** `ecc:security-reviewer` verified the paid-boundary ratchets at landing (c) and
reported **64/64 green**, and `ecc:code-reviewer` reviewed `boundaries.test.ts` at (a). Neither could have
seen this: the helper's own eight self-test fixtures are all **comment-shaped** — the class of input that
motivated the tokenised scan in the first place — and not one contains a template literal. **The guard was
hardened against the last bug and blind to the next one, and its self-tests encoded that history.**

**How it surfaced:** not by review and not by reasoning. P2-R3's red proof planted a real read in
`src/lib/safety/index.ts` and the new pin **stayed green**. Tracing that rather than accepting it is the
whole of the finding — a red-first proof that does not go red is a result, not a formality.

**Fixed in (d1)** by rewriting the helper as a `ts.createSourceFile` AST walk (no continuation state to
lose; comments are not nodes, so reads-not-mentions holds by construction rather than by a stripper), with
**two regression fixtures** added to the self-test block. Verified old-vs-new: *"a read AFTER a template
literal with a substitution"* → old `false`, new `true`. *(The second fixture, a read **inside** a
substitution, the old scanner already caught — recorded because only the first is load-bearing.)*

**(d3) ADDENDUM OBLIGATION, and it is not optional:** the certifier must state that **(c)'s security
section could not have seen this**, and **re-verify the four ratchets on the rewritten helper**. A
certification that reported 64/64 against a detector with this hole is a claim about the detector as much
as about the ratchets, and the addendum is where that gets said.

### FU-43 — `src/middleware.ts`'s unguarded `getUser()`

**Raised 2026-09-22 by `ecc:security-reviewer`'s (A) enumeration at (d1).** `updateSession()` calls
`supabase.auth.getUser()` with no `try`/`catch`; a throw — network failure, malformed cookie — surfaces as
a framework-level edge response that never reaches `fail()` or `logInternalError`. **Edge runtime, outside
`handle()`'s reach**, so neither the new `fail()` rule nor `FIVE_XX_IS_LOGGED` can govern it.
**Owner: the phase that adds a logging sink**, carried alongside **N-11** and U23's cut residue — the same
owner, because it is the same missing piece seen from a third direction.

### `[P2-X1]` is re-worded at (d2), not re-ticked as-is

Its current text claims *every* 5xx. After (d1) the true statement is: **every 5xx the application
constructs carries a correlated record**, with two declared exceptions —
**`NOT_CONFIGURED`** as an operational state (U1's ruling, pinned by T5 and by `NOT_CONFIGURED_TOTALITY`'s
byte-identity assertion) and **framework-generated 500s outside route handlers** (FU-43, and the
`advisor/route.ts` window P2-R4 closes at (d1b)).
