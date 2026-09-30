# p4-u18-either-or-hygiene — PDCA cycle artifact for Phase 4 U18

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U18**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U18 · Either/or hygiene · **SUPERVISED, all three branches in one landing** · deterministic + one registry
> fetch · size S · **Anchor** `1caead9` · **Date** 2026-09-29
> **Authority:** the owner's standing approval for U18 (branch, commit, push, fast-forward, delete) under the brief's
> gate conditions. **Not covered:** the `package.json` / `package-lock.json` diff (shown verbatim, then STOP). The one
> `npm pack` is approved. No other network. RC-1…RC-4 apply.
> **Opening:** U13 registered with bkit retroactively (landed `1caead9`, branch CI `36650261591` `completed / success`).
> U18 was registered at open.

## 1. Plan

**Goal (the brief's):** the build never fetches fonts from the network, an unused devDependency is gone, and the
stale port name is accepted with a reason. **Retires:** FU-66, FU-50, FU-36. **Ruling:** D-10.
**May touch:** `src/app/layout.tsx`, one new `src/app/fonts/*.woff2` (**widened by the owner, 2026-09-29, Q-16 (b), to three:
latin, latin-ext and greek**), `package.json` and `package-lock.json` (FU-50
only, after approval), the plan's U18 row, its three items and its G network note, this file, the decision queue, and
bkit state. **May not touch:** `CLAUDE.md`, `src/types/**`, any other dependency, workflows, migrations, allowlists.

## 2. FU-66: the font file and its provenance

One registry fetch, in a scratch directory: `npm pack @fontsource-variable/inter@latest --json`. The brief asked for
an exact version, which cannot be known without a second network call, so the pack resolved it and recorded it.

| Field | Value |
|---|---|
| Package | `@fontsource-variable/inter` (**not** added as a dependency) |
| Exact version | **5.3.0** (tarball `fontsource-variable-inter-5.3.0.tgz`, 1,885,281 B) |
| Tarball integrity (npm) | `sha512-OupL48va4JNofb97w6NYeF9S7W/kHNKM0Er8Dem5nqi4jeOLrVJDoE8tZEpnMJmtkvNbB1EIPPwHcdkF6b1oUA==`. Re-computed locally with `openssl dgst -sha512`: **identical**. npm shasum `351dd1e02dab63a6cf66d57ec36dcfd10c07f07b`, also identical |
| Files extracted | `package/files/inter-<subset>-wght-normal.woff2` → `src/app/fonts/` under the same name |
| latin, 48,256 B | SHA-256 `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| latin-ext, 85,068 B | SHA-256 `34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956` |
| greek, 18,996 B | SHA-256 `1be3448e292fbf05ffe176fe1e43f135013d50b1e7d324ad1a558f623d3bb6f6` |
| Licence | `OFL-1.1` (`package.json` `license`; `LICENSE` is the SIL OFL 1.1 text). The file's `name` table carries the copyright (ID 0) and the licence URL (ID 14) |

**Same font as before.** The Google-served latin file from an earlier local build (`.next/static/media/e4af272c…-s.p.woff2`,
2026-09-24) was compared with the committed file by a scratch WOFF2 reader (brotli + `name`/`fvar`/`cmap`/`hhea`/`OS/2`).
Both are **Inter 4.001, `git-66647c0bb`**. Both have one axis, `wght` 100–900 (default 400). Metrics are identical:
UPM 2048, hhea 1984/−494/0, typo 1984/−494/0, win 2269/660. Both map the **same 230 code points** (0 differ). The
fontsource file also carries a `prep` table, which is hinting only. **After Q-16 (b)** the latin-ext and greek files were
taken from a fresh extract of the same tarball (its sha512 re-checked first). Each was compared with the Google file it
replaces, `8e9860b6…` and `19cfc722…`: the same build and metrics, and the same code points, **733** and **110** (0 differ).
No other subset was taken (cyrillic, cyrillic-ext, greek-ext and vietnamese are not in the ruling).

**`layout.tsx`.** `next/font/local` is called with three `src` entries, `style: "normal"`, `display: "swap"` and
`variable: "--font-inter"`. The CSS variable is unchanged, so `tailwind.config.ts:58-59` and the `--font-display` alias
are untouched. `display: swap` is unchanged. The provenance and all three hashes are in the comment above the call.
**One family, three faces.** `next/font/local` cannot give a file its own `unicode-range`, so the three `@font-face` rules
share the family with no range. The browser tries them last-declared first and falls through by glyph coverage (CSS
Fonts 4, composite faces). **Order is load-bearing (M2).** With latin first, Next's fallback picker takes the *last* file
on a tie (`pick-font-file-for-fallback-generation.js`: equal distance with a normal style returns the current file).
That is greek, which has no a–z, so the fallback became 96.88 / 24.12 / 100 %. With latin last it is 89.79 / 22.36 /
107.89 %, the latin-only value. **Preload:** all three files are now preloaded (`next-font-manifest.json`), where Google
preloaded latin only. That changes what is fetched, 104 KB more per first visit, and not what is drawn.

**What changes on screen: Q-16, ruled (b).** Latin alone lost one rendered glyph, `β`, to the fallback face. With the
three files, a scan of every character in the rendered sources (`src/`, `content/`; tests and architecture files
excluded; 145 distinct) against the seven Google faces of `1caead9` and the three committed ones gives:
- **covered before, not now: 0.** `µ` (U+00B5, in the µg/µmol doses) and `β` (U+03B2) are covered. `μ` (U+03BC) occurs in
  no shipped text, and the greek file covers it.
- **covered by neither: 24.** These fell back at `1caead9` too, since no subset Google served for Inter maps them: arrows
  `← → ↔ ↗ ↩ ⇒`, `≤ ≥ ∈ ∩ ∪`, `‐`, `⏱ ─ ▋ ○ ● ⚙ ⚠ ✓ ✕ ✦` and two emoji. Several are only in code comments. U18 does not change them.
- **browser proof** (Chromium, `CSS.getPlatformFontsForNode` on the drawn glyph; `next start` under the deny, localhost only):

| Glyph | Page | Three files | Latin only (red control, scratch) |
|---|---|---|---|
| `β` | `/library/vitamin-d`, Evidence tab, outcomes | **Inter** (custom) | Arial (system) |
| `µ` | `/library/vitamin-b12`, Evidence tab | **Inter** (custom) | Inter (custom) |
| `μ` | inserted into a visible paragraph by the probe | **Inter** (custom) | Arial (system) |

The fallback overrides still differ from Google's lookup table (90.44 / 22.52 / 107.12 %). They show only before the
preloaded files arrive.

## 3. FU-50: `@vitejs/plugin-react`

**Live reference: none.** `git grep -n -F "@vitejs/plugin-react"` at `1caead9` hits `package.json:45`,
`package-lock.json:26,2840,2842`, and docs that are history: the Phase 3 U0/U10 artifacts, the Phase 3 register and
report, the Phase 4 register (`:80`, `:310`, the removal instruction itself) and the plan review. No config imports
it. `vitest.config.ts` imports only `vitest/config` and `node:path`, and `vitest.workspace.ts` imports only
`vitest/config` and the base config. No lockfile entry depends on it. The only edge is the root's.
**Removed:** `npm uninstall @vitejs/plugin-react --prefer-offline` → *"removed 10 packages"*. The diff is **deletions only**:
`package.json` −1, `package-lock.json` −126 (the plugin and 9 transitive packages no other entry needs). Nothing
else in either file moved. After removal, `git grep -n -F "@vitejs/plugin-react" -- ':!docs/**'` → **exit 1**, empty.

## 4. FU-36: accepted (AC-3)

The accept reason is in the register's U18 row. The rename would open `src/types/advisor.ts:124` and edit 14
occurrences in 4 files (`agent.ts` 3, `mock-adapter.ts` 4, `model-adapter.ts` 6, `advisor.ts` 1), for a name only.
Behaviour is correct. The port's shape is provider-neutral. Its one production implementation, `AdvisorModelAdapter`
(`model-adapter.ts:293`), reaches OpenAI through `@/lib/openai/client` (`:68`). The other is the test double
`ScriptedAdapter` (`mock-adapter.ts:13`). No code change.

## 5. Check: AC-1 proofs (which ran)

Every local build ran with `NEXT_TELEMETRY_DISABLED=1`, as CI does (Q-17).

| # | Proof | Result |
|---|---|---|
| P1 | `git grep -n "next/font/google"` | **source: one hit, `src/lib/security/csp.ts:95`**. It is a comment, outside *May touch*, queued as **Q-15**. The other hits are history in `docs/`. `src/app/layout.tsx` has none |
| P2′ | P2 again with the three files | **exit 0**. Three `@font-face` rules, and the three emitted media files hash to the recorded values |
| P2 | `next build` under `sandbox-exec` denying all outbound IP (and the mDNSResponder socket). The deny was checked first: `curl https://registry.npmjs.org/` inside it exits 7 | **exit 0**. One `@font-face`, pointing at `/_next/static/media/6c596dfcddeca1e9-s.p.woff2` (48,256 B, the committed file) with `font-weight:100 900` |
| P2-red | the same sandboxed build at `1caead9` (scratch worktree) | **exit 1**: `request to https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap failed, reason: connect EPERM`. The deny is what P2 passes, not an absent network. Name resolution still ran; the connect was refused |
| P3 | grep `.next/` and the build log for `fonts.googleapis.com` / `fonts.gstatic.com` | **two hits, neither a fetch.** `.next/server/pages/_error.js` and `.next/static/chunks/main-*.js` hold Next's own pages-router constant `["https://fonts.googleapis.com/css","https://use.typekit.net/"]`, a `<link href>` prefix test behind `__NEXT_OPTIMIZE_FONTS`. It is framework code and was in the `1caead9` build too. The CSS and the log have **none** |
| M2 | the `src` order latin → latin-ext → greek | fallback 96.88 / 24.12 / **100 %** (picked from greek). Now latin is last, and the comment says why |
| M1 | `weight` removed from the call (scratch) | the emitted `@font-face` has **no** `font-weight` descriptor. So `weight` is load-bearing and the comment is true |
| — | `verify:rendering` · `verify:bundle` | **OK · OK.** The font is not first-load JS, so it changes no budget. Deltas were −16 to +47 B, all within 1 %, and no budget file was edited |

## 6. Check: gates

At the worktree: `npx vitest run src/architecture` green, 518 tests. **Preliminary G** in the unit worktree, before the
stop: tsc 0 · lint 0 · vitest 1989/1989 across 150 files · coverage 0 · rendering OK · bundle OK · E2E 70 passed / 30
`[LIVE]` skipped, under the deny with localhost allowed. **G on the staged tree** (AC-7), 2026-09-29, after the owner's approval: the 9 staged files, all inside *May touch* as widened, applied to a clean worktree at `1caead9` (patch sha256 `e589207a…`, identical to `git diff --cached`), then `npm ci` (397 packages). `NEXT_TELEMETRY_DISABLED=1` throughout:
- typecheck clean · lint 430 of 430, 0 errors · vitest 1989/1989 across 150 files · `src/architecture` 30 files, 518 tests;
- `test:coverage` green, no floor edited (`vitest.config.ts` is not in the diff);
- `next build` **under the network deny**, exit 0 · `verify:rendering` OK · `verify:bundle` OK, the largest move +252 B on `/advisor` (untouched), no budget edited;
- E2E non-live **under the deny, localhost only** (its webServer builds again): 70 passed, 30 `[LIVE]` skipped.

This paragraph was added after that run. The docs-only change was re-checked with `src/architecture` and lint.

## 7. Independent review (AC-6): **PASS WITH ADVISORIES**, nothing blocking

A fresh subagent reviewed a scratch copy at `1caead9` + the full diff, under the same network deny. It restored its one
mutation (`layout.tsx`, the red control) by copy, and `cmp` against the staged blob is identical.
- **Network (primary):** nothing in G reached it. Build, vitest 1989/150, tsc, lint 430/430, coverage, rendering, bundle,
  and E2E 70 passed / 30 skipped (localhost only) all ran under the deny. HEAD's layout went red with `EPERM` to Google.
  Telemetry posts to `telemetry.nextjs.org` (Q-17 is accurate). Next's `patchIncorrectLockfile` would fetch only if
  `@next/swc-*` lock entries were missing, and all 8 are present.
- **Hash (primary):** the staged blob, the working file and the tarball's file all hash `3100e775…4c62`. A fresh extract
  `cmp`-matches. The tarball's sha512 and sha1 match the recorded values. Offline, that shows self-consistency, not a
  registry check.
- **Dependency diff:** deletions only, 10 packages. No remaining entry names a removed one, and no live reference is left.
- **Layout:** the variable, swap, weight range and preload are preserved. The family name changes `Inter` → `inter`, which
  CSS matching treats as the same. Of every character in `src/` and `content/`, only `β`, `Σ` and `ƒ` lose Inter
  coverage, and only `β` is rendered (Q-16).
- **A5 (fixed):** "its one implementation" overclaimed, because `ScriptedAdapter` is a test double. It now says "one
  production implementation", in the register row and §4.
- **A6 (queued, Q-18):** no test stops `next/font/google` coming back, and CI never builds under a deny. So the `:8`
  claim is proven once and enforced nowhere (`CLAUDE.md` §3.5). The guard belongs in `src/architecture/`, outside
  *May touch*.
- **N7 (fixed):** `:8` now says "in a checkout without `.env.local`, as CI runs it". A local E2E run against a
  configured `.env.local` would talk to Supabase at runtime, and that was not measured.

## 8. Act

**Owner rulings, 2026-09-29:** (1) the dependency diff is approved as shown. (2) Q-16 (b): three files (§2). (3) Q-17:
the owner disabled telemetry on the owner's machine; the plan's `:8` note says G assumes telemetry off, and the
docs-sync line is Q-19. (4) Q-15 → docs-sync; Q-18 → U19.
Next: stage everything, `npm ci` and G in a clean worktree, then commit
`chore(build): U18 — Inter self-hosted (no build-time network); unused plugin removed; port name accepted (D-10)`,
branch `chore/p4-u18`, push, bounded CI poll, fast-forward `main` and delete the branch. The G results, commit and CI
ids are in the landing report.
