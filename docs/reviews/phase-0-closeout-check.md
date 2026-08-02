# Phase 0 — Check & Closeout (Independent Verification)

> **Date:** 2026-08-01 · **Subject:** Phase 0 — Integration & Enforcement Recovery
> **Verified state:** `main` @ `bf7ff2e331e4f9c0893e083b5e94c71d19290d8b` (= `origin/main`)
> **Method:** read-only inspection of the actual repository, a six-reviewer independent panel, a full
> verification-suite run, and **four executed mutation checks** in a disposable pristine clone.
> Nothing in the repository was modified by this review except the addition of this document.
>
> **Verdict: Phase 0 is NOT closed.** The shipped code and git history are sound — a pristine clone of
> `bf7ff2e` is fully green and CI on that exact SHA is green. Four closeout conditions are unmet.

---

## 1. Verdict summary

| Unit | Subject | Verdict |
|---|---|---|
| U1 | Repository-ignore hygiene | **Pass**, with a working-tree gap (C-2) |
| U2 | Documentation baseline | **Fail** (C-3, C-4) |
| U3 | v13 evidence disclosure | **Pass**, one scope note (C-13) |
| U4 | Feature-branch backup | **Pass** |
| U5 | Continuous integration | **Pass**; roadmap's "required status" unmet (C-6) |
| U6 | Coverage visibility | **Pass** |
| U7 | Architecture enforcement | **Pass**, with findings (C-1, C-5) |
| U8 | Reference-ID stability | **Pass**, one namespace ungoverned (C-7) |
| U9 | Integration & hygiene cleanup | **Pass** on git mechanics; closeout blocked by C-3/C-4 |

**Blocking closeout: C-1, C-2, C-3, C-4.**

---

## 2. Fact-forcing gate — measured

| Fact | Measured |
|---|---|
| Working directory / git root | `/Users/<redacted>/Desktop/Claude-Projects/Supplement-Advisor/v1.0` (identical) [path redacted on import] |
| Current branch | `main` |
| Local `main` | `bf7ff2e331e4f9c0893e083b5e94c71d19290d8b` |
| `origin/main` | `bf7ff2e331e4f9c0893e083b5e94c71d19290d8b` |
| Synchronized | **Yes** — `rev-list --left-right --count main...origin/main` → `0 0` |
| Staged / unstaged | none / none |
| Untracked | **113** — 2 pre-existing docs + **111 duplicate files** (C-2). At session start this was **2**. |
| Ignored | 19 entries — `.bkit/{audit,runtime,state}/`, `graphify-out/`, `coverage/`, `node_modules/`, `.env.local`, `.next` artifacts, `test-results 2/`, `.DS_Store` |
| Feature branch exists | **Yes** — `feat/food-pairings-v12` @ `bf7ff2e`, local **and** on `origin` |
| Unpushed commits | **none** |
| Force push / history rewrite | **None.** `origin/main` reflog: `910d773 → 30f74e1 → 77b3c36 → bf7ff2e`, all `update by push`, no `forced-update` |
| Merge commits on `main` | **Zero.** `main` reflog entry reads literally `merge feat/food-pairings-v12: Fast-forward` |
| Tags created | **None** — `git tag -l` and `git ls-remote --tags origin` both empty |
| Branches deleted | **None** — 10 local, 9 remote `feat/*` all intact |
| CI for exact `main` SHA | Run `30689103414`, `headSha=bf7ff2e…`, **`success`**, all 7 steps green, 68 s |
| Repository visibility | **PUBLIC** |

---

## 3. Verification suite — run twice, two different results

### 3a. User's working tree — **FAILED**

