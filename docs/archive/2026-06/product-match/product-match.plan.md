---
template: plan-plus
version: 1.0
feature: product-match
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# product-match Planning Document

> **Summary**: A pure, seed-backed matcher that ranks real-world products against each stack item by *fit* (dose-per-serving, form preference, third-party testing, additives, price-per-effective-dose), with affiliate links carried but strictly excluded from ranking.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | A user has an evidence-aware stack but still has to manually hunt for *which actual products* deliver the right ingredient, dose, and quality — and most shopping tools rank by commission, not fit. |
| **Solution** | A pure `lib/product-matcher` that scores curated seed products per stack item on multiple fit criteria (dose/form/testing/additives/price-per-effective-dose), hard-filtering allergen conflicts, with affiliate data kept entirely out of the ranking. |
| **Function/UX Effect** | A Product Match panel on the stack detail page shows, per item, ranked product cards with fit score, per-criterion "why" breakdown, price-per-effective-dose, testing badges, quality notes, and a clearly-labeled (non-ranking) affiliate link. |
| **Core Value** | Closes the last mile — from "what makes sense for me" to "what to actually buy" — while protecting trust by separating evidence/fit from monetization. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Users with a stack still can't tell which real products fit; shopping tools rank by commission. |
| **WHO** | Health nerds, biohackers, athletes — with a built stack. |
| **RISK** | Affiliate bias undermining trust; "fit" reduced to "cheapest"; recommending allergen-conflicting products; opaque ranking. |
| **SUCCESS** | Per stack item, ranked seed products by multi-criteria fit, allergen-safe, with affiliate strictly separate. |
| **SCOPE** | Seeded mock products + Stack Lab panel + pure composite-score matcher. No live API, no products table, no country filter. |

---

## 1. User Intent Discovery

### 1.1 Core Problem
The platform helps users decide *what* to take, but not *what to buy*. Product Match bridges that, ranking real products by genuine fit rather than commission — the trust-critical final step.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Health nerds / biohackers | Have a stack, want quality products at the right dose | Multi-criteria fit, not just price; transparency |
| Athletes | Need third-party-tested products | Testing badges + correct dose/form |
| Budget-conscious users | Comparing value | Price-per-effective-dose |

### 1.3 Success Criteria

- [ ] SC-1: For each stack item with a `supplementId`, `matchProducts` returns seed products ranked by a composite fit score.
- [ ] SC-2: Products with allergens conflicting the user's profile are excluded (hard filter).
- [ ] SC-3: Score factors dose-per-serving fit, form-preference match, third-party testing, additives penalty, and price-per-effective-dose — each shown in a per-criterion breakdown.
- [ ] SC-4: Affiliate links are displayed (clearly labeled) but **never** affect ranking.
- [ ] SC-5: Panel renders per-item ranked cards on the stack detail page with quality notes + testing badges.
- [ ] SC-6: Matcher is pure, deterministic, and unit-tested without a DB (≥80%); all advisory copy non-diagnostic via `lib/safety`.

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Trust over monetization | Affiliate excluded from ranking; "fit not endorsement" language | High |
| Seed-only | No live/Amazon API in MVP | Medium |
| Determinism | Pure rule-based scoring; reproducible | High |
| Reuse | Reuse stacks/items + profile layers, `lib/safety`, seed pattern | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Composite fit score — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | Pure `lib/product-matcher`: allergen hard-filter + weighted score (dose/form/testing/additives/price-per-effective-dose) per stack item; affiliate carried, never scored. |
| **Pros** | Captures multi-criteria "fit" (the whole point); deterministic, testable, explainable; mirrors `stack-evaluator`/`protocol-builder`. |
| **Cons** | Weights need defending (named constants). |
| **Effort** | Medium |
| **Best For** | This feature. |

### 2.2 Approach B: Filter-then-sort (minimal)

| Aspect | Details |
|--------|---------|
| **Summary** | Hard-filter conflicts, sort by price-per-effective-dose only. |
| **Pros** | Simplest. |
| **Cons** | Reduces "fit" to "cheapest" — undercuts the trust value. |
| **Effort** | Low |

### 2.3 Approach C: External/live ranking

| Aspect | Details |
|--------|---------|
| **Summary** | Real products via API. |
| **Cons** | Out of MVP; non-deterministic; not testable; monetization-first risk. |

### 2.4 Decision Rationale
**Selected**: Approach A — "product fit" is inherently multi-factor, and a composite pure-function score keeps it deterministic, testable, and explainable while upholding the trust principle (affiliate out of ranking). Consistent with the established engine architecture.

---

## 3. YAGNI Review

### 3.1 Included (v1 Must-Have)

Locked essentials:
- [ ] Per-stack-item matching by `supplementId`
- [ ] Allergen hard-filter (exclude conflicts)
- [ ] Dose-per-serving fit in score
- [ ] Ranked output per item
- [ ] Affiliate strictly separate from ranking
- [ ] Safety disclaimer
- [ ] Seeded mock products

Selected enrichments:
- [ ] Price-per-effective-dose (compute + factor + display)
- [ ] Third-party testing (score bonus + badge)
- [ ] Form-preference match (boost vs profile `formPreferences`)
- [ ] Additives/fillers flag (penalty + warning)
- [ ] Per-criterion "why" breakdown
- [ ] Quality notes display
- [ ] Affiliate link placeholder (labeled, non-ranking)

### 3.2 Deferred (v2+)

| Feature | Reason | Revisit When |
|---------|--------|--------------|
| Country availability filter | Adds UI + seed fields; low MVP value | On international demand |
| Persisted products table / admin entry | Seed sufficient at MVP scale | When catalog grows |
| Match against a *protocol* (not just stack) | Stack covers the loop; protocol items accept into stack first | After protocol-builder adoption |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason |
|---------|--------|
| Amazon/live API integration | Out of MVP; trust before monetization |
| Affiliate-influenced ranking | Violates the trust principle |

