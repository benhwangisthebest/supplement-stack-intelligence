# p3-u7-coverage-honesty — PDCA cycle artifact for Phase 3 U7

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U7**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U7** (status APPROVED). Where the
> two disagree, the register wins.
>
> **Feature**: `p3-u7-coverage-honesty` · **Anchor**: `43215aa` · **Date**: 2026-09-24 ·
> **Type**: deterministic (no network, no resolver call, no OpenAI, no deployed DB, no CI change)

---

## 1. Plan

**Problem.** Roadmap item 4 / `[P3-X4]`: *"Every surface that can show partial coverage states its coverage
limit; test-verified."* The datasets are effects, interactions, side effects and food pairings. The rule
behind it is `CLAUDE.md` §2.2 rule 10: absence of a warning is not a safety signal.

**Baseline, measured at `43215aa` from `content/seed/*.json`** (15 supplements):

| Dataset | Supplements with **none** today |
|---|---|
| Interaction rules (either side) | creatine, vitamin-b12, taurine, protein-powder (**4**) |
| Food pairings | l-theanine, glycine, vitamin-b12, taurine, nac, protein-powder (**6**) |
| Side-effect profile (`What to watch`) | vitamin-d, vitamin-b12, taurine (**3**) |
| `contraindications` | creatine, l-theanine, glycine, vitamin-b12, taurine (**5**) |
| `sideEffects` (Summary list) | none (0) |
| Effects | none (0) |

**Surface inventory.** Every tracked component rendering one of the datasets:

| # | Surface | None state today | Listed state today | Verdict |
|---|---|---|---|---|
| S1 | `InteractionSection` (Library) | "No known interactions in our dataset. This does not mean…" | `DISCLAIMERS.interaction` | **honest**; moves onto the shared component, copy unchanged |
| S2 | `FoodPairingSection` (Library) | "No food-pairing guidance in our dataset yet. This does not mean…" | `DISCLAIMERS.food` | **honest**; same |
| S3 | `WhatToWatch` (Library, Summary tab) | **renders `null`** — the section silently disappears (3 pages) | `DISCLAIMERS.sideEffect` | **gap** (none state) |
| S4 | `SupplementDetail` Summary: contraindications | **"None noted."** (5 pages) — reads as *there are none* | no limit | **gap — the worst instance** |
| S5 | `SupplementDetail` Summary: side effects list | empty `<ul>` (unreachable from seed) | no limit | **gap** |
| S6 | `SupplementDetail` Effects tab | renders only the sources notice (unreachable from seed) | no limit — the sources notice covers provenance, not completeness | **gap** |
| S7 | `StackWorkspace` evaluation (Stack Lab) | after a clean run: "0 critical · 0 warning · 0 info" and **no** disclaimer — `DISCLAIMERS.interaction` renders only when an interaction **was** found | same, and custom items (no `supplementId`) are skipped by **every** rule silently | **gap — the exact failure rule 10 names** |
| S8 | advisor tool `sideEffectWatch`, empty result | "No curated side-effect profile matched…" — no hedge (its sibling `checkInteractions` has one, `tools.ts:232`) | — | **gap** (model-facing string) |

**Excluded, with reasons.** `SideEffectTimeline` (Profile) renders the user's own log, not a curated
dataset, and its empty state says so. `CompareView` measures goal coverage, not a dataset. The advisor's
provenance chips already carry the sources notice (N-84). `ProtocolPanel` suggests from goals and does not
render any of the four datasets' absence. `BiomarkerRelevanceSection` is not one of the four and already
states its none case ("…does not mean your labs have nothing worth reviewing").

**Scope note for the owner.** S4/S5 (`contraindications`, `sideEffects` on `Supplement`) are not literally
one of the roadmap's four datasets. They are included because "None noted." is the most direct
absence-reads-as-safety instance on the Library, and §2.2 rule 10 is not limited to four datasets. S8
touches the advisor, as one string only. Either can be struck at copy review.

**Stop conditions, checked before editing. None fired.** No persisted id changes, no schema, no API
contract, no migration. `StackWorkspace` is one of the **8** rule-7 client components U9 must see red;
U7 keeps its `@/lib/safety` import, so the count stays **8 of 31** (§2.1).

## 2. Design

**2.1 One copy table, one component.** Copy lives in `src/lib/safety` as `COVERAGE` (`CLAUDE.md` §2.1 rule 6: advisory
copy flows through `src/lib/safety`). Each entry is `{ dataset, state, text }`, with `state` `"none"` (the
dataset holds nothing for this subject) or `"limit"` (it holds something, and that is not everything).
Existing reviewed copy is **reused by reference**, not retyped: S1/S2's none-lines and
`DISCLAIMERS.interaction` / `.food` / `.sideEffect` become `COVERAGE` entries whose `text` is the existing
string. The renderer is `src/components/evidence/CoverageLimit.tsx`, **presentational only** (it imports no
`@/lib`), taking one `copy` prop and emitting `data-testid="coverage-limit"` with `data-dataset` and
`data-state`. Surfaces import `COVERAGE` themselves, which is why rule 7's figure does not move.

**2.2 Binding (`CLAUDE.md` §2.2 rule 7).** S7's custom-item line renders only when `items.some(i => !i.supplementId)`,
a computed value, and its claim (such an item is not checked for interactions, dose, allergens or
evidence) was verified against every rule in `stack-evaluator/rules.ts` (all `continue` on a missing
`supplementId`, and `findInteractions` keys on `supplementIdsOf`). S7's limit renders whenever an
evaluation result is on screen (`summary !== null`).

