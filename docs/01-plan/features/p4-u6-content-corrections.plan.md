# p4-u6-content-corrections — PDCA cycle artifact for Phase 4 U6, landing (a)

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U6**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U6 (a) · Content corrections · **SUPERVISED** · deterministic · **Anchor** `d2fc199` · **Date** 2026-09-27
> **Authority:** the owner's standing approval for U6 (2026-09-27): branch, commit, push, fast-forward `main`, delete the
> branch, on a green G over the staged tree in a clean worktree, green branch CI, and the staged set equal to *May
> touch*. **Not covered, shown verbatim and stopped on:** the name, the R12/R13 table (§3), the `notes.json` line (§4).
> **Rulings:** D-5 (a) (`phase-4-product-completion.plan.md:248`); the owner's U6 rulings R-1…R-3 (2026-09-27, plan §6);
> Phase 3 R5, R6, R12, R13 (`phase-3-evidence-grounding.plan.md:204`, `:210`, `:215`); `CLAUDE.md` §2.2 rules 7, 8, 10.

## 1. Plan

**Goal (the brief's):** rename `fish-oil-cardiovascular` to the outcome its cited papers measure, with a pin, and record
the glycine dose residue as undecidable, changing no score, grade, rationale, `paperId` or dose.
**Carried:** FU-68 (closes on approval); FU-62's dose half (closes per R-1; FU-62 stays OPEN for sourcing).

**Premises, measured at `d2fc199`:**

| | Claim | Measured |
|---|---|---|
| P-a | no code or test pins the old name | `git grep -n "Cardiovascular support"`: the target itself (`content/seed/seed-effects.json:494`), the GENERATED module (`src/data/seed-effects.ts:379`), dated records in `content/verification/` (`captures/2026-09-23-s1/candidates.json:613`, `:3316`; `u6-claims.json:39`, `:200`) and docs (Phase 3 plan `:586`, report `:280`, Check `:84`, `:162`, U6 candidates `:67`, `:346`). **No code or test pin.** |
| P-b | every outcome field already describes triglycerides | `content/seed/seed-effects.json:491-556`, quoted: `summary` *"May lower triglycerides; benefits dose-dependent on EPA/DHA content."* · `relevantPopulation` *"adults with elevated triglycerides"* · `outcomeCategory` *"metabolic"* · `mechanismTags` *"triglyceride-lowering"*, *"anti-inflammatory"* · the five rationales in §3. All describe triglycerides. **Note, not a stop:** `anti-inflammatory` is a mechanism tag, not an outcome field, and neither cited abstract mentions inflammation. The rename neither creates nor fixes that; it is shown to the owner at the stop (§6) |
| P-c | highest issued ids | `git grep -ohE` over `docs CLAUDE.md`: **N-92, FU-74** (N-99 is a fixture, `doc-truth.test.ts:677`). R-2 issues **FU-75** |
| P-d | where content pins live | `git grep -n "R10\|R17" -- 'src/**/*.test.ts'` → `src/lib/protocol-builder/grade-changes.test.ts` (R10 tier pins `:68`, R17 score pins `:84`). **Path overlap:** it is under `src/lib/**`, which *May NOT touch* names, and it is also the *May touch* item "the existing content-pin test file". The specific grant was read as governing. One `describe` was added and nothing else changed. The standing approval names *the brief's* list, which is narrower than the register's cell, and the U6 row now records that |

## 2. Design

A name is copy, and §2.2 rule 7 binds copy to what the system computed. The profile scores triglyceride evidence, so the
name has to say triglycerides. Only the `name` field moves. The id stays (rule 16), and so do the grade, every score,
rationale and `paperIds`. The two dose figures stay as well. The name is proposed from the two captured abstracts, which
were re-extracted from the gitignored `local/` efetch captures with `capture.mjs`'s own `plainText` and `sha256` and its extraction loop re-implemented inline, and whose
SHA-256 matches the committed `abstractSha256`. It follows the library's style, a short sentence-case outcome phrase (*"Blood sugar
control"*, *"Glucose metabolism"*, *"Sleep onset"*). The pin goes beside R10 and R17 as one `it.each` row, so the next
correction adds a row rather than a file. The glycine line is appended to the existing `status` string. It adds no new
key, since `CONTENT_NOTES` reads `module`/`anchorId` and the generator never reads the file (`content/generate.mjs:14`).

## 3. AC-1 name proposal and AC-2 R12/R13 re-check (STOP items)

**Proposed name: *"Triglyceride lowering"*.** The papers' own words (full abstracts, hashes matched):
- PMID 37264945, title *"Association Between Omega-3 Fatty Acid Intake and Dyslipidemia: A Continuous Dose-Response
  Meta-Analysis of Randomized Controlled Trials."* (`content/verification/captures/2026-09-23-s1/candidates.json:643`).
  Conclusion: *"combined intake of omega-3 fatty acids near linearly lowers triglyceride and non-high-density
  lipoprotein cholesterol"* (abstract sha `aaea6ea3…`, `candidates.json:653`).
- PMID 39163858, title *"Impact of omega-3 fatty acids on hypertriglyceridemia, lipidomics, and gut microbiome in
  patients with type 2 diabetes."* (`candidates.json:3364`). *"The primary outcome was changes in serum TGs"*; conclusion
  names *"the TG-lowering efficacy of FO"* (sha `50ece6e5…`, `candidates.json:3376`).

**R12:** humanEvidence is the strength of evidence *that the effect exists*. **R13:** consistency and effect size
measure the benefit *the effect claims* (`phase-3-evidence-grounding.plan.md:210`, `:215`). Under the new name the
claimed benefit is triglyceride lowering.

| Dimension | Score | Rationale (verbatim, `seed-effects.json`) | paperIds | Measures support for *Triglyceride lowering*? |
|---|---|---|---|---|
| humanEvidence | 3 | "90 randomised trials (72,598 participants) found omega-3 intake lowered triglycerides near-linearly with dose; a 309-patient randomised trial found the same in type 2 diabetes." | p-fish-oil-cv, p-fish-oil-triglycerides-t2d | **yes**: human RCT evidence that triglyceride lowering exists, in both papers |
| studyQuality | 2 | "Randomised trials, including a double-blind placebo-controlled trial; the abstracts report no risk-of-bias rating." | p-fish-oil-cv, p-fish-oil-triglycerides-t2d | **yes**: the design of the trials whose outcome is triglycerides (39163858's primary outcome is serum TG) |
| consistency | 2 | "The triglyceride dose-response was approximately linear in the general population and more evident in hyperlipidaemia and overweight or obesity." | p-fish-oil-cv | **yes**: agreement on the triglyceride benefit across subgroups. *Carried, not re-scored:* the Phase 3 Check found it describes dose-response shape more than between-study agreement (`phase-3-closeout-check.md:162`) |
| effectSize | 2 | "Triglycerides fell 1.51 mmol/L on 4 g fish oil versus 0.66 mmol/L on corn oil; the meta-analysis reports a dose-response shape, not a pooled size." | p-fish-oil-triglycerides-t2d, p-fish-oil-cv | **yes**: the size of the triglyceride fall |
| populationRelevance | 2 | "The general population, more evident in hyperlipidaemia and overweight or obesity above 2 g/day; the trial enrolled Chinese adults with type 2 diabetes and high triglycerides." | p-fish-oil-cv, p-fish-oil-triglycerides-t2d | **yes**: the populations in which the triglyceride effect was measured |

Every row is **yes**, so the profile stands untouched. Under the old name each would fail R12/R13, since no row
measures cardiovascular events, and that is FU-68.

**NOTE (AC-1), old claim:** one verified corpus paper does address cardiovascular events: `p-fish-oil-longevity`, PMID
32114706, *"Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease."* (Cochrane, 2020;
`candidates.json:657-659`; provenance `content/verification/provenance-fixture.json:206`). Its captured conclusion (sha
`6f3b9ff1…` matches `candidates.json:670`) reads *"increasing LCn3 slightly reduces risk of coronary heart disease mortality and
events, and reduces serum triglycerides"*. Its corpus summary reads *"little or no effect on all-cause mortality"*
(`seed-papers.json:274`). It is cited on `fish-oil-longevity` (`seed-effects.json:635`), **not** on this effect.

## 4. Do: acceptance criteria, with outputs

- **AC-3 pin:** `grade-changes.test.ts:104`. **Red at HEAD:** *"fish-oil-cardiovascular name: expected 'Cardiovascular
  support' to be 'Triglyceride lowering'"* (1 failed, 17 passed). **Red on a copy:** both files backed up to the
  scratchpad, the old name restored and regenerated, the same failure. Restored by `cp`, `cmp` silent for both, 18/18.
- **AC-4 fidelity:** `content:generate` → *"wrote 9 modules, 1 changed"*; the JSON diff is one line, `:494`; the GENERATED
  diff is one line, `:379`. `content:generate -- --check` → *"0 stale"*. Grades `{A:4, B:9, C:8, D:6}`, 27 in total.
- **AC-5 glycine (R-1):** line appended at `content/notes.json:7`, verbatim:
  *"[2026-09-27, Phase 4 U6, owner ruling R-1] RECORDED UNDECIDABLE without sourcing: neither the note's 3 g
  (content/notes.json, this entry's note) nor glycine generalDose 3-5 g (content/seed/seed-supplements.json:214-218) is
  supported by any verified abstract in this library; the only glycine paper, p-glycine-sleep, is title-only (R6). No
  dose figure changed. Carried with FU-62's sourcing half: docs/roadmap.md:647 (backlog deferred from Phase 4; the plan's U7, OUT by
  D-3)."* `git diff content/seed/seed-supplements.json` is empty. `p-glycine-sleep` is title-only
  (`seed-papers.json:111-120`: every card field reads *"Not reported in abstract"*). *Observation:* `glycine-sleep`'s
  `studiedDose` is also 3–3 g (`seed-effects.json:804`), equally unsourced and unchanged.
- **AC-6 persisted labels:** exactly **one** persisted column stores an effect **name**:
  `advisor_messages.citations[].label` (`jsonb`, `supabase/migrations/0003_advisor.sql:21`; written at
  `src/lib/advisor/repo.ts:182-188`). Its label is composed as `"<supplement> → <effect name>, Grade <g>"` at
  `src/lib/advisor/tools.ts:122`, `:178` and `src/lib/advisor/actions/proposals.ts:57`, and exported unchanged
  (`src/lib/db/export-repo.ts:141`, `:155`). **Not name-bearing:** `advisor_actions.payload` stores `proposal.payload`
  only (`src/services/advisor-actions.ts:242`), without `rationaleCitations`. Stack items write the protocol rationale
  from supplement name, goal and grade (`src/lib/protocol-builder/index.ts:110`). The protocol-proposal citation labels
  the outcome category, not the effect name (`proposals.ts:252`). **For U9 (D-16 (b)):** every stored message citing this
  effect now forms an as-shown/current pair: *"… → Cardiovascular support, Grade A"* against *"Triglyceride lowering"*.
  **Structured fields only.** The advisor passes effect names to the model (`tools.ts:72`), so stored assistant free text
  in `advisor_messages.content` may also carry the old name (reviewer's note; registered in N-93).
- **AC-7:** `npx vitest run src/architecture` → 30 files, 470 tests passed. `npx vitest run --project jsdom` → 24 files,
  130 tests passed. That covers every RULE8 member's sibling test, run because a rendered name changed.

## 5. Registered

- **FU-75** *(U6 R-2)*: the `index.ts` ↔ `gate.ts` import cycle (`index.ts:10`, `gate.ts:18`) → U20.
- **N-92** `:133-159` → U20 (U6 R-2). U20 was retitled and widened. Row text in the plan §4.
- **N-93** *(reviewer)*: the fish-oil description still says *"studied for cardiovascular … support"*
  (`seed-supplements.json:129`), and `project-status.md:147` still lists FU-68 as open. Advisor free text may also carry
  the old name. **Owner, 2026-09-27:** (1) goes to U6 landing (b). (2) is corrected here, at `project-status.md:147`,
  with *May touch* widened for that line only. The free text is accepted as unfixable user data, which U9 mitigates.
- **N-94** *(owner ruling)*: `mechanismTags` and description copy are not bound to a cited captured abstract. The first
  instance is *"anti-inflammatory"* (`seed-effects.json:507`). Assigned to U6 landing (b): a deterministic sweep, an owner
  batch, and no content change until the owner rules.
- The path overlap in P-d is **settled by the owner**: the specific allowance governs.

## 6. Check

- **AC-8 independent review** (fresh subagent on a detached temp worktree carrying the diff, R-3): **PASS WITH NOTES,
  no BLOCKING.** On the key question it found no over-claim. Both abstracts measure triglycerides, "lowering" is a
  biomarker change rather than a disease claim, and the same wording is already in the library
  (`seed-biomarker-relevance.json:90`). It re-checked the hashes, found a one-field structural diff over all 27 effects,
  confirmed the AC-2 rationales verbatim, parsed the register row shape, and found 20+ citations accurate. vitest was not
  run (no `node_modules` in the copy). Notes acted on: the backlog wording in `notes.json`, U6's R-labels
  disambiguated, the U6 row's *May touch* recorded, the §2 wording corrected, the AC-6 free-text caveat, N-93. After the
  review, all six changed files were checksummed against their pre-review hashes: all OK. The worktree was removed and
  pruned.
- **AC-9 G** on the staged tree in a clean worktree: recorded at §7.
- **Stop, per the landing:** the name (§3), the AC-2 table (§3) and the `notes.json` line (§4) were shown verbatim,
  with those three files unstaged. **The owner approved them exactly as shown, 2026-09-27** (verbatim in the plan §6).
  Only then were they staged.

## 7. Report

**Landing (a) DONE, 2026-09-27.** FU-68 is closed. `fish-oil-cardiovascular` is now *"Triglyceride lowering"*, and its
id, grade A and profile are unchanged. FU-62's dose half is closed as recorded undecidable, carried with sourcing.
FU-75, N-93 and N-94 are registered. N-92 and FU-75 go to U20, and N-93 and N-94 to U6 landing (b).
**Staged set:** exactly the brief's *May touch*, plus `docs/project-status.md:147` (widened by the owner). 7 files.

**AC-4, re-run on the staged tree:** `content:generate --check` 0 stale. Grades A 4 · B 9 · C 8 · D 6.
CONTENT_FIDELITY and G4b green. The `seed-supplements.json` diff is empty.

**AC-9 G**, run in a detached worktree at `d2fc199` with the index diff applied. Its hash was identical to the repo's
`git diff --cached`. `node_modules` was cloned copy-on-write, not installed.

| Step | Result |
|---|---|
| `npx tsc --noEmit` | rc 0 |
| `npm run lint` | rc 0: 419 of 419 tracked files, 0 errors |
| `npx vitest run` | 145 files, 1736 tests passed |
| `npm run test:coverage` | rc 0, thresholds hold; all files 79.4 · 83.99 · 75.82 · 79.4. No floor edited (`vitest.config.ts` not in the diff) |
| `content:generate -- --check` | 0 stale |
| `npx next build` | rc 0 |
| `npm run verify:bundle` | OK: `/stack-lab` +1 B, `/stack-lab/[stackId]` +3 B, all routes within 1% |
| `npm run verify:rendering` | OK: no prerendered page HTML |

This section was written after G ran. The only change it adds is to this file, which G re-checked with
`vitest run src/architecture` on the final staged tree. Commit and CI run id: see the bkit record and the owner report.
**Deferred:** U6 landing (b) (N-93 (1), N-94); FU-62 sourcing (roadmap backlog, `:647`).
