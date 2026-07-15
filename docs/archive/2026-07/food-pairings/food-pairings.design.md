# food-pairings Design Document

> Feature ID: `food-pairings` · Version: **v12** · Phase: **Design**
> Plan Ref: [docs/01-plan/features/food-pairings.plan.md](../../01-plan/features/food-pairings.plan.md)
> Architecture: **Option C — Pragmatic Balance** (shared engine/pipeline, isolated food UI + copy)
> Status: Draft — pending `/pdca do food-pairings`

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | Users lack guidance on which foods boost or block supplement absorption — an actionable effectiveness lever the app currently ignores. |
| **WHO** | End users browsing the supplement library and managing a stack. |
| **RISK** | "Synergy" guidance rendered as a scary warning; false sense of completeness from curated-only data; medical-advice tone creep. |
| **SUCCESS** | Every supplement page shows food guidance (or a graceful empty state); pairings surface in stack/advisor with synergy as informational; new data passes schema + integrity tests. |
| **SCOPE** | Curated seed-as-code food pairings (synergy + avoid) with timing + evidence grade, surfaced on library page + stack evaluator + advisor. No AI generation, personalization, or dosing math. |

---

## 1. Overview

### 1.1 Design Goals
- Add **food-pairing guidance** (pairs-well / avoid) to each supplement, framed around **absorption and timing**.
- Reuse the existing interactions **engine, schema, and `to-flags` pipeline** so guidance surfaces on the **library page, stack evaluator, and AI advisor** with minimal new plumbing.
- Keep food **rendering and copy separate** from drug/supplement interactions so beneficial "synergy" guidance never reads as a safety alarm.

### 1.2 Design Principles
- **Pure domain, seed-as-code**: no DB migration; curated TS data validated by Zod at load/test time.
- **Determinism**: identical input → deep-equal output (matches `findInteractions`).
- **Conservative voice**: educational, hedged, evidence-graded; empty state never implies "safe/no effect".
- **Isolation of concern**: shared data pipeline, but food-specific selector, UI section, and safety copy.

## 2. Architecture

### 2.0 Architecture Comparison (Decision)

| | A — Minimal | B — Clean | **C — Pragmatic (selected)** |
|---|---|---|---|
| Rule type | Reuse `InteractionRule` | New `FoodPairingRule` + adapter | Reuse `InteractionRule` + food fields |
| UI | Extend `InteractionSection` | Dedicated + own layer | Dedicated `FoodPairingSection` |
| New files | ~2 | ~5 | ~3 |
| Risk | Synergy shown as warning | Over-engineered for curated data | Low — synergy isolated |

**Selected: C** — shares the finding→flag pipeline (free stack/advisor surfacing) while isolating food UI + copy.

### 2.1 Component Diagram
```
src/data/seed-food-pairings.ts ── SEED_FOOD_PAIRINGS: InteractionRule[] (kind: supplement-food)
            │
            ▼
src/lib/interactions/
   ├─ schema.ts ............... validates supplement-food kind + direction/food/timing
   ├─ index.ts
   │    ├─ foodPairingsForSupplement(id) ──► FoodPairingSection (library)
   │    └─ findInteractions(...) ─────────► InteractionFinding (kind: supplement-food)
   └─ to-flags.ts ── toInteractionFlags ──► DraftFlag ──► stack evaluator + advisor
                          (synergy → info,  avoid → caution/warning)
            │
            ▼
src/components/library/FoodPairingSection.tsx  (rendered on /library/[slug])
src/lib/safety (safetyCopy.foodSynergy / foodAvoid, DISCLAIMERS.food)
```

### 2.2 Data Flow
1. `seed-food-pairings.ts` provides curated `InteractionRule[]` with `kind: "supplement-food"`.
2. **Library**: page calls `foodPairingsForSupplement(supplementId)` → `FoodPairingSection` splits into *Pairs well with* (`direction: synergy`) and *Avoid with* (`direction: avoid`).
3. **Stack/advisor**: `findInteractions` includes food rules when the supplement is in the stack → `InteractionFinding` → `toInteractionFlags` → `DraftFlag` consumed by the existing evaluator + advisor.

