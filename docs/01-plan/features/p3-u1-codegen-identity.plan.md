# p3-u1-codegen-identity — PDCA cycle artifact for Phase 3 U1

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U1**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U1** (status APPROVED), including
> its **2026-09-23 ruling** that splits U1 into landings (a) and (b). This file mirrors the register and
> does not replace it; sections 1–7 point at it. Where the two disagree, the register wins.
>
> **Feature**: `p3-u1-codegen-identity` (the `p3-` prefix avoids Phase 1/2's U1) · **Base SHA**: `b5aaab8`
> · **Date**: 2026-09-23 · **Type**: deterministic (no network, no OpenAI, no deployed DB)

---

## 1. Scope

Register §4 U1 and its 2026-09-23 ruling. **Landing (a)** normalises the nine `SEED_*` modules into the
emitter's layout, value-identical. **Landing (b)** adds the JSON round trip, the byte-identity guard and
its red proofs, anchored to (a)'s output. AC-4 now reads *"`src/data/` untouched **after landing (a)**"*.

## 2. Why (a) exists — the finding that stopped the first session

| Obstacle | Evidence at `b5aaab8` |
|---|---|
| Comments inside the array literal (JSON cannot carry them) | `seed-effects.ts` 15, `seed-products.ts` 15, `seed-food-pairings.ts` 2 (`:12`, `:98`), `seed-interactions.ts` 2 (`:9`, `:194`) — 34 lines |
| Blank separator lines inside the array | effects 14, products 14, food-pairings 1, interactions 1 |
| Hand layout, no width rule reproduces it | `seed-effects.ts:50` keeps a 92-byte `summary:` on one line; `:284-285` breaks one that joins to ~90 |
| No formatter available | no `prettier`/`biome`/`dprint` in `package.json`, no config file |

Not obstacles: no spreads, template literals, computed values, `undefined`, Dates or functions.

## 3. Design — the layout rule

Written in the header of `content/emit.mjs` (rules **L1–L7**), which is now the only source of layout
for the nine modules. In short: the preamble (everything before `export const`) is kept verbatim. The
rest has two-space indent, and an array goes on one line only when every element is a primitive. Objects
are always one key per line, in the value's own key order. Keys are bare when they are valid identifiers.
Strings are written by `JSON.stringify`. Anything JSON cannot represent throws. There is **no line-width
rule**, and nothing inside the value is a comment or a blank line. The emitter depends on nothing (plain
Node ESM), so U2 can wire it into a build without a new dependency.

## 4. Landing (a) — do

1. Snapshot: `git show b5aaab8:src/data/<m>.ts` for each of the 9 modules into a scratch directory
   (read from git, not from memory).
2. Normalise: for each module, import its exported `SEED_*` value (`npx tsx`), keep its preamble, and
   write `emitModule(...)` back over the file. `seed-biomarker-relevance.ts` came out **byte-identical**
   (4435 → 4435); it was already in this layout.
3. Result: `git diff --stat -- src/data/` → **8 files changed, 699 insertions(+), 339 deletions(-)**.
   Residual comments or blank lines inside any array: **0** in all 9.

## 5. Landing (a) — check

The proofs are checked in under `content/proofs/`, as `.mjs` so `npm run lint` covers them once tracked.
`base.mjs` materialises each module at a ref with `git show` (default `b5aaab8`), and the three proofs run
as `npx tsx content/proofs/<proof>.mjs [ref]`. **Clean-clone run:** `git clone` → overlay this landing →
`npm ci` → all three exit 0 with the output below.
**Mutation run** (same clone, glycine `generalDose.max` 5 → 3): `prove-values` exit 1, `prove-tokens`
exit 1 (`unexplained=1`). `check-dose-comments` reads only the base ref, so its mutation empties
`RECORDED_NOT_HELD` instead: exit 1, `DIFFERS`.

**Value proof** (`prove-values.mjs`). Each module at `b5aaab8` and in the working tree is imported, and
the pairs are compared with `node:assert` `deepStrictEqual` **and** `JSON.stringify` equality (key order):

```
SEED_BIOMARKER_RELEVANCE   len=15 deepStrictEqual=true keyOrder=true
SEED_BIOMARKERS            len=13 deepStrictEqual=true keyOrder=true
SEED_EFFECTS               len=27 deepStrictEqual=true keyOrder=true
SEED_FOOD_PAIRINGS         len=10 deepStrictEqual=true keyOrder=true
SEED_INTERACTIONS          len=20 deepStrictEqual=true keyOrder=true
SEED_PAPERS                len=20 deepStrictEqual=true keyOrder=true
SEED_PRODUCTS              len=21 deepStrictEqual=true keyOrder=true
SEED_SIDE_EFFECTS          len=12 deepStrictEqual=true keyOrder=true
SEED_SUPPLEMENTS           len=15 deepStrictEqual=true keyOrder=true
```

**Token proof** (`prove-tokens.mjs`). `ts.createScanner(ES2022, skipTrivia=true)` over the old and new text. Trivia
(whitespace, comments) is skipped by the scanner, and a comma directly before `]` or `}` is removed from
both sides. The remaining sequences are then compared by kind **and** text:

```
SEED_BIOMARKER_RELEVANCE tokens=468  trailingCommas 16->16  numericSpellingSameValue=0  unexplained=0
SEED_BIOMARKERS          tokens=596  trailingCommas 14->27  numericSpellingSameValue=3 [18.0->18, 3.0->3, 4.0->4]  unexplained=0
SEED_EFFECTS             tokens=2494 trailingCommas 44->111 numericSpellingSameValue=0  unexplained=0
SEED_FOOD_PAIRINGS       tokens=438  trailingCommas 11->11  numericSpellingSameValue=0  unexplained=0
SEED_INTERACTIONS        tokens=698  trailingCommas 21->21  numericSpellingSameValue=0  unexplained=0
SEED_PAPERS              tokens=778  trailingCommas 21->21  numericSpellingSameValue=0  unexplained=0
SEED_PRODUCTS            tokens=1327 trailingCommas 22->22  numericSpellingSameValue=0  unexplained=0
SEED_SIDE_EFFECTS        tokens=651  trailingCommas 25->52  numericSpellingSameValue=0  unexplained=0
SEED_SUPPLEMENTS         tokens=1452 trailingCommas 16->31  numericSpellingSameValue=0  unexplained=0
tokens: 9 modules, 8902 significant tokens compared against b5aaab8, failures=0
```

The token check went **red** on its first run, on exactly the three numeric spellings, before they were
split into their own class. That is the evidence that it detects a non-trivia change.

**D-a1 — RULED allowed (owner, 2026-09-23; recorded in the register's U1 entry).** The first ruling
allowed changes only to whitespace, comments and trailing commas. **Three numeric literals change spelling, not value:**
`seed-biomarkers.ts:69` `"mmol/l": 18.0` → `18`, `:98` `refHigh: 3.0` → `3`, `:123` `"mmol/l": 4.0` → `4`
(line numbers at `b5aaab8`). This is inherent, not a bug in the emitter. A JS number does not remember
`18.0`, and neither can a JSON source (`JSON.parse("18.0") === 18`), so no JSON round trip can keep these
three spellings. The proof counts them as their own class and passes only if each pair is a numeric
literal with `Number(a) === Number(b)`. Every other token is identical, and the proof fails on any
**unexplained** change.

**Rendering mode — `○`/`ƒ` settled (N-82).** The route tables were compared in three builds. **A:** worktree
at `b5aaab8`, no `.env.local`. **B:** the same worktree with a copy of `.env.local`. **C:** B plus this
landing's 8 files. `/library` is **`ƒ` 1.18 kB · 110 kB in all three**, and in this tree. **B and C are
identical line for line**, so landing (a) changes no route. This tree differs from B only by 1 B in
`/auth/login` and `/auth/signup` (727 → 726 B) and in `/stack-lab` (4.14 → 4.13 kB). Source and env are
identical, so the cause is the checkout path. The register's `○` was wrong, and is corrected there as
N-82. The worktree was removed.

**Gate (§5.10), final run on the staged landing-(a) file list:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — *374 of 374 tracked source files, 0 errors* (369 + `content/emit.mjs` + the 4 files in `content/proofs/`) |
| `npx vitest run` | exit 0 — **1446 / 1446 across 114 files** |
| `npx next build` | exit 0 — `/library` 1.18 kB · 110 kB; `/library/[slug]` 1.62 kB · 111 kB; shared 105 kB (unchanged) |
| `npm run verify:rendering` | exit 0 — *"No prerendered page HTML"* |
| `content/proofs/*.mjs` (3) | exit 0 each — values `failures=0`, tokens `failures=0`, dose comments `MATCHES` |
| `LC_ALL=C grep -rlP '\x00' content/ docs/01-plan/` | no output |

## 6. Landing (b) — plan (not started)

Register §4 U1 as briefed: generate `content/*.json` from the (a) modules, emit TS from the JSON with
`content/emit.mjs`, and add the byte-identity spec with red proofs for a trailing comma and a key order.
The spec path, and whether it is an architecture spec (AC-6, `SPEC_COUNT` 27→28), are settled in (b)'s
design. The preambles need a home in the JSON source. That is decided in (b)'s design, not here.

## 7. Report

Landing (a) is green and awaiting commit. D-a1 is ruled. N-82 is corrected in the register and open
for U8. FU-49 is open with owner U2.

---

## Appendix A — disposition of every comment removed from inside an array

| Module (lines at `b5aaab8`) | Text | Disposition |
|---|---|---|
| `seed-effects.ts` — 15 lines | `// ---- <Supplement> ----` | **Dropped** (ruling): restates the grouping |
| `seed-interactions.ts:9`, `:194` | `supplement ↔ drug-class`, `supplement ↔ supplement` | **Dropped** (ruling): restates the grouping |
| `seed-food-pairings.ts:12`, `:98` | `synergy (pairs well)`, `avoid (reduces benefit / adds load)` | **Dropped** (ruling): restates the grouping |
| `seed-products.ts:9,43,77,145,181,215,233,251,269,287,305,323` | 12 `(target X-Y unit)` notes | **Dropped**: the dose equals `generalDose` for the section's supplement |
| `seed-products.ts:111` | `Fish oil (target 1000-3000 mg) — allergen: fish` | **Dropped**: dose held; `allergenTags` has `fish` on 2/2 products |
| `seed-products.ts:341` | `Protein powder (target 20-40 g) — allergen: milk` | **Dropped**: dose held; `allergenTags` has `milk` on 2/2 products |
| **`seed-products.ts:163`** | **`// ---- Glycine (target 3 g) ----`** | **NOT HELD**: `generalDose` is **3–5 g** (`seed-supplements.ts:110`). Recorded here word for word → **FU-49** |

`seed-products.ts:9` reads `target ~200-400 mg`. The `~` has no field to go in; the range itself is held.
Every row was checked mechanically: each comment was parsed, and the supplement ids of the products
between it and the next comment were matched to `SEED_SUPPLEMENTS`. Result: 14 HELD, 1 NOT HELD.

## Appendix B — claims withdrawn or corrected

| Claim | Status |
|---|---|
| The brief's AC-4, *"`src/data/` untouched"* | **Amended by ruling** to "after landing (a)" |
| The ruling's *"0 other tokens changed"* | **Holds for 8899 of 8902 tokens.** The 3 numeric spellings are D-a1 |
| Register §2 records `/library` as `○` (static) at `52e00d9` | **WITHDRAWN — it is `ƒ`** at `b5aaab8`, with and without `.env.local`. Nothing outside `docs/` changed since `52e00d9`. Corrected in §2 as **N-82** |
| The first ruling's allowed classes (whitespace, comments, trailing commas) | **Widened by D-a1** to include same-value numeric spellings |
