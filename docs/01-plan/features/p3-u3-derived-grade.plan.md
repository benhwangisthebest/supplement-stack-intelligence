# p3-u3-derived-grade — PDCA cycle artifact for Phase 3 U3

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U3**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U3** (L168–169, status APPROVED).
> Where the two disagree, the register wins.
>
> **Feature**: `p3-u3-derived-grade` · **Anchor**: `697a79c` · **Date**: 2026-09-23 ·
> **Type**: deterministic (no network, no OpenAI, no deployed DB, no CI change)

---

## 1. Plan

**Problem.** `Effect.grade` is a hand-typed letter on all 27 effects. For the 8 with an `evidenceProfile`,
a derivation exists, but the authored letter can still be edited. For the other 19, nothing makes a grade
without a profile a failure. **Goal:** where a profile exists the grade is derived, not authored. A grade
without a profile fails the build, except for the 19 on a shrink-only allowlist that U4 empties. **No
effect's grade value changes.** No new ruling applies.

**Baseline, re-measured at `697a79c`** (a scratch vitest file importing `@/data/seed-effects`, then deleted):

| Figure | Value | Command |
|---|---|---|
| Effects | **27** | `SEED_EFFECTS.length` |
| …with `evidenceProfile` | **8** | `.filter(e => e.evidenceProfile).length` |
| …without | **19** | `.filter(e => !e.evidenceProfile).length` |

The register names **counts**, not the 8 ids (register §2 L32–33). The ids are consistent with the one list
it does name: the four Grade A effects without a profile (L35), all four of which are in the 19 below. **No
stop condition fires.**

**The derivation (verified, not invented).** `deriveGrade(profile)` at
`src/lib/evidence-grading/index.ts:40-46` computes the weighted composite
`Σ weight[d] × score[d]/3` (`:29-36`), with weights and thresholds from `weights.ts:8-14, 23-28`. It maps
≥.75 to A, ≥.55 to B, ≥.35 to C, and anything lower to D. It reads only `profile.dimensions[d].score`, so
**it needs no data the profile does not carry**. At runtime, `resolveEffect` (`src/lib/evidence/index.ts:27-31`)
already swaps in the derived grade, and `defaultLibrary` pre-resolves every effect (`:38-43`).

## 2. AC-1: derivation vs authored, per profiled effect

| id | authored | derived | composite | match |
|---|---|---|---|---|
| magnesium-sleep | B | B | 0.617 | ✓ |
| creatine-strength | A | A | 0.967 | ✓ |
| creatine-cognition | C | C | 0.467 | ✓ |
| vitamin-d-deficiency | A | A | 0.950 | ✓ |
| fish-oil-cardiovascular | B | B | 0.700 | ✓ |
| melatonin-sleep | A | A | 0.883 | ✓ |
| ashwagandha-stress | B | B | 0.667 | ✓ |
| caffeine-focus | A | A | 0.917 | ✓ |

**8 of 8 match.** The 19 without a profile, with their authored grades:
`magnesium-stress` C · `magnesium-metabolic` C · `creatine-recovery` C · `vitamin-d-immune` C ·
`fish-oil-mood` C · `fish-oil-longevity` C · `l-theanine-focus` B · `l-theanine-stress` B · `glycine-sleep` B ·
`ashwagandha-sleep` C · `berberine-metabolic` B · `zinc-immune` B · `zinc-deficiency` A ·
`vitamin-b12-deficiency` A · `caffeine-training` A · `taurine-training` C · `nac-antioxidant` C ·
`protein-powder-training` A · `protein-powder-recovery` B.

## 3. Design (AC-2): where the grade stops being authorable, and why

**Chosen: the JSON keeps `grade`, and a guard asserts it equals `deriveGrade(evidenceProfile)`.** The guard
reads the authored source `content/seed/seed-effects.json`, the same way G3 does. **Rejected: the generator
emits the derived grade and the JSON omits it.** There are three reasons:

1. **The generator cannot reach the derivation without inventing one.** It runs as plain
   `node content/generate.mjs` (`package.json:24`), and `deriveGrade` is TypeScript under `src/lib` behind
   the `@/` alias. Emitting grades would need either a TS runtime and alias resolution inside codegen, or a
   copy of the rubric in `.mjs`. The copy is a second derivation that can drift, and the brief forbids
   inventing grading rules.
2. **Byte identity (AC-5) would cost machinery.** An omitted key has to be re-inserted at its exact slot
   (between `outcomeCategory` and `confidence`) on 8 of 27 rows. That is emitter logic whose only job is to
   reproduce what is already in the file.
