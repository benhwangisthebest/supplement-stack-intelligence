# Phase 3 Plan — Independent Review

> **Date:** 2026-09-22 · **Subject:** `docs/01-plan/phase-3-evidence-grounding.plan.md` (336 lines, status **DRAFT — AWAITING OWNER APPROVAL**) · **Anchor:** `0df218e`, verified by `git rev-parse --short HEAD`.
> **Scope:** read-only. No source file, guard, migration or plan document was created or modified; the reviewer wrote nothing and the plan is unchanged.
> **Decisions D-1 … D-6 are UNRULED and this review does not rule them.** Where a finding can only be resolved by a ruling, it says so and states what each plausible ruling would imply.

## Reviewer and method

| | |
|---|---|
| **Reviewer** | One independent agent that did not author the plan, given the plan, `docs/roadmap.md`, `CLAUDE.md` and the repository at `0df218e` — and nothing else. Explicitly denied the author's cycle artifact and the authoring session's record. |
| **Read** | The plan in full; `docs/roadmap.md` §Phase 3 (L492–556) and §Phase 4 item 0; root `CLAUDE.md`; `docs/reviews/phase-0-plan-review.md` (house style); the Phase 2 report §9–§11; the Phase 2 register rows the plan cites. |
| **Source read against** | `src/data/{seed-effects,seed-papers,id-manifest.json,seed-integrity.test.ts,id-stability.test.ts}`, `src/types/{paper,effect,evidence-grading}.ts`, `src/lib/validation/seed.ts`, `src/lib/{evidence,biomarkers,safety}/index.ts`, `src/architecture/{boundaries,criteria-parity}.test.ts`, `vitest.config.ts`, `scripts/`. |
| **Commands** | `git rev-parse`, `git ls-files` (several scopes), two `npx tsx --tsconfig tsconfig.json` scratch scripts over `@/data/seed-effects` and `@/data/seed-papers` (all §2 seed figures; one calling `deriveGrade`), `npx vitest run`, `npm run lint`, `node -e` over `id-manifest.json`, `comm` over extracted id sets, plus `sed`/`grep`. Scratch scripts live only in the session scratchpad. |
| **Spend** | **None.** No network, no deployed database, no DOI/PMID resolver. |

### Disclosures

1. **A first reviewer stalled and produced nothing.** Re-spawned with operational guardrails (per-command timeouts, no `next build`, no bare `vitest`); this review is the second attempt's output. Recorded rather than silently retried, following Phase 0's precedent for reviewer failure.
2. **One incidental independence leak.** A `grep -rn "P3-X" docs/` run for **P-08** printed three lines of the excluded cycle artifact. The reviewer reports disregarding their content; P-08 rests entirely on `docs/roadmap.md` and `src/architecture/criteria-parity.test.ts`, both independently checkable.
3. **Three figures the reviewer could not verify, since confirmed by the clerk.** §2's bundle rows — `/library` 1.18 kB / 110 kB, `/library/[slug]` 1.62 kB / 111 kB, shared 105 kB. Their stated command is `npx next build`, excluded by the review's time budget, and no other document records them, so the reviewer recorded them as UNVERIFIED. The clerk then ran that build as gate 4 of this landing and **all three reproduce exactly**. The values are correct; **P-17 still stands**, because its finding is that a figure load-bearing for D-5 has no cheap check and no checked-in record — which the build confirms rather than removes.
4. **Clerk's verification.** The findings are the reviewer's; before recording them the clerk re-ran the load-bearing checks directly, per `CLAUDE.md` §5 rule 11 — a subagent's report is data *about* the tree, not the tree. Confirmed at `0df218e`: P-01's D-3 option (a) text; P-03's N-71 cell (Phase 2 plan `:275`, `:6716` — *"N-71 is MITIGATED by U34, not closed"*) and both unnumbered residues in report L223–367; P-05 (`grep -in mutation` → 2 hits, L70/L333, neither a unit obligation); P-08 (`grep -c "P3-X" docs/roadmap.md` → **0**); P-09 ii (`grep -cin placeholder` → **0**); P-13 (`grep -c "tsc --noEmit"` → **0**; `approval` → 1 hit, the status banner); P-16 (`getBiomarker` → one hit, the definition at `src/lib/biomarkers/index.ts:151`, **zero call sites**).

