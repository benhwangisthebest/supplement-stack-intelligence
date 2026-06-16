---
template: design
version: 1.3
feature: lab-timeline
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v4
---

# lab-timeline Design Document

> **Summary**: A lab-timeline feature — upload (CSV/paste deterministic, PDF via a Claude extraction adapter) → mandatory confirm gate → commit through v3's `lib/biomarkers` normalization → dated `lab_panels` → a pure `lib/lab-trends` engine that feeds direction-of-change into Stack Evaluation, Protocol Builder ranking, and a Profile trend timeline. Architecture **Option C (Pragmatic)**: additive schema only, legacy v3 lab rows untouched.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v4 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Status**: Draft
> **Planning Doc**: [lab-timeline.plan.md](../../01-plan/features/lab-timeline.plan.md)

### Pipeline References (if applicable)

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (seed-as-code + additive migration) |
| Phase 2 | Coding Conventions | ✅ (inherits v1–v3 conventions) |
| Phase 3 | Mockup | N/A (extends existing Profile/Eval UI) |
| Phase 4 | API Spec | ✅ (this doc §4) |

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | v3's biomarker engine is powerful but intake is manual hand-typing and it only evaluates one snapshot — no sense of change over time. |
| **WHO** | The established health-nerd / biohacker base — specifically the lab-tracking subset who run blood work repeatedly. |
| **RISK** | LLM mis-transcribes a marker/value → wrong flag; auto-commit without review; trend math on inconsistent units; diagnostic-sounding trajectory language; extraction cost/latency. |
| **SUCCESS** | A user uploads a lab report, confirms parsed markers, sees them stored as a dated panel, watches markers trend over time, and has trajectory influence evaluation + protocol ranking — all math deterministic and unit-tested. |
| **SCOPE** | Upload (CSV/paste + PDF Claude adapter) → confirm gate → dated `lab_panels`/`lab_markers` (RLS) → pure `lib/lab-trends` → evaluation + protocol trajectory + Profile trend charts. **No LOINC** (deferred v5). |

---

## 1. Overview

### 1.1 Design Goals
- Let users get real lab data in **without hand-typing**, while guaranteeing **no non-deterministic data reaches storage unreviewed**.
- Make biomarkers **longitudinal**: store dated panels and compute per-marker trajectory deterministically.
- Feed **direction-of-change** into the existing v3 surfaces (evaluation, protocol ranking) without rewriting them.
- Preserve the codebase's **pure-engine / Clean-Architecture** DNA: the LLM is an isolated infrastructure adapter; all judgment math stays pure.
- **Additive only** — the working v3 lab path (`lab_markers`, repo, route, profile UI) keeps functioning unchanged.

### 1.2 Design Principles
- **Determinism boundary**: LLM does transcription → structured candidates only. Normalization, unit conversion, low/high, and trend math are pure and unit-tested (reuse `lib/biomarkers`).
- **Confirm gate is structural**: the `extract` route never writes; only `commit` writes, and only from a user-approved payload.
- **Reuse over reinvention**: `lib/biomarkers.toCanonical/statusOf/normalizeMarker` is reused verbatim; trends never re-implement unit logic.
- **Honest absence**: insufficient history → explicit "not enough data points yet", never a fabricated trend; no trajectory implies diagnosis.
- **Backward compatibility**: legacy markers (`panel_id IS NULL`) are first-class timeline points.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | No new tables; reuse `lab_markers.date` | New `lab_panels`; refactor `lab_markers` FK + migrate v3 rows | Add `lab_panels` + **additive** nullable cols on `lab_markers` |
| **New Files** | ~10 | ~18 | ~14 |
| **Modified Files** | ~5 | ~12 (rewrites v3 path) | ~7 (extensions only) |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Low (provenance-thin) | Medium (data migration of working rows) | Low (additive, legacy untouched) |
| **Recommendation** | Quick wins | Long-term clean | **Selected** |

**Selected**: Option C — **Rationale**: Matches the Plan's "dated panels + trends" intent and gives uploads first-class provenance, while remaining **purely additive**: legacy v3 markers keep working with `panel_id NULL`, so the runtime-verified (98%) v3 lab path is not rewritten and there is no risky data migration. B's full refactor buys cleaner provenance at the cost of rewriting working code; A saves a table but leaves upload provenance thin.

