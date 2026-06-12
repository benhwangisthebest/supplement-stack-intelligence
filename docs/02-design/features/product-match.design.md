---
template: design
version: 1.3
feature: product-match
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# product-match Design Document

> **Summary**: A pure `lib/product-matcher` that ranks seed products per stack item by a composite fit score (dose / form-pref / testing / additives / price-per-effective-dose), allergen hard-filtered, with affiliate structurally excluded from scoring — surfaced via one match endpoint and a Product Match panel on the stack detail page.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Planning Doc**: [product-match.plan.md](../../01-plan/features/product-match.plan.md)

### Pipeline References
| Phase | Document | Status |
|-------|----------|--------|
| Phase 4 | API Spec | ✅ (inline §4) |
| Phase 5 | Design System | ♻ reuse existing components/badges |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Users with a stack can't tell which real products fit; shopping tools rank by commission. |
| **WHO** | Health nerds, biohackers, athletes — with a built stack. |
| **RISK** | Affiliate bias undermining trust; "fit" reduced to "cheapest"; allergen-conflicting products; opaque ranking. |
| **SUCCESS** | Per stack item, ranked seed products by multi-criteria fit, allergen-safe, affiliate strictly separate. |
| **SCOPE** | Seeded mock products + Stack Lab panel + pure composite-score matcher. No live API, no products table, no country filter. |

---

## 1. Overview

### 1.1 Design Goals
- Pure `lib/product-matcher` (sibling to `protocol-builder`/`stack-evaluator`): deterministic, DB-free, ≥80% unit-tested.
- **Trust invariant**: scoring operates on a product view that omits the affiliate field — affiliate cannot influence rank (unit-tested).
- Reuse stacks/items + profile layers, `lib/evidence` (supplement lookup), `lib/safety` (copy), seed-as-code pattern.

### 1.2 Design Principles
- Pure core, thin API shell, presentation in components.
- Multi-criteria, explainable fit (per-criterion breakdown).
- Fit ≠ endorsement; affiliate carried but never scored.
- Non-diagnostic copy via `lib/safety`.

---

## 2. Architecture Options

### 2.0 Comparison
| Criteria | A: Minimal | B: Clean | C: Pragmatic |
|----------|:-:|:-:|:-:|
| New files | ~6 | ~14 | ~9 |
| Testability | Coupled | High | High (pure) |
| Affiliate-invariance | Hard | High | Enforced by type (scorer view omits affiliate) |
| Consistency | Breaks | Over-eng. | Matches engines |

**Selected**: Option C — **Rationale**: trust invariant cleanest as a pure function over an affiliate-free view; deterministic + testable; consistent.

### 2.1 Component Diagram
```
Stack items + Profile + seed-products ─→ matchProducts() [PURE] ─→ ProductMatchResult
                                              │ (scorer sees ScorableProduct: no affiliate)
                                              ▼
                          POST /api/products/match (I/O only)
                                              ▼
                  ProductMatchPanel ─→ ProductMatchCard (badges, breakdown, affiliate link)
```

### 2.2 Data Flow
```
[Find products] → POST /api/products/match { stackId }
  → load stack items + profile
  → matchProducts({ stackItems, profile, products })
  → per item: ProductMatch[] ranked by fitScore (allergen-filtered)
      each: { product, fitScore, breakdown{dose,form,testing,additives,price}, pricePerEffectiveDose }
  → panel renders grouped by stack item; affiliate link shown, never affecting order
```

### 2.3 Dependencies
| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/product-matcher` | `lib/evidence`, `lib/safety`, types | Pure scoring (no I/O, no affiliate in score) |
| `api/products/match` | repos, `lib/product-matcher` | Load context → match |
| `ProductMatchPanel` | match endpoint | Render grouped matches |

---

## 3. Data Model

No new persisted tables. Seed catalog + computed types.

```typescript
// src/types/product.ts (Domain)
import type { SupplementForm } from "./index";