---

## Findings

Severity is the reviewer's scale: **CRITICAL / MAJOR / MINOR / OBSERVATION**. Nothing is "blocking" in Phase 0's sense because nothing is yet authorised — these block *approval*, not execution.

### P-01 · CRITICAL · D-3's option (a) would cross a rank-1 rule, and is not labelled as one
- **Location:** plan §6, L242–244 · **Bears on: D-3**
- **Defect:** Option (a) *"Format-only"* admits any string matching `10\.\d{4,}/\S+`. Ruling it would permit an invented-but-well-formed DOI into seed content — `CLAUDE.md` §2.2 rule 8 verbatim. That is **rank 1**, and §6 allows past it only by "an explicit, acknowledged decision by the user … it must be recorded". The plan never says so, so the owner can rule (a) in one word and the exception is never recorded as one.
- **Evidence:** L242–244 describes the consequence honestly — *"verifies nothing — a well-formed DOI can be invented, which is the v13 failure with a regex in front of it"* — and stops. "rank", "rule 8" and "exception" appear nowhere in §6. The plan's own §1 L26 calls relaxing this control "the most dangerous act in this phase".
- **Action:** Annotate each D-3 option with its admissibility under §6 — whether ruling it needs a recorded rank-1 exception, and where that record goes. **Remove no option; the annotation is the fix.**
- **Rulings:** (a) would need a recorded rank-1 exception; (b)/(c)/(d) would not, differing only in strength and cost.

### P-02 · MAJOR · The roadmap's ID-change migration requirement reaches no unit, and the liveness test names the wrong table
- **Location:** plan §4 L121–122, U6 L172–178, §5 L203–205 · **Bears on: D-6**
- **Defect:** (i) *"Any ID change requires a tombstone plus a data migration for existing `stack_items`"* (roadmap L537–538) maps to no unit and no criterion; §5's mapping covers Included-work items 1–5 only. (ii) The plan's live/deterministic test names only *"a `stack_items` data migration"* — but paper and effect ids do not persist there, they persist in `advisor_messages.citations[].refId`. So if U6 forces a paper to be dropped, the plan's own typing test will not classify the resulting work as live.
- **Evidence:** `id-manifest.json` → `papers.persistedAt = ["advisor_messages.citations[].refId where kind='paper' (0003, jsonb)"]`, same shape for effects; only `supplements` lists `stack_items`. The manifest's `remove` policy requires a tombstone with a migration note. `CLAUDE.md` §2.4 rule 16 names paper ids in the append-only contract. The plan cites roadmap L536–538 at L127 — it read the sentence it did not map. `grep -in tombstone` → one hit, L81, in the §2 prerequisite check only.
- **Action:** Assign the ID-change requirement to a named unit or exclude it with a reason; restate §4's live test over *any* persisted-id surface the manifest lists; state what U6 does with an unverifiable citation.
- **Rulings:** Under **either** D-6 scope the tombstone path is reachable, because an existing paper may prove unverifiable. The wider scope additionally adds manifest edits.

### P-03 · MAJOR · §7's completeness claim is false in two ways — including the exact way the source document names as a past defect
- **Location:** plan §7, L306 and L311–312
- **Defect:** §7 asserts **"No item from the source set is omitted."** (i) It places **N-71** in a row reading *"each is CLOSED in the register"*; the register says **MITIGATED BY U34 AT THE API, NOT CLOSED AT THE PRODUCT**. (ii) The source set contains **two unnumbered residues** that §7 never dispositions, because its extraction keys on `FU-/N-/OP-` ids. N-79's row reads "closed" where its register cell reads *"DISCLOSED AT (d4); the shared fix is FU-47"*.
- **Evidence:** Phase 2 plan `:275` and `:6716`, and report L325 — *"N-71 is MITIGATED by U34, not closed"*. Report L299–300 — `| *(unnumbered)* | replaceFlags transactional residue …` and `| *(unnumbered)* | **Live E2E — BLOCKED(env)** |`, both inside L223–367. Report L269–270 records that the (d3) certifier rejected an earlier follow-up set **precisely because it omitted both unnumbered residues** — so the plan reproduces the omission its own source names as a recurring defect. A `comm` over extracted ids confirms the *id* claim holds: 39 in, 39 out, plus N-80.
- **Action:** Disposition the two unnumbered residues; correct N-71's row to MITIGATED-not-closed; soften N-79's; restate the closing sentence as a claim about the **id** set, with the **item** set stated separately.

