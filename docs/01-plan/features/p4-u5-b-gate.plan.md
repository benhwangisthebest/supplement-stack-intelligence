# p4-u5-b-gate — PDCA cycle artifact for Phase 4 U5, landing (a)

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U5**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U5 (a) · Rubric gate for B, report-only · **SUPERVISED** · deterministic · **Anchor** `35396a3` · **Date** 2026-09-25
> **Authority:** the owner's standing approval for U5 landing (a) (2026-09-25): branch, commit, push, fast-forward
> `main`, delete the branch, on a green G over the staged tree in a clean worktree, green branch CI, the staged set equal
> to *May touch*, and **no stored grade, weight, threshold or `deriveGrade` line changed**.
> **Rulings:** D-2 (c) and its clarification; the owner's U5 rulings (i)–(iii) of 2026-09-25; Phase 3 R5, R6, R12, R13,
> R14, R17 (`phase-3-evidence-grounding.plan.md:204`, `:210`, `:215`, `:248`).

## 1. Plan

**Goal (the brief's):** add a report-only B gate over the evidence profile, parametrised by rule, that lists which
stored B (and A) grades each candidate rule would move, and document R17's size-clause limit, changing no grade.
**Carried:** FU-71 (closes here); FU-61 (stays OPEN until landing (b) wires the gate, N-87).

**Premises, re-measured at `35396a3`:**

| | Claim | Measured |
|---|---|---|
| P-a | 27 effects, grades A 4 · B 9 · C 8 · D 6 | `node -e` tally over `content/seed/seed-effects.json` → `{"D":6,"C":8,"A":4,"B":9}`, 27. Matches the plan's §2, re-derived rather than carried |
| P-b | stored = derived for all 27 (G4b) | `seed-integrity.test.ts:209`; the report re-derives it: *Stored ≠ derived: 0* |
| P-c | grade derivation lives in one place | `graphify query "where is the grade derived from the evidence profile"` → `deriveGrade()` at `src/lib/evidence-grading/index.ts:49`, `compositeScore()` at `:39`. Weights and thresholds at `weights.ts:9-15`, `:24-29` |
| P-d | the docs site that states R17 | `git grep -n R17 -- docs` → the ruling is stated verbatim only at `phase-3-evidence-grounding.plan.md:248` (its block runs to `:266`). Other hits cite it |
| P-e | `src/lib/evidence-grading/**` is floored | `vitest.config.ts:95`: lines 87 · functions 90 · branches 74 · statements 87. `gate.ts` lands inside it, so no new threshold entry (§5 rule 7) |
| P-f | highest issued ids | `git grep -ohE 'N-[0-9]+' -- docs CLAUDE.md`, likewise `FU-`: **N-91, FU-73** (OP-8 is "next free" only). This unit issues **FU-74** |
| P-g | the planted null's composite | **0.817, not the brief's 0.85:** 0.3·1 + 0.25·1 + 0.2·1 + 0.15·0 + 0.1·⅔ = 0.8167 → still **A**. With consistency 1: 0.683 → **B**, as the brief says. The test asserts 0.817 |
| P-h | tsx is available for a TS-importing script | `package.json:53` `"tsx": "^4.19.2"`, already used by `db:seed` and both probes. No dependency added |

## 2. Design

`gate.ts` is a pure module beside the engine. A rule is **data**: `{ id, floors }`, where `floors` maps a dimension to
the minimum score it must reach. `CANDIDATE_RULES` holds the owner's four (G1 effectSize ≥ 1 · G2 effectSize ≥ 2 · G3
effectSize ≥ 1 and consistency ≥ 2 · G4 effectSize ≥ 1 and consistency ≥ 1) and a test pins them, so a fifth or a missing
one is red. `applyBGate(profile, rule)` first asks `deriveGrade`, **read-only**, whether the composite is B or better. If
it is not, the rule does not apply and the result passes. Otherwise it returns `{ passes, failing, ratingsCited }`, with
the dimensions below their floor in `EVIDENCE_DIMENSIONS` order and their `paperIds` de-duplicated. `gateMoves(effects,
rule)` lists the effects that fail, one letter down (A → B, B → C), for the report only. Each carries its stored grade,
its composite, its five scores, and each failing dimension's rationale and `paperIds` **as the profile holds them**.
The module imports only `@/types` and `./index`, and reads no seed data. `deriveGrade`, `weights.ts`'s values and G4b
are untouched: **the gate is not wired into anything**. `scripts/evidence-gate-report.mjs` runs under `tsx` and calls the
same engine, so the report cannot disagree with the gate. It reads the authored JSON, stamps the input's sha256, and
reads no clock and no network.

## 3. Do — acceptance criteria, with outputs

