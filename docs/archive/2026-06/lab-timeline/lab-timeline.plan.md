---
template: plan-plus
version: 1.0
feature: lab-timeline
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v4
---

# lab-timeline Planning Document

> **Summary**: A "lab timeline" feature that lets users **upload** lab reports (PDF/CSV/paste) instead of hand-typing, **stores dated lab panels** so markers become longitudinal, and adds a pure, deterministic `lib/lab-trends` engine that turns direction-of-change into evaluation flags and Protocol Builder ranking signals — extending v3's biomarker layer from a single snapshot into a tracked history. Messy-PDF parsing is handled by a Claude **extraction adapter** that produces candidates only, behind a mandatory user-confirm gate; all safety-critical normalization, unit conversion, and trend math stay deterministic.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v4 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v3 made labs *drive* personalization, but two gaps remain: (1) every marker must be **hand-typed**, so getting real blood work in is painful, and (2) evaluation sees only a **single snapshot** — it can't tell that Vitamin D was low and is now rising. The lab layer is intelligent but static and high-friction. |
| **Solution** | A coherent **lab timeline**: upload a report (CSV/paste deterministically; messy PDF via a Claude **extraction adapter** → structured candidates) → a **mandatory confirm/review** step → commit through v3's existing normalization + unit-conversion → store as a **dated `lab_panel`**. A new pure `lib/lab-trends` engine computes per-marker trajectory across panels and feeds direction-of-change into Stack Evaluation and Protocol Builder ranking. Trend charts visualize history in Profile. |
| **Function/UX Effect** | Users drop in a lab PDF and confirm the parsed markers instead of typing each one; Profile shows a marker timeline with trend charts (↑ Vitamin D +40% over 6 mo); Stack Evaluation surfaces trajectory-aware flags ("ferritin still low but improving"); Protocol Builder ranking reacts to *movement*, not just current value. |
| **Core Value** | Turns the lab layer from a static snapshot into a **tracked history with low-friction intake** — the natural successor to v3 — while isolating the one non-deterministic piece (extraction) behind a confirm gate so the trust-critical engine stays pure, testable, and on-brand. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v3's biomarker engine is powerful but (a) intake is manual hand-typing and (b) it only evaluates one snapshot — no sense of change over time. |
| **WHO** | The established health-nerd / biohacker base — specifically the lab-tracking subset who already use the v3 Profile lab feature and run blood work repeatedly. |
| **RISK** | LLM mis-transcribes a marker/value → wrong flag; auto-commit without review; trend math on inconsistent units; diagnostic-sounding trajectory language; extraction cost/latency. |
| **SUCCESS** | A user uploads a lab report, confirms parsed markers, sees them stored as a dated panel, watches markers trend over time, and has trajectory influence evaluation + protocol ranking — with all math deterministic and unit-tested. |
| **SCOPE** | Upload (CSV/paste deterministic + PDF Claude adapter) → confirm gate → dated `lab_panels`/`lab_markers` (RLS) → pure `lib/lab-trends` → evaluation + protocol trajectory + Profile trend charts. **No LOINC** (deferred v5). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
v3 delivered a real biomarker→supplement intelligence layer, but it operates on a single, manually-entered snapshot. Two frictions block the next level of value: **intake is painful** (every marker hand-typed) and **there is no longitudinal view** (evaluation cannot reason about whether a marker is improving or worsening). v4's purpose is a **lab timeline**: low-friction intake + tracked history + trajectory-aware intelligence.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Lab-tracking biohacker | Runs blood panels every 3–6 months | Drop in a report without retyping; see whether interventions are moving markers |
| Longevity-focused user | Tracks a stable set of markers over years | A timeline view and trend-aware suggestions |
| Existing v3 user | Already entered manual markers | Backward-compatible migration; their data becomes the first timeline point |

