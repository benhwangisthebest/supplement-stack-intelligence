# P4 · U22 — Lab entry integrity: no empty-as-zero values; an import range follows its unit (N-114, N-115, N-116)

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U22 row; N-114, N-115,
> N-116). It carries no approval status of its own. **Mode: SUPERVISED**, deterministic. Opened 2026-09-30 at
> anchor `481518a`, in worktree `../ssi-u22`, branch `p4-u22-lab-entry-integrity`. Registered with bkit at open
> (RC-4). Commit and CI ids are in bkit and the unit report, not here, because this file is inside the commit
> it would have to cite.
>
> **Owner note, recorded here as directed:** U21's rulings asked for N-114 and N-116 to be fixed in U21. They
> were registered as OPEN instead (phase plan §6, "U21 review findings 2, 3, 4, 8"). U22 closes them.
>
> **Status: stopped at AC-3 for the notice copy (N-115), as briefed. Landed on the owner's rulings of
> 2026-10-01 (phase plan §6): the copy approved as shown, *May touch* widened to the per-reading edit, and
> review finding 4 registered as N-117.**

## 1. The map (HEAD `481518a`)

| Path | Empty Value | Whitespace bound | Range under an edited unit |
|---|---|---|---|
| Profile form, `LabMarkerTable.tsx` `add()` | **saved as 0**: `Number("")` is 0, so the `isNaN` check passes | **sent as 0**: `boundToSend` tested `=== ""` only | handled since U21 (N-113) |
| Import review, `LabReviewConfirm.tsx:72-78` | **saved as 0**: the value input wrote `Number(e.target.value)`, and a cleared number input reads `""` | no bound fields | **saved mislabelled**: the range was not shown, and it was committed under the edited unit (N-114) |
| Per-reading edit, `LabMarkerModal.tsx:119-135` | **saved as 0**, same cause | **sent as 0**, same cause | **re-sent under the new unit** (`:300-327`), though the bounds are visible |
| API: `labMarkerInputSchema`, `labCommitSchema` | rejected: `z.number()` does not coerce, so `""` is a type error | rejected, same | n/a (the server cannot know the entered unit) |
| Parsers: `csv.ts`, `paste.ts` | a row with no value is skipped (`parseNumber` → null) | an empty cell is null | n/a |

So the server was never the bug. The zero is made in the browser, by `Number("")`, before the request.
`LabMarkerModal.tsx` was outside *May touch*. The owner widened it at the stop (§5).

## 2. The fix

- **Form (AC-1).** `add()` treats a blank or whitespace Value as `NaN`, so the existing check shows the
  existing message. `boundToSend` treats a whitespace-only bound as empty (null). A typed `0` is still 0.
