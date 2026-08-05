# CLAUDE.md — Supplement Stack Intelligence Platform

**This is the authoritative project instruction file.** It lives at the git repository root and is
version-controlled. It holds **stable, long-lived instructions** and is deliberately short. Anything that
changes with the current milestone belongs in `docs/`, not here.

Run all commands from this directory (the repository root).

> **Relocation note.** These instructions previously lived one level up, at `Supplement-Advisor/CLAUDE.md`,
> which was **outside** the git repository and therefore unversioned. They now live here, inside the repo.
> If a copy reappears in a parent directory, this file wins — it is the version-controlled one.
>
> Not to be confused with `.claude/CLAUDE.md`, which is the **superseded historical MVP brief (~1,190 lines of original content, plus a superseded banner)**
> (rank 8 in §6). That file is reference material only.

---

## 0. Scope status — read this first

**This repository is no longer permanently restricted to its original MVP scope.**

The MVP was completed and thirteen further milestones (v2–v13) shipped on top of it. The original brief's
`MVP Scope`, `Out of Scope for MVP`, and `Development Priorities` sections are **retired**: they described a
completed construction phase, and six subsystems they prohibit are already built, tested, and shipping.
Those retired constraints — and the reason each originally existed — are preserved at
`docs/archive/original-mvp-instructions.md`.

**Removing MVP restrictions does not authorize uncontrolled scope expansion.**

Retirement of a scope *cap* is not permission to build broadly. Several capabilities remain deliberately
deferred (see `docs/product-direction.md` §7), and the sequencing in `docs/roadmap.md` is a constraint, not
a menu. The current phase is **foundational correctness before expansion**. If you are about to add a
product feature, first check that `roadmap.md`'s current phase actually calls for it.

**A constraint's absence from this file is not permission to build the thing.** When in doubt, ask.

---

## 1. Product identity and long-term direction

A **personalized supplement research and stack intelligence platform** for health nerds, biohackers,
athletes, and longevity-focused users.

> North Star: **"Does my supplement stack actually make sense?"**

The goal is not to make supplements *simple* — it is to make complex supplement science **navigable**.
Information-rich but organized; layered, never dumbed down.

**Three pillars, permanent:**
- **Library** — the trust layer. Effect-level evidence, mechanisms, dosing, risks, interactions.
- **Profile** — the context layer. A living health-context file. It provides context; it never diagnoses.
- **Stack Lab** — the action layer. Build, evaluate, compare, generate protocols, match products.

**Navigation is exactly three top-level items.** Protocol Builder and Product Match live *inside* Stack Lab.
Do not add a top-level item without an explicit product decision.

**It is not:** a magic AI doctor, a cure platform, a supplement quiz, a generic wellness app, an affiliate
shop, or a replacement for medical care.

Full detail: `docs/product-direction.md`.

---

## 2. Non-negotiable rules

**These sit at the top of the source-of-truth hierarchy (§6 rank 1).** No plan, roadmap phase, milestone
pressure, or scope change may override them. A task instruction may change *what* is built and in *what
order*; it may not silently suspend anything in this section.

### 2.1 Safety
This product is **educational and decision-support**. It does not diagnose, treat, cure, or prevent disease.

1. Never tell a user they *have* a deficiency, condition, or disease.
2. Never instruct a user to start, stop, or change a medication.
3. Never claim to treat, cure, or prevent anything.
4. Never present a correlational signal as causal.
5. Never let an LLM write user data without passing the server-side authoritative safety re-check.
6. All advisory copy flows through `src/lib/safety`. Escalate to professional medical guidance for
   medications, pregnancy, chronic disease, abnormal labs, very high doses, or risky combinations.

Required language posture: "may support", "has evidence for", "commonly studied for", "may be worth
discussing with a clinician", "the app cannot determine this safely from the available information".

### 2.2 Evidence integrity
7. **Never assert a fact the system did not compute.** Rendered copy must bind to an engine-computed value.
   Hedged, non-diagnostic, banned-phrase-free language can still be *false*. The safety vocabulary sweep
   validates wording, not truth.
