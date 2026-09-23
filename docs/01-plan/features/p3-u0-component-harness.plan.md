# p3-u0-component-harness — PDCA cycle artifact for Phase 3 U0

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U0**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U0** (`:131–133`, status APPROVED),
> under owner ruling **D-1(a)**. This file mirrors the register and does not replace it. Where the two
> disagree, the register wins.
>
> **Feature**: `p3-u0-component-harness` · **Base SHA**: `4e06cd1` · **Date**: 2026-09-23 ·
> **Type**: deterministic (no network except the npm registry for the three devDependencies below)

---

## 1. Scope

A `.test.tsx` runs under jsdom in a second vitest project. `HARNESS_GAP` is retired and replaced by a
guard that no tracked test file can go uncollected. The node suite does not change. **U-DEFER-4 is
RE-SCOPED, not closed**: the harness exists, and writing the deferred `.tsx` tests is **U7**'s job.

## 2. Plan — what was true at `4e06cd1` (each re-read at HEAD)

| Claim | Evidence |
|---|---|
| vitest collects `.ts` only, under node | `vitest.config.ts` `environment: "node"`, `include: ["src/**/*.test.ts"]` |
| `HARNESS_GAP` was one `it`, reading the **first** `include:` in `vitest.config.ts` by regex, over `src/` only | `boundaries.test.ts:570–611` at `4e06cd1` |
| It checked `/\.test\.tsx?$/`, so `.test.ts` as well as `.tsx` | same, `:601–602` |
| vitest `2.1.9` has no inline `projects`; `workspace` is a file path | `node_modules/vitest/dist/chunks/reporters.nr4dxCkA.d.ts:1896–1898` |
| CI runs `npm test` and then `npm run test:coverage`, on Node `"20"` | `.github/workflows/ci.yml:162–163`, `:181–182`, `:129–133` |
| No `.test.tsx` is tracked | `git ls-files '*.test.tsx'` → empty |
| `CollapseToggle` has no imports at all | `src/components/ui/CollapseToggle.tsx:1–39` |
| Baseline: **115 files / 1456 tests**. Coverage lines 63.65% (9330/14657), branches 84.74% | `npx vitest run` and `npx vitest run --coverage`, run at `4e06cd1` |

**Stop-condition check: does `HARNESS_GAP` guard anything besides `.test.tsx` collection?** Yes, but only
in form. Its regex also matched `.test.ts`. At HEAD that half could never fire, because
`src/**/*.test.ts` matches every `.test.ts` under `src/`. It would have fired only if `include` were
narrowed. **The replacement keeps that half** (§3, rule (c)), so retiring the old guard loses nothing.
**Owner ruling (2026-09-23): accepted as covered by `TEST_COLLECTION`.**

## 3. Design

**Projects** (`vitest.workspace.ts`): `node` is `vitest.config.ts` itself. The only change there is
`name: "node"` (`vitest.config.ts:14`). `jsdom` **spreads** the base config (alias, `unstubEnvs`) and
overrides `name`, `environment`, `include: ["src/**/*.test.tsx"]` and `esbuild.jsx`
(`vitest.workspace.ts:21–28`). Coverage stays configured once, in `vitest.config.ts`, and covers both
projects.

- **Spread, not `extends`.** It was tried first. vitest concatenates `include` arrays on `extends`, so
  `npx vitest list --project jsdom --filesOnly` listed **116** files: all 115 node files plus the smoke
  test. Every node test would have run twice, once under jsdom.
- **`esbuild: { jsx: "automatic" }` is load-bearing.** Without it, the smoke test fails with
  `ReferenceError: React is not defined`, because tsconfig's `"jsx": "preserve"` belongs to Next and was
  not touched. No React plugin was added.

**Guard `TEST_COLLECTION`** (`src/architecture/boundaries.test.ts:570–654`) replaces `HARNESS_GAP` in
the same place, one `it` for one. It **imports** `vitest.workspace.ts` and `vitest.config.ts` rather than
regex-reading config text. Then:
(a) the projects are exactly `{node, jsdom}`, with environments `node` and `jsdom`;
(b) a workspace entry that uses `extends` throws, because the guard reads *declared* includes and cannot
see the merge;
(c) every tracked `*.test.ts(x)` anywhere in the repository, plus every `isTestPath` file under `src/`,
must be collected by its own project (`.ts` → node, `.tsx` → jsdom) and **not** by the other one.
It keeps `HARNESS_GAP`'s split-on-`**/` glob matcher and its NUL-byte rationale verbatim.

