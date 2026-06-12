---
template: qa-report
feature: mvp-core-loop
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
qaStatus: PASS
---

# mvp-core-loop QA Report

> **Result**: ✅ QA_PASS — all layers green against a **live Supabase** backend.
>
> **Environment**: Next.js dev server (localhost:3000) + hosted Supabase project, seeded demo user.
> **Date**: 2026-06-11

---

## 1. Summary

| Layer | Suite | Result |
|-------|-------|:------:|
| L0 | Unit (Vitest) — evidence, safety, stack-evaluator, compare, seed integrity | ✅ 47/47 |
| L1 | API endpoint (auth guards + envelope) | ✅ 6/6 |
| L2 | UI action (public Library + authed profile/stack/evaluate) | ✅ 4/4 |
| L3 | E2E scenario (core loop + auth-guard redirect) | ✅ 2/2 |

**Total: 59 checks passing (47 unit + 12 Playwright). QA_PASS.**

---

## 2. Runtime Verification Results

### L1 — API (no auth)
| Test | Expected | Result |
|------|----------|:------:|
| GET /api/profile unauth | 401 UNAUTHORIZED | ✅ |
| GET /api/stacks unauth | 401 | ✅ |
| POST /api/stacks unauth | 401 | ✅ |
| POST /api/stacks/:id/evaluate unauth | 401 | ✅ |
| GET /api/lab-markers unauth | 401 | ✅ |
| Error envelope shape `{data,error}` | code+message present | ✅ |

**L1: 6/6 = 100%**

### L2 — UI actions
| Page | Action | Result |
|------|--------|:------:|
| /library | search "magnesium" → card appears | ✅ |
| /library/creatine | Effects tab → "Strength & power" | ✅ |
| /library/magnesium | Add-to-Stack buttons present | ✅ |
| /profile + /stack-lab (authed) | save profile → create stack → add magnesium 800mg → evaluate → **dose warning shown** | ✅ |

**L2: 4/4 = 100%**

### L3 — E2E (the North Star loop)
| Scenario | Result |
|----------|:------:|
| login → create stack → add magnesium + fish-oil → **evaluate → allergy-conflict flag** → **compare → sleep covered** | ✅ |
| auth guard: /stack-lab logged-out → redirects to /auth/login | ✅ |

**L3: 2/2 = 100%** — the full evidence-aware loop runs end-to-end against live persistence, including the personalization payoff (seeded fish allergy → live allergy flag).

**Runtime Match Rate** = L1×0.4 + L2×0.3 + L3×0.3 = **100%**

---

## 3. Updated Match Rate (runtime-weighted)

```
Structural 98%  ·  Functional 99%  ·  Contract 98%  ·  Runtime 100%
Overall = 0.15×98 + 0.25×99 + 0.25×98 + 0.35×100 = 99%
```

Up from 98% (static-only) — now backed by real execution.

## 4. Success Criteria — final (all live-verified)

| # | Criteria | Status |
|---|----------|:------:|
| SC-1 | Search → detail w/ grades, dose, papers, related | ✅ Met (L2) |
| SC-2 | Profile persists | ✅ Met (L2 — saved + reloaded live) |
| SC-3 | Multiple stacks, Current/Planned, full item detail | ✅ Met (L2/L3) |
| SC-4 | Non-trivial evaluation flags | ✅ Met (L3 dose + allergy flags) |
| SC-5 | Full loop demoable end-to-end | ✅ **Met** (L3, was ⚠️ Partial) |

**Success Rate: 5/5 (100%).**

---

## 5. Issues Found & Resolved During QA

All were **test-harness** issues, not application defects — the app behaved correctly throughout:

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Signup-per-test hit Supabase `over_email_send_rate_limit` (429) | Switched authed specs to **log in as the seeded demo user** (no emails) — [helpers.ts](../../tests/e2e/helpers.ts) |
| 2 | `getByText("Magnesium")` matched hidden `<option>` (strict-mode) | Asserted on row format `Name — dose unit` |
| 3 | `getByText(/Covered/i)` also matched "Un**covered**" | Anchored to heading `^Covered \(` |
| 4 | Evaluate raced the fish-oil POST → intermittent missing allergy flag | Await the fish-oil row before evaluating |
| 5 | Shared demo profile corrupted by an early test toggling `sleep` off | Made L2 additive (`recovery`); re-seed restores `[sleep, focus]` |

> **Note for future runs:** the L2/L3 authed tests share the seeded demo user. Run `npm run db:seed` before a suite run to reset the profile/stack to known state. Consider `workers: 1` for the authed specs if cross-test interference recurs.

---

## 6. Verdict

**QA_PASS** → proceed to report/archive. The MVP core loop is implemented **and proven** against a live backend.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-11 | QA pass — 59 checks green, runtime match 99% | benhwang121@gmail.com |
