# Original MVP Instructions — Historical Reference

> ## ⚠️ STATUS: HISTORICAL REFERENCE ONLY
>
> - **This document is NOT active project scope.**
> - **This document MUST NOT override current instructions.**
> - It records the MVP-era constraints removed from the active `CLAUDE.md` during the
>   2026-07-30 MVP-transition review.
> - If anything here conflicts with `CLAUDE.md`, `docs/product-direction.md`, or `docs/roadmap.md`,
>   **the current documents win** — see the source-of-truth order in `CLAUDE.md`.
> - Nothing has been deleted. The full original ~1,190-line brief remains in git history at
>   `.claude/CLAUDE.md` (commit `30f74e1`, "chore: move project brief to .claude/CLAUDE.md")
>   and the per-feature record survives under `docs/archive/2026-06/` and `docs/archive/2026-07/`.

---

## Why this file exists

The original project brief (`.claude/CLAUDE.md`, ~1,190 lines) mixed three very different kinds
of instruction into one always-loaded file:

1. **Permanent product identity and safety rules** — still binding; promoted into the active `CLAUDE.md`.
2. **Permanent engineering rules** — still binding; promoted into the active `CLAUDE.md`.
3. **Temporary MVP scope restrictions** — the subject of this file.

All three were phrased in the same imperative voice ("Do not build…", "MVP should…"), so a coding
agent reading the file had no way to distinguish a permanent safety rule from scaffolding that had
already served its purpose. The result: the repository kept being treated as a prototype **after the
prototype phase had actually ended** — thirteen milestones (v2–v13) shipped, several of them
explicitly on the file's own "Out of Scope for MVP" list.

This file preserves those temporary constraints, explains why each originally existed, and records
whether the **underlying risk** still needs controlling by other means.

---

## A. Retired scope restrictions

From the original **"Out of Scope for MVP"** section (original brief, lines 730–749), which opened:
"Do not build these in the first MVP unless specifically requested."

| # | Original constraint | Why it existed | Current status | Residual risk still to control |
|---|---|---|---|---|
| A1 | Full Amazon API integration | Avoid commerce plumbing before the evidence layer was trustworthy; keep monetization from shaping the product | **STILL DEFERRED** — by product sequencing, not prohibition | Trust-before-monetization is **permanent** and retained in `CLAUDE.md`. Ranking must stay provably independent of affiliate data. |
| A2 | Automatic blood test parsing | Parsing arbitrary lab PDFs is open-ended; manual entry proved the loop first | **PARTIALLY RETIRED** — `lib/lab-import` + `/api/lab-import/{extract,commit}` exist | Extraction correctness is a **safety** concern: a misparsed biomarker drives wrong flags. Needs an accuracy bar and a human confirmation step before production. |
| A3 | Automatic allergy report parsing | Same as A2 | **STILL DEFERRED** | Same as A2. Allergy data is safety-critical; a false negative is worse than no data. |
| A4 | Full research paper ingestion pipeline | Enormous scope; unnecessary to prove the core loop | **STILL DEFERRED — now on the critical path** | No longer optional. The evidence layer is the product's trust layer and is currently ungrounded (19 of 27 effect grades hand-typed). See `docs/project-status.md`. |
| A5 | AI-generated paper summaries from live PubMed | Risk of fabricated or unverifiable science | **STILL DEFERRED — but the risk materialized anyway** | **Realized in v13.** LLM-recalled citations shipped as real and had to be deleted. The replacement permanent rule: *never author provenance not verified against a real DOI/PMID.* Retained in `CLAUDE.md`. |
| A6 | Medication interaction database integration | Liability and data-licensing complexity | **RETIRED** — `lib/interactions` shipped in v2 as a curated seed engine | Retired **implicitly, without revisiting the liability question it protected against**. Curated-seed interactions are far narrower than a licensed database; the product must never imply complete coverage, and absence-of-warning must never read as safety. |
| A7 | Wearable integrations | Scope; unproven value | **STILL DEFERRED** | None. Legitimately optional. |
| A8 | Mobile app | Scope | **STILL DEFERRED** | None. Legitimately optional. |
| A9 | Payment / subscription system | Premature monetization | **STILL DEFERRED** | None today, but see A1 — monetization must never reach ranking logic. |
| A10 | Community features | Scope; moderation burden | **STILL DEFERRED** | User-generated health claims would open a large new safety surface. Keep deferred until the safety layer is production-grade. |
| A11 | Doctor portal | Scope; regulatory exposure | **STILL DEFERRED** | Would shift the regulatory posture from "educational decision-support" toward clinical. Do not enter without a deliberate, explicit decision. |
| A12 | Full admin CMS | Scope | **STILL DEFERRED** | Emerging real risk: the knowledge base is seed-as-code, so every content correction requires a code deploy. See `docs/roadmap.md`. |
| A13 | Complex gamification system | Avoid a childish, non-premium feel | **PARTIALLY RETIRED** — v9 `identity-cards` and v10 `daily-checkin` shipped a deliberately restrained version | The *tone* rule ("subtle and identity-based, not childish") is **permanent** and retained in `CLAUDE.md`. |
| A14 | Real-time chat coach | Scope; safety of free-form medical conversation | **RETIRED** — v6–v8 shipped an AI advisor | The safety concern was real and **remains real**. It is now controlled by `lib/advisor/safety-recheck.ts`, read-only grounded tools, a server-side authoritative safety gate, and turn caps — not by prohibition. Those controls are load-bearing and must never be removed. |

