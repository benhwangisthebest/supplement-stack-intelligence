# Phase 4 closeout — owner-run live E2E baseline (runbook)

> **Why this exists:** D-12 (a) (phase plan §6). The Phase 1 live-E2E exception expires at the Phase 4
> closeout, and that requires an **owner-run** live baseline. The runner cannot do it: a live run writes to the
> Supabase project and calls OpenAI (plan §7). Written 2026-10-06 at closeout landing (a), from
> `package.json`, `playwright.config.ts`, `tests/e2e/helpers.ts` and `src/lib/db/seed.ts` at `72370ee`.
> **This repository is public:** the steps name variables only. Never paste a key, a password or an email
> address back into a tracked file.

## 0. Run every step from a fresh Terminal window

Variables set in a shell **override `.env.local`** when Next builds (FU-95). A Terminal that earlier sourced an
older `.env.local` bakes stale `NEXT_PUBLIC_` keys into the build. During the key rotation, that build
talked to Supabase with disabled legacy keys. So, for **each** step below:

1. Open a **new** Terminal window and `cd` to the repository root.
2. Load the **current** file into that shell, and nothing older: `set -a; . ./.env.local; set +a`.
   The seed (`tsx`) and the Playwright runner do not read `.env.local` themselves; they need the exports.
3. Check that nothing stale is set: `env | grep -E '^(NEXT_PUBLIC_SUPABASE|SUPABASE_|SEED_DEMO|OPENAI_)' | cut -d= -f1`
   prints **names only**. Compare the list with §1.

One-time preparation: `npm ci`, `npm run test:e2e:install` (the pinned browser), and `npx next telemetry disable`.

## 1. Variables (names only) and where each comes from

| Name | Needed by | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app, seed | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | Supabase → API Keys: the **publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | seed only | Supabase → API Keys: the **secret** key (`sb_secret_…`). Server-only |
| `SEED_DEMO_EMAIL` | seed, live run | chosen by you; must be the same value for both. Private |
| `SEED_DEMO_PASSWORD` | seed, live run | chosen by you; private. It signs in to a real account (U17) |
| `OPENAI_API_KEY` | app (advisor) | OpenAI dashboard → API keys (the rotated key) |
| `OPENAI_BASE_URL` | app (advisor) | the first-party value written in `.env.example`'s comment |
| `OPENAI_MODEL` | app (advisor) | your account's `GET /v1/models`; it must support tool calling |
| `OPENAI_REASONING_EFFORT`, `OPENAI_TIMEOUT_MS`, `ADVISOR_DAILY_TOKEN_BUDGET`, `ADVISOR_TURN_RESERVATION` | app | optional; unset uses the code defaults |
| `E2E_LIVE` | live run | set to `1` on the command line in §3 |

The project must have every file in `supabase/migrations/` applied (`0001`–`0011` at `72370ee`). The
advisor specs need `0004` and `0005` at least. The dated deployed-schema records are under `docs/05-qa/`.

## 2. Seed the demo account

```bash
npm run db:seed
```

This runs `tsx src/lib/db/seed.ts` with the secret key, against the project `NEXT_PUBLIC_SUPABASE_URL`
names. It exits 1 before any network call if `SEED_DEMO_EMAIL` or `SEED_DEMO_PASSWORD` is unset. It writes:

- the demo **auth user**, created email-confirmed if it does not exist;
- that user's **`user_profiles`** row (upsert);
- **`lab_markers`**: the user's rows are deleted, then the sample markers are inserted;
- **`stacks`** and **`stack_items`**: the user's stacks are deleted, then one sample stack is inserted with its items.

It touches no other user's rows. Re-running it resets those tables for the demo user only.

## 3. The live run

In a fresh window (§0), with `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` exported to the values the seed used:

```bash
E2E_LIVE=1 npm run test:e2e
```

- Playwright builds and starts the app itself (`npm run build && npm run start`), and refuses a server already
  on `:3000`. Stop any `npm run dev` first.
- Under `E2E_LIVE=1` the config forces **one worker, not fully parallel** (`LIVE_SERIAL`), because every authed
  spec shares the one demo account (FU-25). Do not pass `--workers` or `--fully-parallel`: the command line
  overrides the config.
- **Expected count.** The non-live baseline is 70 passed and 30 skipped. A live run executes those **30
  tests in `[LIVE]`-gated blocks** as well (18 `[LIVE]`-tagged blocks, 17 `describe`s and one `test`, across 17 spec
  files). A full pass is **100 passed,
  0 skipped**. Anything else is a finding to report, not something to re-run until green.

## 4. Expected OpenAI calls

Five live tests send an advisor message: `advisor-actions-ui` (2), `ai-advisor` (1) and
`advisor-experience-actions` (2). Each message is one advisor turn of at most `MAX_TURNS` = 5 model calls
(`src/lib/advisor/agent.ts:47`), so a run makes **at most 25 chat-completion calls**. Each turn reserves
`ADVISOR_TURN_RESERVATION` (25,000 tokens by default) against the user's daily
`ADVISOR_DAILY_TOKEN_BUDGET` (200,000 by default; `src/lib/advisor/repo.ts:12-13, 216-217`). Five turns
reserve 125,000, which is inside one day's budget. A second full run on the same day can hit the budget's 429
before it finishes. The lab-import specs post **CSV only**, so the PDF extractor, the other paid path, is
never called. `retries` is 0 outside CI, so no test re-sends.

## 5. What to paste back (no secrets, no email)

1. Playwright's final summary lines: passed, skipped, failed, flaky, and the duration.
2. For each failed or flaky test: its full title and the first line of its error.
3. `git rev-parse HEAD`, `node -v`, `npx next --version`, and the date and local time of the run.
4. Whether §2 ran in the same session, and that §0's names-only check printed only §1's names.
5. From the OpenAI usage page, the request and token counts for the run window, to compare with §4.

These go into the closeout artifact's placeholder (`docs/01-plan/features/p4-closeout.plan.md` §6) at
landing (b).

## 6. Cleanup options for the demo user

- **(a) Keep it.** The run leaves conversations, advisor actions, check-ins and side-effect reports on the demo
  account. The next `npm run db:seed` resets only its profile, labs and stacks.
- **(b) Delete it.** Supabase dashboard → Authentication → Users. All 10 user-owned tables reference
  `auth.users` with `on delete cascade` (the 10 foreign keys in `supabase/migrations/0001`–`0009`), so its rows go with it. The next
  live run then needs §2 first.
- **(c) Keep it, but change `SEED_DEMO_PASSWORD`**, and re-seed before the next run. The seed creates the
  user only if it is missing, so change the password in the dashboard too.
