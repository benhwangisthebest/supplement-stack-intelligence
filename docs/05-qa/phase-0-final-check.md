# Phase 0 — Final Independent Check

> **Date run:** 2026-08-02
> **Target:** `main` @ `0d9e00837baf3f35b1dbe5203691fe7e093d0c96` (= `origin/main`, 0 ahead / 0 behind)
> **Method:** four independent read-only reviewers on distinct lenses, dispatched concurrently. The
> orchestrator acted as **clerk, not judge** — it performed the Phase 0 remediation and wrote the
> documents under test, so it dispatched, verified the mechanics ran, and transcribed. Findings are
> recorded as the reviewers reported them; none was softened or reinterpreted.
> **Framing given to every reviewer:** *"`docs/04-report/phase-0-integration-enforcement.report.md` and
> the resolution addendum in `docs/reviews/phase-0-closeout-check.md` are CLAIMS under test, not
> evidence. Verify against the repository, git history and CI logs by running commands yourself. Where a
> claim says 'mutation-proven', re-prove it — do not accept the report's word."*
>
> **Prior review:** `docs/reviews/phase-0-closeout-check.md` (2026-08-01) — verdict *not closed*
> **Completion report (a claim tested here, not evidence):** `docs/04-report/phase-0-integration-enforcement.report.md`

---

# VERDICT: **PHASE 0 NOT CLOSED**

**Reason:** the underlying code and repository state are sound and reproduce exactly — but **five
published claims are false**, including one where the hazard the claim says was resolved is still live on
disk. Per this Check's own criteria, a material finding that falsifies a published claim forces NOT
CLOSED even when the code is fine.

Nothing found here is a defect in the shipped code. Every failure is a **record-accuracy** failure — the
same class Phase 0 kept tripping on, now caught by the Check that exists to catch it.

---

## Reviewers

| | Lens | Agent | What it re-executed |
|---|---|---|---|
| **R-A** | Guard efficacy | `ecc:security-reviewer` | 4 fresh mutations in a disposable worktree; traced the 4 fixed disclosure sites; probed 2 documented guard gaps |
| **R-B** | Closeout-criteria audit | `general-purpose` | C-1…C-13 dispositions; the unit→commit table; the deferred-item register |
| **R-C** | Documentation truth sample | `general-purpose` | 30 self-chosen factual claims; the redaction claim; a public-hygiene scan of all 93 committed docs |
| **R-D** | Repository state & hygiene | `general-purpose` | History, refs, reflog, both CI runs, secret scan, visibility, full local verification |

`bkit:gap-detector` was **not** used for R-B: it has no Bash, and R-B's charge required git verification.

---

## R-A — Guard efficacy: **all claims re-proved true**

Worked in a disposable detached worktree at the target SHA with `node_modules` symlinked; reverted and
re-ran green (100/100) after every mutation; worktree removed and pruned. The primary tree was never
mutated.

**Four mutations, all RED with site-naming failures.** R-A deliberately chose forms *not* copied from
prior reports:

| Mutation | Guard | Observed |
|---|---|---|
| `src/types/supplement.ts` imports `zod` | boundaries | RED — `src/types/supplement.ts:1 [TYPES_NO_EXTERNAL_DEPS] imports "zod" -> (external)` |
| Rename seed id `creatine` → `creatine-RENAMED` | id-stability | RED — named the vanished id **and** all four persisted sites it orphans, plus `1 unregistered id(s)` |
| `` fail(…, `Extraction failed: ${e.message}`, 502) `` in `lab-import/extract/route.ts:72` | error-disclosure | RED — `lab-import/extract/route.ts:72 [property-access] e.message` |
| `` fail(…, `Could not save check-in: ${err["message"]}`, 502) `` in `checkins/route.ts:40` | error-disclosure | RED — `checkins/route.ts:40 [element-access] err["message"]` |

**The four fixed disclosure sites traced clean.** Read directly, not from the report: both
`advisor/actions/route.ts` catches and the undo catch pass the whole value to `internalError`; the SSE
path binds the client-visible `message` to the fixed constant `INTERNAL_ERROR_MESSAGE`. `respond.ts`
traced end-to-end — the raw exception reaches only `logInternalError()`, never a returned or streamed
body. The `NOT_CONFIGURED` 503 branch still forwards `err.message`, bounded to three hand-authored
throw sites naming only public env-var names — that is **F3**, already carried forward, not an
undisclosed gap.

**Both probed guard limitations behave exactly as documented (F7).** `catch ({ cause }) { … cause.message }`
and a two-argument `.then(ok, onRejected)` reading `err.message` were each introduced into a real route:
the guard stayed **green (29/29)** in both cases, as its header states. R-A's own repo-wide grep found
neither form present today, so the header's "No route uses either form today" holds.

> R-A: *"All four mutation-efficacy claims and the two 'mutation-proven' report claims for the boundary
> and ID guards **re-proved true** under independent re-execution… No file in the repository was left
> modified; the disposable worktree was torn down and pruned."*
>
> R-A also records both F7 gaps as *"real, currently-unexploited blind spots, honestly disclosed rather
> than silently present"* — cosmetic against the guard's stated scope, material as a standing blind spot
> if either pattern is later introduced.

**No finding.**

---

## R-B — Closeout-criteria audit: **six findings, five material**

R-B independently re-measured and matched: 524/524 across 42 files; guard counts 28/29/43/32; 9 manifest
namespaces with exact per-namespace counts; run `30744203782` green; `branches/main/protection` → 404;
0 tags; 9 remote `feat/*`. **The unit→commit table is CLEAN** — all 13 SHAs resolve, all are ancestors of
`main`, every `git show --stat` corroborates the claimed subject, and the table is byte-identical in the
plan and the report.

### M-1 · MATERIAL — C-2 "Resolved by relocation" is overstated; the hazard is still live

