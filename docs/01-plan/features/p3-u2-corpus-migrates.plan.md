# p3-u2-corpus-migrates — PDCA cycle artifact for Phase 3 U2

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U2**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U2** (status APPROVED), including
> the 2026-09-23 obligation from U1's AC-2 ruling and the **owner ruling of 2026-09-23 on open question
> (iii)**. Where the two disagree, the register wins.
>
> **Feature**: `p3-u2-corpus-migrates` · **Anchor**: `94c534a` · **Date**: 2026-09-23 ·
> **Type**: deterministic (no network, no OpenAI, no deployed DB, no CI change)

---

## 1. Scope

The nine `SEED_*` modules become generated output of a JSON corpus in root `content/` (D-2). They stay
committed. Three guards make a hand edit to generated TS, a placeholder host in JSON, and a dangling
`paperId` each fail the build. **No value changes.**

**Carved out and untouched (AC-6):** `src/data/id-manifest.json`, `src/data/medication-aliases.ts`,
`src/data/id-stability.test.ts`, `src/types/`. `src/data/seed-integrity.test.ts` is a guard, not content;
it is edited by landings (b) and (c) because G1 and the new G3 live there.

## 2. Rulings in force

- **D-2** — JSON in a root `content/` package.
- **Owner ruling 2026-09-23, open question (iii): the generated TypeScript is COMMITTED, not gitignored.**
  Gitignoring would need codegen wired into tsc/test/build/CI, and a CI change makes the unit live. It
  would also drop `LAYER_FLOORS["src/data"]` (`boundaries.test.ts:147`, pinned at 8) to 1.
- **Option A DECLINED** (the emitter ordering keys by `src/types`). Once JSON is the source, a hand reorder
  in generated TS already fails CONTENT_FIDELITY, and a reorder inside the JSON changes no value.
- **FU-49, decided here (format only):** editorial notes live in `content/notes.json`, a sidecar the
  generator never reads. `SEED_*` shape and `src/types` are unchanged. **The glycine dose is not decided
  here.** That stays with U4/U6.

## 3. Design — the format

| Path | Role |
|---|---|
| `content/seed/<module>.json` ×9 | The value of each `SEED_*` constant, an array, in its own key order. `JSON.stringify(v, null, 2)` plus a newline |
| `content/modules.json` | One entry per module: `exportName`, `typeName`, and the `preamble` (lines before `export const`) verbatim, as an array of lines |
| `content/notes.json` | Editorial sidecar (FU-49). Each note names a `module` and an `anchorId`. Never emitted |
| `content/generate.mjs` | Renders all nine through `content/emit.mjs`. `npm run content:generate` writes them; `-- --check` exits 1 on any stale module. Plain Node ESM, no new dependency |

The JSON was extracted once from the modules at `94c534a` (import via `tsx`, then `JSON.stringify`) by a
scratch script that is not committed. From this point the JSON is the source of truth.

## 4. Landing (a) — corpus, generator, fidelity guard

**Guard: `CONTENT_FIDELITY`**, added to `src/architecture/canonical-layout.test.ts` (no new spec file, so
`SPEC_COUNT` stays **28**). For each module, the committed bytes must equal `renderAll()` from the JSON,
and the rendered set must equal the tracked `SEED_*` set, pinned at 9. Its reference is the JSON, not the
file under test, which is why it sees what `CANONICAL_LAYOUT` cannot. **`CONTENT_NOTES`** (same file):
every sidecar note's `anchorId` exists in its module's JSON.

**AC-1 — values unchanged.** `git diff --stat HEAD -- src/data/` → *(empty)*. Proofs:

```
values b5aaab8 exit=0   (values: 9 modules compared against b5aaab8, failures=0)
tokens b5aaab8 exit=0   (tokens: 9 modules, 8902 significant tokens compared against b5aaab8, failures=0)
values 94c534a exit=0   (values: 9 modules compared against 94c534a, failures=0)
tokens 94c534a exit=0   (tokens: 9 modules, 8902 significant tokens compared against 94c534a, failures=0)
```

**AC-2 — one command, idempotent on a clean tree.**
`npm run content:generate` → `content:generate: wrote 9 modules, 0 changed`; `git status --porcelain src/data/`
→ *(empty)*. `npm run content:generate -- --check` → `checked 9 modules, 0 stale`, exit 0.

**AC-3 — fidelity red ×2 (the U1 obligation).** Backups are file copies, restores checked by `shasum`
(§5 rule 11). File: `src/data/seed-papers.ts`, `shasum` before and after each run
`eaedf91701216158539ae209662ee24b974514df`.

Red 1, a hand-edited **value** (line 17, `title: "X…"`):
```
× CONTENT_FIDELITY — 9 generated modules compared byte-for-byte with content/ > src/data/seed-papers.ts — is exactly what content/generate.mjs renders from JSON
  → src/data/seed-papers.ts: hand-edited? first difference at byte 831 (line 17, col 13): committed "XEffects of creatine supplementation on " vs emitted "Effects of creatine supplementation on s". Edit content/seed/ and run npm run content:generate
```

