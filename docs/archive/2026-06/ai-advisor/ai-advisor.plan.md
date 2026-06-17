---
template: plan-plus
version: 1.0
feature: ai-advisor
date: 2026-06-17
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v6
---

# ai-advisor Planning Document

> **Summary**: A **read-only, strictly tool-grounded AI Advisor** — a natural-language interface that turns every engine built in v1–v5 into a grounded tool. Claude orchestrates tools that wrap the existing pure engines (`evidence`/`evidence-grading`, `stack-evaluator`, `interactions`, `biomarkers`, `lab-trends`), the **engines remain the only source of truth**, and every answer flows through `lib/safety`. The LLM never writes data and never makes a claim the engines didn't produce. Adds provenance citations, conversation persistence, streaming, and a per-user token budget — all additive (Architecture Option C), with the LLM isolated in Infrastructure exactly as in v4.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v6 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-17
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | The product is named the *Supplement **Advisor***, yet there is no advisor — every engine (library, evidence grades, interactions, biomarkers, lab trends) is reachable only through structured UI, one screen at a time. A user with a real, cross-cutting question ("is creatine safe with my meds, and do my labs support it?") has to manually visit three screens and synthesize the answer themselves. |
| **Solution** | A **read-only, strictly tool-grounded AI Advisor**. Claude runs a tool-calling loop where each tool is a thin wrapper over an existing pure engine; the engines compute, the LLM only *chooses tools and narrates*. Every claim carries provenance (the rule / grade / paper it came from), every answer passes through `lib/safety`, and when the tools return nothing the advisor honestly says so — it cannot fabricate. |
| **Function/UX Effect** | A global `/advisor` chat surface with streaming answers and provenance chips. Users ask cross-cutting questions in plain language and get a synthesized, evidence-first answer grounded in *their own* profile, stack, and labs — with citations back to the exact engine output. Conversations persist (RLS-guarded); spend is capped per user. |
| **Core Value** | The synthesis release: it makes five milestones of deterministic intelligence *navigable in one sentence* without surrendering the deterministic-trust posture. The only new non-deterministic code is one isolated adapter, and a banned-language sweep test proves the advisor can't invent claims. Trust over fluency, exactly like every prior version. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | A platform called "Advisor" has no advisor; cross-cutting questions force users to manually synthesize across separate screens. The engines already hold the answers — they just aren't conversationally reachable. |
| **WHO** | The established health-nerd / biohacker / longevity audience — evidence-literate users who want a fast, grounded synthesis of *their* context, not generic chatbot prose. |
| **RISK** | The LLM fabricating or softening a safety claim; ungrounded "general knowledge" leaking in; non-determinism contaminating the trust model; runaway token cost; persistence/RLS leaking one user's chat to another; tool handlers duplicating (and drifting from) engine business logic. |
| **SUCCESS** | A read-only advisor answers cross-cutting questions grounded *only* in engine output, with provenance, in non-diagnostic language; it refuses honestly when data is absent; existing engines & tables are untouched; the only non-deterministic unit is an isolated adapter; a sweep test asserts no fabrication. |
| **SCOPE** | `lib/advisor` (tool registry + agent loop + prompt) · isolated `claude-adapter` · `app/api/advisor` (auth, stream, persist) · 6 grounded tools · `advisor_conversations`/`advisor_messages` (additive `0003`, RLS) · provenance citations · streaming UI · per-user token budget · safety wrapper + honesty sweep test. **No** write-actions / agent, **no** ungrounded general knowledge, **no** AI evidence drafting, **no** personalization (all v7+). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
Every intelligence layer the platform has built — v2 medication interactions, v3 biomarker relevance, v4 lab trends, v5 multi-dimensional evidence grades — is surfaced through a dedicated, structured screen. There is no way to ask a single natural-language question that *spans* those engines. The product's own name promises an advisor; v6 delivers it, but on the platform's terms: the LLM is an **orchestrator and narrator over deterministic engines**, never an independent source of medical claims.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Evidence-literate biohacker | Has a stack, meds, and labs already entered | Ask one cross-cutting question, get a grounded synthesis with citations |
| Cautious / longevity user | Worried about safety interactions | "Is anything in my stack risky with my meds?" answered honestly, escalation-aware |
| Time-pressed power user | Knows the screens exist but wants speed | A conversational shortcut into engines they'd otherwise click through |

