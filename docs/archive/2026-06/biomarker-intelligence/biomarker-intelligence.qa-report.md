---
template: qa-report
version: 1.0
feature: biomarker-intelligence
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v3
qaStatus: PASS
---

# biomarker-intelligence QA Report

> **Result**: ✅ **QA_PASS**
> **Design Test Plan**: [§8](../02-design/features/biomarker-intelligence.design.md)
> **Method**: L0 unit (Vitest) + L1 API + L2 UI executed against a **live local dev server**. Authed L3 gated by `E2E_LIVE`.

---

## 1. Environment

| Item | Value |
|------|-------|
| Server | `npm run dev` @ localhost:3000 (fresh, clean `.next`) |
| Browser | Playwright Chromium 1223 |
| Supabase | `.env.local` present (public Library + auth-guard paths exercised) |
| Authed flows | Skipped — `E2E_LIVE` not set |

---

## 2. Results by Layer

### L0 — Unit (Vitest)
| Suite | Tests | Result |
|-------|:-----:|:------:|
| Full project | 110 | ✅ all pass |
| `lib/biomarkers` (engine/normalize/units/to-flags/schema/dataset) | 22 | ✅ |
| `stack-evaluator` (incl. engine-backed `ruleLabRelevance` + unrecognized-marker) | 29 | ✅ |
| `protocol-builder` (engine-backed `labBoost` ranking) | 9 | ✅ |

Covers: marker normalization, **unit conversion both directions** (25-OH-D nmol/L↔ng/mL), range precedence (user > registry), support/caution findings, labBoost boost+demote, determinism, dataset integrity (Zod + referential), banned-language sweep, unrecognized-marker info flag.

### L1 — API (live curl)
| # | Check | Expected | Actual | Result |
|---|-------|:--------:|:------:|:------:|
| 1 | POST `/api/stacks/demo/evaluate` (unauth) | 401 | 401 | ✅ auth guard |
| 2 | GET `/library/vitamin-d` biomarker section | "Relevant biomarkers" present | present | ✅ |
| 3 | GET `/library/berberine` biomarker section | present | present | ✅ |
| 4 | GET `/library/l-theanine` honest empty state | "No biomarkers are linked…" | present | ✅ |

### L2 — UI Actions (Playwright)
| # | Test | Result |
|---|------|:------:|
| 1 | vitamin-d shows Relevant biomarkers + 25-OH Vitamin D | ✅ pass |
| 2 | l-theanine shows honest empty state | ✅ pass |

> Test-precision note (from Check): vitamin-d's `25-OH Vitamin D` assertion uses `.first()`
> because vitamin D legitimately has two 25-OH-D rules (low→support, high→caution).
> A stale `.next` cache (from an earlier `next build`) was cleared before this run.

### L3 — E2E (authed)
Lab → evaluate → `lab-relevance` flow is written but **skipped** (requires `E2E_LIVE=1` + demo login). Run when creds are available.

---

## 3. Gate Decision

**QA_PASS.** All runnable layers green (110 unit + 4 L1 + 2 L2). The engine's substance — unit-correct conversion, range precedence, relevance matching, bounded labBoost — is fully unit-proven; the live server confirmed real rendering of the biomarker section, the honest empty state, and the API auth guard. Only the authed L3 journey remains environment-gated, consistent with v1/v2 practice.

---

## 4. Carry Items (non-blocking)
- Run L3 authed flow under `E2E_LIVE=1` once Supabase demo creds are wired (verifies the lab → evaluate → flag journey end-to-end).
- HbA1c is %-only (affine %↔mmol/mol transform out of scope for the factor-only unit model) — documented limitation.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-15 | QA_PASS — L0/L1/L2 green; L3 gated | benhwang121@gmail.com |