### 2.1 Component Diagram

```
┌──────────────┐   upload/paste   ┌─────────────────────┐
│  Profile UI  │ ───────────────▶ │ POST /api/lab-import │
│  LabUpload   │                  │      /extract        │  (NEVER writes)
│  LabReview   │ ◀─ candidates ── │  csv|paste|pdf-adapter│
└──────┬───────┘                  └─────────┬───────────┘
       │ user approves                      │ (Claude adapter, server-only)
       ▼                                    ▼
┌──────────────┐   approved[]   ┌──────────────────────┐   ┌──────────────┐
│ LabReview    │ ─────────────▶ │ POST /api/lab-import  │──▶│  Supabase    │
│ Confirm      │                │      /commit          │   │ lab_panels   │
└──────────────┘                │ lib/biomarkers norm.  │   │ lab_markers  │
                                └──────────────────────┘   └──────┬───────┘
                                                                  │ read
                  ┌───────────────────────────────────────────────┘
                  ▼
        ┌────────────────────┐   TrendSignal[]   ┌──────────────────────┐
        │  lib/lab-trends     │ ────────────────▶ │ stack-evaluator      │
        │  computeTrends()    │                   │ protocol-builder     │
        │  (PURE)             │                   │ Profile LabTimeline  │
        └────────────────────┘                   └──────────────────────┘
```

### 2.2 Data Flow

```
Upload(PDF/CSV) or Paste
  → POST /api/lab-import/extract
       CSV/paste → deterministic parser (lib/lab-import)
       PDF       → Claude extraction adapter (transcription only, Zod-validated)
  → ParsedMarkerCandidate[]            (NOT saved)
  → LabReviewConfirm UI                (user edits + approves each)   ← SAFETY GATE
  → POST /api/lab-import/commit { collectedAt, source, markers[] }
  → lib/biomarkers: normalizeMarker + toCanonical → biomarker_id, canonical_value/unit
  → insert lab_panel (dated) + lab_markers rows (panel_id set, RLS)
  → lib/lab-trends.computeTrends(rows) → TrendSignal[]
  → consumed by stack-evaluator (trend-aware lab flags),
                protocol-builder (trajectory ranking),
                Profile LabTimeline (charts)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/lab-import/pdf-adapter` | `@anthropic-ai/sdk` (new), `lib/lab-import/schema` | Transcribe PDF text → candidates; Zod-validate output |
| `lib/lab-import/csv,paste` | `lib/lab-import/schema` | Deterministic parse → candidates |
| `/api/lab-import/commit` | `lib/biomarkers`, `lib/db/lab-panel-repo` | Normalize + persist |
| `lib/lab-trends` | `lib/biomarkers` (`toCanonical`), `@/types/lab` | Pure trajectory over canonical units |
| `stack-evaluator/rules` | `lib/lab-trends` | Trend-aware lab-relevance flags |
| `protocol-builder/rules` | `lib/lab-trends`, `lib/biomarkers.labBoost` | Trajectory ranking component |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/lab.ts
export type LabSource = "pdf" | "csv" | "paste" | "manual";

export interface LabPanel {
  id: string;
  userId: string;
  source: LabSource;
  collectedAt: string;   // ISO date — the timeline axis for this panel
  createdAt: string;
}

// ParsedMarkerCandidate — output of extract, input to confirm UI. NEVER persisted as-is.
export interface ParsedMarkerCandidate {
  rawLabel: string;       // exactly as read from the document
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  // resolved client/server-side preview (advisory; recomputed on commit):
  biomarkerId: string | null;   // normalizeMarker(rawLabel) preview
  confidence: "high" | "low";   // adapter/parse confidence for review sorting
}

// TrendSignal — output of lib/lab-trends. Pure, deterministic.
export type TrendDirection = "rising" | "falling" | "stable" | "insufficient";

export interface TrendSignal {
  biomarkerId: string;
  biomarkerName: string;
  latest: { value: number; unit: string; collectedAt: string };   // canonical unit
  previous: { value: number; unit: string; collectedAt: string } | null;
  delta: number | null;        // canonical-unit delta (latest - previous)
  pctChange: number | null;    // null when previous is null or 0
  direction: TrendDirection;
  windowDays: number | null;   // days between previous and latest
  points: number;              // count of timeline points for this marker
}
```

### 3.2 Entity Relationships

```
[auth.users] 1 ── N [lab_panels] 1 ── N [lab_markers]
                                          ▲
              legacy rows: panel_id NULL ─┘  (still owned by user_id)
