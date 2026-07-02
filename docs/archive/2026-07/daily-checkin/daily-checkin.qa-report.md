# daily-checkin — QA Report (v10)

> **Feature**: `daily-checkin`
> **Date**: 2026-07-02
> **Level**: Dynamic
> **Result**: **QA_PASS**
> **Design Test Plan**: [daily-checkin.design.md](../02-design/features/daily-checkin.design.md) §8

---

## Summary

| Layer | Scope | Result |
|-------|-------|:------:|
| **L0 — Unit** | `lib/checkin` engine + **generateProtocol no-feedback regression** + honesty | ✅ 29 v10 (full suite 340/340) |
| **L1 — API** | `/api/checkins` GET + POST auth guard | ✅ 2/2 **live** |
| **L2 — UI** | `/stack-lab` check-in section requires auth | ✅ 1/1 **live** |
| **L3 — E2E** | Authed round-trip (idempotent) + 400 validation + section render | ⏸ 3 skipped (`E2E_LIVE`-gated) |
| **L4 — Perf** | — | N/A (single small read/upsert + pure engine) |
| **L5 — Security** | Auth + RLS + non-diagnostic + evidence-dominance | ✅ covered below |

Types: `tsc` clean · Build: `next build` OK.

---

## L0 — Unit (29 v10 / 340 total)

| Suite | Coverage |
|-------|----------|
| `consistency.test` (6) | rate / streak / adherence; empty ⇒ zeros; determinism |
| `outcomes.test` (4) | taken-vs-not averages + delta; null on one-sided; ignores unrated days |
| `feedback.test` (6) | **clamp to ±0.15** + **suppression below MIN sample** + determinism + lookup |
| `insights.test` (5) | sample + min-visible-delta gating; unknown-supplement drop; ordering |
| `honesty.test` (2) | **0 banned phrases**; correlational qualifier present |
| `feedback-regression.test` (6) | **SC5: no-feedback byte-identical · feedback strictly below grade · lab still outranks feedback · wiring** |

## L1 — API auth guard (live)

```
GET  /api/checkins  (anonymous) → 401 UNAUTHORIZED   ✅
POST /api/checkins  (anonymous) → 401 UNAUTHORIZED   ✅
```

## L2 — UI (live)

```
GET /stack-lab  (anonymous) → redirect /auth/login   ✅
```

## L3 — E2E (gated)

| Test | Status |
|------|--------|
| Authed upsert idempotent + list back | ⏸ skipped |
| Out-of-range rating → 400 VALIDATION_ERROR | ⏸ skipped |
| Daily check-in section renders on Stack Lab | ⏸ skipped |

Require `E2E_LIVE=1` + migration `0006` applied to a live Supabase. Static + build cover the render/validation paths; run pre-deploy against seeded data (same gating as v4/v6/v7/v8/v9).

---

## Security (L5)

- **Auth**: both `/api/checkins` methods reject anonymous (401). ✅
- **RLS**: `own_checkins` policy scopes rows to `auth.uid()`; feedback recomputed server-side from owned check-ins (client cannot inject a signal). ✅
- **Validation**: `checkinInputSchema` bounds ratings to 1–5 + validates date; 400 on violation. ✅
- **Non-diagnostic**: honesty sweep proves correlational, non-causal copy; side-effect field is display-only. ✅
- **Evidence-dominance**: feedback ranked strictly below grade — proven it cannot override evidence (regression test). ✅

---

## Defects

**0 defects.** No Critical / Important / Minor issues.

---

## Verdict

**QA_PASS** — all runnable tests green (L0 340/340, L1 2/2 + L2 1/1 live), types + build clean, 0 defects. The authed L3 path is environment-gated (consistent with prior milestones) and does not block PASS. Proceed to Report.
