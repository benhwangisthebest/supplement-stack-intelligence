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