**devDependencies (AC-7), each pinned exact:**

| Package | Pin | Why it is needed |
|---|---|---|
| `jsdom` | `26.1.0` | The environment. The **26** line is used because its `engines` is `node >=18`. jsdom 27 needs `^20.19.0` and jsdom 30 needs `^22.22.2`, and CI pins only `node-version: "20"` |
| `@testing-library/react` | `16.3.3` | `render`/`screen`/`fireEvent`. U7 will use it, and its peers allow React 19 |
| `@testing-library/dom` | `10.4.2` | A **required peer** of RTL 16 (`^10.0.0`), which RTL no longer bundles |

`package-lock.json`: **+645 / −0**, so no existing resolution moved. There is no `jest-dom`: the smoke
test asserts on attributes directly.

## 4. Do

1. Smoke test `src/components/ui/CollapseToggle.test.tsx`: renders the toggle, asserts
   `aria-expanded="false"` on the `Expand Protocol` button, clicks it, asserts `onToggle` ran once.
   Nothing is mocked. This is the harness's own proof, not a U7 test.
2. `npm install --save-dev --save-exact` the three packages above.
3. `vitest.workspace.ts` (new) and `name: "node"` in `vitest.config.ts`.
4. `HARNESS_GAP` → `TEST_COLLECTION`, spliced between the same two anchors.

## 5. Check — every figure below was re-run on this tree

**AC-3 causality, three runs.** The smoke test was staged with `git add -N`.

```
(i) HEAD config + staged .test.tsx
$ npx vitest run src/components/ui/CollapseToggle.test.tsx
include: src/**/*.test.ts
No test files found, exiting with code 1
$ npx vitest run src/architecture/boundaries.test.ts -t "collects every tracked test file"
AssertionError: HARNESS_GAP: these files are tracked but not matched by vitest include;
+   "src/components/ui/CollapseToggle.test.tsx",
      Tests  1 failed | 61 skipped (62)
(ii) jsdom project added, HARNESS_GAP kept
$ npx vitest run --project jsdom
 Test Files  1 passed (1)      Tests  1 passed (1)
$ npx vitest run --project node src/architecture/boundaries.test.ts -t "collects every tracked test file"
AssertionError: HARNESS_GAP: these files are tracked but not matched by vitest include;
+   "src/components/ui/CollapseToggle.test.tsx",
(iii) HARNESS_GAP retired, TEST_COLLECTION in its place
$ npx vitest run
   ✓ architecture boundaries — harness sanity > TEST_COLLECTION: every tracked test file is collected by exactly its own project
 Test Files  116 passed (116)      Tests  1457 passed (1457)
```

In (ii), the test runs but `HARNESS_GAP` still fails. That shows the block came from the gap guard, not
from vitest failing to collect the file: once a project collected the file, only the guard still
objected.

**AC-1.** `npx vitest run --project node` → **115 files / 1456 tests**, which is exactly the baseline.
`--project jsdom` → **1 / 1**.

**AC-4 and the other mutation proofs.** Planted files were unstaged (`git rm --cached`) and deleted; config
mutations were restored from a file copy, never with `git checkout`. The guard is green after each restore.

| # | Mutation | Red output (verbatim) |
|---|---|---|
| AC-4 | plant tracked `tests/Planted.test.tsx` (outside `src/**/*.test.tsx`) | `"tests/Planted.test.tsx — not collected by jsdom"` · `1 failed` |
| M-a | delete the jsdom project from the workspace | `expected [ 'node' ] to deeply equal [ 'jsdom', 'node' ]` |
| M-b | jsdom project written with `extends` (the construct that was observed to double-collect) | `Error: TEST_COLLECTION: a workspace entry uses \`extends\`, whose include merge this guard cannot see` |
| M-b′ | jsdom include also lists `src/**/*.test.ts` | `src/app/api/account/export/route.test.ts — also collected by jsdom` (and every other node file) |
| M-c | plant tracked `src/lib/Planted.spec.ts` | `"src/lib/Planted.spec.ts — not collected by node"` |

