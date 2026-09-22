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

> **[2026-09-22, (d2)] COMPRESSED TO A TRUE MIRROR ON OWNER RULING. Nothing was deleted; it was MOVED to
> the rows named below.** This file stood at **403 lines against a stated 200-line cap**, having grown
> across (d1), (d1b) and (d1b)'s widening. At that length it had stopped mirroring the register and had
> become a second, fuller account of the same findings — so a reader could learn more from the subordinate
> document than from the authoritative one, which inverts §6. The narrative approved at (d1b) now lives in
> the phase plan: **N-75, N-76, N-77** in §4.5, and **FU-32, FU-40…FU-46** in §4.3. The over-run itself is
> registered as **FU-45**, because nothing measured it — the cap is written where these artifacts are
> created and nowhere that runs.

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
## Landings as executed

| Landing | SHA | What it did |
|---|---|---|
| **(a)** | `749dbfc` | `criteria-parity.test.ts` + `spec-count.test.ts`, both red-proven; the four `SPEC_COUNT` sites; README's per-spec breakdown dropped |
| **(b)** | `b2ab0b6` | §8 and register re-derived; `docs/04-report/phase-2-operational-dependability.report.md` |
| **(c)** | `854c44c` | Independent Check, four reviewers, one section each; **COMPLETE WITH FOLLOW-UP**, P2-1…P2-13 |
| **(d1)** | `bac5928` | P2-R1, P2-R2, P2-R3; N-75 found by P2-R3's red proof failing to redden |
| **(d1b)** | `a27ab0a` | P2-R4 and N-76; both unwrapped routes guarded from their first statement |
| **(d2)** | *this landing* | The Check's remaining findings, the register rows below, classifications, roadmap, `CLAUDE.md` §5 |
| **(d3)** | *pending* | Certifier addendum — P2-1…P2-13 re-verified against (d2)'s pushed SHA |

---

## The mirror — every row this cycle raised

**Read the register, not this table.** One line each: id, the finding in a sentence, disposition, and where
the authoritative row lives. Where the two disagree, **the register wins** (`CLAUDE.md` §6, ranks 5 and 3).

### Check findings

| id | Finding | Disposition |
|---|---|---|
| **P2-1** | `[P2-X1]`/R1's first clause false as written; the tested half unbound | Criterion re-worded at (d2); logging half closed by P2-R1 at (d1) and P2-R4 at (d1b) |
| **P2-2** | §10.7's completeness claim false — N-69 and N-40 in no list, N-69 with no owner | (d2): both added to §10.7 and report §10; N-69 given an owner-condition; N-40's class → **FU-41** |
| **P2-3** | Landing (d) as specified would make `project-status.md` contradict itself | (d2): §2.x prose and §3 table moved together, dated |
| **P2-4** | `DOC_TRUTH` did not bind named-guard tokens, so C7's check did not establish C7 | **CLOSED** by P2-R2 at (d1) |
| **P2-5** | FU-29's disposition asserts an OP row that does not exist | (d2): corrected to the row that does |
| **P2-6** | Report §11 omits U-DEFER-4; roadmap Phase 3 not satisfiable without it | (d2): named in both |
| **P2-7** | `RLS_COVERAGE` blind to an in-place `create policy` edit | **Settled by probe, not argument** — run `35700784778` failed at Migration coherence; CI is the control → **FU-40** |
| **P2-8** | Plan's C5 re-derivation prose says 7 files; it is 5 | (d2): corrected wherever it appears |
| **P2-9** | `CLAUDE.md` §4 rule 7's "7 of 31" re-derives to 8 of 31 | (d2): corrected and dated, predicate stated beside it |
| **P2-10** | C16 ticked conditionally; `CRITERIA_PARITY` cannot express `[~]` | (d2): recorded → **FU-42**; the guard is not rewritten in the landing it polices |
| **P2-11** | N-50's Phase 4 deferral absent from the roadmap, the sequencing authority | (d2): named in roadmap Phase 4 |
| **P2-12** | Service-role-key confinement had no executable guard | **CLOSED** by P2-R3 at (d1) |
| **P2-13** | FU-32 cited thirteen times, defined zero | (d2): written as a late-registered row → **FU-32** |

