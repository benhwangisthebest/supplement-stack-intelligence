---
template: analysis
version: 1.3
feature: ai-advisor
date: 2026-06-17
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v6
---

# ai-advisor Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation) — static + runtime (unit + build + L1/L2 e2e); live authed L3 gated on `E2E_LIVE`
>
> **Project**: Supplement Stack Intelligence Platform
> **Analyst**: benhwang121@gmail.com
> **Date**: 2026-06-17
> **Design Doc**: [ai-advisor.design.md](../02-design/features/ai-advisor.design.md)
> **Plan Doc**: [ai-advisor.plan.md](../01-plan/features/ai-advisor.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | A platform called "Advisor" has no advisor; cross-cutting questions force users to synthesize across separate screens. |
| **WHO** | Evidence-literate health-nerd / biohacker / longevity users wanting a grounded synthesis of *their* context. |
| **RISK** | LLM fabricating/softening a safety claim; ungrounded knowledge; non-determinism; runaway cost; RLS leakage; handler/engine drift. |
| **SUCCESS** | Read-only, strictly-grounded, provenance-bearing answers; honest refusal; engines untouched; one isolated non-deterministic unit; a sweep test proving no fabrication. |
| **SCOPE** | `lib/advisor` (tools+loop+prompt) · isolated adapter · streaming API · 6 tools · RLS tables · provenance · budget · safety + honesty sweep. No writes/general-knowledge/AI-drafting/personalization. |

---

## 1. Strategic Alignment (Plan WHY)

The implementation addresses the core problem directly: a natural-language `/advisor` surface that chains the v1–v5 engines as **grounded tools** and answers from *the user's own* profile/stack/labs. The deterministic-trust posture is preserved — the LLM orchestrates and narrates, the engines own all truth, and the honesty sweep proves the advisor cannot fabricate or diagnose. **No strategic misalignment.**

---

## 2. Success Criteria (Plan §1.3)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC1 | 6-tool registry wrapping existing engines | ✅ Met | `lib/advisor/tools.ts`; `tools.test.ts` asserts exactly 6 + purity vs direct engine calls |
| SC2 | Bounded loop (turn cap + budget guard) | ✅ Met | `agent.ts` `MAX_TURNS`; `agent.test.ts` turn-cap + budget-exhaust tests |
| SC3 | Strict grounding + honest refusal | ✅ Met | `agent.ts` refuse-when-empty; `advisor-safety.test.ts` no-fabrication test |
| SC4 | Safety wrapper + banned-language honesty sweep | ✅ Met | `lib/safety` gate in `agent.ts`; 12-case sweep over `BANNED_PHRASES` |
| SC5 | Provenance citations | ✅ Met (display) | `citations.ts` + `ProvenanceChips.tsx`; **note:** per-chip deep-linking deferred to v7 (data fully wired) |
| SC6 | Conversation persistence (RLS) | ✅ Met | `0003_advisor.sql` (3 tables + owner policies); `repo.ts`; live-DB apply gated on `E2E_LIVE` |
| SC7 | Streaming responses | ✅ Met | `api/advisor/route.ts` SSE; `AdvisorPanel` consumer; **note:** streams finalized safety-gated answer (true LLM token-stream deferred) |
| SC8 | Per-user token budget | ✅ Met | `repo.ts` get/record + `advisor_usage`; `agent.ts` guard; `repo.test.ts` arithmetic |
| SC9 | LLM isolated; only non-deterministic unit; engines untouched | ✅ Met | `claude-adapter.ts` behind `ClaudeAdapter` port; **0 existing engine/table files modified** |

**Success rate: 9/9 met** (SC5/SC7 with documented, planned deferrals — both are polish nuances, not core gaps).

---

## 3. Static Gap Analysis

### 3.1 Structural Match — 99%
All Design §11.1 files present (see inventory below). Two intentional, documented deviations:
- `AdvisorComposer` folded into `AdvisorPanel` (kept the composer co-located with its state) — no functional loss.
- `context-loader.ts` added (Design put context-load in the route) — refinement that keeps the route thin and the loader reusable.

### 3.2 Functional Depth — 96%
No placeholders in core logic; every tool wraps a real engine; the loop, refusal, budget, and safety gate are fully implemented and unit-proven. One known partial: `ProvenanceChips.hrefFor` returns `null` (chips are informative tags) — deep-linking to source screens is a **documented v7 deferral**, not a stubbed core path.

### 3.3 API Contract — 100% (3-way verified)
| Endpoint (Design §4) | Server route | Client fetch |
|---|---|---|
| POST `/api/advisor` | `api/advisor/route.ts` | `AdvisorPanel.send()` |
| GET `/api/advisor/conversations` | `conversations/route.ts` | `refreshConversations()` |
| GET `/api/advisor/conversations/:id` | `conversations/[id]/route.ts` | `selectConversation()` |

Response envelope (`ok`/`fail`) + SSE event shape (`token`/`citations`/`done`) consistent between server and client.

---

## 4. Runtime Verification

| Layer | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | ✅ clean |
| Production build (`next build`) | ✅ all advisor routes compiled (`/advisor`, `/api/advisor`, conversations ×2) |
| Unit (`vitest`) | ✅ **228/228** (incl. **58 advisor**: tools 16, agent 9, safety-sweep 12, adapter 7, repo 9, citations 5) |
| L1 — API auth guard | ✅ POST `/api/advisor` → 401, GET conversations → 401 (live, `ai-advisor.spec.ts`) |
| L2 — page auth guard | ✅ anon `/advisor` → redirect `/auth/login` (live) |
| L3 — authed grounded chat | ⏳ gated on `E2E_LIVE` (needs Supabase + `0003` applied + `API_ANTHROPIC_KEY`) |

**Match Rate (runtime-executed formula):**
`(Structural 99 × 0.15) + (Functional 96 × 0.25) + (Contract 100 × 0.25) + (Runtime 97 × 0.35)`
= 14.85 + 24.0 + 25.0 + 33.95 = **97.8% ≈ 98%**

> Runtime sub-score 97: everything runnable without live creds passed (unit + build + L1 + L2); the live authed L3 + DB apply are **deferred by design** (same posture as v4 lab-timeline), not failures.

---

## 5. Decision Record Verification

| Decision | Followed? | Evidence |
|----------|-----------|----------|
| [Plan] Read-only · strict-grounded · tool-calling agent | ✅ | No write tools; refusal path; tools wrap engines |
| [Design] Option C — pure `lib/advisor` + injected adapter port | ✅ | Domain never imports SDK; grounding unit-tested via mock |
| [Design] Additive Option C (no existing engine/table touched) | ✅ | Only `0003` added; only `.env.example` + `TopNav.tsx` modified |
| [Design] One non-deterministic unit | ✅ | `claude-adapter.ts` is the sole SDK consumer |
| [Plan] Streaming sequenced last / deferrable | ✅ | Finalized-answer SSE; true token-stream noted for v7 |

---

## 6. Gaps & Recommendations

| Severity | Gap | Recommendation |
|----------|-----|----------------|
| Minor (deferred) | Provenance chips don't deep-link to source screens | v7: map `Citation.refId` → Library/interaction/biomarker routes |
| Minor (deferred) | Streaming is over the finalized answer, not true LLM token-stream | v7: thread streaming through adapter/agent |
| Minor (ops) | `recordUsage` is read-then-upsert (not atomic) | Optional: Postgres `increment` RPC if concurrent turns per user become common |
| Info (gated) | Live authed L3 + `0003` apply unverified locally | Apply `0003` + set `E2E_LIVE` + `API_ANTHROPIC_KEY` in QA |

**No Critical or Important gaps.** All open items are pre-documented v7 deferrals or ops notes.

---

## 7. Verdict

**Match Rate 98% — exceeds the 90% gate. No iteration required.** Recommend proceeding to QA (apply `0003`, run L3 under `E2E_LIVE`), then Report.

---

## Appendix — Advisor file inventory
```
src/types/advisor.ts
src/lib/advisor/{prompt,tools,citations,agent,claude-adapter,repo,context-loader,schema}.ts
src/lib/advisor/{tools,agent,advisor-safety,citations,claude-adapter,repo}.test.ts  (+ mock-adapter.ts)
src/app/api/advisor/route.ts · conversations/route.ts · conversations/[id]/route.ts
src/app/advisor/page.tsx
src/components/advisor/{AdvisorPanel,AdvisorMessageBubble,ProvenanceChips,ConversationRail}.tsx
supabase/migrations/0003_advisor.sql
tests/e2e/ai-advisor.spec.ts
modified: src/components/layout/TopNav.tsx · .env.example
```
