# p3-u4-profiles — appendix: U4 closeout

> Appendix to `p3-u4-profiles.plan.md`. The closeout record for Phase 3 · U4, measured on `main` at the G8 landing. The register entry (`phase-3-evidence-grounding.plan.md` §4 U4) carries the status and the two ticks. This appendix carries the evidence.

## 1. Acceptance criteria

| AC | Result | Evidence |
|---|---|---|
| **AC-1** allowlist empty, `ALLOWLIST_ORIGIN` frozen, G4 green | **MET** | `UNPROFILED_GRADE_ALLOWLIST = []` (`src/data/seed-integrity.test.ts:194`, emptied by B4 `cee04b9`); `ALLOWLIST_ORIGIN` byte-identical to `fe0441d` (19 ids); G4a–G4f green |
| **AC-2** `[P3-X1]` 27/27 profiled | **MET** | `node -e '…filter(e=>e.evidenceProfile).length'` → **27 / 27**. Red proof at closeout: creatine-strength's profile removed → **G4c** failed ("a grade without a profile fails unless allowlisted"); restored, `git status` clean |
| **AC-3** safety sweep, red-proved | **MET** | G7, 27 summaries + 135 rationales, `containsBannedLanguage` (list unchanged). Red on a planted rationale and a planted summary (B5, `98be995`) |
| **AC-4** every grade change listed, engine fixtures re-derived | **MET** | §2: 15 changes, each with its P-14 consequence and an R10 pin (15 pins, each red against its pre-batch seed). Fixtures re-derived: 1 E2E spec (`bfa7602`) and 3 unit tests (B6 `bd98bd3`), each with its diff explained |
| **AC-5** R2 chip, red-proved | **MET** | `2dca1c8`: `ProvenanceChips` resolves the current grade and shows *"grade updated since this message"*; red with the marker removed, then restored |
| **AC-6** every `paperIds` entry fixture-verified (P7); no dimension cites outside its effect's list | **MET** | P7: 37 of 37 cited papers carry a fixture-verified identifier (fixture 37 entries). **G8** (`feat(content): U4 — G8`, added at closeout): 0 out-of-list citations across 109 cited dimensions; red on a planted cross-effect paper, which G3 and P7 both passed |
| **AC-7** `[P3-X5]` recorded | **MET** | `e653b91`: the JSON-only melatonin edit, `--check` stale → `content:generate` (1 changed) → 0 stale, both one-line diffs in the cycle artifact §3; P-12 `CONTENT_EDIT_PROPAGATES` red when the emitter drops `summary` |

**Corpus after U4:** 27 effects, all profiled. 135 dimensions, **26 cite no paper** (R5: each scores 0). 2 effects cite no paper (nac-antioxidant, protein-powder-recovery), and 1 cites only a title-only paper (glycine-sleep). 38 paper rows: 37 cited and verified, and 1 uncited illustrative row (`p-nac-antioxidant`, FU-57). U4 added **7 papers**, all manifest adds, 0 tombstones: 2 in B1, 5 in B6.

**Grade distribution, `fe0441d` → now:** A 8 → **4** · B 9 → **9** · C 10 → **8** · D 0 → **6**.

## 2. AC-4: every grade change in U4 (B1–B6; B5 changed none)

