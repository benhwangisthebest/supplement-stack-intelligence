# p3-u8-bundle-budget — PDCA cycle artifact for Phase 3 U8

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U8**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U8** (status APPROVED, ruling D-5).
> Where the two disagree, the register wins.
>
> **Feature**: `p3-u8-bundle-budget` · **Anchor**: `6a8e0d1` (*docs(plan): U9 closeout*) · **Date**:
> 2026-09-24 · **Type**: deterministic for (a) and (b); **live only in (c)**, which changes CI workflow
> config.

---

## 0. Owner rulings, recorded first (2026-09-24)

> **R1 — SEAM DROPPED.** `getBiomarker` has zero call sites, so a catalog parameter is unobservable
> (`CLAUDE.md` §5 rule 3). Do not add a caller to justify it. Record roadmap item 5's seam half as UNMET
> with this reason and register a follow-up for when a real caller appears.
>
> **R2 — FRESH BASELINE.** The plan's §2 route table predates U9, which moved seed data out of the client.
> Measure the baseline at today's HEAD, and report the delta against §2 as a finding, not as headroom.

Re-checked at the anchor, not carried: `git grep -n getBiomarker -- '*.ts' '*.tsx' '*.mjs'` → one hit, the
definition at `src/lib/biomarkers/index.ts:151`. R1's premise holds.

## 1. Plan

**Problem.** Roadmap item 5 asks for a bundle-size assertion *"so the client-bundle cost of seed growth
becomes visible before it becomes a problem"*. D-5 ruled the form: percentage headroom over a recorded
baseline. There is no recorded baseline, only §2's transcription of one build, and N-82 showed that
transcription had already been wrong once.

**Orientation (answered before any file was written).**

- **Where Next gets "First Load JS".** `computeFromManifest` and `getJsPageSizeInKb` in
  `node_modules/next/dist/build/utils.js` (Next **15.1.3**). A route's first load is the sum of the
  **gzip (level 9)** sizes of every `.js` file that `.next/app-build-manifest.json` lists under its
  `…/page` key. "Shared by all" is the set of files listed under **every** key of that manifest, and "Size"
  is the files no other key lists. All three can be derived from the manifest, so no stdout scraping is
  needed.
- **What runs after the build.** In `ci.yml`, `Production build` (`npm run build`) is followed by
  `Rendering determinism` (`npm run verify:rendering` → `scripts/verify-rendering.mjs`), which reads
  `.next/`, never builds, and fails if there is no build. `verify:bundle` follows the same pattern.

**Approach.** Three landings:

- **(a)** `scripts/bundle-sizes.mjs` re-implements Next's computation in bytes, and
  `npm run bundle:baseline` writes `docs/05-qa/bundle-baseline.json`.
- **(b)** `scripts/verify-bundle.mjs` compares a fresh build to that file with headroom H.
- **(c)** Adds the CI step.

**Files touched:** `scripts/bundle-sizes.mjs` and `scripts/verify-bundle.mjs` (new),
`docs/05-qa/bundle-baseline.json` (new), `package.json` (scripts only), `.github/workflows/ci.yml`
((c) only), the register's U8 entry, and this file.

**Stop conditions, checked before (a).**

| Condition | Result |
|---|---|
| Per-route sizes not derivable deterministically | **Did not fire.** See §2, AC-1 |
| Path sensitivity exceeds any sensible H | **Did not fire.** The largest shift is 3 B, see §2, AC-5 |
| Needs a `next.config` change or a new dependency | **Did not fire.** It uses `node:zlib` only |
| Any change to `src/` | **Did not fire for (a) or (b).** See §6 for (c) |

## 2. Landing (a) — baseline

**The derivation equals Next's own table.** A clean `npx next build` at `6a8e0d1` printed the table on the
left. `node scripts/bundle-sizes.mjs` over the same `.next/` printed the columns on the right. Every route
agrees in both columns, and so does the shared row:

| Route | Next prints (Size · First Load) | Derived, bytes (size · firstLoadJs) |
|---|---|---|
| `ƒ /` | 172 B · 109 kB | 172 · 109143 |
| `ƒ /_not-found` | 979 B · 106 kB | 979 · 106292 |
| `ƒ /advisor` | 5.63 kB · 115 kB | 5633 · 114604 |
| `ƒ /auth/login` | 726 B · 110 kB | 726 · 109697 |
| `ƒ /auth/signup` | 726 B · 110 kB | 726 · 109697 |
| `ƒ /library` | 1.18 kB · 110 kB | 1181 · 110152 |
| `● /library/[slug]` | 1.62 kB · 111 kB | 1624 · 110595 |
| `ƒ /profile` | 7.88 kB · 117 kB | 7882 · 116853 |
| `ƒ /stack-lab` | 3.25 kB · 112 kB | 3248 · 112219 |
| `ƒ /stack-lab/[stackId]` | 6.55 kB · 116 kB | 6547 · 115518 |
| shared by all | 105 kB | 105313 |

Route handlers (`/api/**`, `/auth/callback`) ship no client JS and are not budgeted. Their manifest keys
still count toward "shared by all", because that is how Next counts it.

**AC-1 — two consecutive builds are identical.** Run twice, each time
`rm -rf .next && npx next build && node scripts/bundle-sizes.mjs`. Build 1 is the table above. Build 2:

```
/                              172   109143   (172 B · 109 kB)
/_not-found                    979   106292   (979 B · 106 kB)
/advisor                      5633   114604   (5.63 kB · 115 kB)
/auth/login                    726   109697   (726 B · 110 kB)
/auth/signup                   726   109697   (726 B · 110 kB)
/library                      1181   110152   (1.18 kB · 110 kB)
/library/[slug]               1624   110595   (1.62 kB · 111 kB)
/profile                      7882   116853   (7.88 kB · 117 kB)
/stack-lab                    3248   112219   (3.25 kB · 112 kB)
/stack-lab/[stackId]          6547   115518   (6.55 kB · 116 kB)
shared by all                        105313   (105 kB)
```

`diff` of the two outputs is empty, so build-to-build noise is **0 B** on every route. `npm run
bundle:baseline` run twice over one build gives the same file SHA-1 both times (`66358242…`), so the
writer is deterministic too.

**AC-5 — checkout-path spread (N-82).** Same SHA, built from a `git worktree` at a second path with an
APFS-cloned `node_modules`. A symlink would resolve back to the original path and hide the effect.

| Route | Path A (repo) | Path B (worktree) | Δ |
|---|---|---|---|
| `/` | 109143 | 109144 | +1 |
| `/_not-found` | 106292 | 106293 | +1 |
| `/advisor` | 114604 | 114603 | −1 |
| `/auth/login`, `/auth/signup` | 109697 | 109698 | +1 |
| `/library` | 110152 | 110153 | +1 |
| `/library/[slug]` | 110595 | 110596 | +1 |
| `/profile` | 116853 | 116854 | +1 |
| `/stack-lab` | 112219 | 112220 | +1 |
| `/stack-lab/[stackId]` | 115518 | 115521 | **+3** |
| shared by all | 105313 | 105314 | +1 |

**The spread is at most 3 B, or 0.0026% of that route.** Rebuilding path B with a copy of `.env.local`
gave the same figures, so the cause is the path and not the environment.

**Cause, now verified** (N-82 recorded it as UNVERIFIED). Webpack's deterministic module id for the flight
client-entry module is hashed from a module identifier that contains absolute paths. In the root layout
chunk that id is `528` at path A and `7484` at path B. The source is the same and the id is one digit
longer, so each chunk carrying such ids moves by a byte or two. The effect is bounded per chunk and does
not depend on source content.

**Consequence for the baseline.** It is committed at byte precision, but it cannot be compared at byte
equality. CI checks out at `/home/runner/work/…`, which is a third path. That is one reason H exists, and
§3 sizes H against this noise.

**Environment noise that could not be measured locally.** The baseline was measured with Node 24 (zlib
`1.3.1-e00f703`). CI runs Node 20. Gzip output depends on the zlib build, so identical chunks can compress
to slightly different byte counts. No Node 20 is installed here, and installing one would be a network
fetch, which the session rules forbid. **The CI step in (c) is the measurement.** `verify:bundle` prints
every route's measured figure, baseline and limit, so the first CI log records the cross-zlib spread. The
baseline file records `measuredWith.zlib` so the difference can be seen.

