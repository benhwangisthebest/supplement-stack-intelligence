# p4-u0-coverage-gate — PDCA cycle artifact for Phase 4 U0

> **THIS DOCUMENT IS SUBORDINATE.** It mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md`
> §4 **U0**, and never replaces it. Where the two disagree, the register wins.
>
> **Unit** U0 · Local gate gains `test:coverage` · **SUPERVISED** · type deterministic · size S
> **Anchor** `4855ba6` (plan APPROVED, rulings D-1…D-16) · **Date** 2026-09-25 · **bkit feature** `p4-u0-coverage-gate`
> **Ruling in force:** D-15 (b), recorded as *"(b) add test:coverage to the local gate; verify:migrations read from
> branch CI. … The CLAUDE.md §5 change is NOT made here — it becomes a step in the unit that adds
> test:coverage (and stops for owner approval of the CLAUDE.md diff)."* Clarification Q3 makes that unit U0.

---

## 1. Plan

**Problem.** The plan's G already includes `npm run test:coverage` from U0 onward (plan `:8`), and CI runs it
(`.github/workflows/ci.yml:191`). But the list a person runs before declaring work done, `CLAUDE.md` §5
rule 10 (`CLAUDE.md:211`), names `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npx next build` and
`npm run verify:bundle`. It does not name `test:coverage`. That is N-29's asymmetry: the gate exists in
CI, and the person about to declare done is not told to run it.

**Scope.** One line of `CLAUDE.md` (§5 rule 10), staged **only after the owner approves the exact text**.
At closeout, the owner's rulings (i)–(iii) of 2026-09-25 go into the register. No threshold, script,
workflow or `src/` change.

**Success criteria.** The brief's AC-1…AC-6.

## 2. Design

The command is inserted after `npx vitest run`, where CI runs it (`CLAUDE.md:238-239`: *"The coverage step
was added by Phase 1 U13, between `vitest run` and `next build`"*). The attribution note copies the form of
the existing `verify:bundle` note (`CLAUDE.md:211`), and it is placed first, newest-first as that line
already orders its notes. **No guard binds rule 10's list.** DOC_TRUTH's `DECLARED_STEP_COMMANDS`
(`src/architecture/doc-truth.test.ts:172-195`) binds §5's CI-chain sentence, which already carries
*coverage thresholds*. The edit is therefore prose. It can neither satisfy nor break a test, and the owner's
approval of the text is the only control on it. `verify:migrations` stays CI-only (D-15 (b)).

## 3. Do — landing (a)

**Orient.** `graphify query "where is the §5 gate defined"` returned 77 nodes, and none was `CLAUDE.md` §5.
Its top matches were `GATED` and `GatewayConfig`. I fell back to reading the brief's named files:
`docs/roadmap.md:583` (Phase 4 IN PROGRESS), `docs/project-status.md:27-42` (CI and coverage), and
`vitest.config.ts:71-72` (*"branch coverage in this repository is not deterministic"*).

**AC-1, the premise. `npm run test:coverage` at `4855ba6`, twice in a row,** in a clean worktree
(`../ssi-gate`, detached at `4855ba6`, no `.env.local`, `node_modules` symlinked):

| Run | Exit | Files | Tests | All files: stmts · branch · funcs · lines |
|---|---|---|---|---|
| 1 | 0 | 144 passed | 1693 passed | 79.34 · 83.85 · 75.63 · 79.34 |
| 2 | 0 | 144 passed | 1693 passed | 79.34 · 83.85 · 75.63 · 79.34 |

Neither run printed a threshold error, and the all-files branch figure did not move between runs.

**AC-2, the diff.** The edit was applied to the working tree only and **not staged**:
`git diff --stat` → `CLAUDE.md | 2 +-`; `git diff --cached` → empty. It was shown verbatim to the owner.
**Landing (a) stops here until the owner approves that exact text.** An informational run of
`npx vitest run src/architecture` against the unstaged edit: 30 files, 443 tests passed.

## 4. Check

**Owner approval.** The owner approved the text **with one change**: in the new note, "(`CLAUDE.md:238-239`)" became
*(the §5 measured-baseline paragraph)*. The amended diff was shown once and then staged. `git diff --cached --stat`
→ `CLAUDE.md | 2 +-`. No other `CLAUDE.md` line changed.

| AC | Result | Evidence |
|---|---|---|
| AC-1 | **PASS** | `npm run test:coverage` ran twice at `4855ba6`: both exit 0 with 144/1693, and all-files 79.34 · 83.85 · 75.63 · 79.34 on both runs (§3) |
| AC-2 | **PASS** | The diff was shown verbatim, amended per the owner, and staged only after written approval |
| AC-3 | **PASS** | `npx vitest run src/architecture` with the edit staged → 30 files / 443 tests. DOC_TRUTH and CRITERIA_PARITY are green |
| AC-4 | **PASS** | U0 is DONE with evidence in the register. Ruling (i): U16's FU-17 half is SUPERVISED. Ruling (ii): the §1 phase-name line. Ruling (iii): **N-87** registered with its four corrections. `grep -c RULED` → 16. §3 `comm -23` → (empty), `comm -13` → N-86 |
| AC-5 | **PASS** | This artifact is under 200 lines; §4–§5 (the closeout) are under 150 |
| AC-6 | **PASS** | Full G, including `test:coverage`, in a clean worktree (below) |

**N-87 number check.** `git grep -ohE 'N-[0-9]+' -- docs CLAUDE.md | sed 's/N-//' | sort -n -u | tail -1` → **86**
before this landing, so **N-87** was the next free id. It is registered in the plan's §4 *Registered during
execution* table. It sits outside §3, because §3's source set is the pre-phase issued range and N-86 is
the only id §3 issues.

**G, the first run under the new definition** (`../ssi-gate`, detached `4855ba6` plus this landing's three files,
no `.env.local`, fresh `.next`): tsc 0 · lint 415 of 415, 0 errors · node 1563/120 · jsdom 130/24 ·
**test:coverage exit 0, 144/1693, all files 79.34 · 83.85 · 75.63 · 79.34** · build 0 · rendering OK · bundle OK
(within 1%) · E2E 70 passed / 30 skipped. `verify:migrations` is read from branch CI (D-15 (b)).

## 5. Report

**Done.** `CLAUDE.md` §5 rule 10 now names `npm run test:coverage`, in the owner's exact text. The rulings of 2026-09-25
are applied to the register. **Carried items retired:** none. **New finding:** N-87, corrected in the same landing.
**Limits:** no guard reads rule 10's list, so the owner's approval of the text is its only control. Graphify
did not locate §5 (§3). **Next unit: U1 (RUNNER),** the first under the runner specification: standing approval as
drafted, caps of 300 calls / 4 h.
