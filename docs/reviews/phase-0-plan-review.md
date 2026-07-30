# Phase 0 Plan — Independent Review

> **Date:** 2026-07-30 · **Subject:** `docs/01-plan/phase-0-integration-enforcement.plan.md`
> **Scope:** read-only. No application code, configuration, or workflow file was created or modified.
> Reviewers were told to **challenge** the proposed work and explicitly **not** to assume that every item
> listed under Phase 0 is necessary, correctly ordered, or safe to execute together.

## Reviewer panel

| Ref | Reviewer | Lens | Outcome |
|---|---|---|---|
| **SEC** | `ecc:security-reviewer` | Secrets, push exposure, CI secret surface, branch protection | Completed — 6 findings |
| **TEST** | `ecc:tdd-guide` | Vitest/coverage claims, CI gate design, E2E gating | Completed — 7 findings, all command-verified |
| **CODE** | `ecc:code-reviewer` | Whether the uncommitted v13 set is safe to commit | Completed — **APPROVE**, 0 critical/high/medium |
| **ARCH** | `ecc:architect` | Boundary rules, ordering, graphify-out, data architecture | **FAILED ×2** (API 529 Overloaded). Scope covered by the lead — see disclosure |
| **REL** | `general-purpose` (release / repo-hygiene) | Tags, git ops, `.gitignore`, commit separation | **FAILED ×2** (API 529 Overloaded). Scope covered by the lead — see disclosure |

### Reviewer-failure disclosure

ARCH and REL each terminated twice with transient `529 Overloaded` API errors and produced **no findings**.
Rather than report their scope as unassessed, the lead performed the decision-critical parts directly with
commands, recorded below as **LEAD** findings with full evidence. This is weaker than an independent second
opinion and is flagged as such: **P-13, P-14, P-15, P-19 and P-20 have single-reviewer confidence**, not
independent corroboration. If a fresh independent architecture opinion is wanted before executing U7, that is
a reasonable additional gate.

---

## Findings

Severity: **critical / high / medium / low / info**. Blocking = blocks Phase 0 execution as originally drafted.

---

### P-01 · The GitHub remote is PUBLIC — this reframes every push in the plan
- **Reviewer:** SEC · **Severity:** high (context-setting) · **Unit:** U4, U9
- **Evidence:** GitHub API for `benhwangisthebest/supplement-stack-intelligence` → `"private": false`.
- **Concern:** The plan's push steps were drafted without establishing remote visibility. On a public repo a push is world-readable immediately and effectively permanent (forks, mirrors, caches survive later deletion).
- **Consequence:** Any hygiene defect becomes irreversible the moment U4 runs, not a cleanup item afterwards.
- **Recommendation:** Treat `.gitignore` hygiene as a **pre-push blocking gate**, and give the push its own approval gate distinct from commit approvals.
- **Blocking:** Yes, for ordering.
- **Resolution:** **Incorporated.** U1 (`.gitignore`) is now a mandatory predecessor of U2/U3/U4. U4's rollback field states plainly there is no clean rollback. Gates G2 and G3 are separate approvals.

### P-02 · Git history is secret-clean — removes a whole risk class
- **Reviewer:** SEC · **Severity:** info · **Unit:** U4, U9
- **Evidence:** Full-history diff grep across all 15 commits for `sk-ant-`, `SUPABASE_SERVICE_ROLE_KEY=<value>`, `API_ANTHROPIC_KEY=<value>`, `eyJhbGciOi`, `AKIA[0-9A-Z]{16}`, PEM blocks → only two hits, both referencing env-var *names* in code/comments, not values. `.env`/`.env.local` never committed.
- **Concern:** None — a clean result.
- **Consequence:** No history rewrite is needed before pushing, which would otherwise have been a large and risky Phase 0 addition.
- **Recommendation:** Explicitly exclude history rewriting from Phase 0.
- **Blocking:** No.
- **Resolution:** **Incorporated** into §4 excluded work ("Rewriting pushed history to purge tracked `.bkit/*` noise").