> R-B: *"`~/Desktop/Claude-Projects/Supplement-Advisor/v1.0` is **still a live git clone**, on branch
> `main` @ `bf7ff2e`, remote … the same PUBLIC repo, with **115 dirty entries of which 111 are `* N.*`
> duplicates**… C-2's own prescribed fix was three steps — resolve sync, **delete the 111 strays,
> re-verify `git status`**; steps 2 and 3 were never performed. The precise danger C-2 named ('a
> `git add -A` in the current tree would publish 111 duplicate source files … to a public branch,
> irreversibly') is unmitigated in that clone. Correct disposition: **evaded for the new working copy,
> not resolved.**"*

**Clerk's independent confirmation** (filesystem only — no git command was run in that directory):
`.git` present; `.git/config` remote = `https://github.com/benhwangisthebest/supplement-stack-intelligence.git`;
**141** `* N.*` files now present, including `CLAUDE 2.md`, `docs/roadmap 2.md`, `docs/project-status 2.md`.
The count has **grown** since the 2026-08-01 review recorded 111.

Falsifies: `docs/reviews/phase-0-closeout-check.md` (C-2 row, "Resolved") and
`docs/04-report/…report.md:58-59`.

### M-2 · MATERIAL — the addendum cites a location that does not contain the claim

> R-B: *"`phase-0-closeout-check.md:517`: 'The public-history caveat is now stated in
> `docs/04-report/…report.md` **and `docs/project-status.md`**.' Verified: the report has it (§4).
> `docs/project-status.md` does **not** — a full-file grep for `untrack|fetchable|rewrite|bkit-memory|30f74e1`
> returns only unrelated hits. The caveat is absent."*

**Clerk's confirmation:** grep for `fetchable|permanently|untracking is not removal` in
`docs/project-status.md` → no match.

### M-3 · MATERIAL — C-4 marked Resolved, but stale claims it named by line number persist

> R-B: *"`CLAUDE.md:152-153` still reads 'Rules 4–9 … are **not yet implemented**'. C-4's table row for
> `CLAUDE.md:152` said 'Rules 4 and 6 are enforced' — verified still true today… Only `CLAUDE.md:179` was
> refreshed… `docs/project-status.md:158-159`: '**`stack_items.supplement_id` is a soft reference with no
> FK.** … **No detection, no test.**' — flat present tense, no `[2026-08-02]` marker… This is now false:
> `src/data/id-stability.test.ts` (43 tests, 9 namespaces) is exactly that detection."*

Also unannotated and now false in present tense, per R-B: `project-status.md:47` ("No linter, no
formatter, no CI"), `:312`, `:318`. R-B notes fairly that §0, §1.1, §2.6, §2.8, §2.9 and §7 **are**
properly refreshed and §2.9's stale bullets correctly fenced as retained originals — *"the defect is
selective, not wholesale."*

**Independently found by R-C as its single material finding** (see below).

### M-4 · MATERIAL — the "four unmet exit criteria" count does not reconcile

> R-B: *"`docs/roadmap.md:27` — '**four exit criteria below remain unmet** and are annotated in place'…
> Observed in the Phase 0 exit-criteria list: **7 bullets, 3 unchecked**… The report's deferred table has
> four rows; its **fourth** — '`fix/**` absent from the CI trigger list' — appears **nowhere in
> `docs/roadmap.md`** and is not an exit criterion. The table's header 'Unmet Phase 0 exit criteria
> (**annotated in `docs/roadmap.md`**)' is false for that row."*

**Clerk's confirmation:** 3 unchecked Phase 0 criteria (`roadmap.md:88, 93, 98`); `fix/**` appears **0**
times in `docs/roadmap.md`.

### M-5 · MATERIAL — "every remediation was mutation-checked" has no recorded evidence for R1–R3b

> R-B: *"`phase-0-closeout-check.md:499-500`, `roadmap.md:78`, `project-status.md:211`, `report.md:158`
> all state it. U7/U8's mutation evidence **is** tabulated (closeout §4, M1–M4, with the exact red
> assertion text). For `a338370`, `ea5b270`, `9e9e15d`, `1792f9f` there is no equivalent record anywhere
> in `docs/`… Under CLAUDE.md §5.1/§5.2 that is an unevidenced verification claim."*

Note for the record: the mutations **were** run during each remediation unit and their red output was
reported in-session, and **R-A independently re-proved the guards go red today**. What is missing is the
*durable record* in `docs/` — which is exactly what §5.2 asks for.

### M-6 · cosmetic — a C-4 conflict named in the original review was not fixed

> R-B: *"C-4: '`roadmap.md:47-48` also still lists `DOMAIN_IS_PURE` promotion as included Phase 0 work,
> which the plan excludes.' Current `docs/roadmap.md:57-58` still lists it as Included work item 6,
> unannotated; item 3 (retroactive tags) and item 7 (vitest `.tsx`) are likewise still stated as included
> despite being U-DEFER-1/-4/-6. Only the exit criteria were reconciled."*

### Dispositions R-B confirmed as accurate

C-1 (Resolved — `git ls-files` discovery verified in code; 0 `* N.*` in the working tree; path outside
Desktop) · C-3 (Resolved — plan reads COMPLETED, DRAFT survives only as an explicitly-quoted historical
record) · C-5 (documented and ratified at `architecture-boundaries.md:117-128`) · C-6 (deferred, recorded
in three places) · C-7 (15 ids, 9 namespaces, counts exact) · C-8 + R3b · C-9/C-10/C-11/C-12 (all
correctly characterised; `[LIVE]` appears 0 times; 0 `.test.tsx`) · C-13 (correctly still open) · the
README refresh · and the closeout report now being linked from both `roadmap.md:33` and `CLAUDE.md` §12.

> R-B's bottom line: *"The **code** side of the closeout is honest: every SHA, every count, every
> guard-test number, the CI conclusion, and the branch/tag/protection facts reproduce exactly against the
> repository. The **documentation** side over-claims in five places, and one of those (M-1) is not a
> wording defect… Of the four originally-blocking findings, C-1 and C-3 are genuinely closed, C-4 is
> substantially but not fully closed, and C-2 is closed only for the copy that was moved."*

---

## R-C — Documentation truth sample: **1 material, 6 cosmetic, out of 30 self-chosen claims**

R-C picked its own sample. **26 of 30 checked out exactly**, including: 524/42; guard counts 28/29; both
guards' `git ls-files` inventory; 19-of-27 hand-authored grades; 12 tables / 12 RLS / 12 policies; 7
migrations; exactly one `TODO`; 23 routes / 20 files / 28 `handle()` sites; 23/23 routes calling
`getUser()`; 15 SSG pages; 89 Playwright tests in 23 files; the 5+2 layer partition; the three
`DOMAIN_IS_PURE` files; all 13 SHAs plus 5 more resolving as ancestors; all 9 namespace names and counts;
the `.bkit`/`playwright-report` removal detail; v12 preceding v11.

### M-1 · MATERIAL — `CLAUDE.md:152` understates its own enforcement

> R-C: *"Claimed: 'Rules 1–3 are enforced today. Rules 4–9 … are **not yet implemented**.' Observed:
> **rule 4 and rule 6 are enforced today.**… This is the repository's **rank-3 authoritative file**
> contradicting three lower-ranked documents that all state the opposite correctly… A reader trusting §4
> would believe two live guards do not exist — and might 'add' them or, worse, treat a real failure as an
> unimplemented rule. §4 rule 5 (domain purity) genuinely *is* unenforced, so the sentence needs
> splitting, not deleting."*

Independently the same defect as R-B's M-3. **Two reviewers on different lenses found it separately.**

### Cosmetic (R-C)

| | Finding |
|---|---|
| M-2 | `project-status.md:26` — branch coverage stated **81.23 %**, observed **81.25 %**. Statements/functions/file-count exact; a transcription slip |
| M-3 | `architecture-boundaries.md:173` — "7 of the **30** `"use client"` components". The 7 is exactly right; the denominator is **31** (or 33 repo-wide), and contradicts `project-status.md:185`'s own "31" |
| M-4 | `CLAUDE.md:297` — `graphify-out/` "~29 MB"; observed **9.1 MB**. Pre-existing, gitignored, regenerable |
| M-5 | `project-status.md:48` LOC figures dated 2026-07-30 and disclosed as such; some drift |
| M-6 | `project-status.md:185` — "import domain engines and seed data **directly**". No client component imports `@/data` directly; the substantive claim holds **transitively** |
| M-7 | `.github/workflows/ci.yml:15` comment says `boundaries.test.ts` "already yields **16** tests"; it yields **28** (non-doc, committed) |

### Redaction claim — **internally consistent; no inconsistency found**

R-C verified without access to the original: line 36 shows the redacted form as described and marked; the
verbatim region boundary is exact (§9 text ends L459, `---` L461, Import note L463); the Import-note table
has exactly one data row; **zero** other `<redacted>` markers inside lines 1–459; no `[snip]`/`[removed]`/
`<elided>`/`XXXX`; a programmatic pipe-count over every table in L1–459 found **zero** row/header
mismatches; heading sequence complete and monotonic.

> R-C: *"Two details actively **support** plausibility rather than merely failing to contradict it: L466
> independently repeats the identical redacted path…, and L326's 'all **22** `src/app/api/**/route.ts`
> files' is **stale relative to today's 23** — exactly what a genuinely unedited 2026-08-01 document
> measured at `bf7ff2e` should say. A sanitized-then-refreshed import would likely have corrected it."*

### Public-repo hygiene of committed docs — **CLEAN**

93 committed files scanned. **Zero** machine-identifying absolute paths (all 5 `/Users/` occurrences are
the `<redacted>` form). **Zero** secret-shaped values — every pattern hit is descriptive prose about the
scan itself or an env-var *name*. CLAUDE.md §12: all 10 rows resolve. §5 baseline matches a fresh run.

One low-severity observation, explicitly **not** a secret and **not** material: a Supabase project-ref
hostname appears in two archived QA docs. A project ref is a public identifier, not a credential; both
docs record it as NXDOMAIN/deleted.

---

## R-D — Repository state and public hygiene: **no discrepancy against the record**

Verified independently: linear chain `bf7ff2e → a338370 → ea5b270 → 9e9e15d → 1792f9f → 0d9e008`; **zero**
merge commits over the whole history (a parent-count sweep found exactly one commit with ≠1 parent — the
root, with 0); **zero** tags locally and on the remote; `origin/main...main` → `0 0`; `git reflog show
origin/main` shows 5 entries, all `update by push`, each a fast-forward child of the prior — **no
rewrite**; all five older Phase 0 SHAs still ancestors of `origin/main`; **15 remote heads** — 9 `feat/*`,
all 4 `fix/*`, `docs/phase-0-closeout`, `main` — **none deleted**.

Both CI runs real, `push`/`main`, `success`, head SHAs matching (`1792f9f`, `0d9e008`), with counts pulled
from the logs matching **exactly in both runs**: 32 / 29 / 28 / 43, 42 files, 524 tests, typecheck ran,
`✓ Compiled successfully`.

Branch protection: `404 Branch not protected`, `rulesets: []`, `"protected": false` — **the record's claim
verified**. CI push triggers are `main` and `feat/**` only; `fix/**` and `docs/**` absent — verified, and
confirmed in practice by five `workflow_dispatch` runs.

Secret scan of 381 tracked files: **zero real secret values**; `.env`, `.env*.local`, `storageState*.json`,
`*.auth.json` not tracked and actively ignored; `.env.example` values all empty. **Zero `* N.*` files in
this tree.** Repository **PUBLIC**, `licenseInfo: null`, no LICENSE tracked.

Local re-run by R-D: `tsc --noEmit` exit 0 · `vitest run` **524/524 across 42** · `npm run build` exit 0.

> R-D: *"**Discrepancies against the published record: None.** … The record does not overclaim; where the
> posture is weak (unprotected main, advisory CI, manual dispatch for `fix/*`), it says so."*

R-D flags as material within its lens, and not as a discrepancy: **a PUBLIC repository with no LICENSE is
"all rights reserved" by default** — no one may legally copy, modify or reuse it. That is C-13, still open.

---

## Follow-up register

Carried forward, unchanged unless noted.

| ID | Item | Status |
|---|---|---|
| **C-2** | The pre-relocation Desktop clone is still live, points at the same public remote, and now holds **141** `* N.*` duplicates. C-2's steps 2–3 were never performed | **Re-opened** by this Check (R-B M-1) |
| **C-4** | `CLAUDE.md:152` and `project-status.md` §2.5/§6 still carry stale present-tense claims C-4 named by line | **Re-opened** (R-B M-3, R-C M-1) |
| **C-5** | `NO_UI_IMPORT` enforced without plan authorization — documented and ratified | Open (documented) |
| **C-6** | No branch protection; CI not a required status. Verified 404 | Deferred (U-DEFER-3) |
| **C-9** | No `[LIVE]` tag on `E2E_LIVE`-gated Playwright blocks — verified 0 occurrences | Open |
| **C-10** | Unrecorded staging decision for `docs/archive/2026-07/evidence-disclosure/**` | Open |
| **C-11** | Tree-partition ignores loose files and symlinks | Open (latent) |
| **C-13** | No LICENSE on a PUBLIC repo — verified `licenseInfo: null`. **Needs a user decision** | Open |
| **F3** | `NOT_CONFIGURED` classified by substring; bounded to 3 hand-authored throw sites today | Open |
| **F5** | Correlation ID emitted but unsurfaced in any UI | Open |
| **F6** | No route-level reachability test for the four fixed handlers | Open |
| **F7** | Destructured-handler bodies and two-arg `.then` undetected — **R-A confirmed both behave exactly as documented** | Open (documented) |
| — | Supplement slug policy unstated | Open |
| — | `boundaries.test.ts` header claim→observed pass | Recommended |
| — | Two unimported Desktop feature docs (`context-adjusted-evidence.plan.md`, `evidence-grading.design.md`) | Open, annotated in `roadmap.md` |
| — | `fix/**` and `docs/**` absent from CI push triggers | Open — **not** an exit criterion, and not annotated in `roadmap.md` (R-B M-4) |
| — | Mutation evidence for R1–R3b not durably recorded in `docs/` | **New** (R-B M-5) |
| — | Roadmap "Included work" items 3, 6, 7 still listed as Phase 0 scope despite U-DEFER-1/-4/-6 | **New** (R-B M-6) |
| — | Cosmetic doc corrections: coverage 81.23→81.25; "30" client components→31; graphify-out size; `ci.yml:15` "16 tests"→28 | **New** (R-C M-2/3/4/7) |
| **CK-1** | Untracked, un-ignored `.obsidian/` (5 files) in the current tree — `git add -A` would publish it. C-2's class, new vector | **New** (clerk) |

---

## Clerk finding — observed during this Check's own verification

### CK-1 · MATERIAL — the C-2 defect class is live in the **current** working tree, not only the old clone

While running this Check's final scope verification, `git status` reported an untracked `.obsidian/`
directory that no reviewer saw and that the clerk did not create (mtime 2026-08-03 03:19 — an editor
artifact). Observed:

```
.obsidian/{workspace,app,core-plugins,graph,appearance}.json   — 5 files
git check-ignore -v .obsidian                                  — no match: NOT ignored
git add -A --dry-run                                           — stages all 5
```

This is C-2's defect class exactly: **untracked machine-local files, not covered by `.gitignore`, that a
single `git add -A` would publish to a public default branch.** R-B and R-D each correctly reported "zero
`* N.*` files in this tree" — that is true, and this is a different vector past the same gap. U1's ignore
hardening (`4337a24`) enumerates known artifact directories; it does not cover editor state it had never
seen.

Nothing was deleted or ignored in response — that is a user decision, not a Check action. Recorded here
so the disposition is deliberate. It reinforces, rather than merely repeating, R-B's M-1: the underlying
weakness C-2 identified is a *standing* hygiene gap, and relocation addressed one instance of it.

---

## Process note

Two procedural observations, recorded because this Check exists to be honest about itself:

1. **The orchestrator's charge to R-B omitted the standing prohibition** on running git commands in the
   old Desktop directory, which earlier units had imposed. R-B ran `git status` there. It was read-only
   and modified nothing, and it produced this Check's most consequential finding — but the omission was
   the clerk's error, not the reviewer's. The clerk's own confirmation of M-1 used filesystem reads only.
2. **R-C's injected `CLAUDE.md` context was a stale copy** showing the pre-Phase-0 baseline. R-C detected
   this itself and measured every finding against the on-disk file at the target SHA.

## What would close Phase 0

The code is not in question. Closing requires the record to become true:

1. Resolve **C-2 properly** — delete the 141 strays in the Desktop clone and re-verify, or remove that
   clone; then correct the "Resolved by relocation" disposition to describe what was actually done. Decide
   the disposition of `.obsidian/` in this tree (CK-1) — ignore it or remove it.
2. Fix `CLAUDE.md:152` (split rules 4 and 6 out as enforced) and the unannotated present-tense claims in
   `docs/project-status.md` §2.5 and §6.
3. Either state the public-history caveat in `docs/project-status.md` or correct the addendum's citation.
4. Reconcile the "four unmet exit criteria" count and the `fix/**` row's "annotated in roadmap" header.
5. Record the R1–R3b mutation evidence in `docs/`, or narrow the claim to what is evidenced.
6. Re-run this Check.

---
---

# Re-check (2026-08-03) — target `36a8911`

> **Date run:** 2026-08-03
> **Target:** `main` @ `36a891169bf89c0da2b79aac288ad3c49419fdc4` (= `origin/main`, 0 ahead / 0 behind)
> **Subject:** commit `36a8911` — `chore(phase-0): correct closeout record and neutralize legacy hazards`,
> the remediation of the six findings above.
> **Method:** one independent read-only reviewer, dispatched with the same framing as the first pass —
> *every published document is a claim under test; re-prove anything a document says is resolved.* The
> reviewer was constrained to filesystem reads only for M-1 (no git command with the retired clone as cwd
> or `-C` target). The orchestrator again acted as **clerk, not judge**: it performed the `36a8911`
> corrections and therefore did not certify them. Findings are transcribed as reported; none was softened.
> Absolute machine paths are normalized to the repository's `<redacted>` convention, and the personal email
> address is referred to but never reproduced — the same self-reference guard the register row uses.
>
> **Everything above this line is the first-pass Check of 2026-08-02 against `0d9e008`, preserved
> verbatim as a historical verdict.** It has not been edited, and its NOT CLOSED verdict stands as the
> record of that date.

---

## VERDICT: **PHASE 0 NOT CLOSED**

**Reason:** three of the six findings are properly closed and independently re-proved. But by the standard
this Check set for itself — *a material finding that falsifies a published claim forces NOT CLOSED even
when the code is fine* — the record is still not true. **M-4's primary falsified sentence is untouched**,
**M-5 was narrowed in one of four places**, and **N-1 is a new false claim manufactured by the corrections
themselves**: `docs/project-status.md` now tells a reader that this repository's root is the retired,
remote-less clone.

The code and repository state are again not in question, and reproduce exactly.

---

## 1. Finding-by-finding closure

| Finding | Prior status | Observed now on `36a8911` | Disposition |
|---|---|---|---|
| **M-1** | MATERIAL — Desktop clone live on the same public remote, 141 duplicates | Folder renamed `RETIRED-v1.0`; `.git/config` has **no `[remote]` section and no `url` line**; `.git/refs/remotes/` empty; no `packed-refs`. 141 duplicates remain but the clone can reach no remote. | **CLOSED** |
| **M-2** | MATERIAL — addendum cited `project-status.md` for a caveat that was absent | Caveat now genuinely present at `docs/project-status.md:39–52` (§0.1); the citation was simultaneously narrowed to "§0.1". Both halves true. | **CLOSED** |
| **M-3** | MATERIAL — stale present-tense claims C-4 named by line | `CLAUDE.md` §4 replaced with a per-rule enforcement table correctly marking rules 4 and 6 **Enforced**; independently confirmed against `boundaries.test.ts`. All three `project-status.md` sites annotated. | **CLOSED** |
| **M-4** | MATERIAL — "four unmet exit criteria" does not reconcile | Report side fixed (table now 3 rows, header corrected, `fix/**` moved to follow-ups). **`docs/roadmap.md:27` still reads "four exit criteria below remain unmet"** against a list of 7 bullets with 3 unchecked. | **PARTIALLY CLOSED** |
| **M-5** | MATERIAL — "every remediation was mutation-checked" unevidenced for R1–R3b | Report §6 honestly narrowed and explicitly labels R1–R3b self-reported. **Three of the four locations the finding named still carry the unqualified claim**, plus a fourth in the same report's §1. | **PARTIALLY CLOSED** |
| **CK-1** | MATERIAL — untracked, un-ignored `.obsidian/` | `.gitignore:88` now ignores `/.obsidian/`, `/.idea/`, `/.vscode/`. `git check-ignore -v .obsidian` matches. `git add -A --dry-run` stages exactly one path — the expected Check document. | **CLOSED** |

### M-1 — CLOSED

Verified by filesystem reads only; no git command was run with that directory as cwd or `-C` target.

```
test -e ~/Desktop/…/Supplement-Advisor/v1.0          → v1.0 ABSENT
test -e ~/Desktop/…/Supplement-Advisor/RETIRED-v1.0  → RETIRED-v1.0 EXISTS
grep -n "url" …/.git/config                          → (none in config)
grep -n "github.com|remote \"" …/.git/config         → (no remote/url lines)
ls -la …/.git/refs/remotes                           → empty directory
test -e …/.git/packed-refs                           → NO
ls -la …/.git/logs/refs/remotes                      → empty directory
grep -n "insteadOf|url|pushDefault|remote" ~/.gitconfig → (no rewrite / remote)
find …/RETIRED-v1.0 -name '* [0-9].*' … | wc -l      → 141
cat …/.git/HEAD                                      → ref: refs/heads/main
```

> **Judgment on the actual hazard.** The hazard C-2 named was publication: a `git add -A` followed by a
> push reaching the public branch. That path is severed. The config carries no remote URL, `refs/remotes/`
> and `logs/refs/remotes/` are empty, there is no `packed-refs` to hold a stale `refs/remotes/origin/*`,
> and the global config declares no `url.*.insteadOf` rewrite or default push remote that could resurrect
> one. A `git push` in that directory now fails with "no configured push destination"; `git add -A` stages
> into a repository that has nowhere to send them. A residual `FETCH_HEAD` records the old fetch URL as
> historical text — it is not a remote configuration and git does not push to it.
>
> The published record describes this accurately and does not overstate it: the report §2 states in terms
> that the 141 duplicates "still exist … and are left in place pending manual deletion", that this "is
> neutralization, not deletion", and that the earlier "Resolved by relocation" claim "was not" precise.
> The closeout-check C-2 row was downgraded from **Resolved** to **Partly resolved** with the
> falsification recorded in the row itself.

This is the strongest work in the commit — precise enough that the reviewer could have falsified it had it
been wrong.

### M-2 — CLOSED

```
grep -n "fetchable|untracking is not removal|permanently|rewrite|30f74e1" docs/project-status.md
41:**Untracking is not removal.** `30f74e1` is an ancestor of `origin/main` and still contains
43:paths at `bf7ff2e` did not delete them from history — they remain **permanently fetchable** from the
```

> `docs/project-status.md:39` now carries a dedicated heading, `### 0.1 Public-history caveat —
> **[2026-08-02]**`, with the full caveat: the untracked-but-still-in-history artifacts, the deliberate
> no-rewrite decision, the "no secret values on any ref" scan result, and the "no rotation required"
> conclusion. The addendum's citation was tightened in the same commit to `docs/04-report/…report.md` §4
> **and** `docs/project-status.md` §0.1 — both of which now resolve to real content.

### M-3 — CLOSED

The reviewer verified the new enforcement table against the implementation rather than against its own
assertion:

```
392:  it("partitions every top-level src/ directory into scanned or exempt", () => {
406:    expect(actual).toEqual([...SCANNED_LAYERS, ...Object.keys(EXEMPT_LAYERS)].sort());
411:      expect(reason.length, `${layer} exemption reason is too thin`).toBeGreaterThan(40);
630:  it("B4: src/data is a leaf over src/types", () => {
634:  it("B4b: src/data depends on no external package", () => {
```

> Rule 4 is enforced by B4/B4b at lines 630 and 634. Rule 6 is enforced by the tree-partition test at line
> 392, which derives the actual layer set from `TRACKED_SRC_PATHS`, asserts equality against
> `SCANNED_LAYERS ∪ EXEMPT_LAYERS`, and — line 411 — asserts each exemption's written reason exceeds 40
> characters. The table's other rows check out too: rule 5 is genuinely absent from the file, and B5 exists
> at line 638 as the table's footnote states.
>
> The `project-status.md` sites are annotated rather than rewritten, which is the correct treatment under
> `CLAUDE.md` §7: `:60` — "No linter, no formatter. **[2026-08-02]** CI now exists"; `:176-181` — a
> `**[2026-08-02] Detection now exists.**` block naming `src/data/id-stability.test.ts` and explicitly
> partitioning the original claim; `:335-338`/`:349-350` — a dated blockquote closing the three
> enforcement gaps.
>
> I record one reservation, not a finding: at `:182` the original bullet's literal words "No detection, no
> test." remain un-struck below the annotation. The annotation immediately above disclaims it by name, so
> a reader is not misled, but strike-through (as used at `:349`) would have been the stronger form.

### M-4 — PARTIALLY CLOSED

The report half is fixed. The roadmap half — where the finding located the false claim — is not.

```
sed -n '27p' docs/roadmap.md
  "Complete with follow-up" is deliberate: **four exit criteria below remain unmet** and are annotated
grep -c '^- \[' (Phase 0 exit-criteria list)   → 7
grep -c '^- \[ \]' (same list)                 → 3
sed -n '110p' docs/roadmap.md
  > **On the three unmet criteria.** …
```

> Seven bullets, three unchecked, and line 27 still says four. The corrections commit *did* edit this
> list's trailing note — `git show 36a8911 -- docs/roadmap.md` shows `> **On the four unmet criteria.**`
> changed to `> **On the three unmet criteria.**` at line 110 — and added a paragraph stating the `fix/**`
> gap "is **not** one of these". The headline sentence 83 lines above it was left untouched. The document
> now contradicts itself internally: line 27 says four, line 110 says three.
>
> The report's side is genuinely closed. Its table header now reads "Unmet Phase 0 exit criteria —
> **three**, each annotated in `docs/roadmap.md`", the table has exactly three rows, the `fix/**` row was
> moved to the follow-up register at `:170`, and a note at `:141-143` records the correction and
> attributes it to Check finding M-4.
>
> **Net:** the specific published sentence M-4 falsified is still standing on `main`, unqualified and
> undated.

### M-5 — PARTIALLY CLOSED

> Report §6 was rewritten into what is, on its own, a model correction. It distinguishes U7/U8 (tabulated
> in the closeout check §4 with exact red assertion text, by an independent reviewer) from R1/R2/R3/R3b
> (*"mutations were run … but **were not independently preserved in `docs/`**. Treat those in-unit claims
> as self-reported."*), records that the final Check's re-execution exists but is unpublished, and closes
> with *"No mutation evidence has been reconstructed retroactively, and none is cited from a document that
> does not yet contain it."*
>
> But M-5 named four locations, and three still carry the unqualified claim, none annotated or
> cross-referenced to §6:

```
docs/project-status.md:234   … Every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked —
docs/roadmap.md:84           … every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked as required.)*
docs/reviews/phase-0-closeout-check.md:499
                             Every remediation below was mutation-checked — each guard was shown red …
docs/04-report/…report.md:26 … and each was mutation-checked.
```

> `closeout-check.md:499` is verbatim the sentence M-5 quoted, and it heads the table that lists
> R1/R2/R3/R3b. `project-status.md:234` and `roadmap.md:84` both enumerate R1–R3b by name.
> `report.md:26` — the report's own Outcome paragraph — says "each was mutation-checked" of three specs,
> one of which (`error-disclosure.test.ts`) is the R3b artifact §6 later declares unevidenced; the
> document corrects itself 157 lines later, which mitigates but does not remove the over-claim at the top.
>
> **Net:** the claim is narrowed in one place and still standing in four.

### CK-1 — CLOSED

```
git check-ignore -v .obsidian    → .gitignore:88:/.obsidian/	.obsidian   (exit 0)
git add -A --dry-run             → add 'docs/05-qa/phase-0-final-check.md'   (that file only)
```

> The five `.obsidian/*.json` files still exist on disk (correctly — deletion is a user decision) but are
> now unstageable. The fix generalizes beyond the single instance to `/.idea/` and `/.vscode/`, and the
> comment records the finding that motivated it. **No other untracked, un-ignored path exists**:
> `git add -A --dry-run` stages exactly one file, the expected Check document.

---

## 2. Spot-check — five self-chosen published claims

| # | Claim | Location | Observed | Verdict |
|---|---|---|---|---|
| S-1 | Personal email in **52** tracked files, **47** under `docs/archive/2026-06/**`, present since `910d773`, author email on **2 of 30** commits | `docs/04-report/…report.md:171` | 52 ✓ · 47 ✓ · 19 files at `910d773` ✓ · 2 commits ✓, but **31** commits at HEAD | **MISMATCH** (denominator only) |
| S-2 | Client-component rule "would fail on 7 of the 31 `"use client"` modules under `src/components`" | `docs/02-design/architecture-boundaries.md:173` | 31 under `src/components`, 33 repo-wide, exactly 7 importing `@/lib/*` or `@/data` | **MATCH** |
| S-3 | Imported plan byte-identical, 399 lines, sha `c5ec657f…`, zero redactions; `evidence-grading.design.md` byte-identical to the archived copy | `docs/roadmap.md:295-308` | 399 lines ✓ · sha1 `c5ec657f578633e2…` ✓ · sha256 identical to source copy ✓ · zero path/email/secret hits ✓ · design doc sha256 `b810376d…` identical to archive ✓ | **MATCH** |
| S-4 | Report §6: "`docs/05-qa/phase-0-final-check.md` on `main` is still the scaffold and reads 'Status: NOT RUN'" | `docs/04-report/…report.md:191-193` | `git show 36a8911:…` → line 1 `# Phase 0 — Final Independent Check (scaffold)`, line 3 `> **Status: NOT RUN.**` | **MATCH** |
| S-5 | LICENSE decided and recorded: copyright 2026 Ben Hwang, all rights reserved, source-visible; C-13 "Resolved 2026-08-02" | `docs/reviews/phase-0-closeout-check.md:517`, `README.md`, `LICENSE` | `LICENSE` tracked, 26 lines, matches; README §Licence present; `gh repo view` → `licenseInfo: {"key":"other","name":"Other"}` (was `null`) | **MATCH** |

> **S-1 arithmetic, in full.** 52 tracked files; 47 under `docs/archive/2026-06/**`, distributed 4–5 per
> feature directory across eleven directories; 19 files at `910d773`, so "in tracked content since the
> initial commit" holds; 29 noreply / 2 personal author emails. The row's self-referential guard works: it
> does not reproduce the address, so **52 is still 52 with the row in the tree** — verified by counting on
> `main` @ `36a8911`, which includes the row. The one slip is the denominator: `git rev-list --count HEAD`
> → **31**; `git rev-list --count 36a8911^` → **30**. The row was measured against the parent and shipped
> inside the commit that made it 31 — the identical self-reference trap it successfully avoided for the
> file count.
>
> **S-3 note.** The report writes the digest as `sha` without naming the algorithm. It is plain SHA-1 of
> the file content, not the git blob hash (`git hash-object` → `613838f0…`) — worth stating since the two
> are easily confused in a git context.

---

## 3. Repository state — no discrepancy

```
git rev-list --merges --count HEAD                     → 0
git rev-parse main origin/main HEAD                    → all three = 36a8911…
git rev-list --left-right --count main...origin/main   → 0	0
git tag | wc -l                                        → 0
git ls-remote --tags origin | wc -l                    → 0
git ls-remote --heads origin | wc -l                   → 16
npx tsc --noEmit                                       → exit 0
npx vitest run                                         → 42 files / 524 tests passed
find . -name '* [0-9].*' (excl. node_modules,.git)     → 0
gh repo view --json visibility,licenseInfo             → PUBLIC, {"key":"other","name":"Other"}
gh api …/branches/main/protection                      → 404 Branch not protected
```

Chain from the target: `77b3c36 → bf7ff2e → a338370 → ea5b270 → 9e9e15d → 1792f9f → 0d9e008 → 36a8911`,
single-file graph, no branching.

> A parent-count sweep over `--all` found one 2-parent object, `98125d8`. It resolves to `refs/stash` —
> the unpublished Check result — is not an ancestor of `main`, and is reachable from no remote ref. It is
> a local stash entry, not history. **The published history contains zero merge commits.** This also
> reconciles the first pass's R-D sweep, which found exactly one ≠1-parent object (the root): R-D scanned
> `HEAD`, and the stash was created after that scan.

**Both CI runs real and green**, each carrying the exact target SHA:

| Run | Event | Branch | Head SHA | Counts | Conclusion |
|---|---|---|---|---|---|
| [`30786518114`](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30786518114) | `workflow_dispatch` | `chore/phase-0-close-corrections` | `36a8911` | 42 files / 524 tests · 32 / 29 / 28 / 43 · `tsc --noEmit` · `✓ Compiled successfully` | **success** |
| [`30786762245`](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30786762245) | `push` | `main` | `36a8911` | identical | **success** |

Zero secret-shaped values in 381 tracked files. *(Clerk correction, 2026-08-03: **383** at this section's
target `36a8911` — 381 is the first pass's figure at `0d9e008`, and `36a8911` added `LICENSE` and the
imported plan doc. The security conclusion is unaffected; see certification finding **D-3**.)*
`.env.example` values all empty. Zero sync-conflict
duplicates in this tree.

---

## 4. New findings

### N-1 · MATERIAL — `project-status.md` now states the wrong repository root, and the error was introduced by the corrections commit

`docs/project-status.md:58` reads:

> `- The git repository root **is** the application directory (…/Supplement-Advisor/RETIRED-v1.0 (renamed 2026-08-02; was v1.0)). It holds the authoritative CLAUDE.md, docs/, src/, …`

This is false. The repository whose root that sentence describes — the one holding the authoritative
`CLAUDE.md`, `docs/`, `src/` — is at `<redacted>/Developer/supplement-stack-intelligence`.
`…/Supplement-Advisor/RETIRED-v1.0` is the **retired, remote-less clone** that M-1 was about.

> `git show 36a8911 -- docs/project-status.md` shows the edit that produced it: the path token was updated
> in place from `v1.0` to `RETIRED-v1.0` while the surrounding present-tense sentence was left alone,
> converting a merely stale statement into an actively wrong one that points a reader at the decommissioned
> directory.
>
> `project-status.md` names the repository root exactly once, and that one place is now wrong. Nothing in
> the file records the actual current path. Two other documents (`report.md:68,70`,
> `closeout-check.md:505`) use `RETIRED-v1.0` correctly, so the corrected record contradicts itself. This
> is the same class as M-1/M-3 — a present-tense factual claim in a governing document that does not match
> the repository — introduced by the commit that was meant to eliminate that class.

Secondary, cosmetic: the replacement nests backticks inside a code span, which does not render as intended
in any Markdown renderer.

### N-2 · MATERIAL (record accuracy) — `roadmap.md` says the final Check "has not yet been run" in the same commit whose report says it ran

`docs/roadmap.md:28-29`: *"The independent final Check **has not yet been run** — it is scaffolded at
`docs/05-qa/phase-0-final-check.md`."*

`docs/04-report/…report.md:191-193`, in the same commit: *"**Independent re-execution — performed, not yet
published.** The 2026-08-02 final Check ran four fresh mutations in a disposable worktree…"* And
`docs/reviews/phase-0-closeout-check.md:505`, also in the same commit, cites the Check by its findings:
*"which the 2026-08-02 independent Check falsified."* The `.gitignore` comment attributes its own existence
to "Phase 0 Check finding CK-1".

> The Check ran on 2026-08-02 and produced the six findings this commit exists to answer. The report states
> the distinction correctly — *run, not yet published*. The roadmap states it incorrectly — *not yet run*.
> This is not a stale line the corrections missed by inattention: line 27, immediately above it, is the M-4
> defect, so the corrections engaged this exact paragraph's neighbourhood and left both sentences wrong.

### N-3 · cosmetic — "2 of 30 commits" is 2 of 31

Detailed under S-1. Measured against the parent, shipped inside the commit that changed it.

### N-4 · cosmetic — dating drift between the documents and the commit

> The commit is authored `Mon Aug 3 14:11:52 2026 +0900`. Its content dates itself variously: `.gitignore`
> says "Added 2026-08-02"; the C-13 row says "Resolved 2026-08-02"; the `project-status.md` annotations say
> `[2026-08-02]`; the email row says "Decision 2026-08-03". Some of this is legitimate (work performed on
> the 2nd, committed on the 3rd), but "Added 2026-08-02" on a line added on the 3rd is not accurate.
> Recorded as an observation, not a defect.

### First-pass cosmetic follow-ups — status

Of the four cosmetic corrections the first pass recorded (R-C M-2/3/4/7), one was made:

| Item | Status |
|---|---|
| `architecture-boundaries.md` "30" client components → **31** | **Fixed** in `36a8911` |
| `project-status.md:26` branch coverage 81.23 % → 81.25 % | Unchanged |
| `CLAUDE.md:311` `graphify-out/` "~29 MB" | Unchanged — now measures **13 MB** (was 9.1 MB at the first pass; the figure drifts, and the stated value is wrong in both directions) |
| `.github/workflows/ci.yml:15` "already yields 16 tests" | Unchanged — the file yields **28** |

All four are honestly carried in this document's follow-up register, so they are follow-up, not blockers.

---

## 5. Clerk's independent confirmation

The clerk re-ran the reviewer's four most consequential claims rather than accepting them:

| Claim | Command | Observed | Confirmed |
|---|---|---|---|
| N-1 — wrong repo root | `sed -n '58p' docs/project-status.md` vs `git rev-parse --show-toplevel` | Doc says `…/RETIRED-v1.0`; actual root is `<redacted>/Developer/supplement-stack-intelligence` | **Yes** |
| N-2 — "has not yet been run" | `sed -n '28p' docs/roadmap.md` | *"The independent final Check has not yet been run"* | **Yes** |
| M-4 — roadmap:27 untouched | `sed -n '27p'` + bullet counts | Line 27 says "four"; list has 7 bullets / 3 unchecked; line 110 says "three" | **Yes** |
| M-5 — four standing claims | `grep -rn "mutation-check" docs/` | `roadmap.md:84`, `project-status.md:234`, `closeout-check.md:499`, `report.md:26` all standing unqualified | **Yes** |

Commit count independently confirmed: `git rev-list --count HEAD` → 31, `36a8911^` → 30.

---

## 6. What would close Phase 0

The code is not in question, and has not been at any point in this Check. Closing requires the record to
become true — four edits and a re-run:

1. **`docs/roadmap.md:27`** — "four exit criteria below remain unmet" → **three**, reconciling it with
   line 110 and with the report's corrected table (M-4).
2. **`docs/roadmap.md:28`** — "The independent final Check has not yet been run" → run 2026-08-02,
   published 2026-08-03, with a pointer to this document (N-2).
3. **`docs/project-status.md:58`** — name the actual repository root, and stop describing the retired
   clone as the application directory. Fix the nested-backtick code span while there (N-1).
4. **The three standing "mutation-checked" claims** — `roadmap.md:84`, `project-status.md:234`,
   `closeout-check.md:499`, plus `report.md:26` — qualify each, or cross-reference the report's §6 which
   already states honestly what is and is not evidenced (M-5).
5. **Re-run this Check** against the resulting commit.

Optionally, in the same pass: the four first-pass cosmetics (coverage 81.25, graphify-out size,
`ci.yml:15` "16 tests" → 28, "2 of 31"), none of which blocks.

**No code change is required, and none should be made.**

---
---

# Final certification (2026-08-03) — the tree published in this commit

> **Reviewer posture:** independent, read-only. No edit, stage, commit, checkout, stash, merge or push
> was performed. Every document was read from the **working tree**, not from git HEAD. M-1 was verified
> by filesystem reads only — no git command was run with the retired clone as cwd or as a `-C` target.
> **Target:** `main` @ `36a8911` **plus the nine uncommitted modifications that this commit contains.**
> The certified tree is therefore published *in the very commit carrying this section*, and the target
> SHA is that commit itself. No CI run can carry that SHA at the time of writing; the reviewer verified
> typecheck, the full suite and the production build locally against the exact tree, and the repository's
> own rule — the authoritative result for a commit is the `push`/`main` run carrying its SHA — is where
> it is confirmed.
> **Framing:** every published document treated as a claim under test; anything a document called
> resolved was re-proved from the repository.

## VERDICT: **PHASE 0 COMPLETE WITH FOLLOW-UP**

## 1. Eight-finding closure — all CLOSED

| Finding | Disposition |
|---|---|
| **M-1** — retired legacy clone could still reach the public remote | **CLOSED** |
| **M-2** — public-history caveat absent; addendum citation false | **CLOSED** |
| **M-3** — `CLAUDE.md` §4 enforcement claims stale | **CLOSED** |
| **M-4** — "four unmet exit criteria" does not reconcile | **CLOSED** |
| **M-5** — unqualified "mutation-checked" over-claims | **CLOSED** |
| **CK-1** — untracked, un-ignored `.obsidian/` | **CLOSED** |
| **N-1** — `project-status.md` named the retired clone as the repository root | **CLOSED** |
| **N-2** — documents asserting the final Check had not been run | **CLOSED** |

**M-1.** `.git/config` shows **no `[remote …]` section and no `url` line** — only `[core]` and ten
`[branch …]` sections carrying `vscode-merge-base` alone, with no `remote =` or `merge =` key, so no
branch can resolve a push destination. `refs/remotes` is an **empty directory**; no `packed-refs`; no
`logs/refs/remotes`. `~/.gitconfig` declares no `url.*.insteadOf`, no `pushDefault`, no `[remote]`. 141
duplicates, exactly as published. The residual `FETCH_HEAD`/`ORIG_HEAD` record the old URL as historical
text — git does not push to them. *"The publication hazard C-2 named is severed: `git add -A` there
stages into a repository with nowhere to send."* Confirmed to be the only `.git` directory anywhere under
`~/Desktop/Claude-Projects`.

**M-2.** Caveat present at `docs/project-status.md` §0.1, with the artifacts named individually, the
no-rewrite decision, the "no secret values on any ref" result and "No rotation is required." The citation
resolves. Re-proved independently: `bf7ff2e` deletes exactly `.bkit-memory.json`, eight `.bkit/**` files
and two `test-results*/.last-run.json`; `30f74e1` is an ancestor of `origin/main`.

**M-3.** The enforcement table was **re-derived rule by rule from `boundaries.test.ts`**, not accepted:
rule 1 → B1 (`:614`); rule 2 → B2/B2b (`:618`, `:622`); rule 3 → B3 (`:626`); rule 4 → B4/B4b (`:630`,
`:634`); **rule 5 → `DOMAIN_IS_PURE` absent from the file entirely, correctly "not enforced"**; rule 6 →
tree-partition (`:392`) deriving the layer set from `TRACKED_SRC_PATHS` and asserting each exemption's
reason exceeds 40 characters (`:411`); rules 7–9 → no mechanical rule, correct as stated; B5 at `:638`,
correctly footnoted as enforced-but-unnumbered. Correct in all nine rows plus the footnote.

**M-4.** Recounted: **7 bullets, 4 checked, 3 unchecked.** Headline (`roadmap.md:27`), list, and trailing
note (`:117`) all agree on **three**; the report's §5 header says three and its table has three rows; and
the header's "annotated in `docs/roadmap.md`" is **true for every row** — U-DEFER-1, U-DEFER-3/C-6 and
U-DEFER-4/C-12 each verified in place. The `fix/**` gap is correctly held out and registered as a
follow-up. No "four" survives outside this document's own historical quotations.

**M-5.** All four named sites now qualified **and** cross-referenced, with both targets verified to exist
and say what is claimed: report §6 distinguishes U7/U8 (tabulated by an independent reviewer) from
R1–R3b (self-reported in-unit); reviewer **R-A** exists in this document and records *"Four mutations,
all RED with site-naming failures."* The remaining `mutation-check` hits are forward-looking
requirements, not completion claims.

**CK-1.** `git check-ignore -v .obsidian` → `.gitignore:88`. `git add -A --dry-run` stages **exactly the
nine expected modified tracked files** and nothing else; `git status --untracked-files=all` returns no
`??` entry. The ignore generalizes to `/.idea/` and `/.vscode/` with its motivating finding recorded.

**N-1.** `git rev-parse --show-toplevel` matches the document exactly; the mangled nested-backtick span
is gone; the retired clone is described separately and accurately, and every element of that description
is independently true per the M-1 evidence. The document no longer contradicts the report or the
closeout check.

**N-2.** A corpus-wide grep for "has not been run" / "not yet run" / "NOT RUN" returns only unrelated
matter. The roadmap, the report **header**, and the closeout addendum's closing section all now state the
Check ran 2026-08-02, with the addendum preserving its superseded wording and the reason, per §7.

## 2. Ten-claim spot-check — 8 MATCH, 2 MISMATCH

| # | Claim | Verdict |
|---|---|---|
| 1 | Coverage: 200 files, 47.68 / 81.25 / 69.85, "re-measured unchanged", "mis-transcribed" | **MISMATCH** → D-2 |
| 2 | "Zero secret-shaped values in **381** tracked files" at target `36a8911` | **MISMATCH** → D-3 |
| 3 | Personal-email row: 52 files, 47 archive, since `910d773`, 2 commits both ancestors of `1792f9f` | **MATCH** |
| 4 | "7 of the 31 `"use client"` modules under `src/components`" | **MATCH** |
| 5 | Imported plan: 399 lines, SHA-1 `c5ec657f…`, blob hash distinguished, zero redactions | **MATCH** |
| 6 | Nine manifest namespaces and all nine counts (15/21/13/15/27/20/30/18/11) | **MATCH** |
| 7 | `bf7ff2e` removals; `playwright-report/` never tracked on any ref | **MATCH** |
| 8 | "v12 `51d2134` precedes v11 `d89cf1c`" | **MATCH** |
| 9 | Domain-purity file lists — three for `@/lib/db`, five more for `@/lib/supabase`/`next/*` | **MATCH** |
| 10 | LOC figures ×5, exactly one `TODO` at `src/types/stack.ts:56`, 7 migrations, 23 routes | **MATCH** |

Also confirmed: **17 of 23** Playwright specs reference `E2E_LIVE` and **zero** carry a `[LIVE]` tag —
C-9 correctly open. `vitest.config.ts` is `environment: "node"`, `include: ["src/**/*.test.ts"]` —
U-DEFER-4 / C-12 exactly as annotated.

## 3. Repository and build state

```
git rev-parse main origin/main HEAD    → all three 36a8911…
git rev-list --left-right --count main...origin/main  → 0	0
git log --merges | wc -l               → 0        (zero merge commits)
git rev-list --count main              → 31
git tag | wc -l                        → 0        (0 remote tags)
git ls-remote --heads origin | wc -l   → 16
npx tsc --noEmit                       → exit 0
npx vitest run                         → 42 files / 524 tests  (32 / 29 / 28 / 43)
npx next build                         → exit 0, ✓ Compiled successfully, 15 pages prerendered
```

| CI run | Event | Branch | Head SHA | Conclusion |
|---|---|---|---|---|
| [`30786518114`](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30786518114) | `workflow_dispatch` | `chore/phase-0-close-corrections` | `36a8911` | **success** |
| [`30786762245`](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30786762245) | `push` | `main` | `36a8911` | **success** |

Log-extracted counts match every published figure: 42 files, 524 tests, 32 / 29 / 28 / 43,
`✓ Compiled successfully`.

**`.github/workflows/ci.yml` edit verified COMMENT-ONLY.** Stripping every line whose first non-whitespace
character is `#` from both the working-tree file and `git show HEAD:.github/workflows/ci.yml` yields
**byte-identical** remainders. Triggers, permissions and all four steps unchanged. CI behavior is
unchanged.

**Security.** 383 tracked files. The secret sweep returns exactly one file — `phase-0-closeout-check.md`,
where the *scan-pattern prefixes themselves* are quoted in prose. **Zero real secret values.**
`.env.example` values all empty. Repo **PUBLIC**; `licenseInfo {"key":"other"}`; `LICENSE` tracked, 26
lines. `main` unprotected (404), exactly as five documents state. **Zero changes under `src/`.**

## 4. New findings — four, none material

The reviewer's method: *"diffing all nine working-tree files against HEAD line by line; re-deriving every
numeric claim from the repository rather than from prose; sweeping the whole non-archive corpus for
present-tense branch- and tag-existence claims; cross-reading each document against its cited counterpart
for contradiction; and re-running the coverage command five times when its first result disagreed."*

| ID | Finding | Class | Disposition in this commit |
|---|---|---|---|
| **D-1** | `report.md` §5's U-DEFER-1 row carried an undated "9 remote `feat/*`" that the imminent branch cleanup would falsify | follow-up, time-sensitive | **Fixed in this commit** — date-anchored and forward-referenced, matching its two correctly-handled siblings |
| **D-2** | Branch coverage is **not reproducible**: five runs gave 81.23 / 81.25 / 81.25 / 81.25 / 81.27. Isolated to `src/lib/protocol-builder/rules.ts`, where v8 attributes branches differently by worker scheduling. So "81.25 %" was one sample of a distribution, "re-measured **unchanged**" was unsupportable, and the diagnosis "mis-transcribed" was **wrong** — nobody mis-transcribed anything, and the first pass's "81.23 → 81.25" cosmetic was chasing noise | follow-up | **Fixed in this commit** — now "≈ 81.2 %, varies ±0.02 pp", with the cause named; "unchanged" and "mis-transcribed" removed |
| **D-3** | This document's re-check section said "381 tracked files" against target `36a8911`; 381 is the *first pass's* figure at `0d9e008` (`36a8911` added `LICENSE` and the imported plan) | cosmetic | **Annotated in place** — clerk correction to 383; the security conclusion is unaffected |
| **D-4** | `CLAUDE.md` §4 row 5's unqualified "three `src/lib` files" reads as a full count when it is scoped to `@/lib/db` only | minor | **Fixed in this commit** — "three under the narrow reading, eight under §4.5's literal wording"; independently confirmed 3 + 5 = 8, disjoint |

Statements verified about the substantive conclusions each decorated: the coverage scope widening, the
~47.7 % statements figure, and "visibility only outside `stack-evaluator`" are exactly true and fully
reproducible; the zero-real-secrets conclusion was independently re-proved.

> *"**Nothing else.** No new internal contradiction between two documents survived the cross-read: the
> four cross-reference targets M-5 relies on all exist and say what is claimed; `project-status.md`, the
> 04-report and `closeout-check.md` now agree on the repository root, the retired clone, the
> exit-criterion count, the mutation-evidence split, and the status of the Check. No secret, no health
> data, no fabricated citation, no unauthorized code change."*

## 5. Justification

> All eight prior findings are **CLOSED**, and each was re-proved from the repository rather than accepted
> from the document that claimed it. The code and repository state were never in question and reproduce
> exactly. Against the standard this Check set for itself, none of the four new findings falsifies a
> categorical claim in a governing document at the target: D-1 is a claim true today that would go stale
> after a separately-approved operation; D-2 is a ±0.02 pp instability in one nondeterministic coverage
> column whose substantive claim holds; D-3 and D-4 are a stale denominator and a scope qualifier. The
> three unmet exit criteria are honestly recorded as deliberately deferred with their U-DEFER items named
> in place, and the carried findings are registered rather than hidden — follow-up, not blockers.
> **The record is now true.**

All four new findings were remediated or annotated in this same commit, so the tree that ships is the
tree as certified, plus those four corrections.

---

# Phase 0 — closed

Three Checks ran against three successive states: **NOT CLOSED** at `0d9e008` (six findings), **NOT
CLOSED** at `36a8911` (two closed partially, two new), and **COMPLETE WITH FOLLOW-UP** here. Each verdict
is preserved above in the state it was written. The code never changed across any of them — every finding
in all three passes was a record-accuracy defect, which is precisely what a Check that exists to catch
them should produce.