```

### 3.3 Database Schema (additive migration — `supabase/migrations/0002_lab_panels.sql`)

```sql
-- ===== lab_panels (new) =====
create table if not exists public.lab_panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual',          -- 'pdf'|'csv'|'paste'|'manual'
  collected_at date not null,
  created_at timestamptz not null default now()
);

-- ===== lab_markers (additive columns only — NO destructive change) =====
alter table public.lab_markers
  add column if not exists panel_id uuid references public.lab_panels(id) on delete cascade,
  add column if not exists biomarker_id text,        -- normalized canonical id (nullable)
  add column if not exists canonical_value numeric,  -- value in biomarker canonical unit
  add column if not exists canonical_unit text;

create index if not exists idx_lab_panels_user on public.lab_panels(user_id);
create index if not exists idx_lab_markers_panel on public.lab_markers(panel_id);
create index if not exists idx_lab_markers_user_biomarker
  on public.lab_markers(user_id, biomarker_id);

-- ===== RLS =====
alter table public.lab_panels enable row level security;

create policy "own_lab_panels" on public.lab_panels
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- lab_markers already has own_lab_markers (user_id = auth.uid()); panel_id rows
-- remain user-owned, so existing policy covers them. No policy change needed.
```

> **Legacy compatibility**: existing `lab_markers` rows keep `panel_id = NULL`. The trend engine treats each such row as a timeline point keyed by its existing `date` column (coalesced with the panel's `collected_at` for panelled rows). No backfill migration of v3 data is required; an **optional** idempotent backfill (group legacy rows by `date` into synthetic `source='manual'` panels) is provided behind a one-shot script, not run automatically.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | Writes? |
|--------|------|-------------|------|:------:|
| POST | /api/lab-import/extract | Parse/transcribe upload → candidates | Required | **No** |
| POST | /api/lab-import/commit | Persist approved markers as a dated panel | Required | Yes |
| GET | /api/lab-panels | List user's panels (with markers) | Required | No |
| GET | /api/lab-trends | Computed `TrendSignal[]` for the user | Required | No |

> Existing `/api/lab-markers` (GET/POST/DELETE) is **unchanged** and continues to serve single-marker manual entry.

### 4.2 Detailed Specification

#### `POST /api/lab-import/extract`

**Request:** `multipart/form-data` with `file` (PDF/CSV) **or** JSON `{ "kind": "paste", "text": "...", "columnMap": {...} }`.

**Response (200 OK):**
```json
{
  "data": {
    "source": "pdf",
    "candidates": [
      { "rawLabel": "Vitamin D, 25-OH", "value": 28, "unit": "ng/mL",
        "referenceLow": 30, "referenceHigh": 100,
        "biomarkerId": "vitamin-d-25oh", "confidence": "high" }
    ],
    "unreadable": false
  }
}
```
**Guarantee**: this handler performs **no database writes** (enforced structurally + asserted by L1 test #2).

**Error Responses:**
- `400` — invalid/empty file, unsupported type, or Zod parse failure of adapter output (`.error.code = "VALIDATION_ERROR"`).
- `401` — unauthenticated.
- `422` — `{ "error": { "code": "UNREADABLE_DOCUMENT" } }` when a PDF has no text layer (advise CSV/paste).
- `502` — `{ "error": { "code": "EXTRACTION_FAILED" } }` adapter/network failure (UI falls back to manual/paste).

#### `POST /api/lab-import/commit`

**Request:**
```json
{
  "collectedAt": "2026-06-01",
  "source": "pdf",
  "markers": [
    { "rawLabel": "Vitamin D, 25-OH", "value": 28, "unit": "ng/mL",
      "referenceLow": 30, "referenceHigh": 100 }
  ]
}
```
> Server **recomputes** `biomarkerId` (`normalizeMarker`) and `canonicalValue/Unit` (`toCanonical`) from the approved raw values — it never trusts client-supplied canonical fields (defense in depth).

**Response (201 Created):**
```json
{ "data": { "panelId": "uuid", "markerCount": 1, "collectedAt": "2026-06-01" } }
```
**Error Responses:** `400` validation (zod `labCommitSchema`), `401` unauthenticated.

#### `GET /api/lab-trends`

**Response (200 OK):** `{ "data": TrendSignal[] }` — sorted by `direction` priority then biomarker name; markers with a single point return `direction: "insufficient"`.

---

## 5. UI/UX Design

### 5.1 Screen Layout (Profile → Labs tab)

```
┌──────────────────────────────────────────────┐
│  Profile ▸ Labs                              │
│  [ + Upload report ] [ Paste table ] [ + Add ]│  ← Upload/Paste new; Add = existing manual
├──────────────────────────────────────────────┤
│  Lab Timeline                                │
│   Vitamin D  28 → 41 ng/mL  ↑ +46% (6 mo) ▁▄█ │  ← sparkline + trend chip
│   Ferritin   22 → 35 ng/mL  ↑ improving      │
│   LDL        —            (1 point, no trend) │  ← honest insufficient state
└──────────────────────────────────────────────┘
```

### 5.2 User Flow (upload)

```
Labs tab → Upload report → /extract → Review & Confirm
   (edit/drop/approve each marker, see raw vs parsed)
   → Confirm → /commit → Timeline updates → Evaluate stack reflects trajectory
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `LabUpload` | `src/components/profile/LabUpload.tsx` | File picker (PDF/CSV) + paste entry; calls `/extract` |
| `LabReviewConfirm` | `src/components/profile/LabReviewConfirm.tsx` | Candidate table; edit/drop/approve; **commit blocked until approved**; raw-vs-parsed display |
| `LabTimeline` | `src/components/profile/LabTimeline.tsx` | Per-marker history list + trend chip; reads `/api/lab-trends` |
| `TrendChart` | `src/components/profile/TrendChart.tsx` | Inline SVG sparkline (no chart lib) per marker |
| `useLabImport` | `src/components/profile/useLabImport.ts` | Hook: extract → review state → commit |