### P-03 · CI needs no secrets — and adding them would create an exfiltration surface
- **Reviewer:** SEC (verified independently by LEAD) · **Severity:** medium · **Unit:** U5
- **Evidence:** `src/lib/supabase/env.ts:3-4` — `getSupabaseEnv()` reads `process.env` **inside** the function body and throws at call time, not import time. `src/app/api/advisor/route.ts:45` checks the Anthropic key inside the request handler. LEAD-verified: the only `generateStaticParams` route is `src/app/library/[slug]/page.tsx`, whose imports contain no Supabase client. `vitest.config.ts` has no `env`/`setupFiles` requiring credentials.
- **Concern:** A CI workflow that wires real Supabase/Anthropic secrets "for completeness" would expose them to fork-PR exfiltration on a public repo, for zero benefit.
- **Consequence:** Credential compromise risk with no offsetting gain.
- **Recommendation:** Phase 0 CI must have **zero** secrets, and must use `pull_request`, never `pull_request_target`.
- **Blocking:** Yes, for CI design.
- **Resolution:** **Incorporated.** U5 specifies "Secrets: NONE", `pull_request` only, with an explicit note that `pull_request_target` is excluded deliberately.

### P-04 · Untracked artifacts are not gitignored — latent, not current, leak
- **Reviewer:** SEC · **Severity:** low–medium · **Unit:** U1
- **Evidence:** `git check-ignore` reports NOT IGNORED for `graphify-out/`, `test-results/`, `.bkit/audit/`, `.bkit/runtime/token-ledger.ndjson`. LEAD ran a **full 223-file** secret grep across `graphify-out/` → clean (2 files contain absolute local home-directory paths only). The `test-results/.../error-context.md` artifact from the failed login E2E contains a DOM/aria snapshot and source excerpt — no credential value.
- **Concern:** Nothing leaks *today*, but future Playwright traces could capture session cookies, and 29 MB of generated cache could enter history permanently.
- **Consequence:** One careless `git add -A` before the public push would be irreversible.
- **Recommendation:** Add the four ignore entries before any commit; stage by explicit path, never `git add -A`.
- **Blocking:** Yes, as a pre-push gate.
- **Resolution:** **Incorporated** as U1, with "never `git add -A`" written into U2's steps.

### P-05 · `.tsx` test-discovery fix is a NO-OP today — reject from Phase 0
- **Reviewer:** TEST · **Severity:** low (but the plan overstated it) · **Unit:** proposed vitest change
- **Evidence:** `find src -iname "*.test.tsx" -o -iname "*.spec.tsx"` → **zero results**. `grep -i "jsdom\|testing-library" package.json` → zero. `ls node_modules | grep -iE "jsdom|testing-library"` → zero.
- **Concern:** Flipping `include` to `{ts,tsx}` changes nothing about the current run — no `.tsx` test exists to collect. It is a latent trap, not a present defect. Worse, the first real component test written under `environment: "node"` would fail immediately with `document is not defined`.
- **Consequence:** Phase 0 would claim a verification improvement it did not deliver, creating false readiness.
- **Recommendation:** Defer. Bundle the `include` change with `jsdom` + `@testing-library/react` + a jsdom environment **when the first component test is actually written**.
- **Blocking:** No, but the item must be removed from Phase 0.
- **Resolution:** **Incorporated.** Moved to §4 excluded work and U-DEFER-4. This directly overturns an item the lead had previously described as a "one-line fix worth doing in Phase 0."

### P-06 · A separate architecture-boundary CI step would be redundant
- **Reviewer:** TEST · **Severity:** medium · **Unit:** U5
- **Evidence:** `npx vitest run` output includes `✓ src/architecture/boundaries.test.ts (16 tests)` inside the same 39-file/408-test pass — the filename already matches `include: ["src/**/*.test.ts"]`.
- **Concern:** The drafted CI listed "architecture-boundary tests" as its own gate, duplicating work already done by the unit-test step.
- **Consequence:** Doubled execution time for zero added coverage, and a misleading impression that boundaries are separately gated.
- **Recommendation:** Drop the separate step; state explicitly in the plan that boundaries run inside `vitest run`.
- **Blocking:** No.
- **Resolution:** **Incorporated.** §4 lists it as excluded/redundant; U5 has exactly four steps; exit criterion 5 requires confirming the boundaries test is included in the run.