### P-04 · MAJOR · U4 is typed and sized as authoring nothing, and authors 190 new content elements on the trust surface
- **Location:** plan §4 U4, L159–164 · **Bears on: D-6**
- **Defect:** U4 is *deterministic*, *"editorial work … authors no new claim"*. It in fact authors **95 rationale strings and 95 `paperIds` lists** (19 effects × 5 `DimensionScore`) on the Library — what `CLAUDE.md` §1 calls the trust layer. The plan never states who authors them, against what source, or what stops them being written from model recall. Nothing sweeps seed text for the safety vocabulary, and no criterion covers the rationales. Secondary: **U4 precedes U6 with no stated dependency**, so U6 can invalidate U4's citations.
- **Evidence:** `src/types/evidence-grading.ts:27-36` — `DimensionScore { score; rationale: string; paperIds: string[] }` over 5 dimensions; 19 effects lack a profile. `grep -rn "containsBannedPhrase\|BANNED_PHRASES" src/ --include=*.ts` outside `src/lib/safety/` → only an advisor test; **no seed-content sweep exists**. `CLAUDE.md` §2.1 rule 6 and §2.2 rule 7 both bear on a rendered `rationale`. The corpus holds **20 papers and 24 effect-level citations** (mean 0.89), and 9 of 40 existing dimensions already cite nothing — so many of the 95 new lists have no paper available to cite.
- **Action:** State U4's sourcing rule and authorship; say what an honestly-empty `paperIds` looks like and that it is acceptable; add a safety-vocabulary check over seed rationales or record why one is excluded; state the U4↔U6 ordering.

### P-05 · MAJOR · "Mutation-check each guard" is a roadmap requirement and binds only two of the plan's units
- **Location:** plan §4 and §5
- **Defect:** U1's byte-identity harness, U7's coverage-honesty test and U8's bundle assertion carry no red-first obligation, and no `[P3-Xn]` binds mutation-checking. `CLAUDE.md` §5 rule 2 is rank 3: *"A test that has not been shown to go red against the bug it targets is not a guard."*
- **Evidence:** `grep -in mutation` → exactly two hits, L70 and L333 — the same §2 note restated, neither a unit obligation. U1 L145 says *"the guard is the deliverable"* with no red-proof requirement.
- **Action:** Add a red-evidence obligation to every unit shipping a guard and bind it as a criterion or a per-unit gate. Phase 1's report carries a full red-evidence record as an exit criterion — that is the precedent.

### P-06 · MAJOR · The `paperIds`-resolution guard is argued for and then assigned to nobody
- **Location:** plan §2(a) L68–71, §4
- **Defect:** The roadmap Testing requirement *"every `paperIds` entry resolves"* is discussed, concluded *"worth having"*, and mapped to no unit — §5's mapping covers Included work only, so the Testing block's requirements are never traced to owners. This is the "promise-shaped disposition" class (FU-29/30).
- **Evidence:** L68–71 and L333; the unit table L130–139 contains no resolution guard. The underlying figure is independently confirmed: **0** unresolved references at both effect and dimension level — which is exactly why the guard needs an owner and a planted-dangling-id red proof rather than a paragraph.
- **Action:** Give it a unit (U2 or U5 are natural homes) with its red proof, or exclude it with a written reason.

### P-07 · MAJOR · "`src/data/` becomes generated" collides with the ID ledger, and `[P3-X5]` may be unsatisfiable
- **Location:** plan §4 U2 L148–151, §5 `[P3-X5]` L201 · **Bears on: D-2**
- **Defect:** (i) `src/data/` also holds **`id-manifest.json`** — the independent checked-in ID ledger — and the two anti-fabrication guard files. Read literally, U2 makes the ledger generated output, destroying the property `id-stability.test.ts` exists for. (ii) `[P3-X5]` cannot hold for any correction that adds or removes an id, because the manifest's policy requires a hand edit inside `src/`. (iii) U1's scope (9 `SEED_*` modules) and U2's ("`src/data/` becomes generated" — 12 tracked files) do not match.
- **Evidence:** `git ls-files src/data/` → `id-manifest.json`, `id-stability.test.ts`, `medication-aliases.ts`, 9 `seed-*.ts`, `seed-integrity.test.ts`. `id-stability.test.ts:12-15` — *"a test that derives its expectation from the same array it validates cannot detect a rename … an INDEPENDENT, checked-in ledger"*. Roadmap exit criterion 5 is worded identically to `[P3-X5]`, so the collision is inherited, not invented. **Mitigating, verified:** `boundaries.test.ts:147` pins `"src/data": 8` in `LAYER_FLOORS` (10 tracked non-test files today), so a gitignoring variant would go red rather than erode silently.
- **Action:** Scope U2 to the 9 `SEED_*` modules; carve out the manifest and the two guard files; declare whether generated output is committed; restate `[P3-X5]` to exclude manifest edits, or record that the roadmap's wording needs amending.

