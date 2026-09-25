# phase4-plan — PDCA cycle artifact for authoring the Phase 4 plan

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for the act of **authoring** the
> Phase 4 plan. The plan itself, `docs/01-plan/phase-4-product-completion.plan.md`, is the record. It is a
> **DRAFT AWAITING OWNER APPROVAL**, so it outranks nothing (`CLAUDE.md` §6). This file carries no approval
> status of its own and **points into the draft rather than restating it**. Where the two disagree, the
> draft wins.
>
> **Cycle**: author the Phase 4 — Product completion plan · **Base SHA**: `49bb62e` · **Date**: 2026-09-25
> **Feature**: `phase4-plan` · **Method**: bkit PDCA (plan → design → do → check → report)
> **Scope of this cycle**: two landings. **(1)** the owner's content-delivery ruling in
> `docs/project-status.md` (`49bb62e`). **(2)** two new documents: the draft and this artifact. **No
> `src/` file, `content/` file, guard, CI file, dependency, `CLAUDE.md` or `docs/roadmap.md` is touched.**

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | Phase 3 closed with follow-up and handed Phase 4 **66 register ids** plus 5 unnumbered residues across three documents. Many name *"the next operational phase"*, which does not exist. The roadmap's Phase 4 lists **candidates, not commitments**, and one item it says must be *decided rather than inherited* (N-50). |
| **Solution** | A DRAFT plan: a baseline re-derived by command; a disposition for every inherited id (**IN** a unit, **OUT** with a reason, or **CLOSED**), complete by `comm`; 18 typed units, of which 5 exist only if a decision admits them (U11, U14–U17) and 4 more take their shape from one (U5, U6, U8, U18); 8 exit criteria (3 verbatim from the roadmap, 5 plan-only); and **12 owner decisions, options only**. |
| **Function/UX Effect** | **None.** One status row and two documents. |
| **Core Value** | The owner can approve or refuse Phase 4 on measurements and on explicit choices. No inherited item goes quiet at a phase boundary (the N-11 shape), and nothing is pre-decided by being written as a unit. |

---

## Context Anchor

| | |
|---|---|
| **WHY** | The roadmap's last phase is being opened on a foundation Phases 0–3 made correct, verified, operable and grounded. Its scope is deliberately open, so the plan must separate what the register **owes** from what the owner **chooses**. |
| **WHO** | The repository owner, who answers D-1…D-12 and approves the plan. This session measures and drafts and **decides nothing**. |
| **RISK** | (1) A unit written as though its decision were settled: above all D-2 (grades move) and D-3 (which product work exists at all). (2) A figure carried rather than re-derived. This landing caught one of its own (§5 below). (3) Scheduling a deployed-database or external-service unit without a decision. |
| **SUCCESS** | AC-1…AC-6 of the brief, each evidenced in §4 below. |
| **SCOPE** | **In:** `docs/project-status.md` (the one ruling), the draft, this artifact. **Out:** `src/**`, `content/**`, `CLAUDE.md`, `docs/roadmap.md` (its status moves only at approval), Phase 0–3 documents, CI, dependencies. |

---

## 1. Plan (pointer)

Brief: *PHASE4-PLAN, landing (a), deterministic.* The goal, the draft's required sections §1–§8 and AC-1…AC-6
are the brief's. The draft's section map is the brief's list, one to one.

## 2. Design (pointer)

- **Source set for §3** is fixed by command before any row is written, so completeness is checkable rather than asserted (the draft's §3 opening line).
- **Units are typed by Phase 3's corrected liveness test** (network, deployed DB, paid call, or a migration over any manifest `persistedAt` surface), kept unchanged so the typing is comparable across phases (the draft's §4 preamble).
- **Decisions that gate units are marked *conditional*** in the unit table instead of being folded into a unit's goal. A reader can therefore see which units exist only if an answer admits them (the draft's §4 and §6).
- **Numbering:** the draft's D-1…D-12 are its own. The Phase 3 Check's delta items D-1…D-5 are unrelated, and all five were resolved at the declaration (`291e287`). The draft says so in §6.

## 3. Do

| Landing | Commit | What |
|---|---|---|
| (1) `docs(status): content delivery X → B` | `49bb62e` | The owner's ruling, as worded. The "flagged, not ruled" note is struck, not deleted. The manifest move is registered as a Phase 4 candidate |
| (2) `docs(plan): Phase 4 (a) — draft, awaiting approval` | this landing | The draft plus this artifact |

