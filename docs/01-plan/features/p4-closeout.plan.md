# P4 closeout — landing (a): preparation, evidence and the owner record

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (§5, §6 rulings of
> 2026-10-06, register). It carries no approval status of its own. **Mode: SUPERVISED**, docs and evidence only,
> under the owner's standing approval for landing (a). Opened 2026-10-06 at anchor `72370ee`, in worktree
> `../ssi-close`, branch `docs/p4-closeout`. RC-1…RC-5 apply. Commit and CI ids are in bkit and the report,
> not here. **Landing (b) comes later:** the live E2E baseline, the live half of D-6 (c), the independent
> Check, the owner's X1/X4/X6 rulings and the phase declaration. **Nothing under `src/`, no test, no package
> file and no `CLAUDE.md` line changed.**

## 1. `CLAUDE.md`: two diffs, presented and not applied

**(a) Q-3, the §5 measured baseline.** Re-measured against `72370ee`:

- `npx vitest run`: **2153/2153 across 152 files**. `--project node`: 1908 across 126. `--project jsdom`:
  245 across 26.
- `npm run lint`: **433 of 433** tracked files, 0 errors.
- `git ls-files 'src/architecture/*.test.ts'`: **30** specs, unchanged.
- E2E: 70 passed / 30 skipped at the closeout gate (§7).

The diff was applied to a scratch copy of `CLAUDE.md` in the worktree. `npx vitest run src/architecture` passed
30 files, 534/534. The original was then restored by copy, and `cmp` reported no difference:

```diff
-Measured baseline. The **test counts were re-measured 2026-09-25 at the Phase 3 closeout declaration**, against
-that tree. The spec count and lint figure were re-measured 2026-09-24 at closeout (a), and still hold at the declaration. The other figures …
+Measured baseline. ~~The **test counts were re-measured 2026-09-25 at the Phase 3 closeout declaration**, against
+that tree. The spec count and lint figure were re-measured 2026-09-24 at closeout (a), and still hold at the declaration.~~ **[2026-10-06, Phase 4 closeout (a), Q-3] The test counts, lint figure and spec count were re-measured against `72370ee`**, and the E2E figure is the closeout gate's. The other figures …
-… **1693/1693 unit tests across 144 files**: `node`
-project 1563 across 120, `jsdom` project 130 across 24 · ~~lint 369 of 369~~ **lint 415 of 415 tracked source files, 0 errors** ·
+… ~~1693/1693 unit tests across 144 files~~ **2153/2153 unit tests across 152 files**: `node`
+project ~~1563 across 120~~ **1908 across 126**, `jsdom` project ~~130 across 24~~ **245 across 26** · ~~lint 369 of 369~~ ~~lint 415 of 415~~ **lint 433 of 433 tracked source files, 0 errors** ·
-… ~~356 of 356~~ ~~369 of 369~~ **415 of 415** tracked source
-files are linted, re-measured 2026-09-24 — …
+… ~~356 of 356~~ ~~369 of 369~~ ~~415 of 415~~ **433 of 433** tracked source
+files are linted, re-measured 2026-10-06 — …
```

**(b) §2.3 rule 14 names the secret key.** It was tried on a scratch copy as well: 534/534, restored, `cmp` OK.

```diff
-14. Never commit secrets. The Supabase service-role key stays confined to the dev seed script and must never
+14. Never commit secrets. The Supabase ~~service-role key~~ **secret key** (`sb_secret_…`, held in `SUPABASE_SERVICE_ROLE_KEY`;
+    the legacy `service_role` JWT key is disabled, 2026-10-06) stays confined to the dev seed script and must never
     be reachable from `src/app` or `src/components`.
```

`SERVICE_ROLE_CONFINEMENT` (`boundaries.test.ts:1411`) keeps its name. It pins the reader of the variable, and
the variable did not change.

## 2. `[P4-X4]`: the missing red evidence (RC-2)

Each mutation was made on the closeout worktree and run against its spec. The file was restored from a saved
copy, and `cmp` was OK every time. `git status` was clean after all five.

