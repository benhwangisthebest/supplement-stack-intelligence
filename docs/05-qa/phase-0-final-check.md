# Phase 0 — Final Independent Check (scaffold)

> **Status: NOT RUN.** This document is a scaffold created on 2026-08-02 alongside the Phase 0 completion
> report. It records *that* the final Check is outstanding and *what* it must cover. It deliberately
> contains **no verdict** — writing one before the Check runs is precisely the "claim verification you did
> not run" failure that `CLAUDE.md` §5.1 forbids.
>
> **Subject:** Phase 0 — Integration & Enforcement Recovery
> **State to be checked:** `main` @ `1792f9f984d506340aced37a4dd2cf4adee6cfe9`
> **Prior review:** `docs/reviews/phase-0-closeout-check.md` (2026-08-01) — verdict *not closed*, four
> blocking findings, all since remediated
> **Completion report (a claim to test, not evidence):** `docs/04-report/phase-0-integration-enforcement.report.md`

---

## Why a second Check

The 2026-08-01 closeout review found Phase 0 **not closed**. Four remediation units (R1, R2, R3, R3b) and
one documentation unit followed. Those units were each reviewed as they landed, but **no single
independent pass has examined the resulting whole**, and the party that performed the remediation is not
the party that should certify it.

The prior review's own method is the bar: read-only inspection of the actual repository, a reviewer panel
instructed to treat plans and reports as *claims to test rather than evidence*, a full verification-suite
run, and mutation checks executed in a disposable clone rather than asserted.

---

## Scope the Check must cover

1. **Re-verify the four blocking findings are genuinely closed** — C-1, C-2, C-3, C-4 — against the
   repository, not against this report's claims.
2. **Independently measure** the figures in the completion report: `main` SHA and sync state, history
   linearity, tag and branch inventory, `524/524` across `42` files, per-guard counts (28 / 29 / 43 / 32),
   9 manifest namespaces, typecheck, build, and the CI run's conclusion and head SHA.
3. **Mutation-check the guards independently.** Every guard added in U7, U8, R1, R2, R3 and R3b was
   mutation-checked by its implementing unit. A guard shown red by its own author is weaker evidence than
   one shown red by a reviewer who chose the mutation.
4. **Claim→observed pass on `boundaries.test.ts`.** Its header has never had the treatment that caught
   three separate defects in the error-disclosure guard. Every documented claim and stated limitation
   should be run against the implementation.
5. **Confirm the deferred items are deferred, not forgotten** — each of the four unmet exit criteria
   carries a U-DEFER pointer in `docs/roadmap.md`, and each carried finding (C-5, C-9, C-10, C-11, C-13,
   F3, F5, F6, F7) is recorded somewhere a future agent will actually read.
6. **Documentation accuracy.** Every SHA, count, URL and "enforced by" claim in the refreshed documents
   should resolve. Three of Phase 0's late blockers were documentation defects, not code defects.
7. **Security posture** — re-confirm the closeout review's §6 conclusion that no credential on any ref
   requires rotation, and that the public-history caveat is stated rather than implied.

## Out of scope

Phase 1 work; branch protection (**C-6**, needs a settings change and separate approval); the licensing
decision (**C-13**); and any code change — the Check is read-only.

---

## Result

*To be completed by the Check unit. Leave empty until it runs.*

| Field | Value |
|---|---|
| Date run | — |
| Method | — |
| Reviewers | — |
| Verdict | — |
| Findings | — |
