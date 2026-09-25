> **Clerk's note (main session), not part of the review.** Below is the independent Check's final report, recorded **verbatim**. An independent subagent produced it on 2026-09-24/25 against `c20db92`. Per the brief, its inputs were the register, the roadmap, `CLAUDE.md` and the repository at HEAD only; it did not read the phase report or any cycle artifact. The main session wrote its prompt, and did not edit its findings, its evidence or its verdict. The only changes are the removal of the harness's per-line indentation and of the trailing tool-usage lines. Dispositions of P3-1…P3-11 are made by the owner and recorded elsewhere, never in this file.

---

# Phase 3 — independent closeout Check

| | |
|---|---|
| **Date** | 2026-09-24 |
| **HEAD checked** | `c20db92b1871cdb86ff2dc28045282064de5016b` (`git rev-parse HEAD` in the review worktree `/Users/mac/Developer/ssi-check`, created with `git worktree add --detach … c20db92`) |
| **Inputs used** | **Only** the register `docs/01-plan/phase-3-evidence-grounding.plan.md`, `docs/roadmap.md`, the root `CLAUDE.md`, and the repository at HEAD (source, tests, `content/`, `scripts/`, `.github/`, git history), plus, read-only, the gitignored abstracts under `content/verification/captures/*/local/` in the main tree. **The phase report (`docs/04-report/phase-3-*`) and every cycle artifact (`docs/01-plan/features/p3-*`, `phase3-*`) were NOT read.** Where the register cites one, the claim was re-derived from code or marked uncheckable. |
| **Reviewer** | Independent subagent; did no Phase 3 work |
| **Constraints kept** | No network calls. No edits to the main working tree (all mutations in my own worktrees, removed). Nothing committed, pushed or branched. |

---

## 1. Scope and method

- Re-derived each of the nine exit criteria at HEAD by command (§3), with seed figures from a scratch script (`npx tsx --tsconfig tsconfig.json .chk/figs.ts`, importing `@/data/seed-effects`, `@/data/seed-papers`, `deriveGrade`).
- 16 mutation replays against 11 distinct Phase 3 guards (§4). Each used a file-copy backup, restore by `cp`, a `cmp` check, and `git diff | wc -l` = 0 afterwards. Two replays ran in short-lived worktrees at `0bbbf0a` and `080d3ce` (removed).
- Six effects traced end to end (§5). Every PMID paper's local `efetch.xml` abstract was re-hashed with the repo's own `parsePubmedXml` and compared with the committed `abstractSha256`. Every fixture entry was compared against the committed re-verification response bodies (`2026-09-24-rv`).
- Checked the register §7 (§6), `CLAUDE.md` and the roadmap against HEAD.
- Gate, in the worktree at HEAD: `npx tsc --noEmit` → exit 0. `npm run lint` → "lints 415 of 415 tracked source files … reported 0 errors", exit 0. `npx vitest run` → **144 files passed, 1679 tests passed**, exit 0. `npm run test:coverage` (extra) → 144 / 1679, exit 0.
- **Not run:** `next build`, E2E and `verify:bundle`. They need a build, and the build fetches Google Fonts (FU-66), which the no-network rule forbids. **U8's bundle guard, and any bundle figure, is therefore not re-verified here.** `CANONICAL_LAYOUT` and U0's `TEST_COLLECTION` were not mutation-replayed.

---

## 2. Findings

### P3-1 — MAJOR — The roadmap's Phase 3 status is false at HEAD
**Claim.** `docs/roadmap.md:42` reads "[2026-09-22] Phase 3 — STARTED … **no unit has been executed**", and `:500` repeats it, adding that the plan "carries **ten units U0–U9**". All five Phase 3 exit boxes (`:563-567`) are `[ ]`. Included item 5 is listed as if still pending, although its seam half is UNMET by ruling (register U8 R1, FU-65).
**Evidence.** `git log --oneline c4460c7..HEAD | wc -l` → 61 commits, including every unit landing. The register's U10 makes 11 units. `git log c4460c7..HEAD -- docs/roadmap.md` shows no status update after `b5aaab8`. `CLAUDE.md` §9.7 requires the roadmap's phase status to be updated when a phase completes.
**To resolve.** In the closeout landing: update `:42` and `:500`; tick or disposition the five exit boxes against the register; record item 5's seam half as UNMET and carried as FU-65; and record the owner's decision on the `[P3-X5]` wording (P3-11).

### P3-2 — MAJOR — `docs/project-status.md` still describes the pre-Phase 3 evidence layer
**Claim.** §2.1 (`:139-151`) still says "15 supplements, 27 effects, 20 papers … static TypeScript arrays in `src/data/*.ts`", "**19 of 27 effect grades are hand-typed letters**" and "No test can assert a grade is correct", with classification **X**. Known risk #1 (`:570`) still reads "Evidence grades are ungrounded (19/27 hand-typed)".
**Evidence.** The figures script prints `effects 27 profiled 27`, `grade != deriveGrade 0 []` and `papers 38`, and the source of truth is `content/seed/*.json`. The last change to that section predates the U4 closeout. `CLAUDE.md` §8.7 names this file as the classification record, and §9.7 requires it to be updated when a classification changes.
**To resolve.** Re-derive §2.1 and risk #1, and re-classify §2.1. The classification itself is the owner's call.

