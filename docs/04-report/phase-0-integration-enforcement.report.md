# Phase 0 — Integration & Enforcement Recovery (Completion Report)

> **Status: COMPLETE WITH FOLLOW-UP** · **Date:** 2026-08-02
> **Final state:** `main` @ `1792f9f984d506340aced37a4dd2cf4adee6cfe9` (= `origin/main`, 0 ahead / 0 behind)
> **CI:** [run 30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782)
> — `push` / `main` / head SHA `1792f9f`, conclusion **`success`**
> **Plan:** `docs/01-plan/phase-0-integration-enforcement.plan.md` (Completed 2026-08-02)
> **Independent closeout review:** `docs/reviews/phase-0-closeout-check.md` (2026-08-01, + resolution addendum)
> **Final independent Check:** **not yet run** — scaffolded at `docs/05-qa/phase-0-final-check.md`

**"Complete with follow-up", not "complete".** Every unit shipped and every blocking closeout finding is
resolved, but four roadmap exit criteria remain unmet by deliberate deferral, seven findings are carried
into Phase 1, and the independent final Check has not been performed. Calling this unconditionally
complete would be the exact failure mode `CLAUDE.md` §5.1 names.

---

## 1. Objective and outcome

**Objective.** Make the repository's verified state real, durable, and automatically re-verified — at the
start of Phase 0, every quality property of this project was true only in one uncommitted working tree on
one machine.

**Outcome.** `main` is the working tip, publicly pushed, with a green CI run on the exact SHA. Two
executable architecture specs and a reference-ID stability contract now re-verify on every run, and each
was mutation-checked. A rank-1 error-disclosure violation that predated Phase 0 was found and closed.

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

C-2 (111 untracked sync-conflict duplicates on a public repo) was resolved by **relocation**: the
repository moved off the synced Desktop tree to `/Users/<redacted>/Developer/supplement-stack-intelligence`.
C-3 and C-4 (stale governing documents) are resolved by this documentation unit.

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

### Unmet Phase 0 exit criteria (annotated in `docs/roadmap.md`)

| Item | Status | Why |
|---|---|---|
| Tags `v2`…`v13`; zero `feat/*` branches | **Unmet** (U-DEFER-1) | The chain cannot support honest tags — v12 `51d2134` precedes v11 `d89cf1c`. 0 tags, 9 remote `feat/*`. |
| **Branch protection / CI as required status** (**C-6**) | **Unmet** (U-DEFER-3) | Needs a repository-settings change and separate explicit approval. `main` is force-pushable today. |
| A `.tsx` test collected under `src/` (**C-12**) | **Unmet** (U-DEFER-4) | `vitest.config.ts` collects `*.test.ts` only. Zero `.test.tsx` exist; latent. |
| `fix/**` absent from the CI trigger list | **Unmet** | Every `fix/*` branch in Phase 0 needed a manual `workflow_dispatch`. A trigger-list addition would close it. |

### Findings carried into Phase 1

| ID | Item |
|---|---|
| **C-5** | `NO_UI_IMPORT` was enforced without plan authorization — now documented and ratified, not re-litigated. |
| **C-9** | No `E2E_LIVE`-gated Playwright block carries the `[LIVE]` tag (`CLAUDE.md` §5.9). Must close before any Phase 1 E2E-in-CI work. |
| **C-10** | `docs/archive/2026-07/evidence-disclosure/**` was committed despite exclusion; content correct, staging decision unrecorded. |
| **C-11** | Tree-partition ignores loose files and symlinks. Latent — none exists today. |
| **C-13** | No `LICENSE` on a public repository. Default copyright applies. **Needs a user decision.** |
| **F3** | `handle()` classifies operational errors by substring (`err.message.includes("not configured")`). Safe against every throw site today, structurally fragile — a typed error class is the fix. |
| **F5** | The correlation ID is emitted but no UI surfaces it, so `ApiError`'s "quote in a support ticket" is unrealized. |
| **F6** | No route-level reachability test covers the four fixed handlers (`CLAUDE.md` §5.3). |
| **F7** | The error-disclosure guard documents two detection gaps it does not close: destructured-handler *bodies*, and two-argument `.then(onFulfilled, onRejected)`. No route uses either form. |
| — | **Supplement slug policy** — the relationship between seed IDs and public `/library/[slug]` URLs is unstated; a rename would break both persisted references and inbound links. |
| — | **`boundaries.test.ts` claim→observed pass** (recommended small unit). Three of R3b's blockers were *comment* defects, not code defects. Running each header claim against the implementation caught them in one pass; `boundaries.test.ts`'s header has never had that treatment. |

---

## 6. What Phase 0 actually established, and what it did not

**Established.** The repository now re-verifies itself: two architecture specs, an ID-stability contract,
and an error-boundary suite run on every `npm test` and on every push to `main`. Their inventory comes
from Git, so they measure the repository. Every one was shown red against the defect it targets before
being trusted.

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