3. **The runtime already treats the letter as a cache.** `resolveEffect` overwrites it for every consumer
   (§1). With the guard in place, the cache cannot disagree with its source. The equality check *is* the
   non-authorability: any letter except the derived one fails the build.

`src/types/effect.ts:15` (`grade: EvidenceGrade`, required) and `src/lib/**` are untouched. **No
src/types or src/lib change is needed**, so that stop condition does not fire.

**Recorded deviation (owner ruling 2026-09-23).** The register's *"stops being authorable"* became
*"authorable, but G4 requires it to equal `deriveGrade`"*, for reasons 1 and 2 above. The stored letter is a
cache that the app already recalculates (reason 3).

**The guard — G4 in `src/data/seed-integrity.test.ts`**, beside G1–G3 (a `*.test.ts` file, outside the
layer rules per `boundaries.test.ts:244-252`, so it may import `@/lib/evidence-grading`):

| Test | Fails when |
|---|---|
| G4a anti-vacuity | the JSON has zero effects, or zero profiled effects |
| G4b derived | a profiled effect's `grade` ≠ `deriveGrade(evidenceProfile)`. Names id, authored, derived |
| G4c no profile, no grade | an effect has no profile and is not allowlisted. Names every such id |
| G4d shrink-only | an allowlisted id is not in `ALLOWLIST_ORIGIN`, the frozen set of the 19 measured at `697a79c` (FU-55 ruling; it replaced a `length ≤ 19` ceiling) |
| G4e stale | an allowlisted id now has a profile (U4 must delete the entry in the same change) |
| G4f unknown | an allowlisted id is not an effect id, or is listed twice |

`evidence-grading.test.ts:122-126` ("derived grade matches each effect's curated grade") reads the generated
TS and is subsumed by G4b. It is **retired with a pointer comment**, as U2 (c) did with the TS-only
`paperIds` check. **Spec count:** G4 lives in `src/data/`, not `src/architecture/`, so `SPEC_COUNT` does not
move.

## 4. AC-6: callers of `Effect.grade`

`SEED_EFFECTS` is imported by exactly one non-test module, `src/lib/evidence/index.ts:4`. Every other reader
gets effects through `defaultLibrary`, which resolves them (`:38-43`). The readers of an `Effect`'s `grade`
field (`git ls-files 'src/*'`, non-test, excluding `src/types` and the seeds, grepped for `grade`):

- **Engines:** `lib/evidence/index.ts:30,102` · `lib/stack-evaluator/rules.ts:93-94,122` ·
  `lib/protocol-builder/index.ts:93,97,106,110` · `lib/identity/index.ts:54,56` ·
  `lib/identity/traits.ts:60` · `lib/identity/supplement-archetypes.ts:35`
- **Advisor / API** (`/api/advisor` via tools): `lib/advisor/tools.ts:73,114,170` · `lib/advisor/actions/proposals.ts:57`
- **UI:** `app/library/page.tsx:19` · `components/library/SupplementCard.tsx:24` ·
  `components/library/SupplementDetail.tsx:159`
- **Schema:** `lib/validation/seed.ts:41` (`grade` stays required, and the JSON still carries it)
- *Not `Effect.grade`:* `app/page.tsx:165-179` (literal marketing rows) · `EffectGradeBadge.tsx` (a prop) ·
  `SuggestionCard.tsx:31` and `proposals.ts:247,252` (`ProtocolSuggestion.grade`) · `protocol-builder/rules.ts`
  and `safety/index.ts:228` (parameters)

**None needs to change.** U3 changes no value and no type, so every reader sees the same letter as before.

## 5. Do: landing (a)

Files: `src/data/seed-integrity.test.ts` (G4), `src/lib/evidence-grading/evidence-grading.test.ts` (retire
`:122`), this artifact, and the register's U3 entry at closeout. **Nothing under `content/` changes**, since
the design needs no generator or JSON edit. `src/data/seed-*.ts` is untouched.

## 6. Check: red proofs and gate

Every plant was reverted from **file-copy backups**, never `git checkout` (`CLAUDE.md` §5.11). After each
restore, `content:generate -- --check` reported `9 modules, 0 stale`, and `shasum` of the three touched
files matched the backups. JSON plants were regenerated before the run, so G4 fails on its own rather than
through `CONTENT_FIDELITY`.

