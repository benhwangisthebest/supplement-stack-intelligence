# Phase 3 — Evidence grounding (the trust layer)

> **STATUS: DRAFT — AWAITING OWNER APPROVAL.**
> **A Draft outranks nothing** (`CLAUDE.md` §6: rank 5 is *an approved* plan). **Nothing in this document
> authorises work.** No unit below may start, and no guard below may be written or relaxed, until this file
> carries an APPROVED status line.
>
> **Base SHA: `c4460c7`** · **Authored: 2026-09-22** · Sequenced by `docs/roadmap.md` §Phase 3 (L492–556).
> Cycle artifact: `docs/01-plan/features/phase3-plan.plan.md` (bkit `phase3-plan`), which mirrors this
> document and never replaces it.
>
> **Every figure in §2 was re-derived at `c4460c7` by the command printed beside it.** No number in this
> plan is carried from the roadmap, the Phase 2 report, or `project-status.md`. Where a source document's
> figure was checked and held, that is said; where nothing could be checked, the row reads **UNVERIFIED**
> with the reading that would settle it.

---

## 1. Objective, and the one sentence that constrains it

**Make the Library's central claim true.** Today **19 of 27** effect grades are hand-typed letters with no
derivation, and the `Paper` type carries **no provenance at all** — by construction, not by omission.

**The constraint that shapes every unit below:** v13 removed provenance because a *required* `link: string`
with no real source left fabrication as the only way to satisfy the type (`CLAUDE.md` §8 rule 4). Phase 3
brings provenance back. **It therefore has to relax the exact control that removed it**, and that is the
most dangerous act in this phase. §3 is about nothing else.

**What this plan is not.** It is not a content plan — no unit below decides what any grade should be. It
builds the apparatus that makes a grade *derivable* and a citation *checkable*, and it says who does the
deciding. It performs no DOI or PMID lookup: **this plan decides how citations get verified; it verifies
none** (spend rule, §8).

---

## 2. Baseline, re-derived at `c4460c7`

Run with `npx tsx --tsconfig tsconfig.json <script>`; the scripts read the real modules rather than
grepping them, because a nested key can be counted twice by a grep and was.

| Figure | Value | Command |
|---|---|---|
| Effects total | **27** | `SEED_EFFECTS.length` |
| …with `evidenceProfile` | **8** | `SEED_EFFECTS.filter(e => e.evidenceProfile).length` |
| …hand-typed grade, no profile | **19** | the complement — *roadmap's 19/27 **holds*** |
| Grade A total | **8** | `filter(e => e.grade === "A")` |
| …Grade A **without** a profile | **4** | `zinc-deficiency`, `vitamin-b12-deficiency`, `caffeine-training`, `protein-powder-training` — *roadmap's "four of them Grade A" **holds*** |
| Grade distribution | **A 8 · B 9 · C 10** | reduce over `e.grade` |
| Effects citing **zero** papers | **3** | `magnesium-metabolic`, `creatine-recovery`, `fish-oil-longevity` |
| Mean `paperIds` per effect | **0.89** | sum / 27 |
| Papers total | **20** | `SEED_PAPERS.length` |
| Papers cited by no effect | **0** | set difference |
| **Unresolved `paperIds`** | **0** | every reference resolves **today** — see the note below |
| Profile dimensions total | **40** | 8 profiles × 5 dimensions |
| …dimensions citing **no** paper | **9** | `d.paperIds.length === 0` |
| Supplements covered | **15** | `new Set(e.supplementId).size` |
| **`Paper` provenance keys** | **ZERO** | keys are `id, title, population, intervention, dose, duration, outcomes, limitations, summary` |
| Client components importing `@/lib` or `@/data` | **8 of 31** | §4 rule 7, unenforced — matches `CLAUDE.md:169` as corrected at Phase 2 (d2) |
| Unit tests | **1446 / 114 files** | `npx vitest run` |
| Lint scope | **369 of 369, 0 errors** | `npm run lint` |
| Architecture specs | **27** | `git ls-files 'src/architecture/*.test.ts' \| wc -l` (bound by `SPEC_COUNT`) |
| Bundle — `/library` | **1.18 kB · 110 kB First Load** | `npx next build` |
| Bundle — `/library/[slug]` | **1.62 kB · 111 kB First Load** (`●` SSG) | `npx next build` |
| Bundle — shared by all | **105 kB** | `npx next build` |

