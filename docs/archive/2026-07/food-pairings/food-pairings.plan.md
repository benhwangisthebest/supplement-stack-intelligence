# Plan — Food & Supplement Pairings (v12)

> Feature ID: `food-pairings` · Version: **v12** · Phase: **Plan** · Generated via `/plan-plus`
> Status: Draft — pending `/pdca design food-pairings`

---

## Executive Summary

| Perspective | Summary |
|---|---|
| **Problem** | Users know *what* supplements to take but not *what to eat with them*. The app grades evidence, biomarkers, and drug/supplement interactions, but says nothing about foods that boost or block absorption — a major, actionable lever for supplement effectiveness. |
| **Solution** | Extend the existing interactions engine with a `supplement-food` rule kind carrying a `synergy`/`avoid` direction. Curate food-pairing data as seed-as-code, surface it as a "Food & absorption" section on each library page, and reuse the findings→flags pipeline so pairings also appear in the stack evaluator and AI advisor. |
| **Function / UX Effect** | On any supplement page users see two clear lists — *Pairs well with* and *Avoid with* — each with mechanism, timing, and an evidence-grade badge. When a supplement is in their stack, the same guidance surfaces as (non-alarming) informational flags; the advisor can reference it in conversation. |
| **Core Value** | Turns passive supplement info into **actionable absorption guidance**, improving real-world outcomes with zero new infrastructure and full consistency with the app's existing evidence-graded, conservatively-worded voice. |

---

## 1. Overview

Add a food-pairing capability that tells users which foods **pair well** with a supplement (boost absorption / synergy) and which foods to **avoid** (block absorption or otherwise reduce benefit), framed primarily around **absorption and timing**.

The feature is delivered by **extending the interactions domain** (Approach A) rather than building a parallel system, so the same engine, schema validation, and `to-flags` pipeline that power drug/supplement interactions also power food pairings across the **library page, stack evaluator, and AI advisor**.

Not medical advice: guidance stays educational, conservatively worded, and evidence-graded — consistent with the existing safety voice.

## 2. User Intent Discovery (Phase 1)

- **Core problem:** Users lack guidance on foods that boost or block supplement absorption. Chosen focus: **Absorption guidance** (boosters + blockers/foods-to-avoid), not standalone safety warnings.
- **Target users:** End users of the supplement advisor (browsing the library and managing a stack).
- **Surface:** **Library detail page + stack/advisor** — both the per-supplement page and contextual surfacing when the supplement is in a stack or discussed with the advisor.
- **Data source:** **Curated seed-as-code** (deterministic, testable, no API cost), matching the existing `src/data/*.ts` pattern.
- **Success criteria:**
  - Every supplement page renders a "Food & absorption" section (or a graceful empty state).
  - Curated pairings exist for the current supplement catalog, each with mechanism + evidence grade.
  - Food guidance surfaces in stack evaluator flags and is available to the advisor, with `synergy` shown as helpful/informational (never as an alarm).
  - New rules pass the same integrity + schema validation as existing interactions.

## 3. Alternatives Explored (Phase 2)

| Approach | Summary | Decision |
|---|---|---|
| **A — Extend interactions engine** | New `supplement-food` kind + `direction` on `InteractionRule`; reuse engine, schema, `to-flags`. | **✅ Selected** — only approach that delivers library + stack + advisor without duplicating the findings pipeline. |
| **B — Standalone food-pairings domain** | Separate `lib/food-pairings/` module, types, and wiring per surface. | Rejected — must re-build finding/flag surfacing that A gets for free; two engines to maintain. |
| **C — Fields on the Supplement entity** | `foodSynergies[]` / `foodCautions[]` arrays on each supplement seed. | Rejected — simplest for the library page but no engine integration; stack/advisor surfacing fully manual. |

**Rationale:** The existing `InteractionRule` already carries `mechanism`, `management`, `severity`, and `evidenceGrade` — an almost exact fit for absorption guidance. Reuse maximizes consistency and minimizes new plumbing.

## 4. YAGNI Review (Phase 3)

**In scope (v12 — all selected):**
- ✅ **Data model + schema** — `supplement-food` kind, `direction` (`synergy`/`avoid`), `food`, `timing?` fields; Zod schema update.
- ✅ **Curated food data** — `seed-food-pairings.ts` covering the existing supplement catalog.
- ✅ **Library page section** — "Food & absorption" (*Pairs well with* / *Avoid with*) on `/library/[slug]`.
- ✅ **Stack + advisor surfacing** — food findings flow through `to-flags` into the stack evaluator and are readable by the advisor.
- ✅ **Timing guidance** — per-pairing `timing` note (with meals / empty stomach / separate by 2h).
- ✅ **Unit tests** — integrity + engine coverage matching `interactions.test.ts`.
- ✅ **Evidence grades shown** — grade badge on each pairing (reuses existing `EvidenceGrade` UI).