| Step | Exit |
|---|---|
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm test` | **1 — FAILED** (1 failed / 451 passed of 452) |
| `npm run test:coverage` | **1 — FAILED** (same failure) |
| `npm run build` | 0 (32 routes) |

Failure: `boundaries.test.ts` → `B4b: src/data depends on no external package`, six
`DATA_NO_EXTERNAL_DEPS` violations in `src/data/id-stability.test 2.ts` and
`src/data/seed-integrity.test 2.ts`. **Cause is C-1 + C-2, not the committed code.**

### 3b. Pristine clone of `bf7ff2e` — **FULLY GREEN**

| Step | Exit | Result |
|---|---|---|
| `npm ci` | 0 | 270 packages |
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | **40 files / 452 tests passed** |
| `npm run test:coverage` | 0 | thresholds satisfied |
| `npm run build` | 0 | 32 routes |

Coverage from the clean run — **200 files** measured across `src/app`, `src/components`, `src/data`,
`src/lib`, `src/services`, `src/types`:

- **All `src/`:** 47.12 % statements · 68.86 % functions · 80.87 % branches
- **`src/lib/stack-evaluator/**`:** 99.38 % · 100 % · 88.16 % (threshold 80/80/70 — satisfied)

This supersedes the stale "408/408" baseline in `CLAUDE.md:179` and `README.md:57`: the current figure is
**452**.

**The content of `main` is sound. The local failure is working-tree pollution.**

---

## 4. Mutation checks — executed, not asserted

CLAUDE.md §5.2, U7's step text, U8's verification, and the plan review's GO-condition #5 all require each
new guard be *shown red*. No prior record existed. Four mutations were applied in the disposable clone
and reverted; the clone finished at 452/452 green with zero dirty files.

| # | Mutation | Guard | Result |
|---|---|---|---|
| M1 | `SEED_SUPPLEMENTS[0].id` `magnesium` → `magnesium-RENAMED` | U8 | **RED** — two failures: *"1 persisted id(s) vanished from seed data: magnesium"*, naming the exact orphaned sites (`stack_items.supplement_id`, `checkins.taken[]`, `checkins.scheduled[]`, `advisor_actions.payload/inverse`) and prescribing the tombstone/`supersededBy` remedy; plus *"1 unregistered id(s): magnesium-RENAMED"* |
| M2 | `src/data/seed-biomarkers.ts` imports `@/lib/evidence` | U7 `DATA_IS_A_LEAF` | **RED** — `B4: src/data is a leaf over src/types` |
| M3 | Create ungoverned `src/newlayer/thing.ts` | U7 tree-partition | **RED** — `partitions every top-level src/ directory into scanned or exempt` |
| M4 | Duplicate biomarker id `vitamin-d-25oh` | U8 uniqueness | **RED** — `biomarkers: no duplicate canonical id` |

**All four guards are real.** This closes gap M2/M6 raised by the Check pass — the mutation evidence now
exists and is recorded here.

---

## 5. Findings

### C-1 · **Blocker** — the architecture guard measures the filesystem, not the repository

`boundaries.test.ts:99-113` discovers files with `fs.readdirSync`, so untracked and ignored files are
scanned as repository content. Its test-file exemption is filename-suffix-shaped:

```ts
/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)
```

`id-stability.test 2.ts` ends in `" 2.ts"`, not `".test.ts"` — so it is **included** as product code and
its `vitest`/`node:fs` imports trip `DATA_NO_EXTERNAL_DEPS`. This is §3a's failure.

The guard's verdict is a property of one machine's working tree, not of `main`. It produces false reds
(demonstrated), and a guard that goes red for reasons unrelated to its rule trains developers to ignore
it — contrary to CLAUDE.md §3.5. The plan review predicted this class as **P-14** and marked the
exemption "MUST"; it was implemented as a pattern that fails open.

Collateral: the `LAYER_FLOORS` annotations at `:61,65` ("19 today", "10 today") misdescribe the polluted
tree. Floors still pass.

**Fix:** drive discovery from `git ls-files`, so the guard measures the repository; or at minimum reject
any filename containing `.test`/`.spec` anywhere, or containing a space.

### C-2 · **Blocker** — 111 untracked duplicate files, none ignored, all stageable, on a PUBLIC repo

111 untracked files match `* N.*`, **79 of them under `src/`**, including `CLAUDE 2.md`,
`docs/roadmap 2.md`, `docs/02-design/architecture-boundaries 2.md`, `src/app/api/*/route 2.ts`,
`supabase/migrations/*.sql`, and 8 `tests/e2e/*.spec 2.ts`.

- **None are tracked** — `git ls-files` matches none; **`main` is unaffected**.
- **None are ignored** — `git check-ignore` exits 1 for all.
- **`git add -A --dry-run` stages all 113**, into a public default branch.
- Index integrity is otherwise intact: `git ls-files src` = **242**, `find src -type f` = **321**, and the
  321−242 = **79** gap is exactly these duplicates. No real source file is missing or ignored.

Characteristics: mode `600` vs `644`, preserved original mtimes, and all 180 tracked `src/` files
restamped to a single minute (`2026-08-01 16:07`). iCloud Drive (`bird`, `CloudDocs…FileProvider`) and
Baidu Netdisk sync are both running and the repository lives under `~/Desktop`. Session-start
`git status` showed **2** untracked files; the 111 materialised during the session. This is consistent
with a sync client re-materialising the tree and writing conflict copies.

`CLAUDE 2.md` falsifies `CLAUDE.md:210` ("the **only** source-of-truth ordering in the repository") at the
filesystem level. The 8 duplicate E2E specs would **double-execute** under Playwright's default
`testMatch`.

**Fix, in order:** (1) resolve the sync source — exclude this repository from desktop sync; (2) delete the
111 strays; (3) re-verify `git status`. Do **not** treat a `* 2.*` ignore rule as the fix — that hides the
recurrence and would mask a legitimately named file later.

### C-3 · **Blocker** — the plan under which nine commits shipped is still marked `DRAFT`

`docs/01-plan/phase-0-integration-enforcement.plan.md:3`:

> **Status: DRAFT — awaiting user approval.** Per `CLAUDE.md` §6, a Draft plan outranks nothing.
> **Planning only — nothing in this document has been executed.**

Both sentences are false, and the same document contradicts itself at `:118` ("U1 — ✅ **COMPLETE**").
Under §6 rank 5 a Draft outranks nothing, so the executed work has no recorded authorising document and
the plan cannot resolve its conflicts with the roadmap (C-4). Approval was evidently given per-gate — the
commits exist and gates G1–G3 each demanded it — but the artifact does not record it.

**Fix:** set status to Approved with the date; replace the "nothing has been executed" line with the
per-unit commit list.

### C-4 · **Blocker** — governing documents are stale; roadmap and plan give conflicting exit criteria

`git log -- docs/project-status.md README.md docs/roadmap.md` → last touched at `110715d` (U2), i.e.
**before** U5–U9 landed.

| Location | Stale claim | Reality |
|---|---|---|
| `README.md:64` | "**no CI**; `main` is not yet current with the feature work" | CI exists and is green; `main` = working tip |
| `CLAUDE.md:179` | baseline "408/408 unit tests · **no CI**" | 452 tests; CI green |
| `CLAUDE.md:152` | "Rules 4–9 … **not yet implemented**" | Rules 4 and 6 are enforced |
| `docs/roadmap.md:21-23` | "U1 complete … U2 in progress. **U3–U9 not started**" | All nine commits landed **and are public** |
| `docs/project-status.md:19,37` | "CI — **None.** No workflow files anywhere" | False |
| `docs/project-status.md:23,179` | coverage `include` is `src/lib/**` only | `src/**/*.{ts,tsx}` since `8b1bd16` |
| `docs/project-status.md` §1.1 | "`main` … 2 commits", "**15 commits behind**", "`d9fc1ef` … **unpushed**", "v13 … only genuinely uncommitted milestone" | `main` is 17 commits @ `bf7ff2e`; `0 0` divergence; `d9fc1ef` on `origin/main`; v13 committed as `c75b044` |
| `docs/project-status.md:141-142,184-187,275,286` | "no detection, no test" for `supplement_id`; "`src/services` and `src/data` are **ungoverned**"; "no CI and nothing merged" | All resolved by U5/U7/U8/U9 |
| `docs/02-design/architecture-boundaries.md` | documents only B1/B2/B2b/B3; `:76` omits `src/services`+`src/data` from B3; `:20-25` omits `src/data` from the layer table; `:90-93` lists `NO_UI_IMPORT` as **deferred** | B4, B4b, B5, tree-partition and layer floors are all enforced |

The design-doc update was an explicit U7 deliverable (`plan.md:209`) and was not delivered. Its prose now
*contradicts* the test it specifies — the exact defect its own §"Why this document exists" was written to
prevent. `:20-25` also leaves **T-10's literal evidence sentence still true**.

`docs/project-status.md` is what CLAUDE.md §9.2 tells every future agent to read for "the subsystem's real
condition"; a fresh agent reading it today concludes there is no CI, no integrated `main`, no ID guard,
and two ungoverned layers.

**Roadmap-vs-plan conflict.** `docs/roadmap.md:75-82` makes these Phase 0 **exit criteria**: tags
`v2`…`v13` on origin; zero `feat/*` branches; CI a **required status**; a `.tsx` test collected anywhere
under `src/`. The plan defers all four (U-DEFER-1/2/3/4) and its own criterion 11 requires `git tag` stay
empty. Rank 5 beats rank 6 — **but only for an Approved plan** (C-3). Per the roadmap's own line 8, a
roadmap phase requiring such an exception is a defect in the roadmap. `roadmap.md:47-48` also still lists
`DOMAIN_IS_PURE` promotion as included Phase 0 work, which the plan excludes.

**Fix:** refresh the documents above; annotate the four deferred exit criteria with pointers to
U-DEFER-1/2/3/4 so a deliberate deferral is distinguishable from an omission (CLAUDE.md §7).

### C-5 · **Major** — `NO_UI_IMPORT` enforced without plan authorization

`boundaries.test.ts:79,271-278,569-571` enforce `src/lib`/`src/services` ↛ `src/components`. U7's rule
table (`plan.md:214-219`) lists exactly four rules; this is not among them, and
`architecture-boundaries.md:90-93` still classifies it as deferred "next hardening" — i.e. Phase 1 work
executed in Phase 0. It genuinely passes today (no `@/components` import exists under `src/lib`), so it is
a safe ratchet, but it was neither reviewed nor approved.

### C-6 · **Major** — CI is green but is **not** a required status; `main` has no branch protection

`gh api …/branches/main/protection` → `404 Branch not protected`; `protection.enabled: false`,
`required_status_checks.enforcement_level: "off"`. `main` can be force-pushed by anyone with push access.
This task forbids modifying repository settings, so it is correctly **not** actioned here — it remains an
open exit criterion needing a separate approved action (U-DEFER-3 sequences it after a first green run,
which has now occurred).

### C-7 · **Major** — one persisted reference-ID namespace is ungoverned by U8

`id-stability.test.ts` imports eight seed sources but **never** `SEED_BIOMARKER_RELEVANCE`. Meanwhile
`id-manifest.json:76-77` documents its `biomarkers` namespace as covering
`advisor_messages.citations[].refId where kind='biomarker-rule'` — but the value written there is
`f.ruleId` (`src/lib/advisor/tools.ts:266-267`), which traces to `rule.id` in
`src/data/seed-biomarker-relevance.ts` (e.g. `"vitamin-d-25oh-low--vitamin-d"`) — a *different* id space
from `SEED_BIOMARKERS[].id` (`"vitamin-d-25oh"`).

Renaming or deleting a `BiomarkerRelevanceRule.id` silently orphans persisted citation rows and **no U8
assertion fires** — the exact defect class U8 exists to prevent, on the one namespace whose manifest entry
claims to cover it. `biomarkers.test.ts:216` only checks intra-array uniqueness. Gap against CLAUDE.md
§2.4 rule 16.

**Fix:** register a `biomarkerRelevanceRules` namespace, add `SEED_BIOMARKER_RELEVANCE.map(r => r.id)` to
`LIVE`, and correct the `biomarkers` namespace's `persistedAt` claim.

### C-8 · **Major (pre-existing, out of Phase 0 scope)** — raw internal error text crosses the API boundary

`src/lib/api/respond.ts:54-55`:

```ts
const message = err instanceof Error ? err.message : "Unexpected error.";
return fail("INTERNAL_ERROR", message, 500);
```

CLAUDE.md §2.3 rule 13 — a **rank-1 non-negotiable** — requires a generic message plus a server-side
correlation ID. `git log` shows the file unchanged since the MVP commit `910d773`, so this is **not**
Phase-0-introduced, but it is a live rank-1 violation and belongs at the front of Phase 1.

### C-9 · **Major (pre-existing)** — no `E2E_LIVE`-gated Playwright block carries the `[LIVE]` tag

All 17 gated spec files use only `L1`/`L2`/`L3` prefixes; the string `[LIVE]` appears in **zero** titles.
CLAUDE.md §5.9 names this failure mode explicitly. E2E is correctly excluded from CI, so this does not
block Phase 0, but it must close before any Phase 1 E2E-in-CI work.

### C-10 · **Major** — `docs/archive/2026-07/evidence-disclosure/**` was committed despite being excluded

Plan §1.1:51-52 lists it under "**Pre-existing untracked docs (NOT part of Phase 0)**"; U3's forbidden
list names it; plan-review **P-19** says it "belong[s] to **neither** commit and need[s] its own
decision". No decision is recorded. It was likely swept in because
`docs/archive/2026-07/_INDEX.md:58-61` links to the four files. All four exist and every index link
resolves, so the content is correct — the defect is the unrecorded staging decision, on a public remote.

### C-11 · **Minor** — tree-partition ignores loose files and symlinks

`boundaries.test.ts:331-336` filters `e.isDirectory()`. A loose `src/middleware.ts` (a standard Next.js
location) would be neither scanned nor exempt; `readdirSync` uses `lstat` semantics, so a symlinked layer
escapes both the partition check and `walk()`. Neither exists today — latent.

### C-12 · **Minor** — `walk()` and vitest disagree on `.tsx`

`walk()` excludes `*.test.tsx` (`:106`) but `vitest.config.ts:13` collects only `*.test.ts`. A `.test.tsx`
file would be both unscanned and unexecuted. **Zero exist today**, so latent — but it is also roadmap exit
criterion `:78`, deferred as U-DEFER-4 (see C-4). Note the same asymmetry causes C-1 from the other side:
`* 2.ts` files are *linted* by the boundary guard but never *executed* by vitest.

### C-13 · **Minor / Observation**

- **No `LICENSE`** on a public repository (`gh repo view --json licenseInfo` → `null`). Default copyright
  applies: readers may view but have no right to use, fork, or modify. `package.json`'s `"private": true`
  is npm-publish scoping only. Needs a user decision.
- **Public-history caveat absent, not merely understated.** Verified: `30f74e1` is an ancestor of
  `origin/main` and still contains `.bkit-memory.json`, `.bkit/audit/*`, `.bkit/state/*`,
  `test-results/.last-run.json`. Untracking at `bf7ff2e` does not remove them; they remain fetchable
  permanently. Content was reviewed and is secret-free and health-data-free (§6), so the decision not to
  rewrite is sound — but no active document states the caveat.
- **`.bkit-memory.json` and `test-results/` were deleted from disk**, not merely untracked. No
  consequence — both regenerable, and §9 designates `docs/archive/*/_INDEX.md` as authoritative.
- **`/test-results*/` and `/playwright-report/` are root-anchored.** Correct for today's
  `playwright.config.ts` (no `outputDir`), but a nested output directory would escape. Latent.
- **U3 disclosure scope.** `IllustrativeDatasetNotice` covers `/library/*`; the advisor chat surface shows
  relabelled "Evidence summary" chips without the fuller notice. No unverifiable field is rendered
  either way, and the shipped e2e scopes the guarantee to `/library/*` — in-scope-as-designed, noted for a
  future disclosure-completeness pass.
- **`ci.yml:29-30`** narrows PR triggers to `branches: [main]` against the plan's "all branches";
  `:33-36` adds `feat/**` and `workflow_dispatch` beyond spec. The addition is justified in-file; the
  narrowing is not.
- **`feat/advisor-actions-v7` has no remote label** — but `9808710` is reachable from five remote refs
  including `origin/main` and holds zero commits not on `main`. **Not a backup gap.**
- **README** omits `npm run typecheck`, one of the three checks CLAUDE.md §5.10 mandates.

---

## 6. Security posture

**No credential in this public repository requires rotation.** Independent full-history scan of all 25
commits for JWT (`eyJ…`), `sk-ant-`, `sk-`, `AKIA…`, `ghp_…`, PEM blocks and
`postgres://user:pass@…` found **no secret values** — only two textual references to the *variable name*
`SUPABASE_SERVICE_ROLE_KEY`. `.env`, `.env*.local`, `storageState*.json`, `*.auth.json` were **never
tracked** on any ref; only `.env.example` (empty placeholders) exists. Zero `.DS_Store` tracked.

Artifacts untracked in `bf7ff2e` were reconstructed from history and reviewed: PDCA metadata, tool audit
logs, version caches, session bookkeeping, `{"status":"passed","failedTests":[]}`. No credentials, no
health data, no user PII beyond the developer's own local path and git identity.

Confirmed upheld: **§2.3 r14** — service-role key confined to `src/lib/db/seed.ts` with **zero importers**
(invoked only via the `db:seed` script). **§2.3 r11** — all **22** `src/app/api/**/route.ts` files call
`getUser()` and return 401 via `unauthorized()`; `getUser()` returns `null` rather than throwing, so there
is no misconfiguration bypass. **§2.3 r15** — no health-data logging in app runtime (the only two
`console` calls are in the dev-only seed script).

CI is least-privilege: `permissions: contents: read`, `pull_request` **not** `pull_request_target`,
`persist-credentials: false`, **zero** `secrets.*` references. Actions are tag-pinned rather than
SHA-pinned — low residual risk given the workflow holds no secrets.

Open: **C-8** (rule 13), **C-6** (no branch protection).

*Note: the repository was created with `gh repo create … --private` (per the historical audit log) and is
now PUBLIC. Worth confirming that was intentional.*

---

## 7. Per-unit evidence

**U1 — Pass.** Every ignore rule verified firing with `git check-ignore -v`: `graphify-out/`,
`/test-results*/`, `/playwright-report/`, `.bkit/{audit,runtime,state}/`, `/.bkit-memory.json`,
`*.swp`/`*.swo`, `.env*`, `/.next/`, `/coverage`, `*.tsbuildinfo`, `/node_modules`. **No application
source is ignored** — the only `check-ignore` hit under `src`/`tests`/`supabase` is `supabase/.DS_Store`.
Index complete (242 = 242). The directory-level `.bkit/runtime/` rule proved its worth by catching
`hook-reachability 2.json`. Gap: the `* N.*` genre (C-2), which is duplicated *source*, outside U1's
generated-artifact objective.

**U2 — Fail.** Mechanics are correct: `CLAUDE.md`, `README.md`, `.claude/CLAUDE.md` all tracked; the
superseded banner is unmistakable at line 1 **of the tracked blob**, naming rank 8; the source-of-truth
hierarchy is single and uncontradicted (every precedence statement across all docs defers to §6 — zero
competing orderings); a temporary plan explicitly **cannot** override rank 1, and `roadmap.md:7-8` and
`product-direction.md:8-9` say so affirmatively; no stale MVP-only framing survives in the active docs
(`README.md:53` reads "post-MVP, in transition to functional beta"; the only MVP-cap hit is
`CLAUDE.md:23`, the *retirement* notice). Fails on the plan's own criterion 2 — see C-4.

**U3 — Pass.** Code and tests committed. `IllustrativeDatasetNotice` is rendered by
`SupplementDetail.tsx:170,184` and reached from the real production route
`src/app/library/[slug]/page.tsx:86`, statically generated for all 15 seed supplements — reachability is
genuine, not component-level. Guards match vitest's `include` and contain no `.skip`, `.todo`, `.only`, or
`process.env` gating; `grep -rn "example.org" src/` is **empty**. `src/types/paper.ts` no longer declares
`authors`/`journal`/`year`/`link`/`studyType`/`sampleSize` — the field was **deleted** per §8.4, not
guarded. `Product.affiliateLink` is `null` on all 21 seed products and structurally excluded from ranking
via `ScorableProduct = Omit<Product, "affiliateLink" | "qualityNotes">` (§2.4 r17 upheld). All v13 PDCA
records referenced by `docs/archive/2026-07/_INDEX.md` exist; every relative link resolves.

**U4 — Pass.** `origin/feat/food-pairings-v12` = `bf7ff2e` = `origin/main`. All nine Phase 0 commits are
reachable from a remote ref **other than** `origin/main` (`git branch -r --contains` for each). Ordering
proves backup preceded integration: `origin/main` reflog reached `77b3c36` while local `main` was still at
`30f74e1`.

**U5 — Pass (C-6 open).** Workflow specification verified point by point. Run `30689103414` on
`headSha=bf7ff2e…` is green across all 7 steps. **No deprecated annotation was miscounted as a test
failure** — every step's `conclusion` is `success`, and there is no `continue-on-error` anywhere.

**U6 — Pass.** `include: ["src/**/*.{ts,tsx}"]`; `exclude: ["src/**/*.test.{ts,tsx}"]`; no global
threshold (U-DEFER-5 respected); `src/lib/stack-evaluator/**` threshold unchanged and satisfied. CI runs
`npm test`, **not** `test:coverage`, so the widened scope cannot newly fail CI. Report now spans all six
top-level `src` directories (200 files). No test-support files escape the exclude — no fixtures, helpers,
`__tests__/`, or `*.spec.ts` exist under `src/`.

**U7 — Pass with findings.** `SCANNED_LAYERS` contains `src/services` and `src/data` (`:29-38`). Scanned
counts — types 19 (floor 15), components 56 (40), lib ~80 (60), services 1 (1), data 10 (8): **no rule
scans zero files**, and `:324` asserts `LAYER_FLOORS` keys equal `SCANNED_LAYERS`, closing the
"scanned layer with no floor" hole. Tree-partition executes (mutation-checked, M3). Exemptions carry
written reasons. Deferred rules correctly **not** enforced: `DOMAIN_IS_PURE` would fail today
(`src/lib/identity/context.ts:6-10`, `src/lib/advisor/context-loader.ts:5-9`,
`src/lib/advisor/actions/execute.ts:13-14`) and the client-component rule would fail on 7 components —
both absent, and `:536-541` honestly asserts the forward direction stays legal. Runs under ordinary
`vitest run`. The TypeScript-parser-based `extractEdges` with its own self-test is the strongest element
of the suite: it defends against the vacuous-pass degradation that floors alone cannot catch.

**U8 — Pass with gap (C-7).** Manifest exists and is tracked. The test is **genuinely independent, not
tautological**: `LIVE` is built from live seed imports; `manifest` is `JSON.parse(readFileSync(...))` of a
checked-in file — neither derives from the other. Design exceeds the plan: tombstones must carry a
migration note and must not resurrect, `supersededBy` must resolve to a live id with no alias chains, and
a `FREE_TEXT_COLUMNS` denylist stops the contract over-reaching into editable copy. Rename, removal,
duplicate and unregistered-ID failures are all enforced and **all were demonstrated red** (§4).
`git show 77b3c36 --stat` → two files added, 486 insertions, **0 deletions**; `git diff-tree -r 77b3c36 --
supabase/migrations` empty. **No seed ID changed, no migration touched.**

**U9 — Pass on git mechanics.** All nine commits are ancestors of `main` (`merge-base --is-ancestor` for
each). **Fast-forward only** — zero merge commits, zero commits with ≥2 parents, reflog reads literal
`Fast-forward`. At `bf7ff2e` no `.bkit/**`, `.bkit-memory.json`, `test-results*/**`, `playwright-report/**`,
`storageState*`, or `.auth` path is tracked; `git show --stat bf7ff2e` → 12 files, 1,543 deletions,
`.gitignore` +15. Local copies remain and are ignored, as approved (two exceptions, C-13). **No force
push, no rewrite, no tag** — all eight named v2–v13 tips (`e910ea5`, `589954a`, `26034f6`, `d45ec6f`,
`a53c365`, `dd32585`, `4d32771`, `8b671e2`) match `origin` byte for byte.

---

## 8. Recommended actions, in order

**Before Phase 0 can be declared closed:**

1. **C-2** — resolve the sync source (exclude this repository from iCloud/Baidu desktop sync), then delete
   the 111 stray `* N.*` files and re-verify `git status`. *Highest priority: a `git add -A` in the
   current tree would publish 111 duplicate source files — including every API route and every migration —
   to a public branch, irreversibly. No deletion was performed by this review.*
2. **C-1** — make `boundaries.test.ts` discovery repository-based so the guard measures `main`.
3. **C-3** — mark the plan Approved; remove the "nothing has been executed" line.
4. **C-4** — refresh `roadmap.md:21-23`, `project-status.md` (§0, §1.1, §2.5, §2.9, §3, §7),
   `README.md:60-65`, `CLAUDE.md:152,179`, and `docs/02-design/architecture-boundaries.md`; reconcile
   roadmap exit criteria `:75-82` with U-DEFER-1/2/3/4; link this document from the roadmap and
   CLAUDE.md §12.

**Requires separate explicit approval (excluded from this task):**

5. **C-6** — branch protection on `main` with CI as a required status.
6. Tag `v2`…`v13` and delete the ten stale `feat/*` labels — **or** formally record them as deferred.
   Note U-DEFER-1's reason: the chain cannot support honest tags (v12 `51d2134` precedes v11 `d89cf1c`).
7. **C-13** — decide the licensing question.

**Carry into Phase 1:**

8. **C-7** register `BiomarkerRelevanceRule.id` · **C-8** correlation-ID error handling (rank-1 rule 13) ·
   **C-9** `[LIVE]` tagging · **C-5** document `NO_UI_IMPORT` · **C-10** record the archive-docs decision ·
   **C-11**/**C-12** close the latent discovery gaps · promote `DOMAIN_IS_PURE` and add the
   `NO_PERSISTENCE_FROM_UI` ratchet (free today — `src/components` imports no `@/lib/db`, `@/lib/supabase`,
   or `@/services`).

