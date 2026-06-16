# Archive Index — 2026-06

| Feature | Archived | Match Rate | QA | Documents |
|---------|----------|:----------:|:--:|-----------|
| [mvp-core-loop](mvp-core-loop/) | 2026-06-11 | 99% (runtime-verified) | PASS | plan · design · analysis · report · qa-report |
| [protocol-builder](protocol-builder/) | 2026-06-11 | 99% (runtime-verified) | — (report path) | plan · design · analysis · report |
| [product-match](product-match/) | 2026-06-11 | 99% (runtime-verified) | — (report path) | plan · design · analysis · report |
| [medication-interactions](medication-interactions/) | 2026-06-15 | 99% (runtime-verified) | PASS | plan · design · analysis · report · qa-report |
| [biomarker-intelligence](biomarker-intelligence/) | 2026-06-15 | 98% (runtime-verified) | PASS | plan · design · analysis · report · qa-report |

> **v2 milestone begins** — first feature beyond the v1 MVP + two extensions.
> **v3 milestone** — `biomarker-intelligence` (lab-informed intelligence).

## mvp-core-loop
The MVP core loop: search the Library → build a profile-aware stack → evidence-aware evaluation → compare vs goals. Built via Plan-Plus → PDCA (Design Option C, Do ×7 modules, Check 96%→Act-1 98%, QA 99% live). Success criteria 5/5 met against a live Supabase backend.

- [Plan](mvp-core-loop/mvp-core-loop.plan.md)
- [Design](mvp-core-loop/mvp-core-loop.design.md)
- [Analysis](mvp-core-loop/mvp-core-loop.analysis.md)
- [Report](mvp-core-loop/mvp-core-loop.report.md)
- [QA Report](mvp-core-loop/mvp-core-loop.qa-report.md)

## protocol-builder
Rule-based, ephemeral Protocol Builder: generates goal-grouped, grade-ranked, conflict-filtered, tier-tagged suggestions from the Profile (+ lab boost), accepted into a stack via the items API. Built via Plan-Plus → PDCA (Design Option C, Do ×2 modules, Check 99% runtime-verified). Success criteria 6/6 met live. Pure `lib/protocol-builder` sibling to `stack-evaluator`.

- [Plan](protocol-builder/protocol-builder.plan.md)
- [Design](protocol-builder/protocol-builder.design.md)
- [Analysis](protocol-builder/protocol-builder.analysis.md)
- [Report](protocol-builder/protocol-builder.report.md)

## product-match
Seed-backed Product Match: ranks real products per stack item by composite fit (dose/form/testing/additives/price-per-effective-dose), allergen hard-filtered, with affiliate structurally excluded from ranking (`ScorableProduct`). Built via Plan-Plus → PDCA (Design Option C, Do ×2, Check 99% runtime-verified, 0 iterations). Success criteria 6/6 met live.

- [Plan](product-match/product-match.plan.md)
- [Design](product-match/product-match.design.md)
- [Analysis](product-match/product-match.analysis.md)
- [Report](product-match/product-match.report.md)

## medication-interactions (v2)
Replaces v1's placeholder medication detection with a real, pure `lib/interactions` engine + curated seed datasets (18 medication aliases, 17 supplement↔drug + 3 supplement↔supplement rules). Normalizes meds (brand→generic→drug-class), grades severity, routes all copy through `lib/safety`, and surfaces findings across Stack Evaluation (with critical clinician-escalation banner), Protocol Builder, and Library ("Interactions" section + honest "no known interactions" empty state). Built via Plan-Plus → PDCA (Design Option C, Do ×2 modules, Check 97%→Act-1 99%, QA PASS live). Success criteria 6/6; honesty enforced by a banned-language sweep test. Deferred to v3: external interaction API, condition/pregnancy rules.

- [Plan](medication-interactions/medication-interactions.plan.md)
- [Design](medication-interactions/medication-interactions.design.md)
- [Analysis](medication-interactions/medication-interactions.analysis.md)
- [Report](medication-interactions/medication-interactions.report.md)
- [QA Report](medication-interactions/medication-interactions.qa-report.md)

## biomarker-intelligence (v3)
Replaces v1's naive lab string-matching with a real, pure `lib/biomarkers` engine + curated seed datasets (13 biomarkers, 15 biomarker↔supplement relevance rules). Normalizes free-text markers to canonical biomarkers, **converts values to a canonical unit** before any range comparison (safety-critical; user reference range preferred over registry), and drives findings by direction (low/high) + relation (support/caution). Surfaces across Stack Evaluation (lab-relevance flags + honest "not recognized" note), Protocol Builder (bounded `labSignal` ranking — boost *and* demote), and Library ("Relevant biomarkers" section). Profile lab entry gains marker autocomplete + unit/range auto-fill. Built via Plan-Plus → PDCA (Design Option C, Do ×2 modules, Check 96%→Act-1 98%, QA PASS live). Success criteria 7/7. Deferred to v4: lab file parsing, LOINC, trend tracking.

- [Plan](biomarker-intelligence/biomarker-intelligence.plan.md)
- [Design](biomarker-intelligence/biomarker-intelligence.design.md)
- [Analysis](biomarker-intelligence/biomarker-intelligence.analysis.md)
- [Report](biomarker-intelligence/biomarker-intelligence.report.md)
- [QA Report](biomarker-intelligence/biomarker-intelligence.qa-report.md)
