# Phase 2 — Operational Dependability: closeout report

**Date:** 2026-09-22 · **Plan:** `docs/01-plan/phase-2-operational-dependability.plan.md` (Approved 2026-08-08)
**Baseline at Phase 1 close:** 859 tests / 73 files · 7 architecture specs
**At Phase 2 close: 1420 tests / 113 files · 26 architecture specs · lint 368 of 368, 0 errors**
**Verdict: COMPLETE WITH FOLLOW-UP.** Every exit criterion is met. **OP-5 is OPEN** and cannot be closed
from inside this repository; twelve residues are carried with an owner or a written owner-condition.

> **This report is compiled, not re-run.** §3's red evidence **cites** the per-unit mutation tables written
> at execution time and the owner-run records in `docs/05-qa/`; it does not re-execute them. That is
> deliberate — a mutation is meaningful at the moment the guard is written, against the code it was written
> for. Re-running one at close against a tree four months later proves something weaker and reads as
> something stronger.
>
> **The independent Check is `docs/reviews/phase-2-closeout-check.md`**, verified against this report's
> pushed SHA by four reviewers each owning a section. It is **not** authored by the session that wrote this
> report, which acted as clerk only.

Figures here are dated snapshots. **CI is the authority for any given commit** — the `push`/`main` run on
that SHA, not this document.

---

## 1. What the phase was for

The objective was **operational dependability**: making failures visible, bounded, and diagnosable. Phase 1
had proved the product was verifiable; nothing had yet proved it was survivable.

**The phase was reshaped before its first unit ran, by a finding made while orienting.** The advisor's token
ledger — `advisor_usage` — shipped in migration `0003` with the same policy shape as every user-owned
content table: `for all using (user_id = auth.uid())`. `for all` covers DELETE. The anon key ships to the
browser by construction and PostgREST is directly reachable, so **any authenticated user could delete their
own ledger row and reset their daily token budget to full, repeatedly, against a paid API.** RLS was working
exactly as written; the policy was wrong.

That finding set the phase's real subject: **a counter that constrains the user it belongs to is not
content**, and the difference had never been expressed anywhere the system could enforce it. Everything
downstream — the `security definer` writers, the atomic reserve-then-settle, the rate-limit table, the
budget guard derived from the import graph — follows from it.

Source: plan §1, §2.

---

## 2. Unit-by-unit outcomes

**31 units proposed, 28 landed, 3 cut.** The gross count rises while work in flight falls, which is what
append-only numbering does and why the live count is stated beside it rather than left to subtraction.

