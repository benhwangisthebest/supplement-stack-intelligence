---
template: qa-report
version: 1.0
feature: ai-advisor
date: 2026-06-17
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v6
qaStatus: PASS
---

# ai-advisor QA Report

> **QA Type**: L0 unit + L1 API auth + L2 page auth executed; L3 authed-flow + live SDK/DB gated on `E2E_LIVE`
> **Design Test Plan**: [ai-advisor.design.md §8](../02-design/features/ai-advisor.design.md)
> **Analysis**: [ai-advisor.analysis.md](../03-analysis/ai-advisor.analysis.md) — Match Rate 98%
> **Result**: **QA_PASS**

---

## 1. Test Plan (refined from Design §8)

| Layer | Scope | Runnable without live creds? |
|-------|-------|------------------------------|
| L0 — Unit | Pure agent loop, tools, citations, adapter mapping, repo arithmetic, **honesty sweep** | ✅ yes |
| L1 — API | Auth guards (401), Zod 400 (authed-only), response envelope | ✅ auth guards; ⏳ 400 needs auth |
| L2 — UI auth | `/advisor` redirects anonymous → login | ✅ yes |
| L3 — E2E | Authed: send → streamed grounded answer + provenance chips + rail update | ⏳ `E2E_LIVE` |
| L4/L5 | Perf / security | N/A (Dynamic level — optional, not run) |

---

## 2. Execution Results

### L0 — Unit (vitest) — ✅ PASS
- **228/228 passed** (full suite), incl. **58 advisor**:
  - `tools.test.ts` 16 — registry = exactly 6, purity vs direct engine calls, empty-path (`ok:false`) for each tool
  - `agent.test.ts` 9 — grounded answer, refuse-no-data, turn cap, budget short-circuit, usage accumulation, unknown-tool robustness, tool-result threading
  - `advisor-safety.test.ts` 12 — **honesty sweep**: every `BANNED_PHRASE` stripped from output; no fabrication without grounding; clean grounded answer passes through; refusal copy non-diagnostic
  - `claude-adapter.test.ts` 7 — pure mapping (tools/parse/tool-result), stateful tool-use threading, config guard
  - `repo.test.ts` 9 — `deriveTitle`, budget get/record arithmetic (no negative, accumulate)
  - `citations.test.ts` 5 — dedup, order, grounding check

### L1 — API auth (Playwright) — ✅ PASS
- `POST /api/advisor` (anon) → **401** `UNAUTHORIZED` ✅
- `GET /api/advisor/conversations` (anon) → **401** ✅
- Zod 400 path: validation runs *after* auth, so it is reachable only by an authenticated user → verified under L3/`E2E_LIVE`.

### L2 — Page auth (Playwright) — ✅ PASS
- Anonymous `/advisor` → redirect to `/auth/login` ✅

### L3 — Authed grounded chat — ⏳ GATED (`E2E_LIVE`)
- Spec present (`tests/e2e/ai-advisor.spec.ts`): login → ask "What is the evidence for creatine?" → assert streamed answer + `Sources` chips + conversation appears in rail.
- Requires: configured Supabase + **migration `0003` applied** + `API_ANTHROPIC_KEY`. Same gating posture as v4 lab-timeline.

---

## 3. Safety / Trust Verification (the load-bearing guarantee)

| Check | Result |
|-------|--------|
| Advisor cannot emit banned/diagnostic language | ✅ 12/12 sweep cases stripped |
| Advisor cannot fabricate without tool grounding | ✅ no-grounding → fixed refusal, never the model's claim |
| Read-only (no write tools exposed) | ✅ registry = 6 read tools |
| Tenant isolation (RLS) | ✅ `0003` owner policies (DB-enforced; live apply in QA env) |
| LLM isolated as only non-deterministic unit | ✅ adapter behind `ClaudeAdapter` port |

---

## 4. Verdict

**QA_PASS.** All runnable layers (L0 + L1 auth + L2) pass with zero failures; the safety/honesty guarantees are proven in unit tests independent of network/DB. L3 and the live SDK/DB apply are environment-gated (`E2E_LIVE`), consistent with the v4 milestone's accepted posture. No defects found. Proceed to Report.

### Carry to QA environment
1. Apply `supabase/migrations/0003_advisor.sql`.
2. Set `API_ANTHROPIC_KEY` (+ optional `ADVISOR_DAILY_TOKEN_BUDGET`).
3. Run `E2E_LIVE=1 npx playwright test tests/e2e/ai-advisor.spec.ts --workers=1`.
