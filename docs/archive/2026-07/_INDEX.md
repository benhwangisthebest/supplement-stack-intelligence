# Archive Index — 2026-07

| Feature | Archived | Match Rate | QA | Documents |
|---------|----------|:----------:|:--:|-----------|
| [identity-cards](identity-cards/) | 2026-07-02 | 98% (static + L1/L2 runtime) | PASS | plan · design · analysis · report · qa-report |
| [daily-checkin](daily-checkin/) | 2026-07-02 | 99% (static + L1/L2 runtime) | PASS | plan · design · analysis · report · qa-report |

> **v9 milestone** — `identity-cards` (the gamification / identity layer: a pure, deterministic `lib/identity` engine that **derives** a stable, explainable "supplement-thinking" archetype + 5 trait axes + confidence guard from existing profile/stack/evidence signals — surfaced as a premium Identity Card on Profile, per-stack archetype badges in Stack Lab, and compound archetypes in the Library). Architecture **Option C (additive)** — declarative archetype taxonomy + a pure nearest-profile classifier, mirroring v5 evidence-grading. The two load-bearing risk defenses are unit-proven: the **`emerging` anti-over-claim guard** (thin data → no hollow archetype; `dataDepth<0.25` or `matchScore<0.35`) and the **taxonomy reachability integrity** test (every archetype uniquely reachable; classifier total). Deep-linked "why" trail reuses v8 `citationHref`. Built via Plan-Plus → PDCA (Do ×3 modules, Check **98%**, **0 iterations**, QA **PASS**). Success criteria **10/10**; **311/311 unit** (+29) incl. classify-integrity + honesty sweep; `next build` OK; L1 auth-guard 1/1 + L2 public Library badge 1/1 runtime-verified live, authed L3 env-gated (`E2E_LIVE`). **0 engine/table files modified, no migration, no new dependency** — sixth consecutive additive Option-C milestone. **Deferred to v10:** identity snapshot/history, shareable-image export, evidence-literacy + standalone stack-quality scores, achievement badges, advisor integration, authed live-E2E provisioning.

- [Plan](identity-cards/identity-cards.plan.md)
- [Design](identity-cards/identity-cards.design.md)
- [Analysis](identity-cards/identity-cards.analysis.md)
- [Report](identity-cards/identity-cards.report.md)
- [QA Report](identity-cards/identity-cards.qa-report.md)

## daily-checkin (v10)
Closes the platform's open recommendation loop with a **gamified daily check-in + feedback loop**. A daily check-in captures **adherence** (which stack items were taken) + a **1–5 rating on active goals**; a pure `lib/checkin` engine derives a **consistency** metric (premium heatmap, no points/badges), **correlational** outcome aggregates (avg goal rating on taken-vs-not days), and a **bounded, min-sample-gated feedback signal** that nudges the existing `generateProtocol` ranking. Architecture is **additive** with a key safety decision: the feedback signal is inserted as a ranking key **strictly below grade** (`labSignal → grade → feedback → composite → name`), so self-reported feedback is **evidence-subordinate by construction** — it can only break ties within an equal grade and can **never override evidence**. This is *proven, not asserted*: a **no-feedback regression test** shows `generateProtocol` output is byte-identical without a signal, and that a max feedback never lifts a lower grade above a higher one. Consistency also feeds the **v9 identity** `dataDepth`, unifying the two gamification features. All outcome/side-effect copy is **correlational + non-diagnostic** (honesty sweep); the side-effect/note field is **display-only**. Built via Plan-Plus → PDCA (Do ×3 modules, Check **99%**, **0 iterations**, QA **PASS**). Success criteria **10/10**; **340/340 unit** (+29) incl. feedback-regression + honesty; `next build` OK; L1 auth-guard 2/2 + L2 `/stack-lab` redirect 1/1 runtime-verified live, authed L3 env-gated (`E2E_LIVE`, needs `0006` applied). First milestone to intentionally break the no-migration / no-engine-edit streaks — done via **one additive migration** (`0006_checkins`, RLS + unique(user,date)) and **optional, backward-compatible** engine inputs, keeping all prior v3/v4/v5/v9 suites green. No new dependencies. **Deferred to v11:** proactive advisor change-proposals, side-effect engine, reminders/notifications, wearable import, longitudinal trend charts, authed live-E2E provisioning.

- [Plan](daily-checkin/daily-checkin.plan.md)
- [Design](daily-checkin/daily-checkin.design.md)
- [Analysis](daily-checkin/daily-checkin.analysis.md)
- [Report](daily-checkin/daily-checkin.report.md)
- [QA Report](daily-checkin/daily-checkin.qa-report.md)
