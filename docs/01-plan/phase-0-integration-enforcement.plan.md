# Phase 0 — Integration & Enforcement Recovery (Plan)

> **Status: DRAFT — awaiting user approval.** Per `CLAUDE.md` §6, a Draft plan outranks nothing.
> **Created:** 2026-07-30 · **Planning only — nothing in this document has been executed.**
> **Companion review:** `docs/reviews/phase-0-plan-review.md`
>
> This plan adds **no user-facing scope**. It converts the repository's current, verified-but-unbacked
> state into a versioned, reproducible, automatically verified foundation.

---

## 1. Verified starting state (measured 2026-07-30, immediately before writing this plan)

| Property | Value | Command |
|---|---|---|
| Working directory | `…/Supplement-Advisor/v1.0` | `pwd` |
| Git repository root | `…/Supplement-Advisor/v1.0` (identical) | `git rev-parse --show-toplevel` |
| Current branch | `feat/food-pairings-v12` | `git rev-parse --abbrev-ref HEAD` |
| Upstream | `origin/feat/food-pairings-v12` | `git rev-parse --abbrev-ref @{u}` |
| Ahead of upstream | **1** commit (`d9fc1ef`, unpushed) | `git rev-list --left-right --count @{u}...HEAD` → `0 1` |
| vs `main` | **14 ahead, 0 behind** | `git rev-list --left-right --count main...HEAD` → `0 14` |
| merge-base | `30f74e1` == `main` → **ff-only viable** | `git merge-base main HEAD` |
| Staged changes | **none** | `git diff --cached --name-status` |
| Existing tags | **none** | `git tag` |
| CI | **none** (`.github/` absent) | `ls .github` |
| Remote | `github.com/benhwangisthebest/supplement-stack-intelligence` — **PUBLIC** | GitHub API → `"private": false` |
| Typecheck | clean, exit 0 | `npx tsc --noEmit` |
| Unit tests | **408 passed / 408**, 39 files | `npx vitest run` |
| Production build | succeeds | `npx next build` |
| Coverage (current scope) | 72.42% lines over `src/lib/**` only | `npx vitest run --coverage` |
| Git history secrets | **clean** across all 15 commits | full-history diff grep for key patterns |
| `graphify-out/` | 29 MB / 223 files, **untracked**, **inside** the repo, **no secrets** | `du -sh`, full 223-file grep |

### 1.1 Uncommitted / untracked inventory

**Documentation (untracked, created by the transition tasks):** root `CLAUDE.md`, `docs/product-direction.md`,
`docs/project-status.md`, `docs/roadmap.md`, `docs/reviews/mvp-transition-check.md`,
`docs/archive/original-mvp-instructions.md`.

**Documentation (modified):** `.claude/CLAUDE.md` (superseded banner), `README.md` (maturity statement),
`docs/archive/2026-07/_INDEX.md` (v13 entry).

**v13 `evidence-disclosure` application work — modified:** `src/data/seed-papers.ts`,
`src/data/seed-products.ts`, `src/types/paper.ts`, `src/lib/validation/seed.ts`, `src/lib/advisor/tools.ts`,
`src/lib/evidence/evidence.test.ts`, `src/components/advisor/ProvenanceChips.tsx`,
`src/components/evidence/EvidenceBreakdown.tsx`, `src/components/evidence/PaperSummaryCard.tsx`,
`src/components/library/SupplementDetail.tsx`, `tests/e2e/product-match-e2e.spec.ts`.
**Untracked:** `src/components/evidence/IllustrativeDatasetNotice.tsx`, `src/data/seed-integrity.test.ts`,
`tests/e2e/evidence-disclosure.spec.ts`.

**Pre-existing untracked docs (NOT part of Phase 0):** `docs/01-plan/features/context-adjusted-evidence.plan.md`,
`docs/02-design/features/evidence-grading.design.md`, `docs/archive/2026-07/evidence-disclosure/` (4 files).

**Noise / must never be committed:** `.bkit/audit/*.jsonl`, `.bkit/runtime/token-ledger.ndjson`,
`.bkit/runtime/first-run-seen.json`, `test-results/**`, `graphify-out/**`.