**Cut, in order: U11, U21, U23.** Each cut is dated with its reason in plan §9; none was silently dropped.
**U23's cut has a consequence that outlived it** — it was the owner of N-11's closing condition, so that row
spent eight days open against a unit that would never exist (§9, and the register's N-11 row).

**Four units were created by a review finding rather than by the plan** — U26, U29, U33 and U34. That is the
measurable form of the claim that the review step pays for itself: a quarter of the phase's late units exist
because someone read a diff adversarially.

**Two units changed the paid provider**, and the port did not move (§5).

Source: plan §5's per-unit DONE blocks and STAMP ROWs, §9.

---

## 3. Red-evidence record (exit criterion C17)

**359 `M<n>` mutation references across the plan.** This section is an **index of evidence produced at
execution time**, compiled from the per-unit red tables and from `docs/05-qa/`. Nothing here was re-run for
this report.

### 3.1 Route and engine units

The two that mattered most, both from **U4**, because they are the phase's founding finding made executable:

| Mutation | Target | Verbatim red |
|---|---|---|
| **M14** | race 1 — `getRemainingBudget` → `recordUsage` | `expected [400,400,400,400,400] to have a length of 2 but got 5` |
| **M15** | race 2 — select-then-upsert **inside** `recordUsage`, which *lost* usage | `expected 300 to be 600` |

**The fake is stateful and yields at the start of every operation.** Without that yield the old
implementation passes too and the test proves nothing — Phase 1 U10's §6.2.2 lesson applied rather than
quoted. This is the evidence exit criterion **C3** names.

Further route and engine reds are tabulated per unit in the plan: U1/U2 (error disclosure), U12
(404 uniformity), U16/U17 (export and deletion), U29 (pre-spend ownership), U30 (path-param validation, red
at all fourteen positions), U34 (partial-failure reporting).

### 3.2 Architecture guards

Every guard added this phase went red against the defect it targets before it was believed. The ones whose
red text changed a design rather than confirming one:

- **M8 (`RLS_COVERAGE`, U3)** — proven red **both `git add -N` ways**: unstaged 22 passed; staged named the
  table *and* the migration. The staging asymmetry is why the guard reads the repository rather than the
  working tree.
- **M6 (`error-disclosure`, U2)** — a planted read in `stack-evaluator/rules.ts` was kept and only
  `SCANNED_FILES` reverted → **31 passed**. Proof that the *extension* does the work, not something
  pre-existing catching the plant.
- **M1 / M1c (`LINT_SCOPE`, U18)** — red at **356 of 356 unlinted** against `ignores: ["**"]`; and **M1c
  produced a green run reporting "39 of 39" with 316 files unlinted**, which is why the expected set is
  derived from `git ls-files` and never from `eslint.config.mjs`.
- **M5 (`SOLE_PAID_CLIENT`, U25)** — red against an inline `fetch` in a route, the case an import graph
  cannot see.
- **M7 (`SOLE_PAID_CLIENT` address half, U32)** — the red that made N-66 a finding rather than a nit.
- **M16 (usage settlement, U25)** — red against defaulting absent `usage` to zero.
- **M1–M4 (`CRITERIA_PARITY`, `SPEC_COUNT`, landing (a))** — plan §10.10. **M1's message reproduces the
  repository's actual state at `82f9109` down to the id.**

### 3.3 Surviving mutations — recorded, not fixed

Stated because a guard's limits belong beside its evidence:

- **`RLS_COVERAGE` does not judge whether a rewritten policy is weaker than the one it replaces.** That is
  SQL semantics; this is text. The guard makes the event impossible to land silently and forces a human
  sentence about it — it does not evaluate the sentence.
- **`ROUTE_CONTRACT`'s validating/non-validating split is a `.parse(` literal match** (N-14's class), so a
  hand-rolled validator surfaces as a **false exemption someone had to justify**, not as a silent gap.
- **`SPEC_COUNT` deliberately does not bind per-file test counts.** Those were dropped instead (FU-39).
- **The live-E2E serialisation in `playwright.config.ts` is guarded by nothing** — removing it breaks no
  test. Tracked as FU-25, whose real fix is per-worker user isolation.

---

## 4. Guard inventory

**7 → 26 executable architecture specs** across Phases 0–2; **366 tests in `src/architecture/` alone**.

The phase's additions, by what they bind: `RLS_COVERAGE` and `SQL_FUNCTION_REGISTRY` (migration text),
`PAID_API_BUDGET` and `SOLE_PAID_CLIENT` and `RETIRED_PACKAGE` (the paid boundary), `ROUTE_CONTRACT`,
`LINT_SCOPE`, `LIVE_TAGGING`, `SECURITY_HEADERS`, `NOT_FOUND_UNIFORMITY`, `PATH_PARAM_VALIDATION`,
`RENDERING_DETERMINISM`, `MIDDLEWARE_SCOPE`, `FIRST_PARTY_BASE_URL`, `NOT_CONFIGURED_TOTALITY`,
`ENV_STUB_ISOLATION`, `E2E_BROWSER_PARITY`, `EXPORT_COVERAGE`, `UI_ERROR_TEXT`, `MIGRATION_TOOLING`,
`NAV_PILLARS`, `LINT_CONFIG`, and at this closeout `CRITERIA_PARITY` and `SPEC_COUNT`.

**Two shapes are worth distinguishing, because the phase learned the difference:**