export interface Product {                 // seed entity (data/seed-products.ts)
  id: string;
  supplementId: string;                    // soft ref to seed Supplement
  brand: string;
  name: string;
  form: SupplementForm;
  dosePerServing: number;                  // amount of the active ingredient per serving
  doseUnit: string;
  servingsPerContainer: number;
  price: number;                           // container price (USD)
  allergenTags: string[];
  testingTags: string[];                   // e.g. ["NSF","Informed Sport"]
  additivesTags: string[];                 // e.g. ["artificial-color","magnesium-stearate"]
  affiliateLink: string | null;           // NEVER read by the scorer
  qualityNotes: string;
}

/** Affiliate-free view the scorer is allowed to see (compile-time trust guard). */
export type ScorableProduct = Omit<Product, "affiliateLink" | "qualityNotes">;

export interface MatchBreakdown {
  dose: number;      // 0..1 sub-scores
  form: number;
  testing: number;
  additives: number; // penalty already applied (lower = more additives)
  price: number;
}

export interface ProductMatch {
  product: Product;                        // full product (affiliate kept for display)
  fitScore: number;                        // 0..100, affiliate-independent
  breakdown: MatchBreakdown;
  pricePerEffectiveDose: number;           // USD per target-dose-equivalent serving
  reasons: string[];                       // per-criterion "why" (via lib/safety)
}

export interface ProductMatchGroup {
  stackItemId: string;
  supplementId: string;
  supplementName: string;
  targetDose: number;
  targetUnit: string;
  matches: ProductMatch[];                 // ranked; empty if none / all filtered
}

export interface ProductMatchResult {
  groups: ProductMatchGroup[];
}
```

---

## 4. API Specification

### 4.1 Endpoint List
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/products/match | Match seed products to a stack's items | Required |

### 4.2 `POST /api/products/match`
**Request:** `{ "stackId": "uuid" }` — auth-guarded, Zod uuid, stack ownership (404 if not owned).

**Response (200):**
```json
{
  "data": {
    "groups": [
      { "stackItemId": "uuid", "supplementId": "magnesium", "supplementName": "Magnesium",
        "targetDose": 300, "targetUnit": "mg",
        "matches": [
          { "product": { "brand": "Acme", "name": "Mag Glycinate", "form": "capsule",
              "dosePerServing": 300, "doseUnit": "mg", "servingsPerContainer": 120, "price": 24,
              "testingTags": ["NSF"], "additivesTags": [], "affiliateLink": "https://…", "qualityNotes": "…" },
            "fitScore": 92,
            "breakdown": { "dose": 1, "form": 1, "testing": 1, "additives": 1, "price": 0.8 },
            "pricePerEffectiveDose": 0.2,
            "reasons": ["Matches your 300 mg target", "Capsule matches your preference", "Third-party tested"] } ] }
    ]
  },
  "error": null
}
```
**Errors:** `400` invalid stackId · `401` unauthorized · `404` stack not owned. Items with no `supplementId` (custom) or no seed products yield an empty `matches` array (UI shows "no matched products").

---

## 5. UI/UX Design

### 5.1 Placement
A **Product Match panel** on the stack detail page (`/stack-lab/[stackId]`), below the Protocol panel.

### 5.2 User Flow
```
Stack detail → "Find Products" → matches grouped per stack item
  → compare cards (fit score, breakdown, price/effective dose, badges, quality notes)
  → open affiliate link (labeled; never reorders)
```

### 5.3 Component List
| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ProductMatchPanel` | `components/stack/` | Find/refresh, render groups per item, empty states |
| `ProductMatchCard` | `components/stack/` | Product + fit score + breakdown + badges + quality notes + affiliate link |

### 5.4 Page UI Checklist

#### Product Match panel (on /stack-lab/[stackId])
- [ ] Button: "Find Products" (and "Refresh" after first run)
- [ ] Empty state (no stack items): "Add items to your stack to match products"
- [ ] Group heading per stack item (supplement name + target dose)
- [ ] Per-item empty: "No matched products in the current catalog"
- [ ] Card: brand + product name
- [ ] Card: fit score (0–100)
- [ ] Card: per-criterion breakdown (dose / form / testing / additives / price)
- [ ] Card: price-per-effective-dose
- [ ] Card: dose-per-serving + form
- [ ] Card: testing badge(s) when present
- [ ] Card: additives warning when present
- [ ] Card: quality notes
- [ ] Card: affiliate link — labeled "Affiliate link · does not affect ranking", `rel="sponsored noopener"`
- [ ] Ranking visibly independent of affiliate presence
- [ ] Disclaimer (variant="evaluation")

