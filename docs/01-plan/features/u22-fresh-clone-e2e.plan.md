# u22-fresh-clone-e2e — PDCA cycle artifact for Phase 2 unit U22 (re-scoped)

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U22** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U22 entry is the authoritative record. This file carries **no approval
> status of its own**. If the two disagree, the Phase 2 entry wins.
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U22 (re-scoped by decision 8(b), 2026-09-14) · FU-26 — a fresh clone can run the E2E suite
> **Date**: 2026-09-15
> **Status**: cycle artifact — subordinate to the approved Phase 2 plan (no status of its own)
> **Method**: bkit PDCA (plan → design → do → check → report), driven from the Phase 2 entry

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | FU-26: a fresh clone cannot run the E2E suite. The pinned Playwright browser is not installed, and `npm run test:e2e` fails as dozens of specs at once, which reads like an application regression rather than a missing binary. The install command exists in exactly one place — `.github/workflows/ci.yml` — so the only way to learn it is to read the CI workflow. |
| **Solution** | A `test:e2e:install` script that installs the pinned browser, a README line beside the existing `test:e2e` row, and a guard asserting the script and CI install the **same browser**, so the documented path and the enforced path cannot drift. |
| **Function/UX Effect** | None. No application code, no response byte, no runtime behaviour. Developer-facing only. |
| **Core Value** | The suite CI runs on every push becomes runnable by the person who has to fix it when it goes red. A documented step that nothing checks would rot (§3.5); the guard is what makes this a unit rather than a README edit. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | FU-26, open since Phase 1 U17. U22's other two thirds are gone: U14 delivered the non-live CI E2E job, and FU-25 became a register row under decision 8(b). |
| **WHO** | Anyone cloning the repository — including CI on a cold cache, and the next agent session. |
| **RISK** | `--with-deps` is right for CI and wrong for a developer machine; getting that backwards makes the documented command fail where it is most needed. |
| **SUCCESS** | A clone with an empty browser cache runs the non-live suite after one documented command; the guard reddens when the script and CI disagree. |
| **SCOPE** | `package.json`, `README.md`, one new architecture spec. No application code, no `ci.yml` change. |

## 1–7. See the Phase 2 plan's U22 entry (grep `U22 PLAN`). Everything here restates it and adds nothing.