### 1.3 Success Criteria
1. A user can upload a **CSV** lab export and have markers parsed deterministically into review candidates.
2. A user can paste a **table** and map columns into the same candidate format.
3. A user can upload a **lab PDF** and have a Claude extraction adapter produce marker candidates (transcription only).
4. **No marker is ever committed without explicit user confirmation** in a review UI (edit/approve each).
5. Confirmed markers commit through v3's existing normalization + **unit conversion** and store as a **dated `lab_panel`** with per-marker rows (RLS-protected).
6. A pure `lib/lab-trends` engine computes per-marker **trajectory** (delta, %Δ, direction, window) across a user's panels — deterministic and unit-correct.
7. Trajectory surfaces in **Stack Evaluation** (trend-aware lab flags) and **Protocol Builder** ranking; Profile shows a **timeline with trend charts**.
8. Existing v3 manual lab entries migrate to a synthetic "manual" panel (no data loss; instant one-point timeline).
9. All new copy via `lib/safety` (non-diagnostic, trajectory described as relevance, never diagnosis).

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Determinism boundary | LLM does **transcription only**; normalization, unit conversion, low/high, and trend math stay pure/deterministic | High |
| Confirm gate is mandatory | Extraction output is non-deterministic → user must approve before any write | High |
| Unit correctness (inherited v3) | Trend deltas must compare canonical units across panels | High |
| Non-diagnostic language | Trajectory phrased "may be relevant / appears to be improving relative to range", never "you are deficient/cured" | High |
| First LLM dependency | New cost, latency, prompt guardrails, schema-validated output | Medium |
| Backward compatibility | v3 manual entries must survive the panel migration | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Hybrid — deterministic core + Claude extraction adapter — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | CSV/paste parse deterministically; messy PDF → Claude extraction adapter → structured candidates → mandatory confirm → v3 normalization → dated panels → `lib/lab-trends`. |
| **Pros** | Solves all three parts of the chosen "one story"; non-determinism isolated to a *confirmable* extraction step; safety-critical math stays pure/testable; introduces the LLM capability cleanly (reusable for a future AI layer). |
| **Cons** | First LLM dependency (cost, latency, prompt guardrails); requires a review-UI gate. |
| **Effort** | High |
| **Best For** | Delivering the headline value (real-world PDF intake) without compromising the deterministic safety core. |

### 2.2 Approach B: Deterministic-only parsing

| Aspect | Details |
|--------|---------|
| **Summary** | CSV/paste + column mapping; PDF limited to clean text-extractable tables via regex against the biomarker registry. No LLM. |
| **Pros** | 100% pure/deterministic, no new dependency, cheap, fully unit-testable, maximally on-brand. |
| **Cons** | Real lab PDFs are messy — many won't parse, so the core "manual entry is painful" pain only partly resolves. |
| **Effort** | Medium |
| **Best For** | Maximum philosophical purity if messy-PDF parsing is deferred. |

### 2.3 Approach C: Trends-first, defer parsing

| Aspect | Details |
|--------|---------|
| **Summary** | Build timeline + trend engine on existing manual entry; parsing is a thin CSV import; messy-PDF parsing → v5. |
| **Pros** | Smallest, lowest-risk; ships the durable longitudinal intelligence without the parsing rabbit hole. |
| **Cons** | Doesn't address the manual-entry pain the user flagged as part of the "one story." |
| **Effort** | Low–Medium |
| **Best For** | Risk-minimizing release that defers the LLM dependency. |

### 2.4 Decision Rationale
**Selected: Approach A.** It is the only option that delivers all three parts of the "one story" the user chose (upload → standardize → trends) while keeping the trust-critical engine pure. The LLM is structurally confined to a transcription adapter whose output cannot reach storage without explicit user confirmation, so determinism is preserved exactly where it matters (unit conversion, range comparison, trend math). The extraction adapter is also a reusable beachhead for a future AI layer. B leaves the headline pain partly unsolved; C defers it entirely.

---

## 3. YAGNI Review

### 3.1 Included (v4 Must-Have)

| # | Item | Why essential |
|---|------|---------------|
| 1 | Deterministic **CSV/structured upload parsing** + Zod validation | Lowest-risk intake path; the deterministic backbone |
| 2 | **Claude PDF extraction adapter** → `ParsedMarkerCandidate[]` | The headline of Approach A; handles real-world messy reports |
| 3 | **Mandatory confirm/review UI** before commit | Safety gate — nothing auto-saves; isolates non-determinism |
| 4 | **Lab history storage** (`lab_panels` + `lab_markers`, dated, RLS) | Foundation that makes markers longitudinal |
| 5 | Pure **`lib/lab-trends`** engine (delta, %Δ, direction, window) | The intelligence — deterministic trajectory, v2/v3 style |
| 6 | **Trend signals → Stack Evaluation** | Trajectory influences lab-relevance flags (the payoff) |
| 7 | **Trend charts** in Profile (optional, selected) | Visual marker timeline / sparklines |
| 8 | **Protocol Builder trajectory ranking** (optional, selected) | Extends v3 `labSignal` to react to direction-of-change |
| 9 | **Paste-table import** with column mapping (optional, selected) | Deterministic manual fallback alongside CSV/PDF |