### P3-3 — MAJOR — The register leaves `[P3-X6]` and `[P3-X7]` unticked at close
**Claim.** `[P3-X6]` (`:444`) is `[ ]` and says it "stays open for any later unit, e.g. FU-57", so a phase exit criterion binds future phases. `[P3-X7]` (`:445`) is `[ ]`, and its evidence is cited only to cycle artifacts.
**Evidence.** X6 is met vacuously in-phase. A node diff of `id-manifest.json` between `c4460c7` and HEAD gives `papers removed [] added 18`, and no other namespace changed. `git diff --name-status c4460c7 HEAD -- supabase` is empty, so there is no migration. For X7, my replays (§4) go red on their target and green on restore for 11 guards: G1, G3, G4b, G4c, G6, G7, P2, P3, P5/P7, CONTENT_FIDELITY, CLIENT_TAKES_PROPS and RULE8_COMPONENT_TESTS, plus the X4 render test. **Not replayed:** CANONICAL_LAYOUT, TEST_COLLECTION, `verify:bundle`, G5 and the U10 component tests.
**To resolve.** Tick X6 as "met: no id retired or renamed in Phase 3", and move FU-57's future tombstone obligation onto FU-57's own row. Tick X7 with pointers to the recorded red evidence for each guard, or record which guards lack it.

### P3-4 — MAJOR — Open items with no §7 row or no owner (the "a promise is not a record" shape the closeout itself named for FU-50)
- **Open, with no §7 row at all.** Checked by a loop over `N-80…N-85` and `FU-48…FU-67` against §7's table rows (register lines 507–563):
  - **FU-61** (`:210`, rubric weights let a well-studied null effect reach B): open, "post-Phase 3, a rubric-owner unit".
  - **FU-62** (`:215`, sourcing for glycine-sleep and zinc-deficiency): open, "post-Phase 3".
  - **FU-63** (`:220`, make `evidenceProfile` required): open, "post-U4". **That condition has already fired**, since U4 is DONE, and no owner is named.
- **Open rows with no owner or trigger:**
  - FU-58 (`:548`) and FU-60 (`:550`) say only "OPEN."
  - FU-57 (`:547`) says "OPEN — owner.", with no phase or trigger.
  - FU-66 (`:553`) says "Options, not decided", with no owner.
  - FU-59's products remainder (`:549`) has no owner.
- **An orphaned residue.** FU-49's row is CLOSED (format only), but the glycine-dose disagreement it carries was handed to "U4/U6". Both units are done without resolving it, and `content/notes.json` still says `"owner: U4/U6"`.
- **Closed ids with no row** (minor): N-83, FU-51, FU-52 and FU-55, plus the unit-scoped `U8-F1`.
- The id ceiling was re-derived by `git grep -ohE 'N-[0-9]+' … | sort -n -u | tail -1` → 85 (FU → 67). No id beyond these exists.

**To resolve.** Add §7 rows for FU-61, FU-62 and FU-63. Give every open row, including the FU-49 glycine residue, an owner or an owner-condition.

### P3-5 — MAJOR (carried with an owner; does not block closure) — The provenance guard checks an attestation, not a captured response
**Claim.** D-3(c) is worded *"checks each DOI against a committed **response fixture** captured when it was verified."* The fixture actually holds a six-field summary (`id, kind, resolvedTitle, source, verifiedOn, verifiedBy`), and no guard ties an entry to a committed resolver response.
**Evidence.**
- **Probe.** In my worktree I planted an invented DOI, `10.5555/review.planted.0002`, on `p-nac-antioxidant`, together with a hand-written matching fixture entry (`verifiedBy: "owner"`). Then `npx vitest run src/data/provenance-record.test.ts src/data/seed-integrity.test.ts` → **2 files passed, 35 tests passed**. Restored, diff 0.
- **Missing response bodies.** The original S2 resolve runs committed no response bodies: `s2` 24, `s2b` 4, `s2c` 2, `s2d` 3 and `s2e` 3 calls, each with "bodies committed: 0".
- **Mitigation, which I verified.** The closeout (d) re-verification bodies are committed. My independent check (`.chk/rv.mjs`) confirms that all 37 fixture entries agree with them:
  - each uid equals its id;
  - the captured title, the fixture title and `Paper.title` are equal under `normaliseTitle`;
  - no pubtype matches retraction, withdrawal, erratum or expression of concern.
  
  Output: `RV-consistent 37 bad []`.

**To resolve.** Either add a guard that binds each fixture key to a committed response body under `captures/`, or record the owner's acceptance that verification rests on attestation plus a periodic re-verification record.

### P3-6 — MINOR — The fixture refresh policy was not followed as written
The register (`:257`) says trigger (2) "re-resolves each identifier **and refreshes `verifiedOn`**". The closeout (d) commit message (`2969b89`) says "verifiedOn not refreshed". The fixture holds 32 entries dated `2026-09-23` and 5 dated `2026-09-24`, from a node count grouped by `verifiedOn|source|verifiedBy`. **To resolve:** refresh the dates, or amend the policy.

### P3-7 — MINOR — glycine-sleep shows two contradictory statements on one card
The effect's `summary` reads "**No verified evidence in this library**: the one cited paper has no abstract to summarise." Beside it, `gradeDCoverage` renders D1: "Very limited evidence: the verified studies in this library are too few or too weak…". The code's own comment at `src/lib/safety/index.ts:127-128` says glycine-sleep "is D1, and 'no verified evidence' would be false there." **To resolve:** the owner decides the copy.

### P3-8 — MINOR — Content flags for the owner (flagged, not ruled)
- **Every Grade A sits at the threshold.** creatine-strength, fish-oil-cardiovascular and caffeine-training score 0.7667, and protein-powder-training 0.75 (per-effect `compositeScore` output).
- **Three of those four rest on an unrecorded convention.** They score `studyQuality: 2` while their rationale says the abstract reports no risk-of-bias detail (creatine-strength: "no randomisation"). One point less makes each of them B (0.6833). The convention, that trial design implies moderate quality when no rating is reported, is applied consistently to 9 effects. It is not recorded in the rubric or in R12/R13.
- **fish-oil-cardiovascular** (B → A in this phase) is "Cardiovascular support" at A/high on a triglyceride surrogate. Its own cited abstract says only that triglyceride-lowering "might provide supportive evidence … to prevent cardiovascular events".
- **caffeine-training** gives its population as "athletes, training adults", but its only paper studies runners. B6's ruling says a population broader than the evidence overstates who the effect applies to.