### 5.4 Page UI Checklist (v2.1.0)

#### Profile — Labs tab
- [ ] Button: "Upload report" (accepts `.pdf`, `.csv`)
- [ ] Button: "Paste table" (opens textarea + column-mapping selects: marker / value / unit / refLow / refHigh)
- [ ] Button: "Add marker" (existing v3 manual entry — unchanged)
- [ ] List: Lab Timeline, one row per canonical biomarker
- [ ] Element: Trend chip per row — direction icon (↑ rising / ↓ falling / → stable) + `pctChange` + `windowDays`
- [ ] Element: `TrendChart` sparkline per multi-point marker
- [ ] State: "1 point — not enough data points yet" for single-point markers (no fabricated trend)
- [ ] State: "marker not recognized" note for `biomarkerId IS NULL` rows (inherits v3 honesty)

#### Review & Confirm (modal/page)
- [ ] Table: one row per `ParsedMarkerCandidate` (rawLabel, value, unit, refLow, refHigh, resolved biomarker)
- [ ] Per-row: editable value/unit fields; "drop" toggle; low-confidence rows visually flagged
- [ ] Field: panel `collectedAt` date picker (defaults to detected/ today)
- [ ] Button: "Confirm & save" — **disabled until ≥1 marker approved**
- [ ] Banner: non-diagnostic disclaimer (via `lib/safety`)
- [ ] State: `UNREADABLE_DOCUMENT` → "Couldn't read this file — try CSV or paste"

#### Stack Evaluation (existing page, extended)
- [ ] Flag: trend-aware lab-relevance entry (e.g. "Ferritin low but rising — iron may be less of a priority"), copy via `lib/safety`

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | VALIDATION_ERROR | Bad file / Zod fail (extract or commit) | Show field errors; re-enter |
| 401 | UNAUTHORIZED | Not logged in | Redirect to login |
| 422 | UNREADABLE_DOCUMENT | PDF has no text layer | Suggest CSV/paste path |
| 502 | EXTRACTION_FAILED | Adapter/network error | Fall back to manual/paste; no partial write |

Adapter output that fails `parsedCandidateSchema` is treated as `EXTRACTION_FAILED` — never persisted, never silently coerced.

---

## 7. Security Considerations