8. **Never author unverified provenance.** No citation, author, journal, year, DOI, PMID, sample size, or
   source link may be written from model recall or inference. Verified against a real source, or absent. If
   provenance cannot be verified, the *field should not exist in the type*.
9. **Evidence supremacy.** Self-reported signals (adherence, outcomes, side-effect reports) may refine
   ordering *within* an equal evidence grade. They may never override evidence.
10. Never let curated-seed coverage read as complete coverage. Absence of a warning is not a safety signal.

### 2.3 Security and privacy
11. Every route under `src/app/api/**` authenticates and returns 401 on failure.
12. Every new table ships with RLS enabled and a matching policy in the same migration.
13. Internal error text never crosses the API boundary. Log with a correlation ID; return a generic message.
14. Never commit secrets. The Supabase service-role key stays confined to the dev seed script and must never
    be reachable from `src/app` or `src/components`.
15. Health data (medications, allergies, conditions, lab results) is sensitive. Do not log it, and do not
    expand its collection without a stated purpose.

### 2.4 Data integrity
16. **Reference-data IDs are an append-only public contract.** Supplement, effect, paper, product, and
    biomarker IDs are persisted by users in `stack_items` with no foreign key. Removing or renaming one
    silently orphans user data. Removal requires a tombstone plus a data migration.
17. **Trust over monetization.** Ranking must be *provably* independent of affiliate data — enforced
    structurally (the ranker cannot read affiliate fields), not by policy.

---

## 3. Engineering principles

1. **Evidence before recommendation.** Every suggestion or flag states why, what evidence supports it, how
   strong it is, the uncertainty, and any conflicts.
2. **User freedom.** Evaluate the user's choices rather than blocking them. Safety is the only exception.
3. **Prefer clear structure over clever code.** The repo must stay navigable by both a human and an agent.
4. **Prefer the smallest change that works.** No speculative abstraction, no enterprise architecture, no
   scale engineering without measured evidence of a real load or cost problem.
5. **Make rules executable.** A documented rule that nothing runs will rot. This project has already proven
   it: 16 boundary violations accumulated while the rule lived only in prose. Prefer a test over a paragraph.
6. **Uncertainty is a feature.** "Not enough information" is a valid output.

---

## 4. Architectural boundaries

Layering: `src/types` → pure engines in `src/lib` → `src/services` / `src/lib/db` → `src/app` routes →
`src/components`. Dependencies point inward. Business logic stays out of UI components.

**Enforced on `npm test` by `src/architecture/boundaries.test.ts`** — specified in
`docs/02-design/architecture-boundaries.md`. Read that document before changing anything under `src/types/`.

1. Never import `./index` or `@/types` from inside `src/types/`. Import the owning sibling module directly.
   `src/types/index.ts` is a barrel only — never add a declaration to it.
2. `src/types/*` may import **only** other `src/types/*` modules — no packages, no `@/lib`, no `@/app`. If a
   type is derived from an implementation (e.g. a Zod schema), hand-write the contract in `src/types/` and
   assert conformance in the implementing module.
3. Never import `@/app/*` from `src/components/*` or `src/lib/*`. Reusable server actions belong in `src/lib/`.
4. `src/data/**` is a leaf: it may import only `src/types/**`.
5. **Domain purity.** Pure engine directories under `src/lib` may not import `@/lib/db`, `@/lib/supabase`,
   `@/services`, `@/app`, or `next/*`.
6. **Every top-level `src/*` directory must be registered** in `boundaries.test.ts` — either scanned, or in
   an exemption list with a written reason. New layers do not get to exist ungoverned.
7. **Client components receive data as props from server components.** They do not import domain engines or
   seed data directly.
8. **Every trust boundary belongs in a testable module**, not in a route handler.
9. **Any endpoint calling a paid external API** needs an atomic per-user budget reservation and a request
   rate limit.

**Enforcement status, measured 2026-08-02 against `src/architecture/`:**