---

## 9. Reviewer panel

Six independent reviewers, each instructed to verify the repository directly and to treat the Phase 0 plan
and prior reports as claims to test rather than as evidence: **architect**, **code reviewer**, **test
strategist**, **security reviewer**, **release/repository-hygiene reviewer**, and a **BKit PDCA Check**
gap-detection pass (overall match rate 61 % strict, 85 % of statically verifiable criteria).

Reviewer findings were cross-checked against first-hand command output; every claim reproduced above was
independently confirmed by the coordinating reviewer. Two reviewer hypotheses were **refuted** on
evidence and are recorded here as corrections: the duplicate `* N.*` files are **untracked**, not tracked,
so CI on `main` is genuinely green; and `feat/advisor-actions-v7`'s missing remote label is **not** a
backup gap. The four mutation checks in §4 were **executed**, not inferred — closing the one gap that
every reviewer independently flagged as unevidenced.

---

## Import note

This document was written on 2026-08-01 against the repository as it then lived at
`/Users/<redacted>/Desktop/Claude-Projects/Supplement-Advisor/v1.0`, **outside** any git repository — so
the review that gated Phase 0 was itself unversioned. It was imported here on **2026-08-02**, into
`docs/reviews/phase-0-closeout-check.md` on branch `docs/phase-0-closeout`.