**Two readings of this table matter more than the numbers.**

**(a) The roadmap's Testing requirement *"every `paperIds` entry resolves"* is already satisfied — 0
unresolved.** A guard written for it lands green and proves nothing about the future unless it is
mutation-checked against a planted dangling id (§5 rule 2). It is worth having; it is not worth counting as
progress.

**(b) "100% of citations carry a verified DOI/PMID" is not a gap to close — it is a field that does not
exist.** There are no DOIs to verify. The work is to *introduce* the field, the verification, and the
record, together and in that order. Any framing of item 1 as "fill in the missing DOIs" mis-sizes it.

**Prerequisite checked, not assumed.** `src/data/id-manifest.json` is version **2** and its namespaces
cover `effects` (27), `papers` (20), `supplements` (15), `products` (21), `biomarkers` (13),
`biomarkerRelevanceRules` (15), `interactionRules` (30), `sideEffectLabels` (18), `outcomeCategories` (11)
and `supplementSlugs` (15), with an `add / remove / rename / merge / split / resurrect` policy requiring a
tombstone and `supersededBy`. **`[P2-X6]` covers content IDs. The roadmap's prerequisite holds.**

---

## 3. The central tension, and a new finding

**Roadmap item 1:** *"Provenance returns to the `Paper` type **only** alongside a verification mechanism."*

The control standing in the way is `src/data/seed-integrity.test.ts` **G2 — "fabricated provenance is
unauthorable"**, which asserts no seed paper carries any key in
`FORBIDDEN_PAPER_KEYS = ["authors", "journal", "year", "link", "sampleSize", "studyType"]`.

Phase 3 must change G2 from ***no provenance field*** to ***no provenance field without a verification
record***. That is a strictly weaker guard, and weakening a rank-1-adjacent control is the act this project
has most reason to distrust. It is **D-3**, and it is not decided here.

> ### N-80 — G2 does not forbid the two fields Phase 3 intends to add
>
> **[2026-09-22] Found while source-verifying this plan; re-derived from the register — N-79 and FU-47 are
> the highest live numbers, so this is N-80.**
>
> `FORBIDDEN_PAPER_KEYS` lists the six fields v13 deleted. **It does not list `doi` or `pmid`.** Adding
> either to `Paper` today reddens nothing: `tsc` accepts a new optional field, and G2 inspects only those
> six names. **So the guard that exists to make provenance unauthorable does not cover the two fields the
> next phase will reintroduce** — the gap is in the guard's *enumeration*, which is the ratchet-vs-derived
> distinction `PAID_API_BUDGET` was rebuilt to avoid.
>
> **Evidence:** `src/data/seed-integrity.test.ts:20-27` (the list) and `:48-57` (the assertion);
> `src/types/paper.ts:11-21` (nine keys, none of them provenance).
>
> **Disposition: OPEN, and deliberately not fixed in this plan.** Closing it *before* D-3 is ruled would
> mean choosing D-3 by implementation — if G2 is widened to forbid `doi`/`pmid` outright, that presumes the
> "keep provenance out" answer; if it is widened to require a verification record, that presumes the
> record's shape. **Owner: U5, once D-3 is ruled.** The row exists so the gap cannot be discovered *after*
> someone has already added a `doi` field and watched the suite stay green.

---

## 4. Units

Typed by the standard test: a unit is **live** if it needs the network, the deployed database, an OpenAI
call, or a `stack_items` data migration; otherwise **deterministic**. Every live unit carries a spend line.