### P-07 · Extending coverage thresholds to every engine WOULD FAIL CI ON DAY ONE
- **Reviewer:** TEST · **Severity:** high · **Unit:** proposed threshold expansion
- **Evidence:** `npx vitest run --coverage`, measured against the proposed 80/80/70/80 bar — `lab-import` 75.64 / 91.66 / **64.7** / 75.64 (`pdf-adapter.ts` 45.73% lines); `compare` 78.57 / 100 / **50** / 78.57; `advisor/actions` 74.41 / **66.98** / 95 / 74.41; `validation` 46.7 / 72 / 75 / 46.7 (`schemas.ts` 0%). Also `api`, `auth`, `db`, `supabase` at 0%.
- **Concern:** The roadmap listed this as Phase 0 work. It would put CI red immediately, on the very unit whose purpose is to make CI trustworthy.
- **Consequence:** A red-on-arrival pipeline trains contributors to ignore CI — the opposite of the Phase 0 objective.
- **Recommendation:** Either lock thresholds only on directories that already pass, or write the missing tests first and add thresholds in a later phase.
- **Blocking:** **Yes** — as originally drafted.
- **Resolution:** **Incorporated.** Excluded from Phase 0 (§4) and recorded as U-DEFER-5. U6 is narrowed to *visibility only* and explicitly forbidden from touching `thresholds`.

### P-08 · "Expand coverage include" is safe, but must not be sold as implying a global floor
- **Reviewer:** TEST · **Severity:** medium · **Unit:** U6
- **Evidence:** `npx vitest run --coverage --coverage.include='src/**/*.{ts,tsx}'` → **exit 0**, `All files 47.11% lines / 80.85% branches / 68.86% functions`. Exit 0 only because the surviving threshold block targets exclusively `src/lib/stack-evaluator/**`, unaffected by widening `include`. `src/app/*` is 0% across 11 route/page directories.
- **Concern:** A future contributor reading "we expanded coverage scope" may reasonably assume a repo-wide floor is now safe. At 47% lines / 69% functions, any plausible 70% floor fails instantly.
- **Consequence:** A well-intentioned follow-up change breaks CI and gets reverted, discrediting the coverage work.
- **Recommendation:** Widen `include` and *say in the commit message* that this does not imply a global floor is safe.
- **Blocking:** No.
- **Resolution:** **Incorporated.** U6's expected-result field requires recording exactly that caveat in the commit message; §4 separately excludes a global floor.

### P-09 · Config-excluded is not the same as genuinely-uncovered
- **Reviewer:** TEST · **Severity:** info (important framing correction) · **Unit:** U6, Phase 1 planning
- **Evidence:** `src/services/evaluation.test.ts` (3 tests) **runs and passes** but appears nowhere in the coverage table — invisible by config. By contrast `src/lib/db` (0/25/25/0), `src/lib/supabase` (0/25/25/0), and `src/lib/validation/schemas.ts` (0%) are **inside** the current glob and genuinely untested.
- **Concern:** The plan (and earlier project-status wording) conflated invisibility with absence of tests.
- **Consequence:** Phase 1 could spend effort on visibility while the real gaps stay untested.
- **Recommendation:** Distinguish the two; point Phase 1 at the genuine gaps first.
- **Blocking:** No.
- **Resolution:** **Incorporated.** §12 names `src/lib/db`, `src/lib/supabase`, `schemas.ts`, and `execute.ts` as Phase 1's first targets, "not the merely-invisible ones."

