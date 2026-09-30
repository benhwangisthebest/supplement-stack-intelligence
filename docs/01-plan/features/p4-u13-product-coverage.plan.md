# p4-u13-product-coverage — PDCA cycle artifact for Phase 4 U13

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U13**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U13 · Products, coverage statement only · **SUPERVISED** · deterministic · size S · **Anchor** `7e9c9a2` ·
> **Date** 2026-09-29
> **Authority:** the owner's standing approval for U13 (branch, commit, push, fast-forward, delete) under the brief's
> gate conditions. **Not covered:** the coverage-limit copy, which is an owner batch (§4). RC-1…RC-4 and PARALLEL MODE
> (U11 alongside) are in force.
> **Opening check:** main CI run `36646849737` read once: `completed / success` on `7e9c9a2…`.

## 1. Plan

**Goal (the brief's):** `ProductMatchPanel` states, through `<CoverageLimit>` and a `COVERAGE` entry, that matches come
from a small curated product set, not the whole market. **Retires:** FU-59.
**Rulings:** D-3 (the statement only; the catalog is OUT → roadmap backlog; no product data touched) · §2.2 rule 10 ·
§4 rule 7 (a client component gets its copy as props).
**May touch:** `ProductMatchPanel.tsx`, `StackLabClient.tsx`, `stack-lab-props.ts`, `src/app/stack-lab/**/page.tsx`,
`src/lib/safety/index.ts` (the entry) + `safety.test.ts`, `CoverageLimit.test.tsx`, the components' existing tests, the
plan's U13 and FU-59 rows, the decision queue, this file. **May not touch:** `content/seed/seed-products.json`,
`src/lib/product-matcher/**`, `src/types/**`, migrations, `CLAUDE.md`, `package.json`, workflows, allowlists.

## 2. Design

**The strings** (all in `src/lib/safety/index.ts`; owner ruling Q-14): `COVERAGE.productMatchLimit` (`dataset:
"products"`, a new `CoverageDataset` member, `state: "limit"`), and `productMatchCopy.subtitle` / `.noMatches`.

**The prop path.** The page already passes `copy={stackLabCopy()}`, so the page file is **unchanged**.
`stackLabCopy().productMatch` is a `ProductMatchPanelCopy` of `{ subtitle, noMatches, limit, hiddenReasons }` →
`StackLabClient` passes `copy={copy.productMatch}` → `ProductMatchPanel` renders the subtitle,
`<CoverageLimit copy={copy.limit}>` and the empty-state line, and hands `hiddenReasons` to each `ProductMatchCard`. Both
client files import types only, so CLIENT_TAKES_PROPS stays green and its allowlist stays empty.

**No certification claim rendered (Q-14, render-only).** The card drops the `testingTags` badges, the "Tested" score
column (5 → 4 columns), the reason `safetyCopy.productReasonTested()` (filtered through `hiddenReasons`, which the
server builds so the client retypes nothing), and the free-text `qualityNotes` line. **The notes line is not named in
the ruling.** It goes because the notes carry certifier and testing claims (*"USP verified"*, *"IFOS 5-star"*,
*"third-party tested"*), and the ruling's test ("no certifier name for any seed product") cannot pass while it
renders. The matcher still scores testing (FU-82).

**Where the statement renders.** Whenever the panel is expanded: before any search, beside matches, and beside a group
with no match (M3 in the first round pinned it).

## 3. Do: files

| File | Change |
|---|---|
| `src/lib/safety/index.ts` | `"products"` dataset; `COVERAGE.productMatchLimit`; `productMatchCopy` (§4) |
| `src/components/stack/stack-lab-props.ts` | `ProductMatchPanelCopy`; `StackLabCopy.productMatch`, built in `stackLabCopy()` |
| `src/components/stack/StackLabClient.tsx` | passes `copy={copy.productMatch}` |
| `src/components/stack/ProductMatchPanel.tsx` | `copy` prop; subtitle, `<CoverageLimit>` and empty state from it |
| `src/components/stack/ProductMatchCard.tsx` | **outside the brief's list; the owner widened *May touch* to it (2026-09-29).** No badges, no Tested score, no testing reason, no notes; the additives label arrives as a prop |
| `src/components/evidence/CoverageLimit.test.tsx` | panel in `SURFACES`; two RENDER cases; the placeholder-through-prop test (AC-3) |
| `src/lib/safety/safety.test.ts` | both strings in the banned sweep; copy-constraint tests (§4) |
| `src/components/stack/StackLabClient.test.tsx` | three limits in DOM order + subtitle; the no-certification test over all 21 seed products |

## 4. The copy (owner ruling Q-14, 2026-09-29, verbatim)

- **Limit:** *"Matches come from a small, curated set of sample products, not real market listings. Being in this set
  is not an endorsement, and a product outside it was never considered, so its absence here is not a judgement on it.
  Products are left out only when a listed allergen matches an allergy entered in your profile. Allergen listings in
  this set are incomplete, so a product shown here may still contain something you avoid — check the label."*
  The allergen sentences are from the second ruling. They replaced *"Products that conflict with allergies in your
  profile are left out."*, which round 2 blocked (§7 B2).
- **Subtitle:** *"Sample products ranked by fit — never by commission."* (was "Real products…")
- **Empty state:** *"No matching products to show."* (was "No matched products in the current catalog.")
- **Additives label:** *"Additives"* (was "Clean", typed in the card). It is `productMatchCopy.additivesLabel`, handed to
  the card as a prop.

Constraint → test (`safety.test.ts`): a regex per clause (small · curated · sample products, not real market listings ·
not a judgement · the exact-match allergen sentence · the incompleteness sentence), plus a **negative** regex that
fails if B2's overclaiming sentence returns (M24). **No quality claim:** the word list gained `vetting` and `assess\w*` (review N7).
The phrase `not an endorsement` must be present, and it is removed before the list is applied, so an unnegated
"endorse…" is still red (M15). The list also runs over `productMatchCopy`. **No banned phrase:** the `safety.test.ts`
sweep and `CoverageLimit.test.tsx`'s COVERAGE sweep.
**Round 1 (superseded):** *"Matches come from a small, curated set of products, not the whole market. A product that
isn't in this set hasn't been assessed, so its absence here is not a judgement on it."* It was blocked by §7 B1.

## 5. Check: red evidence (scratch worktree at `7e9c9a2`, RC-2; every plant restored by copy, `cmp` OK)

Suites: `CoverageLimit.test.tsx`, `safety.test.ts`, `StackLabClient.test.tsx`. Round 1 (the first copy, 44 tests):

| # | Plant | Result |
|---|---|---|
| **R0** | HEAD + the `SURFACES` registration only (AC-2) | **red, 2**: "renders `<CoverageLimit`" (ProductMatchPanel does not match `/<CoverageLimit\b/`) and "every surface has a render case" (6 ≠ 7) |
| R1 | HEAD source + all three new test files | red, 5: both RENDER cases, the completeness check, AC-3, the StackLabClient three-limits case |
| G0 | the built tree | green, 44/44 |
| M1 | panel renders no `<CoverageLimit>` | red, 4 |
| M2 | `StackLabClient` passes `copy.stackCustomItems` instead | red, 1: the StackLabClient case (prop-path reachability, §5 rule 3) |
| M3 | statement rendered only after a search | red, 2 |
| M4 | the first sentence retyped in the panel | red, 4, AC-3 included |
| M5 | "…, all third-party tested." appended | red, 1: no-quality-claim |
| M6 | "small" dropped | red, 1: small-and-curated |
| M7 | "Results guaranteed." appended | red, 3: both banned-language sweeps + AC-3's split pin |

**Round 2** (the Q-14 build, 45 tests; the same scratch worktree, source reset to `7e9c9a2` for R2):

| # | Plant | Result |
|---|---|---|
| **R2** | HEAD source + the round-2 tests | **red, 6**, the **no-certification test included (the ruling's "red at HEAD")** |
| G1 | the built tree | green, 45/45 |
| M8 · M9 · M10 · M11 | certifier badges back · testing reason unfiltered · quality notes back · "Tested" score back | red, 1 each: the no-certification test |
| M12 · M13 · M14 | subtitle retyped · limit retyped **by string concatenation** (review A4's evasion) · empty state retyped | red, 1 each: the placeholder test |
| M15 | "is not an endorsement" → "is an endorsement" | red, 1: no-quality-claim |
| M16 | panel renders no `<CoverageLimit>` | red, 5 |
| M17 | `stackLabCopy` hands `stackCustomItems` as the limit | red, 3 |
| M18 | `hiddenReasons: []` server-side | red, 1: the no-certification test |

**Round 3** (the second ruling, 45 tests; the same scratch worktree). The no-certification test now reads visible text
**and** the `title`, `aria-label` and `alt` values of every element in the panel. The reviewer showed that a
`title` plant went green under the text-only test. The placeholder test now renders cards, so the card's label and
`hiddenReasons` pass through it too (review N9).

| # | Plant | Result |
|---|---|---|
| G2 | the built tree | green, 45/45 |
| M19 · M20 · M21 | certifier names in the article's `title` · a quality note in its `aria-label` · certifier names in an `<img alt>` | red, 1 each: the no-certification test |
| M22 | "Additives" retyped in the card | red, 1: the placeholder test |
| M23 | the label back to "Clean" | red, 2: no-quality-claim + the no-certification test |
| M24 | B2's allergen sentence restored | red, 1: the copy-clause test |

In round 1, M7's third red exposed a brittle sentence-count pin. Round 2 replaced that check with the placeholder test. **`CoverageLimit`'s completeness regex does not reach this panel**
(the plan row says so): the panel imports no dataset accessor, so registration is by hand. R0 is what makes that
registration load-bearing. It is not derived.

## 6. Check: gates

At the worktree, round 2: `tsc --noEmit` clean · `npm run lint` 430 of 430, 0 errors ·
`npx vitest run src/architecture` **30 files**, 518 tests, green (RULE8 and CLIENT_TAKES_PROPS included).
**G on the staged tree** (AC-6). Run on 2026-09-29 against the 11 staged files, all inside *May touch* as the owner widened it. It ran in a clean worktree at `bd304d1` with the staged patch applied (byte-identical to `git diff --cached`) and a fresh `npm ci`. Results:
- typecheck clean;
- lint 430 of 430, 0 errors;
- vitest 1989/1989 across 150 files;
- `test:coverage` green, no floor edited;
- `next build` OK;
- `verify:rendering` OK;
- `verify:bundle` OK: the largest move was +253 B on `/advisor` (unchanged by this unit), and `/stack-lab/[stackId]` moved −14 B;
- E2E non-live: 70 passed, 30 `[LIVE]` skipped.

This paragraph was added after that run. The docs-only change was re-checked with `src/architecture` and lint.

## 7. Independent review (AC-5): **BLOCKING**

A fresh subagent reviewed a scratch copy at `7e9c9a2` + the diff. It restored every file it mutated by copy, and `cmp` against this tree is identical.
- **B1 (BLOCKING, confirmed by the runner).** The catalog is **mock**. `src/data/seed-products.ts:4-5` calls it *"Curated sample data,
  not real listings"*, and all 16 brands are fictional. So *"not the whole market"* presents it as a slice of the market.
  *"A product that isn't in this set hasn't been assessed"* implies that listed products **were** assessed. Beside the
  subtitle "Real products ranked by fit", the NSF/USP badges and the "Tested"/"Clean" scores, *curated* + *assessed*
  read as vetting. That breaks the no-quality-claim constraint by implication, and §2.2 rule 7.
- **A2.** An in-set product dropped for an allergen conflict leaves "No matched products in the current catalog.", which is
  then false (a fish allergy empties omega-3: both of its products carry `fish`).
- **A3.** Custom items get no group, and `stackCustomItems` does not mention product matching.
- **A4.** AC-3's source check misses a retype split by string concatenation (green). A sentinel-prop render test
  would close it.
- **N6.** The registration is manual, not derived (§5 already says so).
- **N7.** The word list admits *curated* / *assessed*.
- **N8** (pre-existing, §8.1). The subtitle says "Real products". Real certification names sit on fictional brands
  (§2.2 rule 8). **Unregistered: needs an FU row.**

Per AC-5, the unit **stopped**. The owner ruled on Q-14 (§4), and A2 → the allergen sentence, A3 → FU-83, A4 → the
placeholder test, N7 → the word list, N8 → the subtitle and FU-82.

**Round 2 review (fresh subagent, scratch at `7e9c9a2` + the Q-14 build; restored by copy, `cmp` identical): BLOCKING.**
- **B2 (BLOCKING, confirmed by the runner).** *"Products that conflict with allergies in your profile are left out"*
  claims more than the code computes. `hasAllergenConflict` (`src/lib/product-matcher/rules.ts:70-76`) excludes a
  product only when a seed `allergenTags` entry **equals** a free-text profile allergy after trim and lowercase, so
  "dairy" or "milk allergy" still shows both whey products (`milk`). Only 5 of the 21 seed products carry any
  allergen tag. A shown product then reads as "no conflict with my allergies" (§2.2 rule 10).
- **Primary question: no certification claim renders.** This covers the card, the panel, every seed product and every
  state. The fit score is not a rendered claim: the certifier is never named and the weights are not shown.
- **A5.** The fit score and order still include `WEIGHTS.testing` 0.2 (FU-82), and the four cells no longer account for
  the number. The card's "Clean" label reads as a purity claim.
- **A6.** The no-certification test reads `textContent` only. Certifiers placed in a `title` or `aria-label` attribute
  went **green** (reviewer's M1).
- **N9.** The placeholder test passes `hiddenReasons: []`, so the wiring is guarded only by the no-certification test.
  `hiddenReasons` matches on the copy string. The API still ships `testingTags` and `qualityNotes` (not rendered).
  "Add items…", the affiliate note and the button labels are still typed in the client (pre-existing).

The unit **stopped again** (AC-5). **Rebased** onto `bd304d1` (U11), with renumbering per the owner: FU-82, FU-83, Q-14.
The source comments' `Q-13` were renamed to `Q-14` (owner-approved, comments only).

**Second ruling (Q-14, 2026-09-29):**
- B2 → the exact-match and incompleteness sentences (§4).
- A6 → the attribute scan (round 3, M19–M21).
- A5 → "Clean" becomes "Additives" through the props; FU-82 records that the cells no longer sum to the fit score.
- N9 → FU-82 records that the API still sends `testingTags` and `qualityNotes`; the client-typed labels become **FU-84**.

## 8. Act

The owner approved on 2026-09-29 the final COVERAGE text and its comment, the Additives path, the allergen regex, the FU-82 additions and FU-84. Next: G (§6, green), the commit `feat(stack): U13 — product panel states its coverage limit (FU-59)`, the branch CI, then a fast-forward of `main`. The commit and CI run ids are in the landing report.
