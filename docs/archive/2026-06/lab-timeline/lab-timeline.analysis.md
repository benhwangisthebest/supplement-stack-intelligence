---
template: analysis
version: 1.3
feature: lab-timeline
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v4
---

# lab-timeline Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation), static + unit (no live server)
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v4
> **Analyst**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Design Doc**: [lab-timeline.design.md](../02-design/features/lab-timeline.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v3's biomarker engine is powerful but intake is manual hand-typing and it only evaluates one snapshot — no sense of change over time. |
| **WHO** | The established health-nerd / biohacker base — the lab-tracking subset who run blood work repeatedly. |
| **RISK** | LLM mis-transcription; auto-commit without review; trend math on inconsistent units; diagnostic-sounding trajectory language; extraction cost/latency. |
| **SUCCESS** | Upload → confirm → dated panel → trend over time → trajectory influences evaluation + protocol; all math deterministic and unit-tested. |
| **SCOPE** | Upload (CSV/paste + PDF adapter) → confirm gate → dated panels (RLS) → pure lib/lab-trends → evaluation + protocol trajectory + Profile charts. No LOINC. |

---

## Strategic Alignment Check

### Success Criteria Status (from Plan §1.3)

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | CSV upload → parsed candidates (deterministic) | ✅ Met | `src/lib/lab-import/csv.ts`; `lab-import.test.ts` (6 csv tests) |
| SC-2 | Paste table + column map → candidates | ✅ Met | `src/lib/lab-import/paste.ts`; 3 paste tests |
| SC-3 | PDF → Claude extraction adapter → candidates (transcription only) | ✅ Met | `src/lib/lab-import/pdf-adapter.ts`; canned-transcript tests; native-PDF document block |
| SC-4 | No marker committed without explicit confirmation | ✅ Met | `labCommitSchema.markers.min(1)`; `LabReviewConfirm` disables save until ≥1 approved; `extract` route imports no repo |
| SC-5 | Confirmed markers normalize + unit-convert → dated panel (RLS) | ✅ Met | `lab-panel-repo.createPanelWithMarkers` (server recompute via `canonicalize`); `0002_lab_panels.sql` RLS |
| SC-6 | Pure trend engine (delta/%Δ/direction/window), canonical units | ✅ Met | `src/lib/lab-trends/index.ts`; `lab-trends.test.ts` (10 tests incl. unit correctness, insufficient, zero-baseline) |
| SC-7 | Trajectory in Stack Evaluation + Protocol ranking + Profile timeline | ✅ Met | `ruleLabTrend` (evaluator), `trendAdjustment` (protocol, bounded ±0.2), `LabTimeline`/`TrendChart` |
| SC-8 | v3 manual entries migrate to a synthetic panel (no data loss) | ✅ Met (additive) | `toTimelinePoint` coalesces `panel.collected_at ?? lab_markers.date`; legacy rows (`panel_id NULL`) join timeline with no backfill |
| SC-9 | All new copy non-diagnostic (via lib/safety) | ✅ Met | `safetyCopy.biomarkerTrend`/`protocolTrendNote`; banned-language asserted in evaluator + protocol tests |

**Success Rate**: 9/9 criteria met (live-DB runtime verification of SC-4/SC-5/SC-7 deferred to QA, consistent with v2/v3).

### Decision Record Verification

| Source | Decision | Followed? | Note |
|--------|----------|:---------:|------|
| [Plan] | Approach A hybrid; LLM transcription-only behind confirm gate | ✅ | `pdf-adapter` is the only non-deterministic module; `candidatesFromTranscript` pure + tested |
| [Design] | Option C additive schema; legacy rows untouched | ✅ | `0002` adds table + nullable cols only; no destructive change |
| [Design] | `extract` write-free; `commit` recomputes canonical server-side | ✅ | extract imports no repo; repo recomputes `biomarker_id`/canonical from raw |
| [Design] | Reuse lib/biomarkers (no reimplementation) | ✅ | `canonicalize` added to lib/biomarkers; trends consume pre-canonical points |
| [Do m3] | Trajectory restricted to `support`-relation rules | ⚠️ Deviation (intentional) | Caution-relation trend deferred to v5 — avoids canceling low/high rules; matches v3 "no standalone out-of-range insight" stance. Noted in engine comments. |

---

## 1. Analysis Overview

Static gap analysis of the lab-timeline implementation against the Design. No live Supabase/dev server in this environment → runtime (L1/L2/L3) tests are gated behind `E2E_LIVE` and are **not executed here** (to be run in QA). The static-only match formula is used; the 147-test unit suite provides strong logic-level evidence.

---

## 2. Gap Analysis

### 2.1 API Endpoints

| Design | Implementation | Status |
|--------|---------------|--------|
| POST /api/lab-import/extract (write-free) | `extract/route.ts` (no repo import) | ✅ Match |
| POST /api/lab-import/commit | `commit/route.ts` | ✅ Match |
| GET /api/lab-panels | `lab-panels/route.ts` | ✅ Match |
| GET /api/lab-trends | `lab-trends/route.ts` | ✅ Match |

### 2.2 Data Model

| Element | Design | Impl | Status |
|---------|--------|------|--------|
| `lab_panels` table + RLS | §3.3 | `0002_lab_panels.sql` | ✅ |
| `lab_markers` additive cols (panel_id, biomarker_id, canonical_value/unit) | §3.3 | `0002` ALTER | ✅ |
| `LabPanel` / `ParsedMarkerCandidate` / `TrendSignal` / `LabMarkerTimelinePoint` | §3.1 | `src/types/lab.ts` | ✅ |
| Row mappers (`toLabPanel`, `toTimelinePoint`) | §11.1 | `db/mappers.ts` | ✅ |

### 2.3 Component Structure

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| LabUpload | `components/profile/LabUpload.tsx` | ✅ |
| LabReviewConfirm | `components/profile/LabReviewConfirm.tsx` | ✅ |
| LabTimeline | `components/profile/LabTimeline.tsx` | ✅ |
| TrendChart | `components/profile/TrendChart.tsx` | ✅ |
| useLabImport | `components/profile/useLabImport.ts` | ✅ |
| lib/lab-import (csv/paste/pdf-adapter/schema) | `src/lib/lab-import/*` | ✅ |
| lib/lab-trends | `src/lib/lab-trends/index.ts` | ✅ |
| lab-panel-repo | `src/lib/db/lab-panel-repo.ts` | ✅ |

**Structural Match Rate: 100%** (every designed file present; zero placeholders/TODOs in new code).

### 2.4 Functional Depth

| File | Depth | Notes |
|------|:-----:|-------|
| lib/lab-import (csv/paste/pdf-adapter) | 100 | Full parsing + Zod validation + error taxonomy; 20 tests |
| lib/lab-trends | 100 | Delta/%Δ/direction/window/insufficient; 10 tests |
| lab-panel-repo | 95 | Real persistence + server-side canonicalize; runtime path unverified (no DB) |
| Profile UI (Upload/Review/Timeline/Chart) | 95 | Real logic, confirm gate, SSR timeline; see IMP-1 |
| evaluator/protocol trend integration | 100 | `ruleLabTrend` + bounded `trendAdjustment`; 7 tests |

**Shallow files: 0.**

### 2.5 Page UI Checklist Verification (Design §5.4)

| Page | Elements | Implemented | Missing | Rate |
|------|:--------:|:-----------:|:-------:|:----:|
| Profile — Labs tab | 8 | 8 | 0 | 100% |
| Review & Confirm | 6 | 6 | 0 | 100% |
| Stack Evaluation (trend flag) | 1 | 1 | 0 | 100% |

**IMP-1 (RESOLVED, Act-1)**: The Review/Confirm step now renders `<Disclaimer variant="labs">` inside `LabReviewConfirm` (the `lib/safety` non-diagnostic banner the checklist called for). tsc clean, build green.

**Functional Match Rate: 100%**

### 2.6 API Contract Verification (Design §4 ↔ Server ↔ Client)

| # | Endpoint | Design | Server | Client/Consumer | Contract |
|---|----------|:------:|:------:|:---------------:|:--------:|
| 1 | POST /api/lab-import/extract | ✅ | ✅ | ✅ `useLabImport` (file + paste) | PASS |
| 2 | POST /api/lab-import/commit | ✅ | ✅ | ✅ `useLabImport.commit` | PASS |
| 3 | GET /api/lab-panels | ✅ | ✅ | ✅ L1 spec (SSR also uses repo directly) | PASS |
| 4 | GET /api/lab-trends | ✅ | ✅ | ✅ SSR `profile/page` + L1/L3 specs | PASS |

> Note: the Profile timeline consumes trends via SSR (`listTimelinePoints` + `computeTrends`) rather than the `/api/lab-trends` route — an intentional design choice (server component). The route remains for API completeness and is exercised by the L1/L3 specs.

**Contract Match Rate: 4/4 = 100%**

### 2.7 Runtime Verification

Not executed — no dev server / live Supabase in this environment. L1 (`lab-timeline.spec.ts`), L2 (`lab-timeline-actions.spec.ts`), L3 (`lab-timeline-e2e.spec.ts`) are written and gated behind `E2E_LIVE`. **Unit suite: 147/147 pass** (110 prior + 37 new across lab-import, lab-trends, evaluator-trend, protocol-trend).

### 2.8 Match Rate Summary (static-only)

```
┌─────────────────────────────────────────────┐
│  Structural Match Rate:  100%                │
│  Functional Match Rate:  100%  (after Act-1) │
│  Contract Match Rate:    100%                │
│  Runtime Match Rate:       —  (deferred→QA)  │
│  ─────────────────────────────────────────── │
│  Overall (static):        99%                │
│  (runtime unverified — held at 99 pending QA) │
└─────────────────────────────────────────────┘
```

---

## 3. Code Quality

- **tsc --noEmit**: clean. **next build**: green, no warnings.
- **Determinism boundary honored**: only `pdf-adapter.ts` (Infrastructure) is non-deterministic; imported solely by the `extract` route. `lib/lab-trends` and the parsers are pure.
- **Security**: RLS on `lab_panels`; both routes auth-guarded; `extract` cannot write (no repo import); `commit` recomputes canonical server-side (client cannot inject); `API_ANTHROPIC_KEY` server-only; 5 MB upload cap.
- **Pre-existing**: `npm install` flagged 8 npm-audit vulnerabilities in the dependency tree (not introduced by this feature) — out of scope, worth a separate pass.

---

## 5. Test Coverage

| Area | Evidence |
|------|----------|
| Parsers + adapter | 20 unit tests (csv/paste/transcript/schema gate) |
| Trend engine | 10 unit tests (deltas, units, insufficient, zero-baseline, determinism) |
| Evaluator trajectory | 5 tests (improving/worsening/anchor/stable/non-diagnostic) |
| Protocol trajectory | 2 tests (worsening nudge + bounded/non-diagnostic) |
| **Total new** | **37** → full suite **147/147 green** |
| Runtime L1/L2/L3 | Written, gated `E2E_LIVE` (QA) |

---

## 6. Clean Architecture Compliance

| Layer | Expected | Actual | Status |
|-------|----------|--------|--------|
| Domain | pure types/logic | `types/lab.ts`, `lib/lab-trends`, `lib/lab-import/{csv,paste,schema}` | ✅ |
| Infrastructure | DB/external only | `lab-panel-repo`, `pdf-adapter` (LLM) | ✅ |
| Application | orchestration | 4 routes, `services/evaluation` | ✅ |
| Presentation | UI | `components/profile/Lab*` | ✅ |

**Architecture: 100%** — the one non-deterministic module sits in Infrastructure and is imported only by the extract route; no domain code depends on it.

---

## 8. Overall

```
┌─────────────────────────────────────────────┐
│  Design Match (static):   98%                │
│  Success Criteria:        9/9                │
│  Unit Tests:              147/147            │
│  Architecture:            100%               │
│  Critical gaps:           0                  │
│  Important gaps:          1 (IMP-1)          │
└─────────────────────────────────────────────┘
```

---

## 9. Recommended Actions

### 9.1 Important
| # | Item | File | Severity |
|---|------|------|:--------:|
| IMP-1 | Add the `lib/safety` non-diagnostic Disclaimer banner inside the Review/Confirm step | `LabReviewConfirm.tsx` | 🟡 Low |

### 9.2 Deferred (by design / to QA)
- Caution-relation trajectory flags → v5 (intentional).
- Run L1/L2/L3 against a live server in QA to convert the static 98% into a runtime-verified rate.

---

## 11. Next Steps
- [ ] (Optional) Fix IMP-1 via `/pdca iterate` or fold into QA.
- [ ] `/pdca qa lab-timeline` — execute L1-L5 against a live server.
- [ ] `/pdca report lab-timeline`.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-16 | Initial Check (static 98%, SC 9/9, 1 Important) | benhwang121@gmail.com |
</content>