Engine consequences are the net effect in the final library (`probe.ts`: best-for-outcome grade, stack-evaluator evidence-fit flag, protocol tier and rank for the effect's own goal, identity high-grade). Persisted advisor chips that carry an old letter render the R2 marker. Confidence follows R14 (A `high`, B `moderate`, C/D `low`; G5 exact).

| Batch | Effect | Grade | Confidence | Engine consequence (P-14 probe vs `fe0441d`) | R10 pin (`grade-changes.test.ts`) |
|---|---|---|---|---|---|
| B1 | zinc-deficiency | A → **C** | high → low | tier foundational → **advanced**; **gains** the evidence-fit flag; identity high-grade true → **false** | `B1 zinc-deficiency → Grade C, tier advanced` |
| B1 | vitamin-b12-deficiency | A → **B** | high → moderate | tier foundational → **targeted** | `B1 vitamin-b12-deficiency → Grade B, tier targeted` |
| B2 | magnesium-stress | C → **D** | low → low | tier advanced → **experimental** | `B2 magnesium-stress → Grade D, tier experimental` |
| B2 | fish-oil-mood | C → **B** | low → moderate | tier advanced → **targeted**; **loses** the evidence-fit flag; identity high-grade false → **true** | `B2 fish-oil-mood → Grade B, tier targeted` |
| B3 | l-theanine-stress | B → **D** | moderate → low | tier targeted → **experimental**; **gains** the evidence-fit flag; identity high-grade true → **false** | `B3 l-theanine-stress → Grade D, tier experimental` |
| B3 | glycine-sleep | B → **D** | moderate → low | tier targeted → **experimental**; **gains** the evidence-fit flag; identity high-grade true → **false**; rank 3/4 → 4/4 | `B3 glycine-sleep → Grade D, tier experimental` |
| B3 | ashwagandha-sleep | C → **B** | low → moderate | tier advanced → **targeted**; **loses** the evidence-fit flag; identity high-grade false → **true**; rank 4/4 → 2/4 | `B3 ashwagandha-sleep → Grade B, tier targeted` |
| B4 | zinc-immune | B → **C** | moderate → low | tier targeted → **advanced**; **gains** the evidence-fit flag; identity high-grade true → **false**; rank 1/2 → 2/2 | `B4 zinc-immune → Grade C, tier advanced` |
| B4 | nac-antioxidant | C → **D** | low → low | tier advanced → **experimental** | `B4 nac-antioxidant → Grade D, tier experimental` |
| B4 | protein-powder-recovery | B → **D** | moderate → low | tier targeted → **experimental**; **gains** the evidence-fit flag; identity high-grade true → **false**; rank 1/2 → 2/2 | `B4 protein-powder-recovery → Grade D, tier experimental` |
| B6 | magnesium-sleep | B → **D** | moderate → low | tier targeted → **experimental**; **gains** the evidence-fit flag; identity high-grade true → **false**; rank 2/4 → 3/4 | `B6 magnesium-sleep → Grade D, tier experimental` |
| B6 | vitamin-d-deficiency | A → **B** | high → moderate | tier foundational → **targeted** | `B6 vitamin-d-deficiency → Grade B, tier targeted` |
| B6 | fish-oil-cardiovascular | B → **A** | moderate → high | tier targeted → **foundational** | `B6 fish-oil-cardiovascular → Grade A, tier foundational` |
| B6 | melatonin-sleep | A → **B** | high → moderate | tier targeted (unchanged) | `B6 melatonin-sleep → Grade B, tier targeted` |
| B6 | caffeine-focus | A → **B** | high → moderate | tier targeted (unchanged) | `B6 caffeine-focus → Grade B, tier targeted` |

## 3. Every owner ruling, R1–R16

Full text: the register's U4 entry (`phase-3-evidence-grounding.plan.md` §4).

| # | Date | Ruling |
|---|---|---|
| R1 | 09-23 | **Authorship.** Claude drafts every score, rationale and `paperIds` list only from U6-captured abstracts (SHA-256 committed); the owner approves each batch in a review table before commit |
| R2 | 09-23 | **Persisted `effect-grade` citations.** No DB edits; the chip renders the current grade and marks *"grade updated since this message"* when it differs (`2dca1c8`) |
| R3 | 09-23 | **Scope.** Correct overstating summaries (items 1, 4, 6, 7) from cited abstracts; re-judge the two dimensions whose citation U6 removed; the melatonin correction is the `[P3-X5]` demonstration |
| R4 | 09-23 | **FU-59 → U7** |
| R5 | 09-23 | **An empty `paperIds` scores 0** (hard-rule-4 stop); `score > 0` requires a paper (G6); an effect citing none derives D |
| R6 | 09-23 | **A title-only paper supports nothing**; every glycine-sleep dimension is empty |
| R7 | 09-23 | **S4**: one scoped search, ≤ 16 calls, for zinc-deficiency and vitamin-b12-deficiency |
| R8 | 09-23 | **`confidence` joins *May touch*.** `high` requires A or B (G5; later made exact by R14) |
| R9 | 09-23 | **B5 takes the caffeine-training summary** |
| R10 | 09-23 | **AC-4: one engine pin per changed effect** (`grade-changes.test.ts`) |
| R11 | 09-23 | **B12**: B-1 (41487531) and B-2 (29543316) as new ids; consistency from B-1's heterogeneity and quality from B-2's low quality, neither rounded up |
| R12 | 09-23 | **humanEvidence** is the strength of human evidence **that the effect exists**, not the volume of research |
| R13 | 09-23 | **R12 extends to every dimension**: consistency and effect size measure the claimed benefit, so a consistent null scores low |
| R14 | 09-23 | **Confidence follows the grade exactly** (A `high` · B `moderate` · C/D `low`); G5 enforces it |
| R15 | 09-24 | **B6**: the original 8 profiles re-drafted under R1/R5/R6/R12/R13; the five overstating summaries; `relevantPopulation` for all 27 joins *May touch* |
| R16 | 09-24 | **S5**: one scoped search, ≤ 16 calls, for vitamin-d-deficiency and caffeine-focus; no search for magnesium-sleep |

**Unnumbered rulings, same register entry:**
- **Standing approval** for deterministic landings (09-23).
- **F-1** fix as a scoped rubric exception (`478ccf7`).
- **F-2**'s first fix withdrawn unmerged, with B-2's `esummary` title approved verbatim (option i).
- The **full non-live E2E suite before every landing** (09-23, after B3's CI failure).
- Per-batch approvals: B1–B6, S4, S5.
- The B6 rulings (09-24): ashwagandha-stress effectSize stays 3, because low certainty and heterogeneity are not counted twice; `relevantPopulation` is tightened wherever it is broader than the evidence.

## 4. Follow-ups opened, and findings

| Id | Opened | What | Disposition |
|---|---|---|---|
| **FU-61** | B2 | A well-studied null effect can still reach Grade B: 55% of the weight sits on humanEvidence plus studyQuality | OPEN, post-Phase 3, rubric-owner unit |
| **FU-62** | B3 | A sourcing pass for glycine-sleep (title-only paper) and zinc-deficiency (no deficiency trial) | OPEN, post-Phase 3, live unit |
| **FU-63** | B4 | Make `Effect.evidenceProfile` required in `src/types`; remove `SupplementDetail`'s no-profile branch and its fallback test | OPEN, post-U4 |
| F-1 | B2 | Float composite landed just below a threshold (26/1024) | **CLOSED** by `478ccf7` |
| F-2 | S4 | B-2 refused three times; the first diagnosis was wrong | **CLOSED**: fix withdrawn, cause verified from the saved body (`b5d1b62`), title approved verbatim |

Inherited and still open, not U4's: FU-57 (uncited `p-nac-antioxidant` row), FU-58 (`Paper` header), FU-60 (export emits stored labels).

## 5. Notes for U7

1. **Grade D wording** (B3 ruling): a Grade D card must read *"no verified evidence in this library"*, **not** as evidence of no effect. Six effects are now D: magnesium-sleep, magnesium-stress, l-theanine-stress, glycine-sleep, nac-antioxidant and protein-powder-recovery.
2. **"Not assessed" vs "none"** (B4 ruling): a dimension with an empty `paperIds` renders *"not assessed"*. *"None"* is reserved for evidence of no effect. **26 of 135 dimensions** are empty.
3. **FU-59** (R4): the products, interactions and food-pairings datasets carry no coverage disclosure.
4. **Uncited effects**:
   - nac-antioxidant and protein-powder-recovery cite no paper (D by R5).
   - glycine-sleep cites only a title-only paper (D by R6).
   - 4 `relevantPopulation` values read *"not described by a verified paper in this library"*, and 2 more say the population is *"not further described"*.
   - Each of these is an absence of verified evidence and must never render as an absence of effect or as safety (`CLAUDE.md` §2.2 rule 10).

## 6. Live calls and spend

| Scenario | Calls | Result |
|---|---|---|
| S4 search (R7) | 12 | all 200 |
| S2 resolve for B-1/B-2 (`s2d`, `s2e`, `s2f`, `s2g`) | 8 | all 200; B-2 refused three times, then written |
| S5 search (R16) | 12 | all 200 |
| S2 resolve for S5 (`s2h`) | 5 | all 200; no refusals |
| **U4 total** | **37** | **$0**; no OpenAI, no paid API, deployed database untouched |

**Running total with U6: 199 calls, $0** (`docs/05-qa/2026-09-23-p3-u6-verification-record.md`).

## 7. What runs next: U7, U8 and U9

**Order**, quoted verbatim from the register §4. U0 and U4 are done, so **U7 is next, and U9 and U8 land last**:

> **Order after the rulings:** **U0** (D-1a) opens the phase and is independent of the corpus, so it may run alongside U1/U2; it must precede **U7**, which consumes it. Then **U1 → U2 → U3 → U5 → U6 → U4**. **U6 before U4 is new, and is D-6's doing:** once U6 sources citations rather than only checking them, U4 may only cite what U6 has verified. U3 still precedes U4 (its guard's redness against the 19 is observable exactly once). **U9** (D-7) and **U8** are independent of the corpus and land last.

### U7 (PLAN block, verbatim)

> **U7 — coverage honesty *(D-1a: no longer blocked)*.** A product-wide treatment of *"we don't know"* versus *"there is nothing"* across effects, interactions, side effects and food pairings. **Absence must never read as safety** (`CLAUDE.md` §2.2 rule 10). ~~Cannot be verified as `[P3-X4]` requires until D-1 is ruled.~~ **D-1(a) unblocks it: U0 builds the harness, so `[P3-X4]`'s *test-verified* clause is satisfiable as the roadmap words it. U7 requires U0.** **Red proof:** a partial-coverage surface with no disclosure must fail whichever check D-1 selects.
> **Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded.

### U8 (PLAN block, verbatim)

> **U8 — injection seam and bundle budget.** `getBiomarker` takes a catalog parameter, finishing the seam. **Sized honestly (P-16): `getBiomarker` has ZERO call sites** — `grep -rn getBiomarker` over `*.ts|*.tsx|*.mjs` outside `node_modules` and `graphify-out` returns exactly one hit, the definition at `src/lib/biomarkers/index.ts:151`, and no barrel re-exports it. **The refactor is therefore unobservable and `CLAUDE.md` §5 rule 3 (reachability) cannot be satisfied for it as written.** What would make the seam observable: a caller — the Library biomarker surface U7 touches is the candidate — or U8 drops the refactor and ships the bundle assertion alone. **First deliverable: check §2's route table in** (P-17) — **D-5 ruled percentage headroom over that recorded baseline**, so the budget is meaningless until the baseline is an artifact rather than a build nobody reruns. **The percentage is not ruled: U8 chooses it and justifies the choice.** **Red proof:** the bundle assertion must fail against a deliberately inflated route.
> **Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded.

### U9 (PLAN block, verbatim)

> **U9 — `CLAUDE.md` §4 rule 7: the guard first, then the refactor *(new at (d), on D-7)*.** **8 of 31** client components import `@/lib` or `@/data` (one type-only); §2 prints the command. **The owner's ruling is guard-then-refactor, in that order and in one unit** — so rule 7 stops being a paragraph and becomes mechanical, which is `CLAUDE.md` §3 principle 5 applied to the rule that has gone unenforced longest. **The order is the whole point:** a guard written after the refactor is green on arrival and proves nothing. **Two costs U9 must carry, named here so they are not discovered later:** the new spec adds one to the architecture-spec count, and `SPEC_COUNT` binds that number at **four** documented sites plus its own pin (`spec-count.test.ts:97`), all of which U9 updates. ~~27 → 28~~ **[2026-09-23]** U1 (b) already took it to **28**, so U9 **re-derives the count when it lands** (`git ls-files 'src/architecture/*.test.ts' | wc -l`) rather than carrying a number from this paragraph; and the refactor spans `advisor/`, `auth/`, `checkin/`, `profile/` and `stack/`, not only the Library surface U7 touches. **`auth/AuthForm.tsx` is type-only** and U9 states whether a type-only import is a violation before it counts as one.
> **Red proof:** the guard is red against all **8** before any component moves, and the failure output is recorded — `[P3-X7]`.
> **Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded.