| # | Mutation | Spec | Red output |
|---|---|---|---|
| M1 | plan §5 `[P4-X3]` → `[P4-X9]` | `criteria-parity.test.ts` | *"the plan issues exactly X1…X8"*: `expected [ 'P4-X1', 'P4-X2', 'P4-X4', …(5) ] to deeply equal [ 'P4-X1', 'P4-X2', 'P4-X3', …(5) ]`, plus tick-state parity |
| M2 | plan `[P4-X2]` ticked, roadmap not | same | *"tick-state parity"*: `tick state diverges — P4-X2: §5=[x] roadmap=[ ]` (1 failed / 18) |
| M3 | roadmap gains `[P4-X5]` beside `[P4-X3]` | same | *"plan-only ids are excluded by name"* red, with the id-set and parity checks (3 failed) |
| M4 | register `FU-93` → `FU-95` | `doc-truth.test.ts` | REGISTER_ROW_SHAPE contiguity: `FU- ids are not contiguous (73, …, 92, 95): expected [ 95 ] to deeply equal []` |
| M5 | register `FU-93` → `FU-92` | same | REGISTER_ROW_SHAPE uniqueness: `FU- id defined twice: expected 21 to be 20` |

The two gaps docs-sync named (CRITERIA_PARITY's Phase 4 binding, `criteria-parity.test.ts:217`, and the
contiguity check) now each have recorded red evidence. **The X4 tick is the owner's**, at (b).

## 3. `[P4-X1]`: the four artifacts against what X1 requires

X1 asks that every shipped item meets its own success criteria, with no partial left unexplained. Read-only
review of each artifact, plan row and landing:

| Unit | What the artifact records | What is missing | Landing · `main` CI · branch CI |
|---|---|---|---|
| U14a | AC-1…AC-7 with results (`p4-u14a-context-plan-revision.plan.md:28-130`) | AC-8 (G). `:104` points to §5/§6, and §6 (`:134-135`) says G is *"not written here"*. The commit message of `39febb7` carries the full G figures | `39febb7dcb4aab2c9900cd46455325e3e01e9133` · 36748816291 ✓ · 36748167521 ✓ |
| U16 (b), FU-17 half | AC-1…AC-4 and red R0/M1–M5 (`p4-u16-fu17-checkin-shape.plan.md:105-113`) | AC-5: *"G … recorded in bkit"* (`:111`); the figures are in local bkit only | `fe4761f9919804cdc56d0c22ead2be9f798408fa` · 36673153054 ✓ · 36672816212 ✓ |
| U17 | seed checks R1–R4 and the Q-24 helper check (`p4-u17-demo-fixture.plan.md:74-87`) | G: §6 (`:93-94`) *"not written here"*. The commit message of `49b3fc2` carries the figures | `49b3fc2d73e4c5b2bacfdeaabfd5105eab50d872` · 36674035368 ✓ · 36673605815 ✓ |
| U10 (a) | AC-1…AC-6 and M1–M8; AC-7 *"Green … per-check figures were not kept"* (`p4-u10-confirm-surface.plan.md:112-115`) | per-check G figures, which exist nowhere. The two CI runs, which run every G step, are the only per-check record | `0dfe2f823df16e389b9821eb21a06262458cdc37` · 36472762496 ✓ · 36472256910 ✓ |

In all four, no success criterion is unmet or unexplained, and the gap is the G record alone. U14a's
verification column (engine tests and so on) is unmet because the unit was docs-only, and that is already
`[P4-X5]`'s recorded "not met", not an unexplained partial. **Options for the owner at (b):**

- **(i) X1 met, with a dated exception note** citing, for each of the four, its green `main` push run and
  branch run above, plus the commit-message G figures where they exist (U14a, U17). U10 (a)'s figures are
  unrecoverable, and the note says so.
- **(ii) X1 not met:** what is missing is a per-AC G record in four artifacts. It cannot be produced after
  the fact for U10 (a). For the other three, the figures could only be copied from commit messages and bkit
  into the artifacts.

## 4. `[P4-X3]`: CI on every `main` push since `e3920c6`, and the ruled ticks

The docs-sync record covers the 31 pushes from `6355a5d` to `e3920c6`. The five since, read with
`gh run list --commit` (D-15):

