---
template: design
version: 1.3
feature: protocol-builder
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# protocol-builder Design Document

> **Summary**: A pure `lib/protocol-builder` generator that turns Profile + labs into goal-grouped, grade-ranked, conflict-filtered, tier-tagged suggestions — surfaced via one generate endpoint and a Protocol panel on the stack detail page, accepted into the current stack through the existing items API.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Planning Doc**: [protocol-builder.plan.md](../../01-plan/features/protocol-builder.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 4 | API Spec | ✅ (inline §4) |
| Phase 5 | Design System | ♻ reuse mvp-core-loop components/badges |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Users have a profile + evidence but no proactive, personalized strategy. |
| **WHO** | Health nerds, biohackers, athletes, longevity users — with a filled-in Profile. |
| **RISK** | Generic/"doctor-like" suggestions; conflicting items; opaque ranking; scope creep. |
| **SUCCESS** | From a profile, generate grouped, evidence-graded, conflict-safe suggestions the user accepts into a stack and evaluates. |
| **SCOPE** | Ephemeral generation + accept-into-existing-stack + rule-based engine. No persistence, no scoring, no LLM. |

---

## 1. Overview

### 1.1 Design Goals
- A **pure** `lib/protocol-builder` sibling to `lib/stack-evaluator`: deterministic, DB-free, ≥80% unit-tested.
- Reuse `lib/evidence` (candidates/ranking), `lib/safety` (copy), evaluator conflict logic, and the stacks/items API (acceptance).
- Keep generation **ephemeral**; the chosen stack is the only persisted artifact.

### 1.2 Design Principles
- Pure domain core, thin API shell (I/O only), presentation in components.
- Explainable: every suggestion carries grade + tier + rationale + (optional) lab signal.
- Evaluate, don't prescribe: suggestions are advisory; user accepts/dismisses freely.
- All copy via `lib/safety` — non-diagnostic.

---

## 2. Architecture Options

### 2.0 Comparison

| Criteria | A: Minimal | B: Clean | C: Pragmatic |
|----------|:-:|:-:|:-:|
| New files | ~6 | ~14 | ~9 |
| Complexity | Low | High | Medium |
| Testability | Coupled to route | High | High (pure) |
| Consistency | Breaks pattern | Over-engineered | Matches `stack-evaluator` |

**Selected**: Option C — **Rationale**: deterministic/testable NFR + codebase consistency. Generator is pure; route does only I/O.

### 2.1 Component Diagram
```
Profile + LabMarkers (Supabase) ─┐
                                 ├─→ generateProtocol() [PURE] ─→ ProtocolGroup[]
seed evidence (lib/evidence) ────┘            │ annotate vs target stack items
                                              ▼
                    POST /api/protocol/generate (I/O only)
                                              ▼
                    ProtocolPanel ─→ SuggestionCard (accept / dismiss)
                                  └─→ accept(-all) ─→ POST /api/stacks/:id/items
```

### 2.2 Data Flow
```
[Generate] click → POST /api/protocol/generate { stackId }
  → load profile + labMarkers + current stack items
  → generateProtocol({ profile, labMarkers, stackItems, library })
  → ProtocolGroup[] (each suggestion: grade, tier, dose, timing, rationale, confidenceNote, labBoosted, alreadyInStack, medicationCaution)
  → render grouped panel
[Accept] → POST /api/stacks/:id/items (existing) → item added → re-Evaluate available
```

### 2.3 Dependencies
| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/protocol-builder` | `lib/evidence`, `lib/safety`, types | Pure generation (no I/O) |
| `api/protocol/generate` | repos, `lib/protocol-builder` | Load context → generate |
| `ProtocolPanel` | items API, `services` fetch | Render + accept |

---

## 3. Data Model

No new persisted tables (ephemeral). New **domain types** only.

```typescript
// src/types/protocol.ts (Domain)
import type { EvidenceGrade, OutcomeCategory, ItemTiming } from "./index";

export type ProtocolTier = "foundational" | "targeted" | "advanced" | "experimental";

export interface ProtocolSuggestion {
  supplementId: string;
  supplementName: string;
  outcomeCategory: OutcomeCategory;   // the goal this serves
  effectId: string;
  grade: EvidenceGrade;
  tier: ProtocolTier;
  dose: { min: number; max: number; unit: string };  // suggested (from studiedDose)
  timing: ItemTiming | null;
  rationale: string;                  // "why it fits" (via lib/safety)
  confidenceNote: string | null;      // "what would raise confidence"
  labBoosted: boolean;                // prioritized due to a lab marker
  medicationCaution: boolean;         // flagged (profile has medications)
  alreadyInStack: boolean;            // present in the target stack
}

export interface ProtocolGroup {
  goal: OutcomeCategory;
  suggestions: ProtocolSuggestion[];  // ranked
}

export interface ProtocolResult {
  groups: ProtocolGroup[];
  generatedFor: { goals: OutcomeCategory[]; hasLabs: boolean };
}
```

> `Supplement`, `Effect`, `UserProfile`, `LabMarker`, `StackItem` types already exist (mvp-core-loop). No DB migration.

---

## 4. API Specification

### 4.1 Endpoint List
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/protocol/generate | Generate a protocol for the user's profile, annotated against a target stack | Required |

Acceptance reuses existing endpoints (no new ones): `POST /api/stacks/:id/items`, `POST /api/stacks/:id/evaluate`.

### 4.2 `POST /api/protocol/generate`

**Request:**
```json
{ "stackId": "uuid" }
```
Auth-guarded; `stackId` validated (Zod uuid); stack ownership checked (404 if not owned). `stackId` is used only to compute `alreadyInStack` + as the accept target — generation itself is profile-driven.

**Response (200):**
```json
{
  "data": {
    "groups": [
      { "goal": "sleep", "suggestions": [
        { "supplementId": "magnesium", "supplementName": "Magnesium", "outcomeCategory": "sleep",
          "grade": "B", "tier": "foundational",
          "dose": { "min": 200, "max": 400, "unit": "mg" }, "timing": "bedtime",
          "rationale": "May support sleep quality; matches your sleep goal.",
          "confidenceNote": "A recent magnesium (RBC) lab would refine this.",
          "labBoosted": false, "medicationCaution": false, "alreadyInStack": false } ] }
    ],
    "generatedFor": { "goals": ["sleep","focus"], "hasLabs": true }
  },
  "error": null
}
```
**Errors:** `400` invalid/missing stackId · `401` unauthorized · `404` stack not owned · `200` with empty `groups` if profile has no goals (UI shows guidance).

---

## 5. UI/UX Design

### 5.1 Placement
A **Protocol panel** within the existing stack detail page (`/stack-lab/[stackId]`), above or beside the evaluation report — the chosen stack is the accept target, keeping a tight build→suggest→accept→evaluate loop.

### 5.2 User Flow
```
Stack detail → "Generate Protocol" → grouped suggestions
  → dismiss unwanted / accept individual / Accept all
  → items added to this stack → "Evaluate stack" → report
  → (edit profile) → "Regenerate"
```

### 5.3 Component List
| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ProtocolPanel` | `components/stack/` | Generate/regenerate, render groups, accept-all, empty/no-goals state |
| `SuggestionCard` | `components/stack/` | One suggestion: badges + dose/timing + rationale + accept/dismiss |
| `EffectGradeBadge` | `components/evidence/` (reuse) | Grade display |

### 5.4 Page UI Checklist

#### Protocol panel (on /stack-lab/[stackId])
- [ ] Button: "Generate Protocol" (and "Regenerate" after first run)
- [ ] Empty state: "Add goals to your Profile to generate a protocol" (when no goals) with link to /profile
- [ ] Group heading per goal (capitalized) with suggestion count
- [ ] SuggestionCard: supplement name + EffectGradeBadge (A–D)
- [ ] SuggestionCard: tier badge (foundational/targeted/advanced/experimental)
- [ ] SuggestionCard: dose range + timing
- [ ] SuggestionCard: rationale ("why it fits")
- [ ] SuggestionCard: confidence note ("what would raise confidence") when present
- [ ] SuggestionCard: lab-boosted indicator (✦) when `labBoosted`
- [ ] SuggestionCard: medication-caution flag when `medicationCaution`
- [ ] SuggestionCard: "Already in stack" badge when `alreadyInStack` (accept disabled)
- [ ] Button: Accept (per card) → adds to this stack
- [ ] Button: Dismiss (per card) → removes from view (ephemeral)
- [ ] Button: "Accept all" → adds all non-dismissed, non-in-stack suggestions
- [ ] Disclaimer (variant="evaluation")

---

## 6. Error Handling
| Code | Cause | Handling |
|------|-------|----------|
| 400 | Missing/invalid stackId | Inline error in panel |
| 401 | No session | Page already guarded (requireUser) |
| 404 | Stack not owned | "Stack not found" state |
| 200 empty | No profile goals | No-goals empty state + link to /profile |

Envelope `{data,error}` via existing `lib/api/respond.ts`.

---

## 7. Security Considerations
- [ ] Auth guard before any data access (reuse `getUser`).
- [ ] Stack ownership check (reuse `getStack` → 404).
- [ ] Zod-validate `{ stackId }`.
- [ ] No new tables → existing RLS unaffected; generation reads only the user's own profile/labs/stack.
- [ ] All advisory strings via `lib/safety` (non-diagnostic).

---

## 8. Test Plan

### 8.1 Scope
| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0 Unit | `lib/protocol-builder` (grouping, ranking, conflict exclusion, tier, lab-boost, alreadyInStack) | Vitest | Do |
| L1 API | `/api/protocol/generate` — auth, validation, shape | Playwright request | Do |
| L2 UI | Protocol panel: generate → accept → stack updates | Playwright | Do |
| L3 E2E | profile goals → generate → accept-all → evaluate | Playwright | Do |

### 8.2 L0 Unit Scenarios (the core)
| # | Scenario | Expect |
|---|----------|--------|
| 1 | profile goal=sleep → suggestions grouped under "sleep", grade-ranked (A before C) | ordered group |
| 2 | allergy=fish → fish-oil excluded from suggestions | not present |
| 3 | medications non-empty + caution supplement → `medicationCaution=true` (still suggested) | flagged |
| 4 | low Vitamin D lab + deficiency/foundational goal → vitamin-d `labBoosted=true`, ranked up | boosted |
| 5 | supplement already in target stack → `alreadyInStack=true` | flagged |
| 6 | no goals → empty `groups` | `[]` |
| 7 | tier assignment (e.g. grade A foundational vs grade D experimental) | correct tier |
| 8 | all copy passes `containsBannedLanguage` === false | non-diagnostic |

### 8.3 L1 API
| # | Test | Expected |
|---|------|----------|
| 1 | POST unauth | 401 UNAUTHORIZED |
| 2 | POST missing stackId | 400 VALIDATION_ERROR |
| 3 | POST other user's stackId | 404 |
| 4 | POST valid (authed) | 200, `.data.groups` array |

### 8.4 L3 E2E
| # | Scenario | Success |
|---|----------|---------|
| 1 | login → stack → Generate → Accept all → items appear → Evaluate | flags render; no errors |

### 8.5 Seed Data
Reuse the demo seed (goals sleep/focus, allergy fish, low Vitamin D) — already exercises exclusion + lab-boost. No new seed needed.

---

## 9. Clean Architecture

### 9.1 Layer Assignment
| Component | Layer | Location |
|-----------|-------|----------|
| `generateProtocol()` + `rules.ts` | Domain (pure) | `src/lib/protocol-builder/` |
| `ProtocolSuggestion/Group/Result` | Domain | `src/types/protocol.ts` |
| generate route handler | Application | `src/app/api/protocol/generate/route.ts` |
| repos (profile/labs/stack/items) | Infrastructure | reuse `src/lib/db/*` |
| `ProtocolPanel`, `SuggestionCard` | Presentation | `src/components/stack/` |

### 9.2 Dependency Rule
`lib/protocol-builder` imports only `lib/evidence`, `lib/safety`, and `types` — **no Supabase, no React** (same contract as `lib/stack-evaluator`).

---

## 10. Coding Conventions
Reuse mvp-core-loop conventions: PascalCase components, camelCase utils, kebab-case folders, `{data,error}` envelope, Zod input schema in `lib/validation/schemas.ts`, thresholds as named constants in `rules.ts`.

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/
├── types/protocol.ts                          # NEW domain types
├── lib/protocol-builder/
│   ├── rules.ts                                # tier rules, ranking, lab-boost, conflict (constants)
│   ├── index.ts                                # generateProtocol()
│   └── protocol-builder.test.ts               # L0 unit
├── app/api/protocol/generate/route.ts         # NEW endpoint
├── components/stack/
│   ├── ProtocolPanel.tsx                       # NEW
│   └── SuggestionCard.tsx                      # NEW
└── app/stack-lab/[stackId]/page.tsx            # MODIFY: mount ProtocolPanel
tests/e2e/protocol-builder*.spec.ts            # L1/L3 (+ reuse helpers login)
```

### 11.2 Implementation Order
1. [ ] `types/protocol.ts` + `lib/protocol-builder/rules.ts` (tier/ranking/lab-boost/conflict) + `index.ts` (+ unit tests) — the pure core
2. [ ] `POST /api/protocol/generate` (auth + Zod + ownership + load + generate)
3. [ ] `SuggestionCard` + `ProtocolPanel`; mount on stack detail
4. [ ] L1/L3 Playwright specs

### 11.3 Session Guide

#### Module Map
| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---------:|
| Generator | `module-1` | types + `lib/protocol-builder` (rules + generate) + unit tests | 35-45 |
| API + UI | `module-2` | generate endpoint + ProtocolPanel/SuggestionCard + mount + e2e | 35-45 |

#### Recommended Session Plan
| Session | Phase | Scope |
|---------|-------|-------|
| 1 | Do | `--scope module-1` (pure core, risk-first) |
| 2 | Do | `--scope module-2` (endpoint + UI + e2e) |
| 3 | Check + QA + Report | 전체 |

### 11.4 Key Algorithm — generation rules (`lib/protocol-builder/rules.ts`)

`generateProtocol({ profile, labMarkers, stackItems, library }): ProtocolResult`

| Step | Logic |
|------|-------|
| **Candidates** | For each `goal` in `profile.goals`: `getEffectsByOutcome(goal)` → map to supplements (dedupe; keep best effect per supplement via `getBestEffectForOutcome`). |
| **Conflict filter** | Drop supplements whose `allergenTags ∩ profile.allergies ≠ ∅` (reuse evaluator norm). Set `medicationCaution = profile.medications.length>0 && id ∈ MED_CAUTION_IDS`. |
| **Tier** | grade A → `foundational` if `tags` includes "foundational" else `targeted`; grade B → `targeted`; grade C → `advanced`; grade D → `experimental`. |
| **Lab boost** | If a lab marker matches the supplement (name/alias/tag) and is below `referenceLow` → `labBoosted=true`, sort ahead within group. |
| **Ranking** | Within group: labBoosted first, then by grade (A→D), then alphabetical. |
| **Annotate** | `alreadyInStack = stackItems.some(i => i.supplementId === id)`; dose from best effect `studiedDose` (fallback `generalDose`); timing heuristic by goal (sleep→bedtime, focus/training→morning, else null). |
| **Copy** | `rationale`, `confidenceNote` built via new `safetyCopy.protocol*` helpers (added to `lib/safety`) — non-diagnostic. |

Constants in `rules.ts`; reuses `MED_CAUTION_IDS` from `stack-evaluator` (export/share). Each step unit-tested.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Option C — Pragmatic) | benhwang121@gmail.com |