**Already tracked but noisy (pre-existing, out of scope to fix):** 9 `.bkit/*` files
(`.bkit-memory.json`, `.bkit/audit/2026-06-{12,15}.jsonl`, `.bkit/runtime/{cc-version,memory-directives,otel-env,session-ctx-fp}.json`,
`.bkit/state/{pdca-status,session-history}.json`), `test-results/.last-run.json`, `test-results 2/.last-run.json`.

### 1.2 Commit chain (`main..HEAD`, oldest first) — the tag-mapping evidence
```
8b671e2 medication-interactions (v2)     9808710 Cal.com design-system overhaul  <- NO version label
4d32771 biomarker-intelligence (v3)      26034f6 advisor-experience (v8)
dd32585 lab-timeline (v4)                589954a identity-cards (v9)
537aada evidence-grading (v5)            e910ea5 daily-checkin (v10)
a53c365 test: lab-timeline live E2E      51d2134 food-pairings (v12)   <- v12 BEFORE v11
d45ec6f ai-advisor (v6)                  d89cf1c side-effect-engine (v11)
1e4e6fa advisor-actions (v7)             d9fc1ef boundary repair       <- NO version label
```

---

## 2. Phase 0 objective

Create a controlled path from the current post-MVP state to a **versioned, reproducible, automatically
verified** functional-beta foundation — improving enforcement and repository reliability **without**
adding user-facing scope and **without** unnecessary architectural rewrites.

---

## 3. Included work (accepted)

| Unit | Summary |
|---|---|
| **U1** | `.gitignore` hygiene (pre-push protective gate) |
| **U2** | Documentation baseline commit (incl. correcting a wrong path in `CLAUDE.md` §11) |
| **U3** | v13 `evidence-disclosure` commit (code, separate from docs) |
| **U4** | Push the feature branch — removes the data-loss risk |
| **U5** | Minimal CI workflow |
| **U6** | Coverage **visibility** correction (scope only, not thresholds) |
| **U7** | Architecture-boundary extension — only rules that pass today |
| **U8** | Reference-data ID stability safeguard |
| **U9** | Fast-forward `main` and push it |

## 4. Explicitly excluded work (with reasons)

| Excluded | Reason (evidence) |
|---|---|
| Vitest `include` → `{ts,tsx}` + jsdom | **No-op today.** Zero `.tsx` test files exist; no `jsdom`, no `@testing-library` installed. Flipping `include` alone changes nothing and creates false readiness. Bundle it with the first real component test. |
| Separate "architecture-boundary tests" CI step | **Redundant.** `boundaries.test.ts` already matches `include: ["src/**/*.test.ts"]` and runs inside the 408. |
| Extending coverage **thresholds** to every engine | **Would fail CI on day one.** Measured below the 80/80/70/80 bar: `lab-import` 75.64/91.66/**64.7**, `compare` 78.57/100/**50**, `advisor/actions` 74.41/**66.98**/95, `validation` 46.7/72/75 (`schemas.ts` 0%). |
| A global/repo-wide coverage floor | Full-`src/` coverage is 47.11% lines / 68.86% functions. Any plausible 70% floor fails immediately. |
| Lint as a blocking CI gate | `next lint` with **zero** eslint deps and no config — passes vacuously or fails spuriously in non-interactive CI. |
| `DOMAIN_IS_PURE` as a directory-level rule | **Fails today.** `src/lib/identity/context.ts`, `src/lib/advisor/context-loader.ts`, `src/lib/advisor/actions/execute.ts` sit inside engine directories yet import repos. Needs a file-level allowlist — deferred to Phase 1. |
| "Client components must not import domain engines" | **Fails today** in 7 client components (`ProfileForm.tsx`→`@/lib/interactions/medication-names`, `StackItemRow.tsx`→`@/lib/product-matcher`, `LabMarkerModal.tsx`, `LabMarkerTable.tsx`, `StackWorkspace.tsx`, `DailyCheckinForm.tsx`, `AuthForm.tsx`). Enforcing it requires broad refactoring — rejected for Phase 0. |
| Retroactive tags `v2`–`v13` | See §5 U-DEFER-1. The chain cannot support them honestly. |
| Deleting local or remote feature branches | Irreversible on the remote; blocked behind the tag decision. |
| Branch protection on `main` | Must come **after** CI has run green once, so the required-check name exists. Deferred to end of Phase 0 or Phase 1. |
| E2E in CI | 17/23 specs `E2E_LIVE`-gated; `fullyParallel: true` races a single shared demo user whose seed does destructive per-user deletes; `webServer` runs `npm run dev`. Needs per-worker isolation first. |
| Any secret in CI | Verified unnecessary — `getSupabaseEnv()` reads env inside the function body and throws at call time; the only `generateStaticParams` route (Library) imports no Supabase client. On a **public** repo, adding secrets creates an exfiltration surface for zero benefit. |
| Any application-code refactor | Out of scope by definition. |
| Rewriting pushed history to purge tracked `.bkit/*` noise | History is secret-clean; rewriting a public shared branch is disproportionate. |

