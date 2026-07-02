# daily-checkin — Gap Analysis (Check Phase)

> **Feature**: `daily-checkin` (v10)
> **Date**: 2026-07-02
> **Design**: [daily-checkin.design.md](../02-design/features/daily-checkin.design.md)
> **Plan**: [daily-checkin.plan.md](../01-plan/features/daily-checkin.plan.md)
> **Mode**: static + runtime (unit 340/340, tsc clean, next build OK, L1 2/2 + L2 1/1 live)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Close the open recommendation loop — track adherence + self-reported outcomes and let them (bounded) sharpen recommendations. |
| **WHO** | n-of-1 biohackers / consistency-seekers / evidence-first users. |
| **RISK** | Causal over-attribution · directive language · noisy feedback overriding evidence · childish gamification · side-effect field drifting medical. |
| **SUCCESS** | Idempotent check-in + RLS; pure bounded/gated feedback; evidence-dominant re-ranking (regression-proven); premium heatmap; correlational non-diagnostic insights; feeds v9 identity; honesty; auth+RLS. |
| **SCOPE** | `0006` · `lib/checkin` · `/api/checkins` · Option-C feedback key · v9 identity feed · check-in UI · side-effect display-only. |

---

## 1. Strategic Alignment

| Check | Result |
|-------|--------|
| Addresses the core problem (closed feedback loop)? | ✅ Adherence + goal ratings captured; bounded feedback nudges `generateProtocol`; heatmap + insights surfaced. |
| Honors the safety framing (correlational, non-diagnostic, not childish)? | ✅ Insight/ side-effect copy passes the banned-language sweep + carries a "correlational" qualifier; heatmap is a data-viz consistency surface (no points/badges). |
| Followed the selected architecture (Option C — feedback key strictly below grade)? | ✅ `compareSuggestions` is `labSignal → grade → feedback → composite → name`. |
| Additive guarantee held? | ✅ One additive migration (`0006`); engine hooks are **optional** inputs (absent ⇒ prior behavior); all prior suites green. |

No strategic misalignment.

---

## 2. Success Criteria (from Plan)

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC1 | Idempotent daily check-in + RLS | ✅ Met | `checkin-repo.upsertCheckin` `onConflict: user_id,checkin_date`; `own_checkins` RLS; L1 401 guard live |
| SC2 | Pure consistency engine | ✅ Met | `consistency.test.ts` (rate/streak/adherence, determinism) |
| SC3 | Correlational outcome aggregation | ✅ Met | `outcomes.test.ts` (taken-vs-not deltas, null on one-sided) |
| SC4 | Bounded, gated feedback | ✅ Met | `feedback.test.ts` — clamp to ±0.15 + suppression below MIN_TAKEN/MIN_NOTTAKEN |
| SC5 | Evidence-dominant re-ranking | ✅ Met | `feedback-regression.test.ts` — no-feedback output **byte-identical**; max feedback **never** lifts a lower grade over a higher; lab still outranks feedback |
| SC6 | Non-diagnostic insight cards | ✅ Met | `insights.ts` + `honesty.test.ts` (0 banned; "correlational" qualifier) |
| SC7 | Premium consistency gamification | ✅ Met | `ConsistencyHeatmap` calendar + %/streak — no points/badges |
| SC8 | Feeds v9 identity | ✅ Met | `identity/context.ts` `checkinConsistency` → `traits.ts` `dataDepth`; all v9 identity tests still green |
| SC9 | Side-effect/note display-only | ✅ Met | `DailyCheckinForm` note/side-effect field + `checkinCopy.sideEffectDisclaimer`; no engine consumes it |
| SC10 | Additive / safe / zero-regression | ✅ Met | 1 additive migration; optional engine inputs; honesty; `next build` OK; 340/340 (+29); auth+RLS |

**Success rate: 10/10 met.**

---

## 3. Static Analysis

### 3.1 Structural Match — 100%
All designed artifacts present: `0006_checkins.sql`, `types/checkin.ts`, 5 `lib/checkin` modules + 5 tests, `checkin-repo.ts`, `/api/checkins/route.ts`, 3 `components/checkin/*`, feedback-regression test, e2e spec. Engine hooks wired in `rules.ts`/`index.ts`/protocol route/identity.

### 3.2 Functional Depth — 98%
Full engine + UI (no placeholders/`any`/TODO; input `placeholder` attrs only). §5.4 Page UI Checklist satisfied: adherence checkboxes, goal sliders, note+side-effect+disclaimer, Save, heatmap, insight cards. (−2: authed capture render is build-verified + structurally complete; its live assertion is `E2E_LIVE`-gated.)

### 3.3 API Contract — 100%
`POST /api/checkins` body ↔ `checkinInputSchema` ↔ `DailyCheckinForm` fetch fields align exactly (`date/ratings/taken/scheduled/note/sideEffect`); GET returns `{checkins, consistency}`; `/api/protocol/generate` loads check-ins → `feedbackSignal` server-side. 3-way clean.

---

## 4. Runtime Verification — 98%

| Level | Result |
|-------|--------|
| Unit (L0) | ✅ 340/340 (+29 v10: consistency/outcomes/feedback/insights/honesty + **feedback-regression**) |
| Types / Build | ✅ `tsc` clean; `next build` OK (`/api/checkins`, `/stack-lab` dynamic) |
| L1 (API auth) | ✅ **Live** — GET + POST `/api/checkins` → 401 |
| L2 (surface auth) | ✅ **Live** — `/stack-lab` anonymous → `/auth/login` redirect |
| L3 (authed round-trip + render) | ⏸ Gated on `E2E_LIVE` (needs `0006` applied to a live DB) |

---

## 5. Match Rate

```
Overall = Structural×0.15 + Functional×0.25 + Contract×0.25 + Runtime×0.35
        = 100×0.15 + 98×0.25 + 100×0.25 + 98×0.35
        = 15 + 24.5 + 25 + 34.3 = 98.8  → 99%
```

| Axis | Score |
|------|:-----:|
| Structural | 100 |
| Functional | 98 |
| Contract | 100 |
| Runtime | 98 |
| **Overall** | **99%** |

---

## 6. Decision Record Verification

| Decision | Followed? |
|----------|:---------:|
| [Plan] Bounded evidence-dominant feedback loop | ✅ clamp ±0.15 + min-sample gate |
| [Design] Option C — feedback key strictly below grade | ✅ `compareSuggestions` order |
| [Design] `0006` additive table + RLS | ✅ `own_checkins`, unique(user,date) |
| [Design] Feeds v9 identity dataDepth | ✅ backward-compatible term |
| [Plan] Side-effect display-only | ✅ no engine consumes it |

---

## 7. Gap List

| Severity | Gap | Note |
|----------|-----|------|
| Critical | — | none |
| Important | — | none |
| Info | L3 authed round-trip + capture render `E2E_LIVE`-gated | Needs `0006` applied to a live DB; runtime-verify pre-deploy (consistent with v4/v6/v7/v8/v9). |

**0 Critical, 0 Important.**

---

## 8. Conclusion

Match rate **99%**, **10/10 success criteria**, **0 Critical / 0 Important** gaps. The milestone's defining guarantee — **evidence dominance under a feedback loop** — is proven, not asserted (`feedback-regression.test`: no-feedback byte-identical + feedback strictly below grade). The two intentional streak-breaks (a new table + two engine edits) were kept additive, bounded, and backward-compatible, with all prior v3/v4/v5/v9 suites green. Ready for QA / Report.
