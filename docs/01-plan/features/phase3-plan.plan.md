# phase3-plan — PDCA cycle artifact for authoring the Phase 3 plan

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for the act of **authoring** the
> Phase 3 plan. The plan itself — `docs/01-plan/phase-3-evidence-grounding.plan.md` — is the record, and it
> is a **DRAFT AWAITING OWNER APPROVAL**, so it is **rank 5's precondition, not rank 5** (`CLAUDE.md` §6: a
> Draft outranks nothing). This file carries no approval status of its own and **mirrors the draft rather
> than restating it**: sections 1–7 below point, they do not duplicate. Where the two disagree, the draft
> wins.
>
> **Cycle**: author the Phase 3 — Evidence grounding plan · **Base SHA**: `c4460c7` · **Date**: 2026-09-22
> **Feature**: `phase3-plan` · **Method**: bkit PDCA (plan → design → do → check → report)
> **Scope of this cycle**: two new documents. **No `src/` file, no guard, no content is touched.**

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | Phase 2 closed; Phase 3 has a roadmap section and no plan. The roadmap names five work items and five exit criteria, carries an **undecided conflict** (P2-6 / U-DEFER-4), and hands on 39 register ids that need dispositioning rather than inheriting silently. |
| **Solution** | One landing: a DRAFT plan with a re-derived baseline, eight numbered units each typed live or deterministic, five exit criteria with stable ids, a disposition for every carried item, and **six owner decisions written as options with no answer pre-chosen**. |
| **Function/UX Effect** | **None.** Two documents. |
| **Core Value** | The phase can be *approved or refused on measurements*, not on a summary of measurements. Every figure in the draft's §2 carries the command that produced it, because the one class this project keeps re-learning is that a number true when written is false thereafter (**FU-32**). |

---

## Context Anchor

| | |
|---|---|
| **WHY** | The Library is declared the product's trust layer while **19 of 27** grades are hand-typed letters and the `Paper` type holds **no provenance at all**. Phase 3 is where that stops being true — and it must not become true again by fabrication, which is the v13 failure. |
| **WHO** | The repository owner, who rules D-1…D-6 and approves the plan; landing (b)'s independent reviewer; this session, which measures and drafts and **decides nothing**. |
| **RISK** | That the plan pre-chooses a decision by writing a unit as though it were settled — above all **D-3**, which determines whether Phase 3 relaxes the control v13 installed and how far. Second risk: carrying a figure instead of re-deriving it, inside the plan whose own §2 exists to prevent that. |
| **SUCCESS** | Every roadmap item and criterion maps to a unit or a stated exclusion; every carried item is dispositioned; every decision is presented with trade-offs and none is answered. |
| **SCOPE** | **In:** the two documents named above. **Out:** every `src/` file, `supabase/migrations/`, `scripts/`, `CLAUDE.md`, `docs/roadmap.md` (its status line moves only at approval), `docs/project-status.md`, and every Phase 2 artifact — all closed. |

---

## 1–7 · Pointers into the draft

| § | Where it lives |
|---|---|
| Objective and what the plan is not | draft §1 |
| **Baseline, re-derived at `c4460c7`**, each figure with its command | draft §2 |
| The central tension — provenance vs the v13 control — and **N-80** | draft §3 |
| Units **U1…U8**, each typed live / deterministic | draft §4 |
| Exit criteria **`[P3-X1]`…`[P3-X5]`** | draft §5 |
| **Decisions D-1…D-6**, options only | draft §6 |
| Disposition of all 39 carried ids | draft §7 |
| Spend | draft §8 |
| Claims checked and withdrawn | draft §9 |

---

## Design — one paragraph

The plan is ordered by what a wrong order would make unprovable. Codegen identity (U1, U2) comes first
because the roadmap requires byte-identical output **for the pre-migration corpus**, and a single content
change merged ahead of it destroys the comparison permanently — there would be no pre-migration corpus
left to compare against. The grade-derivation guard (U3) precedes the content that satisfies it (U4) for
the same reason in miniature: the guard's redness against the 19 absent profiles is observable exactly once,
before they exist. Provenance (U5) precedes verification (U6) because a verification with nowhere to record
itself is a spreadsheet. The two units that could have been written first — the UI work and the bundle
budget — are last, because U7 is blocked on an undecided question and U8 asserts a ceiling whose number is
also undecided. **Nothing in the ordering is a preference; each step is the cheapest moment at which its own
claim can still be falsified.**

---

## What this cycle found that the roadmap did not say

Three things, each re-derived rather than read:

- **`[P3-X2]` is not a gap in the data — the field does not exist.** `Paper` carries nine keys and **zero**
  provenance. There are no DOIs to verify; item 1 introduces the field, the verification and the record
  together. Read as *"fill in the missing DOIs"* it is mis-sized.