**Ordering is a claim, not a convenience.** U1 and U2 come first because the roadmap requires codegen to be
provably output-identical *before* any content lands on it — *"codegen must emit byte-identical constants
for the current corpus **before** any content changes land on top of it"* (roadmap L536–538). A content
change merged before the identity proof makes the proof unavailable forever, because there is no longer a
pre-migration corpus to compare against.

| Unit | Type | Closes |
|---|---|---|
| **U1** Codegen skeleton + byte-identity harness | deterministic | `[P3-X3]` (half) |
| **U2** Corpus migrated to the authored format | deterministic | `[P3-X3]`, `[P3-X5]` |
| **U3** Grade derives from profile; a typed grade is a build failure | deterministic | `[P3-X1]` (mechanism) |
| **U4** The 19 absent profiles authored | deterministic | `[P3-X1]` (content) |
| **U5** Provenance returns behind a verification record | deterministic | `[P3-X2]` (mechanism), **N-80** |
| **U6** The corpus verified against real DOI/PMID | **live** | `[P3-X2]` (content) |
| **U7** Coverage honesty across the four surfaces | deterministic | `[P3-X4]` — **blocked on D-1** |
| **U8** Injection seam + bundle-size assertion | deterministic | roadmap item 5 |

### U1 — codegen skeleton, and the identity proof *(deterministic)*
Build-time codegen emitting the existing `SEED_*` constants from an authored source, and a check asserting
the emitted TypeScript is **byte-identical** to what is in `src/data/` today. **No content moves in this
unit.** The authored source is generated *from* the current modules, so the round trip is provable.
**The guard is the deliverable**, not the generator: a codegen whose output is merely *equivalent* is what
lets a silent content change ride in on a mechanical migration.

### U2 — the corpus migrates *(deterministic)*
`src/data/` becomes generated. The identity check from U1 moves into CI. **Engines, seams and types are
untouched** (roadmap item 3). **Does not move content into Postgres** — seed-as-code is the right pattern
for read-only reference data; the shortcut is the authoring format, not the architecture.

### U3 — the grade becomes derived *(deterministic)*
`Effect.grade` stops being authorable where a profile exists, and a grade without a profile becomes a build
failure. **Lands before U4 deliberately:** the guard must be red against the 19 before they are written,
which is the only moment its redness can be observed cheaply. Expect U3 to ship with the guard scoped to a
shrink-only allowlist of those 19, and U4 to empty it.

### U4 — the 19 profiles *(deterministic)*
Editorial work against the existing corpus. **This unit authors no new claim** — each of the 19 grades
already exists; U4 records the dimensions that justify it, or **changes the grade** where they do not. That
second case is expected and is the point: a profile that cannot justify its letter is a finding, not a
failure. **The 4 Grade A effects without profiles are the highest-risk rows** and should be sequenced
first.

### U5 — provenance behind a record *(deterministic)*
`Paper` regains a provenance field **only** in the shape D-3 rules, together with the guard that makes an
unverified one red. **Closes N-80.** Red-first requirement: a planted citation with a well-formed but
unverified DOI must fail, and a planted *malformed* DOI must fail differently — one guard cannot be allowed
to pass for both reasons.

### U6 — the corpus verified *(**live** — network)*
Resolving real DOI/PMID for the corpus. **Spend: DOI (`doi.org`) and PubMed E-utilities lookups only. No
OpenAI call, no deployed database, no `stack_items` write.** Volume is bounded by D-6's answer — at
minimum the **20** existing papers. **Build-time and offline at runtime** (roadmap Security requirement):
no lookup may be reachable from a request path.
**Sequencing constraint:** U6 cannot start before U5, because a verification with nowhere to record itself
is a spreadsheet.