### Register rows this cycle added

| id | Finding | Disposition | Authoritative row |
|---|---|---|---|
| **N-75** | `readsIdentifier` stopped at the first substituting template literal, blinding four credential ratchets | **CLOSED (d1)** `bac5928` — AST walk + **1** regression fixture (~~2~~; see **N-78**) | plan §4.5 |
| **N-76** | `actions/route.ts`'s pre-delegation window unguarded — P2-R4's class | **CLOSED (d1b)** `a27ab0a`, on owner ruling; exemption removed | plan §4.5 |
| **N-77** | Instruction-shaped "file changed" blocks in a subagent's output, once with a fabricated diff | **No new control** — verify by `git diff`, never by a message; restated in `CLAUDE.md` §5 | plan §4.5 |
| **FU-32** | The counts-written-once class, cited as authority before it existed | Late-registered; remedy is bind-or-delete, never correct-and-move-on | plan §4.3 |
| **FU-40** | `RLS_COVERAGE` sees policy existence, not policy semantics | CI's catalog check is the control; boundary written down | plan §4.3 |
| **FU-41** | Nothing structurally prevents health-bearing error text reaching a log record (N-40's class) | Owner: the phase that adds a logging sink | plan §4.3 |
| **FU-42** | `CRITERIA_PARITY` cannot express a partial criterion, so it shapes the record it measures | Owner: next unit touching that guard | plan §4.3 |
| **FU-43** | `src/middleware.ts`'s `getUser()` has no guard and no window to put one in | Owner: the phase that adds a logging sink | plan §4.3 |
| **FU-44** | The correlation-id contract ends at `handle()`'s reach — three surfaces | Owner: the phase that adds a logging sink | plan §4.3 |
| **FU-45** | Cycle artifacts have a stated cap and nothing measures it; this one reached 403 lines | Remedy: a length assertion on `SPEC_COUNT`'s pattern | plan §4.3 |
| **FU-46** | Four row shapes; a section-bounded parse gave three wrong answers before it was sound | Remedy: one declared shape and a guard keyed on it | plan §4.3 |

### Remediations executed

| id | Target | Landed |
|---|---|---|
| **P2-R1** | Every unexpected 5xx reaches the logger; `DECLARED_OPERATIONAL_STATES` imported, not re-typed | (d1) `bac5928` |
| **P2-R2** | `DOC_TRUTH` resolves guard tokens against titles **or** declared identifiers | (d1) `bac5928` |
| **P2-R3** | Service-role key reader ratchet, pinned to `src/lib/db/seed.ts` | (d1) `bac5928` |
| **P2-R4** | `advisor/route.ts`'s pre-stream window guarded, then widened to its first statement | (d1b) `a27ab0a` |

---

## What this cycle learned about its own method

**Three times** a red-first proof that failed to redden was itself the finding, and each would have passed
review as green: P2-R3's blinded `readsIdentifier` (**N-75**); the exemption pin that re-typed its own
array instead of importing it; and the `UNWRAPPED_ROUTES` predicate satisfied by an unrelated call in the
same file. **A fourth was anticipated rather than discovered** — the positional `getUser(` check, whose
silent exit was a rename, closed with an anti-vacuity pin before it shipped — and is not counted, because
nothing had to fail first. The full account is in the phase report §12.

## Verification

Each landing ran `npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npm run test:coverage` ·
`npx next build`, plus `npm run test:e2e` where `src/app` changed, with every new guard shown red then
green and GATE D1 discharged by a zero-line diff against `.github/workflows/ci.yml`. Per-landing figures
are in the phase plan's §10.9 STAMP ROW, re-measured at each tree rather than carried forward.
