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

### Enforced module boundaries

These are not conventions — they run on `npm test` via [`src/architecture/boundaries.test.ts`](src/architecture/boundaries.test.ts) (28 tests) and [`src/architecture/error-disclosure.test.ts`](src/architecture/error-disclosure.test.ts) (29 tests), and are specified in [`docs/02-design/architecture-boundaries.md`](docs/02-design/architecture-boundaries.md):

- `src/types/` is a **dependency-free Domain leaf** — it imports no packages and nothing outside `src/types/`.
- `src/types/index.ts` is a **pure barrel**; it declares nothing, and no sibling may import it (shared primitives live in `src/types/primitives.ts`).
- `src/components/` and `src/lib/` **never import from `src/app/`** — reusable server actions belong in `src/lib/`.
- `src/data/` is a leaf over `src/types/`, `src/services/` is governed, and every top-level `src/*`
  directory must be either scanned or explicitly exempted with a written reason.
- **No API route returns a caught exception's text** — internal errors go to the server log under a
  correlation ID and the client receives a fixed generic message.

The inventory both guards scan comes from `git ls-files`, so the verdict is a property of the repository
rather than of one machine's working tree.

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
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run test:e2e` | Playwright (set `E2E_LIVE=1` for authed flows) |
| `npm run db:seed` | Seed demo data (needs Supabase env) |

## Licence

**Source-visible, not open source.** Copyright (c) 2026 Ben Hwang, all rights reserved — see
[LICENSE](LICENSE). You may read this code; you may not use, copy, modify, or redistribute it without
written permission.

## Project status

**Current maturity: post-MVP, in transition to functional beta.**

The three pillars plus thirteen further milestones (v2–v13) are implemented — including the AI advisor,
medication/food interactions, biomarkers, lab timeline, daily check-ins, the side-effect engine, and the
identity layer. Re-verified 2026-08-03 at Phase 0 close: `npm run typecheck` clean, **524/524** unit
tests passing across 42 files, production build succeeding, and RLS enabled with a matching policy on
every table. These figures are a dated snapshot — CI re-measures them on every push, and that run is the
authoritative result for a given commit.

Production-readiness gaps remain, and they are tracked rather than unknown:

- **Evidence grounding** — 19 of 27 effect grades are hand-authored rather than derived from verified literature.
- **Observability** — partial. Unexpected API exceptions are logged server-side with a correlation ID
  that is returned to the client, but there is no logging elsewhere, no error-reporting service, and no
  UI surface for a user to quote the correlation ID.
- **Release enforcement** — CI runs on every push to `main` and every PR into it (typecheck, unit tests,
  production build) and is green; `main` is current with all feature work. Not yet enforced: CI is not a
  *required* status and `main` has no branch protection.
- **Selected trust boundaries** — the advisor write path and the DB mapper layer lack unit coverage.

Do not treat this as production-ready. See [`docs/project-status.md`](docs/project-status.md) for the
per-subsystem classification, [`docs/roadmap.md`](docs/roadmap.md) for the phased plan, and
[`CLAUDE.md`](CLAUDE.md) for the operating rules.

Built with the bkit PDCA workflow; per-feature Plan/Design/Analysis/Report docs live under `docs/archive/`.

> **Disclaimer:** Educational and decision-support only. Not medical advice; does not diagnose, treat, or cure.
