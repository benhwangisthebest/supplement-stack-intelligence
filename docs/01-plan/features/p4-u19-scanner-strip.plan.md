# p4-u19-scanner-strip — PDCA cycle artifact for Phase 4 U19

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U19**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U19 · Scanner-based comment stripping (+ two guard items) · **RUNNER** · deterministic · size S ·
> **Anchor** `3c52ab1` · **Date** 2026-09-29
> **Authority:** the standing approval in plan §6 D-1 runner specification item 1; caps of 300 calls / 4 h (item 8).
> The owner's runner clarifications RC-1…RC-5 and PARALLEL MODE (U20 runs at the same time) are in force. The runner
> records no ruling. **Opening check:** main CI run `36661140038` read once: `completed / success` on `3c52ab1`.

## 1. Plan

**Goal (the brief's):** `src/architecture/__testing__/strip.ts` uses TypeScript's parser instead of the heuristic;
every spec with a private stripper uses it; two more guards close. **Retires:** N-88 (all parts), FU-73, Q-18, FU-81.
**May touch:** `src/architecture/**` (existing files only; RC-1, SPEC_COUNT stays 30) · the plan's U19 row and the four
items · the decision queue · this file · bkit state.

## 2. Design

**The helper asks the parser (FU-73).** `ts.createSourceFile`, then every token is visited through `getChildren()`,
which re-scans with the parser's context (regex or division, JSX text, template continuations). The comments in front
of each token are collected with `ts.getTrailingCommentRanges` **and** `ts.getLeadingCommentRanges`: before the first
line break a comment is the previous token's trailing trivia, and the leading call starts after it. Two skips, each
load-bearing (mutants M2 and M3, §3): no trivia is read at a position where JSX text starts (the text, and the list that
wraps it, start there), and JSDoc nodes are not descended into (their positions are comment text).
**Language by file name.** `.tsx .ts .mts .cts .jsx .js .mjs .cjs .json`; without a name, TSX then TS, first with no
syntax error. **Unparseable source throws**, naming the file: a guard that silently mis-strips is the failure this
replaces. SQL is not lexed; its eight strippers stay (Q-20).
**Output shape.** A comment becomes one space plus the line breaks it held, so line structure survives block comments
too (U1's collapsed a multi-line block to one space). `blankComments` and `blankStringsAndComments` preserve length.
**Exports:** `commentRanges`, `stripComments`, `stripLineComments`, `blankComments`, `blankStringsAndComments`.

**Consumers moved onto it (AC-2), each passing its file name:**

| Site (at `3c52ab1`) | Was | Now |
|---|---|---|
| `e2e-live-tagging.test.ts:162` (`stripStringsAndComments`, deleted) | unanchored `//` blanked before strings (N-88 (1)) | `blankStringsAndComments` in `parseBlocks` |
| `boundaries.test.ts:761` (tsconfig) | anchored `^\s*//` | `stripComments(…, "tsconfig.json")` |
| `middleware-scope.test.ts:135` · `nav-pillars.test.ts:56` · `rendering-determinism.test.ts:49` · `ui-error-text.test.ts:98` | block regex + anchored | `stripComments(…, file)` |
| `migration-tooling.test.ts:50` (`jsCode`) · `route-contract.test.ts:128` | block regex + anchored | `stripComments(…, relative)` |
| `not-configured-totality.test.ts:154` (private `stripLineComments`, deleted) | anchored `^\s*//[^\n]*` | `stripComments(ts, file)` |
| `schema-type-drift.test.ts:301` | unanchored `//.*$` per declaration | `blankComments(raw, file)` over the whole source |
| `doc-truth.test.ts:242`, `:306` | U1 `stripLineComments` only (N-88 (2)) | `stripComments(…, f)`: block and JSDoc text no longer feed the title and token universes |
| `boundaries.test.ts`, `five-xx-is-logged.test.ts`, `not-found-uniformity.test.ts`, `e2e-live-tagging.test.ts:507` | shared helper, no name | the same helper, now given the file name |

**Left in place, with the reason:** eight SQL `--` strippers: `export-coverage.test.ts:58`, `migration-tooling.test.ts:43` (`sqlCode`), `repo-scoping.test.ts:70` and `:85`, `rls-coverage.test.ts:126`, `schema-type-drift.test.ts:112`, `sql-function-registry.test.ts:118` (all under `src/architecture/`, lines at `3c52ab1`). The TypeScript parser cannot lex SQL. `not-found-uniformity`'s `notFoundSites` keeps its regex
over the helper's output (fixtures carry no file name, so the TSX-then-TS fallback applies).
**No spec turned red** on the real tree when moved, so no queue entry was needed under AC-2's rule.

**Q-18 → `NO_FONT_FETCH`** (`boundaries.test.ts`, beside `RETIRED_PACKAGE`): over every tracked JS/TS file under `src/`,
tests included, no `extractEdges` specifier is `next/font/google` or below it. Anti-vacuity: ≥ 100 files, and the
layout's `next/font/local` import must be visible to the same scan.
**FU-81 → `notFoundShape`** (`not-found-uniformity.test.ts`), an AST pass beside the message scan: (i) a `403` numeric
literal or a `"FORBIDDEN"` string in a route that answers 404; (ii) a 404 site with an argument beyond its message
(`notFound(x, …)`, `fail(…, …, 404, details, id)`), and a `fail(…, …, 404)` whose code is not `"NOT_FOUND"`; (iii)
`notFound`/`fail` used other than as a call's callee (`const nf = notFound`, `handler(fail)`, `respond.notFound` as a
value). Import specifiers, property names (`{ fail: true }`, `r.fail`) and namespaced calls are not references. The
real tree has none of the three (measured: no `403` or `FORBIDDEN` in any route; every 404 is `notFound("<literal>")`).
**Stated limits:** a 403 through an imported constant or a computed status is not seen by (i); a wrapper function with
its own name is a message (iii) does not track. The header lines Q-13 proposes to change (`:17-18`, `:29-34`) are
**not** edited: Q-13 is unanswered.

## 3. Check — evidence

**AC-1 — self-tests.** The five pre-existing STRIP_COMMENTS tests (`five-xx-is-logged.test.ts`, including the seven
adversarial inputs) pass **unmodified**. **U1's known backtick limit now passes:** `if (x) /\`/.test(s) ? a() : b(); //
handle(` and `<p>use a \` here</p>; // handle(` keep `handle(` under U1's helper and lose it under U19's. That is pinned
by a new test, one of eight added (they include N-88's two shapes, line preservation, JSON, the blanker, JSX/JSDoc text,
and the throw).

**AC-1 — old-vs-new diff.** Over the tracked tree at `3c52ab1` (the source fixed, only the stripper varied): `git ls-files
src scripts` = **394** files, **390** lexed (4 skipped: `.css`, `.woff2`), **0** parse failures. `stripComments`:
**246** identical · **127** differ in whitespace only (379 multi-line block comments now keep their line breaks) · **17
files** differ in substance (whole-file comparison, whitespace collapsed). Their lines, classified by direction (old line
⊇ new, or new ⊇ old); a false block that collapsed several lines also shifts the lines after it, so a few counts include
alignment artefacts. **Corrected on review (finding 2):** the first draft counted 629 lines over all files, and put 104
lines of `auth-coverage` and `schema-type-drift`, which differ in whitespace only, in the first row.

| Class | Lines | Where |
|---|---|---|
| U1 **kept comment text as code** (a `/**/` or `/*` inside a line comment or path closed a false block; a backtick in comment text then opened a false template) | 55 | all `src/architecture/`: boundaries 53, error-disclosure 2 |
| U1 **hid code** (a `/*` in a line comment or string opened a block running to the next `*/`) | 465 | **95 in `src/` non-test = exactly N-88's five files:** `model-adapter.ts` 16, `repo.ts` 6, `advisor-action-repo.ts` 38, `openai/config.ts` 2, `advisor-actions.ts` 33. 371 in `src/architecture/` (boundaries 214, doc-truth 60, sql-function-registry 40, criteria-parity 17, canonical-layout 8, error-disclosure 7, e2e-live-tagging 7, not-found-uniformity 6, rls-coverage 6, rule8 5) |
| U1 **corrupted a string literal** holding `/* … */` or `/**/` | 4 | `boundaries:1682`, `five-xx-is-logged:355`, `not-found-uniformity:237`, `route-contract:143` |

Nothing differs in `scripts/`. `stripLineComments` (doc-truth's function until U19): 6 files, **48** lines, **all** U1 keeping a
`//` comment after a misread backtick, none hiding code: boundaries 15, nav-pillars 18, rule8 9, not-found-uniformity 3,
`src/lib/api/redact.ts` 2, U1's own `strip.ts:65` 1. Scripts, per-line listing and classifier: the unit's scratchpad
(`diff.mts`, `classify.mts`); rerunnable over any tree.

**Red proofs** (RC-2: scratch worktree at `3c52ab1`, `node_modules` symlinked; every file restored by copy, checked with
`cmp`; the scratch tree ended with `git status` empty). "HEAD" = the anchor's files; "U19" = the unit's files copied in.

| # | Plant / mutation | HEAD | U19 |
|---|---|---|---|
| P1 (AC-2) | `export const PLANTED_MODEL_ID = "gpt-4o-mini";` inserted after each N-88 site line, in all five files | NO_PINNED_MODEL_ID **passed** (all five missed) | **failed**, listing all five files |
| P2 (AC-2) | `const PLANTED_GLOB = "src/lib/*"; export const PLANTED_MODEL_ID = "gpt-4o-mini"; const PLANTED_END = "*/";` in `src/lib/openai/client.ts` | passed (the glob's `/*` ate the id) | **failed** |
| P3a (AC-3) | `import { Inter } from "next/font/google";` at the top of `src/app/layout.tsx` | passed (no guard) | NO_FONT_FETCH **failed** |
| P3b (AC-3) | `import "next/font/google";` in `src/lib/api/respond.test.ts` | passed | **failed** |
| P3c control | the same specifier in a `//` comment and a string in `layout.tsx` | passed | **passed** (a mention is not an import) |
| P4 (i) (AC-4) | item route PATCH, second check → `fail("FORBIDDEN", "Stack item not found.", 403)` | NOT_FOUND_UNIFORMITY 5/5 **passed** | **FU-81 (i) failed** (only it) |
| P4 (ii) | → `fail("NOT_FOUND", "Stack item not found.", 404, { which: "item" })` | passed | **FU-81 (ii) failed** (only it) |
| P4 (iii) | → `const nf = notFound;` then `return nf("Item")` | passed | **FU-81 (iii) failed** (only it) |

**Mutants of the new code** (U19 state; each killed): M1 drop `getTrailingCommentRanges` → 6 STRIP tests red, including
3 of the 5 originals · M2 drop the JSX-text skip → 1 red · M3 drop the JSDoc skip → 1 red · M4 blanker without
literals → 1 red · M5 no throw on a syntax error → 1 red · M6 comment → one space (lines collapse) → 1 red · M7 U1's
helper under U19's tests → **the 8 new tests go red, the 5 originals pass** · M8 `parseBlocks` back on its private regex
→ the new N-88 (1) test red. M2 was found by writing its test: the first version of the helper stripped
`<p>// not a comment</p>`; the fix is the position set.

**AC-5 — counts.** Per-file `it(`/`test(`/`describe(` occurrences, before → after: boundaries 70 → 72,
e2e-live-tagging 42 → 47, five-xx-is-logged 31 → 41, not-found-uniformity 17 → 23; every other file unchanged. The
only lower figure is `__testing__/strip.ts` 2 → 0, and both were `/regex/.test(c)` calls in U1's code, not test blocks;
the diff removes no `it(`, `test(` or `describe(` block. `npx vitest run src/architecture`: **30 files, 534 tests**
(518 at the anchor: +8 STRIP_COMMENTS, +1 LIVE_TAGGING, +1 NO_FONT_FETCH, +6 NOT_FOUND_UNIFORMITY). No allowlist, exemption list or pathspec changed.

## 4. Queue entries raised

**Q-20** (eight SQL `--` strippers in seven specs, N-79's class in SQL; exposure zero today). Non-blocking.

## 5. Review and gate

**AC-6 — independent review.** A fresh subagent, on a separate worktree (`3c52ab1` + the staged diff), with the U19 row,
the diff, the plan and the brief. **Verdict: PASS WITH ADVISORIES**, no BLOCKING finding. It ran the architecture suite
(30 files, 534), `tsc` and `eslint` (clean), and reproduced red for AC-2, AC-3 and AC-4 and M7. It checked `strip.ts`
against an independent parser oracle (token sequence, token lines, no residual trivia, blanker lengths) on all 390
lexable tracked files and 25 adversarial inputs: it passed. It found no weakened guard, no file outside *May touch*, the
Q-13 header lines byte-identical, and no ruling recorded. **Advisories, both applied before landing:** (1) Q-20 named
2 SQL strippers; there are 8 in 7 files. (2) The AC-1 table misclassified 104 whitespace-only lines (corrected in §3).
**Notes, not acted on:** `parseErrors` reads the internal `sf.parseDiagnostics`, so a TypeScript upgrade that removed
it would make every guard fail loudly, not silently; `NO_FONT_FETCH` does not match `@next/font/google` (absent since
Next 15, and it could only return through `package.json`, a stop class); FU-81 (i)/(ii) do not see a non-literal status
or a 404 built without `notFound`/`fail` (the latter is the existing guard's scope).

**AC-7 — G on the staged tree** in a clean worktree (`3c52ab1` + the staged index, no `.env.local`,
`NEXT_TELEMETRY_DISABLED=1`): `tsc` 0 · lint 430 of 430, 0 errors · `vitest run` 2005/2005 across 150 files ·
`test:coverage` exit 0 · `next build` exit 0 · `verify:bundle` OK · `verify:rendering` OK · E2E 70 passed, 30 `[LIVE]`
skipped. No floor edited. G ran before the two advisory fixes, which change documents only; the doc guards were rerun
after them.
