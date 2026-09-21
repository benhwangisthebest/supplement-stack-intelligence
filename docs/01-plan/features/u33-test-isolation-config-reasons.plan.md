# u33-test-isolation-config-reasons — PDCA cycle artifact for Phase 2 unit U33

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U33** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U33 entry and its **U33 PLAN** block are the authoritative record. This
> file carries **no approval status of its own**, and **mirrors the register rather than replacing it**
> (standing rule, 2026-09-18).
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U33 · N-67 + N-68 — test isolation, and config failures that can be told apart
> **Date**: 2026-09-21 · created 2026-09-18 by owner ruling on N-67 and N-68; opened after U30 landed
> **Status**: cycle artifact — the Phase 2 entry's **U33 PLAN block is AWAITING OWNER APPROVAL**.
> Nothing is implemented.
> **Method**: bkit PDCA (plan → design → do → check → report)

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | **N-67**: `vi.stubEnv` outlives the test that set it, so one test's environment silently reconfigures every test after it. **N-68**: one shared `AI_SERVICE_NOT_CONFIGURED` message across every configuration failure makes `rejects.toThrow("not configured")` structurally unable to say *why* it passed — so an early return added ahead of an existing check silently re-points every test behind it. Three findings, one mechanism. |
| **Solution** | (a) `unstubEnvs: true` globally, with a spec that reddens if it is removed. (b) A required machine-readable `reason` on `NotConfiguredError`, with the four conditions resolved in **one** module that returns a reason rather than throwing one. |
| **Function/UX Effect** | **None.** The 503 body stays byte-identical across all four AI reasons; the reason never crosses the API boundary (§2.3 rule 13). |
| **Core Value** | A test can say why it passed, and a guard stops depending on three files each remembering to clean up. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | N-67 and N-68, both raised during U32's review → U33 by owner ruling, 2026-09-18. |
| **WHO** | Every future test that stubs the environment; every future configuration condition. |
| **RISK** | Half (a)'s baseline red is **zero** — it repairs nothing today, so it must not be reported as a fix. Half (b) touches two pinned `SOLE_PAID_CLIENT` ratchets and is a **declared widening**: S → M. |
| **SUCCESS** | Deleting any one of the four conditions reddens the test naming **that** reason and no other; removing `unstubEnvs` reddens the isolation spec; the 503 body is unchanged. |
| **SCOPE** | `vitest.config.ts` · `src/lib/api/errors.ts` · one new resolver + its spec · one new isolation spec · three throw sites · `boundaries.test.ts` · `not-configured-totality.test.ts` · three config-guard test files. |

## 1–7. See the Phase 2 plan's U33 entry and U33 PLAN block (grep `U33 PLAN`). Everything here restates it and adds nothing.
