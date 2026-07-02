# Archive Index — 2026-07

| Feature | Archived | Match Rate | QA | Documents |
|---------|----------|:----------:|:--:|-----------|
| [identity-cards](identity-cards/) | 2026-07-02 | 98% (static + L1/L2 runtime) | PASS | plan · design · analysis · report · qa-report |

> **v9 milestone** — `identity-cards` (the gamification / identity layer: a pure, deterministic `lib/identity` engine that **derives** a stable, explainable "supplement-thinking" archetype + 5 trait axes + confidence guard from existing profile/stack/evidence signals — surfaced as a premium Identity Card on Profile, per-stack archetype badges in Stack Lab, and compound archetypes in the Library). Architecture **Option C (additive)** — declarative archetype taxonomy + a pure nearest-profile classifier, mirroring v5 evidence-grading. The two load-bearing risk defenses are unit-proven: the **`emerging` anti-over-claim guard** (thin data → no hollow archetype; `dataDepth<0.25` or `matchScore<0.35`) and the **taxonomy reachability integrity** test (every archetype uniquely reachable; classifier total). Deep-linked "why" trail reuses v8 `citationHref`. Built via Plan-Plus → PDCA (Do ×3 modules, Check **98%**, **0 iterations**, QA **PASS**). Success criteria **10/10**; **311/311 unit** (+29) incl. classify-integrity + honesty sweep; `next build` OK; L1 auth-guard 1/1 + L2 public Library badge 1/1 runtime-verified live, authed L3 env-gated (`E2E_LIVE`). **0 engine/table files modified, no migration, no new dependency** — sixth consecutive additive Option-C milestone. **Deferred to v10:** identity snapshot/history, shareable-image export, evidence-literacy + standalone stack-quality scores, achievement badges, advisor integration, authed live-E2E provisioning.

- [Plan](identity-cards/identity-cards.plan.md)
- [Design](identity-cards/identity-cards.design.md)
- [Analysis](identity-cards/identity-cards.analysis.md)
- [Report](identity-cards/identity-cards.report.md)
- [QA Report](identity-cards/identity-cards.qa-report.md)
