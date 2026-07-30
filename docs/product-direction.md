# Product Direction

> **Status:** Active. Product-level source of truth.
> **Last reviewed:** 2026-07-30 (MVP-transition review).
> **Precedence:** **Rank 4** in the single source-of-truth hierarchy defined in `CLAUDE.md` §6 — below the
> non-negotiable rules (rank 1), the user's current instruction (rank 2), and `CLAUDE.md`'s permanent
> engineering rules (rank 3); above approved plans (rank 5) and `docs/roadmap.md` (rank 6).
> The safety boundaries in §6 of *this* document are **rank 1** and are not overridable by any plan or
> roadmap phase. `CLAUDE.md` §6 is the authoritative ordering; this note only restates it.
>
> **Evidence policy.** Every statement below is either (a) from the original project brief now archived
> at `docs/archive/original-mvp-instructions.md` (preserved in git at `30f74e1`), (b) observable in the
> repository, or (c) explicitly marked **[INFERRED]**. Inferred items are recommendations, not
> requirements, and are not approved scope.

---

## 1. The intended complete product

A **personalized supplement research and stack intelligence platform**.

> North Star question: **"Does my supplement stack actually make sense?"**

The goal is not to make supplements *simple*. It is to make complex supplement science **navigable** —
information-rich but organized, layered rather than dumbed down.

The complete product lets a user:

1. Search and study supplements at effect level, with evidence strength made explicit.
2. Maintain a living health-context file (goals, diet, allergies, medications, labs, preferences).
3. Build one or more stacks and receive an evidence-aware, context-aware evaluation.
4. Generate an explainable protocol from that context, and accept/edit/reject it item by item.
5. Match real products by *fit*, with monetization provably separated from ranking.
6. Track adherence and outcomes over time, with correlational (never causal) feedback.

It should feel scientific, premium, nerd-native, trustworthy, organized, evidence-first,
user-controlled, and approachable without being oversimplified.

**Explicitly NOT:** a magic AI doctor, a cure platform, a quick supplement quiz, a generic wellness
app, a basic affiliate supplement shop, or a replacement for medical care.

---

## 2. Primary users

| User | Context | Core need |
|---|---|---|
| Health nerds / biohackers | Already self-experimenting; read primary literature | Depth, evidence strength, freedom to disagree with the app |
| Athletes / performance-focused | Training-driven supplementation | Dose/timing correctness, performance-relevant evidence |
| Longevity-focused | Long-horizon, multi-supplement stacks | Redundancy detection, interaction risk, cost efficiency |
| Moderately health-interested | Want to understand, not be told | Layered depth — readable summary expanding into mechanism and papers |

Users with lab data are a growing sub-segment (`lab-markers`, `lab-panels`, `lab-import`,
`lab-trends` exist for them).

**Not a target user:** anyone seeking diagnosis, treatment, or a substitute for clinical care.

---

## 3. Core product systems

Three pillars. This structure is permanent.

### 3.1 Library — the trust layer
Effects, mechanisms, dosing, side effects, contraindications, biomarker relevance, related
supplements, food pairings, and evidence grades **at the effect level, not the supplement level**.

The product's entire credibility rests here. It must organize claims by strength of evidence and must
not make unsupported claims.

### 3.2 Profile — the context layer
A living health-context file the user improves over time: goals, training, sleep, diet, allergies,
medications, volunteered conditions, lab/biomarker results, avoided ingredients, budget, risk
tolerance, caffeine sensitivity, experience level.

The Profile **provides context. It never diagnoses.**

### 3.3 Stack Lab — the action layer
Build stacks, define stack intent, evaluate, compare current vs suggested, generate protocols, match
products.

**Navigation rule (permanent):** Protocol Builder and Product Match live *inside* Stack Lab. Main
navigation stays exactly three items: Library, Profile, Stack Lab.

### 3.4 Supporting systems built since the MVP
Part of the product, not experiments:

- **Safety layer** (`lib/safety`) — standardized non-diagnostic language, enforced in code via `BANNED_PHRASES`.
- **AI advisor** (`lib/advisor`) — grounded, read-only-tool assistant that may *propose* stack changes;
  all writes pass a server-side authoritative safety re-check.
- **Interactions engine** (`lib/interactions`) — supplement↔supplement, supplement↔medication, supplement↔food.
- **Biomarkers & lab trends** (`lib/biomarkers`, `lib/lab-trends`, `lib/lab-import`).
- **Check-in & outcomes loop** (`lib/checkin`) — adherence and correlational goal feedback.
- **Side-effect engine** (`lib/side-effects`) — correlational, co-occurrence-gated watch signals.
- **Identity layer** (`lib/identity`) — restrained, derived supplement archetypes.

---

## 4. Long-term capabilities

Direction, not commitments; `docs/roadmap.md` decides sequencing.

- **A genuinely grounded evidence base** — effect grades derived from verified literature (real
  DOI/PMID), not hand-authored letters. The most important long-term capability and the product's
  largest current gap.
- **A knowledge base that can grow without a code deploy** — content editing separated from releases.
- **Context-adjusted evidence** — grades reflecting *which* evidence applies to a given user
  (population, biomarker status), while the grade remains a claim about the evidence, never about the
  user. Plan exists at `docs/01-plan/features/context-adjusted-evidence.plan.md` (halted at design).
- **Real product data** — a live, maintained catalog replacing the seeded one.
- **Longitudinal intelligence** — trends across labs, adherence, and outcomes over months.

---

## 5. Non-negotiable product principles