### P-10 · Lint must not be a blocking CI gate
- **Reviewer:** TEST · **Severity:** high (if ignored) · **Unit:** U5
- **Evidence:** `package.json:9` → `"lint": "next lint"`; `grep -i eslint package.json` → **0** matches; no `.eslintrc*` or `eslint.config.*` exists.
- **Concern:** A blocking `npm run lint` step either passes vacuously on everything (false confidence) or, on some Next versions, prompts/fails for missing config in non-interactive CI (spurious red).
- **Consequence:** Either outcome degrades trust in the pipeline.
- **Recommendation:** Exclude lint from the gate set until a real eslint config and dependency exist.
- **Blocking:** Yes, for the lint sub-item.
- **Resolution:** **Incorporated.** §4 excludes lint as a gate; U5's four steps omit it.

### P-11 · E2E correctly excluded — and the reason is structural, not just gating
- **Reviewer:** TEST · **Severity:** info · **Unit:** U5
- **Evidence:** 23 specs; 17 contain `E2E_LIVE` guards. `playwright.config.ts` sets `fullyParallel: true` and `webServer.command: "npm run dev"`. `src/lib/db/seed.ts:70,81` perform destructive `delete().eq("user_id", userId)` against a **single** shared demo user.
- **Concern:** The suite is flaky **by construction** under parallelism, independent of env gating — which explains why specs "rotted while skipped."
- **Consequence:** Adding E2E to Phase 0 CI would produce intermittent red with no reliable signal.
- **Recommendation:** Keep out of Phase 0. Prerequisites for later: per-worker isolated users (or `fullyParallel: false`), `webServer` pointed at `build && start`, and a decision on whether `E2E_LIVE` specs run in CI at all.
- **Blocking:** No.
- **Resolution:** **Incorporated** into §4 with those prerequisites recorded, and U-DEFER-8.

### P-12 · The v13 change set is complete and safe to commit atomically
- **Reviewer:** CODE · **Severity:** info (**APPROVE**) · **Unit:** U3
- **Evidence:** `tsc --noEmit` clean; 408/408 including `seed-integrity.test.ts` (4 tests). G1 (`seed-integrity.test.ts:37-46`) walks `.ts`/`.tsx` under `src/` for a runtime-built `example.org` literal so the guard cannot self-trip; G2 (`:48-56`) does `Object.keys()` on live `SEED_PAPERS` — a **runtime** shape check that catches violations introduced via spread or `as` casts that bypass TS excess-property checks. `IllustrativeDatasetNotice` is mounted unconditionally at `SupplementDetail.tsx:140` (EffectsTab) and `:173` (PapersTab), both on the real `/library/[slug]` render path. `grep -rn "example\.org" src/` → empty. Zero remaining references to any of the six removed provenance fields. No scope creep found.
- **Concern:** None blocking. Two framing corrections: **G3 lives in `tests/e2e/evidence-disclosure.spec.ts`, not `seed-integrity.test.ts`**; and that spec is **not** `E2E_LIVE`-gated, so it does run by default (it only hits public SSG pages).
- **Consequence:** Prior descriptions implying all three guards live in one file, and that all write-path E2E is gated, were inaccurate.
- **Recommendation:** Commit as one atomic code commit, separate from docs. Do not misstate guard locations in the commit message.
- **Blocking:** No.
- **Resolution:** **Incorporated.** U3 records the APPROVE verdict as a prerequisite and lists the exact 14 paths; the guard-location correction is captured here so U3's commit message does not repeat the error.

### P-13 · Two proposed boundary rules FAIL against the current tree — reject or defer
- **Reviewer:** **LEAD** (ARCH unavailable — single-reviewer confidence) · **Severity:** high · **Unit:** U7
- **Evidence:**
  - `DOMAIN_IS_PURE` at directory level: `grep -rlE 'from "@/(lib/(db|supabase)|services|app)"|from "next/"' src/lib` returns 8 files, of which **`src/lib/identity/context.ts`, `src/lib/advisor/context-loader.ts`, `src/lib/advisor/actions/execute.ts`** sit *inside* engine directories (`identity`, `advisor`) while importing repos. A directory-level rule on those engines fails immediately.
  - Client-component rule: 7 `"use client"` components import `@/lib/*` — `ProfileForm.tsx`→`@/lib/interactions/medication-names`, `StackItemRow.tsx`→`@/lib/product-matcher`, `LabMarkerModal.tsx`→`@/lib/biomarkers`, `LabMarkerTable.tsx`→`@/lib/biomarkers/marker-catalog`, `StackWorkspace.tsx`→`@/lib/safety`, `DailyCheckinForm.tsx`→`@/lib/safety` + `@/lib/side-effects/vocab`, `AuthForm.tsx`→`@/lib/auth/types`.