| AC | Plant | Result (`npx vitest run src/data/seed-integrity.test.ts`) |
|---|---|---|
| AC-2 | `magnesium-sleep` `grade` B→A in JSON, regenerated | **G4b red**: `+ "magnesium-sleep: authored A, derived B"`. 1 failed / 12 passed. Restored: 13/13 |
| AC-3 | allowlist emptied | **G4c red**, names all **19**: `magnesium-stress, magnesium-metabolic, creatine-recovery, vitamin-d-immune, fish-oil-mood, fish-oil-longevity, l-theanine-focus, l-theanine-stress, glycine-sleep, ashwagandha-sleep, berberine-metabolic, zinc-immune, zinc-deficiency, vitamin-b12-deficiency, caffeine-training, taurine-training, nac-antioxidant, protein-powder-training, protein-powder-recovery`. 1 failed / 12 passed |
| AC-4(i), as briefed, on the superseded ceiling | 20th id (`magnesium-sleep`) appended | **G4d red**: `expected 20 to be less than or equal to 19`. G4e is also red. 2 failed |
| AC-4(i), on the FU-55 origin set | `zz-new-effect` appended | **G4d red**: `+ "zz-new-effect"`. G4f is also red. `magnesium-sleep` appended: G4d and G4e red. 2 failed each |
| **FU-55 scenario** | U4-style: `glycine-sleep` given a profile and removed from the list (18); a new unprofiled `zz-new-effect` added to the JSON and the list (19) | **G4d red alone**: `+ "zz-new-effect"`. 1 failed / 12 passed. The old `≤ 19` ceiling passes this plant, which is the gap |
| AC-4(ii) | `glycine-sleep` given `magnesium-sleep`'s profile (derives B, equal to its authored B), still listed | **G4e red**: `+ "glycine-sleep"`. G4b stays green, so the entry is the only fault. 1 failed |
| AC-4(iii) | `glycine-sleep` → `zz-not-an-effect` in the allowlist | **G4f red**: `+ "zz-not-an-effect"`. G4c is also red (`+ "glycine-sleep"`, now unlisted). 2 failed |

**Against today's list, G4d never fails alone.** The origin set is every unprofiled effect, so any new entry is
also profiled (G4e) or unknown (G4f). It fails alone once U4 frees a slot (the FU-55 row). *(Process note: the
first attempt at that plant edited `ALLOWLIST_ORIGIN` instead of the list, because both contain the same
string. The mismatched output exposed it, and the rerun edited the list, which the 19-entry count confirmed.)*

**AC-5, no value changes.** `npm run content:generate -- --check` reported `checked 9 modules, 0 stale`.
`npx tsx content/proofs/prove-values.mjs 697a79c` reported `values: 9 modules compared against 697a79c,
failures=0`, with `deepStrictEqual=true keyOrder=true` on all nine. `git diff --stat` shows no file under
`content/` or `src/data/seed-*.ts`.

**AC-7.** `git ls-files 'src/architecture/*.test.ts' | wc -l` → **28**, and `SPEC_COUNT`'s pin is
`spec-count.test.ts:97` `toBe(28)`, so it is unchanged. `LAYER_FLOORS["src/data"]: 8`
(`boundaries.test.ts:147`) is unchanged, with **10** non-test `.ts` today (no source file added).
`npx vitest run src/architecture` → 28 files, **414/414**.

**Gate (§5.10), on the landing tree:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — *378 of 378 tracked source files, 0 errors* |
| `npx vitest run` | exit 0 — **1475 / 1475 across 116 files** (U2 close: 1470 / 116; +6 G4, −1 retired = **+5**) |
| `npx next build` | exit 0 |
| `npm run verify:rendering` | OK, no prerendered page HTML |
| Null bytes in edited files | 0 in all three |

## 7. Findings

Re-derived: `git grep -ohE 'FU-[0-9]+' -- docs CLAUDE.md | sed 's/FU-//' | sort -n -u | tail -1` → **54**.
The N-series max is **83**. No new N- finding.

- **FU-55** *(new, low)*: **CLOSED by owner ruling 2026-09-23.** The ceiling became the frozen set
  `ALLOWLIST_ORIGIN`, which the list must stay a subset of. The red is in §6. *As raised:* a `length ≤ 19` ceiling
  let a new unprofiled effect take the slot of any entry U4 removed.
- **`[P3-X1]` stays unticked.** U3 delivers the mechanism. U4 delivers the content (27/27 profiled).

## 8. Report

**U3 DONE — 2026-09-23.** Landing (a) `89e22bd` was branched from `main`, pushed, and passed CI run
`35833745258` on the pushed SHA. It was fast-forwarded to `main`, and its branch was deleted on both sides.
**Owner rulings recorded in the register:** the AC-2 deviation, and FU-55 (closed). **Carried items retired:**
none. **`[P3-X1]`** stays unticked until U4 empties `UNPROFILED_GRADE_ALLOWLIST`. **Next unit:** U5
(register order U1 → U2 → U3 → U5 → U6 → U4).