Permanent. Not tradeable for velocity, scope, or revenue.

1. **Evidence before recommendation.** Every suggestion or flag states why, what evidence supports it,
   how strong that evidence is, what the uncertainty is, and what conflicts exist.
2. **Evidence supremacy.** Self-reported signals (adherence, outcomes, side-effect reports) may refine
   ordering *within* an equal grade. They may never override evidence. Currently proven by regression
   tests; that proof must be preserved.
3. **Never assert a fact the system did not compute.** Rendered copy must bind to an engine-computed
   value. Hedged, non-diagnostic, banned-phrase-free language can still be false.
4. **Never author unverified provenance.** No citation, author, journal, year, DOI, PMID, sample size,
   or source link written from recall or inference. Verified or absent.
5. **User freedom comes first.** The app evaluates the user's choices rather than blocking them. It may
   say "Flagged", "Experimental", "Potentially redundant", "Dose exceeds common studied range" — but it
   does not lock users in. Safety is the only exception.
6. **Trust over monetization.** Ranking must be provably independent of affiliate relationships.
   Recommendation, availability, and affiliate relationship stay visibly separate.
7. **Effect-level grading.** Grade each effect separately; avoid one universal grade per supplement.
8. **Progressive depth, not user tiers.** Every user sees the same serious product and expands what
   they want.
9. **Uncertainty is a feature.** "Not enough information" is a valid, respected output.
10. **Gamification stays subtle and identity-based**, never childish.

---

## 6. Safety boundaries

**Posture:** educational and decision-support. The product does **not** diagnose, treat, cure, or
prevent disease. It is not a medical device and must not be positioned or built as one.

**Hard boundaries:**

- Never tell a user they *have* a deficiency, condition, or disease.
- Never instruct a user to start, stop, or change a medication.
- Never claim to treat, cure, or prevent anything.
- Never present a correlational signal as causal.
- Never let an LLM write user data without a server-side authoritative safety re-check.
- Never present curated-seed coverage as complete coverage — absence of a warning is not a safety
  signal, and the UI must not let it read as one.
- Never render fabricated or unverified scientific provenance.

**Required language posture:** "may support", "has evidence for", "commonly studied for", "may be
worth discussing with a clinician", "this is flagged due to a potential risk", "the app cannot
determine this safely from the available information".

**Escalation:** for medications, pregnancy, chronic disease, abnormal labs, very high doses, or risky
combinations, strongly recommend professional medical guidance.

**Disclaimer placement:** wherever profile data, labs, protocols, or stack evaluation are surfaced.

---

## 7. Intentionally deferred — not permanently excluded

Deferred means a future decision may take them up. Absence from current scope is not a prohibition;
presence here is not authorization to build. See `docs/roadmap.md` for sequencing and
`docs/archive/original-mvp-instructions.md` for original rationale.

| Capability | Why deferred | Condition for revisiting |
|---|---|---|
| Live research ingestion (PubMed etc.) | Large scope; fabrication risk | Must precede or accompany evidence-grounding work — highest-value deferral |
| Automatic lab/allergy report parsing beyond current import | Accuracy is safety-critical | Needs a measured accuracy bar + mandatory human confirmation |
| Licensed medication-interaction database | Liability and licensing | When coverage claims must be stronger than curated seed |
| Live product/commerce API (e.g. Amazon) | Trust must precede monetization | Only after the evidence layer is grounded; ranking independence stays test-proven |
| Payments / subscriptions | Premature | Product-value decision |
| Community features | Large new safety surface (user-generated health claims) | Only with production-grade moderation and safety |
| Doctor / clinician portal | Would change regulatory posture | Requires an explicit, deliberate regulatory decision |
| Wearable integrations | Unproven value | Product-value decision |
| Mobile app | Scope | Product-value decision |
| Admin CMS for the knowledge base | Scope | **[INFERRED]** Becoming pressing — content is seed-as-code, so every correction is a deploy |

---

## 8. Inferred recommendations

**[INFERRED]** — derived from repository evidence but **not** established requirements. Proposals
requiring approval.

1. **[INFERRED] The Library's coverage limits should be visible to users.** 15 supplements and 27
   effects is small relative to the "Examine.com-depth" positioning. Users must not mistake a catalog
   gap for an absence of evidence. *Evidence: `src/data/seed-supplements.ts`, `src/data/seed-effects.ts`.*
2. **[INFERRED] Content editing should separate from code deployment.** Every knowledge correction
   currently requires a code change, review, and deploy — this will throttle the grounding work the
   product most needs. *Evidence: knowledge base lives entirely in `src/data/*.ts`; engines import it
   statically (`src/lib/evidence/index.ts:36-40`).*
3. **[INFERRED] Users should be able to export and delete their own health data.** The product stores
   medications, allergies, conditions, and lab results but offers no self-service export or deletion
   path. *Evidence: no such route under `src/app/api/`.*
4. **[INFERRED] The product needs a stated position on coverage completeness.** Interactions, side
   effects, and food pairings are curated seeds with partial coverage (food pairings cover 9 of 15
   supplements). A consistent product-wide treatment of "we don't know" vs "there is nothing" is not
   yet defined. *Evidence: `docs/archive/2026-07/_INDEX.md`, food-pairings SC-2.*

---

## 9. What this document does not do

- Does not authorize scope expansion. Retiring MVP limits is not permission to build broadly.
- Does not set sequencing — `docs/roadmap.md` does.
- Does not describe current state — `docs/project-status.md` does.