| Rule | Status | Enforced by |
|---|---|---|
| 1, 2, 3 | **Enforced** | `boundaries.test.ts` — B1, B2, B2b, B3 |
| **4** (`src/data` is a leaf) | **Enforced** | `boundaries.test.ts` — B4, B4b |
| **5** (domain purity) | **Enforced** | `boundaries.test.ts` — `DOMAIN_IS_PURE`, as a **ratchet** (Phase 1 U18). Scope settled by ruling D-4: all of `src/lib` except `auth`, `api`, `supabase`, `db`, which are named exemptions carrying written reasons. **Three** orchestration files are individually allowlisted — `advisor/actions/execute.ts`, `advisor/context-loader.ts`, `identity/context.ts` — and a test asserts each still violates, so the list can only shrink. An un-allowlisted fourth fails. See `docs/02-design/architecture-boundaries.md` |
| **6** (every top-level `src/*` registered) | **Enforced** | `boundaries.test.ts` — tree-partition, with a written-reason assertion |
| 7 (client components take props) | Not enforced | Would fail today on 7 of 31 client components |
| 8 (trust boundaries in testable modules) | Not enforced generally | The API error boundary is enforced by `error-disclosure.test.ts`; there is no general mechanical rule |
| 9 (budget + rate limit on paid APIs) | Not enforced | No mechanical check exists |

A further rule **B5** (`src/lib`/`src/services` must not import `src/components`) is enforced but is not
one of the numbered rules above — see closeout finding C-5.

**Do not introduce new violations of the unenforced rules.** Sequencing: `docs/roadmap.md` Phases 0–2.

---

## 5. Testing and verification requirements

Green tests are not the same as a verified product. This project shipped two Criticals with 385 tests
passing, a clean typecheck, and a successful build.

1. **Never claim verification you did not run.** State what you ran, and what the result was.
2. **Mutation-check every new guard.** A test that has not been shown to go *red* against the bug it targets
   is not a guard. This project shipped an analysis that *recommended* a regression guard and shipped
   without one.
3. **Reachability guards.** Any orchestration function wiring a pure engine to repos must have a test
   proving every field it passes actually reaches an observable output. A pure-unit-tested engine can be
   dead code in production, and optional context fields mean the compiler cannot catch the omission.
4. **Copy↔computation binding.** Any rendered number or claim must be traceable to an engine-computed
   value, test-enforced.
5. **New API routes** ship with tests for 401, validation failure, and the happy path.
6. **New `src/lib/db` mapper functions** ship with a row-fixture test.
7. **New engines** ship with a coverage threshold entry.
8. **Components rendering a safety flag, evidence grade, or citation** ship with a component test.
9. `E2E_LIVE`-gated Playwright blocks must be tagged `[LIVE]` in their title. Do not rely on the
   `L1/L2/L3` prefix to signal gating — it does not. **Enforced** by
   `src/architecture/e2e-live-tagging.test.ts` (`LIVE_TAGGING`), both ways: a gated block without the
   tag fails, and so does a tagged block that is not gated. Live runs are also serialised there
   (`workers: 1`) — the authed specs share one seeded demo account.
10. Before declaring work done: `npx tsc --noEmit`, `npx vitest run`, and `npx next build` must all pass.

Measured baseline (re-measured 2026-08-03 at Phase 0 close): typecheck clean · **524/524 unit tests across
42 files** · build succeeds · **CI exists and is green** (GitHub Actions `CI`: `npm ci` → typecheck →
`vitest run` → **coverage thresholds** → `next build`, on **every branch push**, on PRs into `main`, and on
`workflow_dispatch`). The coverage step was added by Phase 1 U13; the four before it are unchanged. These
figures are re-measured by every CI run — the authoritative result for any commit is its `push`/`main`
run, not this line, which is a snapshot and will drift. **[2026-08-03]** CI **is** now a required status:
`main` requires the `typecheck / test / build` check on the pushed SHA, and ruleset `main-integrity`
forbids deletion and non-fast-forward updates with no bypass actor. `enforce_admins: false`, so the check
is a guardrail against accident rather than a control against a determined admin — see `docs/roadmap.md`.