- **Concern:** Both rules appear in `CLAUDE.md` §4 (rules 5 and 7) as future enforcement. Enforcing either in Phase 0 requires broad application refactoring — which the Phase 0 objective forbids.
- **Consequence:** Enforcing them would either fail CI on arrival or force a refactor with no demonstrated high-risk dependency behind it.
- **Recommendation:** Reject the client-component rule for Phase 0; defer `DOMAIN_IS_PURE` to a file-level allowlist variant in Phase 1.
- **Blocking:** **Yes** — as originally drafted.
- **Resolution:** **Incorporated.** §4 excludes both with the file lists; U-DEFER-6 and U-DEFER-7 record them. U7 retains only rules verified to pass today.

### P-14 · `DATA_IS_A_LEAF` passes only with a test-file exemption
- **Reviewer:** **LEAD** (ARCH unavailable) · **Severity:** medium · **Unit:** U7
- **Evidence:** `grep -rhoE 'from "[^"]+"' src/data/*.ts | sort -u` → `@/types`, `@/types/{biomarker,interaction,side-effect}`, `@/data/{seed-papers,seed-products}`, plus **`node:fs`, `node:path`, `vitest`** — the last three from `src/data/seed-integrity.test.ts`. Separately, `grep -rn 'from "@/app' src/services src/data` → empty, so adding both layers to `SCANNED_LAYERS` passes today.
- **Concern:** A naive `DATA_IS_A_LEAF` implementation fails on its own guard test's Node/vitest imports.
- **Consequence:** The rule would be red on arrival and likely weakened or abandoned.
- **Recommendation:** Implement the rule with an explicit `*.test.ts` exemption; document why.
- **Blocking:** No, provided the exemption is built in.
- **Resolution:** **Incorporated.** U7's rule table marks the exemption **mandatory**, flags the false-positive risk as Medium, and requires each new rule to be mutation-checked red-then-green.

### P-15 · Retroactive tags `v2`–`v13` cannot be created honestly
- **Reviewer:** **LEAD** (REL unavailable — single-reviewer confidence) · **Severity:** high · **Unit:** U-DEFER-1
- **Evidence:** `git log --oneline --reverse main..HEAD` (14 commits) and `git tag` (empty). Unambiguous: v2 `8b671e2`, v3 `4d32771`, v5 `537aada`, v6 `d45ec6f`, v7 `1e4e6fa`, v8 `26034f6`, v9 `589954a`, v10 `e910ea5`. Ambiguous: v4 spans `dd32585` plus a later fix `a53c365` landing after v5. **Order-inverted:** v12 `51d2134` was committed **before** v11 `d89cf1c`. Impossible: v13 has no commit. Unlabelled: `9808710` (Cal.com overhaul) and `d9fc1ef` (boundary repair).
- **Concern:** The roadmap proposed tagging `v2`..`v13` retroactively. Four of twelve are ambiguous, inverted, or impossible, and two commits carry no version at all.
- **Consequence:** Tags are immutable and propagate on push; they would permanently encode a version order contradicting commit order.
- **Recommendation:** Do not create retroactive tags in Phase 0. If release marking is wanted, tag going forward from `main`.
- **Blocking:** Yes — the plan must not treat tagging as accepted work.
- **Resolution:** **Incorporated.** U-DEFER-1 records the per-tag verdict and recommends against. Exit criterion 11 requires `git tag` to match the approved decision. Gate G4 keeps tags outside any approval granted for U4/U9.

