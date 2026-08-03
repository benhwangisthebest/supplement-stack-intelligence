# Phase 0 — Integration & Enforcement Recovery (Completion Report)

> **Status: COMPLETE WITH FOLLOW-UP** · **Date:** 2026-08-02; record converged 2026-08-03
> **Final state:** `main` == `origin/main`, 0 ahead / 0 behind. **This header deliberately pins no tip
> SHA** — `main` advanced past the unit chain with the documentation, correction and certification commits
> that followed, and a pinned SHA here has gone stale twice already. The authoritative CI result for any
> commit is the `push`/`main` run carrying that commit's SHA.
> **CI at the close of the unit chain:** [run 30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782)
> — `push` / `main` / head SHA `1792f9f`, conclusion **`success`**
> **Plan:** `docs/01-plan/phase-0-integration-enforcement.plan.md` (Completed 2026-08-02)
> **Independent closeout review:** `docs/reviews/phase-0-closeout-check.md` (2026-08-01, + resolution addendum)
> **Final independent Check:** **run 2026-08-02.** First pass, the re-check of every finding, and the
> final certification are recorded in `docs/05-qa/phase-0-final-check.md`, which is the authority on it.

**"Complete with follow-up", not "complete".** Every unit shipped and every blocking closeout finding is
resolved, but **three** roadmap exit criteria remain unmet by deliberate deferral and the findings in §5
are carried into Phase 1. Calling this unconditionally complete would be the exact failure mode
`CLAUDE.md` §5.1 names.

---

## 1. Objective and outcome

**Objective.** Make the repository's verified state real, durable, and automatically re-verified — at the
start of Phase 0, every quality property of this project was true only in one uncommitted working tree on
one machine.

**Outcome.** `main` is the working tip, publicly pushed, with a green CI run on the exact SHA. Two
executable architecture specs and a reference-ID stability contract now re-verify on every run, and each
was mutation-checked at execution time — §6 states precisely which of those checks are *durably
evidenced* and which were self-reported. A rank-1 error-disclosure violation that predated Phase 0 was
found and closed.

---

## 2. Units as shipped

Every SHA below was verified to resolve and to be an ancestor of `main`.

| Unit | Subject | Commit |
|---|---|---|
| U1 | Repository-ignore hygiene | `4337a24` |
| U2 | Documentation baseline | `110715d` |
| U3 | v13 evidence disclosure | `c75b044`, `917e183` |
| U4 | Feature-branch backup | no commit — push-only (`origin/feat/food-pairings-v12`) |
| U5 | Continuous integration | `374d7c9` |
| U6 | Coverage visibility | `8b1bd16` |
| U7 | Architecture enforcement | `0adf331` |
| U8 | Reference-ID stability | `77b3c36` |
| U9 | Integration & hygiene cleanup | `bf7ff2e` |

### Post-review remediations

The 2026-08-01 closeout review found Phase 0 **not closed** on four blocking findings. Four remediation
units followed, each on its own branch, each CI-verified before a fast-forward-only integration.

| Unit | Finding | Commit | What it did |
|---|---|---|---|
| **R1** | C-1 | `a338370` | Architecture guard discovery now runs `git ls-files --cached`, so the verdict is a property of the repository rather than of one machine's working tree. |
| **R2** | C-7 | `ea5b270` | Registered the `biomarkerRelevanceRules` namespace (15 ids) in the ID-stability contract — the one persisted reference-ID space that was ungoverned. |
| **R3** | C-8 | `9e9e15d` | The shared API boundary returns a fixed generic message plus an opaque correlation ID; the full exception goes to the server log under the same ID. |
| **R3b** | — | `1792f9f` | Four further disclosure sites that bypass `handle()` entirely — two in `advisor/actions` `POST`, one in undo, one streaming into an SSE `error` event. Added `src/architecture/error-disclosure.test.ts`. |

**C-2** (untracked sync-conflict duplicates on a public repo) took two steps, and the first was
initially over-reported as a full resolution:

1. **2026-08-01 — active copy relocated** off the synced Desktop tree to
   `/Users/<redacted>/Developer/supplement-stack-intelligence`. This stopped *new* conflict copies in the
   working repository, and R1 made the architecture guard structurally immune to the class.
2. **2026-08-02 — source clone neutralized.** The 2026-08-02 independent Check found the original clone
   still live, still pointed at the same **public** remote, and holding **141** `* N.*` duplicates (up
   from the 111 the closeout review recorded) — so a single `git add -A` there could still have published
   them. Two operations were performed on it: `git remote remove origin` (verified: no remotes) and a
   rename to `RETIRED-v1.0` (verified). Its 1031 files and its `HEAD` (`bf7ff2e`) were **not** modified.

**The 141 duplicate files still exist** in `RETIRED-v1.0` and are left in place pending manual deletion.
What has changed is that the clone can no longer push anywhere. This is neutralization, not deletion —
stated precisely because the earlier "Resolved by relocation" claim was not.

C-3 and C-4 (stale governing documents) are resolved by the documentation unit and its corrections.

---

