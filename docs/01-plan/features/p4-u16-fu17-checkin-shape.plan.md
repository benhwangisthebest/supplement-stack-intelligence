# P4 · U16 (FU-17 half) — `toCheckin` shape validation

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U16 row, D-8). It carries
> no approval status of its own. **Mode: SUPERVISED** (owner ruling (i), U0 closeout), parallel with U17. Opened
> 2026-09-29 at anchor `35b7503` in worktree `../ssi-u16b`, branch `fix/p4-u16-fu17`.
>
> **Status: stopped at AC-2, then built on the owner's ruling (c) (queue Q-23).** The brief's premise, that the
> coalescing was dead, held for the DDL and the type but not for the values a `jsonb not null` column can hold.
> Commit and CI ids are in bkit and the unit report, not here, because this file is inside the commit it would
> have to cite.

## Owner approval (2026-09-30)

The `toCheckin` diff and the rewritten test were approved exactly as shown, with the helpers kept above
`toCheckin`. The owner asked for three points to be recorded:

1. **One malformed row now fails the whole read.** This is the same trade-off FU-29 (a) made (§ Design).
2. **The deployed data was checked clean.** The owner ran a read-only check: 2 rows, 0 bad (§ AC-1).
3. **The reviewer's reachability correction.** A signed-in user can write a wrong shape into their own rows
   through PostgREST. They cannot write a JSON `null` that way (§ AC-1, review A1).

## Scope