- [ ] **RLS** on `lab_panels` (`user_id = auth.uid()`); `lab_markers` existing policy covers panelled rows.
- [ ] Both routes **auth-guarded** (`getUser()` → `unauthorized()`), mirroring `/api/lab-markers`.
- [ ] **No write on extract** — enforced by route structure (no repo import) + L1 regression test.
- [ ] Uploaded files processed in-memory; **not persisted** to storage beyond the request.
- [ ] Anthropic API key is **server-only** (`API_ANTHROPIC_KEY`, no `NEXT_PUBLIC_`); adapter never runs client-side.
- [ ] Commit **recomputes** canonical fields server-side — client cannot inject canonical values.
- [ ] Zod validation on every boundary (`extract` input, adapter output, `commit` body).
- [ ] Bounded token budget + size cap on uploads (reject > N pages / > N KB) to limit cost/DoS.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Unit | `lib/lab-import` parsers, `lib/lab-trends`, adapter schema | Vitest | Do |
| L1: API | extract (no-write), commit, lab-trends, lab-panels | Playwright request | Do |
| L2: UI | Upload → review → confirm; timeline render | Playwright | Do |
| L3: E2E | Upload → confirm → evaluate reflects trajectory | Playwright | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|-----------------|:--------------:|-------------------|
| 1 | /api/lab-import/extract | POST | Valid CSV → candidates | 200 | `.data.candidates` is non-empty array |
| 2 | /api/lab-import/extract | POST | **No DB write occurs** | 200 | `lab_markers` row count unchanged before/after |
| 3 | /api/lab-import/extract | POST | Unauthenticated | 401 | `.error.code = "UNAUTHORIZED"` |
| 4 | /api/lab-import/commit | POST | Approved markers persist | 201 | `.data.panelId` exists; `lab_panels` +1, `lab_markers` +N |
| 5 | /api/lab-import/commit | POST | Invalid body | 400 | `.error.code = "VALIDATION_ERROR"`, `.fieldErrors` present |
| 6 | /api/lab-import/commit | POST | Canonical fields recomputed server-side | 201 | stored `canonical_value` matches `toCanonical`, ignores client value |
| 7 | /api/lab-trends | GET | Multi-point marker | 200 | matching `TrendSignal` has `direction` ∈ rising/falling/stable, `pctChange` ≠ null |
| 8 | /api/lab-trends | GET | Single-point marker | 200 | `direction = "insufficient"`, `previous = null` |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | Labs tab | Click Upload, select CSV | Review table shows candidates | Rows match file |
| 2 | Review | Confirm with 0 approved | Confirm button disabled | No commit fired |
| 3 | Review | Approve ≥1, Confirm | Timeline updates | `lab_panels` +1 |
| 4 | Labs tab | View single-point marker | "not enough data points yet" shown | No sparkline |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | Upload → trend | Login → Labs → Upload CSV (2 dated panels) → Confirm → Timeline shows ↑/↓ | Trend chip + sparkline render |
| 2 | Trajectory in eval | After 2 panels → build stack w/ relevant supp → Evaluate → trend-aware lab flag appears | Flag copy non-diagnostic |
| 3 | Confirm gate | Upload → leave unapproved → cannot commit; DB unchanged | No `lab_panels`/`lab_markers` write |
| 4 | Unreadable PDF | Upload image-only PDF → 422 message → paste fallback works | Graceful, no crash |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| `lab_panels` (test) | 2 | distinct `collected_at` for same user (to form a trend) |
| `lab_markers` (test) | 4 | same `biomarker_id` across 2 panels (e.g. vitamin-d-25oh low→higher) |

> A fixture CSV (`tests/fixtures/labs-sample.csv`) drives deterministic extract tests. PDF adapter is unit-tested against a **canned transcript** (no live LLM call in CI); a live adapter smoke test is gated behind `E2E_LIVE`/`API_ANTHROPIC_KEY`.

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `LabPanel`, `ParsedMarkerCandidate`, `TrendSignal` | Domain | `src/types/lab.ts` |
| `lib/lab-trends` (computeTrends) | Domain (pure) | `src/lib/lab-trends/` |
| `lib/lab-import/csv,paste,schema` | Domain (pure) | `src/lib/lab-import/` |
| `lib/lab-import/pdf-adapter` | **Infrastructure** (LLM I/O) | `src/lib/lab-import/pdf-adapter.ts` |
| `lab-panel-repo` | Infrastructure | `src/lib/db/lab-panel-repo.ts` |
| `/api/lab-import/*`, `/api/lab-trends` | Application | `src/app/api/...` |
| `LabUpload`, `LabReviewConfirm`, `LabTimeline`, `TrendChart` | Presentation | `src/components/profile/` |

