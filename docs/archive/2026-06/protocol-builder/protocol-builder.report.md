---
template: report
version: 1.1
feature: protocol-builder
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# protocol-builder Completion Report

> **Status**: Complete — runtime-verified against live Supabase
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: benhwang121@gmail.com
> **Completion Date**: 2026-06-11
> **PDCA Cycle**: #2

---

## Executive Summary

### 1.1 Project Overview
| Item | Content |
|------|---------|
| Feature | protocol-builder (rule-based, ephemeral protocol generation) |
| Method | Plan Plus → PDCA (Design Option C → Do ×2 modules → Check) |
| End Date | 2026-06-11 |

### 1.2 Results Summary
```
┌─────────────────────────────────────────────┐
│  Match Rate: 99% (runtime-verified)          │
├─────────────────────────────────────────────┤
│  ✅ Modules:        2 / 2                      │
│  ✅ Unit tests:     56 / 56 (9 protocol)      │
│  ✅ Protocol e2e:   3 / 3 live (L1×2 + L3)    │
│  ✅ Success criteria: 6 / 6 (live)            │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered
| Perspective | Content |
|-------------|---------|
| **Problem** | After building a profile, users had no proactive, personalized starting strategy — they had to assemble a sensible stack by hand. |
| **Solution** | A pure, deterministic `lib/protocol-builder` that turns Profile + labs into goal-grouped, grade-ranked, conflict-filtered, tier-tagged suggestions, surfaced on the stack page and accepted into the stack via the existing items API. |
| **Function/UX Effect** | "Generate Protocol" → goal groups with grade + tier badges, dose/timing, "why it fits", lab-boost ✦, medication flags, already-in-stack; dismiss / accept / accept-all / regenerate; then evaluate. Verified live end-to-end. |
| **Core Value** | Closes the loop from evidence + context to a concrete, explainable, editable strategy — without persistence, scoring complexity, or AI; fully unit-tested and deterministic. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | Grouped, grade-ranked + tier/dose/timing/rationale | ✅ Met | unit + L3 |
| SC-2 | Allergen exclusion + medication flag | ✅ Met | unit |
| SC-3 | Accept one / all into chosen stack | ✅ Met | L3 accept-all |
| SC-4 | Lab-informed prioritization | ✅ Met | unit lab-boost |
| SC-5 | Already-in-stack + regenerate | ✅ Met | annotation + button |
| SC-6 | Deterministic, tested, non-diagnostic | ✅ Met | determinism + banned-language tests |

**Success Rate: 6/6 (100%).**

## 1.5 Decision Record Summary
| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | Ephemeral + accept-into-existing-stack | ✅ | No new tables; reused items API |
| [Plan] | Rule-based engine (not scoring/LLM) | ✅ | Deterministic, 100% generator coverage |
| [Design] | Option C pure `lib/protocol-builder` | ✅ | I/O only in route; pure core |
| [Design] | Copy via `lib/safety` | ✅ | Added protocol copy helpers; non-diagnostic |

---

## 2. Related Documents
| Phase | Document | Status |
|-------|----------|--------|
| Plan | [protocol-builder.plan.md](../01-plan/features/protocol-builder.plan.md) | ✅ |
| Design | [protocol-builder.design.md](../02-design/features/protocol-builder.design.md) | ✅ |
| Check | [protocol-builder.analysis.md](../03-analysis/protocol-builder.analysis.md) | ✅ 99% |
| Report | Current document | ✅ |

---

## 3. Completed Items

### 3.1 Functional Requirements
| ID | Requirement | Status |
|----|-------------|--------|
| FR-01 | Per-goal grade-ranked suggestions | ✅ |
| FR-02 | Allergen exclusion + medication flag | ✅ |
| FR-03 | tier/dose/timing/rationale/confidence note | ✅ |
| FR-04 | Lab-informed prioritization | ✅ |
| FR-05 | `POST /api/protocol/generate` (auth-guarded) | ✅ |
| FR-06 | Already-in-stack flag (protocol-vs-stack) | ✅ |
| FR-07 | Accept one → chosen stack | ✅ |
| FR-08 | Accept-all | ✅ |
| FR-09 | Dismiss | ✅ |
| FR-10 | Regenerate | ✅ |
| FR-11 | Non-diagnostic copy via `lib/safety` | ✅ |

### 3.3 Deliverables
| Deliverable | Location |
|-------------|----------|
| Pure generator | `src/lib/protocol-builder/` (rules + index + tests) |
| Domain types | `src/types/protocol.ts` |
| API | `src/app/api/protocol/generate/route.ts` |
| UI | `src/components/stack/{ProtocolPanel,SuggestionCard}.tsx` (mounted on stack detail) |
| Tests | `protocol-builder.test.ts` (L0) + `tests/e2e/protocol-builder*.spec.ts` (L1/L3) |

---

## 4. Incomplete Items
| Item | Reason | Priority |
|------|--------|----------|
| Live-refresh Items after accept | By-design v1 (reload shows them); documented inline | Low |
| Risk/experience filtering | Deferred (Plan §3.2 YAGNI) | Low |
| Persisted protocols / scoring model / LLM | Deferred/removed by Plan | — |

---

## 5. Quality Metrics
| Metric | Target | Final |
|--------|--------|-------|
| Match Rate | 90% | 99% (runtime-verified) |
| Unit tests | pass | 56/56 (9 protocol) |
| Generator coverage | 80% | 100% lines |
| Protocol e2e | pass | 3/3 live |
| Critical issues | 0 | 0 |

### 5.2 Resolved during Do/Check
| Issue | Resolution |
|-------|------------|
| Playwright strict-mode on hidden `<option>` (×2) | Asserted on the Accept button / row format instead |
| Dev-server cold-start timeout in Check | Started tracked background server, polled to ready, ran with `PLAYWRIGHT_NO_SERVER=1` |

---

## 6. Lessons Learned
### Keep
- **Reuse paid off massively** — Protocol Builder was a thin generator over `lib/evidence` + items API; module-1 (pure core) was 100%-covered before any UI.
- **Live backend from the start** (carried over from mvp-core-loop) meant Check ran runtime-verified, not static-only — a truer 99%.

### Improve
- Recurring Playwright hidden-`<option>` strict-mode trap — worth a shared test helper that scopes to visible card regions.
- Accept→Items needs a refresh; smoother UX would wire `router.refresh()`.

---

## 8. Next Steps
### Immediate
- [ ] `/pdca archive protocol-builder`

### Next PDCA Cycle (remaining backlog)
| Item | Priority |
|------|----------|
| Product Match (seeded mock) | Medium |
| Items live-refresh + stack rename/delete UI | Low |
| Rate limiting before multi-user launch | Low |

---

## 9. Changelog
### v0.2.0 (2026-06-11)
**Added:**
- Protocol Builder: pure rule-based generator (`lib/protocol-builder`), `POST /api/protocol/generate`, `ProtocolPanel` + `SuggestionCard` on the stack page
- Tier tagging, lab-informed prioritization, confidence notes, accept / accept-all / dismiss / regenerate, already-in-stack flag
- Protocol copy helpers in `lib/safety`; 9 unit tests + L1/L3 e2e

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-11 | Completion report (cycle #2, 99% runtime-verified) | benhwang121@gmail.com |