### 2.3 Dependencies
- No new npm dependencies. Uses existing `zod`, engine, `lib/safety`, Tailwind tokens.
- Food rules merged into the engine's default rule set so stack findings include them (see §4.3).

## 3. Data Model

### 3.1 Type Changes — `src/types/interaction.ts` (ADDITIVE)
```ts
// Add to InteractionKind union + INTERACTION_KINDS array:
export type InteractionKind =
  | "supplement-drug"
  | "supplement-supplement"
  | "supplement-food";           // NEW

export type FoodDirection = "synergy" | "avoid";   // NEW
export const FOOD_DIRECTIONS = ["synergy", "avoid"] as const;

// Extend InteractionRule (all new fields optional at type level;
// required for supplement-food via Zod superRefine, see §3.3):
export interface InteractionRule {
  // ...existing fields...
  direction?: FoodDirection;   // NEW — required when kind === "supplement-food"
  food?: string;               // NEW — food / food-class label, e.g. "vitamin C–rich foods"
  timing?: string;             // NEW — e.g. "take with a fat-containing meal"
}

// Extend InteractionFinding so surfaces can branch on direction/food:
export interface InteractionFinding {
  // ...existing fields...
  direction?: FoodDirection;   // NEW — present for supplement-food findings
  food?: string;               // NEW
  timing?: string;             // NEW
}
```
Rationale: additive optional fields keep all existing `supplement-drug` / `supplement-supplement` data and tests valid (Plan SC: backward-compatible).

### 3.2 Entity Relationships
- `InteractionRule.supplementId` → `SEED_SUPPLEMENTS.id` (FK, integrity-checked in tests, same as interactions).
- `food` is a free-text label (not an entity) — curated, no supplement/drug FK. `counterpart` in the finding carries the `food` string.

### 3.3 Schema — `src/lib/interactions/schema.ts` (extend `interactionRuleSchema.superRefine`)
Add a branch:
```ts
if (rule.kind === "supplement-food") {
  if (!rule.direction)  ctx.addIssue({ message: "supplement-food rule needs direction" });
  if (!rule.food)       ctx.addIssue({ message: "supplement-food rule needs food" });
  if (rule.drugClass || rule.drugGeneric || rule.otherSupplementId)
    ctx.addIssue({ message: "supplement-food rule must not set drug/other-supplement fields" });
}
```
Also add `direction`, `food`, `timing` as optional fields on the base object schema, and require the existing branches (`supplement-drug`, `supplement-supplement`) to **not** set `direction`/`food`.

### 3.4 Database Schema
**None.** Seed-as-code only (consistent with interactions). No `supabase/migrations/*` change.

## 4. Engine & Pipeline

### 4.1 New selector — `src/lib/interactions/index.ts`
```ts
/** Library use: all food-pairing rules for a supplement, synergy first. */
export function foodPairingsForSupplement(
  supplementId: string,
  rules: InteractionRule[] = SEED_FOOD_PAIRINGS,
): InteractionRule[] {
  return rules
    .filter((r) => r.kind === "supplement-food" && r.supplementId === supplementId)
    .sort((a, b) => (a.direction === "synergy" ? -1 : 1) - (b.direction === "synergy" ? -1 : 1));
}
```

### 4.2 `findInteractions` — add a `supplement-food` branch
- When `rule.kind === "supplement-food"` and `suppIds.has(rule.supplementId)`, emit a finding with `counterpart = rule.food` and carry `direction`/`food`/`timing` (extend `toFinding`).
- Food findings do **not** depend on medications; they trigger whenever the supplement is in the stack.