**2.3 The guard.** `src/components/evidence/CoverageLimit.test.tsx` (jsdom, U0's harness):
- **Render cases.** For each surface, the none state and the limit state each render a `coverage-limit`
  of the right dataset and state. None states use made-up ids (`interactionsForSupplement("made-up")` is
  `[]`), so they do not depend on which seed rows happen to be empty. S7 drives a real click through a
  mocked `fetch` and also asserts the custom-item line is **absent** without a custom item (binding).
- **Completeness.** Every file under `src/components` importing a dataset accessor module
  (`@/lib/interactions`, `@/lib/side-effects`) must be in the `SURFACES` table. Every `SURFACES` file must
  render `<CoverageLimit`. Every `SURFACES` file must have a render case. The derivation walks the
  filesystem, not the table, so a new surface cannot skip itself.
- **Copy sweep.** Every `COVERAGE` text passes `containsBannedLanguage`.
S8 is guarded in the advisor tools test.

**Red proof (register: "a partial-coverage surface with no disclosure must fail").** Tests land first and
are run against the unmodified components. Required red: S3 none, S4 none, S5 none, S6 none and limit, S7
clean-run limit, S7 custom-item line, and the S8 string. Then per-mechanism: removing `<CoverageLimit` from
S1 reddens the render case **and** the completeness check; a planted component importing
`@/lib/interactions` outside `SURFACES` reddens completeness; a planted banned phrase in `COVERAGE`
reddens the sweep. Restores are by file-copy backup, never `git checkout --` (§5 rule 11).

**May touch.**
- `src/lib/safety/index.ts` (add `COVERAGE`)
- `src/components/evidence/CoverageLimit.tsx` (new), `src/components/evidence/CoverageLimit.test.tsx` (new)
- `src/components/library/InteractionSection.tsx`, `FoodPairingSection.tsx`, `WhatToWatch.tsx`,
  `SupplementDetail.tsx`
- `src/components/stack/StackWorkspace.tsx`
- `src/lib/advisor/tools.ts`, `src/lib/advisor/tools.test.ts`
- `tests/e2e/**` only if a non-live spec pins a string this unit changes
- `docs/01-plan/features/p3-u7-coverage-honesty.plan.md`, `docs/01-plan/phase-3-evidence-grounding.plan.md`,
  `docs/project-status.md`

**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` ·
full non-live E2E — plus the red proofs, recorded in §4.

## 3. Do: landing (a)

One landing: the `COVERAGE` table, `CoverageLimit`, the five surfaces, the advisor string and both tests.
S1/S2 render **byte-identical text** through the new component, so the one non-live E2E assertion on that
copy (`medication-interactions.spec.ts:30`) did not need to change.

## 4. Check: red proofs and gate

**Red proof 1: the tests before the fix.** `CoverageLimit.tsx` and `COVERAGE` existed, and **no surface
was wired**. **15 failed, 20 passed** across `CoverageLimit.test.tsx` and `tools.test.ts`. That is all 13
render cases, the "renders `<CoverageLimit`" completeness check and the S8 string (*expected 'No curated
side-effect profile matche…' to match /dataset is limited/i*). The accessor-completeness check and the copy
sweep stayed green, which is correct: nothing unregistered existed yet, and no copy was banned.

**What that red does and does not show.** For S1/S2 and S3's listed state the red is **structural**: the
honest text was already on screen, just not through the component. A throwaway text-only probe (run, then
deleted) settles which reds were honesty gaps:

| Case | Honest text on screen before U7 |
|---|---|
| S1 none / limit | present / present |
| S2 none / limit | present / present |
| S3 none (`What to watch`, no profile) | **absent** (the section rendered `null`) |
| S3 limit | present |
| S4 none (contraindications) | **absent**; "None noted." **present** |
| S6 none (Effects) | **absent** |

S5, the S6 limit and S7 had no honest text at all, because none of their strings existed before U7.

**Red proof 2: each mechanism, after the fix.** Restores used file-copy backups, never `git checkout --`,
and each restored file was checked byte-identical (`cmp`) to its backup afterwards:

| # | Mutation | Red (and nothing else) |
|---|---|---|
| M1 | `InteractionSection.tsx` replaced by its `HEAD` form (honest text, no component) | its 2 render cases + "renders `<CoverageLimit`" (3 of 17) |
| M2 | a planted `PlantedSurface.tsx` importing `@/lib/interactions`, not in `SURFACES` | "every component importing a dataset accessor is a registered surface" (1 of 17) |
| M3 | "Results guaranteed." appended to `stackEvaluationLimit` | the banned-language sweep (1 of 17) |
| M4 | `hasCustomItem &&` removed (custom-item line unbound) | the clean-run case, on its binding assertion (1 of 17) |
| M5 | `StackWorkspace.tsx` replaced by its `HEAD` form | both S7 cases + "renders `<CoverageLimit`" (3 of 17) |

**Gate, on branch `p3-u7-coverage-honesty` with the two new files staged:**
- `npx tsc --noEmit`: clean
- `npm run lint`: **388 of 388** tracked source files, 0 errors
- `npx vitest run`: **1552 / 1552** tests across **123** files
- `npx next build`: compiled successfully
- `npx playwright test`: **70 passed / 30 `[LIVE]` skipped**

The rule-7 figure was re-derived after the change: still **8 of 31**.

**Seen in the running app** (`next dev`, `/library/taurine`): all four none states and the safety-list
limit render, and the Effects tab shows `effects/limit`. There were no console errors. Stack Lab needs
sign-in, so S7 is verified by the component test only.