---

## 5. Implementation units

### U1 — `.gitignore` hygiene (protective pre-push gate) — ✅ **COMPLETE** (commit `4337a24`, 2026-07-30)
> Executed as planned, plus `*.swp`/`*.swo` added by the user. Four files are now **ignored-but-still-tracked**
> (`test-results/.last-run.json`, `test-results 2/.last-run.json`, `.bkit/audit/2026-06-{12,15}.jsonl`) — adding
> an ignore rule does not untrack them. They require a separate, explicitly approved `git rm --cached` cleanup.
- **Objective:** Ensure no generated artifact, session log, or E2E trace can be swept into a commit destined for a **public** remote.
- **Files expected to change:** `.gitignore` only.
- **Forbidden from changing:** any file under `src/`, `supabase/`, `tests/`; `package.json`; `vitest.config.ts`; `playwright.config.ts`; `tsconfig.json`.
- **Prerequisites:** none.
- **Steps:** Append entries for `graphify-out/`, `test-results/`, `.bkit/audit/`, `.bkit/runtime/token-ledger.ndjson`, `.bkit/runtime/first-run-seen.json`. Do **not** remove already-tracked files from the index in this unit (that is a separate, noisier change).
- **Verification:** `git check-ignore -v graphify-out test-results .bkit/audit` → each matches a `.gitignore` line. `git status --short` → the ~230 noise entries disappear. `npx vitest run` → still 408/408 (proves nothing executable was touched).
- **Expected result:** Working tree shows only intentional changes; `graphify-out/` (29 MB) can never be accidentally staged.
- **Rollback:** `git checkout -- .gitignore` (single-file edit, uncommitted at this point).
- **Dependencies:** none. **Must precede U2, U3, U4.**
- **Approval required:** No (local, non-destructive, reversible).
- **Commit boundary:** Fold into U2's commit, or commit alone as `chore: ignore generated artifacts and session logs`.

### U2 — Documentation baseline
- **Objective:** Put the active project instructions and transition documents under version control. This is the single most important Phase 0 unit — the authoritative `CLAUDE.md` is currently untracked.
- **Files expected to change / be added:** `CLAUDE.md` (fix §11 — it wrongly says the graph is at `../graphify-out/` "repo-adjacent"; it is **inside** the repo at `graphify-out/`), `docs/product-direction.md`, `docs/project-status.md`, `docs/roadmap.md`, `docs/reviews/mvp-transition-check.md`, `docs/reviews/phase-0-plan-review.md`, `docs/01-plan/phase-0-integration-enforcement.plan.md`, `docs/archive/original-mvp-instructions.md`, `.claude/CLAUDE.md`, `README.md`, `docs/archive/2026-07/_INDEX.md`.
- **Forbidden from changing:** everything under `src/`, `supabase/`, `tests/`; all config files.
- **Prerequisites:** U1.
- **Steps:** Correct `CLAUDE.md` §11 path. Stage **only** the paths listed above by explicit path (never `git add -A`). Verify the staged set contains zero `src/` entries. Commit.
- **Verification:** `git diff --cached --name-only | grep -E "^(src|supabase|tests)/"` → **empty**. `git ls-files CLAUDE.md` → returns the path. `npx tsc --noEmit` and `npx vitest run` unchanged (408/408).
- **Expected result:** One docs-only commit; instructions are versioned.
- **Rollback:** `git reset --soft HEAD~1` (local only, nothing pushed yet).
- **Dependencies:** U1.
- **Approval required:** **Yes** — creates a commit.
- **Commit boundary:** `docs: version active project instructions and MVP-transition documents`.

