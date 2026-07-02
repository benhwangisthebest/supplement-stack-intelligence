# identity-cards — Gap Analysis (Check Phase)

> **Feature**: `identity-cards` (v9)
> **Date**: 2026-07-02
> **Design**: [identity-cards.design.md](../02-design/features/identity-cards.design.md)
> **Plan**: [identity-cards.plan.md](../01-plan/features/identity-cards.plan.md)
> **Mode**: static + runtime (unit 311/311, tsc clean, next build OK, L1+L2 live)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Reflect the user's evidence-literate identity back to them — the missing emotional payoff after 8 tooling milestones. Subtle, identity-based gamification per CLAUDE.md. |
| **WHO** | Evidence-literate biohacker / longevity / power users with rich profiles + multiple stacks. |
| **RISK** | Horoscope trap · over-claiming on thin data · medicalizing identity · taxonomy gaps · non-determinism. |
| **SUCCESS** | Deterministic derived archetype + traits + trail; confidence guard; per-stack + per-supplement; non-diagnostic; 0 engine/table files, no migration, no dep; auth+RLS API. |
| **SCOPE** | `lib/identity` engine · `GET /api/identity` · Library SSR badge · 4 components · Profile/Stack/Library surfacing · deep-links · unit+L1+L2/L3 tests. |

---

## 1. Strategic Alignment (Phase 3)

| Check | Result |
|-------|--------|
| Addresses the Plan's core problem (identity mirror)? | ✅ Profile renders a derived, explainable Identity Card; stacks + supplements carry archetype reads. |
| Honors the governing constraint (premium, not childish; not medical)? | ✅ Archetype = supplement-*thinking* style; all copy passes the banned-language sweep; emerging state avoids hollow labels. |
| Followed the selected architecture (Option C — data-driven taxonomy + pure nearest-profile classifier)? | ✅ `archetypes.ts` declarative targets; `classify.ts` weighted-distance nearest-profile; separate pure `traits`/`confidence`. |
| Additive guarantee held? | ✅ 0 engine/write-logic/table files modified; migrations still end at `0005`; no new dependency. |

No strategic misalignment.

---

## 2. Success Criteria (from Plan)

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC1 | Pure deterministic engine | ✅ Met | `traits.test.ts` determinism/bounds; `classify.test.ts` determinism; no I/O in `lib/identity/*` (except `context.ts` infra) |
| SC2 | Derived, explainable archetype + trail | ✅ Met | `index.ts` `buildTrail` → `IdentitySignal[]` with `effect-grade` citations; `IdentityCard` renders deep-linked "why" |
| SC3 | ≥4 trait axes bounded [0,1] | ✅ Met | 5 axes; `traits.test.ts` asserts bounds on all axes |
| SC4 | Per-stack archetype | ✅ Met | `stack-archetypes.ts`; `StackList` renders `StackArchetypeBadge` per stack (stack-lab page) |
| SC5 | Confidence / anti-over-claim guard | ✅ Met | `classify.ts` forces `emerging` when confidence emerging or `matchScore < 0.35`; `confidence.test.ts` thresholds; emerging UI shows sharpen checklist |
| SC6 | Supplement archetypes in Library | ✅ Met | `supplement-archetypes.ts`; `SupplementArchetypeBadge` SSR on `/library/[slug]`; **L2 live-verified** |
| SC7 | Non-diagnostic tone (honesty sweep) | ✅ Met | `honesty.test.ts` — 0 banned phrases across all generated copy (taglines, traits, trail, sharpen, stack notes, supplement rationales, card fields) |
| SC8 | Additive / zero-regression | ✅ Met | 0 engine/table files modified; no migration (still `0005`); no new dep; full suite 311/311 (+29); `next build` OK |
| SC9 | Auth-guarded API + RLS via existing repos | ✅ Met | `GET /api/identity` `getUser` guard; `context.ts` reuses `getProfile`/`listStacks`/`listItems`/`listLabMarkers`; **L1 401 live-verified** |
| SC10 | Taxonomy integrity (total classifier, all reachable) | ✅ Met | `classify.test.ts` — every archetype is the unique nearest neighbour of its own target; classifier total (returns `emerging` fallback, never null/throw) |

**Success rate: 10/10 met.**