### U7 — coverage honesty *(deterministic)* — **BLOCKED ON D-1**
A product-wide treatment of *"we don't know"* versus *"there is nothing"* across effects, interactions,
side effects and food pairings. **Absence must never read as safety** (`CLAUDE.md` §2.2 rule 10).
**This unit cannot be verified as the criterion requires until D-1 is ruled** — see §6.

### U8 — injection seam and bundle budget *(deterministic)*
`getBiomarker` takes a catalog parameter, finishing the seam. A bundle-size assertion makes the client cost
of seed growth visible before it is a problem; the budget itself is **D-5**. Baseline to assert against is
in §2.

---

## 5. Exit criteria

Mirrored from `docs/roadmap.md` L549–555. Stable ids are assigned here so a future parity guard can pair
the two lists the way `CRITERIA_PARITY` pairs Phase 2's.

- [ ] **[P3-X1]** 27/27 effects have an `evidenceProfile`; a grade without one fails the build. *(U3, U4)*
- [ ] **[P3-X2]** 100% of citations carry a verified DOI/PMID; guards fail red on a planted unverified citation. *(U5, U6)*
- [ ] **[P3-X3]** Content source of truth is non-TypeScript; codegen output byte-identical for the pre-migration corpus. *(U1, U2)*
- [ ] **[P3-X4]** Every surface that can show partial coverage states its coverage limit; test-verified. *(U7 — **D-1**)*
- [ ] **[P3-X5]** A content correction can be reviewed and shipped without hand-editing `src/`. *(U2)*

**Roadmap item → unit, with the one exclusion stated.** Item 1 → U5, U6. Item 2 → U3, U4. Item 3 → U1, U2.
Item 4 → U7. Item 5 → U8. **Excluded, as the roadmap excludes them:** live PubMed ingestion, context-adjusted
evidence (Phase 4), commerce, new pillars.

---

## 6. Decisions for the owner — options and trade-offs, none pre-chosen

### D-1 — `[P3-X4]`'s harness: build it here, or re-sequence the criterion
Raised by Phase 2 Check finding **P2-6**. `[P3-X4]` says *test-verified*; `vitest` collects
`src/**/*.test.ts` under `environment: "node"`, so a `.test.tsx` cannot run and `HARNESS_GAP` hard-fails any
tracked one. That is **U-DEFER-4**, whose owner-condition names *"the phase that introduces component
testing"* — which the roadmap places in **Phase 4**.

- **(a) Phase 3 opens by building the harness.** `[P3-X4]` becomes satisfiable. Cost: a jsdom environment,
  a second vitest project, and `HARNESS_GAP`'s retirement — infrastructure work at the front of a content
  phase, and it closes U-DEFER-4 early.
- **(b) Re-sequence `[P3-X4]` to Phase 4.** Phase 3 ships the coverage treatment without the test-verified
  clause. Cost: the phase's own criterion list stops being fully met, and *"absence must never read as
  safety"* ships unguarded — the property §2.2 rule 10 cares about most.
- **(c) Keep `[P3-X4]` here, weaken *test-verified* to a source-level assertion** (every surface importing a
  partial-coverage dataset also imports the disclosure component). Cheaper, and it proves the import rather
  than the render.

**Not decidable from the repository.** It trades phase shape against verification strength.

### D-2 — authored format, and where codegen lives
- **JSON** — no new dependency, `JSON.parse` is total, diffs are noisy, no comments.
- **YAML** — reviewable diffs and comments for editorial rationale, adds a parser dependency and a
  whitespace failure mode.
- Codegen sited in `scripts/` (consistent with `verify-*.mjs`) or in a `content/` package.

The roadmap says *"JSON/YAML"* and does not choose. **Bearing on D-3:** if verification records live beside
the citation in the authored file, comments are worth more than they look.

### D-3 — what *"recorded as verified"* means
The load-bearing decision. **Who** verifies, **what** the record is, **where** it lives, and **what the
guard checks**.

- **(a) Format-only.** A DOI matching `10\.\d{4,}/\S+` and a PMID matching `\d{1,8}` pass. Cheap;
  **verifies nothing** — a well-formed DOI can be invented, which is the v13 failure with a regex in front
  of it.