> Items 7–9 confirmed via YAGNI multiSelect. LOINC coding **not** selected → deferred.

### 3.2 Deferred (v5+)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| **LOINC coding / canonical codes** | Canonical biomarker IDs from v3 already key the trends; LOINC is low user-visibility standardization | External integrations / clinical-grade scale needed |
| Allergy-report parsing | Different document shape; out of the lab-timeline story | After lab intake validated |
| Age/sex-adjusted or lab-specific reference ranges over time | v3 population ranges + per-report ranges suffice | On demand |
| Anomaly/alerting on trends ("marker dropped sharply") | Risks diagnostic framing; keep trajectory supplement-anchored | After safety review |
| Multi-marker correlation / derived ratios | Beyond single-marker trajectory | If users request composite insights |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason for Removal |
|---------|-------------------|
| LLM performing range/low-high judgment or diagnosis | Breaks determinism + non-diagnostic safety principle; LLM is transcription-only |
| Auto-commit of extracted markers without review | Violates the mandatory confirm gate |
| OCR of scanned image-only PDFs (no text layer) | Heavy; PDF adapter targets text-extractable reports for v4 |
| Lab-provider API integrations / auto-import | Out of scope; integration/commerce concern |

---

## 4. Scope

### 4.1 In Scope
- New pure module `src/lib/lab-import/` — deterministic CSV + paste-table parsers; Claude PDF **extraction adapter**; Zod-validated `ParsedMarkerCandidate[]` (candidates only, never commits).
- New pure module `src/lib/lab-trends/` — trajectory engine over dated panels (delta, %Δ, direction, window) → `TrendSignal[]`.
- New Supabase tables `lab_panels` + `lab_markers` (RLS on every table); migration of v3 manual entries into a synthetic "manual" panel.
- Server routes `POST /api/lab-import/extract` (parse/transcribe) and `POST /api/lab-import/commit` (normalize + store).
- Confirm/review UI; Profile **lab timeline + trend charts**.
- Extend `lib/stack-evaluator` (trend-aware lab flags) and `lib/protocol-builder` (`labSignal` trajectory).
- `lib/safety` trajectory copy; reuse `lib/biomarkers` normalization + unit conversion (no reimplementation).
- Unit + integration tests; Zod dataset/schema validation.

