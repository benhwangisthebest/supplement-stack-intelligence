# p3-u4-profiles — PDCA cycle artifact for Phase 3 U4

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U4**. The record is the
> register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U4** (status APPROVED), together with the
> U4 list under **U6** (items 1–16). Where the two disagree, the register wins.
>
> **Feature**: `p3-u4-profiles` · **Anchor**: `fe0441d` · **Date**: 2026-09-23 · **Type**: deterministic,
> except the owner-ruled live addenda R7/R11 (20 calls to NCBI and Crossref, $0; §3). No OpenAI, no deployed DB.

---

## 1. Plan

**Problem.** 19 of 27 effects carry a hand-typed grade with no derivation. G4 allows them only through
`UNPROFILED_GRADE_ALLOWLIST`, a shrink-only subset of the frozen `ALLOWLIST_ORIGIN`
(`src/data/seed-integrity.test.ts:170-211`). U6 verified the corpus: 30 cited papers, 29 with a captured PubMed
abstract and one DOI-only. U4 authors the 19 profiles against that corpus and empties the allowlist.

**Owner rulings in force**, recorded in the register before any content work: **R1** Claude drafts, and only from
U6's captured abstracts. The owner approves each batch's review table before it is committed. **R2** the
effect-grade chip shows the current grade, marked *"grade updated since this message"* when it differs. No DB
edits. **R3** also correct the summaries items 1, 4, 6 and 7 show to overstate, and re-judge
`magnesium-sleep` and `melatonin-sleep` `populationRelevance`. The melatonin correction is `[P3-X5]`. **R4** FU-59 → U7. **R5** (hard-rule-4 stop, 2026-09-23) an empty `paperIds` scores **0**, and a guard requires a cited paper for any
score > 0. **R6** a title-only paper (`p-glycine-sleep`) supports no dimension.

**Hard rules.** (1) A rationale states only what the cited abstracts show. (2) An empty `paperIds` is a correct
answer. (3) Cite only the 30 verified papers. A gap is recorded, never sourced. (4) Scores follow the existing
rubric (`src/lib/evidence-grading`), which U4 may not touch.

**Batches**, each stopping for owner review before commit: **B1** the 4 Grade A effects without a profile ·
**B2–B4** the other 15, about 5 each · **B5** R3's summary corrections and the 2 re-judged dimensions, plus the R5 guard.
R2's chip lands **before B1 is committed**: the register requires U4 to say what happens to persisted rows
*"before changing a letter"*, and B1 changes two.

**Acceptance criteria.** AC-1 allowlist empty, origin frozen, G4 green · AC-2 27/27 profiled · AC-3 seed-text
safety sweep, red-proved · AC-4 every grade change and its engine effect listed, fixtures re-derived · AC-5 R2
chip, red-proved · AC-6 every `paperIds` fixture-verified (P7), and no dimension cites outside its effect's list ·
AC-7 `[P3-X5]` recorded.

## 2. Design

**Drafting source.** A scratch tool maps each seed paper's `pmid` to the `efetch.xml` under
`captures/*/local/`, re-parses it with `capture.mjs`'s own `parsePubmedXml`, and checks the abstract's SHA-256
against the value committed in that run's `candidates.json`. **29 of 29 PMID papers match.** The one
DOI-only paper has no abstract, so R6 applies to it.

**Scoring conventions**, derived from the rubric's words and stated in every appendix:
- A dimension the cited abstract does not address gets `paperIds: []`, score **0**, and the fixed rationale
  *"Not addressed by a verified paper in the corpus."*
- *Consistency* is agreement **across studies** (`evidence-grading.ts:11`). It is scored from a
  heterogeneity figure or a subgroup comparison, never from a single pooled estimate.
- Grades are computed by `deriveGrade`. A composite that lands exactly on a threshold is flagged in the
  appendix.

**Applying a batch.** One script appends `evidenceProfile` after `paperIds`, which is the key order the 8
existing profiles use. It sets `grade` to `deriveGrade`, which G4b requires, and deletes the batch's ids from
`UNPROFILED_GRADE_ALLOWLIST` (G4e). Then `npm run content:generate`. No other field changes.
**Nothing under `src/data/seed-*.ts` is hand-edited.**

**P-14 behaviour probe.** For each changed grade the probe runs the real engines at the anchor and at the
working tree: `getBestEffectForOutcome`, `generateProtocol` (tier, rank in the goal group), the
stack-evaluator evidence-fit test and identity's A-or-B test. Its output is each appendix's P-14 table and, at
closeout, AC-4's.

**R5 guard (B5).** Added to `seed-integrity.test.ts`: every profile dimension with `score > 0` has a non-empty
`paperIds`. **Red proof:** the anchor fails it on exactly the two dimensions R3(b) re-judges.

**Seed-text safety sweep (AC-3).** It runs `containsBannedLanguage` (the existing list, `src/lib/safety`,
untouched) over every `summary` and every dimension `rationale` in the authored JSON. **Red proof:** a banned
phrase planted in one rationale, then the file restored.