- **(b) Verified-at-authoring, recorded in the content.** Each citation carries `verifiedOn` and `verifiedBy`
  beside the identifier. The guard checks the record exists and is well-formed. Honest about being a human
  attestation; does not detect a stale or retracted DOI.
- **(c) Verified-at-build, offline against a checked-in fixture.** A build-time resolver checks each DOI
  against a committed response fixture captured when it was verified. Strongest offline guarantee;
  introduces a fixture corpus that itself needs refreshing.
- **(d) Verified in CI against the live resolver.** Strongest, and it puts a network dependency in the
  build — which the roadmap's Security requirement pushes against (*build-time and offline*) and which makes
  CI fail on someone else's outage.

**Whatever is chosen determines G2's replacement and therefore N-80's fix.** Recommend ruling D-3 before
U5 is planned in detail.

### D-4 — FU-29 and §4 rule 7: in or out
- **FU-29** — 13 `mappers.ts` cast sites against columns with no CHECK constraint. Its own row says closing
  it needs a migration against a **deployed** database plus 13 value-domain decisions, and it would open an
  OP row. **In-phase makes Phase 3 partly live.** Out means it waits again.
- **§4 rule 7** — **8 of 31** client components import `@/lib` or `@/data` (one type-only). Phase 3 touches
  the Library UI in U7, so the overlap is real. Enforcing it is a refactor of 8 components, not a guard.

### D-5 — the bundle budget
U8 asserts a ceiling. Baseline: `/library` **110 kB** First Load, `/library/[slug]` **111 kB**, shared
**105 kB**. A budget set at today's figure fails on the first legitimate content addition; one set loosely
never fires. Options: **absolute ceiling**, **percentage headroom over the recorded baseline**, or
**per-route delta per commit**. The third catches growth without needing a number to be right.

### D-6 — corpus scope for U6
Does U6 verify **only the 20 existing papers**, or also close the gaps §2 measured — **3 effects citing no
paper at all** and **9 profile dimensions citing none**? Verification cost scales with the first number;
the credibility of `[P3-X2]` scales with the second. *"100% of citations are verified"* is trivially true
of a corpus with few citations, and a mean of **0.89 papers per effect** is the number that makes that
uncomfortable.

---

## 7. Disposition of everything Phase 2 handed on

Derived from the Phase 2 report §9–§11 (lines 223–367), which names **39** ids. **In-phase** means a unit
above owns it; **deferred** carries a reason.

