# Supplement Stack Intelligence Platform

Evidence-based supplement education, stack building, and product matching for health nerds, biohackers, athletes, and longevity-focused users. The goal isn't to make supplements *simple* — it's to make complex supplement science *navigable*.

## Three pillars

- **Library** — searchable, effect-level evidence-graded supplement knowledge base (seed-backed).
- **Profile** — a living health-context file (goals, diet, allergies, medications, preferences, lab markers).
- **Stack Lab** — build stacks, run evidence-aware **evaluation**, **compare** vs goals, generate a rule-based **Protocol**, and **match** real products by fit.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth, RLS on every table)
- Pure-function domain engines in `src/lib` (`evidence`, `stack-evaluator`, `protocol-builder`, `product-matcher`, `safety`, `compare`) — deterministic, DB-agnostic, unit-tested
- Vitest (unit) + Playwright (L1 API / L3 E2E)

## Architecture principles

- Business logic lives in pure `lib/` modules; UI and DB depend inward (Clean Architecture).
- All advisory copy flows through `lib/safety` — non-diagnostic, evidence-first language.
- Trust over monetization: product ranking is provably independent of affiliate links.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
# apply supabase/migrations/0001_init.sql in the Supabase SQL editor
npm run db:seed              # optional: demo user + sample data
npm run dev                  # http://localhost:3000
```

### Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright (set `E2E_LIVE=1` for authed flows) |
| `npm run db:seed` | Seed demo data (needs Supabase env) |

## Project status

MVP + two extensions complete and runtime-verified:

| Feature | Status |
|---------|--------|
| Core loop (Library / Profile / Stack Lab / evaluate / compare) | ✅ |
| Protocol Builder | ✅ |
| Product Match | ✅ |

Built with the bkit PDCA workflow; per-feature Plan/Design/Analysis/Report docs live under `docs/archive/`.

> **Disclaimer:** Educational and decision-support only. Not medical advice; does not diagnose, treat, or cure.