### U3 — v13 `evidence-disclosure` commit
- **Objective:** Commit the pre-existing trust-layer integrity fix as its own atomic change, **not** bundled with documentation.
- **Files expected to change:** exactly the 11 modified + 3 untracked v13 files listed in §1.1.
- **Forbidden from changing:** any documentation file (already committed in U2); `.bkit/**`; `test-results/**`; `graphify-out/**`; `docs/01-plan/features/context-adjusted-evidence.plan.md`; `docs/02-design/features/evidence-grading.design.md`; `docs/archive/2026-07/evidence-disclosure/**` (pre-existing untracked docs needing their own decision).
- **Prerequisites:** U1, U2. **Independent code review completed — verdict APPROVE, 0 critical / 0 high / 0 medium.**
- **Steps:** Stage the 14 v13 paths explicitly. Confirm the staged set contains no documentation. Commit.
- **Verification:** `npx tsc --noEmit` clean; `npx vitest run` 408/408 including `src/data/seed-integrity.test.ts` (4 tests); `npx next build` succeeds; `grep -rn "example\.org" src/` → empty.
- **Expected result:** One code commit; the anti-fabrication guards (G1/G2) gain a git object for the first time.
- **Rollback:** `git reset --soft HEAD~1`.
- **Dependencies:** U2.
- **Approval required:** **Yes** — creates a commit.
- **Commit boundary:** `feat: evidence-disclosure (v13) — remove unverifiable provenance, add integrity guards`.

### U4 — Push the feature branch (**backup — highest urgency**)
- **Objective:** Eliminate the single-machine data-loss risk. Until this runs, `d9fc1ef` and all of v13 exist on exactly one disk.
- **Files changed:** none (remote operation).
- **Prerequisites:** U1–U3 complete; `.gitignore` verified so no noise is pushed to a **public** repo.
- **Steps:** `git push origin feat/food-pairings-v12`.
- **Verification:** `git rev-list --left-right --count @{u}...HEAD` → `0 0`.
- **Expected result:** 3 commits (`d9fc1ef` + U2 + U3) reach `origin`.
- **Rollback:** None clean — a push to a public repo is **effectively irreversible** (forks/mirrors/caches). This is precisely why U1 must precede it.
- **Dependencies:** U1, U2, U3.
- **Approval required:** **YES — explicit, and the highest-consequence approval in Phase 0**, because the remote is public.

### U5 — Minimal CI workflow
- **Objective:** Make the local verification suite run automatically, so no later Phase 0 gain can silently regress.
- **Files expected to add:** `.github/workflows/ci.yml` only.
- **Forbidden from changing:** everything else.
- **Prerequisites:** U4 (a pushed branch, so CI has something to run against).
- **Steps / specification:**
  - **Triggers:** `pull_request` (all branches) + `push` on `main`. Deliberately **not** `pull_request_target` — that form can expose secrets to fork PRs on a public repo.
  - **Runner:** `ubuntu-latest`. **Node:** pin `node-version: "20"` via `actions/setup-node@v4` — `package.json` declares no `engines` field, so the version must be pinned in the workflow.
  - **Package manager:** npm. `package-lock.json` exists → use `npm ci`, never `npm install`.
  - **Cache:** `actions/setup-node` built-in `cache: "npm"`, keyed on `package-lock.json`.
  - **Secrets: NONE.** Verified unnecessary (§4). Do not add any.
  - **Steps, in order, each blocking:** (1) `npm ci` (2) `npx tsc --noEmit` (3) `npx vitest run` (4) `npx next build`.
  - **Coverage:** `npx vitest run --coverage` may run as a **non-blocking reporting** step. It must not gate.
  - **E2E:** excluded (§4).
  - **Failure behaviour:** fail fast; no `continue-on-error` on steps 1–4.