### P-16 · `.bkit/*` noise is already tracked — do not attempt to fix it in Phase 0
- **Reviewer:** SEC + **LEAD** · **Severity:** low · **Unit:** U1
- **Evidence:** `git ls-files` shows 9 tracked `.bkit/*` files plus `test-results/.last-run.json` and `test-results 2/.last-run.json`. `.bkit/*` runtime/state files appear modified on essentially every session. `.env.example` is tracked (correct — it is a template). No `.DS_Store`, no `graph 2.json`, no `tsconfig.tsbuildinfo` tracked.
- **Concern:** Untracking already-committed files creates a noisy deletion commit; the content is secret-clean.
- **Consequence:** Ongoing per-session diff noise, but no risk.
- **Recommendation:** Ignore *new* artifacts only; leave already-tracked files alone in Phase 0.
- **Blocking:** No.
- **Resolution:** **Incorporated.** U1's steps say explicitly not to remove already-tracked files from the index; §1.1 records them as out of scope.

### P-17 · Branch protection must follow the first green CI run
- **Reviewer:** SEC · **Severity:** low · **Unit:** U-DEFER-3
- **Evidence:** GitHub registers a required-status-check name only after a workflow has reported at least once.
- **Concern:** Enabling "required status checks" before CI has run leaves merges blocked with no path to pass.
- **Consequence:** Self-inflicted deadlock on the default branch of a public repo.
- **Recommendation:** Defer to after U5 is green; minimum ruleset then — require PR, require the CI check, forbid force-push, forbid deletion.
- **Blocking:** No.
- **Resolution:** **Incorporated** as U-DEFER-3 with that ordering constraint and ruleset.

### P-18 · `graphify-out/` should be ignored, not committed
- **Reviewer:** SEC (secret-scan) + **LEAD** (size/determinism) · **Severity:** medium · **Unit:** U1
- **Evidence:** 29 MB, 223 files, untracked, **inside** the repo — including `graph.json` (~3.9 MB), `graph.html` (~3.7 MB), a duplicate `graph 2.json` (~3.6 MB), AST/semantic caches under `cache/`, and four dated snapshot directories. Full 223-file secret grep → **clean**. `.gitignore` already ignores the comparable generated artifacts `/.next/` and `/coverage`.
- **Concern:** It is a regenerable derived artifact (`graphify update .` rebuilds it, AST-only, no API cost) with high churn and near-zero in-tree contributor value. `CLAUDE.md` §11 mandates using it, but presence is a local-tooling prerequisite, not a version-control requirement.
- **Consequence:** Committing would put 29 MB of cache permanently into public history, and the duplicate `graph 2.json` shows the directory already accumulates cruft.
- **Recommendation:** Gitignore it, consistent with `.next/` and `coverage/`. Regenerate on demand. Separately, **correct `CLAUDE.md` §11**, which currently describes the graph as "repo-adjacent (`../graphify-out`)" — it is inside the repo at `graphify-out/`.
- **Blocking:** No, but the doc correction should land with U2.
- **Resolution:** **Incorporated.** U1 ignores it; U2's file list and objective require fixing the §11 path; exit criterion 2 includes the correction.

### P-19 · Documentation and v13 separate cleanly — verified
- **Reviewer:** **LEAD** (REL unavailable) · **Severity:** info · **Unit:** U2, U3
- **Evidence:** The v13 code set (14 paths under `src/` and `tests/`) and the documentation set are disjoint. Three modified doc files — `.claude/CLAUDE.md`, `README.md`, `docs/archive/2026-07/_INDEX.md` — sit on the documentation side, and CODE independently recommended the same split. Pre-existing untracked docs (`docs/01-plan/features/context-adjusted-evidence.plan.md`, `docs/02-design/features/evidence-grading.design.md`, `docs/archive/2026-07/evidence-disclosure/`) belong to **neither** commit and need their own decision.
- **Concern:** Without an explicit path list, `git add -A` would merge both concerns and sweep in the pre-existing untracked docs plus 29 MB of `graphify-out/`.
- **Consequence:** An unreviewable commit pushed irreversibly to a public repo.
- **Recommendation:** Stage by explicit path; assert the staged set contains no `src/` entries before the docs commit.
- **Blocking:** No.
- **Resolution:** **Incorporated.** U2 and U3 both forbid `git add -A`; U2's verification is a grep asserting no `src|supabase|tests` paths are staged; §1.1 lists the pre-existing untracked docs as explicitly out of scope.