---

## 6. Error Handling
| Code | Cause | Handling |
|------|-------|----------|
| 400 | Invalid stackId | Inline panel error |
| 401 | No session | Page already guarded |
| 404 | Stack not owned | "Stack not found" |
| 200 empty | No items / no products | Per-item or panel empty state |

Envelope `{data,error}` via `lib/api/respond.ts`.

---

## 7. Security Considerations
- [ ] Auth guard + stack ownership (reuse `getUser`, `getStack`).
- [ ] Zod-validate `{ stackId }`.
- [ ] No new tables → RLS unaffected; reads only the user's own stack/profile.
- [ ] Affiliate links: `rel="sponsored noopener noreferrer"`, `target="_blank"`.
- [ ] **Trust invariant**: scorer signature accepts `ScorableProduct` (affiliate omitted) — affiliate cannot reach the score.

---

## 8. Test Plan

### 8.1 Scope
| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0 Unit | `lib/product-matcher` (ranking, allergen filter, price/dose, **affiliate-invariance**, form-pref, additives) | Vitest | Do |
| L1 API | `/api/products/match` — auth, validation, shape | Playwright request | Do |
| L2/L3 | panel: find products on stack detail | Playwright | Do |

### 8.2 L0 Unit Scenarios (core)
| # | Scenario | Expect |
|---|----------|--------|
| 1 | item magnesium → products for magnesium ranked by fitScore | ordered |
| 2 | allergen conflict (profile allergy ∈ product.allergenTags) → excluded | not present |
| 3 | product dose == target dose → dose sub-score 1; far off → lower | graded |
| 4 | form matches profile pref → form sub-score boosted | higher |
| 5 | testing tag present → testing sub-score 1 + reason | flagged |
| 6 | additives present → penalty + warning reason | lower + reason |
| 7 | price-per-effective-dose computed correctly (price ÷ servings ÷ doseFitFactor) | correct number |
| 8 | **affiliate-invariance**: same products with/without affiliateLink → identical fitScore + order | identical |
| 9 | custom item (no supplementId) or no products → empty matches | `[]` |
| 10 | all copy non-diagnostic | `containsBannedLanguage` false |

### 8.3 L1 API
| # | Test | Expected |
|---|------|----------|
| 1 | POST unauth | 401 |
| 2 | POST missing/invalid stackId | 400 |
| 3 | POST other user's stack | 404 |
| 4 | POST valid (authed) | 200, `.data.groups` array |

### 8.4 L3 E2E
| # | Scenario | Success |
|---|----------|---------|
| 1 | login → seeded demo stack → Find Products → product cards render with fit score + affiliate label | matches shown |

### 8.5 Seed Data
- `data/seed-products.ts`: ≥2 products for each high-value seed supplement (magnesium, creatine, vitamin-d, fish-oil, etc.), varied dose/form/testing/additives/price to exercise scoring.
- Demo seed stack already exists; no DB seed change needed (products are static seed).

---

## 9. Clean Architecture

### 9.1 Layer Assignment
| Component | Layer | Location |
|-----------|-------|----------|
| `matchProducts()` + `rules.ts` | Domain (pure) | `src/lib/product-matcher/` |
| `Product` / `ProductMatch` / `ScorableProduct` | Domain | `src/types/product.ts` |
| seed catalog | Domain data | `src/data/seed-products.ts` |
| match route handler | Application | `src/app/api/products/match/route.ts` |
| repos (stack/items/profile) | Infrastructure | reuse `src/lib/db/*` |
| `ProductMatchPanel`, `ProductMatchCard` | Presentation | `src/components/stack/` |

