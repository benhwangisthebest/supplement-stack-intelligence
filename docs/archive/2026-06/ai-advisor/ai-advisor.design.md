---
template: design
version: 1.3
feature: ai-advisor
date: 2026-06-17
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v6
---

# ai-advisor Design Document

> **Summary**: A read-only, strictly tool-grounded AI Advisor. A dedicated `lib/advisor` module holds a **tool registry** (thin wrappers over the existing v1–v5 pure engines), a **bounded agent loop** (turn cap + token-budget guard + refuse-when-empty), and a **system prompt** encoding the strict-grounding/non-diagnostic contract. The single non-deterministic unit — the Claude call — is isolated behind `lib/advisor/claude-adapter` (Infrastructure), exactly like v4's extraction adapter. A thin `app/api/advisor` route handles auth, context load, streaming, and persistence into additive `advisor_conversations`/`advisor_messages` tables (RLS, migration `0003`). Every tool result and final answer pass through `lib/safety`; a banned-language sweep test proves the advisor can't fabricate. Architecture **Option C (Pragmatic)**.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v6 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-17
> **Status**: Draft
> **Planning Doc**: [ai-advisor.plan.md](../../01-plan/features/ai-advisor.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | A platform called "Advisor" has no advisor; cross-cutting questions force users to manually synthesize across separate screens. The engines already hold the answers — they just aren't conversationally reachable. |
| **WHO** | Evidence-literate health-nerd / biohacker / longevity users who want a fast, grounded synthesis of *their* context (profile + stack + labs), not generic chatbot prose. |
| **RISK** | LLM fabricating/softening a safety claim; ungrounded "general knowledge" leaking in; non-determinism contaminating the trust model; runaway token cost; conversation RLS leaking across users; tool handlers duplicating (and drifting from) engine business logic. |
| **SUCCESS** | A read-only advisor answers cross-cutting questions grounded *only* in engine output, with provenance, in non-diagnostic language; refuses honestly when data is absent; existing engines & tables untouched; only one isolated non-deterministic unit; a sweep test asserts no fabrication. |
| **SCOPE** | `lib/advisor` (tools + agent loop + prompt) · isolated `claude-adapter` · `app/api/advisor` (auth, stream, persist) · 6 grounded tools · `advisor_conversations`/`advisor_messages` (additive `0003`, RLS) · provenance citations · streaming UI · per-user token budget · safety wrapper + honesty sweep test. **No** write-actions, **no** ungrounded knowledge, **no** AI evidence drafting, **no** personalization (v7+). |

---

## 1. Overview

### 1.1 Design Goals
- Turn every v1–v5 engine into a **grounded tool** behind a natural-language interface, without modifying any existing engine or table.
- Keep the LLM an **orchestrator + narrator**: engines compute and own all truth; the model only selects tools and phrases results.
- Make the **"cannot fabricate" guarantee unit-testable** — grounding + refusal logic live in a pure layer, not buried in the network route.
- Isolate the only non-deterministic code (the Claude call) in a single Infrastructure adapter, mirroring v4.

### 1.2 Design Principles
- **Engines are the source of truth**: tool handlers add *no* business logic; they call existing pure engines and pass structured results through.
- **Strict grounding + honest refusal**: no claim without a tool result behind it; empty tool output yields an explicit "I don't have data on that".
- **Safety on every edge**: tool results and the final answer both pass through `lib/safety`; interaction findings keep clinician-escalation posture.
- **Additive, backward-compatible (Option C)**: new module + route + tables only; zero changes to v1–v5 schema/engines.
- **Bounded & metered**: a hard turn cap and per-run + per-user token budget make the loop terminate deterministically and cap spend.
- **Provenance-bearing**: every answer carries structured `citations[]` tracing to the rule/grade/paper/engine result.
- **Tenant isolation**: conversation tables RLS-guarded; a user reads only their own history.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Agent loop location** | inside API route + helper | domain core w/ ports + DI | dedicated `lib/advisor` module |
| **LLM isolation** | inline anthropic call in route | port + adapter + interfaces | single isolated `claude-adapter` |
| **Tool registry** | inline object in route | abstracted registry + interfaces | `lib/advisor/tools.ts` thin wrappers |
| **Persistence** | direct supabase in route | repository port + impl | existing supabase server client |
| **New Files** | ~4 | ~11 | ~7 |
| **Unit-testable grounding** | hard (route-coupled) | excellent | **good (pure agent + mock adapter)** |
| **Matches codebase pattern** | partial | over-structured | **yes (= v4 lab-timeline)** |
| **Complexity** | Low | High | Medium |
| **Risk** | Med (coupled) | Low | **Low** |
| **Recommendation** | quick spike | platform team | **Selected** |

**Selected**: Option C — **Rationale**: The codebase isolates each knowledge concern in a pure module and isolates its one non-deterministic dependency behind a thin adapter (v4's `lib/lab-import` extraction adapter). The advisor follows the same shape: a pure-ish `lib/advisor` (tools/agent/prompt) where the agent loop and grounding/refusal logic are unit-testable against a **mock adapter**, with the real `@anthropic-ai/sdk` call isolated in `claude-adapter`. Option A would bury the grounding guarantee inside the route (untestable without the network); Option B's port/DI layering is over-engineering for a single orchestration with one external dependency.

### 2.1 Component Diagram
```
                         app/advisor (page)  +  AdvisorPanel (streaming chat + provenance chips)
                                   │  POST /api/advisor  (SSE/stream)
                                   ▼
                    ┌──────────────────────────────┐
                    │ app/api/advisor/route.ts      │  auth-guard · load context · stream · persist
                    └──────────────┬───────────────┘
                                   │ runAdvisorTurn(ctx, messages)
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │ lib/advisor (PURE, except adapter call)                  │
        │  agent.ts   — bounded loop (turn cap, budget, refuse)    │
        │  tools.ts   — 6 tool defs: schema + thin handler         │
        │  prompt.ts  — strict-grounding/non-diagnostic system msg │
        │  citations.ts — build provenance from tool results       │
        └───────┬───────────────────────────────┬─────────────────┘
                │ tool handlers call             │ model turns via
                ▼                                ▼
   existing PURE engines:               lib/advisor/claude-adapter.ts  (INFRA — only non-deterministic unit)
   evidence · evidence-grading                 @anthropic-ai/sdk · streaming
   stack-evaluator · interactions
   biomarkers · lab-trends
                │  every result + final answer →  lib/safety
                ▼
   Supabase (server client):  advisor_conversations · advisor_messages  (RLS, additive 0003)
                              advisor_usage (per-user token budget)
```

### 2.2 Data Flow (one turn)
```
user message
  → api/advisor: requireUser() → 401 if anon
  → checkBudget(userId)  → 429-style honest block if exceeded
  → loadContext(userId): profile + active stack + recent lab panels  (read-only)
  → agent.runAdvisorTurn(ctx, history):
       loop (≤ MAX_TURNS):
         claudeAdapter.next(messages, TOOLS)         ← streams text deltas
         if tool_use: handler runs PURE engine → structured result
                      → safety.review(result) → append as tool_result
         else: break with final text
       if no tool produced grounding data → return REFUSAL ("I don't have data on that")
  → safety.review(finalAnswer)  +  citations.build(toolResults)
  → stream tokens to client; on completion persist conversation + messages (+ usage delta)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/advisor/agent` | `lib/advisor/{tools,prompt,citations}`, `claude-adapter` (injected) | Bounded orchestration loop |
| `lib/advisor/tools` | `lib/evidence`, `lib/evidence-grading`, `lib/stack-evaluator`, `lib/interactions`, `lib/biomarkers`, `lib/lab-trends`, `lib/safety` | Thin engine wrappers (no new logic) |
| `lib/advisor/claude-adapter` | `@anthropic-ai/sdk` | Isolate the only non-deterministic call; streaming |
| `app/api/advisor/route.ts` | `lib/advisor/agent`, `lib/auth`, `lib/supabase` (server), `lib/advisor/repo` | Auth, context, stream, persist |
| `AdvisorPanel` | `/api/advisor` (fetch stream) | Render streaming answer + provenance chips |

---

## 3. Data Model

### 3.1 Entity Definition
```typescript
// src/types/advisor.ts
export type AdvisorRole = "user" | "assistant";

export interface Citation {
  kind: "effect-grade" | "interaction-rule" | "biomarker-rule" | "lab-trend" | "paper" | "stack-eval";
  refId: string;          // effectId / ruleId / paperId / markerId — the engine's own identifier
  label: string;          // human-readable ("Creatine → strength, Grade A")
  detail?: string;        // optional one-line provenance note
}

export interface AdvisorMessage {
  id: string;
  conversationId: string;
  role: AdvisorRole;
  content: string;        // safety-reviewed text
  citations: Citation[];  // [] for user messages
  createdAt: string;
}

export interface AdvisorConversation {
  id: string;
  userId: string;
  title: string;          // derived from first user message (truncated)
  createdAt: string;
  updatedAt: string;
}

// Tool contract (pure)
export interface AdvisorTool<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: object;    // JSON schema for the model
  handler: (input: I, ctx: AdvisorContext) => Promise<ToolResult<O>>;
}

export interface ToolResult<O = unknown> {
  ok: boolean;            // false → grounding absent → drives refusal
  data: O | null;
  citations: Citation[];  // provenance for whatever was returned
}

export interface AdvisorContext {
  userId: string;
  profile: UserProfile | null;
  stack: StackWithItems | null;
  labPanels: LabPanel[];   // recent, read-only
}
```

### 3.2 The 6 grounded tools (thin wrappers — NO new business logic)

| Tool | Wraps | Returns (`data`) | `ok=false` when |
|------|-------|------------------|-----------------|
| `searchLibrary` | `lib/evidence` + `lib/evidence-grading` | matched supplements/effects with resolved grade + breakdown | no library match |
| `getSupplement` | `lib/evidence` | full supplement detail (effects, doses, grades, citations) | slug not found |
| `evaluateStack` | `lib/stack-evaluator` | evaluation flags for the user's active stack | no stack in context |
| `checkInteractions` | `lib/interactions` | meds × stack interaction findings (+ severity) | no meds or no stack |
| `biomarkerFindings` | `lib/biomarkers` | lab-relevance findings for stack vs labs | no labs or no stack |
| `labTrends` | `lib/lab-trends` | per-marker trajectory for the user's panels | insufficient panels |

> Read-only profile/stack/labs are **pre-loaded into `AdvisorContext`** (not exposed as tools) — they're needed by most turns and pre-loading avoids an extra round-trip. The 6 tools above are the model's *callable* surface.

### 3.3 Database Schema (additive — migration `0002`→`0003`)
```sql
-- supabase/migrations/0003_advisor.sql
create table advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references advisor_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- per-user token budget (rolling daily window)
create table advisor_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  primary key (user_id, usage_date)
);

create index on advisor_messages(conversation_id, created_at);
create index on advisor_conversations(user_id, updated_at desc);

-- RLS: a user sees only their own rows
alter table advisor_conversations enable row level security;
alter table advisor_messages       enable row level security;
alter table advisor_usage          enable row level security;

create policy adv_conv_owner on advisor_conversations
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy adv_msg_owner on advisor_messages
  using (exists (select 1 from advisor_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from advisor_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()));
create policy adv_usage_owner on advisor_usage
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/advisor` | Send a message; streams the grounded answer; persists turn | Required |
| GET | `/api/advisor/conversations` | List the user's conversations | Required |
| GET | `/api/advisor/conversations/:id` | Get one conversation's messages | Required |

### 4.2 Detailed Specification

#### `POST /api/advisor`
**Request**
```jsonc
{
  "conversationId": "uuid | null",   // null → create new conversation
  "message": "Is creatine safe with my meds, and do my labs support it?"
}
```
**Behavior**
1. `requireUser()` → `401` `{ error }` if unauthenticated.
2. `checkBudget(userId)` → if exceeded, `200` stream emits a single honest refusal event (or `429` `{ error: "daily_limit" }` before streaming starts).
3. Validate body with Zod → `400` `{ error, fieldErrors }` on failure.
4. Load `AdvisorContext`, run `agent.runAdvisorTurn`, **stream** assistant tokens (SSE/`text/event-stream` or chunked) with a terminal event carrying `citations[]`.
5. On completion: persist user + assistant messages, bump `advisor_usage`, update conversation `updated_at`/`title`.

**Stream events**
```
event: token      data: {"delta":"…"}
event: citations  data: {"citations":[ … ]}
event: done       data: {"conversationId":"uuid","messageId":"uuid"}
event: error      data: {"error":"…"}
```

**Grounding/refusal contract**: if every tool call in the turn returned `ok:false` (no grounding), the assistant message is the fixed refusal copy from `lib/safety` — never a model-improvised claim.

---

## 5. UI/UX Design

### 5.1 Placement
- New top-level-adjacent surface: `/advisor` (reachable from the existing nav/header). Does **not** add a 4th main pillar — it's an assistant *over* Library/Profile/Stack Lab, framed as such.
- `AdvisorPanel`: message list (user + assistant bubbles), streaming text, **provenance chips** under each assistant message (each chip → links to the Library effect / interaction row / biomarker source).
- Conversation list rail (from persistence) with "New conversation".

### 5.3 Component List

| Component | Responsibility |
|-----------|----------------|
| `AdvisorPanel` | Orchestrate chat: send message, consume stream, render bubbles |
| `AdvisorMessageBubble` | Render one message (markdown-safe) + citations |
| `ProvenanceChips` | Render `Citation[]` as clickable chips → deep links |
| `AdvisorComposer` | Input box, send, disabled/skeleton while streaming, budget-exceeded state |
| `ConversationRail` | List/select/create conversations |

### 5.4 Page UI Checklist
- [ ] Streaming answer renders token-by-token; composer disabled mid-stream.
- [ ] Each assistant message shows provenance chips; chips deep-link to the source screen.
- [ ] Honest refusal renders distinctly ("I don't have data on that") with no fabricated content.
- [ ] Safety/clinician-escalation banner surfaces when an interaction finding is critical.
- [ ] Medical disclaimer present in the advisor surface.
- [ ] Budget-exceeded state is explained, not a silent failure.
- [ ] Anonymous users are prompted to sign in (no advisor without auth).

---

## 6. Error Handling

| Condition | Handling |
|-----------|----------|
| Unauthenticated | `401`; UI prompts sign-in |
| Invalid body | `400` with Zod `fieldErrors` |
| Budget exceeded | Honest refusal event / `429 daily_limit`; composer shows reset time |
| Adapter/LLM error or timeout | `error` stream event; partial tokens preserved; turn not persisted as success |
| Turn cap reached without final answer | Return best grounded summary + note; never loop unbounded |
| All tools `ok:false` | Fixed safety refusal copy (no model claims) |
| Tool handler throws | Caught → `ToolResult{ok:false}`; logged with request id; loop continues honestly |

---

## 7. Security Considerations
- **RLS on all three tables**; server route uses the user-scoped Supabase client — no cross-user reads.
- **Read-only**: the advisor has no write tools; it cannot mutate stacks/profile/labs.
- **Prompt-injection containment**: tool results are structured engine output (not free web text); the system prompt forbids treating user/content text as instructions; safety review runs on output regardless.
- **Token budget** caps per-user daily spend; server enforces, client only displays.
- **No secret leakage**: `ANTHROPIC_API_KEY` stays server-side in `claude-adapter`; never shipped to client.
- **Non-diagnostic guarantee**: `lib/safety` review + banned-language sweep gate every assistant message.

---

## 8. Test Plan

### 8.1 Scope
Pure agent loop + tools + grounding/refusal + safety are unit-tested against a **mock adapter** (deterministic, no network). API auth-guards verified at L1; UI streaming + provenance at L2.

### 8.2 Unit Test Scenarios (Vitest)
1. **Grounded answer**: mock adapter requests `checkInteractions`; handler returns real `lib/interactions` output → final message cites the interaction rule.
2. **Refusal-when-empty**: all tool calls return `ok:false` → assistant message equals the fixed safety refusal; **no** other content.
3. **Turn cap**: adapter keeps requesting tools → loop terminates at `MAX_TURNS` with a grounded summary, never infinite.
4. **Budget guard**: usage over cap → `runAdvisorTurn` short-circuits to budget refusal before any adapter call.
5. **Citations build**: tool results map to correct `Citation.kind`/`refId`; user messages carry `[]`.
6. **Honesty sweep test** (v2/v5 pattern): run a battery of prompts through the loop with a mock adapter that *tries* to emit banned diagnostic phrases ("you have a deficiency", "this will treat…", "stop your medication") → assert `lib/safety` strips/blocks them; assert assistant never asserts a claim absent from `toolResults`.
7. **Tool purity**: each handler's output equals calling the underlying engine directly (no added logic/drift).

### 8.3 L2 Scenarios (Playwright)
1. Authed user sends a question → tokens stream in → provenance chips appear → chip deep-links to Library.
2. Anonymous user → advisor prompts sign-in; `POST /api/advisor` returns `401`.

### 8.5 Seed Data Requirements
Reuse the existing seed user + seeded supplements/meds/labs (from v1–v4 seed). Add a deterministic fixture conversation for L2. No new seed engines.

---

## 9. Clean Architecture

### 9.4 Layer Assignment

| Layer | Modules |
|-------|---------|
| **Domain (pure)** | `lib/advisor/agent`, `lib/advisor/tools`, `lib/advisor/prompt`, `lib/advisor/citations`; all existing engines |
| **Application** | `app/api/advisor/route.ts` (auth, context load, stream orchestration, persistence) |
| **Infrastructure** | `lib/advisor/claude-adapter` (`@anthropic-ai/sdk`), `lib/advisor/repo` (Supabase), migration `0003` |
| **Presentation** | `app/advisor/page.tsx`, `AdvisorPanel` + sub-components |

> The agent loop depends on an injected `ClaudeAdapter` *interface*, so the Domain layer never imports the SDK directly — the one inward-dependency rule that makes grounding unit-testable.

---

## 10. Coding Convention Reference
- Pure modules import only `@/types` + sibling engines; no I/O in `lib/advisor` except via the injected adapter/repo.
- All advisory copy flows through `lib/safety` (non-diagnostic, evidence-first) — no exceptions.
- Zod for the request body; server-side validation only trusts server-recomputed context (clients can't inject context).
- `// Design Ref: §N` comments on the loop, the refusal path, and each tool handler.

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/
  types/advisor.ts                         (new)
  lib/advisor/
    tools.ts        (new)  6 tool defs + handlers
    agent.ts        (new)  bounded loop, refusal, budget short-circuit
    prompt.ts       (new)  system prompt / grounding contract
    citations.ts    (new)  ToolResult[] → Citation[]
    claude-adapter.ts (new) INFRA: @anthropic-ai/sdk streaming (interface + impl)
    repo.ts         (new)  Supabase persistence + usage
  app/api/advisor/
    route.ts                 (new)  POST stream
    conversations/route.ts   (new)  GET list
    conversations/[id]/route.ts (new) GET messages
  app/advisor/page.tsx       (new)
  components/advisor/
    AdvisorPanel.tsx, AdvisorMessageBubble.tsx, ProvenanceChips.tsx,
    AdvisorComposer.tsx, ConversationRail.tsx   (new)
supabase/migrations/0003_advisor.sql           (new)
tests/unit/advisor/*.test.ts                    (new)
tests/e2e/ai-advisor.spec.ts                    (new)
```

### 11.2 Implementation Order
1. Types + tool registry + pure handlers (engine wrappers).
2. Agent loop (turn cap, refusal, budget short-circuit) against a **mock adapter** + unit tests incl. honesty sweep.
3. `claude-adapter` (real SDK, streaming) behind the interface.
4. Migration `0003` + `repo` (persistence, usage, RLS verified).
5. API route (auth, context, stream, persist).
6. UI (`AdvisorPanel` + provenance chips + conversation rail).
7. Streaming polish (token-by-token) — **last; most deferrable**.

### 11.3 Session Guide

**Module Map**

| Module | Scope key | Files | Depends on |
|--------|-----------|-------|-----------|
| Pure core | `module-1` | `types/advisor.ts`, `lib/advisor/{tools,agent,prompt,citations}.ts`, unit tests (incl. honesty sweep) | existing engines, `lib/safety` |
| Infra | `module-2` | `lib/advisor/{claude-adapter,repo}.ts`, `supabase/migrations/0003_advisor.sql` | module-1, `@anthropic-ai/sdk`, supabase |
| API + UI | `module-3` | `app/api/advisor/**`, `app/advisor/page.tsx`, `components/advisor/**`, E2E | module-1, module-2 |

**Recommended Session Plan**
- **Session 1 — `--scope module-1`**: pure core + the full unit/honesty test suite (the "cannot fabricate" guarantee proven against a mock adapter, no network/DB needed).
- **Session 2 — `--scope module-2`**: real Claude adapter + persistence + migration `0003` + RLS check.
- **Session 3 — `--scope module-3`**: API route + streaming UI + provenance chips + L1/L2 E2E. (Streaming polish sequenced last.)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-17 | benhwang121@gmail.com | Initial design — Option C (Pragmatic); read-only strict-grounded tool-calling advisor; 3-module session plan |