---

## 3. Static Analysis

### 3.1 Structural Match — 100%
All designed artifacts present: `types/identity.ts`, 8 `lib/identity` source modules + 5 test files, `app/api/identity/route.ts`, 4 `components/identity/*`, `tests/e2e/identity-cards.spec.ts`. Four surfaces wired (Profile, Stack Lab via StackList, Library detail). No missing files vs Design §11.1.

### 3.2 Functional Depth — 98%
Engine logic complete and tested (no placeholders/TODOs/`any`). §5.4 Page UI Checklist satisfied: archetype name, tagline, confidence chip, 5 trait bars, deep-linked trail, emerging "sharpen" checklist, disclaimer; per-stack badge; supplement badge. (−2: the authed personal-card render is verified via build + component structure; its live assertion is E2E_LIVE-gated.)

### 3.3 API Contract — 95%
`GET /api/identity` → `{ data: { card, stackArchetypes }, error }` matches Design §4.2; spec asserts the shape. **Documented refinement:** Profile/Stack pages compute identity **server-side directly** (`loadIdentityContext` + derivations) rather than self-fetching their own endpoint — an intentional SSR choice (avoids a same-request HTTP round-trip; the endpoint remains for external/client callers and is L1-verified). (−5: no in-app client currently fetches `/api/identity`; it is server-consumed + L1-covered only.)

---

## 4. Runtime Verification — 98%

| Level | Result |
|-------|--------|
| Unit (L0) | ✅ 311/311 (+29 identity: traits, classify+integrity, confidence, supplement-archetypes, honesty) |
| Types | ✅ `tsc --noEmit` clean |
| Build | ✅ `next build` OK — `/api/identity` (dynamic) + `/library/[slug]` (SSG, badge prerendered) |
| L1 (API auth) | ✅ **Live** — `GET /api/identity` → 401 `UNAUTHORIZED` (anonymous) |
| L2 (Library badge) | ✅ **Live** — `/library/creatine` renders compound archetype badge |
| L3 (authed card) | ⏸ Gated on `E2E_LIVE` (needs seeded Supabase profile + stacks) — consistent with v4/v6/v7/v8 |

---

## 5. Match Rate

```
Runtime executed → Overall = Structural×0.15 + Functional×0.25 + Contract×0.25 + Runtime×0.35
                 = 100×0.15 + 98×0.25 + 95×0.25 + 98×0.35
                 = 15 + 24.5 + 23.75 + 34.3
                 = 97.55  → 98%
```

| Axis | Score |
|------|:-----:|
| Structural | 100 |
| Functional | 98 |
| Contract | 95 |
| Runtime | 98 |
| **Overall** | **98%** |

---

## 6. Decision Record Verification

| Decision | Followed? |
|----------|:---------:|
| [Plan] Approach A — derived archetype engine (deterministic, no-LLM) | ✅ pure `lib/identity`, no LLM |
| [Design] Option C — declarative taxonomy + nearest-profile classifier | ✅ `archetypes.ts` + `classify.ts` |
| [Design] `GET /api/identity` auth + RLS via existing repos | ✅ (Profile additionally SSR-computes — documented refinement) |
| [Design] Supplement archetype via Library SSR | ✅ moved to M3 with its badge (as flagged in M2) |
| [Plan] Anti-over-claim guard | ✅ `emerging` guard + tests |

---

## 7. Gap List

| Severity | Gap | Note |
|----------|-----|------|
| Critical | — | none |
| Important | — | none |
| Info | Profile/Stack pages SSR-compute identity rather than fetching `/api/identity` | Intentional (no self-fetch); endpoint exists + L1-verified. No action required. |
| Info | L3 authed personal-card render is `E2E_LIVE`-gated | Consistent with prior milestones; runtime-verify pre-deploy with seeded Supabase. |

**0 Critical, 0 Important.**

---

## 8. Conclusion

Match rate **98%** (static + runtime), **10/10 success criteria met**, **0 Critical / 0 Important** gaps. The additive Option-C guarantee held end-to-end (0 engine/table files, no migration, no dependency). The two load-bearing risk defenses — the `emerging` anti-over-claim guard and the taxonomy reachability integrity test — are implemented and unit-proven. Ready for QA / Report.