- **N-80.** `seed-integrity.test.ts` G2 forbids the six keys v13 deleted and **not** `doi` or `pmid`. The
  guard that makes provenance unauthorable does not cover the two fields Phase 3 will add — so a `doi`
  field could land today and the suite would stay green. Left **OPEN on purpose**: fixing it before D-3 is
  ruled would choose D-3 by implementation.
- **One roadmap Testing requirement is already satisfied.** *"Every `paperIds` entry resolves"* — **0**
  unresolved at `c4460c7`. A guard written for it lands green and proves nothing unless mutation-checked
  against a planted dangling id. Worth having; not progress.

---

## Verification

`npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npx next build`, all four, plus
`npx vitest run src/architecture` to confirm no doc guard needs an allowlist change to accept a new plan
file. Figures are in the landing report, re-measured at this tree.

**`CRITERIA_PARITY` does not parse this plan**: `criteria-parity.test.ts:34` pins
`docs/01-plan/phase-2-operational-dependability.plan.md` by literal path, so the new `[P3-Xn]` ids are
invisible to it. **That is the current state, not an endorsement** — pairing Phase 3's two criteria lists
mechanically is work the phase should decide to do, and **FU-46** is why it is not free.

---

## Status

**Landing (a) — DRAFT DELIVERED, AWAITING OWNER APPROVAL.** Nothing is authorised. The owner rules
**D-1…D-6**; landing **(b)** is an independent plan review in a separate session, under
`docs/reviews/phase-3-plan-review.md`, following the Phase 0 pattern. Approval moves `docs/roadmap.md`'s
Phase 3 status line — **not this landing.**

---

## Landing (b) — independent plan review · 2026-09-22

> **Anchor correction, recorded because the brief's premise was false.** Landing (b)'s brief anchored to
> "the sha of landing (a)". There was none: **(a) was never committed** — the commit was proposed and
> approval never arrived, so HEAD was still Phase 2's `c4460c7` and both Phase 3 files were untracked. That
> is a declared stop condition (*"the plan's HEAD or file set differs from what landing (a) reported"*) and
> the session stopped on it rather than reviewing a working tree. On the owner's ruling, (a) was committed
> first — `0df218e`, two files, +441 — and (b) then ran against that pushed SHA. This preserves the property
> every prior Check in this repository has: a review names a commit a later reader can `git show`.

| | |
|---|---|
| **Artifact** | `docs/reviews/phase-3-plan-review.md` — 182 lines, P-01…P-17, one verdict |
| **Anchor** | `0df218e`, verified by the reviewer and by the clerk |
| **Verdict** | **REVISE** |
| **Severity** | 1 CRITICAL · 7 MAJOR · 7 MINOR · 2 OBSERVATION |
| **Register** | **Nothing allocated.** Next free re-derived by command: **N-81 · FU-48 · OP-8** |

**How independence was constructed.** The review was produced by a subagent that did not write the plan. Its
only inputs were the plan, `docs/roadmap.md`, `CLAUDE.md` and the repository at HEAD. It was explicitly
denied **this file** and the authoring session's record, and it was bound by the same spend rule as (a) —
no network, no deployed database, no resolver. Two constraints were set on its findings: it may not rule
**D-1…D-6**, and a finding resolvable only by a ruling must be recorded as an item naming the D-n.

**Three disclosures carried into the review rather than smoothed over:** a first reviewer stalled and
produced nothing, and was re-spawned with guardrails; one `grep` incidentally printed three lines of this
file, so P-08 was re-grounded on the roadmap and the guard alone; and §2's three bundle figures are
**UNVERIFIED** — their command is a build the review's budget excluded, and no other document records them.

**Clerk's verification.** The clerk re-ran the load-bearing checks directly before recording them, per
`CLAUDE.md` §5 rule 11 — a subagent's report is data *about* the tree, not the tree. Seven confirmed at
`0df218e`, listed in the review's disclosure 4.