### P-08 · MAJOR · The stated purpose of the `[P3-Xn]` ids is unreachable — the roadmap carries no ids
- **Location:** plan §5, L194–195
- **Defect:** §5 assigns stable ids "so a future parity guard can pair the two lists the way `CRITERIA_PARITY` pairs Phase 2's". That guard pairs on ids present in **both** documents. The roadmap's Phase 3 criteria carry none, and the plan schedules no roadmap edit.
- **Evidence:** `grep -c "P3-X" docs/roadmap.md` → **0**. `criteria-parity.test.ts:25-26` — *"Ids live in BOTH documents"*; `:34-35` hard-code the Phase 2 plan path and `P2-X1…P2-X9`. The guard's own header records what a Phase 3 without it reproduces: *"`[P2-X6]` … existed ONLY in the roadmap"*.
- **Action:** Either schedule the roadmap-side id insertion inside a named unit, or state plainly that Phase 3 ships without criteria parity and record it as a residue.

### P-09 · MINOR · There is a second fabrication-compelling mechanism, and the placeholder-domain guard is unmentioned
- **Location:** plan §3, U5 L166–170 · **Bears on: D-2, D-3**
- **Defect:** (i) §3 names **G2** as "the control standing in the way" — singular. `paperSchema` in `src/lib/validation/seed.ts` is a second: a **non-strict** `z.object` with no conformance assertion against the `Paper` type, whose own header calls it *"the SECOND mechanism compelling fabrication"* and warns *"TypeScript could not catch this one … keep the two in step by hand."* Adding `doi` leaves it unvalidated. (ii) The roadmap requires retaining the **no-placeholder-domains** guard (G1); it appears nowhere in the plan, and G1 walks only `src/` for `.ts|.tsx`, so content authored as `content/*.yaml` falls outside it.
- **Evidence:** `src/lib/validation/seed.ts:50-66`; `grep -rn paperSchema src/` → the definition and one `safeParse`, no conformance test. `seed-integrity.test.ts:14` — `SRC_ROOT = path.resolve(__dirname, "..")`; `:33` — `/\.(ts|tsx)$/`. `grep -cin placeholder` on the plan → **0**. N-80's evidence list (L108) cites only `seed-integrity.test.ts` and `paper.ts`.
- **Action:** Widen N-80's scope statement and U5's deliverable to `paperSchema` plus a conformance assertion (§4 rule 2's pattern); state how G1's coverage follows the content wherever D-2 puts it.

### P-10 · MINOR · §2's own promise — "the command printed beside it" — does not hold for about half its rows
- **Location:** plan §2, L12 and L41–64
- **Defect:** Roughly ten of twenty rows print a description, an arithmetic expression or the answer rather than a command, and one prints **no command at all**: `| Client components importing @/lib or @/data | 8 of 31 | §4 rule 7, unenforced — matches CLAUDE.md:169 |` (L58) — a cross-reference to another document, in the table whose header says no number is carried from another document. Related: §7's FU-32 row (L296) claims the plan is *"bound by it now: every §2 figure carries its command."* Carrying a command makes a figure re-derivable, not bound — nothing fails when a §2 figure rots.
- **Evidence:** Rows L46, L47, L48, L49, L50, L52, L53, L54, L57 print no runnable command; L58 prints none at all. **Every value nonetheless reproduces** — see *What survived scrutiny*.
- **Action:** Print a runnable command per row (one scratch-script name plus the expression suffices), give L58 one, and downgrade the FU-32 claim from "bound" to "re-derivable".

### P-11 · MINOR · `[P3-X2]` is not falsifiable until two decisions are ruled, and does not say so
- **Location:** plan §5 `[P3-X2]`, L198 · **Bears on: D-3, D-6**
- **Defect:** *"100% of citations carry a verified DOI/PMID"* — **"verified"** has no meaning until D-3 and **"100% of citations"** no denominator until D-6. Under D-3(a) it is satisfied by a regex over invented strings; under D-6's narrow scope, over a corpus the plan itself calls uncomfortably thin.
- **Evidence:** L238–253 and L271–276, the latter stating the discomfort outright: *"'100% of citations are verified' is trivially true of a corpus with few citations, and a mean of 0.89 papers per effect is the number that makes that uncomfortable."* Mean 0.89 independently confirmed (24 refs / 27 effects). The plan diagnoses this in §6 and does not carry the diagnosis into §5.
- **Action:** State in `[P3-X2]` that its meaning is fixed by D-3 and its denominator by D-6, and that it is not checkable until both are ruled. Pre-fill neither.

### P-12 · MINOR · `[P3-X5]` names no verification method
- **Location:** plan §5 `[P3-X5]`, L201
- **Defect:** *"A content correction can be reviewed and shipped without hand-editing `src/`"* can be declared met by assertion. It is the only criterion in §5 with no mechanical check — X1 has a count plus a build failure, X3 has byte-identity. `CLAUDE.md` §3 principle 5 and §5 rule 1 both bear.
- **Evidence:** L201; U2 (L148–151) describes the migration but names no demonstration or test.
- **Action:** Name the artifact that settles it — a recorded end-to-end correction with its diff, or a test asserting that changing the authored file alone changes an emitted constant. See also P-07 (ii), which may make X5 unsatisfiable as worded.

### P-13 · MINOR · The plan carries no verification gate and no approval discipline
- **Location:** whole document
- **Defect:** No unit states the `CLAUDE.md` §5 rule 10 list, `npx tsc --noEmit` appears nowhere, and §10 rule 5 (approval required each time for commit / push / merge / tag / branch deletion) is unmentioned. The Phase 2 plan carries per-unit `**Gate:**` lines; Phase 0 carries named approval gates.
- **Evidence:** `grep -c "tsc --noEmit"` → **0**; `grep -in approval` → 1 hit, the status banner. Phase 2 plan `:3491` — `**Gate:** npx tsc --noEmit · npm run lint · npx vitest run (count re-measured) · npx next build.`
- **Action:** Add the §5 rule 10 gate per unit and a one-line statement of §10 rule 5, matching Phase 2's shape.

### P-14 · MINOR · U4 permits changing a grade without saying that a grade is a live input to five engines
- **Location:** plan §4 U3/U4, L153–164
- **Defect:** A grade change is a behaviour change in stack evaluation, protocol generation and identity output — not a Library display change. The plan treats it as an editorial outcome.
- **Evidence:** `grep -rn "\.grade" src/lib --include=*.ts` (non-test): `stack-evaluator/rules.ts:93-94,122` (flag suppression, evidence level), `protocol-builder/index.ts:93-110` and `rules.ts:131` (tiering, ordering), `identity/{traits.ts:60, supplement-archetypes.ts:35, index.ts:54-56}`, `advisor/tools.ts:73,114,170`, `advisor/actions/proposals.ts:57,247,252`. Persisted `kind='effect-grade'` citations mean an old advisor message's prose can outlive the grade its citation now resolves to.
- **Action:** State the cross-engine consequence in U4, name the engines whose fixtures must be re-derived, and say what happens to already-persisted `effect-grade` citations.

### P-15 · MINOR · D-4 bundles two unrelated questions into one ruling
- **Location:** plan §6 D-4, L258–263 · **Bears on: D-4**
- **Defect:** FU-29 (13 uncast-value `mappers.ts` sites, needing a **deployed** migration) and §4 rule 7 (8 client components, a pure refactor) share no mechanism, cost profile or liveness consequence. One would make the phase live. As written the owner cannot rule them separately.
- **Evidence:** FU-29's register row (Phase 2 plan `:292-299`) confirms the summary — *"casts at **13** sites … a migration adding CHECK constraints to a **deployed** database, so that unit WILL NEED to open its own OP row"*. The 8-of-31 figure independently re-derived; no liveness cost.
- **Action:** Split D-4 into two decisions with independent option sets. This presupposes neither ruling.

### P-16 · OBSERVATION · U8's refactor target has zero call sites
- **Location:** plan §4 U8, L185–188
- **Defect:** U8 refactors `getBiomarker` to take a catalog parameter. Nothing calls it, so the change is unobservable and `CLAUDE.md` §5 rule 3 (reachability) cannot be satisfied for it.
- **Evidence:** `grep -rn getBiomarker` across `*.ts|*.tsx|*.mjs`, excluding `node_modules` and `graphify-out` → **one source hit, the definition at `src/lib/biomarkers/index.ts:151`**. No barrel re-exports it.
- **Action:** Note the zero-call-site fact in U8 so the work is sized honestly, and say what will make the seam observable.

### P-17 · OBSERVATION · The three bundle figures are load-bearing for D-5 and cannot be cheaply checked
- **Location:** plan §2, L62–64 · **Bears on: D-5**
- **Defect:** They are the only §2 figures the reviewer could not reproduce, their stated command is a multi-minute build, and D-5 sets a budget against exactly these numbers. **The values are correct** — the clerk's gate-4 build reproduced all three — but correctness is not the finding; the absence of any cheaper check is.
- **Evidence:** `grep -rn "First Load\|105 kB\|110 kB\|111 kB" docs/ --include=*.md` outside the plan → **no other record in the repository**, so there is no cross-check short of a full build. Clerk's `npx next build` at this tree: `/library` 1.18 kB / 110 kB · `/library/[slug]` 1.62 kB / 111 kB (● SSG, 15 paths) · shared 105 kB — matching §2 exactly.
- **Action:** Record the build's route table verbatim, or a checked-in snapshot, beside the figures.

---

## Summary

| Severity | Count | Items |
|---|---|---|
| **CRITICAL** | 1 | P-01 |
| **MAJOR** | 7 | P-02, P-03, P-04, P-05, P-06, P-07, P-08 |
| **MINOR** | 7 | P-09, P-10, P-11, P-12, P-13, P-14, P-15 |
| **OBSERVATION** | 2 | P-16, P-17 |

**Every item is fixable by stating something the plan leaves implicit** — an obligation, an owner, an admissibility constraint, a scope carve-out. None requires a decision to be ruled first, and none requires the plan to be redesigned.

**Two findings are new facts about the repository, not about the plan:** `paperSchema` as a second fabrication-compelling mechanism with no conformance assertion (**P-09 i**), and G1's `src/`-only, `.ts|.tsx`-only walk (**P-09 ii**). Next free register ids, re-derived by command against the Phase 2 register (`N-1…N-79 · FU-1…FU-47 · OP-1…OP-7`, plus the draft's proposed N-80): **N-81 · FU-48 · OP-8**. **None is allocated here** — the Phase 2 register is closed and the Phase 3 plan is a draft, so both belong beside N-80 in the revision, at the owner's direction.

