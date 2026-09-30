# p4-u14a-context-plan-revision — PDCA cycle artifact for Phase 4 U14a

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U14** (part a),
> and never replaces it. Where the two disagree, the register wins.
>
> **Unit** U14a · Context-adjusted evidence, plan revision only · **SUPERVISED** · docs · size M · **Anchor** `49b3fc2d73e4c5b2bacfdeaabfd5105eab50d872` · **Date** 2026-09-30
> **Authority:** D-3 (item 1, U14a first, docs only), Q-1 (a) (revise within 399 lines), and the owner's rulings R1–R4
> and standing approval of 2026-09-30, recorded verbatim in the plan's §6 (*Owner rulings — 2026-09-30*).
> Registered with bkit at the open, before any file was drafted (RC-4).

## 1. Plan

**Goal:** revise `context-adjusted-evidence.plan.md` (v13, 2026-07-16, Draft) so it can be approved and built under
today's rules. That means a universal grade with an applicability note beside it, the enrolment sentence deferred, a
separate personal-signal track, and corrected success criteria. **The unit does not approve the plan.**
**May touch:** that plan · the Phase 4 plan (U14 row, part a; N-37 if closed; R1–R4 verbatim) · this file (≤ 200) ·
the queue · bkit. **May NOT touch:** `src/**`, `content/**`, `CLAUDE.md`, `docs/roadmap.md`.
**First step, per the U14 row:** the owner reviews D-3's two draft lines. That review is R2, given before this unit
opened. No copy was written before it.

## 2. Do

**Method.** A dated revision banner. Where v13 still holds, it is kept. Where it no longer holds, the text is struck
(`~~ ~~`) and dated, with the replacement beside it. A block struck whole is cited as `49b3fc2:<lines>`, so the original
is one `git show` away. **One fold that is not a strike:** §8.1's five-row selection table became one line with the same
selection, to fit R4. It is dated and cited.

**Length (AC-6, R4):** 399 → **395** lines (`wc -l`). Removing the adjusted-grade machinery (the modifiers, the
explain trail, downgrade copy, Flow 2 and the grade half of the invariants) freed about 60 lines. §5.3 (the approved
lines, bindings and render condition) and §5.4 (the gate) added about 35. It stays above 200, so its ARTIFACT_CAP
grandfather entry remains valid. The entry's pin is still 399. Ratcheting it needs `src/architecture/`, which is outside
*May touch*, so the owner queued it for **U21** (2026-09-30).

### AC-1: sections struck or replaced (before = `49b3fc2`, after = this landing)

| Section | Before | After | What changed |
|---|---|---|---|
| Header, Status | 1-11 | 1-15 | Revision banner added; status "Draft — revised, awaiting approval" |
| Executive Summary | 15-22 | 18-27 | All four rows revised. The "A for you … 25-OH D is 18 ng/mL" example is struck and replaced by the within-range line (owner re-ruling). Unsourced creatine and vitamin D claims are struck |
| §1.1 Core problem | 30 | 35 | Annotated: "personal" means a note beside the grade |
| §1.2 Target users | 37 | 42 | "labs change what the evidence means" struck |
| §1.3 Success criteria | 39-51 | 44-58 | SC-1, 2, 5, 6, 7, 8, 9, 10 revised, each citing its v13 line. SC-4 and SC-11 restated (AC-4). SC-3 unchanged |
| §1.4 Constraints | 57-62 | 62-70 | Display-only, Grade ≠ claim and Non-diagnostic annotated; new "User-entered range only" row |
| §2 Alternatives | 66-100 | 74-102 | New note; A's grade half struck; C struck (`49b3fc2:88-96`); §2.4 rationale's grade clause struck |
| §3 YAGNI | 104-137 | 106-144 | Core and included items re-worded (the note); "adjusted grade feeds ranking" struck; enrolment sentence and demographic axis deferred; "any personal grade letter" added to Won't Do |
| §4 Scope | 141-154 | 146-161 | M0's `ANTHROPIC_API_KEY` struck; M1/M2 re-scoped; new-copy exclusion added |
| §5.1 FRs | 160-173 | 166-179 | FR-01, 03, 04, 06 struck (`49b3fc2:164,166,167,169`); FR-05, 07, 10 revised |
| §5.2 NFRs | 175-184 | 181-190 | Purity, Isolation, Regression and Build revised |
| **§5.3 Approved copy** | — | 192-209 | **New** (AC-2) |
| **§5.4 Gate** | — | 211-220 | **New** (AC-3) |
| §6 Success criteria | 188-201 | 224-238 | Revised (AC-5) |
| §7 Risks | 205-215 | 241-252 | R1, R2, R5, R7 annotated; R3 struck and replaced; R4 re-worded; **R8 new** |
| §8.1–8.2 | 219-238 | 256-271 | 8.1 folded (see Method); 8.2 signal-partition row struck and replaced |
| §8.3 Components + invariants | 240-265 | 273-294 | Redrawn; I2–I5 revised |
| §8.4 Data flow | 267-328 | 296-323 | Flow 1's SSG text struck (N-37); Flow 2 redrawn; Flows 3–4 and the ranking path re-worded |
| §8.5 Modules | 330-339 | 325-336 | M0/M1 revised; guards named; dated note |
| §10 Next steps | 352-356 | 347-351 | FR-06 struck; the queue answers and U21 named; "do" gated on an amendment |
| Appendices, history | 360-399 | 353-395 | Two log rows annotated; Appendix B dated; version 0.2 row |

### AC-2: the lines (§5.3)