---

## B. Retired build-sequencing instructions

The brief's **"Development Priorities"** (lines 1087–1150) prescribed a 7-phase build order
(App Shell → Seed Library → Profile → Stack Lab → Stack Evaluation → Protocol Builder → Product
Match Placeholder).

- **Why it existed:** to stop a greenfield agent from building in an order that left the core loop unproven.
- **Current status: FULLY RETIRED.** All seven phases completed by v1; thirteen further milestones
  have shipped since. The list now describes the past, not the plan.
- **Replaced by:** `docs/roadmap.md`, phased around *correctness and dependability* rather than
  initial feature construction.
- **Residual risk:** the underlying principle — *do not build outward before the layer beneath is
  trustworthy* — is permanent and is restated in `CLAUDE.md` as a sequencing rule.

---

## C. Retired dataset-size and placeholder allowances

| Original instruction | Why it existed | Current status | Residual risk still to control |
|---|---|---|---|
| "The first version does not need a massive database. Start with a small, high-quality supplement dataset." (lines 654–656) | Correct for proving the loop | **RETIRED as a scope cap** — 15 supplements is now a *product* limitation, not a deliberate choice | "High-quality" was never enforced. Quality, not size, proved to be the real problem: grades hand-typed, citations fabricated. **Grounding quality is now a permanent rule.** |
| "For MVP, Product Match can be a placeholder or simple mock system." (line 712) | Avoid commerce plumbing early | **RETIRED** — `lib/product-matcher` is a real, tested, multi-criteria engine; only the *product data* is seeded | Ranking independence from affiliate links is **permanent** and test-enforced. The seeded catalog is still placeholder data and must be labeled as such in the UI. |
| "Upload UI placeholder for lab/allergy files, even if parsing is not fully implemented yet" (line 697) | Let the UI shape settle before the parser | **RETIRED** — lab import exists | A placeholder that silently accepts a file and does nothing is a **trust defect**, not a neutral stub. Any remaining non-functional affordance must be visibly disabled or labeled. |
| "Do not integrate Amazon API in the earliest MVP unless explicitly instructed." (line 726) | See A1 | **STILL DEFERRED** | See A1. |

---

## D. The instruction that most needs to stay retired

> "Make the MVP useful with seeded data before adding complicated integrations."
> — original brief, Development Rule 10 (line 1164)

- **Why it existed:** entirely reasonable sequencing advice for a greenfield prototype.
- **Why it must not stay active:** read by an agent in 2026-07, this rule endorses seeded data as the
  steady state and reframes real grounding as "complicated integrations" to be avoided. It is the
  single instruction most responsible for the repository holding prototype-grade evidence quality
  while shipping thirteen feature milestones on top of it.
- **What replaces it:** `CLAUDE.md` now states that seeded data is a *labeled, temporary* substrate
  carrying a required disclosure, and `docs/roadmap.md` puts evidence grounding on the critical path.
- **Residual risk still to control:** the original good instinct — don't build integrations you don't
  need — survives as the anti-scope-creep rule in `CLAUDE.md`. Retiring the MVP cap does **not**
  authorize uncontrolled expansion.

---

## E. Instructions that were NOT retired

For the avoidance of doubt, the following came from the same original file and remain **fully active**.
They were promoted into `CLAUDE.md` and are *not* historical:

- The three-pillar product structure (Library / Profile / Stack Lab), and the navigation rule that
  Protocol Builder and Product Match live *inside* Stack Lab.
- All **Safety and Compliance Principles** — non-diagnostic language, banned phrasings, preferred
  phrasings, disclaimer placement, escalation to professional guidance.
- **User freedom** — evaluate the user's choices rather than blocking them, with safety exceptions.
- **Evidence before recommendation** — every suggestion carries why, evidence, strength, uncertainty,
  and conflicts.
- **Trust over monetization** — affiliate relationships must never touch ranking.
- **Effect-level evidence grading** rather than a single grade per supplement.
- Development Rules 1–9 (product-shape and explainability rules) and Rules 11–13 (the test-enforced
  module-boundary rules, guarded by `src/architecture/boundaries.test.ts`).
- The `src/lib` pure-engine architecture and "keep business logic out of UI components."

---

## F. How to use this file

- **Read it** when you need to know *why* a constraint once existed, before re-introducing or
  permanently discarding it.
- **Do not cite it** as authority for present-day scope decisions.
- **Do not treat a constraint's absence from `CLAUDE.md` as permission** to build the thing — several
  items above remain deferred deliberately. `docs/roadmap.md` is where deferral decisions now live.