| Item | Disposition |
|---|---|
| **FU-29** | **D-4** — the owner decides. Live if in. |
| **§4 rule 7** (8 of 31) | **D-4**. U7 touches the Library UI, so the overlap is real. |
| **§4 rule 8** (trust boundaries in testable modules) | **Deferred — no mechanical form exists.** Phase 2's report says so and Phase 3 finds no new one; grounding adds no trust boundary. |
| **U-DEFER-4 / P2-6** | **D-1.** Gates `[P3-X4]`. |
| **OP-5** | **Deferred, owner-held, and kept visible.** Three account facts UNKNOWN; the DPA page returned HTTP 403. **Content grounding does not touch it, which is exactly why it is named here** — a phase boundary is where an open operational item goes quiet. Phase 3 closes nothing on it and must not be read as having. |
| **N-50** | **Phase 4**, as ruled. Named in `docs/roadmap.md` Phase 4 item 0. |
| **N-11, FU-41, FU-43, FU-44** | **Deferred to the next operational phase — one piece of work.** All four want a logging sink that does not exist. Phase 3 is a content phase and building a sink here would be the scope expansion §0 forbids. |
| **FU-45, FU-46, FU-47** | **Deferred to the next operational phase.** Register and artifact instrumentation. **FU-46 has a Phase 3 cost worth stating:** this plan's own `[P3-Xn]` ids exist so a parity guard *can* be written; without one declared row shape, writing it repeats the three wrong parses Phase 2 hit. |
| **FU-30, FU-31** | **Deferred.** Dead `safetyCopy` helpers and their sibling; neither is on a grounding path. |
| **FU-32** | **Deferred as a standing class, not a task.** The counts-written-once class. **This plan is bound by it now:** every §2 figure carries its command for exactly this reason. |
| **FU-33, FU-34** | **Deferred.** `handleParams` and the unrendered `PARTIALLY_APPLIED`; both are advisor-path, not Library. |
| **FU-35, FU-36, FU-37, FU-38** | **Deferred to the next operational phase**, as U31's C-table obligations were accepted. |
| **FU-39** | **Closed at Phase 2 (b) by DROP.** Listed only because the report names it; it is not a residue. |
| **FU-40** | **Deferred.** `RLS_COVERAGE`'s semantic blind spot; CI's catalog check is the control. No Phase 3 migration is planned unless D-4 says otherwise. |
| **FU-42** | **Deferred — and it constrains this plan.** `CRITERIA_PARITY` cannot express `[~]`. If any `[P3-Xn]` finishes PARTIAL, the same trap applies. |
| **N-22, N-25** | **Deferred.** Gateway aliases and PDF transcription on scans; neither is a Library-content path. |
| **N-40** | **Deferred with FU-41** (same cluster, same sink). |
| **N-69** | **Deferred, owner-condition intact.** Security-relevant; the condition is a second writer or a transferable conversation, and Phase 3 creates neither. |
| **N-70** | **Deferred, gate intact.** Any proposal to make conversations transferable must cite it. Phase 3 makes none. |
| **N-1, N-52, N-71, N-74, N-75, N-76, N-77, N-79** | **Closed in Phase 1 or 2.** Listed because the report's §9–§11 name them; each is CLOSED in the register and none carries a Phase 3 obligation. |
| **FU-1** | **Closed in Phase 1.** Same. |
| **OP-1, OP-7** | **Discharged** with dated records under `docs/05-qa/`. |
| **N-80** *(new, this plan)* | **OPEN — owner: U5, after D-3.** See §3. |

**No item from the source set is omitted.** Where a row reads *closed* or *discharged*, that is a statement
about the register at `c4460c7`, not a Phase 3 action.

---

## 8. Spend

**This plan performs no spend and authorises none.** Of the eight units, exactly one — **U6** — is live, and
its spend is **DOI resolver and PubMed E-utilities lookups only**: no OpenAI call, no deployed database, no
`stack_items` write. **D-4 can make the phase more live** by bringing FU-29 in, which would add a deployed
migration and its own OP row.

---

## 9. Appendix — claims checked and withdrawn

| Claim, as it appeared | Status after re-derivation |
|---|---|
| Roadmap: *"19 of 27 effect grades are hand-typed"* | **HOLDS** — 19 of 27 |
| Roadmap: *"four of them Grade A … eight Grade A in all"* | **HOLDS** — 8 Grade A, 4 without a profile |
| Roadmap: *"Target 27/27, up from 8/27"* | **HOLDS** — 8 profiles today |
| Roadmap: *"some with zero linked papers"* | **HOLDS, quantified** — 3 effects, plus 9 of 40 profile dimensions |
| Roadmap Testing: *"every `paperIds` entry resolves"* | **ALREADY TRUE** — 0 unresolved. A guard for it lands green; it must be mutation-checked to mean anything |
| Roadmap: *"100% of citations carry a verified DOI/PMID"* | **RE-READ** — not a gap in the data; the **field does not exist**. Framing it as filling in missing DOIs mis-sizes item 1 |
| That G2 blocks reintroducing provenance | **WITHDRAWN** — G2 forbids six named keys and **not** `doi`/`pmid`. **N-80** |
| `CLAUDE.md` §4 rule 7's *"8 of 31"* | **HOLDS** at this HEAD |