---

## 6. Source-of-truth hierarchy

When sources conflict, the higher rank wins:

| Rank | Source |
|---|---|
| **1** | **Non-negotiable safety, security, privacy, evidence-integrity, and data-integrity rules** — §2 of this file, plus the safety boundaries in `docs/product-direction.md` §6 |
| **2** | The user's current explicit instruction |
| **3** | **This file** — permanent engineering and operating rules (§3, §4, §5, §7–§10) |
| **4** | `docs/product-direction.md` — what the product is; its principles and deferred capabilities |
| **5** | An approved current implementation plan (`docs/01-plan/`, status Approved — a Draft outranks nothing) |
| **6** | `docs/roadmap.md` — sequencing: what to do next, what is excluded from this phase |
| **7** | The existing implementation — evidence of what *is*, not authority on what *should be* |
| **8** | Historical and archived documents — `docs/archive/**` (incl. `original-mvp-instructions.md`) and `.claude/CLAUDE.md` |

**How to apply it:**

- **A current task instruction (rank 2) may change scope and priorities.** It may reorder work, defer a
  phase, or expand what is in scope.
- **It may not silently override rank 1** — safety, security, privacy, evidence integrity, data integrity —
  **or the architectural boundaries in §4.** If a task appears to require it, stop and say so explicitly
  rather than proceeding. An explicit, acknowledged decision by the user is the only way past rank 1, and it
  must be recorded.
- **Plans and roadmaps (ranks 5–6) are temporary.** They sequence work; they never license a rank-1 or
  rank-3 exception. A roadmap phase that appears to require one is a defect in the roadmap.
- **Archived MVP instructions (rank 8) never override active instructions** — ever, under any framing.
- Do not convert planning documents into permanent instructions. A plan describes one milestone; this file
  describes the repository.

This is the **only** source-of-truth ordering in the repository. If another document states a different
order, that document is wrong and should be corrected to point here.

---

## 7. Distinguishing temporary scope from permanent rules

The original brief's failure was mixing both in one imperative voice, so an agent could not tell a safety
rule from expired scaffolding. Do not repeat it.

- **Permanent rules** live in this file, `docs/product-direction.md`, or an executable test. They state a
  property that must always hold.
- **Temporary scope** lives in `docs/roadmap.md` (phase inclusions/exclusions) or a plan document. It states
  what is being built *now*.
- **When you introduce a constraint, say which kind it is** and where it belongs.
- **When you find a constraint you suspect is expired:** do not silently ignore it, and do not silently obey
  it. Check whether the thing it forbids already exists in the codebase. If it does, the constraint is
  expired — flag it, and propose retiring it to `docs/archive/`.
- **Never delete historical rationale.** Retire it with an explanation of why it existed and whether the
  underlying risk still needs controlling.

---

## 8. Handling technical debt

1. **Name it, don't absorb it.** If you find debt outside your task's scope, report it rather than silently
   fixing or silently ignoring it.
2. **Never label a mock, placeholder, or seeded dataset as permanent by default.** If a temporary
   implementation has become load-bearing, say so explicitly — that is a finding, not a fact of life.
3. **A placeholder that silently does nothing is a trust defect**, not a neutral stub. Non-functional
   affordances must be visibly disabled or labelled.
4. **Prefer deleting a field over guarding it.** The fabricated-citation defect existed because a *required*
   provenance field with no real source left fabrication as the only way to satisfy the type. Removing the
   field made the compiler enumerate every consumer.
5. **Do not assume an MVP shortcut needs a rewrite.** Most of this codebase's shortcuts need bounded
   refactoring, and some — like seed-as-code for read-only reference data — are actually the right design.
   Classify before proposing work: production-suitable / bounded refactor / prototype-only.
6. **Content debt compounds fastest.** Every feature built on ungrounded evidence enlarges the surface a
   future grounding cycle must revalidate.