### 4.2 Out of Scope
- LOINC coding — (deferred, §3.2)
- Allergy-report parsing, adjusted/over-time reference ranges, trend anomaly alerts, multi-marker correlation — (deferred, §3.2)
- LLM range judgment/diagnosis, auto-commit, image-only OCR, lab-provider integrations — (removed, §3.3)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `parseCsv(file)` / `parsePaste(text, columnMap)` → `ParsedMarkerCandidate[]`, deterministic, Zod-validated | High | Pending |
| FR-02 | `extractFromPdf(file)` calls the Claude adapter, returns `ParsedMarkerCandidate[]` conforming to a strict JSON schema; transcription only (raw label + value + unit) | High | Pending |
| FR-03 | `/api/lab-import/extract` returns candidates **without writing**; candidates carry a `confidence`/`source` flag for review | High | Pending |
| FR-04 | Review UI lets the user edit, approve, or drop each candidate; commit is blocked until explicit approval | High | Pending |
| FR-05 | `/api/lab-import/commit` runs candidates through `lib/biomarkers` normalize + unit-convert, then stores a dated `lab_panel` + `lab_markers` (RLS) | High | Pending |
| FR-06 | `computeTrends(panels)` → per-marker `TrendSignal[]` (latest, previous, delta, %Δ, direction, window) over canonical units | High | Pending |
| FR-07 | Stack Evaluation consumes `TrendSignal[]` → trajectory-aware lab-relevance flags via `lib/safety` | High | Pending |
| FR-08 | Protocol Builder extends `labSignal` with a bounded trajectory component (improving vs worsening), explainable | Medium | Pending |
| FR-09 | Profile renders a marker timeline with trend charts (sparkline per marker + history table) | Medium | Pending |
| FR-10 | Migration converts existing v3 manual markers → a synthetic "manual" panel (no data loss) | High | Pending |
| FR-11 | No trajectory output implies diagnosis; a missing/insufficient history shows an honest "not enough data points yet" state | High | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Determinism | `lib/lab-import` (parsers) + `lib/lab-trends` pure & DB-agnostic; LLM confined to the adapter | Unit tests; module dependency review |
| Correctness | Trend deltas compared in canonical units across panels | Both-direction unit tests on multi-unit markers |
| Security | RLS on `lab_panels`/`lab_markers`; extraction route auth-guarded; uploaded files not persisted beyond processing | RLS tests; route auth tests |
| Safety | All trajectory copy non-diagnostic, via `lib/safety` | Banned-language sweep test |
| Build/Test | `tsc` clean; `next build` green; existing suite stays green | CI / local run |
| Cost/Latency | PDF extraction uses a cost-appropriate model; bounded token budget; graceful failure → fall back to manual entry | Adapter config + error-path test |

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] `lib/lab-import` (CSV, paste, PDF adapter) + `lib/lab-trends` implemented and unit-tested.
- [ ] `lab_panels` + `lab_markers` migrations applied with RLS; v3 manual entries migrated.
- [ ] `extract` + `commit` routes live; confirm/review UI blocks commit until approval.
- [ ] Trajectory in Stack Evaluation + Protocol Builder ranking; Profile timeline + trend charts.
- [ ] `tsc` clean · `next build` green · full suite green.

### 6.2 Quality Criteria
- [ ] Unit correctness: multi-unit markers trended correctly across panels (test-asserted both directions).
- [ ] Determinism: identical panels → identical `TrendSignal[]`; parsers reproducible.
- [ ] Safety: no auto-commit; non-diagnostic trajectory wording; banned-language sweep passes.
- [ ] No regression to v1/v2/v3 features (existing baseline stays green).

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM mis-transcribes marker/value → wrong stored data | High | Medium | Mandatory confirm/review UI; strict JSON schema + Zod validation; show raw vs parsed side-by-side; per-candidate confidence |
| Auto-commit bypasses review | High | Low | `extract` route is structurally write-free; `commit` requires an approved payload; integration test asserts no write on extract |
| Trend math on inconsistent units → false trajectory | High | Medium | Reuse v3 canonical-unit conversion before any delta; both-direction unit tests |
| Diagnostic-sounding trajectory copy | High | Medium | All copy via `lib/safety`; "appears to be improving relative to range" framing; banned-language sweep |
| v3 manual-entry migration data loss | Medium | Low | Idempotent migration into a synthetic "manual" panel; backup/verify row counts; migration test |
| LLM cost/latency or failure | Medium | Medium | Cost-appropriate model + token budget; graceful fallback to manual/paste entry on adapter failure |
| Image-only/scanned PDFs unsupported | Low | Medium | Detect missing text layer; clear "couldn't read this file — try CSV/paste" message |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic. Continues the Clean-Architecture, pure-engine, seed/lib-first posture of v1/v2/v3 — with one deliberate, isolated exception: a server-side LLM adapter for transcription.

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Parsing strategy | Hybrid / deterministic-only / trends-first | **Hybrid (A)** | Delivers full story; isolates non-determinism |
| LLM role | Full interpretation vs transcription-only | **Transcription-only** | Keeps range/trend math deterministic & trustworthy |
| Commit safety | Auto vs mandatory confirm | **Mandatory confirm gate** | No non-deterministic data reaches storage unreviewed |
| Storage | Seed-as-code vs DB tables | **DB tables (`lab_panels`/`lab_markers`, RLS)** | Lab history is user data → needs persistence + dated rows |
| v3 compatibility | New store vs migrate | **Migrate to synthetic "manual" panel** | No data loss; instant one-point timeline |
| Trend signal | Unbounded vs bounded/explainable | **Bounded trajectory signal** | Explainable, non-dominating ranking |
| LOINC | Now vs defer | **Defer (v5)** | Canonical biomarker IDs already key trends |