- **IN:** FU-17. `toCheckin`'s `ratings ?? {}`, `taken ?? []`, `scheduled ?? []` (`src/lib/db/mappers.ts`).
- **OUT:** every other mapper. No migrations (a `jsonb_typeof` CHECK would be FU-29 (b)'s class, OUT under D-8).
  No `src/types/**` changes. No caller changes.

## AC-1 — DDL and row type, per coalesced field

| Field | DDL (`supabase/migrations/0006_checkins.sql`) | `CheckinRow` (`src/lib/db/types.ts`) | Both non-null? |
|---|---|---|---|
| `ratings` | `:10` `jsonb not null default '{}'::jsonb` | `:43` `Record<string, number>` | yes |
| `taken` | `:11` `jsonb not null default '[]'::jsonb` | `:44` `string[]` | yes |
| `scheduled` | `:12` `jsonb not null default '[]'::jsonb` | `:45` `string[]` | yes |

No field disagreed. (The brief named `StackItemRow`. `toCheckin` reads `CheckinRow`, so that is the type
checked.)

**But the coalescing was not dead.** `NOT NULL` on a `jsonb` column rejects SQL NULL only. The JSON value `null`
(`'null'::jsonb`) is a non-null `jsonb` value, and PostgREST returns it as JS `null`. No CHECK constrains the
shape, so `taken` could equally hold an object. This is documented Postgres behaviour, **not executed here**:
both local Postgres builds are x86_64 on an arm64 host without Rosetta, and no download was made.

**Reachability.** The app cannot write such a value. The only writer is `upsertCheckin`
(`src/lib/db/checkin-repo.ts:67-89`), fed by `checkinInputSchema` (`src/lib/validation/schemas.ts:122-124`),
whose record and arrays reject `null` (`.default` fills `undefined` only). An unwritten column takes its DDL
default. Only a write outside the app's route reaches the case: direct SQL, or (review A1, not executed) a signed-in
user's own PostgREST write with the public key, since `own_checkins` is `for all` (`0006_checkins.sql:26-27`)
and no migration revokes table grants. That path turns a JSON `null` into SQL NULL, which `not null` rejects, but
can store a wrong shape (`taken: {"a":1}`), in the user's own rows only. **Deployed DB (owner-run, read-only, 2026-09-29):** rows
checked 2; bad `ratings` 0, bad `taken` 0, bad `scheduled` 0.

## AC-2 — the stop, and the ruling

Removing the three `??` was `tsc`-clean and turned `src/lib/db/mappers.test.ts:77` red
(*"defaults null ratings/taken/scheduled to empty rather than passing null through"*: `expected null to deeply
equal {}`, 1 failed | 45 passed). The test asserted a default for a null, so the unit stopped per the brief.
Its comment was also false: *"Postgres can return null for a jsonb/array column that was never written"*. An
unwritten column gets its default.

**Owner ruling (c), 2026-09-29 (queue Q-23):** replace the three `??` with shape validation: `ratings` must be a
JSON object, and `taken` and `scheduled` arrays of strings. Otherwise throw `MapperDomainError("checkins",
<column>)`, naming the column and never the value. Rewrite the `:77` test in place as a throw assertion per
column, with its comment corrected.

## Design

- Two helpers beside `toCheckin`, used by nothing else: `jsonObject` (non-null, non-array object) and
  `stringArray` (array whose every entry is a string). Each throws `MapperDomainError(table, column)`, the
  FU-29 (a) error, so a caller that already handles it handles these.
- **Absent key: passes through, per Q-9** (the owner kept U16 (a)'s rule). A `select("*")` row never lacks a
  column and SCHEMA_DRIFT owns shape. This changes one thing: a hand-built partial row without `taken` now
  maps to `undefined` rather than `[]`. No tracked caller builds one: `toCheckin`'s only callers are the four
  `select("*")` reads in `checkin-repo.ts` (`:31`, `:47`, `:63`, `:88`), and outside `mappers.test.ts`
  `CheckinRow` is otherwise named only as a type (`schema-type-drift.test.ts:347`, `:641`). One test stub
  omits the three keys (`src/lib/db/export-repo.test.ts:48`, reaching `toCheckin` through `listAllCheckins`); it
  now maps them to `undefined`, and still passes. Q-9 already names that stub (review A2).
- **One bad row now fails the whole read** (review A3): `/api/account/export` answers 500 for every table, through
  `handle()`'s generic message with a correlation ID, and the Stack Lab page errors. Before, the row was
  silently defaulted. This follows from the ruling and matches FU-29 (a); export is the data-portability path.
- `ratings`' **keys and values** are not validated (outcome category, 1–5). The ruling names the object shape
  only. The write path validates both (`checkinInputSchema`). The cast to
  `Partial<Record<OutcomeCategory, GoalRating>>` stays.

## Tests

`mappers.test.ts:77` is rewritten in place as one `it.each` row per column (46 → 48 tests in the file). Each
row plants a JSON `null` and two wrong shapes, carrying the sentinel `"warfarin"`, and asserts, for each:
a `MapperDomainError` with `{ table: "checkins", column }` and a message without the sentinel. It then asserts
that the column's DDL default maps unchanged.

## Red evidence (worktree; restored by file-copy backup, `shasum` equal after each)

| Proof | Mutation | Red |
|---|---|---|
| R0 | HEAD's `mappers.ts` (the three `??`) with the new test | ratings, taken, scheduled (3 failed \| 45 passed) |
| M1 | `jsonObject` drops `!Array.isArray(value)` | ratings |
| M2 | `jsonObject` drops `value !== null` | ratings |
| M3 | `stringArray` drops the `every(... string)` check | taken, scheduled |
| M4 | `scheduled` validated under the column name `"taken"` | scheduled |
| M5 | `taken: row.taken` (unvalidated) | taken |

## Acceptance

- AC-1: table above; no disagreement.
- AC-2: `tsc` clean. U16 (a)'s validation is untouched and never covered `toCheckin` (`ratings` was excluded as
  FU-17's, `p4-u16-mapper-validation.plan.md:45`). The one test asserting a null default stopped the unit and
  was rewritten on the ruling. Every other mapper test passes unmodified.
- AC-3: `npx vitest run src/architecture`: 30 files, 534 tests, equal to `main` at `35b7503`.
- AC-4: independent review, recorded below.
- AC-5: G on the staged tree in a clean worktree, recorded in bkit.

## Independent review (AC-4)

Fresh subagent on a scratch copy of the tree. **Verdict: PASS WITH ADVISORIES**, nothing blocking. It re-ran
`tsc` (clean), the mapper tests (48/48), the architecture specs (30 files, 534, with a copied `.git`) and
`src/lib/db`, `src/app/api/checkins`, `src/app/api/account`, `src/services` (197/197). It re-proved R0 and M1–M5
and added M6, M7, M9, M10, and M8/M8b (the value written into the message), all red. It confirmed every citation
and the Postgres/PostgREST semantics, and that the diff touches only the five allowed files. Advisories: A1
(reachability wording), A2 (the export stub), A3 (a bad row fails the whole read): each is recorded above.
A4 (rating keys and values unvalidated) is already stated under Design.
