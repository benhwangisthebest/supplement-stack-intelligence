# identity-cards — QA Report (v9)

> **Feature**: `identity-cards`
> **Date**: 2026-07-02
> **Level**: Dynamic
> **Result**: **QA_PASS**
> **Design Test Plan**: [identity-cards.design.md](../02-design/features/identity-cards.design.md) §8

---

## Summary

| Layer | Scope | Result |
|-------|-------|:------:|
| **L0 — Unit** | `lib/identity` pure engine + integrity + honesty | ✅ 29/29 identity (full suite 311/311) |
| **L1 — API** | `GET /api/identity` auth guard | ✅ 1/1 **live** |
| **L2 — UI Action** | Public Library supplement archetype badge | ✅ 1/1 **live** |
| **L3 — E2E** | Authed Profile card + `/api/identity` shape | ⏸ 2 skipped (`E2E_LIVE`-gated) |
| **L4 — Perf** | — | N/A (pure domain + single auth-guarded read) |
| **L5 — Security** | Auth guard + RLS + non-diagnostic copy | ✅ covered by L1 + honesty sweep |

Types: `tsc --noEmit` clean · Build: `next build` OK.

---

## L0 — Unit (29 identity / 311 total)

| Suite | Coverage |
|-------|----------|
| `traits.test.ts` (9) | determinism, [0,1] bounds on all 5 axes, evidenceRigor (creatine→training=A), riskAppetite (experimental+high tolerance → 1), foundationalFocus, breadth, dataDepth scaling |
| `classify.test.ts` (6) | **integrity: every archetype is the unique nearest neighbour of its own target**; emerging guard; `matchScore ≥ MIN_MATCH` property; dataDepth weight-0 invariance; determinism |
| `confidence.test.ts` (5) | threshold levels; sharpen suggestions (empty → 4 tips; rich → none); deriveConfidence |
| `supplement-archetypes.test.ts` (7) | all 4 branch classifications; every seed supplement → valid archetype; determinism |
| `honesty.test.ts` (2) | **0 banned/diagnostic phrases** across all generated copy (>40 strings swept) |

## L1 — API auth guard (live)

```
GET /api/identity  (anonymous)  → 401  { error.code: "UNAUTHORIZED" }   ✅
```
Verified live against the dev server (playwright request). Confirms SC9 auth guard; the loader reuses RLS-scoped repos (`getProfile`/`listStacks`/`listItems`/`listLabMarkers`).

## L2 — UI action (live)

```
GET /library/creatine  → SupplementArchetypeBadge visible ("Archetype …")   ✅
```
Public, SSG-prerendered; confirms SC6. Derived deterministically from seed evidence.

## L3 — E2E (gated)

| Test | Status |
|------|--------|
| Authed `/api/identity` returns card (5 traits + stackArchetypes + valid confidence) | ⏸ skipped |
| Profile page renders the Identity Card region | ⏸ skipped |

Both require `E2E_LIVE=1` with a configured Supabase project + seeded profile/stacks — the same gating pattern used by v4/v6/v7/v8 authed flows. Static + build verification covers the render path; recommend a live pass pre-deploy with seeded data.

---

## Security (L5)

- **Auth**: `/api/identity` rejects anonymous (401) — private per-user data. ✅
- **RLS**: context assembly reuses existing `userId`-scoped repos; no new table/policy. ✅
- **No injection surface**: no request body / query params trusted into logic (server-loaded owned data only). ✅
- **Non-diagnostic output**: honesty sweep proves no health-status/diagnostic language. ✅

---

## Defects

**0 defects.** No Critical / Important / Minor issues found.

---

## Verdict

**QA_PASS** — all runnable tests green (L0 311/311, L1 + L2 live), types + build clean, 0 defects. The authed L3 path is environment-gated (consistent with prior milestones) and does not block PASS. Proceed to Report.
