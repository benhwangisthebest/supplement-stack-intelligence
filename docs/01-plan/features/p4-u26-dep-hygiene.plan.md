# P4 · U26 — Dependency hygiene after U25: `nanoid` 3.3.19, bundle re-baselined (closes FU-93)

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U26 row; FU-91,
> FU-93). It carries no approval status of its own. **Mode: SUPERVISED** under a standing approval,
> deterministic. Opened 2026-10-01 at anchor `ebc6626`, in worktree `../ssi-u26`, branch `chore/p4-u26`.
> Registered with bkit at open (RC-4). Commit and CI ids, and the CI bundle comparison (§4), are in bkit
> and the unit report, not here, because this file is inside the commit they are measured on.
>
> **Status: landed under the owner's standing approval of 2026-10-01 (phase plan §6).** `package.json`,
> `CLAUDE.md`, `src/` and CI are unchanged.

## 1. Scope

The approval covers two things:

1. **A lockfile-only `nanoid` update** that brings every copy to at least 3.3.18 within its parents'
   existing ranges. It stops on any lockfile change outside the `nanoid` entries.
2. **A re-baseline** of `docs/05-qa/bundle-baseline.json` with `npm run bundle:baseline` on this tree. It
   stops if any route ends up above its current baseline.

## 2. `nanoid`

| | Before (`ebc6626`) | After |
|---|---|---|
| `npm ls nanoid` | 3.3.12, deduped under `next` → `postcss@8.4.31` and the top-level `postcss@8.5.15` | **3.3.19**, same shape |
| Parent ranges | `^3.3.6` (`postcss` 8.4.31), `^3.3.12` (`postcss` 8.5.15) | unchanged; 3.3.19 satisfies both |
| `npm audit --omit=dev` | 3 packages (2 high, 1 moderate), 6 advisory entries: `nanoid`, `next` (via `postcss`), `postcss` | **2 packages (1 high, 1 moderate), 4 entries:** `next` (via `postcss`), `postcss` |
| `npm audit` (all) | 14 packages (2 critical, 6 high, 5 moderate, 1 low), 34 entries | 13 packages (2 critical, 5 high, 5 moderate, 1 low), 32 entries |

The command was `npm update nanoid`. **One lockfile entry changed:** `node_modules/nanoid`, with its
`version`, `resolved` and `integrity` (3.3.12 → 3.3.19). Nothing else moved, and `package.json` is
untouched. The `nanoid` advisories GHSA-28wg-ghj8-5hjv and GHSA-2v37-7h3g-55p8 are no longer listed.
**What remains in production** is Next's pinned `postcss` 8.4.31, which waits on `next` 16, in Phase 5
(FU-91).

## 3. Bundle re-baseline

`npx next build` and then `npm run bundle:baseline` ran on this tree (`next@15.5.27`, `nanoid` 3.3.19) in
the clean worktree, on macOS. zlib stays at `1.3.1-e00f703`. First-load JS, gzip bytes:

| Route | Old baseline (15.1) | New baseline | Δ |
|---|---|---|---|
| shared by all | 105,330 | 102,651 | −2,679 (−2.54 %) |
| `/` | 109,156 | 106,198 | −2,958 (−2.71 %) |
| `/_not-found` | 106,310 | 103,646 | −2,664 (−2.51 %) |
| `/advisor` | 115,159 | 112,152 | −3,007 (−2.61 %) |
| `/auth/login` | 109,711 | 106,752 | −2,959 (−2.70 %) |
| `/auth/signup` | 109,711 | 106,752 | −2,959 (−2.70 %) |
| `/library` | 110,214 | 107,254 | −2,960 (−2.69 %) |
| `/library/[slug]` | 110,610 | 107,635 | −2,975 (−2.69 %) |
| `/profile` | 118,051 | 115,017 | −3,034 (−2.57 %) |
| `/stack-lab` | 112,233 | 109,285 | −2,948 (−2.63 %) |
| `/stack-lab/[stackId]` | 115,516 | 112,537 | −2,979 (−2.58 %) |

**No route is above its old baseline,** and the route set is unchanged. Four routes differ from U25's
measurement of the same `next` by 1–4 B, which is build-to-build jitter, far inside the 1 % allowance.
After this, a route may grow by about 1 % (roughly 1.0–1.2 kB) before `verify:bundle` fails, instead of
about 4 kB.

## 4. CI check before landing (brief step 2)

The baseline is measured on macOS, and CI builds on Linux, so the two can measure differently. After the
push, every route's figure in CI's `verify:bundle` step was compared
with this baseline. **The stop condition:** CI would fail, or any route sits within 0.2 % of its limit
(baseline + 1 %). Each comparison and its verdict are in the unit report and bkit.

## 5. Gate

G ran on the staged tree in the clean worktree (no `.env*` other than `.env.example`;
`NEXT_TELEMETRY_DISABLED=1`): `tsc`, lint, `vitest run`, `test:coverage`, `next build`, `verify:bundle`
against the new baseline, `verify:rendering`, and the non-live E2E (70 passed, 30 `[LIVE]` skipped).
Results are in the unit report. The committed tree is the tree G ran on.

## 6. Left open

- **FU-91:** `postcss` 8.4.31 under `next`, until `next` 16 (Phase 5), and the 11 dev-only entries.
- **FU-92:** a CI audit step (Phase 5).
- **N-121:** owner-only (redeploy, smoke test, rotate).
