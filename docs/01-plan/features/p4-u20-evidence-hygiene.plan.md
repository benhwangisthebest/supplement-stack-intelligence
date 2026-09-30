# p4-u20-evidence-hygiene — PDCA cycle artifact for Phase 4 U20

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U20**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U20 · Evidence hygiene: FU-63 remainder, N-92, FU-75 (+ FU-76 by the owner's widening at U9) ·
> **SUPERVISED** · deterministic · size S · **Anchor** `3c52ab1`, rebased onto `eb4a7a0` (U19) · **Date** 2026-09-29
> **Authority:** the owner's standing approval for U20 (branch, commit, push, fast-forward, delete) under the brief's
> gate conditions. **Not covered, shown verbatim at the stop:** the FU-76 marker copy (§4) and the deleted tests with
> their justification (§3). **Both were approved 2026-09-29 (Q-21).** RC-1…RC-4 and PARALLEL MODE (U19 alongside,
> `../ssi-u19`) are in force. On the rebase, this unit's Q-20 and Q-21 became **Q-21** and **Q-22** (the owner's
> numbering; U19 took Q-20).
> **Opening:** bkit registration (RC-4) was made after the code was drafted, before anything was staged.

## 1. Plan

**Goal (the brief's):** remove the type-unreachable no-profile branches and the comments they contradict, fix N-92's
fixture, break the index↔gate import cycle, and mark chips whose effect name changed. **Retires:** N-90 (code part),
FU-63 (remainder), N-92 (`:133-159`), FU-75, FU-76. **Registers:** FU-85 (AC-5), FU-86 and FU-87 (owner ruling on Q-22).
**May touch:** `SupplementDetail.tsx` + test · `src/lib/evidence/index.ts` + `evidence.test.ts` ·
`src/types/evidence-grading.ts` (comment) · `tests/e2e/evidence-grading-actions.spec.ts` (comment) ·
`src/lib/evidence-grading/**` · `ProvenanceChips.tsx`, `citation-index.ts` + tests · `src/lib/safety/index.ts` (marker
copy, after approval) + `safety.test.ts` · the plan's U20 row, the five items, the new FU · this file · the queue · bkit.
`citation-label.ts` was **not** needed (§2.3). **May not touch:** `content/**`, `src/data/**`, grades, weights,
migrations, `CLAUDE.md`, `package.json`, workflows, allowlists. None was touched.

## 2. Design and Do

### 2.1 N-90 / FU-63 (AC-1)

- `src/lib/evidence/index.ts`: `resolveEffect` loses `if (!effect.evidenceProfile) return effect;`. `effectComposite`
  loses its `: null` arm, so its return type narrows from `number | null` to `number`.
- `SupplementDetail.tsx`: `{e.evidenceProfile && (<EvidenceBreakdown …/>)}` becomes `<EvidenceBreakdown …/>`.
- Comments: `src/types/evidence-grading.ts` (was *"Optional on Effect in the type only … Making it required is FU-63"*)
  and `tests/e2e/evidence-grading-actions.spec.ts:25-26` (was *"… until evidenceProfile becomes required (FU-63)"*).
- Test helpers lose their casts. `evidence.test.ts`'s `effect()` now requires `evidenceProfile`, and
  `SupplementDetail.test.tsx`'s defaults to a profile. No fixture in either file builds a profile-less `Effect`.
- `getBestEffectForOutcome`'s tie-break drops its `?? -1` and its *"profiled ahead of unprofiled"* comment (review A2).
- **Named, not fixed (outside *May touch*):** three callers keep null handling that can no longer run:
  `src/lib/identity/traits.ts:61-62` (`composite === null ? base : …`), `src/lib/protocol-builder/index.ts:117`
  (`?? undefined`) and `src/lib/advisor/tools.ts:56` (`composite: number | null`). One comment is also now false:
  `src/components/evidence/EvidenceBreakdown.tsx:9` (*"Rendered only for profiled effects."*). All of these compile, and
  none changes behaviour; they are dead or stale. Registered as FU-86 (owner ruling on Q-22).

### 2.2 N-92 (AC-2) and FU-75 (AC-3)

**N-92.** All ten `paperIds` in the tie-break fixture (`evidence.test.ts:127-158`) now cite `p1`. Cited, both fixtures
derive the B they carry (composites 0.583 and 0.700). Uncited, the B gate reads effectSize as 0 (FU-74) and both derive
C. The test still asserts `id === "high"`, and it now asserts that each fixture derives B (`:156`).
**FU-75.** `compositeScore`, `compositeGrade` and `COMPOSITE_PRECISION` moved **verbatim** from `index.ts` to a new
`src/lib/evidence-grading/composite.ts`, which imports only `@/types` and `./weights`. `gate.ts` imports from
`./composite`. `index.ts` imports `compositeGrade` from it and re-exports both functions, so every importer is unchanged
(including `scripts/evidence-gate-report.mjs`). Graph: `index → {composite, gate, weights}`,
`gate → {composite, weights}`, `composite → {weights}`. **Guard:** `import-graph.test.ts` (same directory; RC-1 keeps
it out of `src/architecture`). It reads the directory's imports and re-exports with `ts.preProcessFile`, and fails on
any cycle and on `gate → index`. **Structure only:** `gate.test.ts`, `evidence-grading.test.ts`,
`seed-integrity.test.ts` (G4b) and `grade-changes.test.ts` are unmodified (`git diff --quiet` on the four) and pass.
Grades are unchanged: 27 effects, **A 4 · B 9 · C 8 · D 6**, identical id→grade list before and after (via `tsx`).

### 2.3 FU-76 (AC-4)

A chip parses the effect name its stored label carries, `/^.+ → (.+), Grade [ABCD]$/`, the shape every effect-grade
writer uses (`tools.ts:125,180`, `proposals.ts:57`). It marks a rename when that name differs from today's
`effect.name`. **One exclusion, found while building (approved, Q-21):** a protocol proposal's citation
(`proposals.ts:252`) stores the **outcome category** in the name's place (*"Magnesium → sleep, Grade C"*), and
`buildCitations` carries it into the message. So a stored name that is **any** `OUTCOME_CATEGORIES` word
(`@/types/primitives`) is not a rename, even if the effect later moves category (review A1: the first build compared with
today's category only). Without the exclusion, every protocol chip would claim a rename (M4, §5). A label in any other
shape, or one that is not a string (the rows are unvalidated jsonb), gets no name marker. The marker never claims a
rename it cannot read from the label. `{name}` is filled by a function replacer, so a `$&` in a stored name is inserted
literally (R, §5). **Known limit:** an effect or supplement name containing " → " would be misread; none does today.
**The copy path:** `citationUpdatedCopy` (`src/lib/safety`) → `buildCitationIndex()` → `index.updatedCopy`. The index
already travels page → `AdvisorPanel` → `AdvisorMessageBubble` → chips, so no file outside *May touch* changed. It also
gains each effect's current `name`. The U4 R2 grade string moved into `src/lib/safety` unchanged. `data-testid` stays
`grade-updated` whenever the grade changed, so the U4 R2 and U9 tests pass unmodified; a name-only change is
`name-updated`. **Residual:** a renamed **supplement** still updates with no marker (FU-87).

## 3. The deleted tests (stop class 2; approved by the owner 2026-09-29, Q-21, exactly as listed)

| # | Test (file at `3c52ab1`) | Action | (a) its branch is gone | (b) `tsc` rejects its input without a cast |
|---|---|---|---|---|
| T1 | `SupplementDetail.test.tsx` *"an effect without an evidenceProfile shows its grade but no breakdown"* | **deleted** | `e.evidenceProfile &&` removed from `SupplementDetail.tsx` | HEAD's helper with `(base as Effect)` → `base`: `SupplementDetail.test.tsx(49,59): error TS2741: Property 'evidenceProfile' is missing in type 'Omit<Effect, "evidenceProfile">' but required in type 'Effect'.` |
| T2 | `evidence.test.ts` *"resolveEffect leaves a profile-less effect unchanged (legacy)"* | **deleted** | `if (!effect.evidenceProfile) return effect;` removed | re-inserted verbatim into U20's file: `evidence.test.ts(115,22): error TS2345: Argument of type '{ id: string; grade: "B"; }' is not assignable to parameter of type 'Partial<Effect> & Pick<Effect, "id" \| "evidenceProfile">'. Property 'evidenceProfile' is missing …`. HEAD's helper with `return e as Effect;` → `return e;`: `evidence.test.ts(95,5): error TS2322: … Type 'EvidenceProfile \| undefined' is not assignable to type 'EvidenceProfile'.` |
| T3 | `evidence.test.ts` *"effectComposite returns a score for profiled, null for legacy"* | **narrowed, not deleted**: its legacy line `expect(effectComposite(effect({ id: "e4" }))).toBeNull();` goes. It is retitled *"effectComposite returns the profile's composite score"* and keeps its profiled assertion | the `: null` arm removed; return type `number` | `evidence.test.ts(121,35): error TS2345: Argument of type '{ id: string; }' is not assignable to parameter of type 'Partial<Effect> & Pick<Effect, "id" \| "evidenceProfile">'. Property 'evidenceProfile' is missing …` |

(a) is shown by `git grep -nE "evidenceProfile &&|!effect\.evidenceProfile|evidenceProfile \?"` over both source files:
no match. That pattern missed `effectComposite(…) ?? -1` (review A2), which is now removed, and the other dead or stale
sites listed in §2.1. **T2's independent proof** is the one against `3c52ab1`'s helper. The re-insertion proof is checked
against U20's own helper, so it only shows that the helper enforces the rule. T1's grade-title assertion (FU-67) is
still made by *"every effect card carries the badge for its own grade and confidence"*. The remaining profiled test in
T1's `describe` is retitled *"an effect shows its evidence breakdown"*, since the pair it was the anti-vacuity half of
is gone. **Counts** (`grep -cE '^\s*it(\.each\(.*\))?\('` / tests run): `SupplementDetail.test.tsx` 5 → 4 blocks, 19 → 18 run
(one `it.each`) · `evidence.test.ts` 14 → 13 / 14 → 13 · `ProvenanceChips.test.tsx` 12 → 19 / 12 → 19. **Also:** the
default-library test's `expect(effectComposite(…)).not.toBeNull()` could no longer fail, and is now `toBeGreaterThan(0)`.

## 4. The FU-76 marker copy (approved by the owner 2026-09-29, Q-21; `src/lib/safety/index.ts`, `citationUpdatedCopy`)

| Key | When | Text |
|---|---|---|
| `grade` | stored grade ≠ today's, name unchanged | `grade updated since this message` *(the U4 R2 string, unchanged)* |
| `name` | stored effect name ≠ today's, grade unchanged | `renamed since this message (was “{name}”)` |
| `nameAndGrade` | both differ | `renamed and grade updated since this message (was “{name}”)` |

Rendered: `Evidence  Fish Oil (Omega-3) → Triglyceride lowering, Grade A  · renamed since this message (was “Cardiovascular
support”)`. **`renamedFrom` is dropped** (the owner left it to the runner). The old name is now in the visible marker, and
the marker sits inside the chip's link, so the link's accessible name already reads it. A screen-reader copy would only
say it twice. The proposal it replaced (`renamed since this message` plus screen-reader-only text) is in Q-21.

## 5. Check: red evidence (scratch worktree `../ssi-u20-scratch` at `3c52ab1`, U20's files copied in, RC-2)

Every plant was restored from a saved copy, and `cmp` was OK each time.

| # | Mutation | Result |
|---|---|---|
| M1 | `gate.ts` imports the composite from `./index` again (the pre-U20 edge) | `import-graph.test.ts` 2 failed: `expected [ 'index', 'weights' ] to include 'composite'` (the anti-vacuity line) · `… to not include 'index'` |
| M1b | `gate.ts` keeps `./composite` and adds `import "./index";` | 2 failed: `expected [ [ 'gate', 'index', 'gate' ], …(1) ] to deeply equal []` · `… to not include 'index'` |
| M2 | the ten tie-break `paperIds` emptied (the pre-U20 fixture) | 1 failed at `evidence.test.ts:156`: `expected 'C' to be 'B'` |
| M3 | rename detection forced off (`&& false`) | FU-76 tests 1, 2, 4 fail (no `name-updated`; `'· grade updated since this message'` lacks the both-string) |
| M4 | the outcome-category exclusion removed | the protocol test fails (`expected <span …> to be null`) and the corpus test finds multiple `name-updated` |
| A1a | the category exclusion reverted to *today's* category | the moved-category test and the corpus test fail |
| A1b | the `typeof` guard removed | the non-string test fails (a one-element array label is marked) |
| A3 | `gate.ts` adds `import ".";` · `import "./index.js";` · `import "@/lib/evidence-grading";` | each: 2 failed, cycle `[ 'gate', 'index', 'gate' ]` |
| A4 | the tie-break fixture keeps only effectSize cited | 1 failed: `low: expected [] to not have a length of +0` |
| R | the `{name}` placeholder filled by a string (`.replace("{name}", renamedFrom)`) | the copy test fails: `expected '· COPY-NAME <Old {name} name>' to be '· COPY-NAME <Old $& name>'` |
| H | **at HEAD** (`ProvenanceChips.tsx`, `citation-index.ts`, `safety/index.ts` from `3c52ab1`): the pre-U6 fish-oil citation | `expected 'EvidenceFish Oil (Omega-3) → Triglyce…' to match /renamed\|name updated/`: the chip reads *"Fish Oil (Omega-3) → Triglyceride lowering, Grade A"*, no marker |

## 6. Check: gates

**AC-6:** `npx vitest run src/architecture` **30 files, all passed**: 518 tests at `3c52ab1`, **534** after the rebase onto `eb4a7a0` (U19 added tests, not files; SPEC_COUNT unchanged, RC-1);
`rule8-component-tests.test.ts` 11/11. **AC-8, G on the staged tree** after the rebase onto `eb4a7a0`, in a clean worktree
(`../ssi-u20-g`, detached at `eb4a7a0`, the staged diff applied with `git apply --index`, identical `--cached --stat`, no
`.env.local`, `node_modules` symlinked, `NEXT_TELEMETRY_DISABLED=1`): `tsc` 0 · lint 432/432, 0 errors · vitest 151 files,
**2012** tests · `test:coverage` 0, thresholds met · `next build` 0 · `verify:rendering` OK · `verify:bundle` OK (every
route within 1%) · E2E **70 passed / 30 `[LIVE]` skipped**. No floor edited (`vitest.config.ts` untouched).
`verify:migrations` is read from branch CI (D-15 (b)).

## 7. Independent review (AC-7): **PASS WITH ADVISORIES**, nothing blocking

A fresh subagent worked on the scratch copy only and restored every plant (`cmp` OK). It re-ran `tsc` 0, lint 432/432,
vitest 151/1995 and specs 30/518. Grades: identical id→grade lists with HEAD's engine and with U20's. The moved functions
are byte-identical, and `evidence:gate-report` exits 0. It reproduced every AC-1 `tsc` proof, M1, M1b, M2 and H.
It enumerated every effect-grade label writer (`tools.ts:125,180`, `proposals.ts:57,252`; `identity/index.ts:61` is a
different shape and is never stored).
- **A1** a category move would make a false rename claim; the placeholder was filled by a string replacer, which expands
  replacement patterns; non-string labels were coerced. **Fixed** (§2.3), red: A1a, A1b, R.
- **A2** `?? -1` and a stale comment in `src/lib/evidence/index.ts` were missed, and so was `EvidenceBreakdown.tsx:9`.
  **Fixed** in `index.ts`; the rest is FU-86 (owner ruling on Q-22).
- **A3** the cycle guard read only `./` specifiers. **Fixed:** it also reads `.`, `.js` and the alias (red: A3).
  `../` forms are stated as unresolved.
- **A4** the N-92 test bound only effectSize's citation. **Fixed:** it asserts every scored dimension cites (red: A4).
- **A5** the counts, and the circularity of T2's second proof. **Fixed** (§3).
- **A6 (pre-existing, outside the unit):** `npx tsx scripts/evidence-gate-report.mjs` rewrites the seed sha256 in
  `docs/05-qa/2026-09-25-b-gate-report.md` (`8471c1…` → `339a9b…`), with the tables unchanged. **Owner ruling (Q-22):**
  it stays; it is a dated record.
The approved copy (§4) was applied after the review. It changes only the strings and drops the screen-reader span; R and
the updated FU-76 tests cover it.

## 8. Act

**Landed** under the standing approval, after the owner's batch (Q-21) and rulings (Q-22). **Closed:** N-90 (code
part), FU-63, N-92, FU-75, FU-76. **Registered:** FU-85 (Inter preload), FU-86 (dead null handling and a stale comment
outside *May touch*), FU-87 (a renamed supplement has no marker). **Not touched:** `CLAUDE.md`, `content/**`,
`src/data/**`, grades, weights, migrations, `package.json`, workflows, allowlists, `citation-label.ts`.
**Process notes.** bkit was registered after the code was drafted, not at open (RC-4 met late). Two of the runner's own
edit scripts passed text containing `$&` through `String.replace`, which corrupted this file's §2.3 and §7 and one test
block. The damage was found on re-read and rewritten by line splicing. That is the same class of bug the review found
in the chip (A1).