## 3. Measured state at close

All figures below were measured on 2026-08-02 against `main` @ `1792f9f`, not carried from an earlier
document.

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **Clean**, exit 0 |
| Unit tests | `npm test` | **524 passed / 524**, **42 files** |
| Production build | `npm run build` | **✓ Compiled successfully** |
| CI on the exact SHA | GitHub Actions `CI` | **success** |
| Git state | `git rev-list --left-right --count origin/main...main` | `0 0` |
| History | `git log --merges bf7ff2e..main` | **zero merge commits** — fast-forward only |
| Tags | `git tag` | **0** |
| Branches | `git branch -r` | 9 `feat/*` + 4 `fix/*` + `main`, **none deleted** |

### Guards, and what each enforces

| Guard | Tests | Enforces |
|---|---|---|
| `src/architecture/boundaries.test.ts` | **28** | Layer boundaries B1, B2, B2b, B3, B4, B4b, B5; tree-partition; per-layer file floors |
| `src/architecture/error-disclosure.test.ts` | **29** | No API route reads a caught exception's text (`CLAUDE.md` §2.3 rule 13) |
| `src/data/id-stability.test.ts` | **43** | Reference-ID append-only contract across **9** manifest namespaces |
| `src/lib/api/respond.test.ts` | **32** | The shared error boundary: non-disclosure, correlation-ID join, log hardening |

**Scanned layers (5):** `src/types`, `src/components`, `src/lib`, `src/services`, `src/data`.
**Exempt (2):** `src/app`, `src/architecture` — each with a written reason.

**Manifest namespaces (9):** `supplements` (15), `products` (21), `biomarkers` (13),
`biomarkerRelevanceRules` (15), `effects` (27), `papers` (20), `interactionRules` (30),
`sideEffectLabels` (18), `outcomeCategories` (11).

**Machine-local artifacts removed from the tree** at `bf7ff2e`: `.bkit/**` (8 files), `.bkit-memory.json`,
and `test-results*/.last-run.json`. Local copies remain and are ignored. `playwright-report/` was **never
tracked on any ref** — its ignore rule was added defensively by `4337a24` (U1), so there was nothing to
remove.

---

## 4. The public-history caveat

**Untracking is not removal.** `30f74e1` is an ancestor of `origin/main` and still contains
`.bkit-memory.json`, `.bkit/audit/*`, `.bkit/state/*`, and `test-results/.last-run.json`. Untracking those
paths at `bf7ff2e` does not delete them from history — they remain permanently fetchable from the public
remote by anyone who clones.

**The decision not to rewrite history is deliberate and sound.** An independent full-history scan of all
commits (closeout review §6) found **no secret values on any ref** — no JWT, no `sk-ant-`/`sk-`, no
`AKIA…`, no `ghp_…`, no PEM block, no credentialed `postgres://` URL. `.env`, `.env*.local`,
`storageState*.json` and `*.auth.json` were **never tracked**. The reconstructed artifacts contain PDCA
metadata, tool audit logs and session bookkeeping — no credentials, no health data, no user PII beyond the
developer's own local path and git identity. **No rotation is required.**

`CLAUDE.md` §10.4 forbids rewriting the validated v2–v13 chain, and a rewrite would discard the only
integrated state to remove content that is already known to be harmless. This caveat is recorded so the
choice is visible rather than implicit.

---

## 5. Deferred and carried forward

Nothing here is resolved. Each is deliberate, with the reason stated.

### Unmet Phase 0 exit criteria — **three**, each annotated in `docs/roadmap.md`

The roadmap's Phase 0 list has seven criteria; four are met and **three** are not. An earlier version of
this table said "four" and included a fourth row that is *not* an exit criterion — corrected below after
the 2026-08-02 Check (finding M-4).

| Item | Status | Why |
|---|---|---|
| Tags `v2`…`v13`; zero `feat/*` branches | **Unmet** (U-DEFER-1) | The chain cannot support honest tags — v12 `51d2134` precedes v11 `d89cf1c`. 0 tags. **As measured 2026-08-02**, 9 remote `feat/*` branches remained; merged-branch cleanup at Phase 0 close is a separate approved step (`CLAUDE.md` §10.1) — see `docs/05-qa/phase-0-final-check.md` for the end state. |
| **Branch protection / CI as required status** (**C-6**) | **Unmet** (U-DEFER-3) | Needs a repository-settings change and separate explicit approval. `main` is force-pushable today. |
| A `.tsx` test collected under `src/` (**C-12**) | **Unmet** (U-DEFER-4) | `vitest.config.ts` collects `*.test.ts` only. Zero `.test.tsx` exist; latent. |

The **`fix/**` / `docs/**` CI trigger gap is a follow-up, not an exit criterion** — it is recorded in the
follow-up register below and deliberately not here. Every `fix/*` and `docs/*` branch in Phase 0 was
CI-verified by manual `workflow_dispatch` before integration.

### Findings carried into Phase 1