| SHA | Unit | `main` push run | branch run |
|---|---|---|---|
| `63a230e82966f6708e00697ee0746406b499e6c0` | U23 | 36943833391 success | 36943371040 success |
| `33d486abf3ac5181e6d2f24a2cd6d12cfe74a897` | docs-sync | 36945753895 success | 36945394412 success |
| `a94667ea34c028a816954b09107ce2b489f6fba5` | U24 | 36947660195 success | 36947187668 success |
| `ebc66269c99bf061039d28dfe6fa350e711fdeaa` | U25 | 36949488032 success | 36949113614 success |
| `72370ee38fa63f31ca61f645522628b4dc0e4985` | U26 | 36950389982 success | 36950026081 success |

**Ticks, as ruled in the brief (task 6):**

- **X2 ticked.** No row in `docs/project-status.md` reads X; the dated line is there.
- **X3 ticked.** Its condition held: every `main` push is green, and `vitest.config.ts` is unchanged since
  docs-sync.
- **X6 not ticked.** Its condition failed: U18 (`3c52ab1`) removed the devDependency `@vitejs/plugin-react`.
  The `dependencies` names are unchanged (`next` moved 15.1.3 → 15.5.27). The paid-API pin
  (`boundaries.test.ts:1143-1152`) is unchanged; U19 touched only the stripper's signature in that file.

## 5. D-6 (c): provenance-fixture re-verification, dated record (2026-10-06)

- **Fixture.** `content/verification/provenance-fixture.json` has 37 entries (36 PMID, 1 DOI), all
  `verifiedOn` 2026-09-24 and `verifiedBy: owner`, with bodies in `captures/2026-09-24-rv/`. Neither the
  fixture nor `seed-papers.json` has changed since Phase 3 (e1).
- **Offline half, run:** `npx vitest run src/data/provenance-record.test.ts` → **17/17, exit 0**. That covers
  schema, identifiers, title match, orphans, the do-not-cite list, and body hash, parse and identity. A
  read-only cross-check against the committed RV `results.json` found 0 hash, title or identity mismatches
  and 0 retractions. **Drift: none**, so nothing was registered.
- **Live half, not run:** a live call, outside this landing. The plan defines re-verification as a live
  re-resolution of every entry (Phase 3 plan `:281-283`), 37 lookups at $0 (phase plan §7). Only that catches
  a retraction or retitle since 2026-09-24. **No committed instrument exists:** Phase 3's driver is verbatim in
  `features/phase3-closeout.plan.md` §5, and `verifiedBy: owner` makes the run the owner's. Where the new
  bodies go, and how `verifiedOn` is refreshed, is not written anywhere (Phase 3 plan `:283`(i)).
- **Inconsistency, flagged and not fixed:** phase plan §7's row *"U8 × D-6 (c)/(d): not live"* is about the
  unit. *"What remains … the D-6 (c) closeout re-verification (37 lookups, $0)"* is about this closeout check.

## 6. Phase 4 report (draft; landing (b) completes it)

**Units shipped.**

- **DONE:** U0, U1, U2, U3, U4, U5 (a, b), U6 (a, b, c), U9 (a), U10 (a, b, c), U11, U12, U13 (statement
  only), U14 (a only), U15, U16 (mapper validation, then the FU-17 half), U17 (a, b), U18, U19, U20, U21,
  U22, U23, U24, U25, U26.
- **OUT by ruling:** U7 (D-3), U8 (D-6 (c)), U13's catalog, U14 b and c (D-3), the external log sink (D-7 (a);
  U15 shipped under (d)), and the live U16 options (D-8).

**Objective item 1 is UNMET (`[P4-X5]`, owner ruling at docs-sync).** Item 1 shipped as docs only: U14a
revised the context-adjusted-evidence plan, which is still Draft. U14b and U14c are OUT, and the work carries to
Phase 5. This report does not round that up.

**Security.** U24 moved `next` 15.1.3 → 15.1.12, taking every 15.1-line fix, including GHSA-9qr9-h5gf-34mp.
U25 moved it to 15.5.27, which clears every advisory on `next` itself (N-122 closed). U26 brought `nanoid` to
3.3.19. `next`'s pinned `postcss` 8.4.31 remains, build-time only, until `next` 16 (FU-91). **N-121 closed on the
owner's record of 2026-10-06:** the app was never deployed, and the exposure was the local server. Keys were
rotated: Supabase to its publishable and secret keys, with the legacy JWT keys disabled, and OpenAI rotated.
Usage was reviewed as normal, with no unknown accounts. Opened at closeout: FU-94 (all-interface bind) and
FU-95 (shell variables override `.env.local`). FU-92 (no CI audit step) is a Phase 5 proposal.

