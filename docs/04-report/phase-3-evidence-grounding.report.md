# Phase 3 — Evidence grounding (the trust layer): closeout report

**Date:** 2026-09-24 · **declared closed 2026-09-25** · **Plan:** `docs/01-plan/phase-3-evidence-grounding.plan.md` (APPROVED 2026-09-22, rank 5)
**At Phase 2 close:** 1420 tests / 113 files · 26 architecture specs · lint 368 of 368
**At Phase 3 close:** **1693 tests / 144 files** (node 1563 / 120 · jsdom 130 / 24; re-measured at the declaration landing) · **30 architecture
specs** · lint **415 of 415**, 0 errors · E2E non-live 70 passed / 30 `[LIVE]` skipped

**Verdict: COMPLETE WITH FOLLOW-UP** (declared 2026-09-25 on the owner's go). All nine exit criteria, `[P3-X1]`…`[P3-X9]`, are met and were re-run at HEAD. 27 of 27 effect grades are derived from profiles scored only from verified abstracts. 37 of 37 cited papers are bound to their committed resolver responses and were re-resolved live at the closeout, with no title drift and no retraction. The independent Check (P3-1…P3-11) found four closeout-bookkeeping gaps and one real guard weakness: a hand-written fixture entry passed. Each was remediated or carried with an owner, and its delta check found none unaddressed. The phase made 236 live calls for $0, with no OpenAI call. **OP-5 is OPEN and unchanged.** Every carried item is owned for Phase 4: rubric work (FU-61, FU-71), sourcing (FU-62), the fish-oil surrogate question (FU-68) and live re-verification between closeouts (FU-72).

~~**Verdict: pending the independent Check** (`docs/reviews/phase-3-closeout-check.md`, landing (c)). This
report does not grade itself.~~ *(As written at (b). The verdict above is the Check's, confirmed by the owner's declaration.)*

> **What is re-run here and what is compiled.** **§3's exit criteria were re-run at HEAD by command**, and
> their outputs are pasted in §3 (AC-1). **§5's red evidence is compiled**: it cites the red proofs each
> unit recorded when it wrote its guard, and does not re-execute them. A mutation means something at the
> moment a guard is written, against the code it was written for. Replaying it months later proves less
> and reads as more (the Phase 2 report states the same rule). The fixture re-verification (§7) is the one
> live check re-run at close, on the owner's pre-approval.
>
> **The Check does not read this report.** Its only inputs are the register, the roadmap, `CLAUDE.md` and
> the repository at HEAD, so it re-derives rather than confirms.

Figures are dated snapshots; **CI is the authority for any commit**.

---

## 1. What the phase was for

**Make the Library's central claim true.** At the base (`c4460c7`), **19 of 27** effect grades were hand-typed
letters with no derivation, and `Paper` carried **no provenance at all**, by construction: v13 had deleted
it because a required `link: string` with no real source left fabrication as the only way to satisfy the
type. Phase 3 had to bring provenance back, which meant **relaxing the control that removed it** (G2).
The register's §3 is about that one act, and D-3 was its ruling: an identifier is admissible only behind a
checked-in, dated, owner-attributed resolver record, verified offline at build time.

**At close:** **27 of 27** effects carry an `evidenceProfile`, and every grade is derived from it. **37 of 37**
cited papers carry a PMID or DOI verified against the fixture. The content source of truth is JSON under
`content/`. Every surface showing a curated dataset states its coverage limit. Rule 7 and rule 8 are
enforced by derived guards.

---

## 2. Units, with their landings

Every landing was fast-forwarded to `main` only after its branch CI passed on the pushed SHA. Cycle
records are under `docs/01-plan/features/`.

| Unit | Type | Landings (SHA) | Closes | Record |
|---|---|---|---|---|
| **U0** component-test harness | det. | `0389a6b` | unblocks `[P3-X4]`; U-DEFER-4 re-scoped | `p3-u0-component-harness.plan.md` |
| **U1** codegen skeleton + layout guard | det. | `f06be39` (a), `93e8e30` (b) | `[P3-X3]` layout half | `p3-u1-codegen-identity.plan.md` |
| **U2** corpus migrates to JSON | det. | `0bbbf0a`, `9b067c7`, `5975576`, `7b3f643` | `[P3-X3]`, `[P3-X8]`, FU-48, FU-49 (format), FU-54 | `p3-u2-corpus-migrates.plan.md` |
| **U3** grade derives from profile | det. | `89e22bd` | `[P3-X1]` mechanism | `p3-u3-derived-grade.plan.md` |
| **U5** provenance behind a record | det. | `67f9765` | `[P3-X2]` mechanism, N-80, N-81 | `p3-u5-provenance-record.plan.md` |
| **U6** corpus verified | **live** | `d1d23d1`, `7bf3b50`, `e4616de`, `6afa31e`, `7962a07`, `c04329d`, `6b16376`, `e1d5f37`, `d917841` | `[P3-X2]` content, N-84, FU-56; `[P3-X6]` path not needed | `p3-u6-corpus-verified.plan.md` |
| **U4** the 19 profiles (and the 8 re-drafted) | det. + scoped live (S4, S5) | `2dca1c8`, `478ccf7`, `b5d1b62`, `5b55d5b`, `c403f37`, `7dd4cf1`, `fbe7c09`, `bfa7602`, `cee04b9`, `e653b91`, `98be995`, `bd98bd3`, `e39255c` | `[P3-X1]` content, `[P3-X5]` | `p3-u4-profiles.plan.md`, `.closeout.md` |
| **U7** coverage honesty | det. | `841893e` (a), `8c01a61` (b2) | `[P3-X4]`; FU-59 in part | `p3-u7-coverage-honesty.plan.md` |
| **U9** rule 7: guard, then refactor | det. | `080d3ce` (a), `d8d3542` (b) | `[P3-X9]` | `p3-u9-rule7.plan.md` |
| **U8** bundle budget (seam dropped) | det., (c) touches CI | `4326811`, `e591da5`, `b1f5bb8` | roadmap item 5 **bundle half**; FU-52, N-82 | `p3-u8-bundle-budget.plan.md` |
| **U10** rule-8 component tests | det. | `3975d76`, `06de7ed`, `158bb30`, closeout `194ee08` | FU-64; **U-DEFER-4 closed in full** | `p3-u10-rule8-tests.plan.md` |
| **Closeout** | det. + (d) live | (a) `78277b6` · (d) `2969b89` | FU-67; N-85 registered | `phase3-closeout.plan.md` |

**Order, as run:** U0 → U1 → U2 → U3 → U5 → U6 → U4 → U7 → U9 → U8 → U10. It matches the register's
ruled order (U6 before U4 by D-6). U8 and U9 were independent of the corpus, and U10 was appended on the
FU-64 ruling.

---

## 3. Exit criteria, re-run at HEAD (AC-1)

Commands were run on `main` at `78277b6`, plus (d)'s capture files, which change no source. Outputs are
verbatim except for trimmed durations.

| Criterion | Status at HEAD | Command → output |
|---|---|---|
| **[P3-X1]** 27/27 effects have an `evidenceProfile`; a grade without one fails the build | **MET** | seed probe: `effects 27 · profiled 27 · gradeEqualsDerived 27`; `grep 'UNPROFILED_GRADE_ALLOWLIST' src/data/seed-integrity.test.ts` → `= [];` · `vitest -t G4` → `Tests 6 passed \| 17 skipped (23)`. Red at U4 closeout: G4c on a removed profile |
| **[P3-X2]** 100% of citations carry a verified DOI/PMID; guards red on an unverified one | **MET** | probe: `citedPapers 37 · citedWithoutVerifiedId [] · fixtureEntries 37` · `vitest src/data/provenance-record.test.ts` → `Tests 12 passed (12)`. **(d) re-resolved all 37 live: 0 drift, 0 retractions (§7).** Stated limit carried from U6: 2 dimensions and 2 effects are uncited by owner ruling, so 100% of what is cited is verified, but not every claim is cited |
| **[P3-X3]** content source of truth non-TS; codegen byte-identical for the pre-migration corpus | **MET** | `npm run content:generate -- --check` → `checked 9 modules, 0 stale` · `vitest canonical-layout.test.ts` (`CANONICAL_LAYOUT`, `CONTENT_FIDELITY`, `CONTENT_NOTES`, `CONTENT_EDIT_PROPAGATES`) → `Tests 23 passed (23)`. The byte-identity to the pre-migration corpus was proven once, at U2 (a), against `94c534a`, and cannot be re-proven (§3 note) |
| **[P3-X4]** every surface that can show partial coverage states its limit; test-verified | **MET** | `vitest --project jsdom CoverageLimit.test.tsx` → `Tests 23 passed (23)` · `vitest src/lib/advisor/tools.test.ts` → `Tests 21 passed (21)`. Remainder: products (FU-59), §8 |
| **[P3-X5]** a content correction ships without hand-editing `src/` | **MET, with the id-change caveat** | `vitest -t CONTENT_EDIT_PROPAGATES` → `Tests 2 passed \| 21 skipped (23)` · `git show --stat e653b91` → `content/seed/seed-effects.json` (hand) and `src/data/seed-effects.ts` (**generated**). An add, remove or rename still needs `src/data/id-manifest.json` by policy |
| **[P3-X6]** a retired/renamed id carries a tombstone + migration | **MET VACUOUSLY** | manifest diff `c4460c7`→HEAD: `papers added 18 removed 0 tombstones []`; version 2 → 2. No id was retired or renamed. FU-57 would be the first |
| **[P3-X7]** every guard this phase ships has recorded red evidence | **MET BY RECORD** | §5 locates every guard's recorded red proof. It is a record check and cannot be executed as a command |
| **[P3-X8]** every `paperIds` entry resolves; guard red on a planted dangling id | **MET** | probe: `citedUnresolved []` · `vitest -t G3` → `Tests 2 passed \| 21 skipped (23)`; red at U2 (c) |
| **[P3-X9]** rule 7 mechanically enforced; guard red before the refactor | **MET** | `vitest client-props.test.ts` → `Tests 16 passed (16)`; `CLIENT_LIB_IMPORT_ALLOWLIST = []`, one `NAMED_EXEMPTIONS` entry; red at `080d3ce` on 9 files / 11 edges |

**Probe:** a scratch `tsx` script over `@/data/seed-effects`, `@/data/seed-papers`,
`@/lib/evidence-grading` and the fixture, the same method as the register's §2. Its full output is:

```
effects 27 · profiled 27 · gradeEqualsDerived 27 · gradeDist {D:6, C:8, A:4, B:9}
confidenceByGrade {D>low:6, C>low:8, A>high:4, B>moderate:9}
papers 38 · papersWithId 37 · citedPapers 37 · citedUnresolved [] · citedWithoutVerifiedId []
uncitedPapers [p-nac-antioxidant] · fixtureEntries 37
effectsCitingNone [nac-antioxidant, protein-powder-recovery] · meanPaperIds 1.3704
dims 135 · dimsEmpty 26 · dimsEmptyScoreNonZero 0
```

**One note on X3's second clause:** *"byte-identical for the pre-migration corpus"* is a claim about one
moment. The pre-migration corpus stopped existing when U4 changed content, which is why the register
ordered U1/U2 first. The evidence is U2's recorded proof (`prove-values` 9/9, `prove-tokens` 0 unexplained,
against `b5aaab8` and `5975576`). What runs at HEAD is the continuing guarantee that every committed module
is its JSON's rendering.