| AC | Command | Result |
|---|---|---|
| AC-1 | `npx vitest run src/lib/evidence-grading` | **2 files, 26 tests** (14 existing + 12 in `gate.test.ts`), green. A test reads `gate.ts` and asserts no `content`, `@/data`, `src/data`, `node:` or `fs` specifier. `npx vitest run src/architecture` (incl. boundaries): green, row AC-6 |
| AC-2 green | the planted-null `describe` in `gate.test.ts` | Profile (3,3,3,0,2) → 0.817 **A**, and (3,3,1,0,2) → 0.683 **B**. Every candidate lists both: `planted-null-a A→B`, `planted-null-b B→C` |
| AC-2 RED | backup `gate.ts` to the scratchpad; `sed` drops `effectSize` from all four rules (G1, G2 → `{}`; G3, G4 → consistency only); run `-t planted` | **4 failed / 1 passed.** G1, G2, G4: `- "planted-null-a A→B", - "planted-null-b B→C" … + Array []`. G3: `- "planted-null-a A→B"` (the B variant stays listed by its consistency 1). Restored with `cp` from the backup; **`cmp` equal**; never `git checkout` |
| AC-3 | `npm run evidence:gate-report`, copy, run again, `cmp` | `wrote docs/05-qa/2026-09-25-b-gate-report.md (55 lines)` twice; **`cmp` silent**. The input is stamped with sha256 `8471c1dd…6d6827` |
| AC-4 | `git diff --stat` against `35396a3`; `npx vitest run src/data/seed-integrity.test.ts`; grade tally before and after | §5. No `content/seed/*.json`, `src/data/**`, `index.ts` or `weights.ts` value line in the diff. G4b green. **A 4 · B 9 · C 8 · D 6 before and after** |
| AC-5 | the two notes | `src/lib/evidence-grading/weights.ts:5-9` (header comment only) and `docs/01-plan/phase-3-evidence-grounding.plan.md:268` (dated blockquote directly under R17's block). Both name l-theanine-stress (12 participants, unflagged, 2) and creatine-cognition (flagged, 1), from the profiles' own studyQuality rationales |
| AC-6 | `npx vitest run src/architecture` | **30 files**, green (with seed-integrity and the grading specs: 33 files, 519 tests). No rendered copy or component changed, so RULE8 and DOC_TRUTH have nothing new to bind |
| AC-7 | independent review | §6 |
| AC-8 | G on the staged tree in a clean worktree | §6 |

**The candidate moves** (full rows with verbatim rationales in the report):

| Rule | B → C | A → B *(outside D-2's wording — owner decides)* |
|---|---|---|
| G1 effectSize ≥ 1 | none | none |
| G2 effectSize ≥ 2 | l-theanine-focus, melatonin-sleep, ashwagandha-sleep | protein-powder-training |
| G3 effectSize ≥ 1 and consistency ≥ 2 | vitamin-d-deficiency, fish-oil-mood, l-theanine-focus, ashwagandha-stress, ashwagandha-sleep, berberine-metabolic, vitamin-b12-deficiency, caffeine-focus | none |
| G4 effectSize ≥ 1 and consistency ≥ 1 | berberine-metabolic | none |

Every G2 move fails on effectSize alone; every G3 and G4 move fails on consistency alone. berberine-metabolic's
consistency cites no paper, so its 0 is R5's and the report marks it **not assessed (R5)**. That is FU-74. No rule is
chosen here (ruling (i)).

## 4. Registered

**FU-74.** A consistency floor cannot tell *not assessed* from *inconsistent*. berberine-metabolic moves under G3 and G4
on an R5 zero alone, while Phase 3 ruled that an uncited dimension renders as *not assessed*, not *none*
(`phase-3-evidence-grounding.plan.md:220`). **OPEN → U5 (b):** the owner's chosen rule states whether an R5 zero fails a
floor. The brief's 0.85 (P-g) is a brief figure, not a repository claim, so it is noted here and not registered.

## 5. Invariant evidence (AC-4)

`git diff --stat` at the pre-staging tree (tracked changes; the four new files are listed under §6):

```
 docs/01-plan/phase-3-evidence-grounding.plan.md  |  2 ++
 docs/01-plan/phase-4-product-completion.plan.md  |  5 +++--
 package.json                                     |  3 ++-
 src/lib/evidence-grading/weights.ts              |  5 +++++
```

`weights.ts`: 5 comment lines added after `:4`; `git diff -U0` shows no `-` line and no line outside `//`. `package.json`:
exactly the one new script line (plus the comma it needs on `content:generate`); `package-lock.json` untouched.

## 6. Check

**AC-7 — independent review** (fresh `ecc:code-reviewer`, read-only, no network; inputs: the U5 row, D-2, N-87, the
diff, this file, the report). **Verdict: PASS.** No BLOCKING or MAJOR finding. It re-ran 33 files / 519 tests. It
re-derived the tally (A 4 · B 9 · C 8 · D 6, 0 mismatches) and all four rules' moves, table for table. It checked every
rationale and `paperIds` list against the JSON character for character, and P-g's arithmetic. It regenerated the report
twice outside the repo, and both runs were byte-identical to the committed file. It reasoned the AC-2 mutation through
to the recorded outcome and found no file recommending a rule. **On the specific question (captured abstracts):** no
committed file under `content/verification/**` has an `abstract` field. Only esummary titles and Crossref metadata
are committed; the abstracts are in the gitignored `local/` trees, which it did not read. All 13 cited papers' committed
titles are consistent with their rationales, and **nothing contradicts any row**. **This is a title-level check, not an
abstract-level one.** Recorded as a limit, not a finding. **NOTE 2:** the untracked `.claude/launch.json` must not be
staged; it is not. One reviewer slip, checked against the tree: it cited FU-74's source as `phase-4-…:220`. The line is
`phase-3-evidence-grounding.plan.md:220`, as cited here (`sed -n 220p` shows *"not assessed"*, not *"none"*).

**AC-8 — G on the staged tree in a clean worktree.** It runs on the final staged tree, so its result is not written
here: writing it would change the tree it measured. It goes in the commit body, and the CI run id goes in the report.

## 7. Report

**Landing (a):** the gate, its 12 tests, the report script and its one `package.json` line, the report, and the two
FU-71 notes. **Closed:** FU-71 (documented limit). **Open:** FU-61 until (b); FU-74 → (b). **Not touched:**
`content/seed/*.json`, `src/data/**`, `index.ts`, `weights.ts` values, `src/types/**`, components, `CLAUDE.md`, the
roadmap, every allowlist. No grade moved. Nothing live, no spend. **Next:** the owner batch picks a rule or none.
Landing (b) is a later brief.