**AC-2 — R2's delta against §2, reported as a finding.** All builds below come from the same worktree
path, so path noise cancels:

| Route | §2 at `52e00d9` | `080d3ce` (pre-U9 (b)) | HEAD `6a8e0d1` |
|---|---|---|---|
| `/library` | 110153 | 110153 | 110153 |
| `/library/[slug]` | 110596 | 110596 | 110596 |
| shared by all | 105314 | 105314 | 105314 |
| `/advisor` | 122562 | **133504** | 114603 |
| `/profile` | 118989 | 119733 | 116854 |
| `/stack-lab` | 113109 | 113847 | 112220 |
| `/stack-lab/[stackId]` | 126107 | **137422** | 115521 |
| `/`, `/_not-found`, `/auth/*` | unchanged across all three | | |

**Finding U8-F1: §2's three rows are byte-identical at HEAD, and that is not reassurance.** They were
unchanged from `52e00d9` through `080d3ce` to `6a8e0d1`, because §2 recorded only the Library routes. The
routes where seed data actually reached the client were `/advisor`, `/profile` and both `/stack-lab`
routes, and §2 recorded none of them. Two consequences follow:

- Between `52e00d9` and `080d3ce`, `/advisor` grew by **+10942 B (+8.9%)** and `/stack-lab/[stackId]` by
  **+11315 B (+9.0%)**, and no recorded figure moved. This is the unseen seed-growth cost that roadmap
  item 5 names.
- U9 (b) then removed it. A baseline limited to §2's rows would have seen neither change. The committed
  baseline therefore covers **every page route**, derived from the manifest. A hand-picked list of routes
  is the failure U8-F1 describes.

## 3. The headroom H — chosen and justified

**H = 1%**, per route and for shared-by-all. The limit is `floor(baseline × 1.01)`.

**Measured noise.** The budget has to tolerate:

- build to build: **0 B**
- checkout path: **≤ 3 B**, or 0.0026%
- cross-zlib: **not yet measured** (see §2)

1% of the smallest route (`/_not-found`, 106292 B) is 1062 B, which is more than 300 times the largest
measured noise.

**What H would have let U9's refactor hide.** Suppose U9 (b) were reversed, with seed imports put back into
client components. The regression per route would be the U9 delta from the table above:

| Route | Reversal | % of HEAD | H = 1% | H = 2% | H = 5% |
|---|---|---|---|---|---|
| `/stack-lab` | +1627 B | 1.45% | caught | **hidden** | **hidden** |
| `/profile` | +2879 B | 2.46% | caught | caught | **hidden** |
| `/advisor` | +18901 B | 16.5% | caught | caught | caught |
| `/stack-lab/[stackId]` | +21901 B | 19.0% | caught | caught | caught |

**At 1%, every edge U9 moved would be caught.** What 1% still hides is any growth under about 1.06–1.17 kB
gzip on a route. The table shows that 1.45% was the smallest real seed leak this project has produced.