**R2 chip.** `ProvenanceChips` handles an `effect-grade` citation as follows. It parses the stored letter (`/Grade ([ABCD])$/`), which is the tail of every label the three producers write (`proposals.ts:57,252`, `tools.ts:114,170`), and looks up the effect's current grade in `defaultLibrary.effects`, whose grades are pre-resolved. When the two differ, it shows the current letter and a *"· grade updated since this message"* marker (`data-testid="grade-updated"`). A label with no letter, or an unknown `refId`, falls back to what was stored. No row is edited, and no `src/lib` helper was added: the chip reads the exported library. **Red proofs:** (i) before the component change, the new test failed with 1 failed and 8 passed. (ii) After it, removing only the marker gave 1 failed and 8 passed. Restoring from a file backup gave shasum `47e90e6…` before and after, and 9/9 passed.

## 3. Landings

| Landing | Subject | SHA | CI | What |
|---|---|---|---|---|
| R2 | `feat(ui): U4 — grade-updated marker` | `2dca1c8` | `35911935427` success | the chip resolves the current grade and shows the marker when it differs. The register's R1–R10 are in the same commit |
| F-1 | `fix(grading): …` | `478ccf7` | `35915836110` success | exact composite at the thresholds (26/1024 → 0/1024; no seed flip) |
| (withdrawn) | `fix(provenance): …` | `26c396f`, **never merged** | `35916425609` success | tag-stripping fix built on a wrong diagnosis; branch deleted on owner ruling (§5 F-2) |
| resolve bodies | `feat(capture): …` | `b5d1b62` | `35926528714` success | S2 saves every response body; red 2/2 → green |
| B1 | `feat(content): U4 B1 — …` | `5b55d5b` | `35927219723` success | 4 Grade A profiles, the S4 files and B12's two new papers. Appendices [B1](p3-u4-profiles.b1.md) and [S4](p3-u4-profiles.s4.md) |
| B2 | `feat(content): U4 B2 — …` | `c403f37` | `35927722448` success | 5 profiles: magnesium-stress C → D, fish-oil-mood C → B, three unchanged at C. Appendix [B2](p3-u4-profiles.b2.md) |
| B3 + R14 | `feat(content): U4 B3 — …` and `feat(content): U4 — confidence follows the grade (R14)` | (this landing) | — | l-theanine-stress B → D, glycine-sleep B → D, ashwagandha-sleep C → B; confidence mapped for 4 effects; G5 exact. Appendix [B3](p3-u4-profiles.b3.md) |

**Live calls under U4 (R7, R11):** S4 search **12**, plus S2 resolve **8** (`s2d`, `s2e` and `s2f` refused B-2; `s2g` wrote both). All 20 returned 200, $0. The dated record is `docs/05-qa/2026-09-23-p3-u6-verification-record.md`.

## 4. Appendices

- [B1 — the four Grade A effects](p3-u4-profiles.b1.md)
- [S4 — candidate table, owner decisions, B12 re-draft](p3-u4-profiles.s4.md)
- [B2 — five profiles](p3-u4-profiles.b2.md)
- [B3 — five profiles](p3-u4-profiles.b3.md)

## 5. Findings (raised by U4; open unless marked)

**F-1 (history) — `compositeScore` could land an exact threshold composite just below it.** It sums `weight × score / 3` in floating point, so an exact-arithmetic 0.55 computes as `0.5499999999999999` for scores (2,1,1,2,3) and derives **C**. The same exact value from (2,2,2,1,0) computes as `0.55` and derives **B**. Two profiles with the same exact composite can therefore get different letters. **U4 may not touch the rubric**, and no drafted profile relies on the boundary; every exact-boundary composite is flagged in its appendix. The fix is for the owner (e.g. round to 1e-9 before comparing), and it needs a rubric-owner unit.

**F-1 — CLOSED by `478ccf7`** (owner-approved scoped exception, `fix(grading)`). The composite is rounded to 1e-9. Mismatches against exact arithmetic went from 26/1024 profiles to 0/1024, and no seed grade flipped.

**F-2 — B-2 (PMID 29543316) was refused by S2 three times. The first diagnosis was WRONG, and its fix is WITHDRAWN.** I first attributed the refusal to inline markup: `efetch`'s title carries `B<sub>12</sub>`, and `normaliseTitle` turned a tag into a space. A fix, *strip tags with no space*, was approved and committed as `26c396f` on a branch, and CI passed. **But its re-run (`s2e`) still refused B-2.** On the owner's ruling, that branch was deleted unmerged and not amended. The resolve step was made to save its response bodies (`b5d1b62`), and a third run (`s2f`) captured the body. **Verified cause, quoted from `captures/2026-09-23-s2f/p-b12-oral-vs-im/esummary.json`:** `"title":"Oral vitamin B(12) versus intramuscular vitamin B(12) for vitamin B(12) deficiency."`. PubMed's `esummary` renders the subscript as **parentheses**, which `normaliseTitle` turns into a space (`b 12`), while the approved title, taken from `efetch` with its markup stripped, read `b12`. **It was neither tag markup nor HTML entities**, so the tag fix addressed nothing a resolver returns and was **dropped without landing**. **Resolution (owner, option i):** approve PubMed's `esummary` title verbatim as B-2's title. No title-check code changes. An offline replay of the saved bodies through `runResolve` → `applyResolved` → `checkPapers` gave 0 refusals and P4 clean. The displayed title reads *"B(12)"*, which is PubMed's own rendering.
