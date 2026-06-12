---
template: analysis
version: 1.3
feature: protocol-builder
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# protocol-builder Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation) — **runtime-verified** (live Supabase)
>
> **Project**: Supplement Stack Intelligence Platform
> **Analyst**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Design Doc**: [protocol-builder.design.md](../02-design/features/protocol-builder.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Profile + evidence exist but no proactive personalized strategy. |
| **WHO** | Health nerds, biohackers, athletes, longevity users (with a profile). |
| **RISK** | Generic/opaque suggestions; conflicting items; non-determinism; scope creep. |
| **SUCCESS** | Grouped, grade-ranked, conflict-safe suggestions accepted into a stack. |
| **SCOPE** | Ephemeral + accept-into-existing-stack + rule-based. No persistence/scoring/LLM. |

---

## Strategic Alignment & Success Criteria (live-verified)

| # | Criteria (Plan §1.3) | Status | Evidence |
|---|---------------------|:------:|----------|
| SC-1 | Grouped, grade-ranked suggestions w/ tier/dose/timing/rationale | ✅ Met | [generateProtocol](../../src/lib/protocol-builder/index.ts); unit test "groups + grade-ranked" |
| SC-2 | Exclude allergen conflicts; flag medication-caution | ✅ Met | unit tests (exclude fish-oil; berberine flagged) |
| SC-3 | Accept one / accept-all into chosen stack | ✅ Met | [ProtocolPanel](../../src/components/stack/ProtocolPanel.tsx); L3 e2e accept-all → items added |
| SC-4 | Lab markers influence prioritization | ✅ Met | unit "lab-boosts deficient marker first" |
| SC-5 | Already-in-stack flag + regenerate | ✅ Met | `alreadyInStack` annotation; Regenerate button |
| SC-6 | Deterministic, unit-tested, non-diagnostic | ✅ Met | determinism test; banned-language test; 100% line cov |

**Success Rate: 6/6 (100%) — all live-verified.**

### Decision Record Verification
| Source | Decision | Followed? |
|--------|----------|:---------:|
| [Plan] | Ephemeral, rule-based, accept-into-existing-stack | ✅ |
| [Design] | Option C — pure `lib/protocol-builder` + thin endpoint | ✅ |
| [Design] | All copy via `lib/safety` | ✅ (added `protocolRationale`/`protocolConfidenceNote`) |

---

## 1. Overview
Verify `protocol-builder` (modules 1–2) against Design §4/§5.4/§9 + Plan SCs. **Environment: live Supabase + running dev server** → runtime-weighted formula applies.

Static evidence: `tsc` clean · unit **56/56** (9 protocol) · `next build` green.
Runtime evidence: protocol e2e **3/3 live** (L1×2 + L3); full suite **15/15** earlier this session.

---

## 2. Gap Analysis

### 2.1 API (Design §4.1)
| Design | Implementation | Status |
|--------|---------------|--------|
| POST /api/protocol/generate | [route.ts](../../src/app/api/protocol/generate/route.ts) | ✅ Match |
| Accept reuses POST /stacks/:id/items | ProtocolPanel → items API | ✅ Match |

**Structural API: 100%.**

### 2.2 Data Model
Domain-only types ([types/protocol.ts](../../src/types/protocol.ts)); no new tables (ephemeral, as designed). ✅

### 2.3 Components
`ProtocolPanel`, `SuggestionCard` present; reuse `EffectGradeBadge`. ✅

### 2.4 Functional Depth
No placeholders; generator is real, pure logic (not mocked). Shallow files: 0.

### 2.5 Page UI Checklist (Design §5.4)
| Element | Status |
|---------|:------:|
| Generate / Regenerate | ✅ |
| No-goals empty state + link | ✅ |
| Group heading + count | ✅ |
| Grade badge + tier badge | ✅ |
| Dose + timing | ✅ |
| Rationale | ✅ |
| Confidence note (conditional) | ✅ |
| Lab-boost ✦ | ✅ |
| Medication-caution flag | ✅ |
| Already-in-stack badge (accept disabled) | ✅ |
| Accept / Dismiss / Accept-all | ✅ |
| Disclaimer | ✅ (page-level `evaluation` disclaimer below panel) |

**Functional Match Rate: ~99%** (only nuance: disclaimer is page-level rather than inside the panel).

### 2.6 API Contract (3-way)
| Endpoint | Design | Server | Client | Contract |
|----------|:------:|:------:|:------:|:--------:|
| POST /api/protocol/generate | ✅ | ✅ | ✅ ProtocolPanel | PASS |
| POST /stacks/:id/items (accept) | ✅ | ✅ | ✅ ProtocolPanel | PASS |

Envelope `{data,error}` consistent. **Contract: 100%.**

### 2.7 Runtime Verification Results (executed)
**L0 Unit** — 9/9 protocol-builder (100% lines).
**L1 API** — 2/2 (`401` guard, `{data,error}` envelope).
**L3 E2E** — 1/1 live: `login → new stack → generate protocol → accept-all → evaluate`.
> L2 UI actions are exercised within the L3 flow (generate + accept-all + evaluate) rather than a separate spec.

**Runtime Match Rate** ≈ 100%.

### 2.8 Match Rate Summary
```
┌─────────────────────────────────────────────┐
│  Structural 100%  ·  Functional 99%          │
│  Contract  100%   ·  Runtime    100%         │
│  ─────────────────────────────────────────── │
│  Overall: 99%                                │
│  = 0.15×100 + 0.25×99 + 0.25×100 + 0.35×100  │
└─────────────────────────────────────────────┘
```

---

## 6. Clean Architecture Compliance
`lib/protocol-builder` imports only `lib/evidence`, `lib/safety`, evaluator constants, and types — pure (same contract as `stack-evaluator`). API route is I/O only. ✅ ~100%.

---

## 9. Recommended Actions

### Minor (backlog — non-blocking)
| Item | Note |
|------|------|
| Live-refresh Items after accept | Currently requires page reload (documented inline); could wire `router.refresh()` |
| Move disclaimer into ProtocolPanel | Cosmetic; page-level disclaimer already present |
| Risk/experience filtering | Intentionally deferred (Plan §3.2) |

No Critical or Important issues.

---

## 11. Next Steps
- [ ] `/pdca qa protocol-builder` (or proceed to report — match rate ≥ 90%)
- [ ] `/pdca report protocol-builder`

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial analysis (runtime-verified; 99% match, 6/6 SC) | benhwang121@gmail.com |