## What survived scrutiny

Checked by command and found **true**:

- **Every seed figure in §2 reproduces exactly:** 27 effects · 8 with `evidenceProfile` · 19 without · 8 Grade A · 4 Grade A without a profile (the exact four named) · A 8 / B 9 / C 10 · 3 effects citing zero papers (the exact three named) · mean 0.8889 · 20 papers · 0 uncited · **0 unresolved references** at both effect and dimension level · 40 dimensions, 9 citing none · 15 supplements · `Paper` carries exactly the nine non-provenance keys listed.
- **Verification figures reproduce:** 1446 tests / 114 files passing · lint 369 of 369, 0 errors · 27 architecture specs.
- **`8 of 31` is right** and matches `CLAUDE.md:169`, `profile/LabMarkerModal.tsx` included.
- **N-80 is a real finding and its evidence holds.** `FORBIDDEN_PAPER_KEYS` lists exactly six names, neither `doi` nor `pmid`; adding `doi` today reddens nothing. Leaving it **OPEN pending D-3** is the correct disposition, and the reasoning for not pre-empting the decision is sound.
- **§7's id set is complete** — `comm` over the extracted sets: 39 in, 39 out, zero missing, plus N-80. The item-level claim is P-03; the id-level claim holds.
- **The `[P2-X6]` prerequisite check is real, not asserted** — manifest v2, all ten namespaces at the stated counts, six-verb policy with tombstones and `supersededBy`.
- **D-1's technical claims hold** — `vitest.config.ts` is `environment: "node"`, `include: ["src/**/*.test.ts"]`; `HARNESS_GAP` exists at `boundaries.test.ts:607`.
- **All five `[P3-Xn]` are word-for-word the roadmap's** (L550–554), so the two lists do not diverge in substance today.
- **§9's withdrawal is correct and creditable** — withdrawing *"G2 blocks reintroducing provenance"*, a claim the plan's own framing leaned on, is the behaviour `CLAUDE.md` §5 rule 1 asks for.
- **U1→U2 and U5→U6 are correctly argued**, and U3-before-U4 — *the guard must be red against the 19 before they are written* — is §5 rule 2 applied well.
- **A check the plan did not make, and it is favourable:** all 8 profiled effects' authored letters **agree** with `deriveGrade(profile)`, 0 mismatches; `src/lib/evidence/index.ts:27-30` silently prefers the derived grade on disagreement and is the only non-test importer of raw `SEED_EFFECTS`. U3's guard would be green on the 8 from day one and red only on the 19 — exactly what U3 predicts.