After each restore: `Tests  1 passed | 61 skipped (62)`. AC-4, M-c and M-b′ would each have passed
under `HARNESS_GAP`. AC-4's file is outside `src/`, M-c's is a `.spec` file, and M-b′ collects files
twice rather than zero times.

**AC-5 coverage.** `npm run test:coverage` (the CI step) → **exit 0**, and no threshold was edited. **The
jsdom project is INCLUDED in coverage**, because coverage is root-level in a workspace. Node-only
coverage (`--project node --coverage`) was compared with the baseline's `coverage-summary.json`: **0
differing entries**. Combined, only two entries differ: `src/components/ui/CollapseToggle.tsx`, which
was previously uncovered, and the total (lines 63.65 → 63.86%). Global branches go 84.74 → **84.67%**,
because the component's branches now count. That figure has no threshold; every threshold is a
`src/lib/**` glob.

**AC-6.** `git ls-files src/architecture | grep -c '\.test\.ts$'` → **28**, unchanged: the swap stays
inside `boundaries.test.ts`. `npx vitest run src/architecture/spec-count.test.ts` → **5 passed**. No
bound doc site needed an edit.

**AC-7.** `git diff HEAD -- package.json` → the three `devDependencies` lines above. Nothing else.

**Gate (§5.10 + e2e):** `npx tsc --noEmit` → exit 0 (its file list includes `vitest.workspace.ts` and
the smoke test) · `npm run lint` → **377 of 377** tracked source files, 0 errors (with
`vitest.workspace.ts` staged) · `npx vitest run` → **116 / 1457** · `npx next build` → exit 0 ·
`npm run test:e2e` → **70 passed / 30 skipped**, exit 0 · NUL bytes in the six edited files → **0**.

## 6. Findings (numbers re-derived: highest in `docs src CLAUDE.md` was N-82 / FU-49)

- **N-83 — CLOSED by U0.** `HARNESS_GAP` had three holes: it scanned `src/` only, it trusted the first
  `include:` in one file's text, and it ignored `*.spec.ts(x)` under `src/`, which `isTestPath` skips.
  The mutations AC-4, M-c and M-b′ above are those holes, and `TEST_COLLECTION` fails on each.
- **FU-50 — open, owner call.** `@vitejs/plugin-react` is a declared devDependency that is installed and
  referenced by no tracked file (`git grep -n "@vitejs/plugin-react"` hits only `package.json:41` and `package-lock.json`). U0
  did not use it and did not remove it.
- **FU-51 — open, docs.** Prose still describes `HARNESS_GAP` as live, in files outside U0's
  may-touch list: `src/architecture/ui-error-text.test.ts:20`, `src/architecture/nav-pillars.test.ts:20`,
  `docs/roadmap.md:193,203,505`, `docs/project-status.md:543`. These need a dated annotation (§7), not a
  deletion.

- **FU-52 — open, live work.** CI names Node only by its major version, `node-version: "20"`
  (`.github/workflows/ci.yml:129–133`). That forced jsdom onto the 26 line (§3): 27 and later declare
  `^20.19.0`, and nothing guarantees which 20.x CI resolves. Pinning or raising it is a CI change, which
  makes a unit live, so U0 only registers it.

**Vitest version check (owner item 1).** `vitest` resolves to **2.1.9**. Inline `test.projects` needs
3.2+, so the workspace file stays. `npx vitest run` prints **no workspace deprecation warning**. Its
only warning is Vite's "The CJS build of Vite's Node API is deprecated", and the baseline run at
`4e06cd1` printed that too, so U0 did not cause it.

## 7. Report

*Filled at closeout: landing SHAs, CI run IDs, register status.*

---

## Appendix — withdrawn claims

| Claim | Why withdrawn |
|---|---|
| First draft of the guard comment: "it fails a file collected by both projects", presented as catching the `extends` double-collection | False. The guard read declared includes, and `extends` merges them at load time. Fixed by refusing `extends` (rule (b)); M-b is the proof |
| First M-b run (345 `also collected` lines) as evidence for the `extends` case | That mutation listed the node glob explicitly, so it proved M-b′, not `extends`. Re-run faithfully as M-b |