### 4.3 Default rule set
- `findInteractions` currently defaults to `SEED_INTERACTIONS`. Change the default to `[...SEED_INTERACTIONS, ...SEED_FOOD_PAIRINGS]` **or** add a dedicated merged constant `ALL_INTERACTION_RULES`. Chosen: export `ALL_INTERACTION_RULES` and default to it, so callers (stack evaluator, advisor) pick up food rules without changes. `interactionsForSupplement` keeps defaulting to `SEED_INTERACTIONS` (drug/supplement only); food has its own selector.

### 4.4 `to-flags.ts` — food branch
- `mapSeverity`: `supplement-food` + `direction: synergy` → `info`; `direction: avoid` → `warning` maps to `warning` (not `critical`, since food is not drug-safety) and `caution` → `info`/`warning` per rule severity.
- New `category`: `"food-pairing"` (extend `DraftFlag` category union if it is a closed set — verify in Do).
- Copy: use new `safetyCopy.foodSynergy(name, food, mechanism, timing)` and `safetyCopy.foodAvoid(name, food, mechanism, management)`.

## 5. UI/UX Design

### 5.1 `FoodPairingSection` — `src/components/library/FoodPairingSection.tsx`
Server component mirroring [InteractionSection.tsx](../../../src/components/library/InteractionSection.tsx):
- Heading: **"Food & absorption"**.
- Two sub-groups: **Pairs well with** (brand accent, synergy) and **Best to space apart** (warning accent, avoid).
  > Copy note (v12): the avoid group is deliberately headed "Best to space apart" rather than "Avoid with" — these rules are absorption/timing effects, not food bans, so the milder wording serves the non-alarming principle (§1.2).
- Each item: food label (bold), mechanism, `timing` line (if present, e.g. "⏱ take with a fat-containing meal"), and an evidence-grade chip (`evidence {grade}`).
- **Empty state**: "No food-pairing guidance in our dataset yet. This does not mean food has no effect — our dataset is limited." + `DISCLAIMERS.food`.

### 5.2 Placement
Added on `src/app/library/[slug]/page.tsx` after `<InteractionSection>` and before/after `<BiomarkerRelevanceSection>`:
```tsx
<FoodPairingSection supplementId={supplement.id} />
```

### 5.3 Component List
| Component | Type | Note |
|---|---|---|
| `FoodPairingSection` | Server | New; reads `foodPairingsForSupplement` |
| (reuse) evidence-grade chip styling | — | Match InteractionSection's inline chip |

### 5.4 Page UI Checklist
- [ ] "Food & absorption" heading renders on every `/library/[slug]`.
- [ ] Synergy items visually distinct (positive) from avoid items (caution).
- [ ] Timing line shows only when `timing` present.
- [ ] Evidence grade chip per item.
- [ ] Empty state copy present and non-implying-safety.
- [ ] Stack view: food synergy appears as `info` flag, avoid as caution/warning.

## 6. Error Handling
- Malformed seed data → Zod throws in dev/test (never ships); production renders nothing rather than crashing (selector returns `[]`).
- Unknown `supplementId` → selector returns `[]` → empty state.

## 7. Security Considerations
- Static curated data; no user input, no injection surface.
- Copy routed through existing `lib/safety` banned-language checks to prevent medical-claim drift.

## 8. Test Plan

### 8.1 Test Scope
Unit (Vitest) — no new E2E required for v12 (static content).

### 8.2 L0 Key Unit Assertions (load-bearing) — extend `interactions.test.ts` (or new `food-pairings.test.ts`)
- Schema: a valid `supplement-food` rule passes; missing `direction` or `food` fails; setting `otherSupplementId` fails.
- Integrity: every `SEED_FOOD_PAIRINGS[].supplementId` exists in `SEED_SUPPLEMENTS`; every `evidenceGrade` valid.
- `foodPairingsForSupplement`: returns only that supplement's food rules, synergy sorted first; unknown id → `[]`.
- `findInteractions`: with a supplement in the stack, emits its food findings carrying `direction`/`food`; determinism (deep-equal on repeat).
- `to-flags`: synergy → `info` severity; avoid → `warning`/`caution` (never `critical`).