> Dependency rule honored: the only non-deterministic module (`pdf-adapter`) lives in Infrastructure and is imported only by the `extract` route — never by `lib/lab-trends` or any domain code.

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase (`LabTimeline.tsx`) |
| Pure module naming | kebab-case folders, camelCase fns (`computeTrends`) |
| State management | Local hook (`useLabImport`), server fetch via existing `lib/api/respond` |
| Error handling | `handle/ok/unauthorized` helpers (reuse `lib/api/respond`) |
| Env vars | `API_ANTHROPIC_KEY` (server-only), added to `.env.example` |
| Design-ref comments | `// Design Ref: §N` + `// Plan SC: …` at module heads (matches v3) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/lab.ts                              # LabPanel, ParsedMarkerCandidate, TrendSignal, LabSource
├── lib/
│   ├── lab-import/
│   │   ├── schema.ts                         # zod: parsedCandidateSchema, labCommitSchema, columnMap
│   │   ├── csv.ts                            # parseCsv(text) → candidates (pure)
│   │   ├── paste.ts                          # parsePaste(text, columnMap) → candidates (pure)
│   │   ├── pdf-adapter.ts                    # Claude transcription → candidates (infra, server-only)
│   │   └── lab-import.test.ts
│   ├── lab-trends/
│   │   ├── index.ts                          # computeTrends(rows) → TrendSignal[] (pure)
│   │   └── lab-trends.test.ts
│   └── db/lab-panel-repo.ts                  # createPanelWithMarkers, listPanels, listMarkerRows
├── app/api/
│   ├── lab-import/extract/route.ts           # NO writes
│   ├── lab-import/commit/route.ts            # normalize + persist
│   ├── lab-panels/route.ts                   # GET list
│   └── lab-trends/route.ts                   # GET TrendSignal[]
├── components/profile/
│   ├── LabUpload.tsx · LabReviewConfirm.tsx · LabTimeline.tsx · TrendChart.tsx · useLabImport.ts
supabase/migrations/0002_lab_panels.sql       # additive
Extends (modify):
  src/lib/stack-evaluator/rules.ts            # trend-aware lab-relevance flag
  src/lib/protocol-builder/rules.ts           # trajectory ranking component
  src/lib/safety/*                            # trajectory copy (non-diagnostic)
  src/components/profile/(labs tab wiring)
  .env.example                                # API_ANTHROPIC_KEY
```

### 11.2 Implementation Order

1. [ ] `types/lab.ts` + `0002_lab_panels.sql` (apply in Supabase)
2. [ ] `lib/lab-import` (schema, csv, paste) + unit tests
3. [ ] `lib/lab-import/pdf-adapter` (canned-transcript unit test; live behind flag)
4. [ ] `lib/lab-trends` + unit tests (canonical-unit deltas, insufficient state)
5. [ ] `lab-panel-repo` + `/api/lab-import/extract` (+L1 no-write test) + `/commit` + `/lab-trends` + `/lab-panels`
6. [ ] `lib/stack-evaluator` + `lib/protocol-builder` trajectory integration + `lib/safety` copy
7. [ ] Profile UI (Upload → Review/Confirm gate → Timeline + TrendChart)
8. [ ] L2/L3 Playwright; full suite + `tsc` + `next build` green

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Engines & schema | `module-1` | `types/lab`, migration, `lib/lab-import` (csv/paste/adapter), `lib/lab-trends`, unit tests | 40–50 |
| API & repo | `module-2` | `lab-panel-repo`, extract/commit/lab-trends/lab-panels routes, L1 tests | 30–40 |
| Surfaces & UI | `module-3` | evaluator/protocol trajectory + safety copy, Profile Upload/Review/Timeline, L2/L3 | 40–50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | done |
| Session 2 | Do | `--scope module-1` | 40–50 |
| Session 3 | Do | `--scope module-2` | 30–40 |
| Session 4 | Do | `--scope module-3` | 40–50 |
| Session 5 | Check + QA + Report | 전체 | 30–40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-16 | Initial design (Option C — Pragmatic, additive) for lab-timeline | benhwang121@gmail.com |
</content>