### 1.3 Success Criteria
1. A `lib/advisor` module exposes a **6-tool registry**, each tool a thin wrapper over an existing engine (`searchLibrary`/`getSupplement`, `evaluateStack`, `checkInteractions`, `biomarkerFindings`, `labTrends`, `getProfile`/`getStack` context).
2. The agent loop is **bounded**: a hard turn cap and a per-run token-budget guard; it terminates deterministically.
3. **Strict grounding**: the advisor answers only from tool output. When tools return empty/unknown, it returns an honest "I don't have data on that" — no fabricated or general medical claims.
4. **Safety**: every tool result and the final answer pass through `lib/safety`; a banned-language **honesty sweep test** asserts non-diagnostic, non-fabricating output (v2/v5 pattern).
5. **Provenance**: each answer surfaces which rule / grade / paper / engine result it derived from (provenance chips in UI).
6. **Persistence**: `advisor_conversations` + `advisor_messages` (additive migration `0003`, **RLS on every table**) store history; a user can only read their own.
7. **Streaming**: answers stream token-by-token to the `/advisor` UI.
8. **Token budget**: a per-user usage counter is checked before each run and blocks honestly when exceeded.
9. **The LLM is the only non-deterministic unit**, isolated in `lib/advisor/claude-adapter` (Infrastructure); no existing engine or table is modified.

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Read-only | The advisor never writes stacks/profile/labs; engines stay the only writers via existing UI | High |
| Strict grounding | No claim without a tool result behind it; refusal-when-empty is mandatory | High |
| Determinism boundary | All business logic stays in the existing pure engines; tool handlers add **no** new rules | High |
| Non-diagnostic safety | All output routes through `lib/safety`; interaction findings keep clinician-escalation posture | High |
| Tenant isolation | Conversation tables RLS-guarded; no cross-user leakage | High |
| Cost control | Bounded loop + per-user budget; the LLM call is metered | Medium |
| Additive only (Option C) | New module, new route, new tables — zero changes to v1–v5 schema/engines | Medium |

---

## 2. Alternatives Explored

### 2.1 Direction (chosen: **AI Advisor layer**)
Considered for the v6 theme: (A) AI Advisor layer, (B) personalization / context-adjusted grades, (C) AI-assisted evidence drafting, (D) deepen safety (condition/pregnancy + external sources). **Chosen: A** — it is the natural synthesis release, leverages every v1–v5 engine, and fills the conspicuous "Advisor" gap. B/C/D remain strong v7+ candidates.

### 2.2 Capability (chosen: **Read-only advisor**)
Read-only vs. suggest-then-confirm vs. full agent. **Chosen: read-only** — lowest risk, fastest to trust-verify, keeps the engines as the only writers. Suggest-then-confirm is the obvious v7 extension once the read path is proven.

### 2.3 Grounding (chosen: **Strict tool-grounded**)
Strict tool-grounded vs. grounded + labeled general knowledge. **Chosen: strict** — matches the evidence-first, non-diagnostic posture; no unverified claims enter the system.

### 2.4 Architecture (chosen: **A — Tool-calling agent**)

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **A. Tool-calling agent** | True synthesis; every engine becomes a grounded tool; handles open-ended chained questions; engines stay source of truth | Multi-turn loop adds latency/cost; needs turn+budget cap and careful safety handling | **Chosen** |
| B. Deterministic context bundle (RAG-lite) | Simplest/cheapest; fully deterministic context selection; one call | Only answers what was pre-fetched; weak on arbitrary lookups; "summarize," not "advise" | Rejected |
| C. Intent-router + templates | Most controllable/auditable; cheapest | Rigid; barely conversational; a NL front-end to existing screens | Rejected |

---

## 3. YAGNI Review

### 3.1 Included in v6 (first version)
- **Core**: chat + tool-calling loop with turn cap + budget guard *(mandatory — defines the feature)*
- **Core**: `lib/safety` wrapper on all output + banned-language honesty sweep test *(mandatory)*
- **Tools (all 6)**: Library + evidence/grades · Stack evaluation · Interactions (meds × stack) · Biomarkers + lab trends · (+ read-only profile/stack context loaders)
- **Provenance citations** — which rule/grade/paper/engine result each answer came from
- **Conversation persistence** — `advisor_conversations` + `advisor_messages`, RLS (migration `0003`)
- **Streaming responses** — token-by-token UI *(sequenced last; most deferrable under scope pressure)*
- **Per-user token budget** — simple usage cap checked per run