**What the review does to this cycle.** The draft's §2 baseline, N-80, the §7 id set and the U1→U2 / U5→U6 /
U3→U4 orderings all survived scrutiny; the reviewer additionally found a favourable fact the plan had not
checked (all 8 profiled effects' letters already agree with `deriveGrade`). The verdict is REVISE because
three roadmap obligations reach no unit, §7's completeness claim is false in two ways, D-3's option (a)
would cross a rank-1 rule unlabelled, and two criteria are not falsifiable as written. **Every item is
fixable by stating something the plan leaves implicit** — none needs a D-n ruled first.

## Status

**Landing (b) — REVIEW DELIVERED.** The plan remains **DRAFT — AWAITING OWNER APPROVAL** and is unedited;
the review recommends **REVISE**, which is a recommendation, not a status change. Next: the owner rules
**D-1…D-6** with the review's decision index in view, and a landing (c) revises the draft against P-01…P-17.
Nothing is authorised by this landing either.

---

## Landing (c) — revision against the review · 2026-09-22

| | |
|---|---|
| **Anchor** | `52e00d9` (landing (b)'s merge), verified by `git rev-parse HEAD` at session open; tree clean but for untracked `.claude/launch.json` |
| **Artifact** | `docs/01-plan/phase-3-evidence-grounding.plan.md` — **336 → 328 lines**, still **DRAFT — AWAITING OWNER APPROVAL** |
| **Input** | The (b) review's P-01…P-17. **Not edited** — a review is a record |
| **Outcome** | **17 of 17 addressed.** Three *actions* declined with reasons; **no finding** declined |
| **Register** | **N-81** (`paperSchema`, no conformance assertion) and **FU-48** (G1's `src/`-only, `.ts\|.tsx`-only walk) allocated at numbers re-derived by command. N-80 widened |
| **Decisions** | **D-1…D-6 → D-1…D-7.** D-4 split (P-15). **None ruled** |

**The plan got shorter while gaining eight obligations**, because the length cap forced prose out rather
than content: the disposition table, the unit-typing table, three new criteria and three register findings
all landed inside a net −8 lines (336 → 328).

**What the revision changed, beyond restating.** Three roadmap obligations that reached no owner now have
one and a criterion — the ID-change migration (**U6**, `[P3-X6]`), *mutation-check each guard* (**all
guard-shipping units**, `[P3-X7]`), and `paperIds` resolution (**U2**, `[P3-X8]`). D-3's option (a) is
annotated as requiring a **recorded rank-1 exception** under `CLAUDE.md` §6 and is **not removed** — the
annotation was the fix the review asked for. U4 is re-sized from "authors no new claim" to **190 content
elements on the trust surface**, with a sourcing rule and an honestly-empty-`paperIds` clause.

**Four numbers did not survive re-derivation, three of them the plan's own** (a fifth and sixth were found by the delta check, below). §7's source set is
**38** ids, not 39 — the draft counted its own N-80 into the total, inside the section that names FU-32.
**FU-1 is open and unowned** (Phase 1 plan `:837`, *"still open, unowned"*; Phase 2 plan `:240`), not
"Closed in Phase 1"; it had reached §7 as a **range endpoint** (*"FU-1 … FU-46"*), not as a carried row.
The mean is **0.8889**, and the rounded `0.89` makes D-6's discomfort read as smaller than it is. The
fourth is the **review's**: `src/data/` holds **13** tracked files, not 12 — the review's own enumeration
lists 13, and the finding is unaffected. **FU-1 is the one the (b) review did not catch**, which is the
case for re-deriving rather than trusting a reviewer's set.

**Verification.** `npx vitest run src/architecture` → **27 files / 393 tests, exit 0, no allowlist edit**.
The §5 rule 10 four-check gate ran in full; figures in the landing report. Every claim written into the
plan was opened at HEAD first, and the AC commands were re-run against the revised file rather than
asserted. A **file-copy backup** was taken before editing, per §5 rule 11 — not `git checkout --`.

**Independence, and what it caught.** A subagent that did not perform the revision re-checked P-01…P-17 against the review and the revised plan **at the working tree only**, explicitly denied this artifact and told not to trust the plan's own §10 self-assessment. **Verdict: 17 of 17 CONFIRMED addressed, none NOT** — so no stop condition fired. **It then found four defects in the revision itself, and all four are fixed:** (i) the two register-max commands printed beside N-81 and FU-48 were **circular** — a docs-wide grep now returns 81 and 48 because the allocations are themselves tracked, so both are re-scoped to the closed Phase 2 register (**N-79**, **FU-47**, re-run verbatim); (ii) *"three §2 figures rotted"* was **wrong as attributed** — one is a §2 figure (the mean), the others are §7's id total and the review's own, and that figure was load-bearing inside the FU-32 row about figures rotting; (iii) the unit table listed `[P3-X7]` on **U1 only** while it binds seven units — now stated as a convention, with U6's exclusion explained; (iv) the P-13 decline was justified *"to stay inside the 400-line cap"* in a **317-line** plan, which is not true, **so the item was satisfied rather than argued** — every unit now carries its own `**Gate:**` line and the declines drop from three to two. **The check earning its cost is the point:** a self-assessment table saying "17/17 addressed" was accurate and still sat above four defects, one of them a false statement inside the row about false statements.

## Status

**Landing (c) — REVISION DELIVERED.** The plan is still **DRAFT — AWAITING OWNER APPROVAL**; a revision
answering a review is not an approval, and **nothing is authorised**. **No D-n was ruled** — the landing
reshaped one decision (D-4 → D-4 + D-7) and annotated another (D-3's admissibility), which the brief
permits and which presupposes neither answer. Next: the owner rules **D-1…D-7**, then the plan's status
line moves and `docs/roadmap.md`'s Phase 3 status follows it.