**Carried to Phase 5, by id.** 69 ids are open at `72370ee` plus this landing, out of 225 disposed in plan §3 and
the register. 156 are closed. Read-only classification of every row; struck text is superseded.
- **Named in the brief:** N-117 (PDF blank-as-0), N-119 (CSV/paste `parseNumber`), N-120 (Value field), N-123
  (CSV header aliases), FU-25 (per-worker isolation), FU-91 (`postcss` until `next` 16, plus 11 dev-only
  entries), FU-92 (CI audit step), FU-94 (local server binds all interfaces), FU-95 (shell variables override
  `.env.local`).
- **Every other open N-:** N-11 (logging sink, D-7), N-18, N-30, N-33, N-45 (OUT, conditions intact), N-22 and
  N-25 (OUT, D-3 (e)), N-35 (OUT for X2), N-36 (next matcher edit), N-37 (build-summary SSG label), N-40
  (narrowed by U15), N-41 (no export cap), N-43 (standing procedure), N-69, N-70 (condition-bound gates),
  N-89 (REGISTER_ROW_SHAPE residue), N-108, N-109 (open by design), N-110, N-111.
- **Every other open FU-:** FU-4, FU-8, FU-9, FU-10, FU-11, FU-12, FU-14, FU-15, FU-19, FU-20, FU-21, FU-22
  (Phase 1 reasons intact), FU-18, FU-65 (item 4 OUT), FU-24 and FU-32 (standing), FU-29 (b) and FU-57 (D-8,
  deployed DB), FU-30 (`labSupported`/`labCaution` held for item 1), FU-33, FU-38, FU-40 (OUT, D-3 (e)),
  FU-41 (narrowed by U15), FU-43, FU-44 (D-7 sink), FU-46 (residue as N-89), FU-62 (sourcing half), FU-72 (the
  live half of D-6 (c)), FU-79, FU-80, FU-82, FU-83, FU-84, FU-85, FU-86, FU-87, FU-88, FU-89 (note only), FU-90.
- **OP-:** OP-5 (deployment gate).
- **Judgement calls, for the Check:** N-40 and FU-41 are recorded *"narrowed"*, never closed, so they are
  listed open. FU-46 is open on its N-89 residue. N-71 is closed on its row's *"CLOSED by U10"*. N-22 is OUT,
  though moot since U31.

**Exit criteria at landing (a):** X2, X3, X7 and X8 ticked. X1, X4 and X6 await the owner's ruling at (b),
with the evidence above. X5 is not met. The closeout conditions still open are the D-12 live baseline and the
live half of D-6 (c).

**Live E2E baseline (D-12):** `«PLACEHOLDER — owner-run per docs/05-qa/p4-live-e2e-runbook.md; result pasted at landing (b)»`

**Independent Check verdict:** `«PLACEHOLDER — the closeout Check, at landing (b)»`

## 7. Gate

G ran on the staged tree, in the clean worktree with no `.env*` other than the tracked `.env.example`, and
`NEXT_TELEMETRY_DISABLED=1`. It ran twice: first with this section unwritten, then on the final tree, which is the
committed one. Both runs gave the same figures:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | 433 files, 0 errors |
| `npx vitest run` | 2153 of 2153, across 152 files (architecture specs 30 files, 534/534) |
| `npm run test:coverage` | green, thresholds held |
| `npx next build` | succeeds, `Next.js 15.5.27` |
| `npm run verify:bundle` | OK |
| `npm run verify:rendering` | OK |
| non-live E2E | **70 passed, 30 `[LIVE]` skipped** |

The build prints the workspace-root warning, which is local to this machine (U25 artifact §5).
Staged set: `.env.example` (comments only), `README.md`, the plan, the queue, `docs/project-status.md`,
`docs/roadmap.md` (the X2 and X3 lines only), this artifact and the runbook. Every file is inside the brief's *May touch*.