## Verdict

**REVISE.**

The plan is unusually strong as an orientation document: its baseline is honest and fully reproducible, its two rereadings of the table — that the `paperIds`-resolution requirement is already satisfied, and that provenance is an absent *field* rather than a data gap — reframe the phase correctly, N-80 is a genuine find, and §9 withdraws the plan's own central claim rather than defending it. It is not yet executable. One decision option would cross a rank-1 rule with nothing saying so (P-01); three roadmap obligations — the ID-change migration, the resolution guard, and *mutation-check each guard* — reach no unit and no criterion (P-02, P-05, P-06); §7's integrity claim, which is that section's entire value, is false in two ways the source document itself names as a recurring defect (P-03); the largest editorial unit is typed as authoring nothing while authoring 190 content elements on the trust surface with no stated sourcing rule (P-04); and two criteria are not falsifiable as written (P-11, P-12). That is a revision, not a redesign.

## Decision index

The owner rules D-1 … D-6. These are the items that bear on each; **no ruling is recommended.**

| Decision | Items | What each plausible ruling would imply |
|---|---|---|
| **D-1** — `[P3-X4]`'s harness | **none** | Unconstrained by any finding. The trade-off as stated is accurate and its facts check out. |
| **D-2** — authored format, codegen siting | **P-07, P-09** | A root `content/` package puts the corpus outside `src/`, easing `[P3-X5]` (P-07 ii) but taking the authored text outside G1's `src/`-only walk (P-09 ii). Codegen under `scripts/` emitting into `src/data/` does the reverse. Either way P-07 (i) and (iii) — the manifest carve-out, the U1/U2 scope mismatch — must be fixed. |
| **D-3** — what "recorded as verified" means | **P-01, P-09, P-11** | (a) would need a **recorded rank-1 exception** and leaves `[P3-X2]` satisfiable by a regex over invented strings. (b)/(c)/(d) do not cross rank 1 and give `[P3-X2]` a falsifiable meaning, differing in strength, offline-ness and CI fragility. Whichever is ruled, N-80's fix and `paperSchema`'s change follow from it. |
| **D-4** — FU-29 and §4 rule 7 | **P-15** | FU-29 *in* makes the phase live and opens an OP row plus 13 value-domain decisions; *out* defers it again. §4 rule 7 is a refactor of 8 components with no liveness cost. P-15 asks only that they be ruled separately. |
| **D-5** — the bundle budget | **P-17** | An absolute ceiling needs the three unverified figures to be correct; percentage-headroom and per-commit-delta need the baseline reproducible. All three rulings are weakened by the same missing artifact. |
| **D-6** — corpus scope for U6 | **P-02, P-04, P-11** | The narrow scope keeps U6 cheap but leaves `[P3-X2]` true over a 0.89-per-effect corpus and U4's 95 new citations drawing on it. The wider scope raises cost, adds manifest edits, and changes U4's feasibility and its ordering against U6. Under **either**, the tombstone path is reachable — so P-02 must be answered regardless. |
