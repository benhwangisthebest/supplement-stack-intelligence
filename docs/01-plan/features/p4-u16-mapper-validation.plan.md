# P4 · U16 — mapper validation on row values (FU-29 (a))

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U16 row, D-8). It carries
> no approval status of its own. **Mode: RUNNER (parallel mode)**, under the standing approval in plan §6 D-1,
> runner specification item 1. Opened 2026-09-29 at anchor `39fd568` in worktree `../ssi-u16`, branch
> `p4-u16-mapper-validation`.
>
> **Status: LANDED 2026-09-29.** Parked at AC-2 on queue Q-8. The owner ruled (c) then (a): an owner-run read-only
> query of the deployed DB found **0** out-of-domain rows in all 13 columns, so *May touch* was widened to
> `src/lib/advisor/actions/schema.ts` and the write-side hole was closed (§ Q-8 (a)). Q-9 was accepted as built.
> Q-10: FU-17 untouched. N-111 registered. Commit and CI ids are in bkit and the unit report, not here, because
> this file is inside the commit it would have to cite.

## Scope

- **IN:** FU-29 (a). Validate at the mapper each row value that the 13 casts in `src/lib/db/mappers.ts`
  trusted, so that an out-of-domain value throws a typed error instead of reaching an engine.
- **OUT:** FU-17 (`toCheckin`'s coalescing). It is SUPERVISED under owner ruling (i), left untouched, and
  queued as Q-10. FU-57's row is kept. No migrations. No `src/types/**` changes. No caller changes.

## AC-1 — the 13 casts and their domains

None of the 13 columns has a DDL CHECK (`supabase/migrations/0001_init.sql`, `0002_lab_panels.sql`,
`0007_side_effects.sql`: plain `text` or `text[]`). Each domain is therefore its `src/types` union. No domain
is ambiguous. No union member has ever been removed: `git log -p` over `src/types/{primitives,stack,profile,
evaluation,side-effect,lab}.ts` and the barrel's history shows only moves and additions. So no known legacy
value falls outside a domain. No cast was skipped.

| # | Cast at `39fd568` | Column | Domain (source) | Validated at (worktree) |
|---|---|---|---|---|
| 1 | `mappers.ts:56` | `side_effect_reports.effect_label` | `CanonicalSideEffect` = `SIDE_EFFECT_VOCAB` (`src/types/side-effect.ts:10-31`) | `:199` |
| 2 | `:67` | `user_profiles.goals` (`text[]`) | `OutcomeCategory` (`primitives.ts:15`) | `:210` |
| 3 | `:69` | `user_profiles.risk_tolerance` (nullable) | `RiskTolerance` (`profile.ts:3`) | `:212` |
| 4 | `:73` | `user_profiles.form_preferences` (`text[]`) | `SupplementForm` (`primitives.ts:42`) | `:216` |
| 5 | `:75` | `user_profiles.experience_level` (nullable) | `ExperienceLevel` (`profile.ts:4`) | `:218` |
| 6 | `:100` | `lab_panels.source` | `LabSource` via `LabPanel["source"]` (`lab.ts:6`) | `:248` |
| 7 | `:138` | `stacks.intent` | `StackIntent` = `OutcomeCategory \| "experimental"` (`stack.ts:3`) | `:286` |
| 8 | `:139` | `stacks.mode` | `StackMode` (`stack.ts:4`) | `:287` |
| 9 | `:154` | `stack_items.timing` (nullable) | `ItemTiming` (`stack.ts:6`) | `:302` |
| 10 | `:155` | `stack_items.frequency` (nullable) | `ItemFrequency` (`stack.ts:14`) | `:303` |
| 11 | `:167` | `evaluation_flags.severity` | `FlagSeverity` (`evaluation.ts:3`) | `:315` |
| 12 | `:168` | `evaluation_flags.category` | `FlagCategory` (`evaluation.ts:5`) | `:316` |
| 13 | `:172` | `evaluation_flags.evidence_level` | `EvidenceGrade \| "n/a"` (`primitives.ts:9`; DDL default `'n/a'`) | `:320` |

Excluded, as in the register (N-3): `:40` (`ratings jsonb`, which is also FU-17's) and `:57`
(`side_effect_reports.severity`, which has `check (severity between 1 and 3)`).

## Design

- **`MapperDomainError`** (exported) carries `table` and `column`. Its message names those two and **never the
  value**: several of these columns are health context (§2.3 rule 15). Since U15 (`2705aeb`), the API log
  record carries only the error's class name (`src/lib/api/redact.ts`), but a server page's error still reaches
  Next's own log with its message. Its `name` is `"MapperDomainError"`, so the batch catch's `err.name === "StaleWriteError"` test
  (`execute.ts:257`) cannot misfile it. It carries no `reverted`/`unreverted` fields (`execute.ts:394`).
- **Each domain is a `Readonly<Record<Union, true>>` literal.** A missing member or an extra key is a compile
  error. So if a union grows (for example a new `FlagCategory`), `tsc` goes red at the mapper, rather than the
  mapper rejecting a value the write path now accepts. `SIDE_EFFECT_LABEL` is built from `SIDE_EFFECT_VOCAB`,
  because that union is derived from the list. `STACK_INTENT` spreads `OUTCOME_CATEGORY`.
- **Membership uses `Object.hasOwn`, not `in`:** `"toString" in {}` is true. A test pins this.
- **An absent key passes through unchanged** (queue Q-9, **accepted as built by the owner, 2026-09-29**).
  Rationale: FU-29 is *value* drift, and a key missing from the row object is *shape*. A `select("*")` row
  never lacks a column; the database returns a value or `null`, never `undefined`. Shape is SCHEMA_DRIFT's
  (Phase 1 U8), which checks the row types against the migrations column by column. Only a hand-built partial row
  lacks a key. Two such stubs sit outside *May touch* (`export-repo.test.ts:42,59`,
  `export-coverage.test.ts:75`), and 15 of their tests go red if absence is rejected. Rejecting it would widen
  U16 from value into shape, for no row the database can produce.
- `null` passes only for the four nullable columns: `nullableMember`.

## AC-2 — typed rejection, callers, and red proofs

**Typed rejection.** 13 `it.each` cases plant one out-of-domain value per former cast site into an otherwise
valid row, and assert `MapperDomainError` with the matching `{ table, column }`. Array columns plant the bad
element beside a good one. A 14th test checks the set has 13 distinct `table.column` entries.

**Red proofs** were run on a scratch clone (`cp -Rc` into the session scratchpad, `.git` removed; never in the
repo). Each proof restores one original cast and runs `vitest run src/lib/db/mappers.test.ts`. The table was
measured on the 44-test version of the file, before the Q-8 test existed. The independent reviewer re-ran all 13
at the landing commit (46 tests): each still reddens its own case, and M6 also reddens the Q-8 test. The file was
then restored by file copy and confirmed with `cmp` (`RESTORED_CMP_OK`).

| Mutation (cast restored) | Result | Red tests |
|---|---|---|
| M0 `effect_label` | 1 failed / 44 | its case |
| M1 `goals` | 2 failed | its case + the no-value-in-message test (it plants into `goals`) |
| M2 `risk_tolerance` | 1 failed | its case |
| M3 `form_preferences` | 1 failed | its case |
| M4 `experience_level` | 1 failed | its case |
| M5 `source` | 1 failed | its case |
| M6 `intent` | 2 failed | its case + the `Object.prototype` test |
| M7 `mode` | 2 failed | its case + the `Object.prototype` test |
| M8 `timing` | 1 failed | its case |
| M9 `frequency` | 1 failed | its case |
| M10 `severity` | 1 failed | its case |
| M11 `category` | 1 failed | its case |
| M12 `evidence_level` | 1 failed | its case |

**Callers — the stop.** An independent read-only audit (Explore subagent) enumerated every path from outside
`src/lib/db` into the six changed mappers. The runner then re-read the load-bearing lines (§5 rule 11).

- **Handled.** Every API path ends in `handle`/`internalError` (`src/lib/api/respond.ts` `internalError` `:150`, `handle` `:194`, after U15; `:306-336` at the anchor): a 500 with
  the fixed message and a correlation id. Pages fall to Next's default error page. Nothing discriminates the new
  error into a 404, a 409 or success. No path returns `null`/`[]` on a throw. Nothing leaks to the client.
- **Not handled: H1, which stops the unit (Q-8).** `generate_protocol`'s intent is `z.string().min(1)`
  (`src/lib/advisor/actions/schema.ts:47`), cast at `apply.ts:104`, and the payload is client-supplied
  (`schema.ts:83`, re-parsed by `advisor-actions.ts:77` against that same schema). `createStack` commits at
  `execute.ts:102`, then `toStack` throws. The action never joins `done` (`execute.ts:168-170`), and the
  response claims `rolledBack: true` (`advisor-actions.ts:161`). Every later `listStacks` for that user throws,
  and `DELETE /api/stacks/[id]` throws at its `getStack` precheck (`route.ts:52`). Today the same request
  silently stores a wrong intent. Fixing it is a caller change outside *May touch*: stop class.
- **Residuals, recorded rather than fixed** (write, then map, with in-domain input in practice): `replaceFlags`
  (`evaluation-flag-repo.ts:100-112`: both flag sets survive until the next evaluation), `POST /api/checkins`
  (`side-effect-repo.ts:59-84`), and the forward writes at `execute.ts:64,90,105,122`. **Arbitrary content:**
  undo and rollback inverses are unvalidated jsonb (`advisor-action-repo.ts:39,92`) mapped after the write
  (`execute.ts:295-330`, `undo/route.ts:75-85`), so a throw misreports a restored row. That is in Q-8.
  **Pre-existing:** the advisor route's token reservation is not settled when context loading fails
  (`api/advisor/route.ts:188-222`). **Export** is all-or-nothing (`export-repo.ts:126-142`), which is loud, but
  it sits uneasily with that module's "export as stored" stance for citations.
- **Deployed data is unknown.** Any out-of-domain row already stored (H1 has been reachable since v7) becomes a
  permanent 500 for its owner once U16 lands. Checking needs a live read, so it is Q-8 (c).

## AC-3 — no in-domain behaviour change

Every existing test in `mappers.test.ts` passes unmodified. Only new blocks were appended, plus added import
names. Per-file counts, where `it(` counts the literal token:

| File | `it(` | `it.each(` | `test(` | `describe(` | vitest tests |
|---|---|---|---|---|---|
| `src/lib/db/mappers.test.ts` before (`39fd568`) | 24 | 1 (a comment) | 0 | 9 | 24 |
| after | 30 | 2 | 0 | 11 | 46 |

No other test file was touched. Whole-suite and per-file counts for anchor and landing are compared in the gate
record (§ Landing gate).

## Q-8 (c) query

Printed to the owner on 2026-09-29, **SELECT only**, returning counts, never a value. Its domain lists were
**generated** from the `Domain` literals and `SIDE_EFFECT_VOCAB`, with sizes 18·11·3·6·3·4·12·2·6·4·3·13·5 in AC-1
order. Nullable columns count only a non-null outsider. `text[]` columns count a null array, a null element, or an
outsider, which is exactly what `members` rejects. The runner could not execute it: the local Postgres binaries
are the wrong architecture, and installing one is a network call. The SQL editor runs as `postgres` (it bypasses
RLS), so the counts cover every user. The query as run (FU-24):

```sql
select 'side_effect_reports.effect_label' as table_column, count(*) filter (where effect_label is null or effect_label <> all (array['nausea', 'gi-upset', 'diarrhea', 'constipation', 'headache', 'drowsiness', 'insomnia', 'jitteriness', 'anxiety', 'dizziness', 'dry-mouth', 'flushing', 'water-retention', 'vivid-dreams', 'heartburn', 'fatigue', 'rash', 'metallic-taste']::text[])) as out_of_domain, count(*) as rows_checked from public.side_effect_reports
union all
select 'user_profiles.goals' as table_column, count(*) filter (where goals is null or exists (select 1 from unnest(goals) as v(x) where x is null or x <> all (array['sleep', 'focus', 'training', 'recovery', 'stress', 'gut', 'metabolic', 'longevity', 'foundational', 'mood', 'deficiency']::text[]))) as out_of_domain, count(*) as rows_checked from public.user_profiles
union all
select 'user_profiles.risk_tolerance' as table_column, count(*) filter (where risk_tolerance is not null and risk_tolerance <> all (array['low', 'moderate', 'high']::text[])) as out_of_domain, count(*) as rows_checked from public.user_profiles
union all
select 'user_profiles.form_preferences' as table_column, count(*) filter (where form_preferences is null or exists (select 1 from unnest(form_preferences) as v(x) where x is null or x <> all (array['capsule', 'powder', 'gummy', 'liquid', 'tablet', 'softgel']::text[]))) as out_of_domain, count(*) as rows_checked from public.user_profiles
union all
select 'user_profiles.experience_level' as table_column, count(*) filter (where experience_level is not null and experience_level <> all (array['beginner', 'intermediate', 'advanced']::text[])) as out_of_domain, count(*) as rows_checked from public.user_profiles
union all
select 'lab_panels.source' as table_column, count(*) filter (where source is null or source <> all (array['pdf', 'csv', 'paste', 'manual']::text[])) as out_of_domain, count(*) as rows_checked from public.lab_panels
union all
select 'stacks.intent' as table_column, count(*) filter (where intent is null or intent <> all (array['sleep', 'focus', 'training', 'recovery', 'stress', 'gut', 'metabolic', 'longevity', 'foundational', 'mood', 'deficiency', 'experimental']::text[])) as out_of_domain, count(*) as rows_checked from public.stacks
union all
select 'stacks.mode' as table_column, count(*) filter (where mode is null or mode <> all (array['current', 'planned']::text[])) as out_of_domain, count(*) as rows_checked from public.stacks
union all
select 'stack_items.timing' as table_column, count(*) filter (where timing is not null and timing <> all (array['morning', 'midday', 'evening', 'pre-workout', 'with-meal', 'bedtime']::text[])) as out_of_domain, count(*) as rows_checked from public.stack_items
union all
select 'stack_items.frequency' as table_column, count(*) filter (where frequency is not null and frequency <> all (array['daily', 'workout-days', 'as-needed', 'weekly']::text[])) as out_of_domain, count(*) as rows_checked from public.stack_items
union all
select 'evaluation_flags.severity' as table_column, count(*) filter (where severity is null or severity <> all (array['info', 'warning', 'critical']::text[])) as out_of_domain, count(*) as rows_checked from public.evaluation_flags
union all
select 'evaluation_flags.category' as table_column, count(*) filter (where category is null or category <> all (array['evidence-fit', 'dose-fit', 'timing-fit', 'redundancy', 'allergy-conflict', 'medication-caution', 'interaction-risk', 'lab-relevance', 'goal-alignment', 'cost-efficiency', 'complexity', 'side-effect-caution', 'food-pairing']::text[])) as out_of_domain, count(*) as rows_checked from public.evaluation_flags
union all
select 'evaluation_flags.evidence_level' as table_column, count(*) filter (where evidence_level is null or evidence_level <> all (array['A', 'B', 'C', 'D', 'n/a']::text[])) as out_of_domain, count(*) as rows_checked from public.evaluation_flags order by table_column; 
order by table_column;
```

**Result, owner-run on the deployed DB, 2026-09-29:** `out_of_domain = 0` for all 13 rows.

## Q-8 (a) — the write-side fix

`generateProtocolPayloadSchema.intent` (`src/lib/advisor/actions/schema.ts`) was `z.string().min(1)`. It is now
`stackInputSchema.shape.intent`: the StackIntent union, by the same rule the stack route validates with. An
out-of-domain intent now fails `revalidate` (`src/services/advisor-actions.ts:77`) **before any write**, and the
`ZodError` becomes a 400 at `advisor-actions.ts:299`, so no caller changed. Server-built proposals send
`goals[0]` (`proposals.ts:260`), which is an `OutcomeCategory`, so this narrows nothing the app itself sends.

- **Test** (in `mappers.test.ts`, which keeps the landing inside *May touch*): the advisor rejects `"cognition"`,
  which `toStack` also rejects; and it accepts all 12 intents, each of which `toStack` also accepts.
- **Red at HEAD:** on a scratch clone, HEAD's `schema.ts` was restored. *rejects an out-of-domain intent before
  any write* then failed (1 failed of 46). The file was restored and confirmed with `cmp` (`RESTORED_CMP_OK`),
  and all 46 passed again.

## Landing gate

G was run on the landing commit, rebased onto `2705aeb` (U15), in a clean `git worktree add --detach` outside
the repo. All 8 steps passed: `tsc` clean · lint 0 errors · `vitest` 1922 / 1922 (149 files) · `test:coverage` green (`mappers.ts` 100%) ·
`next build` OK · `verify:bundle` every route within 1% (`/advisor` +246 B, 0.215%) · `verify:rendering` OK ·
non-live E2E 70 passed, 30 `[LIVE]` skipped.

G was re-run after this section was written (docs only). **Independent reviewer: PASS WITH ADVISORIES**, no blocking
finding. Advisories 1–4 (a stale `respond.ts` citation, the red-proof table's file version, this section, the query
not being in the tree) are fixed above. **Advisory 5 is kept as a residual:** a `null` for `goals` or
`form_preferences` throws `TypeError` from `values.map`, not `MapperDomainError`. Both columns are
`text[] not null`, so no `select("*")` row can produce one, and it still fails loudly without the value.