### P3-9 — MINOR — Stale comments; only FU-58 is registered
- `content/modules.json:43` → `src/data/seed-effects.ts:5`: "Grades reflect curated sample data for the MVP, not a formal evidence review."
- `src/lib/evidence-grading/weights.ts:2`: "thresholds are curated so the DERIVED grade reproduces curated intent". The direction is now the reverse.
- `src/types/evidence-grading.ts:33`: "absent = legacy behavior". This is FU-63's subject.

### P3-10 — MINOR — `CLAUDE.md` drift
- The §4 table header still says "measured 2026-08-02", although its rows now carry 2026-09-24 edits.
- §12's document map omits the Phase 2 and Phase 3 plans and reviews.
- §5 rule 10's pre-done list omits the `verify:bundle` step that Phase 3 added to CI. That is the N-29 asymmetry the rule's own note describes, though the same gap already existed for other CI steps.
- Verified true, needing no action:
  - the rule-7 row (replays M7 and M7b; the U9 red reproduced, §4);
  - the rule-8 text (replays M8a and M8b);
  - the baseline of 1679 tests / 144 files, lint 415/415 and 30 specs (`git ls-files 'src/architecture/*.test.ts' | wc -l` → 30);
  - the order of the CI chain (`grep -n "- name:" .github/workflows/ci.yml`).

### P3-11 — MINOR — `[P3-X5]`, the roadmap's wording, and parity
- 18 paper ids were added in-phase by hand-editing `src/data/id-manifest.json`, so `[P3-X5]` holds only for corrections that add, remove or rename no id. Whether to amend the roadmap's wording is still an unmade owner decision.
- The roadmap's migration clause still names `stack_items` for ids that actually persist at `advisor_messages.citations[].refId`.
- There is no criteria parity: `grep -c "P3-X" docs/roadmap.md` → 0. The register records this as a residue.

---

## 3. The nine exit criteria

