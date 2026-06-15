---
template: analysis
version: 1.0
feature: medication-interactions
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v2
phase: check
---

# medication-interactions Analysis Report

> **Method**: Static gap analysis (no live server — Supabase creds absent) + L0 runtime unit suite.
> **Design**: [medication-interactions.design.md](../02-design/features/medication-interactions.design.md)
> **Plan**: [medication-interactions.plan.md](../01-plan/features/medication-interactions.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v1's medication detection was a placeholder (`MED_CAUTION_IDS` + generic copy); the core safety question was unanswered. |
| **WHO** | Health nerds/biohackers, esp. the medicated subset. |
| **RISK** | Curated gaps read as false reassurance; over-flagging; brittle name matching; advice perception. |
| **SUCCESS** | Accurate, severity-graded, safety-framed findings across Stack Evaluation, Protocol Builder, Library — deterministic & unit-tested. |
| **SCOPE** | Curated-seed engine + drug-class matching/normalization + supp↔supp + Protocol Builder integration + Library display. |

---

## Strategic Alignment Check

The implementation **replaces both v1 placeholders** (`stack-evaluator` `ruleMedicationCaution`, `protocol-builder` `hasMedicationCaution`/`MED_CAUTION_IDS`) with a real pure engine — directly addressing the PRD-less Plan's WHY. No external dependency, no DB table, warn-not-block preserved. **Strategically aligned.**

### Success Criteria Status (Plan §1.3 / §6)

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC-1 | Detect supp↔drug-class interactions | ✅ Met | `lib/interactions/index.ts:findInteractions`; test "detects a supplement↔drug-class interaction" |
| SC-2 | Med normalization (brand→generic→class) | ✅ Met | `normalize.ts`; test "resolves brand → generic → drug class" (Coumadin→warfarin→anticoagulant) |
| SC-3 | Supp↔supp interactions | ✅ Met | `findInteractions` pair loop; test "detects a supplement↔supplement interaction" |
| SC-4 | Surface in Eval + Protocol + Library | ✅ Met | `ruleInteractions` (rules.ts), `hasMedicationCaution`→engine, `InteractionSection` on `/library/[slug]` |
| SC-5 | Safety wording + high-sev escalation | ✅ Met | all copy via `lib/safety`; `StackWorkspace` critical banner + `DISCLAIMERS.interaction` |
| SC-6 | Pure / deterministic / unit-tested | ✅ Met | 18 L0 tests incl. determinism + banned-language sweep; 86/86 suite green |

**Success rate: 6/6.**

### Decision Record Verification

| Decision | Followed? | Evidence |
|----------|:---------:|----------|
| Approach A — curated seed engine (no external API) | ✅ | `seed-interactions.ts` + `medication-aliases.ts`; no network calls |
| Architecture C — pure module + thin finding→flag mapper, 3 surfaces | ✅ | `lib/interactions/*` pure; `to-flags.ts`; evaluator/protocol/library consumers |
| No new DB table (seed-as-code) | ✅ | reference data in `src/data`; no migration |
| Warn, never hard-block | ✅ | findings inform; no add-blocking logic introduced |
| Drug-warning → critical escalation | ✅ | `to-flags.ts:mapSeverity`; test asserts berberine↔antidiabetic → critical |

---

## 1. Analysis Overview

### 1.1 Purpose
Verify the implementation matches the Design before QA/Report.

### 1.2 Scope & Environment
- **Static analysis**: file/symbol presence, functional depth, contract wiring.
- **Runtime**: L0 unit suite only (`vitest`) — **no live server** (no Supabase creds), so L1/L3 e2e are written but not executed. Static-only match-rate formula applies.

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Structural Match (Design §11.1)

| Artifact | Expected | Present |
|----------|----------|:-------:|
| `types/interaction.ts` | new | ✅ |
| `types/evaluation.ts` (`interaction-risk`) | mod | ✅ |
| `lib/interactions/{index,normalize,to-flags,schema}.ts` | new | ✅ |
| `lib/interactions/interactions.test.ts` | new | ✅ (18) |
| `data/{seed-interactions,medication-aliases}.ts` | new | ✅ |
| `lib/safety/index.ts` (copy + disclaimer) | mod | ✅ |
| `stack-evaluator/rules.ts` (`ruleInteractions`) | mod | ✅ |
| `protocol-builder/rules.ts` (engine-backed) | mod | ✅ |
| `components/library/InteractionSection.tsx` | new | ✅ |
| `app/library/[slug]/page.tsx` | mod | ✅ |
| `components/profile` + `ui/TagInput` (autocomplete) | mod | ✅ |

Extra (not in Design, justified): `lib/interactions/medication-names.ts` (autocomplete helper). **Structural: 100%.**

### 2.2 Functional Depth + Page UI Checklist (Design §5.4)

| Element | Status | Note |
|---------|:------:|------|
| Engine surface: `findInteractions`, `interactionsForSupplement`, `normalizeMedications` (+`hasMedicationInteraction`) | ✅ | All present, pure |
| Library: "Interactions" header / rows / severity badge / mechanism / management / evidence badge | ✅ | `InteractionSection.tsx` |
| Library: honest empty state ("No known interactions in our dataset") | ✅ | FR-10 satisfied |
| Stack Eval: `medication-caution` + `interaction-risk` flags | ✅ | `ruleInteractions` + `to-flags` |
| Stack Eval: clinician-escalation banner on critical | ✅ | `StackWorkspace` `hasCriticalInteraction` |
| Stack Eval: severity sort critical-first | ✅ | preserved in `evaluateStack` |
| Profile: medication autocomplete | ✅ | `TagInput` datalist + `knownMedicationNames()` |
| **Profile: "unrecognized medication" note** | ⚠️ **Gap** | `normalize()` returns `unresolved` & `safetyCopy.unrecognizedMedication()` exists, but **no surface consumes them** — see IMP-1 |

**Functional: ~92%.**

### 2.3 API Contract (3-way: Design §4 ↔ Service ↔ Client)

| Path | Design | Server | Wired |
|------|--------|--------|:-----:|
| POST `/api/stacks/[id]/evaluate` | flags include real interaction findings | `services/evaluation.ts:38` loads `profile`(+meds)+`items` → `evaluateStack` → `ruleInteractions` | ✅ |
| Protocol generate | suggestions flagged vs meds | `protocol-builder/index.ts:92` `hasMedicationCaution`→`hasMedicationInteraction` | ✅ |
| New endpoints | none (by design) | none added | ✅ |

Contract stable — `EvaluationFlag` shape unchanged; client `StackWorkspace`/`SuggestionCard` consume existing fields. **Contract: 100%.**

### 2.4 Runtime Verification

- **L0 unit**: 86/86 green (incl. 18 interaction tests: normalization, supp↔drug, supp↔supp, determinism, severity mapping, dataset integrity, banned-language sweep).
- **L1/L3 e2e**: `tests/e2e/medication-interactions.spec.ts` written (2 public-Library cases + authed flow gated by `E2E_LIVE`). **Not executed** — no server/creds. Same posture as v1 features.
- `tsc --noEmit` (src): clean. `next build`: green (15 `library/[slug]` pages prerendered with `InteractionSection`).

### 2.5 Match Rate Summary (static-only formula)

```
Overall = Structural×0.2 + Functional×0.4 + Contract×0.4
        = 100×0.2 + 92×0.4 + 100×0.4
        = 20 + 36.8 + 40 = 96.8 → 97%
```

| Axis | Rate |
|------|:----:|
| Structural | 100% |
| Functional | 92% |
| Contract | 100% |
| **Overall (static)** | **97%** |

---

## 3. Gap List

| ID | Severity | Gap | Recommendation | Confidence |
|----|----------|-----|----------------|:----------:|
| IMP-1 | Important | Unrecognized-medication note (Design §5.4) not surfaced. `normalize()` exposes `unresolved` and `safetyCopy.unrecognizedMedication()` exists, but nothing renders them — a user who types a misspelled/unknown drug gets silence, which slightly undercuts the curation-honesty principle. | In `ruleInteractions`, append an `info`-severity `medication-caution` flag per unresolved med via `safetyCopy.unrecognizedMedication()`; (optional) mirror in ProfileForm. | 95% |
| MIN-1 | Minor (accepted) | Library "Interactions" header always rendered vs Design §5.4 "(hidden if zero rules)". | Intentional per FR-10 — honest empty state is preferable to hiding. Update Design §5.4 wording. | — |
| MIN-2 | Minor (accepted) | L1/L3 e2e not executed. | No creds in env; matches v1. Run under `E2E_LIVE=1` at QA. | — |

**No Critical gaps. No Plan Success Criterion violated.**

---

## 4. Recommended Actions

### 4.1 Important (before/at QA)
- **IMP-1**: surface unrecognized medications (small, ~10–15 lines in `ruleInteractions` + 1 test).

### 4.2 Minor (backlog / doc)
- MIN-1: reword Design §5.4 to reflect always-shown honest empty state.
- MIN-2: execute e2e under `E2E_LIVE=1` when Supabase creds are available.

---

## 4a. Act Iteration (Act-1) — IMP-1 resolved

`ruleInteractions` now calls `normalizeMedications()` and emits an `info`-severity
`medication-caution` flag (via `safetyCopy.unrecognizedMedication()`) for every
medication it cannot resolve — closing the curation-honesty gap. Added test
"surfaces an unrecognized medication as an info flag".

- **Suite**: 87/87 green (was 86). `tsc --noEmit` (src): clean.
- **Functional** re-scored 92% → **100%** (Profile §5.4 checklist now fully covered).

### Revised Match Rate

```
Overall = 100×0.2 + 100×0.4 + 100×0.4 = 100 (static)
```
Recorded as **99%** (static), reserving headroom for the unexecuted L1/L3 e2e (run under `E2E_LIVE=1` at QA).

---

## 5. Overall Score

**99% (static, post Act-1)** — exceeds the 90% gate. All Plan Success Criteria met (6/6); the only Important gap (IMP-1) is resolved. Remaining items are accepted minors (doc wording, e2e execution pending creds).

---

## 6. Next Steps

- `/pdca iterate medication-interactions` — auto-fix IMP-1, or
- `/pdca qa medication-interactions` — proceed (97% ≥ 90%), addressing IMP-1 during QA, or
- accept as-is and `/pdca report medication-interactions`.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-15 | Initial Check-phase analysis (97% static) | benhwang121@gmail.com |