### 8.3 Component Overview
```txt
src/lib/lab-import/
  csv.ts          # deterministic CSV parse -> ParsedMarkerCandidate[]
  paste.ts        # paste + columnMap -> ParsedMarkerCandidate[]
  pdf-adapter.ts  # Claude extraction adapter (server) -> candidates (transcription only)
  schema.ts       # Zod ParsedMarkerCandidate + extraction-output schema
  types.ts
src/lib/lab-trends/
  index.ts        # computeTrends(panels) -> TrendSignal[]
  types.ts        # TrendSignal (latest, previous, delta, pctChange, direction, window)
src/app/api/lab-import/
  extract/route.ts  # parse/transcribe; NEVER writes
  commit/route.ts   # normalize (lib/biomarkers) + store panel/markers
supabase/migrations/
  00XX_lab_panels.sql        # lab_panels + lab_markers + RLS + v3 migration
Integrations (extend, reuse):
  lib/biomarkers          -> reuse normalize + unit conversion (no reimplementation)
  lib/stack-evaluator     -> trend-aware lab-relevance flags
  lib/protocol-builder    -> labSignal trajectory component
  lib/safety              -> trajectory copy (non-diagnostic)
UI:
  components/profile/LabUpload + LabReviewConfirm   # upload + mandatory confirm gate
  components/profile/LabTimeline + TrendChart       # history + charts
```

### 8.4 Data Flow
```txt
Upload (PDF/CSV) or Paste
  -> POST /api/lab-import/extract
       CSV/paste -> deterministic parser (lib/lab-import)
       PDF       -> Claude extraction adapter (transcription only)
  -> ParsedMarkerCandidate[]   (Zod-validated, NOT saved)
  -> Confirm/Review UI         (user edits + approves every marker)  <- SAFETY GATE
  -> POST /api/lab-import/commit
  -> lib/biomarkers normalize + unit-convert
  -> store lab_panel (dated) + lab_markers (RLS)
  -> lib/lab-trends computeTrends(panels) -> TrendSignal[]
  -> consumed by: stack-evaluator (eval flags)
                  protocol-builder (trajectory ranking)
                  Profile timeline + trend charts
```

---

## 9. Convention Prerequisites

### 9.1 Applicable Conventions
- [ ] Reuse v1/v2/v3 conventions (PascalCase components, camelCase utils, kebab-case folders, Zod schemas, Design-ref comments).
- [ ] New types in `src/types/lab.ts` (`LabPanel`, `LabMarkerRow`, `ParsedMarkerCandidate`, `TrendSignal`).
- [ ] LLM adapter env config (model id + key) added to `.env.example`; adapter is the only non-deterministic module.
- [ ] RLS policy parity with existing user-data tables.

---

## 10. Next Steps

```
Plan Plus completed
Document: docs/01-plan/features/lab-timeline.plan.md
Next step: /pdca design lab-timeline
```

1. [ ] Write design document (`/pdca design lab-timeline`)
2. [ ] Review + approve (esp. LLM-adapter boundary, RLS, migration)
3. [ ] Start implementation (`/pdca do lab-timeline`)

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Q1 — v4 Direction | What kind of leap? (deepen lab / AI layer / adherence / content depth) | **Deepen lab intelligence** | Continue the v3 thread |
| Q2 — Core Problem | Within lab intelligence, what first? (parsing / trends / LOINC / all) | **All three as one story** | A coherent "lab timeline" |
| Phase 2 — Approach | Hybrid (A) / deterministic-only (B) / trends-first (C) | **A: Hybrid** | Full story; non-determinism isolated behind confirm gate |
| Phase 3 — YAGNI | Optional items: LOINC / trend charts / protocol trajectory / paste-table | **Trend charts + protocol trajectory + paste-table** (LOINC deferred) | Ship full timeline; defer standardization |
| Phase 4 — Design | Architecture / data model / data flow | **Approved as-is** | Proceed to Plan generation |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-16 | Initial v4 plan-plus document for lab-timeline | benhwang121@gmail.com |
</content>
</invoke>