| Id | Criterion (short) | What I ran → output | Verdict |
|---|---|---|---|
| **X1** | 27/27 effects have an `evidenceProfile`; a grade without one fails the build | `figs.ts` → `effects 27 profiled 27`, `grade != deriveGrade 0 []`. `UNPROFILED_GRADE_ALLOWLIST = []` (`seed-integrity.test.ts`). M3 (profile removed) → G4c red, naming `creatine-strength`. M2 → G4b red | **MET WITH CAVEAT.** "Fails the build" means CI's vitest step, not `tsc`/`next build`. The type still marks the profile optional (FU-63, which has no row; see P3-4) |
| **X2** | 100% of citations carry a verified DOI/PMID; red on a planted unverified citation | `figs.ts` → 38 papers, 37 cited, `cited without id []`, fixture 37 entries. `.chk/rv.mjs` → `RV-consistent 37 bad []`. M4 → P3 red. M5 → P2 red (a different test). M11 → P5 and P7 red | **MET WITH CAVEAT.** 100% of what is cited is verified. Two effects (`nac-antioxidant`, `protein-powder-recovery`) and 26 of 135 dimensions are uncited, and `p-nac-antioxidant` is uncited rather than verified. "Verified" rests on an attestation (P3-5) |
| **X3** | The content source of truth is non-TypeScript; codegen is byte-identical for the pre-migration corpus | `git diff --stat 94c534a 0bbbf0a -- src/data/` → empty. In a worktree at `0bbbf0a`, `node content/generate.mjs --check` → "checked 9 modules, 0 stale". `.chk/vals.ts` (c4460c7 vs 0bbbf0a) → 9/9 `deepStrictEqual` with key order. At HEAD, `npm run content:generate -- --check` → 0 stale. M6 → CONTENT_FIDELITY red | **MET WITH CAVEAT.** Byte-identical to the U1-normalised corpus and value-identical to `c4460c7`, per the owner's U1 Option A ruling |
| **X4** | Every partial-coverage surface states its limit; test-verified | `CoverageLimit.test.tsx` passes (23). M12 (InteractionSection's empty state rendered as `null`) → "InteractionSection — none" red | **MET** (only one replay; the other surfaces were not replayed) |
| **X5** | A content correction ships without hand-editing `src/` | Replay: edit the JSON only → `content:generate --check` "1 module(s) differ" → `content:generate` "1 changed". `git diff --stat` shows exactly the JSON and its generated module; 5 files / 107 tests green; restored | **MET WITH CAVEAT** (P3-11: an id change needs `id-manifest.json` under `src/`) |
| **X6** | Any id retired or renamed carries a tombstone and a migration | Manifest diff → only 18 paper `add`s. `supabase/` diff empty | **MET, vacuously**, but **unticked in the register** (P3-3) |
| **X7** | Every Phase 3 guard has red evidence | The recorded evidence is only in artifacts I may not read. My own replays are in §4 | **Unticked in the register.** Corroborated for 11 guards. Not replayed for the bundle budget, TEST_COLLECTION, CANONICAL_LAYOUT, G5 or the U10 component tests (P3-3) |
| **X8** | Every `paperIds` entry resolves; red on a planted dangling id | `figs.ts` → effect refs 37, unresolved 0; dimension refs 149, unresolved 0. M1 → G3 red | **MET** |
| **X9** | Rule 7 is mechanically enforced; red before the refactor | M7 (direct) and M7b (transitive, via the directive-less `CoverageLimit`) → R7b red. In a worktree at `080d3ce` with `CLIENT_LIB_IMPORT_ALLOWLIST` emptied → R7b red on **11 edges in 9 files** | **MET WITH CAVEAT.** The criterion says "all 8". The derived set is 7 directive files plus 2 transitive ones, with the type-only `AuthForm` excluded by ruling; the register records this |

---

## 4. Mutation replays

All ran in `/Users/mac/Developer/ssi-check` at `c20db92` with `.chk/mut.sh`: `cp` backup → `perl -0pi` edit → `npx vitest run <spec>` → `cp` restore → `cmp` → rerun. Every restore printed `restored (cmp identical); git diff lines: 0` and went green.

| # | Guard | Mutation | Red output (abridged) | Restore |
|---|---|---|---|---|
| M1 | G3 (+G8) | creatine-strength effect `paperIds` → `p-creatine-strength-DANGLING` (JSON) | `× G3 … no dangling paperId`; `× G8b` | 23/23 |
| M2 | G4b | creatine-strength `grade` A→B, `confidence` high→moderate | `× G4b a profiled effect's grade equals deriveGrade` (the only failure) | 23/23 |
| M3 | G4c | creatine-strength `evidenceProfile` deleted (+1 −40) | `× G4c … expected [ 'creatine-strength' ] to deeply equal []` | 23/23 |
| M4 | P3 | `"doi": "10.5555/review.planted.0001"` on `p-nac-antioxidant` | `× P3 doi: every well-formed paper doi has a fixture entry` | 35/35 |
| M5 | P2 | `"doi": "doi:planted-not-a-doi"` | `× P2 doi: every paper doi is well-formed` (P3 green, so the failures are distinct) | 35/35 |
| M6 | CONTENT_FIDELITY (+P-12) | `src/data/seed-effects.ts` "17 minutes" → "18" | `× CONTENT_FIDELITY … hand-edited? first difference at byte 565 (line 14, col 62)` | 23/23 |
| M7 | CLIENT_TAKES_PROPS | `import { deriveGrade } from "@/lib/evidence-grading"` in `SuggestionCard.tsx` | `× R7b … rule 7: 1 runtime import(s)` | 16/16 |
| M7b | CLIENT_TAKES_PROPS (transitive) | `import { COVERAGE } from "@/lib/safety"` in the directive-less `CoverageLimit.tsx` | `× R7b … 1 runtime import(s)` | 16/16 |
| M8a | RULE8_COMPONENT_TESTS | `git rm --cached FlagCard.test.tsx` | `× R8b … FlagCard.tsx — renders FlagSeverity @ …:18` | 11/11 |
| M8b | RULE8_COMPONENT_TESTS | a tracked new `PlantedReviewGrade.tsx` that renders an `EvidenceGrade` | `× R8b … PlantedReviewGrade.tsx — renders EvidenceGrade @ …:3` | 11/11 |
| M9 | G6 | glycine-sleep `humanEvidence.score` 0→1 with an empty `paperIds` | `× G6b no dimension scores above 0 with an empty paperIds` | 23/23 |
| M10 | G7 | "This will cure insomnia." prepended to a rationale | `× G7b none contains banned language` | 23/23 |
| M11 | P7 (+P5) | `pmid` removed from the cited `p-creatine-strength` | `× P5 … [ 'pmid:39519498' ]`; `× P7 no cited paper lacks an identifier` | 12/12 |
| M12 | X4 render test | InteractionSection's empty branch → `null` | `× InteractionSection — none: a supplement with no interaction rules` | 23/23 |
| M13 | G1 | `https://example.org/x` inside a paper title in the JSON | `× G1 … no source file references the placeholder host` | cmp identical |
| U9-replay | CLIENT_TAKES_PROPS at `080d3ce` | allowlist emptied (worktree `ssi-check-u9`) | 11 crossings listed (7 direct, 2 transitive files) | worktree removed |
| Probe | P1–P7 (limit) | an invented DOI **plus a hand-written fixture entry** | **35/35 green**: the P3-5 bypass | restored |

Two setup attempts first failed on malformed edits (a trailing comma in JSON, a JSX syntax error). Both were restored and rerun correctly, and only the valid runs are shown.

---

## 5. End-to-end effect samples

Grades at base vs HEAD: a compare script over `git show c4460c7:src/data/seed-effects.ts` and HEAD prints `changed 15`, over the same 27-id set. The distribution at HEAD is `{"D":6,"C":8,"A":4,"B":9}`.

**Abstract integrity, checked for every PMID paper (`.chk/abs.mjs`).** The 52 local `efetch.xml` files match the committed `files[].sha256`, with 0 bad. The parsed abstract, re-hashed, equals the committed `abstractSha256` for **36 of 36** PMID papers ("match: YES"). **How:** each local `captures/*/local/<claim>/efetch.xml` was parsed with the repo's `parsePubmedXml`, each record keyed by PMID, and its hash looked up across every committed `candidates.json` `pubmed[].abstractSha256`.

| Effect | Grade (base → HEAD) | deriveGrade | Papers → id → fixture | Abstract hash | Rationales vs abstract |
|---|---|---|---|---|---|
| **caffeine-training** | A (unprofiled) → **A** | 0.7667 → A ✓ | `p-caffeine-training` → pmid 36615805 → fixture 2026-09-23/owner/pubmed-eutils; titles equal | ✓ (s1) | Supported: 21 RCTs, 254 participants, g 0.392 medium, g −0.101 small, "unclear-to-low risk of bias". Flags: population wider than runners; studyQuality 2 (P3-8) |
| **fish-oil-cardiovascular** | B (profiled) → **A** (changed) | 0.7667 → A ✓ | `p-fish-oil-cv` 37264945; `p-fish-oil-triglycerides-t2d` 39163858; both 2026-09-23/owner | ✓ ✓ | Figures match (90 RCTs / 72,598 participants; −1.51 vs −0.66 mmol/L). The consistency-2 rationale describes the shape of the dose-response, not agreement between studies, so its support is weak. studyQuality 2 with "no risk-of-bias rating" reported. A surrogate outcome under a "Cardiovascular support" name at A (P3-8) |
| **caffeine-focus** | A (profiled) → **B** (changed) | 0.6167 → B ✓ | 5 papers (25527035, 23108937, 20464765, 28969341, 20521321); fixture dates: 2 on 2026-09-23, 3 on 2026-09-24 | ✓ ×5 | Supported: Cochrane high risk of bias → studyQuality 1; the tolerance trial's "little net gain in alertness" → consistency 1; SMD −0.55 → effectSize 2 |
| **magnesium-sleep** | B (profiled) → **D** (changed) | 0.3167 → D ✓ | `p-magnesium-sleep` 33865376 → 2026-09-23/owner | ✓ | Supported: 3 RCTs, 151 participants; SOL −17.36 min; TST +16.06, not significant; "moderate-to-high risk of bias … low to very low quality". Consistency 0 with `[]` (R5) |
| **glycine-sleep** | B (unprofiled) → **D** (changed) | 0.0000 → D ✓ | `p-glycine-sleep` → doi 10.1111/j.1479-8425.2007.00262.x → 2026-09-23/owner/crossref | no abstract (DOI-only, R6) | All five dimensions are 0 with `[]`; the card fields read "Not reported in abstract". Copy contradiction (P3-7) |
| **l-theanine-stress** | B (unprofiled) → **D** (changed) | 0.2500 → D ✓ | `p-ltheanine-stress` 16930802 → 2026-09-23/owner | ✓ | Supported: 12 participants, double-blind, counterbalanced, a lab arithmetic stressor; heart rate and s-IgA reduced. populationRelevance 2 is plausible |

The same checks across the whole corpus: `grade != deriveGrade 0 []` for all 27, and every cited paper carries a fixture entry whose title equals `Paper.title` (P4 green, and `.chk/rv.mjs`).

---

## 6. The register verified (§7)

- **Owners and conditions.** Six open items lack an owner or a trigger, and three open ids (FU-61, FU-62, FU-63) have no §7 row. FU-63's owner-condition, "post-U4", has already fired. See P3-4.
- **Closed rows, verified against the tree:**
  - N-80 and N-81: `_PaperSchemaConformsToPaper` is at `src/lib/validation/seed.ts:82`, and G2 derives the allowed keys from the schema.
  - FU-48: replay M13.
  - FU-52: `ci.yml:141` sets `node-version: "20.20.2"`.
  - FU-54: the generated headers are present.
  - FU-56: the `seed-papers.ts` preamble is updated.
  - N-84: the notice is reworded (`IllustrativeDatasetNotice.tsx`).
  - FU-64 and U-DEFER-4: replays M8a and M8b.
  - FU-67: `SupplementDetail.test.tsx:58` asserts the grade title.
  - N-82's cause was not re-verified, because that needs a build.
  - **FU-49 is misleadingly CLOSED**, because its glycine residue is orphaned (P3-4).
- **Ids issued without a row:** N-83, FU-51, FU-52 and FU-55 (all closed); FU-61, FU-62 and FU-63 (open).
- **Id ceilings:** N-85, FU-67, OP-7. OP-8 appears only as "next free" in the plan review and was never issued.
- **Items carried from Phase 2, re-checked for Phase 3 impact.** OP-5, FU-29 and live E2E remain deferred. Phase 3 wrote no migration (`supabase/` diff empty) and added no API route (`git diff --name-status c4460c7 HEAD -- 'src/app/api/**'` is empty). No new engine directory was added, so there is no obligation under `CLAUDE.md` §5 rule 7 (coverage entry).

---

## 7. Verdict: COMPLETE WITH FOLLOW-UP

Phase 3 delivered what it set out to deliver. I re-derived that by command, not from ticks:
- 27/27 effects are profiled, and every stored grade equals `deriveGrade`.
- Every cited paper (37) carries an identifier with a fixture entry. The fixture agrees with the committed re-verification response bodies (37/37), and every locally held abstract re-hashes to its committed SHA-256 (36/36).
- At migration, the JSON source of truth was byte- and value-identical.
- Rules 7 and 8 are now mechanical, and each guard I replayed goes red on its bug and green on restore.

The phase cannot be recorded as closed on the current documents, though:
- the roadmap still says no unit has run (P3-1);
- `project-status.md` still classifies the evidence layer as 19/27 hand-typed (P3-2);
- the register leaves X6 and X7 unticked (P3-3);
- several open items have no row or no owner (P3-4).

All of these are closeout bookkeeping, not defects in what was delivered, and that is why the verdict is not NOT CLOSED. P3-5 is a real weakness in the provenance guard, since a hand-written fixture entry passes. Because the content is independently corroborated today, it is carried rather than blocking.

**Must be resolved in the closeout landing, before the phase is marked complete:** P3-1, P3-2, P3-3, P3-4.
**Carried, each needing an owner or an owner-condition:** P3-5, P3-6, P3-7, P3-8, P3-9, P3-10, P3-11.

Cleanup: the worktrees `/Users/mac/Developer/ssi-check`, `ssi-check-u2` and `ssi-check-u9` are removed. `git worktree list` shows `main` plus a pre-existing `/Users/mac/Developer/ssi-gate` at `2969b89`, which I did not create or touch. In the main tree, `git status --short` → `?? .claude/launch.json` only, and HEAD is `c20db92`.

# PHASE 3 COMPLETE WITH FOLLOW-UP

---

> **Clerk's note (main session), not part of the addendum.** §8 below is an independent delta-check subagent's report, recorded **verbatim**. The subagent was fresh: it did no Phase 3 work and wrote none of the remediations. It ran on 2026-09-25 against `8913605`, with only the inputs its header states: this review, the register, and the repository at HEAD. The main session did not edit its statuses, evidence or D-items. The only changes are removing the harness's per-line indentation and the trailing tool-usage lines. D-1…D-5 are dispositioned by the owner at the phase-closed declaration, not in this file.

## 8. Delta check addendum (2026-09-25)

| | |
|---|---|
| **HEAD checked** | `89136055f6dba34142074014d1d63c03698535c3` (`git rev-parse HEAD` on `main`; worktree `/Users/mac/Developer/ssi-delta` created with `git worktree add --detach … HEAD`) |
| **Inputs used** | **Only** this review (§1–§7), the register `docs/01-plan/phase-3-evidence-grounding.plan.md`, and the repository at HEAD (code, tests, `content/`, `docs/roadmap.md`, `docs/project-status.md`, `CLAUDE.md`, git history), plus, read-only, one gitignored local abstract (`captures/2026-09-23-s3/local/effect_magnesium-stress/efetch.xml`). **Not read:** `docs/04-report/phase-3-evidence-grounding.report.md` and every cycle artifact (`docs/01-plan/features/p3-*`, `phase3-*`). For `[P3-X7]`'s pointers I checked only that each target file is tracked (`git ls-files --error-unmatch`), not what it says. Commit messages were treated as claims and checked against the tree. |
| **Reviewer** | Independent subagent; did no Phase 3 work and wrote none of the remediations |
| **Constraints kept** | No network. No edits to the main tree. Every mutation ran in my own worktree with `cp` backups, and each restore was confirmed by `cmp` and `git diff \| wc -l` = 0. The worktree is removed. Nothing was committed, pushed or branched. |

### 8.1 Status per finding

| Finding | Sev | Status | Evidence (file:line, commands) | Notes (per part) |
|---|---|---|---|---|
| **P3-1** | MAJOR | **ADDRESSED** | `docs/roadmap.md:42` and `:500`: the old status is struck and replaced with "all eleven units (U0–U10) DONE … phase-closed declaration pending the owner's go". `:563-569`: all five exit boxes are `[x]`, each with a `[P3-Xn]` pointer. `:541`: item 5 records the bundle half DONE and the seam half UNMET, carried as FU-65. `:569`: the X5 caveat. | **(a)** `:42`/`:500` updated: ADDRESSED. **(b)** Five boxes ticked or dispositioned: ADDRESSED. The X1 box states the "fails the build = vitest" caveat and FU-63, and the X4 box names FU-59. **(c)** Item 5's seam half UNMET → FU-65: ADDRESSED. **(d)** Owner decision on the X5 wording: the caveat is recorded "in its place", which is ADDRESSED in substance. The text still calls the amendment "the owner's decision" rather than saying it was decided (**D-3**). |
| **P3-2** | MAJOR | **CARRIED-WITH-OWNER** (the re-classification part only) | `docs/project-status.md:141-148` is re-derived. I re-derived it independently. `node` over `content/seed/*.json` gives 15 · 27 · 38 · 20 · 10 · 13 · 15 · 12 · 21. A scratch script gives the distribution `{A:4,B:9,C:8,D:6}`, profiled 27, dims 135, uncited dims 26, uncited effects `[nac-antioxidant, protein-powder-recovery]`, papers 38, cited 37, cited without id `[]`. `npx tsx figs.ts` gives `grade!=derive []`. Risk #1 is restated at `docs/project-status.md:583`. | **(a)** Re-derive §2.1: ADDRESSED, all figures match HEAD. **(b)** Risk #1: ADDRESSED. **(c)** Re-classify: **CARRIED-WITH-OWNER**. The heading at `:139` is still **X**; `:150` reads "PROPOSED X → P (pending the owner's go at the phase-closed declaration)", which names the owner and the condition. The Check left the classification to the owner, so this does **not** block closure, but the declaration must apply or reject it. |
| **P3-3** | MAJOR | **ADDRESSED** | Register `:466`: `[P3-X6]` is `[x]` "met trivially", with the future-tombstone obligation moved to FU-57, whose row (`:569`) now holds it. Register `:467`: `[P3-X7]` is `[x]` with a pointer for each guard, and all 13 pointer targets are tracked (`git ls-files --error-unmatch`). | X6: ADDRESSED. X7: ADDRESSED as "pointers per guard". I did not read the pointer contents (input rule). The Check's §4 replays and my §8.2 replays corroborate G1, G3, G4b/c, G6, G7, P2, P3, P5/P7, P8, CONTENT_FIDELITY, CLIENT_TAKES_PROPS, RULE8_COMPONENT_TESTS, the R17 pins and the new D1/D2 tests. |
| **P3-4** | MAJOR | **ADDRESSED** | New §7 rows: FU-61 `:576`, FU-62 `:577`, FU-63 `:578`, each with an owner and Phase 4. Owners and phases added: FU-57 `:569`, FU-58 `:570`, FU-59 products `:571` (tied to roadmap Phase 4 item 2), FU-60 `:572`, FU-66 `:575`. FU-49's glycine residue → FU-62 (`:564`, `:577`); `content/notes.json:7` now reads "owner: ~~U4/U6~~ FU-62, Phase 4". | Every named part of "To resolve" is ADDRESSED. I scanned every open §7 row from `:540` on, and each Phase 3 id carries an owner plus a phase or trigger. **Not acted on, and not required by "To resolve":** the Check's minor sub-bullet about closed ids with no row (N-83, FU-51, FU-52, FU-55, U8-F1). `grep "^| \*\*<id>\*\*"` still finds no row for any of them. Phase 2-carried deferral rows without an owner (e.g. N-11 cluster, FU-30…FU-38) predate this phase and are outside P3-4. |
| **P3-5** | MAJOR | **ADDRESSED** | Guard **P8**, `src/data/provenance-record.test.ts:136` (P8a–d), backed by `checkResponses` and `parseResponse` at `content/verification/provenance.mjs:165` and `:188`. `validateFixture` now requires `response {path, sha256}`. My check: 37 of 37 entries are tracked, each hashes to its digest, and all point into `captures/2026-09-24-rv/`, which was committed at `2969b89`, before the Check. `git diff --stat cd3cb1b HEAD -- content/verification/captures` is empty, so (e1) wrote no new bodies. Mutations are in §8.2. | The Check's own probe is now red (§8.2 M-A). The register states the remaining limit at `:279` (E1-R2b), and I confirmed it: a forged body that is **staged or committed** with a correct digest passes (§8.2 M-D). That limit is owned as **FU-72** (`:586`, owner, Phase 4), and the phase-closeout live re-verification covers it. |
| **P3-6** | MINOR | **ADDRESSED** | Grouping the fixture by `verifiedOn|source|verifiedBy` gives `2026-09-24|pubmed-eutils|owner: 36` and `2026-09-24|crossref|owner: 1`. The policy is amended at register `:279`: re-verification sets `verifiedOn` to the re-verification date. | Both options were taken: the dates are refreshed, and the policy is made precise. |
| **P3-7** | MINOR | **ADDRESSED** | Owner ruling: D1/D2 follows R6. `hasSupportingPaper` and `isTitleOnly` are at `src/lib/safety/index.ts:143`. `gradeDCoverage(effect, papers)` at `:166-171` uses them, and so does the advisor at `src/lib/advisor/tools.ts:81-83`. Callers, enumerated by `git grep gradeDCoverage\|hasSupportingPaper`: `SupplementDetail.tsx:178,184` and `tools.ts:81`. Tests: `CoverageLimit.test.tsx:345` (glycine-sleep is D2 on the card and the breakdown), `safety.test.ts:63`, `tools.test.ts:180`. | glycine-sleep now shows D2, which agrees with its summary, so the contradiction is gone. Two residues: the card now says "No verified evidence in this library" twice (**D-4**), and one comment is stale (**D-2**). |
| **P3-8** | MINOR | **CARRIED-WITH-OWNER** | R17 is at register `:246-27x`. Scores at HEAD: `magnesium-stress:2` and `l-theanine-stress:2`, and the other 25 match R17's table. Composites: magnesium-stress 0.3000 D, l-theanine-stress 0.3333 D, and the four A grades at 0.7667 ×3 and 0.7500. `grade!=derive []`. Pins: `grade-changes.test.ts:84`. The magnesium-stress abstract (PMID 33864354, local efetch) contains "randomised controlled" and "secondary analysis", and neither "post-hoc" nor "placebo", which supports the rewritten rationale. | **Bullet 1** (every A at the threshold): ADDRESSED as a flag. R17 names it, and the A grades hold under the written convention. The weight question stays with FU-61. **Bullet 2** (the unrecorded convention): ADDRESSED. R17 is written and applied; 2 scores moved and no grade moved. Its size-clause weakness is FU-71 (`:585`, Phase 4). **Bullet 3** (fish-oil surrogate): **CARRIED** as FU-68 (`:582`, owner, Phase 4). **Bullet 4** (caffeine-training population): ADDRESSED. `content/seed/seed-effects.json:1364` now reads "recreational and trained runners, mostly men". |
| **P3-9** | MINOR | **CARRIED-WITH-OWNER** | `src/data/seed-effects.ts:4-6` (generated from `content/modules.json`) now says every grade is derived from its profile; FU-69 is closed (`:583`). `src/lib/evidence-grading/weights.ts:2-4` now says "The letters follow the rubric, not the reverse"; FU-70 is closed (`:584`). `src/types/evidence-grading.ts:33-36` now points to FU-63. `content:generate --check` → "checked 9 modules, 0 stale". | All three named comments are fixed. FU-58 (`src/types/paper.ts:3` still reads "ILLUSTRATIVE … not a citable") is carried with an owner and Phase 4 (`:570`). |
| **P3-10** | MINOR | **ADDRESSED** | `CLAUDE.md:161`: the header reads "~~measured 2026-08-02~~ re-checked 2026-09-25". `CLAUDE.md:211`: rule 10 now includes `npm run verify:bundle`, which exists at `package.json:20` and runs at `.github/workflows/ci.yml:258`. `CLAUDE.md:439-445`: seven new map rows, all tracked. | All three parts are ADDRESSED. The baseline figure two paragraphs below was not re-measured (**D-5**). |
| **P3-11** | MINOR | **CARRIED-WITH-OWNER** | X5 caveat: `docs/roadmap.md:569`. Migration table: `docs/roadmap.md:553`. Parity: register `:474`, "Carried to Phase 4, grouped with N-85"; N-85's row (`:587`) has an owner and Phase 4. | **(1)** X5 wording: ADDRESSED as a caveat in place (see D-3). **(2)** Migration clause: ADDRESSED for papers and effects, which the manifest confirms (`papers`/`effects.persistedAt` = `advisor_messages.citations[].refId`), but the new note introduces a false claim (**D-1**). **(3)** Criteria parity: **CARRIED** to Phase 4 with N-85. `grep -c "P3-X" docs/roadmap.md` is still 0, as expected. |

**Register §5 exit criteria:** at HEAD, `[P3-X1]`…`[P3-X9]` are all `[x]` (register `:451-469`). `grep -n '^- \[ \]'` over the register returns nothing, so no criterion is left unticked.

**Gate, in the worktree at HEAD:**
- `npx tsc --noEmit` → exit 0.
- `npm run lint` → "lints 415 of 415 tracked source files … reported 0 errors", exit 0.
- `npx vitest run` → **144 files passed, 1692 tests passed**, exit 0. That is +13 over the Check's 1679: P8a–d, the D1/D2 rows and the R17 pins.
- **Not run:** `next build`, `verify:bundle` and E2E. The build fetches Google Fonts (FU-66), and this check ran without network.

### 8.2 Mutation / test evidence I ran

All mutations ran in `/Users/mac/Developer/ssi-delta` at `8913605`. Each followed the same steps: `cp` backup → edit → `npx vitest run <specs>` → `cp` restore → `cmp` → `git status --porcelain | wc -l` = 0 → the spec is green again.

| # | Target | Mutation | Result | Restore |
|---|---|---|---|---|
| M-A | P3-5, the Check's probe replayed | invented DOI `10.5555/review.planted.0002` on `p-nac-antioxidant`, plus a hand-written six-field fixture entry (`verifiedBy: "owner"`, title matching) | **RED, 2 failed / 38 passed:** `× P1 … exactly the recorded fields`, `× P8a every entry names a committed response`. At the Check's HEAD this probe was 35/35 green. | cmp identical, 40/40 |
| M-B | P8c | the same DOI and entry, with `response` pointing at another paper's committed body (`p-glycine-sleep/crossref-work.json`) under its **correct** sha256 | **RED, 1 failed:** `× P8c … is the record for the entry's identifier` | cmp identical |
| M-C | P8a | the same, with a well-formed forged Crossref body written to disk (untracked) and a correct digest | **RED, 1 failed:** `× P8a` (uncommitted) | cmp identical, file removed |
| M-D | P8's stated limit (a control, expected green) | M-C with the forged body `git add`-ed | **GREEN, 40/40.** This confirms the register's stated limit (E1-R2b, `:279`), owned as FU-72 | `git rm --cached`, file removed, porcelain 0 |
| M-E | P3-7, the engine | `gradeDCoverage` back to `effect.paperIds.length > 0` | **RED, 2 failed / 50 passed:** `× gradeDCoverage … all cited papers title-only → D2`, `× SupplementDetail — D2: glycine-sleep … card and breakdown header` | cmp identical, diff 0 |
| M-F | P3-7, the advisor | `tools.ts`'s summary predicate back to `e.paperIds.length > 0` | **RED, 1 failed / 21 passed:** `× getSupplement: an effect whose cited papers are all title-only carries it too` | cmp identical, diff 0 |
| M-G | P3-8, the R17 pin | `magnesium-stress` studyQuality 2 → 1 in `src/data/seed-effects.ts` | **RED, 1 failed / 16 passed:** `× R17 … 'magnesium-stress' → studyQuality 2, Grade 'D', confidence 'low'` | cmp identical, diff 0 |

**Also checked:**
- Fixture vs tracked bodies, by a node script over the fixture and `git ls-files`: 37 entries, 0 untracked, 0 hash mismatches.
- `call-log.jsonl` in `2026-09-24-rv` has 37 lines. The register's running total of 199 plus those 37 gives 236, which matches the roadmap's "236 calls in all" (`:500`).

### 8.3 New items introduced by the remediations

- **D-1 — MINOR.** `docs/roadmap.md:553`, added at `8913605`, says "Only supplement ids persist in `stack_items`." HEAD contradicts it: `src/data/id-manifest.json` gives `products.persistedAt` as `"stack_items.product_id (0004, text, no FK)"`. The note corrects one wrong table and introduces a second error. Fix: "supplement **and product** ids persist in `stack_items`".
- **D-2 — TRIVIAL.** The comment above `gradeDLimited`/`gradeDUncited` at `src/lib/safety/index.ts:111-112` still says the split is "by whether the effect itself cites any paper". Since `97e35cf`, `gradeDCoverage` (`:156-171`) splits on whether the effect cites a *supporting* paper (R6).
- **D-3 — MINOR.** `docs/roadmap.md:569` records the X5 caveat, but says "Amending this criterion's wording is the owner's decision" without recording that the owner decided "caveat, not amendment". P3-1(d) asked for the decision to be recorded. That a decision was made can only be inferred, from "in its place" and from the `8913605` commit message ("Owner rulings on the independent Check"). One dated clause would remove the ambiguity.
- **D-4 — TRIVIAL.** Since the P3-7 fix, glycine-sleep's card renders its summary ("No verified evidence in this library: the one cited paper has no abstract to summarise.") followed by D2 ("No verified evidence in this library for this effect…"). The two are redundant, not contradictory. The advisor gets both in one string (`tools.ts:81-83`), which works against the "row 14" intent in `tools.test.ts`: that the model reads each sense once. This is a copy decision for the owner.
- **D-5 — INFO.** The `CLAUDE.md:230-234` baseline reads "1679/1679 unit tests across 144 files", dated "re-measured 2026-09-24". HEAD measures **1692 / 144**. The line is a dated snapshot, so it is not false as written. However, (e3) edited §5 after (e1) and (e2) had added tests, and did not re-measure. This is FU-32's class. The phase-closed declaration should re-measure.

**How I established that there is nothing further:**
- re-derived every figure in `project-status.md` §2.1 by command;
- checked R17's table cell by cell against the studyQuality scores at HEAD;
- compared roadmap `:553` against `id-manifest.json`;
- enumerated the callers of the changed `gradeDCoverage` signature;
- checked that the 7 new `CLAUDE.md` map paths are tracked;
- cross-checked the 236-call claim;
- ran the full gate (tsc, lint, vitest) and `content:generate --check`.

### 8.4 Summary

- **ADDRESSED: 7** — P3-1, P3-3, P3-4, P3-5, P3-6, P3-7, P3-10.
- **CARRIED-WITH-OWNER: 4** — P3-2 (re-classification, pending the owner's go at the declaration), P3-8 (FU-68), P3-9 (FU-58), P3-11 (parity, with N-85).
- **NOT ADDRESSED: 0.**

The four must-resolve findings (P3-1…P3-4) are resolved. P3-2's one open part, the classification, is left to the owner by the Check itself and is scheduled for the declaration. **No finding blocks the phase-closed declaration.** D-1 and D-3 are minor and should be corrected at or before the declaration. D-2, D-4 and D-5 are trivial or informational.

**Cleanup.** `/Users/mac/Developer/ssi-delta` is removed (`git worktree remove`). `git worktree list` shows `main` at `8913605` plus a pre-existing `/Users/mac/Developer/ssi-gate` at `66c6cf7`, which I did not create or touch. In the main tree, `git status --short` → `?? .claude/launch.json` only.