**Expected Phase 4 growth, and why 1% does not fail the first legitimate content addition** (D-5's
objection to a budget at today's figure). After U9, seed data reaches pages as server props, not client
imports. Content growth should therefore cost the client bundle **0 B**, so content additions do not
spend this budget. Phase 4's feature work, such as context-adjusted evidence in Stack Lab, will add client
code, and a feature larger than about 1 kB gzip on a route will exceed 1%. **That is the intended result,
not a false positive.** The fix is `npm run bundle:baseline`, whose diff shows the new figure in review. A
looser H would let feature growth pass silently, and silent growth is what D-5 rejected.

**Owed at (c):** if the first CI run's cross-zlib spread comes out anywhere near 1%, H is revisited with
that number. It must not be silently widened.

## 4. Landing (a) — gate and landing

The gate ran in a `git worktree` with **no `.env.local`**, the same as CI. That keeps the non-live E2E away
from the deployed Supabase. Results:

- tsc 0
- lint 400 of 400, 0 errors
- vitest 130 files / 1611 tests, including the jsdom project at 11 / 73
- `next build` 0
- `verify:rendering` OK
- E2E non-live: **70 passed / 30 `[LIVE]` skipped**
- null bytes: 0 in all five files

**Commit `4326811`**, CI **`36071597754`**: success.

## 5. Landing (b) — the assertion

`scripts/verify-bundle.mjs` (`npm run verify:bundle`) checks every page route and shared-by-all against
`measured ≤ floor(baseline × 1.01)`. H is a named constant, `HEADROOM_PERCENT`. The script:

- reads the last build and never builds;
- never writes the baseline. The only writer is `npm run bundle:baseline`, so accepting a new figure always
  shows up as a diff of `docs/05-qa/bundle-baseline.json`;
- requires the route set to match **exactly**, in both directions. U8-F1 is the reason: the routes nobody
  recorded were the routes that grew;
- prints each route's measured size, baseline, delta and limit, plus both zlib versions. The CI log is
  therefore the cross-zlib measurement that §2 could not take locally.

**Red evidence (`[P3-X7]`, U8's share).** Every run below was restored from a file-copy backup (`cp`, then
`cmp`), never `git checkout` (`CLAUDE.md` §5 rule 11). Green was confirmed after each restore.

**AC-3 — an inflated route fails and names the route, its size, the limit and H.** The `/library` page
chunk had 1600 random bytes appended, base64-encoded:

```
verify:bundle — H = 1% · baseline zlib 1.3.1-e00f703 · this zlib 1.3.1-e00f703
  /library                     111955 / baseline   110152 (+1803 B, 1.637%) · limit 111253
verify:bundle — 1 BUDGET FAILURE(S):
  ✗ /library: first-load JS is 111955 B (112 kB), over its limit of 111253 B (baseline 110152 B + H 1%), by 702 B.
exit=1
```

Restored, then run again: `verify:bundle — OK. Every route is within 1% of its baseline.` exit=0.

**Below the limit, it stays green, as it should.** A first inflation of 900 random bytes as base64 gzipped
to +1044 B (0.948%). That is under the 111253 B limit, and the check passed.

**R-U9: the realistic regression, reversing U9 (b) at source level.** This ran in the scratch worktree
only, on a detached HEAD: `git revert --no-commit d8d3542`, then `next build` and `verify:bundle` against
the committed baseline. It was not committed, and the worktree was reset to a clean `4326811` afterwards:

```
verify:bundle — 4 BUDGET FAILURE(S):
  ✗ /advisor: first-load JS is 133504 B (134 kB), over its limit of 115750 B (baseline 114604 B + H 1%), by 17754 B.
  ✗ /profile: first-load JS is 119733 B (120 kB), over its limit of 118021 B (baseline 116853 B + H 1%), by 1712 B.
  ✗ /stack-lab: first-load JS is 113847 B (114 kB), over its limit of 113341 B (baseline 112219 B + H 1%), by 506 B.
  ✗ /stack-lab/[stackId]: first-load JS is 137422 B (137 kB), over its limit of 116673 B (baseline 115518 B + H 1%), by 20749 B.
```

The four figures equal `080d3ce`'s from §2 byte for byte, so the revert reproduced the pre-U9 client
bundles exactly. **All four routes U9 moved fail, and no others do**, which is the prediction in §3's
table. `/stack-lab` is caught by 506 B. At H = 2% it would have passed.

**Guard mutations (`CLAUDE.md` §5 rule 2):**

| # | Mutation | Result |
|---|---|---|
| M1 | Boundary: `compare()` with measured = limit, then limit + 1 | `[]` at the limit; limit + 1 → `…over its limit of 101000 B … by 1 B.` |
| M2 | `.next/` moved away | `…app-build-manifest.json not found. Run npm run build first…` exit 1 |
| M3 | `/advisor` deleted from the baseline | `✗ /advisor: in this build but has no baseline, so it has no budget.` exit 1 |
| M4 | `/gone` added to the baseline | `✗ /gone: in the baseline but not in this build. The baseline is stale.` exit 1 |
| M5 | Shared webpack runtime chunk inflated | 11 failures: shared-by-all (`107181 B … over its limit of 106366 B`) plus all 10 routes |