**Sections 1–9 above are the original, verbatim.** No verdict, finding, or number in them has been
rewritten, softened, or removed (CLAUDE.md §7: never delete historical rationale). Where a finding has
since been resolved, that is recorded in the addendum below and **not** by editing the finding.

**Redactions — one, disclosed here in full:**

| Location | Original | Replacement | Why |
|---|---|---|---|
| §2, "Working directory / git root" | an absolute path beginning `/Users/` and containing the developer's macOS account name | `/Users/<redacted>/…`, marked `[path redacted on import]` | This repository is **public**. The account name is machine-identifying and carries no analytical value; the rest of the path is retained because "outside the git repository" is the point the row makes. |

Nothing else was altered. In particular these were reviewed and **deliberately kept**:

- **§6's scan-pattern prefixes** (`eyJ…`, `sk-ant-`, `ghp_…`, `AKIA…`, `postgres://user:pass@…`) are the
  *patterns searched for*, with literal placeholder values. They are not credentials.
- **§5 C-2's sync-client names** (iCloud Drive, Baidu Netdisk) and the `~/Desktop` reference are
  load-bearing evidence for that finding's diagnosis. Redacting them would leave the finding unexplained.
- **All SHAs, run IDs, and branch names** — already public on the remote.

An independent full-history credential scan is recorded in §6: no secret values on any ref, and no
rotation required.