**Out of scope (deferred / later):**
- ❌ AI-generated (runtime) food pairings — curated-only for v12.
- ❌ Personalized food filtering by user diet/allergies (beyond existing allergen display).
- ❌ Quantitative dosing math (e.g. "X mg vitamin C per mg iron").
- ❌ Meal-plan generation or recipes.
- ❌ User-editable / community-contributed pairings.

## 5. Architecture (Phase 4 — approved)

### 5.1 Data model
- `InteractionKind` → add `"supplement-food"`.
- `InteractionRule` → add:
  - `direction?: "synergy" | "avoid"` (required when kind is `supplement-food`)
  - `food: string` — food or food-class name (e.g. "vitamin C–rich foods", "calcium-rich foods", "coffee/tea (tannins)")
  - `timing?: string` — human-readable timing note
- `lib/interactions/schema.ts` (Zod) updated to validate the new kind/fields; bad data fails tests.

### 5.2 Data (seed-as-code)
- `src/data/seed-food-pairings.ts` exports `SEED_FOOD_PAIRINGS: InteractionRule[]`.
- Curation rules mirror `seed-interactions.ts`: only well-documented pairs; every `supplementId` must exist in `SEED_SUPPLEMENTS`; absence of a rule never implies "no effect".
- Examples (illustrative, to be finalized in Design): iron + vitamin C (synergy) / iron + calcium or coffee tannins (avoid); fat-soluble vitamins (A/D/E/K) + fat-containing meal (synergy); curcumin + piperine/black pepper (synergy); zinc + high-phytate foods (avoid).

### 5.3 Engine (`lib/interactions/index.ts`)
- New selector `foodPairingsForSupplement(supplementId)` returning that supplement's food rules (for the library page).
- `findInteractions` includes food rules so stack context produces `InteractionFinding`s with `kind: "supplement-food"` and `direction`.
- Severity semantics: `direction: synergy` → `info`; `direction: avoid` → `caution` (or `warning` where absorption impact is substantial).

### 5.4 Surfacing
- **`to-flags.ts`**: map food findings → `DraftFlag`. `synergy` → `info` flag phrased as helpful guidance ("Pairs well with …"); `avoid` → `caution`/`warning`. Severity styling must treat `synergy` as informational (never alarming).
- **Library UI** (`SupplementDetail.tsx`): new "Food & absorption" section with two lists (*Pairs well with* / *Avoid with*), each item showing food, mechanism, timing, and evidence-grade badge. Graceful empty state when no rules exist.
- **Advisor**: food findings available through the existing interactions/flags path the advisor already reads; no separate tool required for v12.

### 5.5 Data flow
```
seed-food-pairings.ts (curated InteractionRule[])
        │
        ▼
interactions engine ──► InteractionFinding (kind: supplement-food, direction)
   │                          │
   │ foodPairingsForSupplement│ toInteractionFlags
   ▼                          ▼
Library "Food & absorption"   DraftFlag ──► Stack evaluator + AI advisor
 section (/library/[slug])           (synergy=info, avoid=caution/warning)
```

## 6. Key Files (anticipated)

| File | Change |
|---|---|
| `src/types/interaction.ts` | Add `supplement-food` kind; `direction`, `food`, `timing` fields. |
| `src/lib/interactions/schema.ts` | Extend Zod validation for the new kind/fields. |
| `src/data/seed-food-pairings.ts` | **New** — curated food-pairing rules. |
| `src/lib/interactions/index.ts` | `foodPairingsForSupplement()` selector; include food rules in `findInteractions`. |
| `src/lib/interactions/to-flags.ts` | Map food findings → flags; synergy=info, avoid=caution/warning. |
| `src/components/library/SupplementDetail.tsx` | New "Food & absorption" section (two lists + timing + grade badge). |
| `src/lib/interactions/interactions.test.ts` (or new test file) | Integrity + engine coverage for `supplement-food`. |

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| "Synergy" rendered as a scary warning in stack flags | Explicit `info` severity + styling for `direction: synergy`; test the rendered flag severity. |
| Stretching the "interaction" concept confuses future contributors | Document the `supplement-food` kind + curation rules in code comments; keep `direction` mandatory for the kind. |
| Curated data implies false completeness | Reuse existing disclaimer pattern ("absence of a rule never implies no effect"); keep conservative wording. |
| Medical-advice tone creep | Route copy through existing `safety`/banned-language checks; keep guidance educational and hedged. |

## 8. Brainstorming Log (Phases 1–4)

- **Q1 Core purpose:** Absorption guidance (boosters + blockers), not standalone safety warnings.
- **Q2 Surface:** Library page **and** stack/advisor integration.
- **Q3 Data source:** Curated seed-as-code (deterministic, testable, no API cost).
- **Approach:** A — extend the interactions engine (reuse findings→flags pipeline).
- **Scope:** All proposed pieces selected (data model, curated data, library section, stack+advisor surfacing, timing, tests, evidence grades). AI-generation, personalization, dosing math deferred.
- **Design:** Approved as-is (architecture, components, data flow), with the explicit note that `synergy` must render as helpful/informational.

## 9. Next Step

```
/pdca design food-pairings
```