---

## 4. Scope

### 4.1 In Scope
- [ ] `types/product.ts` + `data/seed-products.ts` (mock catalog keyed by supplementId)
- [ ] `lib/product-matcher` pure composite-score matcher (+ unit tests)
- [ ] `POST /api/products/match { stackId }` (auth + ownership + load + match)
- [ ] `ProductMatchPanel` + `ProductMatchCard` on the stack detail page
- [ ] Price-per-effective-dose, testing, form-pref, additives scoring; per-criterion breakdown; quality notes; labeled affiliate link

### 4.2 Out of Scope
- Country availability filter — (deferred, §3.2)
- Products table / admin CMS — (deferred)
- Live/Amazon API, affiliate-influenced ranking — (removed)
- Protocol-item matching — (deferred)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Match seed products to each stack item by `supplementId` | High | Pending |
| FR-02 | Exclude allergen-conflicting products (hard filter) | High | Pending |
| FR-03 | Composite fit score: dose / form-pref / testing / additives / price-per-effective-dose | High | Pending |
| FR-04 | Rank products per item by fit score (affiliate excluded) | High | Pending |
| FR-05 | Per-criterion "why" breakdown per product | Medium | Pending |
| FR-06 | Compute + display price-per-effective-dose | High | Pending |
| FR-07 | Testing badge + additives warning + quality notes | Medium | Pending |
| FR-08 | `POST /api/products/match` auth-guarded + ownership-checked | High | Pending |
| FR-09 | Affiliate link displayed, clearly labeled, never affecting rank | High | Pending |
| FR-10 | Non-diagnostic, "fit not endorsement" copy via `lib/safety` | High | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Determinism | Same inputs → same ranking | Unit tests |
| Testability | Matcher pure, no DB | Vitest ≥80% on `lib/product-matcher` |
| Trust | Affiliate provably out of score | Unit test: rank invariant to affiliate field |
| Architecture | Domain-pure; API I/O only; UI presentation | Code review |

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] FR-01–FR-04, FR-06, FR-08–FR-10 implemented
- [ ] Matcher unit-tested (ranking, allergen exclusion, price-per-effective-dose, affiliate-invariance, form-pref boost)
- [ ] L1 (match endpoint) + L2/L3 (panel: generate matches on stack detail) specs
- [ ] `tsc` clean · `next build` green

### 6.2 Quality Criteria
- [ ] ≥80% coverage on `lib/product-matcher`
- [ ] No business logic in UI; affiliate never read by the scorer

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Affiliate bias creeps into ranking | High | Low | Scorer takes a product view that omits the affiliate field; unit-test rank invariance |
| "Fit" feels arbitrary | Medium | Medium | Per-criterion breakdown + named weight constants |
| Allergen-conflicting product shown | High | Low | Hard filter before scoring; unit-tested |
| Seed catalog too thin to be useful | Medium | Medium | Seed ≥2–3 products for each high-value supplement |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic. Selected: ✅ Dynamic.

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Data source | seeded mock / Supabase table / live API | Seeded mock | Static at MVP; pure + deterministic |
| Placement | stack panel / library / both | Stack Lab panel | Brief: "after the user has a stack" |
| Engine | composite score / filter-sort / external | Composite (A) | Multi-criteria fit; testable; trustworthy |
| Affiliate | in-ranking / separate | Strictly separate | Trust principle (provable via test) |

### 8.3 Component Overview
```
src/types/product.ts                         # Product (seed) + ProductMatch / ProductMatchResult
src/data/seed-products.ts                    # mock catalog keyed by supplementId
src/lib/product-matcher/                     # PURE: matchProducts(stackItems, profile, products)
  rules.ts (weights, dose-fit, price-per-effective-dose, allergen filter), index.ts, *.test.ts
src/app/api/products/match/route.ts          # auth + ownership → load items/profile → match
src/components/stack/ProductMatchPanel.tsx   # generate matches, grouped by stack item
src/components/stack/ProductMatchCard.tsx    # fit score, breakdown, badges, quality notes, affiliate link
```

### 8.4 Data Flow
```
Stack items + Profile + seed-products
   └─→ matchProducts() [pure] ─→ per item: ranked ProductMatch[] (fitScore, breakdown, pricePerEffectiveDose, affiliate)
         └─→ ProductMatchPanel (grouped by item) — affiliate labeled, never affecting rank
```

---

## 9. Convention Prerequisites
- [ ] Follow established conventions (pure `lib/`, `{data,error}` envelope, Zod, RLS)
- [ ] `lib/product-matcher` imports only `lib/evidence` (supplement lookup), `lib/safety`, types — never the affiliate field in scoring

---

## 10. Next Steps
1. [ ] `/pdca design product-match`
2. [ ] Define scoring weights + dose-fit + price-per-effective-dose formula + affiliate-invariance contract in Design
3. [ ] Implement + test → `/pdca do product-match`

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Intent | Data source? | Seeded mock | No products table; pure seed catalog |
| Intent | Placement? | Stack Lab panel | Matches brief's "after a stack" flow |
| Alternatives | Engine? | Composite fit score (A) | Multi-criteria, deterministic, trustworthy |
| YAGNI (scoring) | price / testing / form / additives? | All IN | Rich, honest fit |
| YAGNI (display) | breakdown / quality / affiliate / country? | breakdown+quality+affiliate IN; country OUT | Explainable; country deferred |
| Design | Architecture & data-flow OK? | Yes | Anchor Plan to pure matcher + 1 endpoint + panel |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Plan Plus) | benhwang121@gmail.com |