- **Verification:** Open a throwaway PR (or push a scratch branch) and confirm the workflow runs green in a clean environment with no secrets configured. **Do not mark U5 done merely because the file exists.**
- **Expected result:** A green required check whose name can later back branch protection.
- **Rollback:** Delete the workflow file; disable the workflow in the Actions UI.
- **Dependencies:** U4.
- **Approval required:** **Yes** — adds a workflow consuming Actions minutes on a public repo.
- **Commit boundary:** `ci: add minimal verification workflow (typecheck, unit, build)`.

### U6 — Coverage **visibility** correction
- **Objective:** Stop the coverage report from hiding whole directories. Visibility only — no new gate.
- **Files expected to change:** `vitest.config.ts` only.
- **Forbidden from changing:** the existing `thresholds` block; the test-discovery `include`; any source file.
- **Prerequisites:** U5 (so the change is observed by CI).
- **Steps:** Widen `coverage.include` from `["src/lib/**/*.ts"]` to the full `src/` tree; keep `coverage.exclude` for test files. **Do not** touch `thresholds`.
- **Verification:** `npx vitest run --coverage` → exit **0**, and the report now lists `src/app`, `src/services`, `src/components`, `src/lib/db`. Confirmed safe: measured 47.11% lines with exit 0, because the surviving thresholds target only `src/lib/stack-evaluator/**`, numerically unaffected by widening `include`.
- **Expected result:** Real gaps become visible instead of invisible. Record in the commit message that widening `include` does **not** imply a global floor is safe.
- **Rollback:** `git checkout -- vitest.config.ts`.
- **Dependencies:** U5.
- **Approval required:** **Yes** — creates a commit and edits a config file.
- **Commit boundary:** `test: widen coverage reporting scope to all of src/ (visibility only, no new gate)`.

### U7 — Architecture-boundary extension (only rules that pass today)
- **Objective:** Close the "ungoverned layer" gap without demanding refactoring. Every rule here is a **ratchet** — written to pass against the current tree.
- **Files expected to change:** `src/architecture/boundaries.test.ts`; `docs/02-design/architecture-boundaries.md` (spec update).
- **Forbidden from changing:** any file under `src/lib`, `src/data`, `src/services`, `src/app`, `src/components`, `src/types`. If a rule requires a source edit, that rule is out of scope for Phase 0.
- **Prerequisites:** U5.
- **Rules, each with verified current status:**

| Rule | Reason | Permitted | Prohibited | Passes today? | False-positive risk | Migration needed |
|---|---|---|---|---|---|---|
| Add `src/services` to `SCANNED_LAYERS` | A documented Application layer, currently ungoverned; nothing stops it importing `@/app`. | `@/lib/**`, `@/types/**`, external pkgs | `@/app/**` | **Yes** — `grep 'from "@/app' src/services` → empty | Low | None |
| Add `src/data` to `SCANNED_LAYERS` | Reference data must not reach upward. | — | `@/app/**` | **Yes** — grep empty | Low | None |
| `DATA_IS_A_LEAF`: `src/data/**` imports only `src/types/**` (+ intra-`src/data`) | Keeps the knowledge base a pure leaf, preserving the future codegen path. | `@/types/*`, `@/data/*` | `@/lib`, `@/services`, `@/app`, external pkgs | **Yes, with a test-file exemption** — non-test `src/data/*.ts` import only `@/types*` and `@/data/*`; `seed-integrity.test.ts` imports `node:fs`, `node:path`, `vitest` | **Medium** — the rule MUST exempt `*.test.ts` or it fails immediately | None (exemption lives in the rule, not the source) |
| Tree-partition sanity: every top-level `src/*` dir is scanned or explicitly exempted with a written reason | Today's sanity check only asserts `ALL_FILES.length > 50`, so a whole new layer can appear ungoverned — which is how `src/services` arose. | — | — | **Yes**, once `src/services`/`src/data` are added and `src/app`, `src/architecture` are listed exempt-with-reason | Low | None |