**Criteria parity:** none (register §5, P-08). `grep -c "P3-X" docs/roadmap.md` → 0, so X1–X5 are
word-for-word copies of the roadmap and nothing binds them. This is recorded as a residue and not solved
(§8).

---

## 4. Owner rulings

Every ruling is in the register, dated beside the unit it governs. This is the index.

**Plan decisions (2026-09-22, rank-2):** **D-1 (a)** build the harness in Phase 3 (→ U0) · **D-2** JSON in
a root `content/` package · **D-3 (c)+(b)'s fields** verified-at-build against a checked-in fixture carrying
`verifiedOn`/`verifiedBy`, **no rank-1 exception** · **D-4** FU-29 out · **D-5** percentage headroom over a
recorded baseline · **D-6** U6 also closes the measured citation gaps (U6 before U4) · **D-7** rule 7 in,
guard first (→ U9).

| Unit | Rulings |
|---|---|
| U1 | split into (a) normalise / (b) guard, Option A · **D-a1** same-value numeric respellings allowed · **AC-2 amended**: the guard claims canonical layout only, and content fidelity moves to U2 |
| U2 | generated TS **committed**; Option A (key order from `src/types`) **declined** · **FU-53**: `[P3-X5]` moves to U4 · **FU-54** fixed as (d) |
| U3 | AC-2 deviation: `grade` stays authorable but must equal `deriveGrade` · **FU-55**: frozen `ALLOWLIST_ORIGIN` subset rule |
| U5 | `VERIFIERS = ["owner"]`; `SOURCES` crossref, doi.org, pubmed-eutils · FU-56 → U6 |
| U6 | **R1** unverifiable citation: keep the id and retitle, or tombstone; never *"unverified but disclosed"* · **R2** advisor-chip notice first · **R3** no contact email · search filters and ≤300-char excerpts · (c) per-claim decisions (24 ids; #13 do-not-cite) · S3 decisions · second-pass decisions (NAC citation removed) · (c2) identifier links |
| U4 | **R1** Claude drafts only from U6-captured abstracts, and the owner approves each batch · **R2** chip shows the current grade with *"grade updated since this message"* · **R3** summaries + two re-judged dimensions · **R4** FU-59 → U7 · **R5** an empty `paperIds` scores 0 · **R6** a title-only paper supports nothing · **R7** S4 addendum (≤16) · **R8** `confidence` joins May touch · **R9** caffeine-training summary · **R10** one engine pin per changed effect · **R11** B12 papers; zinc C stands · **R12** humanEvidence = strength of evidence *that the effect exists* · **R13** R12 extends to every dimension · **R14** confidence follows grade exactly · **R15** the original 8 re-drafted (their 40 rationales broke hard rule 1) · **R16** S5 (≤16) · F-1 and F-2 scoped exceptions · batch approvals B1–B6 |
| U7 | copy table approved (rows 1–9) · FU-59 closed in part (products stay open) · D1/D2 Grade-D wording is the owner's |
| U9 | `import type` is not a violation · **option A**: one named exemption (`AdvisorPanel → errorText`) |
| U8 | **R1** seam dropped (zero call sites) · **R2** fresh baseline at HEAD · (c) option 1, CI step added |
| U10 | **R1** the build's font fetch is permitted (FU-66) · **R2** rule 8 becomes a derived guard, or STOP |
| Closeout, R17 | **the studyQuality convention, WRITTEN AFTER THE FACT (2026-09-25).** U4 scored under a convention nobody had written down. The Check found every Grade A resting on it (P3-8). The owner derived it from the dimension's type definition (*"RCT / blinding / size / risk-of-bias"*), not from outcomes, and it was applied as written to all 27 effects. Two scores moved 1 → 2 (magnesium-stress, l-theanine-stress); **no grade and no confidence moved**. The 27-row table is in the register (§4, before U5). The size clause's reliance on authors' flags is FU-71 |
| Closeout | CLAUDE.md "go + lint" (lint 369 → 415 counted in correction 3) · plain-text guard name accepted because of N-85 · **N-85 → Phase 4** · (d) pre-approved |

---

## 5. Guard inventory (compiled; `[P3-X7]`)

Every guard added or re-pointed in Phase 3, what it proves, and where its red proof is recorded.

| Guard | Unit | Proves | Red proof recorded at |
|---|---|---|---|
| `TEST_COLLECTION` (`boundaries.test.ts`) replaces `HARNESS_GAP` | U0 | every tracked test file is collected by a vitest project | U0 artifact; register U0 (three-step red) |
| `CANONICAL_LAYOUT` (`canonical-layout.test.ts`) | U1 | each `SEED_*` module is the emitter's layout for its own value; **layout only** | U1 artifact: a dropped trailing comma, a collapsed object |
| `CONTENT_FIDELITY` | U2 | each committed module is its JSON's rendering | U2 artifact §6: a hand-edited value, a hand key-reorder (`CANONICAL_LAYOUT` stayed green) |
| `CONTENT_NOTES` | U2 | every sidecar note anchors to a real record | U2 artifact |
| **G1** re-pointed to `src/` + `content/`, `.ts\|.tsx\|.mjs\|.json` | U2 | no placeholder hosts in authored content | U2 artifact: a planted host in JSON (HEAD's G1 stayed green) — FU-48 |
| **G3** `paperIds` resolution over the authored JSON | U2 | every `paperIds` entry resolves, at any depth | U2 artifact §6: a dangling id (the retired check stayed green) — `[P3-X8]` |
| **G4a–f** | U3 | a profiled grade equals `deriveGrade`; an unprofiled grade fails unless allowlisted; the allowlist is shrink-only | U3 artifact §6: a hand grade; **19-wide red**; each allowlist check; U4 closeout: G4c on a removed profile |
| **G2** derived from `paperSchema`; `_PaperSchemaConformsToPaper` | U5 | no paper key outside the schema; schema ≡ type | U5 artifact §6: an unlisted key; `tsc` drift both ways (TS2344) |
| **P1–P5** (`provenance-record.test.ts`) | U5 | fixture shape; malformed id; id without an entry; title mismatch; orphan entry | U5 artifact §6: each reddens only its own test, and P2 vs P3 fail differently |
| **P6** do-not-cite, **P7** every cited paper verified | U6 | withdrawn PMID 25924708 is never cited; no cited paper lacks a verified id | U6 artifact: planted citation of `p-nac-antioxidant` fails P7 |
| advisor chip notice / verified title / `PaperSummaryCard` links | U6 | the dataset notice, historic chip titles, identifier links | U6 artifact (each red, then restored) |
| `capture-resolve.test.ts` | U4 (F-2) | S2 saves every response body | U4 artifact: both tests red before the fix |
| R2 grade-updated marker (jsdom) | U4 | a stored `effect-grade` chip shows the current grade and flags a change | U4 artifact (red → restore) |
| **G5a–b** confidence ↔ grade | U4 (R8, R14) | confidence is exactly the grade's mapping | U4 artifact (red twice) |
| **G6a–b** empty `paperIds` ⇒ score 0 | U4 (R5) | no dimension scores above 0 uncited | U4 artifact |
| **G7a–b** seed safety-vocabulary sweep | U4 | no banned phrase in any summary or rationale | U4 artifact (rationale and summary plants) |
| **G8a–b** dimension cites only its effect's papers | U4 | AC-6 | U4 artifact |
| `CONTENT_EDIT_PROPAGATES` (P-12) | U4 | editing the JSON alone changes the emitted constant | U4 artifact §3: red when the emitter drops `summary` |
| 15 R10 engine pins + 4 re-derived fixtures | U4 | each changed grade's engine consequence | U4 closeout |
| `CoverageLimit.test.tsx` (completeness derived from the filesystem) | U7 | every curated-dataset surface states its limit, in both states | U7 artifact §4, §6: 15 + 8 red before, 5 + 6 mutations |
| `CLIENT_TAKES_PROPS` (`client-props.test.ts`) R7a–h | U9 | no client-graph runtime edge into `src/lib`/`src/data`; one named exemption | U9 artifact §3: 9 files / 11 edges red before the refactor |
| 10 moved-component jsdom tests | U9 | each moved component renders what it did before | U9 artifact |
| `verify:bundle` (`scripts/verify-bundle.mjs`) + CI step | U8 | every page route ≤ baseline × 1.01, exact route set | U8 artifact §5: inflated `/library`; R-U9 revert; M1–M5 |
| `DOC_TRUTH` step map (`bundle budget`) | U8 (c) | §5's CI chain equals `ci.yml` | U8 (c): the step added alone was red |
| 13 rule-8 component tests | U10 | each member's own flag / grade / citation rendering | U10 artifact §2.1: 24 mutations |
| `RULE8_COMPONENT_TESTS` | U10 | every derived rule-8 member has a sibling test importing it | U10 artifact §3.1: planted grade component; untracked test; wrong import |
| FU-67 assertions (2 test files) | Closeout (a) | StackLabClient's flags; SupplementDetail's grades and papers | closeout artifact §2: 6 mutations, 4 green on HEAD's tests |

**`SPEC_COUNT` moved 27 → 30** over the phase: 27 at the base (register §2), then +1 each for U1
(`canonical-layout`), U9 (`client-props`) and U10 (`rule8-component-tests`). **Every `.test.tsx` in the
repository (24) was written in Phase 3**, since before U0 `HARNESS_GAP` failed any tracked one.

**Two guards this phase learned are narrower than their names** (recorded, not fixed):
- `RULE8_COMPONENT_TESTS` binds a test's **existence, not its assertions**. FU-67 was that gap, closed by
  hand for the two members it affected. Nothing prevents a third.
- **N-85:** `DOC_TRUTH` did not notice rule 7 becoming enforced, and it rejects the guard's real name as a
  token. Owner: **Phase 4**.

---

## 6. Grades, before → after

| | A | B | C | D | profiled |
|---|---|---|---|---|---|
| base `c4460c7` | 8 | 9 | 10 | 0 | 8 / 27 |
| HEAD | **4** | **9** | **8** | **6** | **27 / 27** |

**15 of 27 grades changed** (`git show c4460c7:src/data/seed-effects.ts` against `content/seed/seed-effects.json`):

| Down | Up |
|---|---|
| magnesium-sleep B→D · magnesium-stress C→D · l-theanine-stress B→D · glycine-sleep B→D · nac-antioxidant C→D · protein-powder-recovery B→D · zinc-deficiency A→C · zinc-immune B→C · vitamin-d-deficiency A→B · melatonin-sleep A→B · vitamin-b12-deficiency A→B · caffeine-focus A→B | fish-oil-cardiovascular B→A · fish-oil-mood C→B · ashwagandha-sleep C→B |

**Twelve down, three up.** Every change came from a profile scored only from verified abstracts and
approved by the owner batch by batch. **Grade D means *"no verified evidence in this library"*, never
*"evidence of no effect"*** (B3 ruling; U7 (b2) renders it that way). Each of the 15 is pinned to its
engine consequence by an R10 test. **Confidence follows grade exactly** (R14; G5): A→high 4, B→moderate 9,
C/D→low 14.

**Citations:** mean `paperIds` per effect **0.8889 → 1.3704**. Papers **20 → 38** (37 cited, all verified).
Effects citing none **3 → 2** (`nac-antioxidant`, `protein-powder-recovery`, both by owner ruling). Profile
dimensions **40 → 135**, of which **26** cite nothing and score 0 (R5).

---

## 7. Live calls and spend

| Unit / step | Calls | Record |
|---|---|---|
| U6: S1 96 · S2 30 · S3 36 | 162 | `docs/05-qa/2026-09-23-p3-u6-verification-record.md` |
| U4: S4 12 · S2 13 · S5 12 | 37 | same record; `p3-u4-profiles.closeout.md` §6 |
| **Closeout (d): RV, fixture re-verification** | **37** | same record § *RV* |
| **Phase 3 total** | **236 calls, $0** | |

**No OpenAI call, no paid API and no deployed-database write in the whole phase.** `[P3-X6]`'s conditional
migration path was never taken. The only other network dependency is the build's Google Fonts fetch, which
was already there and is registered as FU-66.

**(d), in one line:** 37 of 37 fixture entries re-resolved (36 PubMed `esummary`, 1 Crossref), all HTTP 200.
**0 title drift, 0 retraction pubtypes, 0 identity mismatches, 0 refusals.** Bodies are in
`content/verification/captures/2026-09-24-rv/`. `verifiedOn` was **not** refreshed, because (d) was
read-only by brief. The one limit is that `esummary`'s `pubtype` does not show an *Expression of Concern* or
an unindexed retraction.

---

## 8. OP-5, stated explicitly

**OP-5 is OPEN and unchanged by Phase 3.** The Phase 2 report required that it *"must not be inherited
quietly"*, so this is the statement. Its record is still `docs/05-qa/2026-09-18-op5-provider-record.md`, last
changed at `1a6c080` (2026-09-19). **Three account facts are still UNKNOWN**, and the DPA page returned
HTTP 403. Phase 3 made **no OpenAI call** and changed no advisor provider path, so it neither advanced nor
exercised OP-5. **What this forbids claiming:** that the provider-side handling of user health context is
established. It is not. **Owner: the repository owner (account-held). Phase: before any deployment carries
user traffic.** No roadmap phase is named, because this is a deployment gate, not phase work.

---

## 9. The register at close

**Closed in Phase 3:** N-80, N-81 (U5) · N-82 (U8) · N-83 (U0) · N-84 (U6) · FU-48 (U2) · FU-49 (U2,
format only) · FU-51 (U0) · FU-52 (U8) · FU-53, FU-54 (U2) · FU-55 (U3) · FU-56 (U6) · FU-64 (U10) · FU-67
(closeout (a)) · **U-DEFER-4, in full** (U10; open since `110715d`, 2026-07-30, 56 days).

**Opened in Phase 3 and still open:** FU-50, FU-57, FU-58, FU-59 (products), FU-60, FU-61, FU-62, FU-63,
FU-65, FU-66, N-85.

**[2026-09-25, closeout (e4)]** After the Check (P3-4), FU-61, FU-62 and FU-63 got §7 rows, and FU-57, FU-58, FU-59 (products), FU-60 and FU-66 got owners and phases. `[P3-X6]` and `[P3-X7]` are ticked in the register. FU-68…FU-72 were opened or closed by the remediations (FU-69 and FU-70 closed at (e2)).

**Two register gaps found while compiling this report:**
- **FU-50 has no §7 row.** It is open, and it appears only in U0's status line and U0's artifact
  (`p3-u0-component-harness.plan.md:154`). That is the *"promise is not a record"* shape Phase 2 named. It
  is listed in §10.
- **FU-25 was never dispositioned in Phase 3.** The register's §7 source set was bounded to the Phase 2
  report's lines 223–367, and FU-25 appears only at line 119, as the per-worker-isolation half of the
  **Live E2E BLOCKED(env)** residue. That residue *is* in §7, so FU-25 is covered in substance but was
  never named. It is listed in §10.

**Both now have §7 rows**, written in this landing and dated as late-registered.

---

## 10. Deferred, each with an owner and a phase (AC-4)

**How to read the Phase column.** The register often says *"the next operational phase"*. **No such phase
exists in `docs/roadmap.md`**, whose last phase is Phase 4, *Product completion*, followed by *Commercial /
scale readiness — explicitly out of scope*. Where the register names no roadmap phase, this table assigns
**Phase 4** and marks it **(assigned at closeout)** for the owner to confirm or move. That wording is a
disposition with nowhere to land, the N-11 shape. Where the register names none, **Owner** is *the
repository owner*, since every schedule in this project is set by that person.

| Item | What | Owner | Phase |
|---|---|---|---|
| **N-85** | DOC_TRUTH blind to rule-7 enforcement; rejects `describe`-title guard names | repository owner (ruled) | **Phase 4** (ruled 2026-09-24) |
| **N-50** | the uniform-404 product question | repository owner | **Phase 4** (roadmap item 0) |
| **FU-61** | a well-studied null effect can reach Grade B (rubric weights) | a rubric-owner unit | Phase 4 (assigned at closeout; register: *post-Phase 3*); **§7 row added at (e4)** |
| **FU-71** | R17's size clause relies on the authors flagging small samples; consider an objective threshold | a rubric-owner unit, with FU-61 | **Phase 4 (ruled 2026-09-25)** |
| **FU-68** | fish-oil-cardiovascular is named *"Cardiovascular support"* at A on a triglyceride surrogate | repository owner | **Phase 4 (ruled 2026-09-25)** |
| **FU-72** | a scheduled live re-verification of the fixture between phase closeouts (the E1-R2b window) | repository owner | **Phase 4 (ruled 2026-09-25)** |
| **FU-62** | sourcing pass for glycine-sleep and zinc-deficiency; **also FU-49's glycine-dose residue (moved at (e4))** | a live sourcing unit | Phase 4 (assigned at closeout; register: *post-Phase 3*); **§7 row added at (e4)** |
| **FU-63** | make `evidenceProfile` required; remove the no-profile branch | repository owner | Phase 4 (assigned at closeout; register: *post-U4*) |
| **FU-65** | `getBiomarker` seam, waiting on a real caller | the unit that writes the first caller | Phase 4 (assigned at closeout; trigger-bound) |
| **FU-66** | build-time Google Fonts fetch: keep, or self-host | repository owner | Phase 4 (assigned at closeout) |
| **FU-59** (products) | `ProductMatchPanel` has no coverage-limit statement | repository owner | Phase 4, with roadmap item 2 (real catalog) (assigned at closeout) |
| **FU-57** | `p-nac-antioxidant` uncited row: tombstone + migration | repository owner | Phase 4 (assigned at closeout; a deployed-DB migration, `[P3-X6]`) |
| **FU-58** | `src/types/paper.ts` header still says *"not a citable study"* | repository owner | Phase 4 (assigned at closeout) |
| **FU-60** | account export emits stored pre-U6 paper labels | repository owner | Phase 4 (assigned at closeout) |
| **FU-50** | `@vitejs/plugin-react` installed, referenced by nothing (**no §7 row**) | repository owner | Phase 4 (assigned at closeout) |
| **FU-1** | `executeProposal`'s unlocked read on `attach_product` | repository owner (was unowned) | Phase 4 (assigned at closeout) |
| **FU-29** | 13 `mappers.ts` casts; needs a deployed-DB migration | repository owner | Phase 4 (assigned at closeout; D-4 ruled it out of Phase 3) |
| **FU-30, FU-31** | dead `safetyCopy` helpers | repository owner | Phase 4 (assigned at closeout) |
| **FU-32** | counts-written-once, a standing class | repository owner | standing, every phase |
| **FU-33, FU-34** (+ **N-71**'s product half) | `handleParams`; `PARTIALLY_APPLIED` unrendered | repository owner | Phase 4 (assigned at closeout) |
| **FU-35–FU-38** | U31's C-table obligations | repository owner | Phase 4 (assigned at closeout; register: *next operational phase*) |
| **FU-40** | `RLS_COVERAGE`'s semantic blind spot | repository owner | Phase 4 (assigned at closeout) |
| **FU-41, FU-43, FU-44, N-11, N-40** | all need one logging sink | repository owner | Phase 4 (assigned at closeout; register: *next operational phase*) |
| **FU-42** | `CRITERIA_PARITY` cannot express `[~]` | repository owner | Phase 4 (assigned at closeout) |
| **FU-45, FU-46, FU-47** (+ **N-79**) | register/artifact instrumentation; parity row shape; shared blind-spot fix | repository owner | Phase 4 (assigned at closeout; register: *next operational phase*) |
| **FU-25** (with **Live E2E BLOCKED(env)**) | per-worker user isolation; live E2E stays owner-run | repository owner | Phase 4 (assigned at closeout); the ruling *"no secrets in this public repo"* stands |
| **N-22, N-25** | gateway aliases; PDF transcription on scans | repository owner | Phase 4 (assigned at closeout) |
| **N-69** | security-relevant; condition: a second writer or a transferable conversation | repository owner | condition-bound; any phase that meets the condition |
| **N-70** | gate on transferable conversations | repository owner | condition-bound, likewise |
| **OP-5** | three UNKNOWN provider-account facts | repository owner | before any deployment with user traffic (§8) |
| `CLAUDE.md` §4 **rule 8** (trust boundaries) | no mechanical form exists | repository owner | standing |
| `replaceFlags` residue (unnumbered) | three round trips, no transaction | repository owner | condition-bound: the next second writer to `evaluation_flags` |
| **Criteria parity** (P-08, unnumbered) | `[P3-Xn]` absent from the roadmap; nothing binds X1–X5 | repository owner | **Phase 4, grouped with N-85 (ruled 2026-09-25)** |
| **`[P3-X5]` wording** (P-07) | false for id add/remove/rename as the roadmap words it | repository owner | amendment is the owner's; with the roadmap Phase 3 status edit |
| **Roadmap item 5, seam half** | UNMET (U8 R1) | see FU-65 | see FU-65 |

**Roadmap note, not a deferral:** roadmap Phase 4 item 3 (*"Component tests + accessibility for every
component rendering a safety flag, evidence grade, or citation"*) is **half delivered early**. U10 made the
component-test half mechanical (17 of 17, guarded). The accessibility half is untouched.

---

## 11. What the phase learned about its own method

**A brief that could not be met, found by trying (U1).** Byte-identity from JSON was unsatisfiable while 4
modules carried in-array comments. The unit stopped, the brief was split, and the guard was renamed
`CANONICAL_LAYOUT` **so that its name does not overclaim**. Its first red proof, a key reorder, stayed green.
The finding was *the brief was wrong, not the guard*, and content fidelity moved to U2, where it was proven.

**Counts written once — 7 instances, again.** N-82: the §2 bundle row, *"recorded verbatim"*, printed the
wrong rendering marker. FU-64's *"12"* could not be reproduced from its own keywords, and the true figure
was 13. §4 rule 7's *"8"* was 9 files / 11 edges on the transitive client graph. U8-F1: two routes grew
~9% and no recorded figure moved. `CLAUDE.md`'s *"27 specs"* and *"lint 369"* went stale with nothing
reddening. N-85: the enforcement table understated rule 7 for the whole of U9–U10. **Every one was
caught by re-deriving, never by a guard.** FU-32 stays a standing class.

**Content can break a rank-1 rule without breaking a test (R15).** The original 8 profiles' 40 rationales
were not written from the papers they cite. Nothing failed, because the sweep checks wording, not truth
(`CLAUDE.md` §2.2 rule 7). They were re-drafted from verified abstracts. Similarly, N-84: all 20 seed paper
titles were descriptions of a claim rather than titles of real papers.

**An instrument that keeps no evidence cannot explain its own refusal (F-2).** S2 refused B-2 three times.
The cause (esummary renders a subscript as `(12)`) was only established once response bodies were saved.
Since then every live call keeps its body, and (d) relied on that.

**A green gate that ran a subset (B3).** The per-landing gate ran one E2E spec while CI ran them all, and
CI caught what the gate did not. Standing rule from then on: the full non-live suite before every landing.

**A vacuous check inside the closeout itself.** (a)'s first null-byte check used `grep -P`, which macOS
grep lacks, with `2>/dev/null` hiding the error, so it "passed" having checked nothing. It was redone
with a positive control (closeout artifact §4). This is the same class as Phase 2's *"red-first proof
that fails to redden"*, caught this time by reading the output rather than the exit code.

**A guard binds what it binds.** `RULE8_COMPONENT_TESTS` proves a test exists, not what it asserts
(FU-67). `CANONICAL_LAYOUT` proves layout, not content. `DOC_TRUTH` binds names, and only some kinds of
name (N-85). In each case the guard's header or its ruling says so, and the report repeats it so that no
reader takes the name for the property.

**A scoring convention written after the scoring (R17).** U4 applied a studyQuality convention consistently to 9 effects, but never wrote it down. It became visible only when the independent Check noticed that every Grade A sat on it. Written from the type definition, it disagreed with 2 scores, both conformed and neither grade moved. **The lesson is the order: a rubric convention is written before content is scored against it, or its consistency is an accident nobody can check.** FU-71 records the part the written form still leaves subjective.

**Stop conditions fired and were honoured:** U1 (unsatisfiable brief), U4 R5 (uncited-dimension score
undefined), U9 (b) (the `errorText` edge), S2's three refusals, U8 R1 (an unobservable seam). **None was
worked around.** Each went to the owner and came back as a ruling, which is why §4 is long.
