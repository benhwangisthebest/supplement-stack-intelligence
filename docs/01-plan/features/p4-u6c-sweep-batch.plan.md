# p4-u6c-sweep-batch — PDCA cycle artifact for Phase 4 U6, landing (c)

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U6**, and
> never replaces it. Where the two disagree, the register wins. Landings (a) and (b) are recorded in
> `p4-u6-content-corrections.plan.md`, which is at its 200-line cap and pinned.
>
> **Unit** U6 (c) · apply the sweep batch · **SUPERVISED** · deterministic · **Anchor** `830e108` · **Date** 2026-09-28
> **Authority:** the owner batch and standing approval of 2026-09-28, verbatim in the plan's §6. **Not covered, shown
> verbatim and stopped on:** the background label text, every other `src/lib/safety` change, the creatine description
> edit, the roadmap line, and the two files outside *May touch* (N-98). All were **approved on 2026-09-28** (plan §6,
> verbatim), with the label text replaced by the owner's alternative and two additions: the page drops
> `mechanismSummary` from its client payload, and N-97 is fixed in this landing.
> **Rulings:** the 2026-09-28 batch (1)–(5), with NOT CHECKABLE counted as UNSUPPORTED. `CLAUDE.md` §2.1 rule 6 and
> §2.2 rules 7, 8, 10. The source of every verdict is `docs/05-qa/2026-09-27-mechanism-sweep.md`.

## 1. Plan

**Goal (the brief's):** make the redundancy flag fire only on sweep-SUPPORTED tags, stop rendering and sending
`mechanismSummary`, render `description` under a background label, and remove creatine's superlative.
**Carried:** N-95, N-94, N-93 (1). **Registered:** N-96, N-97, N-98 (next free after N-95 / FU-75).

**Premises, measured at `830e108`:**

| | Claim | Measured |
|---|---|---|
| P-a | the sweep's SUPPORTED tag rows | 7 of 42 (`sweep-report` totals). `SUPPORTED_TAGS`, derived from `VERDICTS` only, lists the same 7 |
| P-b | the engine flags the pairs | a probe on a scratch copy (outside `src/`): all five pairs in §4 AC-1 raise *"Possible redundancy"* |
| P-c | render sites of the two fields | `description`: `SupplementCard.tsx:28`, `SupplementDetail.tsx:57`, advisor `tools.ts:95`. `mechanismSummary`: `SupplementDetail.tsx:61`, `tools.ts:168`. No other `src/app` or `src/components` reads either, and no E2E spec names them |
| P-d | the card's graph | `SupplementSearch.tsx:1` is `"use client"` and imports `SupplementCard`, so the card may not import `@/lib/safety` (CLIENT_TAKES_PROPS) |
| P-e | `SearchHit` is local | `tools.ts:60` declares it, so renaming its field needs no `src/types` change |

## 2. Design

**The SUPPORTED set.** The brief allows *import or generate*. A runtime import of the script is ruled out: it loads
`node:fs` and `content/verification/capture.mjs`, whose header says it is never imported by `src/`, and it would put
both in the evaluator's server bundle. So the set is **generated**. The script exports `SUPPORTED_TAGS`, computed from
`VERDICTS` without reading any capture (`scripts/mechanism-sweep.mjs:240`). `rules.ts:147` holds a copy of its
printed output, and `stack-evaluator.test.ts` fails when the two differ, or when an entry names an effect that does not carry
that tag. A hand edit to either side goes red. **This is a bound copy, not a runtime import. The owner ruled
(2026-09-28) that a test-bound copy satisfies "derived, never retyped".**

**Duplicates (N-97, owner 2026-09-28).** The same supplement id twice in an outcome group flags regardless of tags,
with the existing copy (`rules.ts:180-183`).

**Granularity.** Verdicts are per effect × tag, so the key is `<effectId> · <tag>`: `insulin-sensitivity` counts on
`magnesium-metabolic` and `berberine-metabolic` because each row is SUPPORTED, not because the word is.

**The label.** It is one constant, `BACKGROUND_LABEL` (`src/lib/safety/index.ts:131`): *"Background — a general
description, not part of this library's graded evidence."* (the owner's text; the first proposal was false for
ashwagandha, whose description the sweep rated SUPPORTED). It is added to the
banned-language sweep in `safety.test.ts`. `SupplementDetail` (a server component) imports it. `SupplementCard`
receives it as a prop, from `src/app/library/page.tsx` through `SupplementSearch` (N-98). Both surfaces wrap the label
and the text in one `data-background="description"` block, with the label first.

**The page payload.** `/library` passes its entries to the client search, so its props are what the browser
receives. The page drops `mechanismSummary` from each supplement (`page.tsx:20`); `LibraryEntry` and the card take
`Omit<Supplement, "mechanismSummary">`, and `src/app/library/page.test.tsx` checks the props.