### 3.2 Deferred / Out of Scope (v7+)
- **Write-actions / suggest-then-confirm / full agent** — advisor stays read-only in v6
- **Ungrounded general supplement knowledge** — strict grounding only
- **AI-assisted evidence drafting** (v5 deferred item) — separate feature
- **Personalization / context-adjusted grades** (v5 deferred item) — separate feature
- **Condition/pregnancy interaction rules, external interaction API** (v2 deferred items)
- **LOINC coding, caution-relation trajectory flags** (v3/v4 deferred items)
- **Multi-modal input** (image of a label, voice) — not needed for v6

> **YAGNI principle applied**: tool handlers add **no** new business logic — they call existing pure engines and pass structured results through. No abstraction is introduced for hypothetical future tools beyond the registry pattern itself.

---

## 4. Design Direction (validated incrementally)

### 4.1 Architecture overview (Option C — additive)
```
Presentation:   /advisor page  +  AdvisorPanel (streaming chat, provenance chips)
                        │  POST (stream)
Application:     app/api/advisor  ── auth-guard ──┐
Domain:          lib/advisor (NEW, mostly pure)    │
                  • tool registry (schema + thin handler → existing engine)
                  • system prompt + strict-grounding/non-diagnostic contract
                  • agent-loop controller (turn cap, budget, refuse-when-empty)
                  • all output → lib/safety
                        │ calls
                  existing pure engines: evidence · evidence-grading ·
                  stack-evaluator · interactions · biomarkers · lab-trends
Infrastructure:  lib/advisor/claude-adapter (NEW — ONLY non-deterministic unit; streaming)
                  Supabase: advisor_conversations + advisor_messages (NEW, RLS, additive 0003)
                  per-user token-usage counter
```

### 4.2 Key components

| Component | New? | Responsibility |
|-----------|------|----------------|
| `lib/advisor/tools.ts` | new | 6 tool defs (schema + handler) wrapping existing engines — **no new business logic** |
| `lib/advisor/agent.ts` | new | tool-loop controller: turn cap, budget guard, refuse-when-empty path |
| `lib/advisor/prompt.ts` | new | system prompt encoding strict-grounding + non-diagnostic contract |
| `lib/advisor/claude-adapter.ts` | new | isolates `@anthropic-ai/sdk` (dep since v4); streaming |
| `lib/safety` | reuse | wraps every tool result + final answer |
| `app/api/advisor/route.ts` | new | auth, context load, run loop, stream, persist |
| `advisor_conversations` / `advisor_messages` | new | RLS-guarded history (additive migration `0003`) |
| `AdvisorPanel` + `/advisor` | new | streaming chat UI + provenance chips |
| honesty sweep test | new | banned-language + no-fabrication assertion (v2/v5 pattern) |

### 4.3 Data flow (one turn)
```
user asks → api/advisor (auth) → load profile/stack/labs context
   → agent loop:  Claude → [picks tool] → handler runs PURE engine → structured result
                  (→ lib/safety) → back to Claude → … (≤ N turns / budget)
   → final answer composed → lib/safety pass → provenance attached
   → stream tokens to UI  +  persist conversation+messages (RLS)
   → if tools return nothing → honest "I don't have data on that" (no free claims)
```

---

## 5. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Direction | AI Advisor layer (over personalization / AI drafting / safety) | Synthesis release; fills the "Advisor" gap; leverages all v1–v5 engines |
| Capability | Read-only | Lowest risk; engines remain only writers; trust-verifiable; suggest-then-confirm is v7 |
| Grounding | Strict tool-grounded | Matches evidence-first, non-diagnostic posture; no unverified claims |
| Architecture | A — Tool-calling agent | Only approach that's a real advisor while keeping determinism; reuses v4 LLM-isolation |
| Tool scope | All 6 engines exposed as tools | Full cross-cutting synthesis is the point of the release |
| Extras | Provenance + persistence + streaming + token budget all in | User selected full scope; streaming sequenced last as most deferrable |
| Design | Architecture / components / data flow all approved | Additive Option C; one isolated non-deterministic adapter; sweep test guards honesty |

---

## 6. Open Questions for Design Phase
1. Turn cap & token-budget concrete numbers (e.g. ≤ 5 tool turns; per-run + per-user/day caps).
2. Provenance data shape — structured `citations[]` returned alongside the answer vs. inline markers.
3. Whether the read-only context loaders (`getProfile`/`getStack`) are true tools or pre-loaded context (leaning pre-loaded for latency, tools for large stacks).
4. Streaming + persistence ordering (persist on completion vs. incremental) under the Next.js streaming route.
5. Exact banned-language list extension for advisor prose (reuse v2/v5 list as baseline).

---

> **Next step**: `/pdca design ai-advisor`
> **Disclaimer**: Educational and decision-support only. Not medical advice; does not diagnose, treat, or cure.
