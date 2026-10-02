# P4 · U24 — Next.js security upgrade: `next` 15.1.3 → 15.1.12

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U24 row; N-121, N-122,
> FU-91, FU-92). It carries no approval status of its own. **Mode: SUPERVISED** under a standing approval,
> deterministic. Opened 2026-10-01 at anchor `33d486a`, in worktree `../ssi-u24`, branch `fix/p4-u24`.
> Registered with bkit at open (RC-4). Commit and CI ids are in bkit and the unit report, not here, because
> this file is inside the commit it would have to cite.
>
> **Status: landed on the owner's ruling of 2026-10-01 (phase plan §6): target `next@15.1.12`.**
> **The repository is patched, but production is not.** It stays on 15.1.3 until the owner redeploys (N-121).

## 1. Approval and ruling

The standing approval, verbatim:

> Standing approval — U24 (Next.js security upgrade), 2026-10-01. This unit only.
>
> Granted:
> - Worktree ../ssi-u24 on fix/p4-u24 from main.
> - In package.json, change ONLY the `next` version (15.1.3 → the target chosen in the brief), plus `eslint-config-next` and any `@next/*` package that package.json itself lists, to the same version. Keep the existing range style (exact stays exact).
> - npm install / ci / view / ls / audit (registry reads only; no other network).
> - If verify:bundle fails AND the staged tree has no source change: re-baseline docs/05-qa/bundle-baseline.json, report every route's before/after, re-run full G.
> - U24 plan row, one N-row, FU rows, artifact docs/01-plan/features/p4-u24-next-security-upgrade.plan.md.
> - Commit, push branch, CI poll per RC-3 (full 40-char SHA, ≤20 polls 60 s apart), fast-forward main, delete branch, prune.
>
> Not granted — STOP and report:
> - Any CLAUDE.md diff (including a version mention).
> - A target outside 15.1.x.
> - A lockfile change to any package other than next, @next/*, eslint-config-next and the dependencies next itself pins at the new version. List them and stop.
> - Any source change needed to make G pass.
> - Any live call, deployed-DB access, or env/secret change.

**First stop.** The approval cited "the target chosen in the brief", and no brief had arrived. A
read-only `npm audit` also showed that no 15.1.x release fixes the open criticals. The runner stopped and
asked. **Ruling (2026-10-01): target `next@15.1.12`.** The brief that came with the ruling set the
expected lockfile delta, checks a to c (§2, §3), N-121, N-122, two FU rows and the env-var checklist (§5).
`package.json` lists neither `eslint-config-next` nor any `@next/*` package, so `next` is the only version
that changes.

## 2. Change and evidence

**`package.json`:** `"next": "15.1.3"` → `"next": "15.1.12"`. It stays exact. Nothing else changes.

**`package-lock.json`.** The `packages` entries were diffed before and after the install. Only these changed:

| Entry | Before | After |
|---|---|---|
| `""` (root: the `next` spec) | `15.1.3` | `15.1.12` |
| `node_modules/next` | 15.1.3 | 15.1.12 |
| `node_modules/@next/env` | 15.1.3 | 15.1.12 |
| `node_modules/@next/swc-{darwin-arm64,darwin-x64,linux-arm64-gnu,linux-arm64-musl,linux-x64-gnu,linux-x64-musl,win32-arm64-msvc,win32-x64-msvc}` (8) | 15.1.3 | 15.1.9, as `next@15.1.12` pins them |

`next@15.1.12` pins the same other dependencies as 15.1.3: `busboy` 1.6.0, `postcss` 8.4.31,
`styled-jsx` 5.1.6, `@swc/counter` 0.1.3, `@swc/helpers` 0.5.15 and `caniuse-lite` ^1.0.30001579.
None of them moved (`npm view next@<v> dependencies`).

**Check a: `npm ls next react react-dom react-server-dom-webpack react-server-dom-turbopack`.** The tree
has `next@15.1.12`, `react@19.0.0` and `react-dom@19.0.0`, all deduped, under `next`, `styled-jsx` and
`@testing-library/react`. **No `react-server-dom-*` package is installed** outside `next`'s own
`dist`.

**Check b: `npm audit`.** These are the counts `npm audit` prints. It counts packages, not advisories,
which is why the totals stay the same:

| | `--omit=dev` | all |
|---|---|---|
| at `33d486a` | 4 packages (1 critical, 3 high) | 15 (3 critical, 7 high, 4 moderate, 1 low) |
| staged tree | 4 packages (1 critical, 3 high) | 15 (same) |
| advisories on `next` | 34 | 28 |

**Gone:** the six advisories whose vulnerable range ends inside 15.1. GHSA-9qr9-h5gf-34mp (critical,
`<15.1.9`). GHSA-67rr-84xm-4c7r (high, cache poisoning, `<15.1.8`). GHSA-mwv6-3258-q52c (high, `<15.1.10`).
GHSA-h25m-26qc-wcjf (high, `<15.1.12`). GHSA-w37m-7fhw-fmv9 (moderate, `<15.1.10`). GHSA-qpjv-v59x-3qc4
(low, cache-poisoning race, `<15.1.6`). **None of them is still listed.** The 28 that remain are each fixed
only in 15.2.2 or later. The list, with fixed-in versions: N-122.

**FU-91, the other 14 packages flagged, with advisory ids.** *Production tree:* `nanoid` (GHSA-28wg-ghj8-5hjv,
GHSA-2v37-7h3g-55p8, both high). `postcss`, Next's pinned copy plus a dev copy (GHSA-6g55-p6wh-862q and
GHSA-r28c-9q8g-f849, high; GHSA-qx2v-qp2m-jg93 and GHSA-fxqj-rqcc-2cmp, moderate). `sharp`
(GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, both high).
*Dev only:* `vitest` (GHSA-5xrq-8626-4rwp critical, GHSA-82fw-gwwq-j7x9 moderate). `@vitest/coverage-v8`
(through vitest). `@vitest/mocker` (GHSA-82fw-gwwq-j7x9). `vite` (GHSA-fx2h-pf6j-xcff high;
GHSA-4w7w-66w2-5vf9 and GHSA-v6wh-96g9-6wx3, moderate). `vite-node` (through vite). `brace-expansion`
(GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-qhr7-859c-m2p7 and
GHSA-6j4f-fj2g-mc7p, high; GHSA-q2hr-2g5m-vwhr, moderate). `browserslist` (GHSA-c83g-rgw3-j3cx,
GHSA-73wf-gq98-2v4g, both high). `js-yaml` (GHSA-2883-xcg3-v3hh, high). `esbuild` (GHSA-67mh-4wv8-2f99
moderate, GHSA-g7r4-m6w7-qqqr low). `baseline-browser-mapping` (GHSA-w5vr-8v7q-w6rv, moderate).
`postcss-selector-parser` (GHSA-w9m9-85wc-3x92, low).

## 3. Check c: do the three open criticals apply?

| Advisory | Finding | Evidence |
|---|---|---|
| GHSA-f82v-jwr5-mffw, middleware authorization bypass (fixed 15.2.3) | **Lower impact here.** The middleware makes no access decision. A bypass skips (1) the Supabase session-cookie refresh and (2) the per-request nonce and the Report-Only CSP header, on both the forwarded request and the response. Access control is unaffected: every API route authenticates itself (`CLAUDE.md` §2.3 rule 11). A skipped refresh can only leave a session stale, never grant one | `src/middleware.ts:45-55`: nonce, `buildCsp`, `updateSession`, header set. `src/lib/supabase/middleware.ts:8-38`: `getUser()` at `:36`, with no redirect or 401 anywhere |
| GHSA-2xp9-vwfh-vxw4, RCE in Image Optimization with AVIF (fixed 15.5.24) | **Not configured. The brief's stop condition did not fire.** `next.config.ts` has no `images` key, so `formats` stays at Next's default, and **no `image/avif` is configured**. No route serves a user-supplied image: there is no `public/` directory and no `next/image` import in `src/`. The only upload route accepts CSV or PDF and returns JSON. The optimizer endpoint `/_next/image` still exists by default, with no local image and no `remotePatterns` to read from | `next.config.ts:95-133` (the whole `nextConfig`, no `images`). `src/app/api/lab-import/extract/route.ts:58-84` (formData, CSV or PDF only, otherwise 400). `src/middleware.ts:60` (the matcher excludes `_next/image`) |
| GHSA-p293-qw3h-jr36, RCE on Windows-hosted servers (fixed 15.5.24; CVE-2026-75604 per the owner's brief) | **Depends on the host OS. Owner to confirm.** Code cannot show this | — |

## 4. Gate

G ran on the staged tree in the clean worktree (no `.env*` other than the tracked `.env.example`), with
`NEXT_TELEMETRY_DISABLED=1`. It ran twice: once on the package change alone, then on the tree with these
docs. The figures below come from the second run, and the committed tree was re-checked the same way.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | 433 files, 0 errors |
| `npx vitest run` | 2153 of 2153, across 152 files |
| `npm run test:coverage` | green, thresholds held (all files: 83.5 % lines) |
| `npx next build` | succeeds; the banner reads `Next.js 15.1.12` |
| `npm run verify:bundle` | **OK, no re-baseline.** Every route is between +120 B and +127 B, under 0.12 %. Shared by all: 105,330 → 105,451. `/profile`: 118,051 → 118,174. `/advisor`: 115,159 → 115,286 |
| `npm run verify:rendering` | OK, no prerendered page HTML |
| non-live E2E (`npm run test:e2e`) | **70 passed, 30 `[LIVE]` skipped** |

**One build warning, not new.** `next build` warns that `@supabase/supabase-js` reads `process.version`,
which the Edge Runtime does not support, through `src/lib/supabase/middleware.ts`. A clean build of
`33d486a`, on `next@15.1.3` from `git archive` with a fresh `npm ci`, prints the same warning. U24 did not
introduce it.

## 5. Rotation checklist for the owner: names only

N-121's second half. These are the variable **names** read from `process.env` in `src/` (which includes
`src/middleware.ts` and `src/lib/db/`) and `next.config.ts`. **No `.env*` file was opened.** There is no
top-level `db/`. Four names that occur only in tests (`CI`, `NAME`, `PW_FAST`, `SOMETHING_ELSE`) are left out.

| Name | Read in | Secret? |
|---|---|---|
| `OPENAI_API_KEY` | `src/lib/openai/config.ts` | **SECRET** |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/db/seed.ts` (the dev seed script only, §2.3 rule 14) | **SECRET**, if it is set in production at all |
| `SEED_DEMO_PASSWORD` | `src/lib/db/seed.ts` | **SECRET** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/env.ts`, `src/lib/supabase/middleware.ts` | not secret: shipped to the browser by design, and gated by RLS |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/env.ts`, `src/lib/supabase/middleware.ts`, `src/lib/db/seed.ts` | not secret |
| `SEED_DEMO_EMAIL` | `src/lib/db/seed.ts` | not secret (an identifier) |
| `OPENAI_BASE_URL` | `src/lib/openai/config.ts` | not secret |
| `OPENAI_MODEL` | `src/lib/openai/config.ts` | not secret |
| `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL` | `src/lib/openai/config.ts:107`, by the constant at `src/lib/openai/client.ts:188` | not secret (a flag) |
| `OPENAI_REASONING_EFFORT` | `src/lib/advisor/model-adapter.ts`, `src/lib/lab-import/pdf-adapter.ts` | not secret |
| `OPENAI_TIMEOUT_MS` | `src/lib/advisor/model-adapter.ts` | not secret |
| `ADVISOR_DAILY_TOKEN_BUDGET` | `src/lib/advisor/repo.ts` | not secret |
| `ADVISOR_TURN_RESERVATION` | `src/lib/advisor/repo.ts` | not secret |

**This list does not cover** secrets the code never reads that live only at the host or in Supabase
(the database password, the JWT secret, and so on), `scripts/`, `playwright.config.ts`, or the CI
workflow. Whether those rotate is the owner's call.

## 6. Left open

N-121: the owner redeploys and rotates. N-122: U25 moves to the latest 15.5.x, at least 15.5.24. FU-91:
registered only. FU-92: a CI audit step, proposed for Phase 5. Nothing under `src/` changed, and neither
did `CLAUDE.md`.