### 9.2 Dependency Rule
`lib/product-matcher` imports only `lib/evidence`, `lib/safety`, `types` — no Supabase/React. Scoring functions take `ScorableProduct` (affiliate omitted) to make affiliate-independence a **compile-time** guarantee.

---

## 10. Coding Conventions
Reuse established conventions: PascalCase components, camelCase utils, kebab-case folders, `{data,error}` envelope, Zod in `lib/validation/schemas.ts`, weights as named constants in `rules.ts`.

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/
├── types/product.ts                          # NEW domain types (+ ScorableProduct)
├── data/seed-products.ts                      # NEW mock catalog
├── lib/product-matcher/
│   ├── rules.ts                                # weights, dose-fit, price/dose, allergen filter, form/testing/additives
│   ├── index.ts                                # matchProducts()
│   └── product-matcher.test.ts                # L0 unit (incl affiliate-invariance)
├── app/api/products/match/route.ts            # NEW endpoint
├── components/stack/
│   ├── ProductMatchPanel.tsx                   # NEW
│   └── ProductMatchCard.tsx                    # NEW
└── app/stack-lab/[stackId]/page.tsx            # MODIFY: mount ProductMatchPanel
tests/e2e/product-match*.spec.ts               # L1/L3 (+ reuse login helper)
```

### 11.2 Implementation Order
1. [ ] `types/product.ts` + `data/seed-products.ts` + `lib/product-matcher` (rules + match) + unit tests — pure core
2. [ ] `POST /api/products/match` (auth + Zod + ownership + load + match)
3. [ ] `ProductMatchCard` + `ProductMatchPanel`; mount on stack detail
4. [ ] L1/L3 specs + safety copy helpers

### 11.3 Session Guide

#### Module Map
| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---------:|
| Matcher | `module-1` | types + seed-products + `lib/product-matcher` + unit tests | 35-45 |
| API + UI | `module-2` | match endpoint + Panel/Card + mount + e2e | 35-45 |

#### Recommended Session Plan
| Session | Phase | Scope |
|---------|-------|-------|
| 1 | Do | `--scope module-1` |
| 2 | Do | `--scope module-2` |
| 3 | Check + QA + Report | 전체 |

### 11.4 Key Algorithm — scoring (`lib/product-matcher/rules.ts`)

`matchProducts({ stackItems, profile, products }): ProductMatchResult`

| Step | Logic |
|------|-------|
| **Candidates** | products where `product.supplementId === item.supplementId`. |
| **Allergen filter** | drop products where `allergenTags ∩ profile.allergies ≠ ∅` (reuse norm). |
| **Dose sub-score** | `r = product.dosePerServing / targetDose` (unit-matched). Score = `1 - min(|1-r|, 1)` (1 at exact match, decays). Skip/0.5 if units differ. |
| **Form sub-score** | 1 if `product.form ∈ profile.formPreferences` (or no prefs set), else `FORM_MISS` (0.6). |
| **Testing sub-score** | 1 if `testingTags.length>0` else `NO_TEST` (0.6). |
| **Additives sub-score** | `1 - min(additivesTags.length × ADDITIVE_PENALTY (0.15), 0.6)`. |
| **Price sub-score** | from `pricePerEffectiveDose` normalized within the candidate set (cheapest=1). |
| **fitScore** | `100 × (W.dose×dose + W.form×form + W.testing×testing + W.additives×additives + W.price×price)`, weights sum to 1 (e.g. dose .35, price .25, testing .2, form .1, additives .1). Constants in `rules.ts`. |
| **pricePerEffectiveDose** | `price / servingsPerContainer / max(doseSubScore, 0.1)`. |
| **Rank** | by fitScore desc, tie-break pricePerEffectiveDose asc, then brand alpha. |
| **Reasons** | per-criterion strings via `safetyCopy.productReason*` (non-diagnostic, "fit not endorsement"). |
| **Trust** | scorer functions accept `ScorableProduct` (no affiliate); affiliate re-attached only when assembling the display `ProductMatch`. |

Each step unit-tested; affiliate-invariance test asserts identical output regardless of `affiliateLink`.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Option C — Pragmatic) | benhwang121@gmail.com |
