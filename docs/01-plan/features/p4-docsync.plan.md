# P4 · Docs-sync — queued text applied; exit-criteria evidence

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` and
> `docs/01-plan/phase-4-decision-queue.md`. It carries no approval status of its own. **Mode: SUPERVISED**,
> docs and comments only. Opened 2026-10-01 at anchor `e3920c6`, in worktree `../ssi-docsync`, branch
> `docs/p4-docsync`, in parallel with U23. Rebased onto `63a230e` (U23) before landing. Registered with bkit at
> open (RC-4). Commit and CI ids are in bkit and the landing report, not here, because this file is inside the
> commit it would have to cite.
>
> **Status: landed on the owner's rulings of 2026-10-01.** The `CLAUDE.md` text was shown verbatim and approved
> with two amendments (Q-4's last sentence, Q-19's opening). Found items 1–4 were admitted. Item 5 (the Next
> advisory) was ruled out of scope: U24 owns it.

## 1. Inventory — every edit deferred to docs-sync

Read from the queue, the plan's §3/§4 rows and every `features/p4-*` artifact (`git grep -i "docs-sync\|docs
follow-up\|outside \*May touch\*"`).

| Source | Target | What was deferred | Behaviour change |
|---|---|---|---|
| Q-4 (U12) | `CLAUDE.md` §5 rule 9 | the serialisation is guarded now (`LIVE_SERIAL`, `SERVER_REUSE`) | none, prose |
| Q-7 (U15) | `docs/roadmap.md`, Phase 4 backlog | the logging sink's line | none |
| Q-13 (U11) | `src/architecture/not-found-uniformity.test.ts` header | N-50 decided; the service's 404s | none, comments |
| Q-15 (U18) | `src/lib/security/csp.ts` `font-src` comment | `next/font/google` → `next/font/local` | none, comments |
| Q-19 (U18) | `CLAUDE.md` §5 rule 10 | the verification list assumes telemetry off | none, prose |
| U12 §4 debt | `README.md` scripts table | `PLAYWRIGHT_NO_SERVER` never mentioned | none |
| U6 (c) R(5) | `docs/roadmap.md:649` | background sourcing | **already landed**, no edit |

**Found during the inventory, admitted by the owner (2026-10-01):** (1) `docs/roadmap.md:42` and `:583` still
said no Phase 4 unit had run. (2) Roadmap item 0 (N-50) carried no decision. (3) FU-78 (b): the
`partiallyApplied` comment named only the confirm route. (4) The README's `db:seed` row omitted the U17
variables. **Out of scope by ruling:** (5) `npm ci` warns that `next@15.1.3` carries CVE-2025-66478. U24 owns
it, and this landing does not touch `package.json`, the lockfile or the register.

**Checked and not docs-sync:** Q-3 (the §5 baseline, re-measured at closeout), Q-20 (unanswered; points at
"a later unit"), Q-22 (b) (not chosen), Q-24 (4) (resolved at U17).

## 2. Applied

| Item | File:line after the edit | Text |
|---|---|---|
| Q-4 | `CLAUDE.md:209-215` | the queued replacement, struck-then-dated per §7. The last sentence is the owner's amendment: *"…per-worker user isolation, stays open as FU-25 (D-9 ruled (b), 2026-09-29)."* |
| Q-19 | `CLAUDE.md` §5 rule 10, after its last note | *"This list assumes Next's anonymous telemetry is off: …"*, the owner's reworded opening ("G" is not defined in `CLAUDE.md`) |
| Q-7 | `docs/roadmap.md`, Phase 4 backlog | the old line struck; the queued line placed after it, dated |
| Q-13 | `not-found-uniformity.test.ts:17-18`, `:29-34` | as queued |
| Q-15 | `src/lib/security/csp.ts:95-97` | as queued |
| README | `README.md:57` (`test:e2e`) | the run builds and starts the app, fails if the port answers, and `PLAYWRIGHT_NO_SERVER=1` / `PLAYWRIGHT_BASE_URL` test your own server. Basis: `playwright.config.ts:5`, `:53-54`, `:67-76` |
| Found 1 | `docs/roadmap.md:42`, `:583` | the "no unit executed" text struck; a dated line points at the plan's §4 unit table instead of listing units |
| Found 2 | `docs/roadmap.md`, item 0 | dated: D-4 (a), implemented by U11 (`bd304d1`), with (c)(ii). The draft named the plan-only id for N-50, and CRITERIA_PARITY (`criteria-parity.test.ts:223-225`) failed G pass 1 on it (`P4-X7` found in `docs/roadmap.md`). The line now says "the Phase 4 plan's exit criteria (§5)" |
| Found 3 | `src/lib/safety/index.ts:613-619` | names both routes that return the sentence (below). **FU-78 (b) CLOSED** (plan §4 register row) |
| Found 4 | `README.md:58` (`db:seed`) | `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` required, no defaults, password private, no example values. Basis: `src/lib/db/seed.ts:22-27` |