- **Steps:** Add the two layers; implement `DATA_IS_A_LEAF` **with the test-file exemption**; add the tree-partition test. **Mutation-check each new rule** — plant a violation, confirm red, revert — per `CLAUDE.md` §5.2.
- **Verification:** `npx vitest run src/architecture/boundaries.test.ts` → green, count > 16. Then full `npx vitest run` → ≥ 408 plus new tests, zero regressions. Each new rule demonstrated red-then-green.
- **Expected result:** Two previously ungoverned layers governed; no source file changed.
- **Rollback:** `git checkout -- src/architecture/boundaries.test.ts docs/02-design/architecture-boundaries.md`.
- **Dependencies:** U5.
- **Approval required:** **Yes** — creates a commit.
- **Commit boundary:** `test(architecture): govern src/services and src/data; add data-leaf and layer-registration rules`.

### U8 — Reference-data ID stability safeguard
- **Objective:** Make silent orphaning of user data impossible. Four persisted columns are `text` with **no foreign key**:
  `stack_items.supplement_id` (0001, explicitly documented "SOFT reference … no FK"), `stack_items.product_id` (0004),
  `lab_markers.biomarker_id` (0002), `side_effect_reports.effect_label` (0007, canonical vocabulary).
  Renaming or removing a seed ID today produces a blank, unevaluable row with no detection and no test.
- **Files expected to add / change:** a checked-in ID manifest (e.g. `src/data/id-manifest.json`) + a guard test (e.g. `src/data/id-stability.test.ts`).
- **Forbidden from changing:** any migration under `supabase/migrations/**`; any existing seed data file; any engine. **Explicitly do NOT add a foreign key** — that would force reference data into Postgres for the wrong reason.
- **Prerequisites:** U5. Should land **before** any content work, since Phase 3 necessarily changes content.
- **Steps:** Generate the manifest from current `SEED_SUPPLEMENTS`, `SEED_EFFECTS`, `SEED_PAPERS`, `SEED_PRODUCTS`, `SEED_BIOMARKERS`, and `SIDE_EFFECT_VOCAB`. Add a test asserting every ID in the manifest still resolves. Removal requires an explicit tombstone entry plus a data migration.
- **Verification:** New test green. **Mutation-check:** temporarily rename one seed ID → test goes red; revert → green.
- **Expected result:** The append-only ID contract in `CLAUDE.md` §2.16 becomes executable rather than aspirational.
- **Rollback:** Delete the two new files.
- **Dependencies:** U5.
- **Approval required:** **Yes** — creates a commit.
- **Commit boundary:** `test(data): add append-only reference-data ID manifest and stability guard`.

### U9 — Fast-forward `main` and push
- **Objective:** Make `main` represent the product. It is currently a 2-commit MVP that misrepresents the repository to any new reader or agent.
- **Files changed:** none (git operation).
- **Prerequisites:** U1–U8 complete; CI green on the feature branch; U4 pushed.
- **Steps:** `git checkout main` → `git merge --ff-only feat/food-pairings-v12` → `git push origin main`. Direction verified: `main` is an ancestor of `HEAD` (merge-base == `main`), so the ff-only merge **cannot** conflict.
- **Verification:** `git rev-list --left-right --count main...feat/food-pairings-v12` → `0 0`; `main` contains `CLAUDE.md`, `boundaries.test.ts`, `.github/workflows/ci.yml`; CI green on `main`.
- **Expected result:** `main` is current and CI-verified.
- **Rollback:** Before pushing, `git reset --hard 30f74e1` restores `main` locally. **After** pushing, rollback requires a force-push to a public default branch — treat as a one-way door.
- **Dependencies:** all prior units.
- **Approval required:** **YES — separate, explicit approval**, distinct from U4's.

### Deferred units (planned, NOT accepted into Phase 0)

