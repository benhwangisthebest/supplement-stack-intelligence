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