**Register allocation:** **N-86** only (roadmap `:179`'s stale U-DEFER-4 box). The number was derived by
command in the draft's §3. **No OP number is issued.** OP-8 onward is allocated only when an option that
opens one is chosen (the draft's §7).

## 4. Check: acceptance criteria, with evidence

**AC-1: DRAFT status line, base SHA and date at the head of the plan.**
Lines 3 and 5 of the draft: `STATUS: DRAFT — AWAITING OWNER APPROVAL`, `Base SHA 49bb62e`, `authored 2026-09-25`.

**AC-2: every §2 figure has its command beside it; two re-run.** Every §2 row has a *Command* cell. Re-run
after drafting, in the main tree at `49bb62e`:

```
$ git ls-files 'src/architecture/*.test.ts' | wc -l
      30
$ node -e 'console.log(Object.keys(require("./content/verification/provenance-fixture.json")).length)'
37
```

Both match §2 (30 specs; 37 fixture entries).

**AC-3: the §3 table is complete.** The source set is extracted from the three sources, and the table set
is extracted from the draft's §3 **first column only**:

```
{ awk 'NR>=223&&NR<=367' docs/04-report/phase-2-operational-dependability.report.md
  awk 'NR>=265&&NR<=317' docs/04-report/phase-3-evidence-grounding.report.md
  awk 'NR>=531&&NR<=594' docs/01-plan/phase-3-evidence-grounding.plan.md
} | grep -oE '\b(N|FU|OP)-[0-9]+' | sort -u > src-ids.txt          # 66 ids
awk -v a=<§3 line> -v b=<§4 line> 'NR>a&&NR<b' <draft> | grep -E '^\| ' \
  | cut -d'|' -f2 | grep -oE '\b(N|FU|OP)-[0-9]+' | sort -u > table-ids.txt
comm -23 src-ids.txt table-ids.txt      # → (empty)
comm -13 src-ids.txt table-ids.txt      # → N-86   (the one new id)
```

**The unnumbered residues are not caught by an id `comm`.** That is the class Phase 3's (c) review found
(P-03). They are checked by name instead: Live E2E BLOCKED(env), the `replaceFlags` residue, the
`[P3-X5]` wording, roadmap item 5's seam half, criteria parity (P-08) and the ruling's id-manifest
candidate. Each has its own row.

**AC-4: decisions are options only.** `grep -c "RULED" docs/01-plan/phase-4-product-completion.plan.md` → **0**.

**AC-5: every unit is typed, and every live unit carries a spend line.** All 18 unit rows have a *Type*
cell. The live units are U7 and U8, plus live paths inside U6 (D-5 (c) with retirement), U13 (catalog),
U15, U16, U17 (a) and U18 (font download). Each has a row in the draft's §7.

**AC-6: doc guards accept the new plan.** `npx vitest run src/architecture` passes (the gate figures are in §6
below). **Stated limit:** no spec reads `docs/01-plan/phase-4-*`, so this AC proves only that nothing broke.
The draft's §8 records that, and U1 is where a guard would begin reading the plan.

## 5. Act: what the check changed before landing

| Found | Change |
|---|---|
| §3's source-set size was written as **72** before the command ran; the command gives **66** | Corrected in the draft, and recorded in its §8 appendix |
| The base-SHA line named a feature branch that no longer exists after the fast-forward | Reworded to `main` |
| §2's ceiling row printed **OP-7** beside a command that prints **8**. OP-8 occurs in text as *"next free"* and was never issued | The row now prints the command's output. A second row carries the issued ceiling (OP-7) with its own command. Recorded in the draft's §8 |

## 6. Report: gate record

Every gate ran in a clean worktree (`../ssi-gate`, with no `.env.local` and `node_modules` symlinked) with that landing applied, in the same shape as CI.

- **Landing (1), `49bb62e`:** tsc 0 · lint 415 of 415, 0 errors · node 1563/120 · jsdom 130/24 · build 0 ·
  rendering OK · bundle OK (within 1%) · E2E 70 passed / 30 skipped · CI run `36107278768` **success**.
- **Landing (2):** tsc 0 · lint 415 of 415, 0 errors · node 1563/120 · jsdom 130/24 · build 0 · rendering OK · bundle OK (within 1%) · E2E 70 passed / 30 skipped · `npx vitest run src/architecture` 30 files / 443 tests (AC-6). CI: see the landing branch run.

*(The landing (2) line was written after that gate ran. The only later change is the text of this line, in a
file no guard reads.)*

---

## (b) Independent plan review — 2026-09-25

**Anchor** `6355a5d`, verified at session open. **Output:** `docs/reviews/phase-4-plan-review.md`. **The plan
is not edited in (b)**, and D-1…D-12 stay unanswered.

**Independence.** The review ran as a separate subagent. Its inputs were the plan, `docs/roadmap.md`,
`CLAUDE.md`, the Phase 3 report and closeout Check, and the repository at HEAD. It was **denied this
artifact** and the authoring session's record. It disclosed two incidental exposures, and neither read any
content of this file: an id-ceiling grep printed bare numbers, and `git show --stat` printed this file's
name. It re-derived AC-3 (66 ids, `comm` empty) without this file.

**Verdict: REVISE.** CRITICAL 0 · MAJOR 11 · MINOR 8 · OBSERVATION 1 (P-01…P-20). The headline items:
- **P-01:** §3's source set misses 13 open Phase 2 register rows, several triggered by Phase 4 units.
- **P-02:** D-4's options describe shipped behaviour.
- **P-03:** U3's "no `src/` path" proof is unsatisfiable, because generated modules are committed.
- **P-04:** U4 targets FU-31's scan scope; the fault is its taint model.
- **P-05:** D-1's runner is under-specified, and G's `next build` is itself a network call.
- **P-06:** the context-adjusted-evidence copy needs a fuller §2.1/§2.2 check.
- **P-08:** D-12 extends a Phase 1 exception that was never recorded.

**Clerk verification (brief AC-3).** Every load-bearing claim was re-run against the tree before recording
(the review's Disclosure 4). **Five figures or line references were corrected**, each item's substance
standing: P-02 has 15 404 sites, not 14; P-07's roadmap line is `:606`; P-08's quote is at `:265`; P-10's
callers are at `safety.test.ts:36,38,39`; P-18 has 17 coverage floors, not 14.

**Author's note, recorded rather than argued.** The review found real defects in this session's own draft.
P-01 repeats the exact boundary failure the Phase 3 report §9 had already named for FU-25. The draft
checked completeness only against a source set it had chosen itself. P-02 and P-04 describe code the draft
did not read. None is disputed here. Revision is the next landing's job, under a new brief.

**Length.** The review was first written at 305 lines and was condensed to 197 to meet the 250-line cap.
No item, evidence reference or action was dropped. A per-item field check was run after condensing, and
it added the Location lines missing from P-14, P-15, P-19 and P-20.

**Gate (b):** see the landing commit. `npx vitest run src/architecture` is AC-4.

---

## (c) Revision against the review — 2026-09-25

**Anchor** `e7e249c`, verified at session open. **Brief:** revise the draft against P-01…P-20, with no ruling. The brief was copied verbatim into the scratchpad resume notes as the first action. **Touched:** the plan and this section only. The review stays as recorded, and the plan stays **DRAFT**.

**What changed:** §3's source is now every issued id (**164**), not three sections. It gives 73 open, 91 closed and N-86 issued, and adds 13 open Phase 2 N rows, 2 partial ones (N-33, N-37), 15 open Phase 1 FU rows and F7. §4 gains *Size* and *May touch* columns, and a corrected owner-batch column. U3 and U4 are respecified. D-1 gets the runner specification. D-2, D-4, D-6, D-7, D-9 and D-12 are corrected. **D-13…D-16 are new** (P-03, P-12, P-18, and P-10's U9 decision). §7 carries the typing matrix. §9 dispositions P-01…P-20. **Nothing is answered.**

**AC evidence** (plan at the working tree):

```
AC-1  grep -c '^| P-[0-9][0-9] | \(ADDRESSED\|DECLINED\)' <plan>                                  → 20
AC-2  { seq -f 'N-%g' 1 85; seq -f 'FU-%g' 1 72; seq -f 'OP-%g' 1 7; } | sort > src-ids.txt      # 164
      awk '/^## 3\./{f=1;next} /^## 4\./{f=0} f && /^\| /' <plan> | cut -d'|' -f2 \
        | grep -oE '\b(N|FU|OP)-[0-9]+' | sort -u > table-ids.txt
      comm -23 src-ids.txt table-ids.txt → (empty)      comm -13 … → N-86
      open (rows without CLOSED) 73 + N-86 · closed (CLOSED rows, arrow targets stripped) 91 · overlap (empty)
AC-3  grep -c RULED <plan> → 0; decisions flagged "needed" → D-13 (P-03), D-14 (P-12), D-15 (P-18), D-16 (P-10 U9)
AC-4  wc -l <plan> → 354 (≤ 400) · this section ≤ 60
AC-5  npx vitest run src/architecture → 30 files / 443 tests passed
```

**Figures re-derived by command** (brief item 11): 15 `notFound` sites (`git grep -ho 'notFound("[^"]*")' … | uniq -c`: Stack 8 · Stack item 4 · Conversation 2 · Action 1). 17 coverage floors over 23 `src/lib` directories (`node -e` over `vitest.config.ts` against `readdirSync`). The roadmap line references were re-read with `sed -n`: `:606` for item 2, `:265` for ruling 3, `:14-15` and `:650-651` for the ordering rule. **One stale line reference in the review itself:** *"Size them at start"* is at `roadmap.md:649`, not `:647`. The plan's §8 records it; the review is not edited.

**Status method, and its limit.** "Open" was settled per id from the register cells, and from Phase 2 §4.3's prose for Phase 1's rows. A keyword scan could not do it: it marked N-30 and N-36 closed on the word "CLOSED" inside "OPEN as decisions, CLOSED as omissions". **The `comm` proves every issued id has a row. It does not prove each open/closed call is right.** Each CLOSED row names its record, so a reader can check any single call.

**Delta check (AC-6).** A fresh subagent was given **only** the review and the revised plan; `src/` was readable only to verify a cited line. **Run 1:** 16 CONFIRMED and 4 NOT. P-05: "sweep narrowing" was missing from the weakening definition. P-10: U15 × D-7 (d) was missing from D-1 (c). P-11: U8 × D-6 (d) had no size. P-13: (c) and (d)'s chip effects were ambiguous. All four were fixed in place. **Run 2, a fresh agent on the fixed plan:**

| Finding | Verdict | Plan line(s) |
|---|---|---|
| P-01 | CONFIRMED addressed | 49-112 |
| P-02 | CONFIRMED addressed | 210-214, 134 |
| P-03 | CONFIRMED addressed | 75-76, 126, 156, 257-261 |
| P-04 | CONFIRMED addressed | 72, 127 |
| P-05 | CONFIRMED addressed | 8, 118, 164-177 |
| P-06 | CONFIRMED addressed | 137, 189-191 |
| P-07 | CONFIRMED addressed | 136, 192, 293 |
| P-08 | CONFIRMED addressed | 106, 249-255 |
| P-09 | CONFIRMED addressed | 128-131, 137, 282-302 |
| P-10 | CONFIRMED addressed | 125-137, 167, 275-278 |
| P-11 | CONFIRMED addressed | 122-141, 195-208 |
| P-12 | CONFIRMED addressed | 133, 263-267 |
| P-13 | CONFIRMED addressed | 180-184 |
| P-14 | CONFIRMED addressed | 219-223 |
| P-15 | CONFIRMED addressed | 225-230 |
| P-16 | CONFIRMED addressed | 63, 112, 193 |
| P-17 | CONFIRMED addressed | 91 |
| P-18 | CONFIRMED addressed | 40-41, 151, 269-273 |
| P-19 | CONFIRMED addressed | 18, 153 |
| P-20 | CONFIRMED addressed | 36, 59, 140, 237 |

**0 NOT addressed.** Cross-checks X-a (no decision answered; `RULED` 0), X-b (every flagged decision has a D-n) and X-c (`comm` empty; N-86 only) passed. **Run 2 also reported consistency defects. All were fixed after it, in place, with no line added,** so §9's references stand. **May touch:** it now implicitly covers the tests beside listed files, the unit's own record, and the `SPEC_COUNT`-bound sites. It also names the paths it missed: `stack-item-repo.ts` for U10, `stack/ProductMatchPanel.tsx` for U13, `redact.ts` for U15, and `repo.test.ts` for U2. **D-1 (c)** now excludes U17 (b)/(c) and U11 × D-4 (a), with reasons. **U16 (a)** now has its own red proof. **References:** `:320-322` for ruling 5, and `:58` added to N-86's stale text. The N ceiling notes it prints 86 once N-86 is issued. The fixes were not re-reviewed by a third agent. Each was applied by an exact-match replace that fails if its target is absent.

**Gate (c)**, in a clean worktree (`../ssi-gate`, no `.env.local`, `node_modules` symlinked): tsc 0 · lint 415 of 415, 0 errors · node 1563/120 · jsdom 130/24 · build 0 · rendering OK · bundle OK (within 1%) · E2E 70 passed / 30 skipped. After the last plan edit: node 1563/120, `src/architecture` 30/443. CI: see the landing branch run.