**U-DEFER-1 — Retroactive tags `v2`–`v13`. RECOMMENDATION: do not create them.**
The chain cannot support honest tags. Evidence from `git log --oneline --reverse main..HEAD`:
- **Unambiguous (8):** v2 `8b671e2`, v3 `4d32771`, v5 `537aada`, v6 `d45ec6f`, v7 `1e4e6fa`, v8 `26034f6`, v9 `589954a`, v10 `e910ea5`.
- **Ambiguous (1):** v4 — `dd32585` plus a later fix `a53c365` landing *after* v5.
- **Order-inverted (2):** v12 `51d2134` was committed **before** v11 `d89cf1c`. Tagging both yields tags whose version order contradicts history order.
- **Impossible (1):** v13 has no commit yet (it becomes U3's commit, which is not the historical v13).
- **Unlabelled (2):** `9808710` (Cal.com design overhaul) and `d9fc1ef` (boundary repair) carry no version at all.
Tagging would encode a false ordering into an immutable, pushed artifact. Defer; if release marking is wanted later, tag **going forward** from `main` only.

**U-DEFER-2 — Delete local/remote feature branches.** Blocked behind U-DEFER-1. Remote deletion is irreversible in practice (recovery depends on someone holding the SHA; local reflog expires ~90 days). No Phase 0 exit criterion needs it.

**U-DEFER-3 — Branch protection on `main`.** Must follow at least one green CI run so the required-check name is registered; otherwise merges block with no passing path. Minimum ruleset when done: require PR, require the CI check, forbid force-push, forbid deletion.

**U-DEFER-4 — `.tsx`/jsdom test discovery** · **U-DEFER-5 — per-engine coverage thresholds** · **U-DEFER-6 — `DOMAIN_IS_PURE` (file-level allowlist)** · **U-DEFER-7 — client-component import rule** · **U-DEFER-8 — E2E in CI.** All rejected for Phase 0 per §4; each belongs in Phase 1.

---

## 6. Dependency order

```
U1 (.gitignore) -> U2 (docs commit) -> U3 (v13 commit) -> U4 (PUSH, approval)
                                                            |
                                                            v
                                                       U5 (CI, approval)
                                                            |
                                     +----------------------+----------------------+
                                     v                      v                      v
                               U6 (coverage)         U7 (boundaries)        U8 (ID manifest)
                                     +----------------------+----------------------+
                                                            v
                                                U9 (ff-merge main, approval)
```
U6, U7, U8 are mutually independent and may be done in any order or in parallel.

## 7. Proposed commit sequence

| # | Commit | Contents | Approval |
|---|---|---|---|
| 1 | `chore: ignore generated artifacts and session logs` | `.gitignore` (U1) | No |
| 2 | `docs: version active project instructions and MVP-transition documents` | U2 doc set | Yes |
| 3 | `feat: evidence-disclosure (v13) …` | 14 v13 code files (U3) | Yes |
| — | **PUSH branch** (U4) | no commit | **Yes** |
| 4 | `ci: add minimal verification workflow …` | `.github/workflows/ci.yml` (U5) | Yes |
| 5 | `test: widen coverage reporting scope …` | `vitest.config.ts` (U6) | Yes |
| 6 | `test(architecture): govern src/services and src/data …` | boundaries test + design doc (U7) | Yes |
| 7 | `test(data): add append-only reference-data ID manifest …` | manifest + guard (U8) | Yes |
| — | **ff-merge + push `main`** (U9) | no commit | **Yes** |

**Rule: no commit mixes documentation with application code, and no remote operation shares a step with a code or configuration edit.**

## 8. Verification matrix

| Unit | Command | Expected |
|---|---|---|
| U1 | `git check-ignore -v graphify-out test-results .bkit/audit` | each matches a `.gitignore` line |
| U1 | `npx vitest run` | 408/408 (nothing executable touched) |
| U2 | `git diff --cached --name-only \| grep -E "^(src\|supabase\|tests)/"` | **empty** |
| U2 | `git ls-files CLAUDE.md` | returns `CLAUDE.md` |
| U3 | `npx tsc --noEmit` · `npx vitest run` · `npx next build` | clean · 408/408 · succeeds |
| U3 | `grep -rn "example\.org" src/` | empty |
| U4 | `git rev-list --left-right --count @{u}...HEAD` | `0 0` |
| U5 | CI run in a clean env, **no secrets** | all 4 steps green |
| U6 | `npx vitest run --coverage` | exit 0; report lists `src/app`, `src/services`, `src/components`, `src/lib/db` |
| U7 | `npx vitest run src/architecture/boundaries.test.ts` | green, > 16 tests; each new rule shown red-then-green |
| U8 | rename a seed ID → run guard → revert | red, then green |
| U9 | `git rev-list --left-right --count main...feat/food-pairings-v12` | `0 0` |

## 9. Approval gates

| Gate | Operation | Why it needs its own approval |
|---|---|---|
| **G1** | Any commit (U2, U3, U5–U8) | `CLAUDE.md` §10.5 — commits need explicit approval each time |
| **G2** | **Push feature branch (U4)** | Remote is **public**; a push is effectively irreversible |
| **G3** | **ff-merge + push `main` (U9)** | Changes the default branch on a public repo; separate from G2 |
| **G4** | Tags / branch deletion / branch protection | Deferred — must not be treated as authorized by any approval above |

Approval of one gate never implies approval of a later one.

## 10. Rollback strategy

- **U1, U6, U7:** `git checkout -- <file>` (single-file, uncommitted).
- **U2, U3, U5, U8 (local commits, pre-push):** `git reset --soft HEAD~1` — fully reversible.
- **U4 (push):** **no clean rollback.** A public push may be forked, mirrored, or cached within seconds. Mitigation is preventive: U1 must land first, and the staged set must be verified by explicit path.
- **U9 (`main` push):** locally `git reset --hard 30f74e1`; after push, only a force-push to a public default branch — treat as a one-way door.
- **Whole-phase abort:** every unit is a separate commit and no history is rewritten, so `git revert` of individual commits is always available and the pre-Phase-0 state remains recoverable from `d9fc1ef`.

## 11. Phase 0 exit criteria (all must be objectively true)

1. Active project instructions are **version-controlled** — `git ls-files CLAUDE.md` returns a result.
2. Documentation reflects actual repository state — `docs/project-status.md` and `README.md` match measured git/test state; `CLAUDE.md` §11 graphify path corrected.
3. CI **runs automatically** on PR and on `main` push, and has been observed **green in a clean environment with no secrets**. *A workflow file existing is not sufficient.*
4. `npx tsc --noEmit` passes in CI.
5. All intended unit and architecture tests are **discovered and pass** in CI — ≥ 408 plus new U7/U8 tests; boundaries test confirmed included in the run.
6. `npx next build` passes in CI.
7. Architecture boundaries enforced for `src/types`, `src/components`, `src/lib`, **`src/services`, `src/data`**, with every top-level `src/*` directory either scanned or exempted with a written reason.
8. Persisted reference-data IDs have an **executable** stability safeguard (U8), mutation-verified — or a dated, written deferral decision recorded in `docs/project-status.md`.
9. Current work is **backed up to `origin`** — `git rev-list --left-right --count @{u}...HEAD` → `0 0`.
10. The branch↔`main` relationship is documented — either `main` is fast-forwarded (U9) or the divergence and its reason are recorded in `docs/project-status.md`.
11. **No destructive branch or history operation occurred without approval** — no tag created, no branch deleted, no force-push, no rebase. Verify: `git tag` matches the approved decision; `git branch -a` still lists all 10 feature branches unless deletion was separately approved.
12. **No user-facing feature scope added** — `git diff main..HEAD -- src/app src/components` introduces no new route, page, or user-visible capability beyond the already-reviewed v13 disclosure notice.

## 12. Transition criteria into Phase 1 (Verification Integrity)

Phase 1 may begin when: all §11 criteria hold; CI has been green on `main` for at least one run; deferred units
U-DEFER-3 … U-DEFER-8 are recorded as Phase 1 candidates; and `docs/project-status.md` is updated so no
subsystem classification is stale. Phase 1's first targets should be the **genuine** coverage gaps that U6 makes
visible — `src/lib/db` and `src/lib/supabase` at 0%, `src/lib/validation/schemas.ts` at 0%, and
`src/lib/advisor/actions/execute.ts` — not the merely-invisible ones.