- **Ratchets** (`DOMAIN_IS_PURE`, `UI_ERROR_TEXT`, `SOLE_PAID_CLIENT`'s reader pins) — an allowlist that can
  only shrink, with a test asserting each entry still violates, so the list cannot rot into decoration.
- **Derived sets** (`PAID_API_BUDGET`, `LINT_SCOPE`, `SPEC_COUNT`, `ROUTE_CONTRACT`) — membership computed
  from the repository, so a new instance is governed **the day it is written** rather than the day someone
  remembers to list it. `PAID_API_BUDGET` found `/api/lab-import/extract` missing a control on the day that
  route was written.

**The count itself is now guard-bound.** `SPEC_COUNT` derives N from `git ls-files` and asserts it at all
four documented sites, retiring five stacked date brackets.

---

## 5. The provider migrated twice, and the port did not move

`@anthropic-ai/sdk` → Omniroute (**U25**) → **OpenAI first-party** (**U31**). Two wire protocols, five
guard sites, 21 tracked files, and **the `ClaudeAdapter` port in `src/types/advisor.ts` is byte-identical
across both.** The Domain agent loop never learned that the provider changed.

**What the pair taught, and it is now recorded in `CLAUDE.md` §4 row 9:** the *kind* of marker that draws
the paid boundary tracks **how the provider is reached**, not **who the provider is**. A package marker
works when the SDK is imported; a gateway or first-party API reached over plain `fetch` has no package to
import, so the boundary must be drawn by a **named module** instead — with `SOLE_PAID_CLIENT` beside it,
because an inline `fetch` is invisible to an import graph. `PAID_PACKAGES` is now **empty** and one module
marker governs both paid routes.

**The seam is why `docs/project-status.md` §3 keeps its ports-and-adapters row at P** — and why the row's
file name had to be corrected at this closeout: it named `claude-adapter.ts`, which no longer exists.
The stale *type* name is registered as **FU-36**, unbuilt, with the case for accepting it recorded.

---

## 6. Deliberate behaviour changes

Five, each declared before implementation rather than discovered in a diff:

1. **U12** — one 404 message per route class; the per-route oracle removed.
2. **U29** — `POST /api/advisor` checks conversation ownership **before** it spends. A foreign
   `conversationId` previously reached the paid model call and failed afterwards, inside the committed
   stream.
3. **U30** — a malformed UUID path segment answers **400 before any I/O**, at all fourteen positions. It had
   been a 500-with-a-correlation-id for what was really a 400.
4. **U34** — a post-commit failure reports the **state it left**: `ACTION_ERROR` + `rolledBack: true` when
   every inverse succeeded, `PARTIALLY_APPLIED` + counts when one did not. The undo route joined `handle()`.
5. **U3 + U4 together** — the ledger's write path moved from a direct table write to two `security definer`
   functions. **This one is a deployment-order hazard, not just a behaviour change**, and is recorded as
   OP-1: applying `0008` to a database whose code still writes the table directly makes every advisor turn
   fail *after* the paid call.

---

## 7. OP-5 — OPEN, and what it does not let this phase claim

**Six of seven owner-run operational items are discharged**, each against a dated record in `docs/05-qa/`.
**OP-5 is open.**

The production gateway's provider set must be restricted to real API-keyed providers before any deployment
carries user traffic — advisor traffic carries medications, conditions and lab values. U32 closed OP-5's
**code** half (N-63: the base URL is first-party by construction, parsed and host-allowlisted, with the
override loud). The record `docs/05-qa/2026-09-18-op5-provider-record.md` carries the provider's terms with
URL and read-date. **Three account facts remain UNKNOWN**, and the DPA page returned **HTTP 403** on
2026-09-18, so even the standard terms could not be read from here.

**What this forbids the phase from claiming:** that the provider-side handling of user health context is
established. It is not. This is Phase 2's analogue of Phase 1's U17 — a criterion whose remaining half
needs something no agent can supply, stated rather than rounded up.

---

## 8. Exit criteria, row by row

**19 criteria — 18 at the plan's approval, plus `[P2-X6]` added at this closeout** when the re-derivation
found a roadmap criterion that §8 had never tracked. **All 19 met.**

Full table with per-criterion evidence: plan §8 and §10.2. Four are worth surfacing here:

- **C1 and C5** — met by their guards; **their written checks were struck** at this closeout under §7. A
  check a comment can fail was never a check: C1's negated grep reddens on the comment block explaining the
  rule its migration implements, and **C5's could not be satisfied at all while `RETIRED_PACKAGE` exists**,
  because one of its nine hits is the matcher literal the guard compares against.
- **`[P2-X6]`** — the reference-ID manifest. **Met before Phase 2 opened**, by Phase 0 U8, and tracked in
  the roadmap only. §8 did not know the obligation existed.
- **`[P2-X7]`** (C15) — met 2026-08-12, ticked 2026-09-22. The roadmap's copy had been ticked for thirteen
  months.
- **C16** — ticked **conditionally**, on this report's pushed SHA's run, which (c) confirms.

---

## 9. Follow-up register — final state

~~**N-1 … N-74 · OP-1 … OP-7 · FU-1 … FU-39.** Contiguous, no gaps, no duplicates, every row re-derived.~~

**[2026-09-22, (d2)] RESTATED, and the original was false in a way the Check had to find.**
**N-1 … N-77 · OP-1 … OP-7 · FU-1 … FU-46 — contiguous, no gaps, no duplicates**, re-derived at (d2) by a
section-bounded parse. **Four of those rows were written LATE, and one was found by the Check** (P2-13):
**FU-32** had been cited thirteen times as the authority for dropping a number rather than correcting it,
and no row existed to read. The sentence above claimed *every row re-derived* over a row that was never
written. **That is the promise-shaped disposition the closeout had just finished fixing for FU-29, FU-30
and FU-31 — a fourth number issued the same way, in the landing that fixed the first three, and caught
only because an independent reviewer parsed the register instead of reading the headline.**

*(Late-registered: **FU-32** at (d2) on P2-13; **FU-39** at (b) on landing (a)'s own diff; **N-75** at (d1)
by a red proof that failed to redden; **N-76** at (d1b) by a guard refusing to pass. Added at (d2):
**FU-40…FU-46**, **N-77**.)*

**The register's own failure is the headline, and it is recorded rather than repaired quietly.** FU-29,
FU-30 and FU-31 were each promised by the formula *"Register as FU-nn"* inside another row's disposition
cell — **and no row was ever written.** Two of the three left no trace beyond the promise.

**The mechanism:** a promise-shaped disposition reads like an action and is not one. Four numbers were
issued that way; FU-32 survived because a unit opened the file it named, FU-31 because a guard header
recorded it. **Nothing distinguished the four when they were written.** All three missing rows are written
at this closeout, **dated as late-registered rather than backdated**, so the gap stays visible in the
register that failed to prevent it.

**And the mechanism reproduced itself during the fix.** §10.3 recorded two further per-spec-count sites and
said they would be registered — then did not write the row. `ecc:code-reviewer` caught it on landing (a)'s
diff; it is **FU-39**, and it was dropped rather than corrected.

Also at this closeout: eight stale N rows re-dispositioned against their landing commits, **N-11 re-owned**
after U23's cut made its closing condition unreachable, **N-50** deferred to Phase 4 as a product decision,
**N-52** closed in both halves by different remedies, **FU-35…FU-38** accepted as registered from U31's
C-table, U25's stale N-22 summary dated against the register that withdraws it, and two table print-order
anomalies noted (§4.6 reordered; U31's C-table left in place and annotated).

---

## 10. What survives the phase

**Fourteen** residues, each with an owner or a written owner-condition. Full table: plan §10.7.

> **[2026-09-22, (d2)] Check finding P2-2 — this section's opening was FALSE, and the mechanism is worth
> more than the correction.** Plan §10.7's header (*"every row has an owner or a written owner-condition"*)
> was true of the twelve rows in that table. **This section promoted it into a claim about the phase**, and
> two OPEN register rows were in neither: **N-69**, security-relevant and the only open row anywhere with
> no owner at all, and **N-40**, directly §2.3 rule 15. Both are now residues; N-69 has an owner-condition.
> **What generalises: a true statement about a table becomes a false statement about a phase simply by being
> quoted one level up**, and nothing in this project's apparatus compares a summary against the thing it
> summarises. **This section holds the residues that CONSTRAIN future work — not every open register row.**
> There are at least eleven more, each with a written reason, in plan §4.4/§4.5.

**The ones that constrain future work rather than merely awaiting it:**

- **OP-5** — three UNKNOWNs, DPA 403. **Owner: the repository owner.**
- **N-70** — U29's ownership guards are check-then-act beside `appendMessages`, which folds ownership into
  the write. The window has no adversary **because nothing transfers or shares a conversation**. This is a
  **gate**: any future proposal to make conversations transferable or shareable must cite N-70 and close it
  first, and the person proposing that feature is the only one positioned to notice.
- **N-25** — PDF transcription accuracy is measured on **clean image-only renders**, never on scans. Claims
  must say so. **No synthetic substitute closes it** — the artefacts a render cannot produce are the point.
- **FU-34** — nothing renders `PARTIALLY_APPLIED`. **N-71 is MITIGATED by U34, not closed**: the server can
  now say it truthfully and the user is still never told.
- **U23's sink + N-11** — carried together, because they are one piece of work seen from two directions.
  **[(d2)] FU-41, FU-43 and FU-44 join them**: health-bearing error text, the middleware's unguarded
  `getUser()`, and the three surfaces `handle()` never reached. All four want the same sink.
- **N-69** — `recordBatch` can stamp another user's `advisor_actions.conversation_id`. **SECURITY-RELEVANT.**
  **[(d2), on P2-2]** **Owner-condition: the next unit touching `recordBatch` or the `advisor_actions`
  schema.** Latent only because there is one writer and conversations cannot change hands; **a second
  writer, or a transferable conversation, makes it live** — the same gate shape as N-70.
- **N-40** — nothing structurally prevents health-bearing error text reaching a log record. **§2.3 rule 15**,
  STRUCTURAL, no leak observed. **[(d2), on P2-2]** Registered as a class in **FU-41**.

---

## 11. Deferred to Phase 3

Phase 3 is **evidence grounding** — the Library's central claim. It inherits:

- **The ID contract, already built** (`[P2-X6]`), which `docs/roadmap.md` names as its prerequisite: the
  manifest must exist before any seed-ID renaming begins. It does.
- **FU-29** — the 13 uncast-checked `mappers.ts` sites, which want a migration against a deployed database
  and 13 value-domain decisions. Sequenced after U15's apparatus, which exists to verify exactly that.
- **The unenforced §4 rules** — rule 7 (client components take props) would fail today on **8 of 31**
  *([2026-09-22, P2-9] ~~7 of 31~~ — this section repeated the figure unmeasured; re-derived at (d2) with the
  predicate now stated in `CLAUDE.md` §4)*
  components; rule 8 has no general mechanical form.
- **N-50 → Phase 4**, not Phase 3: a product decision about the API's voice.
- **U-DEFER-4 — and Phase 3 cannot satisfy its own UI criterion without deciding it first.**
  **[2026-09-22, (d2), Check finding P2-6.]** Roadmap Phase 3's criterion *"every surface that can show
  partial coverage states its coverage limit; **test-verified**"* needs a component-test harness that does
  not exist: `vitest` collects `src/**/*.test.ts` under `environment: "node"`, so a `.test.tsx` cannot run,
  and `HARNESS_GAP` hard-fails any tracked one. U-DEFER-4 is still unmet by dated exception, and its
  owner-condition names *"the phase that introduces component testing"* — which the roadmap places in
  **Phase 4**. **So Phase 3 inherits a criterion whose verification method is owned by Phase 4.** It was in
  plan §10.7's residue table and absent from this section — the one a Phase 3 planner reads.
  **Two ways out, and choosing is the owner's, not this report's:** Phase 3 opens by building the harness,
  or Phase 3's UI criterion is re-sequenced. **Naming the conflict is what was owed.**

**What Phase 3 must not inherit quietly:** OP-5. Content grounding does not touch it, and a phase boundary
is where an open operational item becomes invisible.

---

## 12. What the phase learned about its own method

Four classes recurred often enough to be method rather than anecdote. Each is counted, because a class with
one instance is a story.

### Says-vs-does — **3 instances**

A document asserted a property the code did not have, and nothing compared them.

**N-48**: three standing documents said `POST /api/advisor` checked conversation ownership; its only caller
was a different route. **N-34/U27**: the middleware had never run. **N-38/U28**: CI had been building a
materially different app from production, because `getUser()` short-circuited before `cookies()` when
Supabase was unconfigured.

> **Rule produced: a claim about behaviour must be bound to an observation of that behaviour, not to the
> code that is supposed to produce it.** U27's proof is a Report-Only CSP header that cannot appear unless
> the middleware executed; U28's is the absence of prerendered page HTML.

### A guard that is blind, not wrong — **2 instances**

The guard passes, its logic is correct, and the thing it should see is outside what it looks at.

**N-66**: `SOLE_PAID_CLIENT` pinned readers of `OPENAI_API_KEY` and nothing else, so a module reading
`OPENAI_BASE_URL` and dialling it was green. **N-7/FU-31**: `AUTH_COVERAGE` scans `src/app/api/**/route.ts`,
so the one `"use server"` module — an HTTP endpoint — is invisible to it.

> **Rule produced: an anti-vacuity assertion proves the guard ran; only a pinned inventory proves it looked
> in the right place.** State the blind spot in the guard's own header, where the next reader is.

### Counts written once — **6 instances**

A number written into prose, true when written, false thereafter: FU-32 (`id-stability.test.ts`), U19, U20
(two files), U12, U22, and the architecture-spec count at four sites.

> **Rules produced, and the phase needed both:** *date beside, never rewrite* — correct for a claim that
> **was** true once. **It is wrong for a number that changes every unit**, which restacks a bracket
> indefinitely (one site reached five stacked values). Those get **bound** (`SPEC_COUNT`) or **deleted**
> (FU-32's remedy, applied again as FU-39). The option this class never offers is *correct it and move on*.

### A promise is not a record — **4 numbers issued, 2 lost entirely**

FU-29, FU-30, FU-31, FU-32 were all issued as *"Register as FU-nn"* inside another row's cell. Two survived
by accident. **And the class recurred inside the landing that fixed it** (FU-39).

> **Rule produced: write the row, not the promise.** A disposition that names an *action someone will take*
> is not a disposition. Its close relative is the disposition that names a **unit** rather than a
> **condition** — which is how N-11 inherited U23's mortality when U23 was cut.

### The method rule the phase most nearly failed to learn

`CRITERIA_PARITY` **caught two live divergences within one landing, five hours after it landed.** The
first: this closeout ticked `[P2-X2]` in §8 and not its roadmap twin, two edits apart. The second, after
ticking the nine measured-MET criteria: **four** twins at once — `[P2-X1]`, `[P2-X3]`, `[P2-X4]`,
`[P2-X5]`.

**The second catch did more than catch a slip: `[P2-X1]` was a mis-pairing.** The plan had already noticed
that the roadmap's R1 carries a clause §8's C10 does not, and filed it as *"text divergence, not tick
divergence"* — a phrase that assumed the two would never tick together. They did. The guard forced the
deferred question (*is R1 met?* — yes, as written; item 1's real sink is a residue, not this criterion's),
and **a tick-state guard thereby surfaced a specification question.**

> The usual case for *"prefer a test over a paragraph"* (§3 rule 5) is that the paragraph goes unread. **The
> stronger case is this one: the paragraph was written, understood, and still not obeyed** — twice, within
> hours, by the people who had just written it. Sixteen boundary violations accumulated in this repository
> while a rule lived only in prose. The reason is not that nobody read it.

### A red-first proof that fails to redden — **3 instances**, all inside the closeout's own remediations

**[2026-09-22, added at (d2).]** The fifth class, and the only one this phase discovered about *itself*.
Every instance has the same shape: a guard was written, a mutation was run to prove it bites, **the
mutation left the suite green — and the finding was the guard, not the mutation.** All three would have
passed review as green, because a blinded guard and a satisfied guard are the same colour.

- **N-75 — the blinded helper.** (d1)'s P2-R3 planted a service-role-key read in `src/lib/db/seed.ts` and
  the new ratchet stayed green. Traced rather than re-planted: `readsIdentifier` used `ts.createScanner`
  with a bare `scan()` loop, which carries no template-continuation state, so the walk **terminated at the
  first `` `…${…}` ``** and everything after it in the file was unread. **Four** credential ratchets were
  affected. Rewritten as an AST walk with two regression fixtures. **The part that matters for the phase:
  those four ratchets were certified sound at (c) on 64/64 green** — the Check read them and could not
  have seen this.
- **The vacuous exemption pin.** `ecc:code-reviewer` mutated (d1)'s new `DECLARED_OPERATIONAL_STATES`
  assertion by adding a second, unused entry to the production set: **7/7 still green.** The guard re-typed
  its own `["NOT_CONFIGURED"]` array instead of importing the real one, so it was checking itself. **This
  is the anti-vacuity defect the closeout exists to remove, found inside the closeout's own remediation.**
- **The predicate satisfied by an unrelated call.** (d1b) tightened `UNWRAPPED_ROUTES` and then deleted the
  pre-stream catch from `advisor/route.ts` to prove the tightening bit. **Still green** — the predicate
  asked only whether the file contained `internalError(` *anywhere*, and that file also reports from its
  in-stream SSE handler. Now keyed on the `PRESTREAM_ERROR` code the two catches share.

> **Rule produced: a mutation that does not redden is a finding, not a mistake in the mutation.** The
> tempting reading is always *"I mutated the wrong line"* — and twice here that reading was available and
> wrong. **Trace before re-planting.**

**A fourth was ANTICIPATED rather than discovered, which is the only evidence that the rule took.** (d1b)'s
new positional check — *a `getUser(` before the first `try` is red* — is a no-op for a route that stops
calling `getUser(` at all, so a rename would have **silenced** it rather than reddening it. That exit was
closed with an anti-vacuity pin *before* the guard shipped, and the pin was itself mutation-shown. It is
not counted among the three: nothing had to fail first.

### The closeout's own two HIGHs

**[2026-09-22, added at (d2).]** Both were raised by `ecc:code-reviewer` and `ecc:security-reviewer`
against **(d1)'s remediations** — code written by this closeout to fix the Check's findings — and both are
instances of classes already named above.

- **HIGH 1 — the vacuous pin** (above). *Says-vs-does, at the scale of a single `expect`.*
- **HIGH 2 — the real exception discarded.** P2-R1 routed every unexpected 5xx through the logger, and at
  `src/app/api/lab-import/extract/route.ts` the caught `ExtractionError` was branched on and then **thrown
  away**: `fail()` synthesised its own error with a fixed message, so **four distinct causes collapsed into
  one undistinguishable log line.** The correlation id existed and pointed at nothing worth reading. Fixed
  by reporting the real error and passing its id to `fail()`. *A remedy applied to the half that was
  reported — N-74's lesson, recurring in the fix for a different finding.*

> **What the pair says about the closeout as a method:** the remediations were reviewed as adversarially as
> the code they remediated, and that is where both HIGHs came from. A closeout that reviews the phase and
> not its own repairs is measuring the easier thing.