**First draft.** The lines were entered as R2 ruled: line 1 without its enrolment sentence, line 2 as drafted. Drafting
them surfaced three questions, queued rather than decided. **Q-26:** line 2 bound `{inclusionCriterion}`, the same
unverified field R2 had deferred line 1's sentence for. **Q-27:** after the cut, line 1's *"those studies"* and *"they"*
lost their antecedent and `{effect}`, and a dateless entry could not bind `{date}`. **Q-28:** does an import-confirmed
range count as "entered"? The reviewer raised Q-28 (§5, finding 1).

**The owner's re-ruling at the stop (2026-09-30)** answered all three. R2 was wrong about line 2, so both lines lose the
enrolment clause. The new outside- and within-range lines are verbatim in §5.3 and the within-range line is in Core
Value. The field rule: a dateless entry omits *"({date})"* with its parentheses, and any other unbound field makes
the note `null`. On Q-28, a range stored on the user's row counts, including an import-confirmed one; the catalog
fallback never counts. The binding table now holds only fields that bind today (`{paperLabels}` and
`{inclusionCriterion}` left with the clause). The enrolment sentence, for both lines, is deferred future work,
dependent on a verified per-paper enrolment field (§3.3, §5.3; U7 backlog). **Render condition:** `referenceLow` and
`referenceHigh` both non-null on the user's row. **Otherwise:** the grade renders alone, as today.

### AC-4: SC-4, SC-11, N-37

- **SC-4** now reads that the Library route never imports `lib/evidence-context`, and that its rendered output is
  identical for any two users. **Test shape:** (a) a transitive import-graph walk from `src/app/library/**` (the
  `client-props.test.ts` walk); (b) render equality of `SupplementDetailPage` under two fixture users, excluding the
  root layout. Both are mutation-checked.
- **SC-11:** G, including non-live E2E. The live run is owner-run (D-12), not a criterion.
- **N-37 is not closed.** Restating SC-4 retires the plan's reliance on SSG, which was U14a's part (§3 row: *"SC-4
  asserts SSG and must be restated"*). The finding is the build-summary label, and that is unchanged. At `49b3fc2`, a
  clean-environment `next build` still lists `● /library/[slug]` with 15 paths and emits **0** HTML files
  (`find .next/server/app -name '*.html'`), and `generateStaticParams` is at `src/app/library/[slug]/page.tsx:21`. The
  §3 N-37 row is not edited: *May touch* allows that only if N-37 closes. The disposition is in the U14 row.

### Found in passing (§8 rule 1): Q-25, now U21

`statusOf` (`src/lib/biomarkers/index.ts:36-43`) compares the canonical-unit value with the user's range in the
entered unit, and falls back to the catalog range. **Probe** (a scratch test copied into the tree, run, deleted;
`git status` clean after): vitamin D at 100 nmol/L against the user's own 75–250 nmol/L returns **`low`**. It feeds
stack-evaluation lab findings and `labBoost`. It is outside *May touch*, so it was queued as Q-25. The owner
confirmed the defect and made it **U21**, a new supervised unit, registered in the plan (2026-09-30). The revised plan
avoids `statusOf` (R8, FR-04).

## 3. Check

- **AC-5:** no line of §1.3 or §6 names the adjusted grade. The §1.3 note does, saying SC-4 and SC-11 never named
  it. Every other remaining mention is struck text, a ruling reference, or a row in the historical brainstorming log
  (`grep -in "adjust"`).
- **AC-6, AC-7, AC-8:** recorded in §5 and §6 at the landing.

## 4. Act / carried

- **Q-25 → U21** (with the ARTIFACT_CAP pin ratchet). Q-26, Q-27 and Q-28 were answered on 2026-09-30. The plan's approval
  remains a future owner decision.
- **Not done, and why:** the N-37 label (a
  build or product question: whether the Library should be static, and not a docs change).

## 5. Independent review (AC-7)

A fresh subagent reviewed scratch copies of the revised plan, Box 1 and `CLAUDE.md` §2, with no other context.
**Verdict: PASS WITH NON-BLOCKING FINDINGS.** On the owner's question, its answer was **no**: neither line tells a user
they have or lack something, presents correlation as cause, or lets a self-reported signal alter a grade. It noted
that `{inclusionCriterion}` could hold a word like "deficient adults", which would describe the study
population, not the user. The eight findings, each **fixed** in the plan unless marked:

| # | Finding | Disposition |
|---|---|---|
| 1 | "Entered by the user" should not silently include import-confirmed ranges; prove no write path fills from the catalog Put to the owner as **Q-28**, answered: a stored range counts, including an import-confirmed one; the catalog fallback never does. The catalog-fill test stays required in §5.3 |
| 2 | The rule 9 gate row cited the note's guard, not the self-reported track's | SC-9 now bars `PersonalSignal` from `lib/evidence`, the grade and ranking beyond v10; the row cites it |
| 3 | The rule 4 (track 2) and rule 10 rows rest on deferred copy | Both rows now say they hold only once the owner batch is approved |
| 4 | `{paperLabels}` could be built from authored fields First bound to `currentCitationLabel`. **Moot:** the re-ruled lines have no `{paperLabels}` |
| 5 | Advisor answers are free text outside the two lines | SC-10: it relays the line or cites the fields; the guard is a backstop; lab data stays within today's posture |
| 6 | Line 2 cannot render today **Moot:** re-ruled, and neither line needs the unverified field |
| 7 | Old-design wording in §2.4, §8.2 and two log rows | Re-worded or annotated, dated |
| 8 | Line 1's antecedent Q-27, answered by the owner's re-worded outside-range line |

## 6. Landing

*G, branch CI and the landing are not written here, as in U12 and U17: recording them would change the tree G
measured. They are in the unit's bkit entry, the commit message and the report back.*
