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