### 8.3 Backward-compat assertions
- Existing interactions tests still pass unchanged; existing `SEED_INTERACTIONS` validate under the extended schema.

### 8.5 Seed Data (curation targets)
≥1 synergy + ≥1 avoid across common supplements, e.g.:
| supplementId | direction | food | timing | grade |
|---|---|---|---|---|
| iron | synergy | vitamin C–rich foods | take together | B |
| iron | avoid | coffee/tea (tannins), calcium-rich foods | separate by ~2h | B |
| vitamin-d (fat-soluble) | synergy | fat-containing meal | with a meal | B |
| curcumin | synergy | black pepper (piperine) | take together | B |
| zinc | avoid | high-phytate foods (whole grains/legumes) | separate timing | C |
> Final list finalized in Do, constrained to IDs present in `SEED_SUPPLEMENTS`.

## 9. Clean Architecture — Layer Assignment
| Element | Layer |
|---|---|
| `seed-food-pairings.ts`, type/schema changes | Domain (pure) |
| `foodPairingsForSupplement`, `findInteractions` food branch, `to-flags` | Domain/Application (pure) |
| `FoodPairingSection`, page wiring | Presentation |
No cross-layer violations; presentation depends inward only.

## 10. Coding Convention Reference
- Match `InteractionSection` for component style/tokens (`text-error`, `text-warning`, `text-brand`, `border-hairline`).
- Add `// Design Ref: §{n}` and `// Plan SC:` comments at the new selector, schema branch, and section component.

## 11. Implementation Guide

### 11.1 File Structure
```
src/types/interaction.ts               (edit: kind, direction/food/timing, FOOD_DIRECTIONS)
src/lib/interactions/schema.ts         (edit: supplement-food superRefine + fields)
src/data/seed-food-pairings.ts         (NEW: SEED_FOOD_PAIRINGS)
src/lib/interactions/index.ts          (edit: ALL_INTERACTION_RULES default,
                                         foodPairingsForSupplement, findInteractions branch, toFinding)
src/lib/interactions/to-flags.ts       (edit: food branch, mapSeverity)
src/lib/safety/index.ts                (edit: safetyCopy.foodSynergy/foodAvoid, DISCLAIMERS.food)
src/components/library/FoodPairingSection.tsx   (NEW)
src/app/library/[slug]/page.tsx        (edit: render FoodPairingSection)
src/lib/interactions/food-pairings.test.ts      (NEW: unit tests)
```

### 11.2 Implementation Order
1. Types (`interaction.ts`) → 2. Schema (`schema.ts`) → 3. Seed data (`seed-food-pairings.ts`) → 4. Engine (`index.ts` selector + branch + default set) → 5. `to-flags.ts` + `safety` copy → 6. `FoodPairingSection` + page wiring → 7. Tests.

### 11.3 Session Guide (Module Map)
| Module | Scope key | Files | Depends on |
|---|---|---|---|
| **module-1: Domain** | `domain` | types, schema, seed data | — |
| **module-2: Engine** | `engine` | index.ts, to-flags.ts, safety copy | module-1 |
| **module-3: UI** | `ui` | FoodPairingSection, page wiring | module-1, module-2 |
| **module-4: Tests** | `tests` | food-pairings.test.ts | module-1,2 |

Recommended session split: `--scope domain,engine` then `--scope ui,tests`. Single-session is viable (feature is small).

## Version History
| Version | Date | Change |
|---|---|---|
| v12 | 2026-07-14 | Initial design — Option C (shared pipeline, isolated food UI/copy). |
| v12.1 | 2026-07-14 | §5.1 avoid-group heading aligned to shipped copy ("Best to space apart"); resolves Check-phase gap G1. |