- **Import review (AC-1, AC-2).** The gate keeps the rows as extracted (unit and range), taken on its first
  render. It mounts per review and unmounts on cancel or save. A row keeps its extracted range only while its
  unit normalises (`normalizeEnteredUnit`, U21's pinned copy of `normalizeUnit`) to the extracted unit.
  Editing it back restores the range. The range is shown beside the unit as `Reference 30–100`, using the
  table's existing label and format, and only when a bound exists. The Value is held as typed. A blank draft
  does not touch the row's number, marks the field invalid, and disables *Confirm & save* while that row is
  approved. Unchecking the row, or typing a value, re-enables it.
- **Notice (AC-3, N-115).** `labRangeClearedCopy` in `src/lib/safety` (`form`, `review`), swept for banned
  language, reaches each client component as a prop from the profile page. A range that will not be saved
  is shown blank, and the notice shows while it is. Typing in a bound marks it the user's, so a typed
  number is kept even when it equals the filled one: a touched flag, not a value comparison, since
  re-typing the same number into a blanked field would otherwise be dropped again.
- **Per-reading edit (widened).** A blank Value fails the existing check, and a whitespace bound is
  null. While the Unit does not normalise to the stored unit, a stored bound the user has not typed in is
  shown blank, sent as null, and the `form` notice shows. A Unit edited back restores it.
- **Server (AC-1).** No change. Tests now pin that `""` and `"   "` are rejected for the value and each
  bound, by both schemas, so a later `z.coerce` would go red.

## 3. Evidence

**R0, at HEAD with the new tests: 7 red** (`LabMarkerTable` 3, `LabReviewConfirm` 4), each for its stated
reason. Examples: fetch called with `value: 0`, `referenceLow: 0` for `"  "`, `30–100` not found, the commit
body carrying `referenceLow: 30` under `nmol/L`, and a committed `value: 0`. The two schema pins are green at
HEAD, which is the finding: the server never coerced.

**R1, after the widening, before its fix: 8 red** (form notice 3, modal 4, review notice 1). The
modal's two keep-cases (a re-typed bound, a case-only unit edit) pass at HEAD and guard against
over-clearing.

**Green after:** 217 of 217 across 9 files: `src/components/profile`, `src/lib/safety`, `src/lib/validation`,
`src/lib/lab-import` and `src/lib/biomarkers`.

**Mutations** (scratch copy, restored by copy and verified with `cmp`):

| # | Mutation | Red |
|---|---|---|
| M1 | form Value blank-check removed | 2 (empty, whitespace) |
| M2 | form bound `trim()` removed | 1 |
| M3 | review keeps the range under any unit | 1 (the 30–100 ng/mL → nmol/L case) |
| M4 | review compares units without normalising | 1 |
| M5 | review gate not blocked on a blank Value | 1 |
| M6 | review range not shown | 2 |
| M7 | a blank review Value written into the row (review finding 3; pinned after the review) | 1 |
| N1 | form: typing does not mark a bound typed | 1 |
| N2 | form: a dropped bound still displayed | 3 |
| N3 / N4 / N10 | notice not rendered: form / review / modal | 2 / 1 / 1 |
| N5 / N6 | modal: Value blank-check / bound trim removed | 2 / 1 |
| N7 / N8 / N9 | modal: never drops / ignores the typed flag / no unit normalisation | 1 / 1 / 1 |
| N11 / N12 | modal: typed flags not reset per edit / review: half-open range cleared without notice (round 2 finding 1; pinned after) | 1 / 1 |

**Per-file counts (AC-4), HEAD → after:** `LabMarkerTable` 17 → 24 · `LabReviewConfirm` 0 → 10 (new) · `LabMarkerModal` 13 → 20 · `safety` 12 → 12
(the sweep gained the notices) ·
`lab-import` 27 → 28 · `schemas` 40 → 41 · `biomarkers` 77 → 77 (U21's `statusOf` tests untouched, and
`src/lib/biomarkers/**` is not in the diff).

**One existing assertion changed.** U21's test *"sends the auto-filled range as null when a different unit
was typed first"* checked, before submitting, that the Ref field *showed* the ng/mL range under nmol/L. The
approved blank-Ref-fields behaviour shows it blank. The test's own claim, that the body carries null
bounds, is unchanged.

## 4. N-115 — the notice (AC-3, STOP)

Stopped and shown verbatim, then approved exactly as shown on 2026-10-01, with the blank-Ref-fields
behaviour (phase plan §6).

## 5. Stops and findings for the owner

- **AC-3 copy**, above. Approved.
- **`LabMarkerModal.tsx:119-135`** (option (a), widened and fixed) (the per-reading edit, `PATCH /api/lab-markers/[id]`) has both halves of
  N-116: a cleared Value and a whitespace-only bound are sent as 0. At `:300-327` an edited Unit keeps the
  old-unit bounds, which are visible and editable in the same row (N-114's class, milder). Outside *May touch*.

## 6. Review (AC-5)

**Round 1** (a fresh subagent, on a scratch copy). **Verdict: PASS WITH NON-BLOCKING.** It
found no path this unit owns that stores a 0 from an empty field, or a range under a unit other than its own.
It re-ran M1–M6, and added `z.coerce.number()` in either schema (red, 1 each).

1. `LabMarkerModal`, both halves of N-116 and the unit-edit class: medium, out of scope (§5).
2. As 1, the unit edit at `:300-327`: low.
3. The guard that keeps a blank review Value out of the row was not pinned, because the disabled gate alone
   held the tests. **Fixed:** a direct test (M7 above).
4. `pdf-adapter.ts:43-46`: a model could transcribe a blank cell as `0`. The prompt says to omit such rows,
   and the review shows the value before anything is saved. **Not accepted as residual by the owner:
   registered as N-117, OPEN.**
5. The API stores whatever unit and range pair a client sends. The server cannot know the entered unit.
   Accepted residue.

It checked and refuted these: a remount after a failed commit, state leaking between extractions, toggling a
blank row, browser number-input sanitising, and drafts keyed by index (rows never reorder in a review).

**Round 2**, on the widened diff (a fresh subagent, on its own scratch repo). **Verdict: PASS WITH
NON-BLOCKING.** No path stores a 0 from an empty field or a range under another unit; on every U22 surface
the field shows what is sent; the notice shows exactly when a range the user saw is dropped; both strings
match the approval byte for byte.

1. Two guards were unpinned: the modal's per-edit reset of the typed flags, and the review notice for a
   half-open range. **Fixed:** two tests (N11, N12).
2. *Informational.* `markTyped` reaches the marker switch: a bound re-typed to the auto-filled number is
   now the user's, so it is kept across a switch, as a typed different number already was under U21. The
   auto-filled unit is still cleared. This is the owner's "typed bounds kept" ruling applied there.
3. A non-numeric bound (`3,5`, `1e999`) is shown but sent as null, in the form and the per-reading edit.
   Predates U22. **Registered as N-118, OPEN**: the fix needs a validation message (owner copy).
4. *Nit.* After a marker switch that clears the unit, the new entry's range is hidden until its unit is
   typed; display and body agree throughout.
5. A stored reading with an odd unit drops its bounds on any differing unit: the safe direction.
