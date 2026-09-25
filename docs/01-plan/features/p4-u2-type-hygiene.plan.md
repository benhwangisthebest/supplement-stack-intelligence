# p4-u2-type-hygiene — PDCA cycle artifact for Phase 4 U2

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U2**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U2 · Type and dead-code hygiene · **SUPERVISED** · deterministic · size S · **Anchor** `7f9e9ce` · **Date** 2026-09-25
> **Authority:** the owner's standing approval for U2 (2026-09-25): branch, commit, push, fast-forward `main`, delete the
> branch, on a green G over the staged tree and green branch CI. **The safety-copy deletions and the sweep narrowing are
> outside it:** they were shown verbatim and staged only on the owner's written approval of that exact text.

## 1. Plan

**Goal (the brief's):** make `Effect.evidenceProfile` required, correct `paper.ts`'s stale header, and delete the dead
`safetyCopy` helpers (except the two held) and `getRemainingBudget`, each deletion proven to have zero non-test callers.
**Carried items:** FU-63, FU-58, N-12, FU-30 (in part: `labSupported`/`labCaution` held under D-3).
**Also recorded here, verbatim, in plan §6 and the queue:** the owner's answers to Q-1…Q-3, the U19 amendment, and U1's
clarifications C-1…C-4. Q-2's answer issued **FU-73** (the highest FU in `docs/` and `CLAUDE.md` was FU-72).

## 2. Design

Four independent edits, one commit. The type edit goes first and the compiler enumerates its callers; every one it names
is a test fixture, so no production reader needed a change. Fixtures that model an ordinary effect get a made-up profile,
since the code under them reads only `grade` (`SupplementCard.tsx:24`, `supplement-archetypes.ts:35`). The two tests that
exist to exercise the no-profile branch keep exercising it, building the effect past the type with a cast, because
retiring those branches needs files and `it(` deletions U2 may not make (N-90). Each deletion was proved dead before it
was made: all 31 `safetyCopy` methods were enumerated from the object literal and matched against `safetyCopy.<name>`
across `src/` (27 used; the 4 unused are FU-30's four), and no test or source indexes `safetyCopy` dynamically.

## 3. Do — what changed, with callers

**FU-63, the type.** `src/types/effect.ts:27` → `evidenceProfile: EvidenceProfile;` with its comment rewritten.
`npx tsc --noEmit` then named **five callers, all test fixtures** (the brief's *"callers tsc names"*):

| File | Change | Tests before → after |
|---|---|---|
| `src/components/evidence/CoverageLimit.test.tsx` | made-up profile on `madeUpEffect` (grade C) | 8 → 8 |
| `src/components/library/SupplementCard.test.tsx` | made-up profile in the fixture | 4 → 4 |
| `src/lib/identity/supplement-archetypes.test.ts` | made-up profile in the fixture | 9 → 9 |
| `src/components/library/SupplementDetail.test.tsx` | builder typed `Omit<Effect, "evidenceProfile">`; only the unprofiled return is cast; header updated | 6 → 6 |
| `src/lib/evidence/evidence.test.ts` | builder typed `Omit<…> & Partial<Pick<…>>`; only the profile's absence is cast | 16 → 16 |

**FU-58, the header** (`src/types/paper.ts`). Old, lines 1-10:
```
// Design §3.1 — seed entity (read-only TS module)
//
// v13 (evidence-disclosure): this is an ILLUSTRATIVE EVIDENCE SUMMARY, not a citable
// study. The provenance fields (authors/journal/year/link/studyType/sampleSize) are
// deliberately ABSENT, not optional: `link: string` being REQUIRED is what compelled
// 20 fabricated placeholder URLs in the first place. With no field to hold provenance,
// fabricating it is a type error rather than a judgement call.
//
// Plan SC: SC-1 — provenance is unauthorable by construction.
// Re-adding any of these fields requires real, verified DOI/PMID data. Never invent it.
```
New, lines 1-14, each claim with its source:
```
// Design §3.1 — seed entity (read-only TS module)
//
// What a Paper holds today (header corrected by Phase 4 U2, FU-58). Since Phase 3 a
// paper may carry ONE kind of provenance: a `doi` or `pmid`, and only behind an
// entry in content/verification/provenance-fixture.json, which records the title
// the resolver returned and the committed response it was read from
// (content/verification/provenance.mjs). A paper with neither is still a valid
// Paper; the type does not make every paper citable.
//
// Every other provenance field (authors/journal/year/link/studyType/sampleSize) is
// deliberately ABSENT, not optional (v13, SC-1): with no field to hold it,
// fabricating it is a type error rather than a judgement call. The fixture cannot
// smuggle them in either; it accepts no such key. Re-adding any of these fields
// requires real, verified data. Never invent it.
```
- *doi or pmid only* → `paper.ts:30-31` (`doi?`, `pmid?`, the only provenance keys) · *behind a fixture entry* →
  `provenance.mjs:3-4` · *resolved title and committed response* → `provenance.mjs:16-25` (`resolvedTitle`, `response`).
- *a paper with neither is valid* → `paper.ts:30-31` are optional (and `p-nac-antioxidant` carries neither, FU-57).
- *other fields absent* → `paper.ts:15-32` declares none of them · *the fixture accepts no such key* → `provenance.mjs:26`.
- **Dropped:** *"ILLUSTRATIVE EVIDENCE SUMMARY, not a citable study"* (the tree contradicts it: 37 papers carry a verified
  id) and *"20 fabricated placeholder URLs"* (history, recorded in `docs/archive/2026-07/evidence-disclosure/`, not in the allowed sources).

**N-12.** `getRemainingBudget` and `today()`, its only user, deleted from `src/lib/advisor/repo.ts`; `:192-196` says so.
`repo.test.ts`: the import, the `fakeSupabase` stub (used by those tests alone), `describe("getRemainingBudget")` with its
4 `it(`, and the U9 pin `it("getRemainingBudget filters by user_id and today's date")` → **30 → 24** (1 describe + 5 it),
and `ADVISOR_DAILY_TOKEN_BUDGET`, imported only for the deleted default-budget case. Two comments that described the
function as live (`repo.ts:281-284`, `repo.test.ts:291-292,303-305`) now call it since-deleted. **`:226`'s race comment is
history** (*"The previous pair"*) and is unchanged.

**FU-30 (part), held for the owner.** `safetyCopy.medicationCaution` and `safetyCopy.productReasonValue` deleted from
`src/lib/safety/index.ts`; `safety.test.ts` loses the one sweep entry for `medicationCaution`. Shown to the owner
verbatim (§5) before staging.

## 4. Check — per acceptance criterion

**AC-1 red, run 2026-09-25.** Backups by `cp` of `content/seed/seed-effects.json` and `src/data/seed-effects.ts`;
`creatine-strength`'s `evidenceProfile` deleted in the JSON; `npm run content:generate` → *"1 changed"*; `npx tsc --noEmit`
→ **exit 1**, `src/data/seed-effects.ts(146,3): error TS2741: Property 'evidenceProfile' is missing` (line 147 is
`id: "creatine-strength"`). Restored by `cp`; `cmp` equal; regenerated; `cmp` of the generated file against its backup
equal; `git diff --quiet HEAD -- content/ src/data/` exit 0; `content:generate -- --check` → *"0 stale"*; `tsc` exit 0.

**AC-3, callers per deletion** (`git grep -n <name> -- ':!*.test.ts' ':!*.test.tsx'`, run after the edit):

| Deleted | Non-test hits | What they are |
|---|---|---|
| `getRemainingBudget` | `repo.ts:194`, `:226`, `:282`; `docs/**`; `supabase/migrations/0008…:37` | comments only; no code. `0008…:37` and `docs/05-qa/2026-08-12-deployed-schema-record.md:426` are present-tense rationales now false, recorded in N-90 (reviewer, minor 5) |
| `today()` (repo.ts-local) | none | — |
| `safetyCopy.medicationCaution` | none for `safetyCopy.medicationCaution` or `.medicationCaution(` anywhere | the remaining `medicationCaution` hits are a different symbol, the `Protocol` field (`src/types/protocol.ts:28`, `protocol-builder/index.ts:118`, `SuggestionCard.tsx:62`) |
| `safetyCopy.productReasonValue` | `docs/**` only | history |

`safetyCopy` now has **29** methods (31 − 2).

**AC-4, the sweep** (`safety.test.ts`, `samples` in *"every flag copy builder…"*): **12 → 11** entries. The difference
(1) is **not** the number of deleted helpers (2): `productReasonValue` was never in any sweep (no test calls any
`productReason*` helper directly; `git grep -n productReason -- '*.test.ts' '*.test.tsx'` is empty). `labSupported` and
`labCaution` stay, now at `:37`/`:38`.

**AC-5, `it(`/`test(`/`describe(` per touched file** (C-3's count; `grep -cE '^\s*(it|test|describe)(\.\w+)?\('`, HEAD →
tree): the five fixtures above unchanged; `repo.test.ts` 30 → 24 (getRemainingBudget, above); `safety.test.ts` 11 → 11.
No other drop.

**AC-6.** `npx vitest run src/architecture` → 30 files / 465 tests green after the plan and queue edits. `^**RULED` count
in the plan: **16**, unchanged. The answers are written as quotations in a §6 block, not as RULED lines.

## 5. Stop for the owner

Two items stopped here (landing (a)):
1. **The safety diff** — shown verbatim in the session; staged only on written approval of that exact text.
2. **N-90 (FU-63's remainder).** FU-63's register text also retires `SupplementDetail.tsx:180`'s `e.evidenceProfile &&`
   and its fallback test; `src/lib/evidence/index.ts:28,35` hold the same kind of branch. Both files are outside U2's
   *May touch*, and retiring them deletes 3 `it(` blocks (stop class 2). Two stale comments are also outside it:
   `src/types/evidence-grading.ts:33-36` and `tests/e2e/evidence-grading-actions.spec.ts:26`. **FU-63 is closed in part.**

**Owner, 2026-09-25:** the safety diff in §3 was **approved exactly as shown** (blobs `ba1d4c9`, `2390e99`, re-checked
before staging). **N-90 stays open**, *May touch* not widened; `0008…sql:37` accepted as-is (applied migrations are
immutable); the QA record stays as a dated record; the code paths, three tests and two comments get an owning unit at
U3's closeout (recorded in N-90).

## 6. Report

**AC-7, independent review** (fresh subagent; inputs: the U2 row, `git diff HEAD`, the plan): **VERDICT: PASS WITH NOTES**,
no BLOCKING finding. It ran `tsc` (exit 0), `npx vitest run src/lib src/components src/architecture` (114 files, 1388/1388)
and `eslint` on the changed files, and re-derived the counts. Notes 1, 2 and 7–10 confirm the deletions are dead (no dynamic
`safetyCopy` access), the counts, the header claims, the citations, the scope and `**RULED` = 16. Minors, dispositioned:
- **3** made-up profiles score all 1, which would derive D beside literal grades C/A–D; no assertion weakened (consumers
  read the literal grade). **Fixed:** the three fixture comments now say so.
- **4** whole-object `as Effect` casts would hide a future required field. **Fixed:** both builders are typed
  `Omit<Effect, "evidenceProfile">`, so only the profile's absence is cast.
- **5** `0008_usage_ledger_policy.sql:37` and `docs/05-qa/…-deployed-schema-record.md:426` still say `getRemainingBudget`
  reads the table. **Registered** in N-90; both files are outside *May touch*.
- **6** the U2 row's Closes cell named FU-63 unqualified. **Fixed:** *"FU-63 (in part; remainder N-90)"*.
- The reviewer could not check the owner quotes against a source in the tree; they are copied from the brief.

**Pre-approval G** (clean worktree at `7f9e9ce` + the full diff, safety included, before minors 3–4): tsc, lint **416/416**,
vitest **1710/1710** (144 files; −5 = `getRemainingBudget`), `test:coverage` green (all files 79.31 · 83.84 · 75.63 · 79.31,
no floor edited), build, `verify:bundle` OK, `verify:rendering` OK, E2E **70 passed / 30 `[LIVE]` skipped**.

**AC-8** ran on the final staged tree, after this file was last edited, so its result cannot be written here without
changing what it measured. It is recorded in the commit message body; the CI run id is in the unit report to the owner.