Red 2, a hand **key-reorder** (lines 16–17, `id` ↔ `title`; the U1 case that stayed green):
```
× CONTENT_FIDELITY — … > src/data/seed-papers.ts — is exactly what content/generate.mjs renders from JSON
  → src/data/seed-papers.ts: hand-edited? first difference at byte 792 (line 16, col 5): committed "title: \"Effects of creatine supplementat" vs emitted "id: \"p-creatine-strength\",\n    title: \"E".
Tests  1 failed | 20 passed (21)        exit=1
```
The 20 passing include all 10 `CANONICAL_LAYOUT` tests: that guard **still** cannot see a reorder, and
this one can. **Restore:** `Tests 21 passed (21)`, exit 0.

`CONTENT_NOTES` red (`anchorId` → `gly-no-such-product`):
```
× CONTENT_NOTES — every sidecar note anchors to a real record > seed-products#gly-no-such-product resolves
  → seed-products has no record with id gly-no-such-product
```
Restored by copy; `shasum` `d952220e…` before and after.

## 5. Landing (b) — FU-48, G1 re-pointed and widened

`src/data/seed-integrity.test.ts`: `SRC_ROOT` (`src/`) → `G1_ROOTS = [src, content]`; the extension filter
`/\.(ts|tsx)$/` → `/\.(ts|tsx|mjs|json)$/`. The old values are kept struck through beside the new ones.
New anti-vacuity assertion: G1's file set contains exactly the 9 `content/seed/*.json`.

**AC-4 red.** Planted `https://<placeholder host>/study` in the first `summary` of `content/seed/seed-papers.json`
(JSON only, not regenerated; `shasum` `f57967e9…` before and after):
```
× G1 — no fabricated source links anywhere under src/ or content/ > no source file references the placeholder host
  → expected [ 'content/seed/seed-papers.json' ] to deeply equal []
Tests  1 failed | 4 passed (5)
```
**Control, same planted file, HEAD's G1** (copied to a temporary `src/data/` test file, then removed):
`Tests 4 passed (4)`. This is FU-48: before the change, the source of truth was invisible to G1.
**Restore:** `Tests 5 passed (5)`.

Anti-vacuity red (`G1_ROOTS` narrowed back to `["src"]`): `reaches the authored JSON corpus … → expected +0 to be 9`.

## 6. Landing (c) — P-06, the paperIds guard on the authored source