---

## Resolution addendum (2026-08-02)

Verified against `main` @ `1792f9f984d506340aced37a4dd2cf4adee6cfe9`
(CI run [30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782),
`push`/`main`, conclusion `success`).

Every remediation below was mutation-checked — each guard was shown red against the defect it targets
before being accepted (CLAUDE.md §5.2).

| Finding | Status | Resolved by |
|---|---|---|
| **C-1** — architecture guard measured the filesystem, not the repository | **Resolved** | **R1** — `a338370` `test(architecture): derive boundary inventory from tracked files`. Discovery now runs `git ls-files --cached`, so untracked and ignored files are structurally incapable of reaching a rule. |
| **C-2** — 111 untracked `* N.*` duplicates on a public repo | **Resolved** | Relocation. The repository now lives at `/Users/<redacted>/Developer/supplement-stack-intelligence`, outside the synced Desktop tree, so the sync client no longer writes conflict copies. R1 additionally makes the guard immune to the class. |
| **C-3** — the plan under which nine commits shipped was still marked `DRAFT` | **Resolved** | This unit — `docs/01-plan/phase-0-integration-enforcement.plan.md` marked **Completed 2026-08-02**, with the per-unit commit list replacing the "nothing has been executed" line. |
| **C-4** — governing documents stale; roadmap/plan exit criteria conflict | **Resolved** | This unit — `README.md`, `docs/project-status.md`, `docs/roadmap.md`, `docs/02-design/architecture-boundaries.md`, and the `CLAUDE.md` §5 baseline line all refreshed against measured values. |
| **C-5** — `NO_UI_IMPORT` enforced without plan authorization | **Open (documented)** | Now documented in `docs/02-design/architecture-boundaries.md` as enforced-and-ratified rather than deferred. The ratchet holds today. |
| **C-6** — CI green but not a required status; no branch protection | **Deferred** | Unchanged. Requires a repository-settings change and separate explicit approval. Still an open Phase 0 exit criterion. |
| **C-7** — `BiomarkerRelevanceRule.id` namespace ungoverned | **Resolved** | **R2** — `ea5b270` `test(data): protect biomarker relevance rule IDs`. A `biomarkerRelevanceRules` namespace (15 ids) is registered in `src/data/id-manifest.json`; the manifest now has **9** namespaces. |
| **C-8** — raw internal error text crosses the API boundary (rank-1 rule 13) | **Resolved** | **R3** — `9e9e15d` `fix(api): hide internal errors behind correlation IDs`. The shared boundary returns a fixed generic message plus an opaque correlation id; the full exception goes to the server log under the same id, with type-metadata-only treatment for non-`Error` throws and one-level cause summaries. |
| *(not in the original findings)* route-level gaps that bypass the shared boundary | **Resolved** | **R3b** — `1792f9f` `fix(api): stop advisor routes returning caught internal messages`. Four further sites — two in `advisor/actions` `POST`, one in undo, and one streaming into an SSE `error` event — were found during R3 and fixed. `src/architecture/error-disclosure.test.ts` now enforces the rule across every tracked API route. |
| **C-9** — no `[LIVE]` tag on `E2E_LIVE`-gated Playwright blocks | **Open** | Carried to Phase 1. E2E remains excluded from CI. |
| **C-10** — `docs/archive/2026-07/evidence-disclosure/**` committed despite exclusion | **Open** | Content verified correct; the unrecorded staging decision remains unrecorded. Carried to Phase 1. |
| **C-11** — tree-partition ignores loose files and symlinks | **Open (latent)** | Neither exists today. Carried to Phase 1. |
| **C-12** — `walk()` and vitest disagree on `.tsx` | **Open (latent)** | Zero `.test.tsx` files exist. Also roadmap exit criterion, deferred as U-DEFER-4. |
| **C-13** — LICENSE absent; public-history caveat unstated; misc. observations | **Partly resolved** | The public-history caveat is now stated in `docs/04-report/phase-0-integration-enforcement.report.md` and `docs/project-status.md`. The licensing question still needs a user decision. |

### Findings raised *after* this review, carried forward

These were discovered during R3/R3b and are not in the original numbering:

- **F3** — `handle()` classifies operational errors by substring (`err.message.includes("not configured")`).
  Safe against every throw site in the repository today, structurally fragile. A typed error class is the fix.
- **F5** — the correlation id is emitted but no UI surfaces it, so `ApiError`'s "quote in a support ticket"
  is unrealized.
- **F6** — no route-level reachability test covers the four fixed handlers (CLAUDE.md §5.3).
- **F7** — the error-disclosure guard documents two detection gaps it does not close: the *body* of a
  destructured handler (`catch ({ cause }) { … }`) and two-argument `.then(onFulfilled, onRejected)`
  rejection handlers. No route uses either form today.

### What this addendum does not claim

Phase 0's **final independent Check has not been run.** This addendum records what the remediation units
did; it is not itself an independent verification of closure. That Check is the next unit, scaffolded at
`docs/05-qa/phase-0-final-check.md`.
