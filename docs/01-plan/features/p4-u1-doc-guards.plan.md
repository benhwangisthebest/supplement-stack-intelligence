# p4-u1-doc-guards — PDCA cycle artifact for Phase 4 U1

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U1**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U1 · Doc-guard instrumentation · **RUNNER** · deterministic · size L · **Anchor** `66e6804` · **Date** 2026-09-25
> **Authority:** the standing approval in plan §6 D-1 runner specification item 1; caps of 300 calls / 4 h (item 8).
> Owner clarifications C-1…C-4 (2026-09-25) are in force; the runner records no ruling, and they are written into
> the plan at U2's closeout. **Deviation, recorded:** U1 ran in the session that authored the plan and U0, not a fresh
> one (item 8). The owner pasted the brief there after being told this.

## 1. Plan

**Goal (the brief's):** make the document guards derive what they check from the specs themselves and from one declared
row shape, so a register or roadmap edit cannot drift past them. **Retires:** N-85, FU-42, FU-45, FU-46, FU-47 and N-79.
**May touch:** `src/architecture/**` (existing specs extended, plus one non-test helper), the plan's U1 row and closed
items, this file, and `docs/01-plan/phase-4-decision-queue.md`. **No new spec file** (C-1): SPEC_COUNT stays 30.

## 2. Design, a paragraph per guard

**N-85 (DOC_TRUTH).** `guardTokensIn` now also resolves `describe(` titles, which fixes N-85 (ii). The unenforced-marker check
reads the `it`/`test`/`describe` titles of **every** spec through `titlesIn`, not just `boundaries.test.ts`'s `it`
titles, which fixes N-85 (i). Rule 7's marker, `CLIENT_PROPS`, named a guard that never existed; it is now
`CLIENT_TAKES_PROPS`, and a new rule fails any marker that names no existing guard title, so the map cannot rot silently
again. The title and token universes are read after `stripLineComments`, so a mention of a guard in a comment, or in this spec's own fixtures, cannot satisfy the check (review #1, MAJOR 1).

**FU-46 (REGISTER_ROW_SHAPE).** One declared section, `**Registered during execution.**`, holds one declared header,
`| Id | Finding | Corrected |`, and one row shape: a bold id, optional italic provenance, and three non-empty cells. Any
register id on a non-row line in that section is reported as malformed, which catches FU-46's dated headings, bullets and
blockquotes. Ids must be unique and contiguous per prefix. It reads plans numbered 4 and above only, so earlier plans are
read tolerantly and never rewritten (C-4). N-86, issued in the Phase 4 plan's §3 at landing (a), predates the shape and sits
outside it.

**FU-42 (CRITERIA_PARITY).** `[~]` is a third state: parsed, counted, and treated as not ticked. Tick parity compares states.
A `[~]` must say `PARTIAL` and then give at least 20 characters of reason, on its line or on its indented continuation.
A new Phase 4 block binds `[P4-X1]`…`[P4-X3]` between plan §5 and the roadmap, excludes `[P4-X4]`…`[P4-X8]` **by name**
(Phase 3 excluded X6–X9 the same way), and checks that no plan-only id appears in the roadmap. Wording is not compared.

**FU-45 (ARTIFACT_CAP).** It lives in the same spec file as AC-3, per the brief's AC-4. The file set is
`git ls-files docs/01-plan/features/*.plan.md`, pinned non-empty. The cap is 200 lines. The 14 files over 200 at `66e6804`
are pinned by name at that length on a shrink-only list: none may grow, and an entry must be removed once its file is untracked or back under
200.

**FU-47 / N-79 (the shared stripper).** It is **not** the anchored `/^\s*\/\/.*$/gm` the register proposed, and this is recorded as
queue entry Q-2. That form was measured first: over the 337 tracked `src/` and `scripts/` files it would stop stripping
**285 trailing comments**, so a presence check (`handle(`) could be satisfied by a comment. `src/architecture/__testing__/strip.ts`
instead strips a `//` comment wherever it starts outside a string, template or regex literal. Compared line by line
with the pre-U1 regex, the **only 96 lines that differ** are literals containing `//` (94 URLs and strings, 2 regex
literals), so on the tree it reveals code and hides nothing new. No file's line count changes. **After review** it was hardened: keywords and `=>` count as regex preceders, and an unterminated quote or regex falls back to stripping the first `//` not after a `:`. Seven adversarial constructs are pinned as self-tests. One stated limit remains, a misread backtick (Q-2). The helper sits under `__testing__/`, the repository's
convention for helpers shared between tests (`src/lib/db/__testing__/`, excluded from coverage at `vitest.config.ts:59`),
rather than the brief's example `_shared/`.

## 3. Do

**Orient.** `graphify query "how does doc-truth derive its tokens"` returned `doc-truth.test.ts` as its first node. I then read
`docs/roadmap.md:583` (Phase 4 IN PROGRESS) and `docs/project-status.md`. **Inventory, measured:** the non-anchored strippers are at
`boundaries.test.ts:1292`, `five-xx-is-logged.test.ts:202` and `:278`, and `not-found-uniformity.test.ts:79`; the register's line numbers had drifted.
Two more were never listed: `e2e-live-tagging.test.ts:162` (N-79's class) and `schema-type-drift.test.ts:301` (a trailing-comment
strip on one interface line, which is correct by design). **N-88** registers the gap.

**Red, then green.** Each mutation was made in a file copy's place, restored from the backup, and verified with `cmp`. Nothing used `git checkout`.

| Guard | Mutation | Before U1 | After U1 |
|---|---|---|---|
| N-85 D1 | `CLAUDE.md` rule-7 row status set to `Not enforced` | **green**, `Tests 22 passed (22)`: N-85 reproduced | **red**: `rule 7: §4 says not enforced, but CLIENT_TAKES_PROPS: exists` |
| N-85 D2 | `` `CLIENT_TAKES_PROPS` `` backticked in the rule-7 row | **red**: `cites guard token(s) that exist nowhere in src/architecture/` | **green**, `Tests 29 passed (29)` |
| marker rot | rule 7's marker set back to `CLIENT_PROPS` | (rule did not exist) | **red**: `marker(s) naming no existing guard title: rule 7: CLIENT_PROPS` |
| FU-46 | `\| N-88 \| a planted row with no bold id \| x \|` under N-87 | (guard did not exist) | **red**: `register line(s) outside the declared shape … \| N-88 \| a planted row with no bold id \| x \|` |
| FU-42 | `- [~] A planted partial criterion with no explanation.` in roadmap Phase 4 | pre-U1 regex skipped `[~]` lines | **red**: `unexplained partial criterion(s): A planted partial criterion with no explanation.` |
| FU-45 new | 201-line `zz-u1-planted.plan.md` | untracked: **green**, 19/19 (the guard reads `git ls-files`) | `git add -N`'d: **red**, `…zz-u1-planted.plan.md: 201 lines` |
| FU-45 grandfathered | one line appended to `phase4-plan.plan.md` | (guard did not exist) | **red**: `phase4-plan.plan.md: 265 lines, pinned at 264` |
| FU-47 / N-79 | helper body reverted to the pre-U1 regex | (helper did not exist) | **red**, 2 failed: the URL case and the regex-literal case |
| M1 fix | both `describe("CLIENT_TAKES_PROPS —` titles in `client-props.test.ts` renamed | **green** before the fix: the name in doc-truth's own comments satisfied it (review #1) | **red**: `marker(s) naming no existing guard title: rule 7: CLIENT_TAKES_PROPS` |

The first STRIP_COMMENTS case also keeps the contrast executable: `PRE_U1(src)` does not contain `handle(`, while
`stripComments(src)` does.

## 4. Check

| AC | Result | Evidence |
|---|---|---|
| AC-1 | **PASS** | D1 and D2 in §3; `npx vitest run src/architecture/doc-truth.test.ts` → 29/29 |
| AC-2 | **PASS** | FU-46 row in §3; the Phase 4 register (N-87, N-88) conforms |
| AC-3 | **PASS** | FU-42 row in §3; `criteria-parity.test.ts` → 19/19; X4–X8 excluded by name |
| AC-4 | **PASS** | FU-45 rows in §3 |
| AC-5 | **PASS** | No code copy of the private `.replace(/\/\/[^\n]*/g` remains in the three files; the one grep hit is a U33 history comment at `boundaries.test.ts:1203`, kept (§7). `npx vitest run src/architecture` → 30 files / 465 tests |
| AC-6 | **PASS** | Counts below; no file lower. SPEC_COUNT: `spec-count.test.ts` 5/5, 30 specs |
| AC-7 | **PASS** | two reviews, both PASS (§5) |
| AC-8 | **PASS** | G green on the staged tree (§5) |

**Per-file `it(`/`test(`/`describe(` counts** (a grep, the same method before and after; it also counts calls quoted inside self-test
fixtures). **506 → 549.** Every other spec is unchanged.

| Spec | Before | After |
|---|---|---|
| `criteria-parity.test.ts` | 10 | 24 |
| `doc-truth.test.ts` | 37 | 56 |
| `five-xx-is-logged.test.ts` | 15 | 25 |

**Grandfather list, pinned at `66e6804` (lines):** architecture-boundary-repair 527 · context-adjusted-evidence 399 · mvp-core-loop 330 ·
p3-u10-rule8-tests 517 · p3-u2-corpus-migrates 217 · p3-u7-coverage-honesty 282 · p3-u8-bundle-budget 398 · p3-u9-rule7 249 ·
phase3-closeout 573 · phase3-plan 239 · phase4-plan 264 · product-match 286 · protocol-builder 292 · u31-openai-first-party 426.

**Register:** U1 is DONE. N-85, FU-42, FU-45, FU-46, FU-47 and N-79 are CLOSED, with file:line evidence in their §3 rows.
**N-88** and **N-89** are registered, both OPEN. `grep -c RULED` → 16; §3 `comm -23` → (empty), `comm -13` → N-86.
**Queue entries written:** Q-1 (C-2 pins the file U14a revises), Q-2 (the stripper's shape and its known limit) and Q-3 (`CLAUDE.md` §5's baseline differs from the tree). None blocks U1.

## 5. Report

**AC-7, independent reviewer (item 6).** Fresh subagents were given the U1 row, the staged diff without this artifact, and the plan. They
were denied this file and the session's record.
- **Review #1: PASS.** It raised two MAJORs, both fixed and red-proven. **M1:** the marker and token universes could be satisfied by
  doc-truth's own comment and fixture text. **M2:** the stripper could keep a real comment on adversarial input. Its MINORs are
  also fixed: N-88's predicate and live exposure, N-89 for FU-46's residue, and the Goal cell.
- **Review #2** (fresh, on the fixes): **PASS.** It demonstrated M1 fixed by renaming the real guard and seeing red. It
  confirmed, against the TypeScript parser over 376 files, that every stripped line comment matches exactly. It raised one
  new MAJOR: a misread backtick still keeps comments. That was fixed for `=>` and for a `//` with no space before it, pinned,
  and the remaining `)`/JSX-backtick case is stated as a known limit in the helper and in Q-2. It also raised MINORs, now
  fixed: Q-3's counts, `strip.ts` containing the very sequence N-88 names, the JSDoc residue added to N-88, and the citation
  ranges. **These round-3 fixes were not re-reviewed**; the stripper tree measurement after them is unchanged (96 lines, all literals).

**AC-8, G on the staged tree** (a clean worktree at `66e6804` with the index applied, no `.env.local`), run after the last source
edit: tsc 0 · lint 416 of 416, 0 errors · node 1585/120 · jsdom 130/24 · **test:coverage exit 0, 144/1715, all files
79.34 · 83.85 · 75.63 · 79.34** (the same as U0, and no floor changed) · build 0 · rendering OK · bundle OK (within 1%) ·
E2E 70 passed / 30 skipped. `verify:migrations` is read from branch CI (D-15 (b)).

**Caps (item 8):** about 85 tool calls and 1 h 55 m at commit, against 300 calls / 4 h. **Stops hit:** none. **Carried:** N-88 and N-89
(OPEN), and Q-1…Q-3 await the owner. **Next:** U2 (SUPERVISED).