7. Current classification per subsystem: `docs/project-status.md`.

---

## 9. Required planning and review workflow

1. **Orient before editing.** For codebase questions use graphify (§11) before raw browsing.
2. **Read the relevant docs first:** `docs/roadmap.md` for whether the work belongs in this phase,
   `docs/project-status.md` for the subsystem's real condition, and any existing plan or design document.
3. **Plan before non-trivial work.** State the problem, the approach, the files touched, the risks, and the
   success criteria. For anything touching safety, evidence, persistence, or the advisor: write it down
   before implementing.
4. **Enumerate callers when changing a shared contract.** Two separate defects in this project came from a
   shared change with an unenumerated caller. `tsc` will not catch a Zod schema — it is a runtime structure.
5. **Verify, then report honestly.** Run the §5 checks. If something fails or was skipped, say so with the
   output. Do not round a partial result up.
6. **Record the outcome** where the project already records outcomes — a report under `docs/` and the
   relevant `_INDEX.md`. Note deferred items explicitly rather than dropping them.
7. **Update `docs/project-status.md`** when a subsystem's classification changes, and `docs/roadmap.md`'s
   phase status when a phase starts or completes.

Note: the bkit PDCA tooling state is stale (`bkit_pdca_status` tracks zero features as of 2026-06-15). The
`docs/archive/*/_INDEX.md` files are the reliable status record. Either revive the tooling deliberately or
retire it — do not half-use it.

---

## 10. Repository operating rules

1. **`main` is the only long-lived branch.** A feature branch merges to `main` and is deleted. **Never
   branch off an unmerged feature branch** — doing so produced a 14-commit chain of stale labels.
2. **Push your work.** Guardrails that are not pushed do not exist off this machine.
3. **Guardrails that do not run in CI do not exist.** Do not add a check without wiring it in.
4. **Do not rebase, squash, or cherry-pick the historical v2–v13 chain.** It is linear and already
   validated; rewriting it would discard the only integrated state.
5. **Commit, push, merge, tag, and branch deletion require explicit user approval each time.** Prior
   approval of one such action does not carry to the next.

---

## 11. graphify

This project has a knowledge graph at `graphify-out/` — **inside the repository root, but gitignored**
(generated, regenerable — size varies with the tree, order tens of MB). It holds god nodes, community
structure, and cross-file relationships.
If the directory is absent after a fresh clone, that is expected: run `graphify update .` to build it.

- For codebase questions, run `graphify query "<question>"` **before** grepping or browsing raw source. Use
  `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
  These return a scoped subgraph, far smaller than `GRAPH_REPORT.md` or raw grep output.
- Read `GRAPH_REPORT.md` only for broad architecture review, or when query/path/explain do not surface
  enough context. Use `wiki/index.md` for broad navigation if it exists.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- `/graphify` invokes the installed graphify skill.

---

## 12. Document map

| Document | Purpose |
|---|---|
| `CLAUDE.md` (this file) | Authoritative, version-controlled operating rules |
| `docs/product-direction.md` | What the product is; principles, safety boundaries, deferred capabilities |
| `docs/project-status.md` | Actual current condition per subsystem, with classifications |
| `docs/roadmap.md` | Phased transition plan; sequencing authority |
| `docs/reviews/mvp-transition-check.md` | The 2026-07-30 independent review findings (T-01…T-24) |
| `docs/reviews/phase-0-closeout-check.md` | The 2026-08-01 independent Phase 0 closeout review (C-1…C-13), with its 2026-08-02 resolution addendum |
| `docs/02-design/architecture-boundaries.md` | Layer specification behind §4 |
| `docs/archive/original-mvp-instructions.md` | Retired MVP constraints + why each existed (reference only) |
| `docs/archive/2026-06/`, `2026-07/` | Per-feature history; `_INDEX.md` is the real status record |
| `.claude/CLAUDE.md` | **Superseded** historical MVP brief (~1,190 lines of original content, plus a superseded banner) (rank 8) |
| `.claude/DESIGN.md` | Design system specification |