### P-20 · Pushing the branch — not ff-merging `main` — is what removes the data-loss risk
- **Reviewer:** **LEAD** (REL unavailable) · **Severity:** medium · **Unit:** U4, U9
- **Evidence:** `git rev-list --left-right --count @{u}...HEAD` → `0 1`; `git merge-base main HEAD` → `30f74e1` == `main`, so `main` is an ancestor and `git checkout main && git merge --ff-only feat/food-pairings-v12` cannot conflict.
- **Concern:** The two operations were treated as one goal. They serve different purposes: U4 eliminates single-machine loss; U9 fixes a *representational* problem (a stale default branch misleading readers).
- **Consequence:** Conflating them risks deferring the urgent backup behind the less urgent merge, or bundling both under one approval.
- **Recommendation:** Order U4 before U9 and give each its own approval gate. U4 is the urgent one.
- **Blocking:** No.
- **Resolution:** **Incorporated.** U4 is labelled "backup — highest urgency" and precedes U9; gates G2 and G3 are separate; §6's dependency graph puts U4 before U5–U9.

---

## Summary

| Severity | Count | Blocking as originally drafted |
|---|---|---|
| High | 5 (P-01, P-07, P-10, P-13, P-15) | 4 |
| Medium | 6 (P-03, P-04, P-06, P-08, P-18, P-20) | 2 |
| Low | 3 (P-05, P-16, P-17) | 0 |
| Info | 6 (P-02, P-09, P-11, P-12, P-14, P-19) | 0 |

**Items removed from Phase 0 as a direct result of review:** `.tsx`/jsdom discovery change (P-05), separate
boundaries CI step (P-06), per-engine coverage thresholds (P-07), lint as a gate (P-10), directory-level
`DOMAIN_IS_PURE` (P-13), client-component import rule (P-13), retroactive tags (P-15), branch deletion,
branch protection (P-17), E2E in CI (P-11).

**Items added or hardened as a direct result of review:** `.gitignore` as a **pre-push blocking gate**
(P-01/P-04), zero-secret CI with `pull_request` only (P-03), the "no global floor" caveat on U6 (P-08),
mandatory test-file exemption plus mutation-checking on U7 (P-14), explicit-path staging with a
no-`src/`-staged assertion (P-19), and separate approval gates for the two remote operations (P-20).

## Reviewer disagreements

1. **No substantive disagreement between the three completed reviewers.** TEST and CODE did not overlap;
   SEC and TEST agreed on excluding both lint and E2E from the gate set.
2. **One framing disagreement, resolved in CODE's favour:** the lead had previously asserted that every
   write-path E2E spec is `E2E_LIVE`-gated. CODE demonstrated `tests/e2e/evidence-disclosure.spec.ts` is
   ungated by design and does run. The plan reflects CODE's finding.
3. **Unresolved through absence of independent review:** ARCH and REL never reported. P-13, P-14, P-15,
   P-19, and P-20 therefore carry **single-reviewer (lead) confidence**. All five are backed by exact
   commands and output, but none has independent corroboration. The architecture ones (P-13, P-14) are the
   most worth a second opinion before U7 executes, since they determine which rules get enforced.

## Verdict

**GO WITH CONDITIONS** — the plan is safe and sufficiently scoped for controlled implementation, provided:

1. Each approval gate (G1–G3) is granted **separately**, and G4 items are treated as unauthorized.
2. **U1 executes before any commit or push**, and every commit stages by explicit path.
3. The ten excluded items stay excluded — several were on the roadmap's own Phase 0 list and would have put
   CI red on arrival.
4. U5 is not marked complete until CI is observed **green in a clean, secret-free environment** — a workflow
   file existing is not sufficient.
5. Every new rule in U7 and U8 is **mutation-checked** red-then-green before being trusted.
6. Optionally, a fresh independent architecture review of U7 before it executes, given P-13/P-14's
   single-reviewer confidence.