**The advisor.** `SearchHit.description` becomes `unverifiedBackground`, so the caveat travels with the value.
`getSupplement` drops `mechanismSummary` from its type and its payload. Both tool descriptions say the field is not
part of the library's graded evidence. The redundancy copy is unchanged (ruling (1)).

## 3. Do

`scripts/mechanism-sweep.mjs` (+`SUPPORTED_TAGS`; verdicts and output unchanged) · `rules.ts` + test ·
`src/lib/safety/index.ts` (one constant) + `safety.test.ts` · `SupplementCard.tsx`, `SupplementDetail.tsx` + tests ·
`tools.ts` + test · `content/seed/seed-supplements.json` (creatine `description` only) · GENERATED
`src/data/seed-supplements.ts` · `docs/roadmap.md` (one backlog line) · the plan (U6 row, N-93…N-98, §6 batch) · this
file · **approved widening (N-98):** `src/app/library/page.tsx` + new `page.test.tsx`,
`src/components/library/SupplementSearch.tsx`.

## 4. Check

| AC | Command | Result |
|---|---|---|
| AC-1 | `npx vitest run src/lib/stack-evaluator` | 38 passed. Probe on a scratch copy, before → after: magnesium + L-theanine (stress) flag → **none**; magnesium + ashwagandha (stress) flag → **none**; caffeine + taurine (training, `ergogenic`) flag → **flag**; magnesium + berberine (metabolic, `insulin-sensitivity`) flag → **flag**; magnesium + magnesium (sleep) flag → **flag** (N-97 duplicate clause). A real SUPPORTED pair exists, so no fixture was needed |
| AC-1 red | scratch copy | filter line removed: 2 failed (both stress pairs). One entry dropped from the copy: 2 failed (the binding test and the caffeine + taurine test). Duplicate clause removed: 1 failed (magnesium + magnesium) |
| AC-2 | `npx vitest run src/components/library src/lib/advisor/tools.test.ts` | per-supplement tests: the Summary tab never shows `mechanismSummary` or a *Mechanism* heading. Neither tool's payload carries the key or the text |
| AC-2 red | scratch copy | render line restored: 15 failed. `mechanismSummary` back in `getSupplement`: 15 failed. The page passing whole supplements: 1 failed (`page.test.tsx`) |
| AC-2 `/library/[slug]` | read, owner check 2026-09-28 | no change needed: `SupplementDetail` is a server component (`page.tsx:86`, no `"use client"`); its one client child `Tabs` takes pre-rendered `ReactNode` content (`Tabs.tsx:5-8`); `AddToStackButton` takes primitives (`page.tsx:78-82`). Stack Lab maps to `{id, name, unit}` (`stack-lab/[stackId]/page.tsx:26-30`) |
| AC-3 | same, + `npx vitest run src/lib/safety` | the label precedes the description in one block, on the card and on every detail page. The payload carries `unverifiedBackground`, never `description`. The label passes the banned-language sweep |
| AC-3 red | scratch copy | label removed from detail: 15 failed. From the card: 1 failed. `description` key restored in the payload: 30 failed |
| AC-4 | `npm run content:generate -- --check` | 0 stale. Grades A 4 · B 9 · C 8 · D 6. `git diff content/` is the one creatine line |
| AC-5 | `npx vitest run src/architecture` | green in the full run (145 files, 1787 tests) on a scratch copy carrying the N-98 extension. No new spec file |
| AC-6 | independent reviewer, scratch copy | **BLOCKING on the record only; code PASS WITH NOTES.** The plan stated approvals not yet given; corrected before the stop, then recorded as approved. Notes taken: label false for ashwagandha (owner replaced it), a comment calling the copy "GENERATED" (reworded), the card test scanning only `<p>` (now counts occurrences; red on a stray `span`), the page payload (fixed on approval) |
| AC-7 | G on the staged tree, clean worktree | run after approval; see §6 |

## 5. Findings

- **N-96** — `mechanism-sweep.mjs --check` fails after (c). CLOSED by ruling: the report is frozen as a dated
  snapshot; its `--check` was valid at `830e108` only. Not regenerated.
- **N-97** — ruling (1) had stopped the flag on a duplicated supplement. CLOSED: fixed in this landing.
- **N-98** — the brief's *May touch* omitted the prop path. CLOSED on the owner's widening.
- **Outside this unit:** interaction and food-pairing `mechanism` text was never swept (`InteractionSection.tsx:63`,
  `FoodPairingSection.tsx:30`, `tools.ts:249`, `interactions/to-flags.ts:64-80`).
- **Residual, by ruling (1):** the two pairs that still flag render *"through overlapping mechanisms"* on tags the
  sweep supports only as a stated outcome (N-95's reviewer note).

## 6. Stop, review and landing

Shown verbatim and approved (2026-09-28): the label (owner's text), the `safety.test.ts` change, the creatine line,
the roadmap line, the N-98 diff and the bound-copy design. The page-payload diff was shown before staging. G runs on
the staged tree in a clean worktree. The commit and its CI run cannot be named inside the commit; they are in the
landing report and in `git log`.
