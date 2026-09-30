# p4-u17-demo-fixture — PDCA cycle artifact for Phase 4 U17

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U17**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U17 · Demo fixture · **SUPERVISED** · docs + one dev script · size S · **Anchor** `35b7503`, rebased onto `fe4761f` · **Dates** 2026-09-29 (a), 2026-09-30 (b)
> **Authority:** the owner's standing approval for landing (a) (investigation only), then the owner's ruling D-9 (b)
> of 2026-09-29, which set landing (b)'s *May touch*. PARALLEL MODE with U16's FU-17 half. Registered with bkit at
> the open of landing (b) (RC-4); landing (a) wrote no files.

## 1. Plan

**Goal:** derive the basis for `docs/project-status.md`'s one **X** (`db/seed.ts` shared demo fixture) from the
repository's history, report it and stop (landing (a)). Then land the owner's path (landing (b)).
**May touch (b):** `docs/project-status.md` (the row and a dated block) · `docs/roadmap.md:640` (the `[P4-X2]`
annotation, **not ticked**) · `src/lib/db/seed.ts` · the plan's U17 row and D-9 outcome · this file · the queue.
**Widened by the owner on Q-24 (2026-09-30; written as Q-23, renumbered on the rebase onto `fe4761f`, where U16 (FU-17) had issued Q-23):** `tests/e2e/helpers.ts` · the `playwright.config.ts:17-18` comment ·
`.env.example` · the plan's `:85` (FU-25 row) and `:209` (`[P4-X2]` gloss) cells.

## 2. Landing (a): the derivation (read-only)

**The record gives no basis.**
- The row was introduced at `110715d` (2026-07-30, *"docs: version active project instructions and MVP-transition
  baseline"*). The commit has no body. `git log -G'db/seed.ts. shared demo fixture' --follow` and
  `-S'db/seed.ts'` over `docs/project-status.md` both return only that commit, so the row was never touched again.
- It had no §2 section. The commit's other X rows each had one (§2.1, §2.8).
- The Phase 2 closeout re-examined six rows and the Phase 3 closeout moved two. Neither names this one.

**The nearest text.** The only same-commit passage on a "shared demo" anything is the Testing-infrastructure finding:
*"`fullyParallel: true` contradicts a single shared demo user whose seed performs destructive deletes"*
(`110715d:docs/project-status.md:190`). That section was classified **B**. The same finding is T-13
(`docs/reviews/mvp-transition-check.md`) and P-11 (`docs/reviews/phase-0-plan-review.md:127`), and is the
origin of FU-25.

**What the file is.** Every record describing it calls it a dev script: `mvp-transition-check.md:123` ("a dev
script"), `phase-0-closeout-check.md:325` ("zero importers (invoked only via the `db:seed` script)"),
`project-status.md:245`. It writes one auth user, a profile, a lab marker and one stack, under the service-role key,
deleting that user's `lab_markers` and `stacks` first. Nothing tracked imports it (`git grep`, at `35b7503`).

**Classification reported.** The evidence splits. The concern's origin fits (a), a test collision. But its race half
was closed by serialisation (Phase 1 U16) and guarded (`LIVE_SERIAL`, U12), which leaves FU-25. The file itself fits
(b), dev tooling. Recommended (b), with FU-25 carried. Found in passing and reported: the defaults
`demo@example.com` / `demo-password-123` were published in this public repository, and (a) would contradict
`LIVE_SERIAL`, which requires `workers: 1` under `E2E_LIVE`.

## 3. Ruling

*"Ruling on U17, 2026-09-29: path (b). Owner checked the deployed project's Authentication → Users for
demo@example.com: present, and deleted by the owner on 2026-09-29."* The same ruling removed the seed's default
credentials, kept FU-25 open, added a closeout-checklist note, and registered three follow-ups.

## 4. Do (landing (b))

- **`docs/project-status.md`:** the row reads ~~**X**~~ **B**, dated, pointing to a dated block. The block states the
  missing basis, the dev-tool reading, the §8 rule 2 counter-argument (load-bearing: 17 of 24 E2E spec files log in as
  the seeded account, at `35b7503`), FU-25 carried, and the default-credential clause with the owner's check verbatim.
- **`docs/roadmap.md:640`:** `[P4-X2]` annotated; the box stays `[ ]`. CRITERIA_PARITY compares tick state, not
  text, so the annotation needs no plan change.
- **`src/lib/db/seed.ts`:** `demoCredentials()` requires `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` (empty counts as
  unset), and is called first in `seed()`, so a missing value fails before any client exists. The message names each
  missing variable and says why there is no default. The header records the change and its reason.
- **Plan:** U17 row, D-9 outcome, closeout checklist item (3) (re-seed with a private password before the D-12
  baseline), **FU-88**, **FU-89**, **FU-90**.
- **Queue:** **Q-24**, the residue outside *May touch*: the helper's defaults, one config comment, `.env.example`, and
  two stale plan cells. **Resolved in this landing** on the owner's answer (2026-09-30):
  - `tests/e2e/helpers.ts`: the exported `DEMO_EMAIL` / `DEMO_PASSWORD` constants (no importers) are gone. `login(page)`
    reads both variables when called and throws naming the missing one; every caller already used `login(page)`.
  - `playwright.config.ts:17-18` comment, `.env.example` (both variables as empty placeholders), plan `:85` and `:209`.

## 5. Check

**The seed change, run with `tsx` (no network left the machine):**

| Case | Environment | `35b7503` | This landing |
|---|---|---|---|
| R1 | none of the four set | exit 1 at the Supabase check: *"Seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."* (the defaults filled the credentials) | exit 1: *"Seed requires SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD. …"* |
| R2 | email only; URL `http://127.0.0.1:9`, dummy key | **`TypeError: fetch failed`**: it called `createUser` with the published password | exit 1: *"Seed requires SEED_DEMO_PASSWORD. …"*, before any client |
| R3 | `SEED_DEMO_PASSWORD=` (empty), same URL and key as R2 | **`TypeError: fetch failed`**: `??` keeps an empty string, so it called `createUser` with an empty password | exit 1, names `SEED_DEMO_PASSWORD`, before any client |
| R4 | both set, no Supabase env | — | reaches the existing *"Seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."* |

**The helper change (Q-24), in a clean worktree at `35b7503` + this diff (before the rebase), `SEED_DEMO_*` unset:** the non-live E2E suite
(`npx playwright test`, build-then-start) **70 passed / 30 skipped**, the recorded baseline. `login()` called on a stub page
throws *"login() requires SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD: … There is no default."*, names only the missing one
when one is set, and makes **0** `page.goto` calls.

No unit test was added: `seed.ts` has none and its test file is outside *May touch*. FU-90 records the missing
importer guard.

**G:** run on the staged tree, rebased onto `fe4761f`, in a clean worktree with `SEED_DEMO_*` unset (§6).

## 6. Act / report

- **G, branch CI, landing:** not written here, as in U12: recording them would change the tree G measured. They are in
  the unit's bkit entry, the commit message and the report back.
- **Carried open:** FU-25 (per-worker isolation), FU-88, FU-89 (note only), FU-90. Closeout checklist item (3): re-seed
  with a private password before the D-12 live baseline.
