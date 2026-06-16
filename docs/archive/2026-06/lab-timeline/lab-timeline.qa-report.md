---
template: qa-report
feature: lab-timeline
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v4
qaStatus: PASS
---

# lab-timeline QA Report

> **Phase**: QA (L1–L5) · **Result**: **QA_PASS** (runnable scope green; live-DB flows environment-gated)
> **Design Test Plan**: [lab-timeline.design.md §8](../02-design/features/lab-timeline.design.md)

---

## 1. Environment

| Item | State | Effect on QA |
|------|-------|--------------|
| Dev server | Auto-started by Playwright (`npm run dev`) | L1 auth-guard tests executed live |
| Supabase | Configured in `.env.local` (real project) | Auth `getUser` reachable (returns null unauth) |
| **Migration 0002 (`lab_panels`)** | **NOT applied to the live DB** | Authed lab-import flows can't persist → deferred |
| `E2E_LIVE` | unset | Authed L1 + all L2/L3 skip by design |
| Playwright | installed | L1 ran; L2/L3 gated |

> Applying `0002_lab_panels.sql` to the live Supabase project (an outward-facing, hard-to-reverse change) was **not performed** — it requires explicit user action. Until applied, the authed commit/extract-no-write/trend flows cannot be runtime-verified.

---

## 2. Results

### L0 — Unit suite (Vitest)
**147 / 147 passed.** Covers parsers, PDF-adapter core (canned transcript), trend engine (unit-correctness, insufficient, zero-baseline, determinism), evaluator trajectory, protocol trajectory (bounded + non-diagnostic), safety banned-language sweep.

### L1 — API endpoint tests (Playwright, live server)

| # | Test | Result |
|---|------|:------:|
| 1 | `extract` rejects unauthenticated → 401 `UNAUTHORIZED` | ✅ Pass |
| 2 | `commit` rejects unauthenticated → 401 | ✅ Pass |
| 3 | `lab-panels` + `lab-trends` reject unauthenticated → 401 | ✅ Pass |
| 4 | `extract` returns CSV candidates without writing a panel | ⏭️ Skip (E2E_LIVE / migration) |
| 5 | `commit` rejects empty marker list (confirm gate) → 400 | ⏭️ Skip (E2E_LIVE / migration) |
| 6 | `commit` persists dated panel; trends reflect rising direction | ⏭️ Skip (E2E_LIVE / migration) |

**L1 runnable: 3/3 passed.** The auth boundary on all four routes is runtime-verified.

### L2 — UI action tests
⏭️ Skipped (E2E_LIVE). Spec present: `tests/e2e/lab-timeline-actions.spec.ts` (upload → review table → confirm-gate disable/enable).

### L3 — E2E scenario tests
⏭️ Skipped (E2E_LIVE). Spec present: `tests/e2e/lab-timeline-e2e.spec.ts` (two dated panels → rising trend chip → trends API).

### L4 / L5 (perf / security)
N/A for Dynamic level (static security checks covered in Check §3: RLS, auth guards, write-free extract, server-side canonical recompute, server-only API key, 5 MB cap).

---

## 3. Defects Found & Fixed (this phase)

| ID | Severity | Issue | Fix |
|----|:--------:|-------|-----|
| QA-1 | 🟡 Test-infra | `lab-timeline.spec.ts` / `-actions.spec.ts` used `fileURLToPath(import.meta.url)` to locate the fixture → `ReferenceError: require is not defined in ES module scope` under this project's Playwright/TS (CJS) transform; **no tests could load**. | Resolve the fixture from `process.cwd()` and drop the `node:url` import. L1 now loads and passes. |

> QA-1 was a defect in the v4 **test files only** (not in shipped product code). Caught precisely because QA executed the specs rather than trusting that they were runnable.

---

## 4. Verdict

**QA_PASS** for the runnable scope: 147/147 unit + 3/3 live L1 auth-guard tests green; tsc clean; `next build` green (no warnings).

**Deferred (not a failure — environment-gated):** the authed L1 (#4–6), L2, and L3 flows require (a) `E2E_LIVE=1`, (b) the `0002` migration applied to the live Supabase project, and (c) the seeded demo user. This mirrors the v2/v3 pattern ("L3 gated by E2E_LIVE"). Recommended follow-up before/at deploy:
1. Apply `supabase/migrations/0002_lab_panels.sql` in the Supabase SQL editor.
2. Run `E2E_LIVE=1 npx playwright test tests/e2e/lab-timeline*.spec.ts`.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-16 | QA: L0 147/147, L1 3/3 live (auth guards), L2/L3 gated; QA-1 fixed | benhwang121@gmail.com |
</content>