**G3** in `src/data/seed-integrity.test.ts` reads `content/seed/*.json` and walks every `paperIds` array at
any depth: effect level, evidence-profile dimension level, and side-effect profiles. It resolves each
entry against `content/seed/seed-papers.json`. Anti-vacuity: it must find references at both effect and
dimension level. The old check (`evidence-grading.test.ts`, *"every cited paperId references a real seed
paper"*) read TypeScript and covered only profiled dimensions. It is retired, with a pointer comment left
in its place.

**AC-5 red.** Planted `"p-does-not-exist"` in `magnesium-sleep`'s `consistency` dimension, in JSON only
(`shasum` `33eae3e4…` before and after):
```
× G3 — every paperIds entry in content/seed/ resolves to a seed paper > no dangling paperId
+   "seed-effects.json[0].evidenceProfile.dimensions.consistency.paperIds[1] = \"p-does-not-exist\"",
Tests  1 failed | 6 passed (7)
```
**Control, same planted file, HEAD's check** (`evidence-grading.test.ts` before retirement): `Tests 14 passed (14)`.
**Restore:** `Tests 7 passed (7)`. Anti-vacuity red (key matcher mutated to `paperId`): `finds references
at both effect and evidence-profile level (anti-vacuity)` fails.

## 6b. Landing (d) — FU-54, the generated-file header (owner ruling 2026-09-23)

Each module's `preamble` in `content/modules.json` now starts with
`// GENERATED from content/seed/<module>.json — edit the JSON, then run npm run content:generate`,
and `npm run content:generate` rewrote the nine (`wrote 9 modules, 9 changed`; then `--check`: `0 stale`).
The diff is **exactly one added comment line per module**: every other changed line in `git diff -U0 -- src/data` → **0**.

Value and token proofs against `5975576` (the tip before (d)):
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
values: 9 modules compared against 5975576, failures=0          exit=0

SEED_BIOMARKER_RELEVANCE   tokens= 468 trailingCommas 16->16 numericSpellingSameValue=0 unexplained=0
SEED_BIOMARKERS            tokens= 596 trailingCommas 27->27 numericSpellingSameValue=0 unexplained=0
SEED_EFFECTS               tokens=2494 trailingCommas 111->111 numericSpellingSameValue=0 unexplained=0
SEED_FOOD_PAIRINGS         tokens= 438 trailingCommas 11->11 numericSpellingSameValue=0 unexplained=0
SEED_INTERACTIONS          tokens= 698 trailingCommas 21->21 numericSpellingSameValue=0 unexplained=0
SEED_PAPERS                tokens= 778 trailingCommas 21->21 numericSpellingSameValue=0 unexplained=0
SEED_PRODUCTS              tokens=1327 trailingCommas 22->22 numericSpellingSameValue=0 unexplained=0
SEED_SIDE_EFFECTS          tokens= 651 trailingCommas 52->52 numericSpellingSameValue=0 unexplained=0
SEED_SUPPLEMENTS           tokens=1452 trailingCommas 31->31 numericSpellingSameValue=0 unexplained=0
tokens: 9 modules, 8902 significant tokens compared against 5975576, failures=0   exit=0
```
Against `b5aaab8`: values `failures=0` exit 0; tokens `failures=0` exit 0, with only U1's D-a1 spellings
(`18.0->18, 3.0->3, 4.0->4`) and trailing-comma counts differing, as at U1.

**Gate at (d):** tsc exit 0 · lint *378 of 378, 0 errors* · vitest **1470 / 1470 across 116 files** ·
build exit 0 (`ƒ /library` 1.18 kB · 110 kB) · `verify:rendering` OK.

## 7. Gate (§5.10) on the combined tree

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — *377 of 377 tracked source files, 0 errors*. `content/generate.mjs` is untracked until commit, so it was also linted directly: `npx eslint content/generate.mjs …` exit 0 |
| `npx vitest run` | exit 0 — **1470 / 1470 across 116 files** (U0 closeout: 1457 / 116; +10 fidelity, +1 notes, +1 G1 anti-vacuity, +2 G3, −1 retired check = **+13**; per-landing counts in §9) |
| `npx next build` | exit 0 — `ƒ /library` 1.18 kB · 110 kB; `● /library/[slug]` 1.62 kB · 111 kB |
| `npm run verify:rendering` | OK, no prerendered page HTML |
| AC-6 `git diff --stat 94c534a -- <carve-outs> src/types/` | *(empty)* |

## 8. Findings

- **FU-48** — CLOSED by (b).
- **FU-49** — CLOSED (format decided: sidecar `content/notes.json`, guarded by `CONTENT_NOTES`). The glycine
  dose disagreement it recorded is **not** resolved and stays with U4/U6.
- **P-06 / `[P3-X8]`** — delivered by (c).
- **U1 AC-2 obligation** — discharged by AC-3 above.
- **FU-53** *(new)* — **CLOSED by owner ruling 2026-09-23: `[P3-X5]` moves to U4**, whose first real content
  correction is the recorded demonstration (JSON edit → `content:generate` → review → ship, no hand edit
  under `src/`). *As raised:* **`[P3-X5]` is not delivered by U2 as briefed.** The register names U2 as X5's owner.
  X5 needs a *recorded end-to-end correction*, which is a real content change, and this brief requires
  that no value changes. The machinery exists now (`content:generate`, and `CONTENT_FIDELITY` fails a
  src-side hand edit). The recorded correction and its test do not. **OPEN — owner to rule** whether U2
  carries it in a follow-up landing or it moves to the first content unit (U4).
- **FU-54** *(new)* — **CLOSED by landing (d), `7b3f643`** (§6b). *As raised:* the generated modules carry no "generated, do not edit" marker. Adding one changes
  bytes, which AC-1 forbids in this unit. Mitigated: a hand edit is red in CI, and the failure message
  names the fix. **OPEN, low**. The preamble lives in `content/modules.json`, so adding the marker is a
  one-line JSON change whenever it is ruled.

Numbers re-derived: `git grep -ohE 'FU-[0-9]+' -- docs CLAUDE.md | sed 's/FU-//' | sort -n -u | tail -1` → **52**;
N-series → **83** (no new N- finding).

## 9. Report

**U2 DONE — 2026-09-23.** Four landings. Each was branched from `main`, pushed, passed its own CI run on
the pushed SHA, was fast-forwarded to `main`, and had its branch deleted on both sides:

| Landing | SHA | CI run | |
|---|---|---|---|
| (a) | `0bbbf0a` | `35830980187` success | corpus, generator, `CONTENT_FIDELITY`, `CONTENT_NOTES` — vitest 1468/116 |
| (b) | `9b067c7` | `35831349092` success | FU-48, G1 — vitest 1469/116 |
| (c) | `5975576` | `35831722727` success | P-06, G3 — vitest 1470/116 |
| (d) | `7b3f643` | `35832039664` success | FU-54, generated header — vitest 1470/116 |

Each landing's gate ran on its staged tree alone, with the other unstaged edits moved aside by file copy.
**Ticked:** `[P3-X3]`, `[P3-X8]`. **Closed:** FU-48, FU-49 (format), FU-53 (ruling → U4), FU-54, P-06, and
the U1 AC-2 obligation. **Not closed here:** the glycine dose (U4/U6) and `[P3-X7]` (phase-wide).