**The routes behind found 3 (`git grep -n 'PARTIALLY_APPLIED\|advisorOutcomeCopy' -- 'src/**' ':!*.test.*'`):**
- the confirm route, `POST /api/advisor/actions`, answers `PARTIALLY_APPLIED` from `batchFailure`
  (`src/services/advisor-actions.ts:155-161`, called at `:243` and `:278`);
- the undo route, `POST /api/advisor/actions/[id]/undo`, fills the same sentence and answers 409 `STALE_UNDO`
  (`src/app/api/advisor/actions/[id]/undo/route.ts:87-93`).

No other non-test file reads the sentence except the page that passes it as a prop (`src/app/advisor/page.tsx:34`).
The comment's old citation `advisor-actions.ts:145-150` had drifted to `:148-153`, and is corrected in the same
comment.

**Comment-only proof (AC).** Every changed line under `src/` is a `//` comment:

```
git diff -U0 --cached -- src | grep -E '^[+-]' | grep -vE '^(\+\+\+|---) ' | grep -vE '^[+-][[:space:]]*//'
→ (no output; exit 1)
```

**Queue:** Q-4, Q-7, Q-13, Q-15 and Q-19 are marked answered or applied. Answers quoted from the owner are
verbatim. **Plan:** the FU-25 row (Q-4 applied), the FU-78 row ((b) CLOSED), the U15 row (Q-7 applied), and
§5 `[P4-X1]`, `[P4-X5]`, `[P4-X7]`. **No register id issued**, so the rebase onto N-119/N-120 collided with
nothing.

## 3. Exit criteria at this landing

The ticks are the owner's. This landing records one of them, `[P4-X7]`, on the owner's ruling.

| Criterion | State | Evidence | Owner ruling (2026-10-01) |
|---|---|---|---|
| `[P4-X1]` | not met | U23 has landed (`63a230e`). U12 AC-3 closed with Q-4 here. Every "partial" in §3/§4 has its explanation beside it. **Gap:** no per-AC G record in the artifacts of U14a (`p4-u14a…` §6 says G is "not written here"), U16 (b) ("recorded in bkit"), U17 (§6) and U10 (a) ("per-check figures were not kept", `p4-u10-confirm-surface.plan.md:113-114`) | evidence updated; no tick |
| `[P4-X2]` | met now | no `**X**` row in `docs/project-status.md`; `db/seed.ts` is B (`:474`, reason `:503`) | at closeout (plan §5) |
| `[P4-X3]` | holding | the 17 floors are unchanged this phase (`vitest.config.ts:91-145`); every main push from `6355a5d` to `e3920c6` (31 SHAs) has a green push run, read at docs-sync; `2705aeb` also has one cancelled duplicate, superseded by a green run one second later | at closeout |
| `[P4-X4]` | gaps | red evidence is recorded for every bug guard except CRITERIA_PARITY's Phase 4 binding (`criteria-parity.test.ts:217`; U1 recorded green only) and REGISTER_ROW_SHAPE's contiguity check | open |
| `[P4-X5]` | **not met** | item 1 shipped as docs only | recorded in the plan row, verbatim |
| `[P4-X6]` | met (nothing new to review) | no new route or dependency; `PAID_API_BUDGET` pinned at `boundaries.test.ts:1143-1152` | **not ticked:** U24 changes the lockfile; tick at closeout after its dependency diff is reviewed |
| `[P4-X7]` | met | D-4 (plan §6); U11 `bd304d1`; roadmap item 0 now records it | **ticked** |
| `[P4-X8]` | ticked earlier | plan §5 | — |

## 4. Check

- **Stop classes:** `CLAUDE.md` shown verbatim and stopped. Applied only as approved (two items, no other
  change). No `package.json`, lockfile, workflow, migration, `src/types/**` or content change. No guard changed.
- **Staged set = the brief's *May touch*:** `CLAUDE.md`, `README.md`, `docs/roadmap.md`, the plan, the queue,
  this artifact, and comment lines in `csp.ts`, `not-found-uniformity.test.ts` (Q-13, Q-15) and
  `src/lib/safety/index.ts` (found 3, admitted by the owner). `docs/project-status.md` needed no edit.
- **`npx vitest run src/architecture`:** 30 files, 534/534. This includes DOC_TRUTH, CRITERIA_PARITY,
  REGISTER_ROW_SHAPE and ARTIFACT_CAP.
- **G on the staged tree, in a clean worktree with no `.env.local` and telemetry off:** see §5.

## 5. G

**Pass 1** (staged tree before the roadmap fix): red. `npx vitest run` and `npm run test:coverage` each failed one
test, CRITERIA_PARITY's plan-only exclusion (§2, found 2). Every other step passed. **Pass 2**, on the final
staged tree including this section: `npx tsc --noEmit` clean · `npm run lint` 433 of 433, 0 errors ·
`npx vitest run` 2153/2153 across 152 files · `npm run test:coverage` thresholds hold · `npx next build` ·
`npm run verify:bundle` OK · `npm run verify:rendering` OK · E2E non-live 70 passed / 30 `[LIVE]` skipped.
The landing report and bkit record that pass 2 matched these figures.