| ID | Item |
|---|---|
| **C-5** | `NO_UI_IMPORT` was enforced without plan authorization — now documented and ratified, not re-litigated. |
| **C-9** | No `E2E_LIVE`-gated Playwright block carries the `[LIVE]` tag (`CLAUDE.md` §5.9). Must close before any Phase 1 E2E-in-CI work. |
| **C-10** | `docs/archive/2026-07/evidence-disclosure/**` was committed despite exclusion; content correct, staging decision unrecorded. |
| **C-11** | Tree-partition ignores loose files and symlinks. Latent — none exists today. |
| ~~**C-13**~~ | ~~No `LICENSE` on a public repository.~~ **Closed 2026-08-02** — `LICENSE` added: copyright 2026 Ben Hwang, all rights reserved; source-visible, not open source. README §Licence records it. |
| **F3** | `handle()` classifies operational errors by substring (`err.message.includes("not configured")`). Safe against every throw site today, structurally fragile — a typed error class is the fix. |
| **F5** | The correlation ID is emitted but no UI surfaces it, so `ApiError`'s "quote in a support ticket" is unrealized. |
| **F6** | No route-level reachability test covers the four fixed handlers (`CLAUDE.md` §5.3). |
| **F7** | The error-disclosure guard documents two detection gaps it does not close: destructured-handler *bodies*, and two-argument `.then(onFulfilled, onRejected)`. No route uses either form. |
| — | **`fix/**` and `docs/**` are absent from the CI push triggers** (`.github/workflows/ci.yml`: `push` covers `main` and `feat/**` only). Every `fix/*` and `docs/*` branch therefore needed a manual `workflow_dispatch` before integration. A follow-up, **not** a Phase 0 exit criterion. |
| — | **The developer's personal email address is public — a known, accepted exposure.** It appears in **52** tracked files (47 of them under `docs/archive/2026-06/**`, the per-feature PDCA documents), has been in tracked content since the initial commit `910d773`, and is the author email on exactly **2 commits, both ancestors of `1792f9f`** (no later commit uses it). The repository is public, so the address is already published. The configured author email is now the GitHub noreply form. Removing it would require rewriting the v2–v13 chain, which `CLAUDE.md` §10.4 forbids. Deliberately not reproduced here, so this row does not itself become a 53rd occurrence. **Decision 2026-08-03: accepted as-is — no redaction, no rewrite.** |
| — | **Supplement slug policy** — the relationship between seed IDs and public `/library/[slug]` URLs is unstated; a rename would break both persisted references and inbound links. |
| — | **`boundaries.test.ts` claim→observed pass** (recommended small unit). Three of R3b's blockers were *comment* defects, not code defects. Running each header claim against the implementation caught them in one pass; `boundaries.test.ts`'s header has never had that treatment. |

---

## 6. What Phase 0 actually established, and what it did not

**Established.** The repository now re-verifies itself: two architecture specs, an ID-stability contract,
and an error-boundary suite run on every `npm test` and on every push to `main`. Their inventory comes
from Git, so they measure the repository.

**On "mutation-checked" — what is actually evidenced.** Every guard was shown red against its target
defect at execution time, but that evidence was preserved unevenly:

- **U7 / U8** — mutation matrices M1–M4 are tabulated in `docs/reviews/phase-0-closeout-check.md` §4,
  with the exact red assertion text, by an independent reviewer.
- **R1 / R2 / R3 / R3b** — mutations were run and their red output reported in each unit's own report at
  execution time, but **were not independently preserved in `docs/`**. Treat those in-unit claims as
  self-reported.
- **Independent re-execution — performed and published.** The 2026-08-02 final Check ran four fresh
  mutations in a disposable worktree and all four went red naming the offending site. That result is
  recorded in `docs/05-qa/phase-0-final-check.md` (reviewer **R-A**), which also carries the re-checks
  of every finding and the final certification. It is therefore the **durable independent** mutation
  evidence for R1–R3b, and the only one — the in-unit claims remain self-reported.

No mutation evidence has been reconstructed retroactively, and none is cited from a document that does
not contain it.

**Not established.** A green suite still does not mean a verified product — that is Phase 1's objective,
and the §0 warning in `docs/project-status.md` stands unchanged. Coverage remains visibility-only outside
`stack-evaluator`. E2E is excluded from CI and every write path sits behind the `E2E_LIVE` gate. CI can be
bypassed by anyone with push access until branch protection lands.

**A process observation worth carrying.** Phase 0's remediation units repeatedly blocked on *documentation
accuracy* rather than code: a guard whose header overclaimed what it detected, a test whose assertion
could not go red against the defect it named, a limitation stated that the code did not have. The
technique that caught all three — running every documented claim against the implementation and tabulating
claim→observed — is cheap and belongs in the standard toolkit. See `CLAUDE.md` §2.2 rule 7.

---

## 7. Next

Per `docs/roadmap.md`, Phase 1 — **Verification integrity** — is next. Its first item is route-handler
tests for all 23 routes, which would also close **F6**.

Before Phase 1 opens, the outstanding Phase 0 action is the **independent final Check**
(`docs/05-qa/phase-0-final-check.md`), which this report does not substitute for.
