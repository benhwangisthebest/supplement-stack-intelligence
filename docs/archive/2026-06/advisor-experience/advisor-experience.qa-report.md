---
template: qa-report
version: 1.0
feature: advisor-experience
date: 2026-06-30
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
milestone: v8
qaStatus: PASS
---

# advisor-experience QA Report (v8)

> **Outcome: QA_PASS.** Every runnable test passes; the authed batch/undo/streaming
> flows are environment-gated (`E2E_LIVE` + migration `0005` applied + live Supabase
> + `API_ANTHROPIC_KEY`) and are skipped — not failed — in this run, matching the v6/v7
> posture. No failures, no regressions.

## 1. Test Inventory (Design §8)

| Layer | Scope | Always-on? |
|-------|-------|:----------:|
| L0 Unit (Vitest) | agent progress-order, batch-cap, drop-ungrounded, `MAX_BATCH_PROPOSALS`, `citation-href` (8), `cumulativeRecheck`, full domain suite | ✅ |
| L1 API | auth guards on `/api/advisor` + `/api/advisor/actions` (batch shape) | ✅ |
| L1 API (authed) | batch confirm 201 + grouped undo reverses both; empty `actions` → 400 | gated `E2E_LIVE` |
| L2 UI | Library `#effect-{id}` anchor target; deep link **auto-opens** the Effects tab | ✅ |
| L2 UI (authed) | live progress label → streamed answer; multi-action card per-action toggle | gated `E2E_LIVE` |

## 2. Execution Results

### L0 — Unit (always-on)
```
Vitest: 23 files, 282/282 passed (268 baseline + 14 v8)
tsc --noEmit: clean   ·   next build: OK (/advisor 4.99 kB)
```

### L1 / L2 — E2E (`playwright test advisor-experience*.spec.ts`)
```
8 tests → 4 passed, 4 skipped (E2E_LIVE unset), 0 failed

✓ L1  POST /api/advisor                 → 401 (anon)
✓ L1  POST /api/advisor/actions (batch) → 401 (anon)
✓ L2  Library Effects tab renders #effect-magnesium-sleep
✓ L2  #effect-{id} deep link AUTO-opens the Effects tab (aria-selected=true)
-  L1  empty actions[] → 400                       (gated)
-  L1  2-action batch all-or-nothing + grouped undo (gated)
-  L2  live progress label → streamed tokens        (gated)
-  L2  multi-part request → toggleable batch card    (gated)
```

## 3. Gate Decision

- **0 failures, 0 regressions.** All executable tests green.
- The 4 skipped tests require a live backend (`0005` migration applied + `E2E_LIVE=1` + seeded demo user + `API_ANTHROPIC_KEY`) — an environment provisioning gap, not a code defect. Their logic is covered statically by the unit suite (batch collection, cumulative re-check, compensating rollback inverse-mapping) and by the always-on auth/deep-link L1/L2 checks.

**Verdict: QA_PASS** → advance to Report.

### To close the gated tests later
```bash
# apply supabase/migrations/0005_advisor_batch.sql in the Supabase SQL editor
E2E_LIVE=1 npm run test:e2e -- advisor-experience --workers=1
```
> Live specs run with `--workers=1` (per the lab-timeline live-E2E note: authed flows need serial execution).
