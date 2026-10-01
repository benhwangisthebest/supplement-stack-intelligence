# P4 · U23 — Non-numeric lab bounds: refused with a message, never silently nulled (N-118)

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U23 row; N-118). It
> carries no approval status of its own. **Mode: SUPERVISED**, deterministic. Opened 2026-10-01 at anchor
> `e3920c6`, in worktree `../ssi-u23`, branch `fix/p4-u23`, in parallel with the docs-sync landing.
> Registered with bkit at open (RC-4). Commit and CI ids are in bkit and the unit report, not here, because
> this file is inside the commit it would have to cite.
>
> **Status: landed on the owner's rulings of 2026-10-01 (phase plan §6):** the message pre-approved in the
> brief, three questions asked before the review (§4), and the bundle re-baseline at the G stop (§6).

## 1. The map (HEAD `e3920c6`)

| Path | `3,5` / `abc` | `1e999` / `Infinity` | `0x10` | Message |
|---|---|---|---|---|
| Add-marker form, `LabMarkerTable.tsx` `add()` → `boundToSend` | `Number()` is NaN, sent as **null** | Infinity, sent as **null** | sent as **16** | none; the field keeps the text |
| Per-reading edit, `LabMarkerModal.tsx` `saveEdit()` → `boundToSend` | **null: the stored bound is wiped** | **null: wiped** | **16** | none |
| Import review, `LabReviewConfirm.tsx` | no bound input: the range is shown read-only (U22 §1; the `labRangeClearedCopy` comment) | | | |
| API, `labMarkerInputSchema` / `labCommitSchema` | a string is a type error | `.finite()` rejects it, but JSON already turned it into null | n/a | |

The defect is made in the browser: JSON has no NaN or Infinity, so `JSON.stringify` writes `null`, and null
is a legal "no bound". The server cannot tell it from an empty field.

## 2. The fix

- **One predicate**, `boundIsNotNumber` (exported from `LabMarkerTable.tsx`, beside `normalizeEnteredUnit`,
  because a client component may not import `src/lib`, rule 7). A trimmed, non-blank bound is a number only
  if it is a plain decimal (`[+-]`, digits, one dot, an optional exponent), `Number()` of it is finite,
  and it does not underflow to 0 from nonzero digits. So `3,5`, `abc`, `Infinity` and `0x10` fail on the
  pattern, `1e999` on finiteness, and `1e-400` on underflow (review finding 1). A
  blank bound is not "not a number": it still means no bound (U22).
- **Form.** `add()` runs the existing Value check first, then refuses the save with the message if a bound
  that will be sent fails the predicate. A bound U22 drops (auto-filled, under another unit or marker) is
  sent as null with its own notice, so it is not checked. The failing field gets `aria-invalid` and the
  error border.
- **Per-reading edit.** `saveEdit()` does the same through `badBound`, and the same `dropped` rule applies:
  a stored bound cleared by a Unit edit is not checked, because it is not sent.
- **Copy.** `labBoundNotNumberCopy` in `src/lib/safety/index.ts`, text exactly as pre-approved, added to
  the banned-language sweep and pinned verbatim. The profile page passes it to `LabMarkerTable`, and to
  `LabTimeline`, which forwards it to the modal.
- **Server.** No change. `schemas.test.ts` now pins that both lab write schemas reject `NaN`, `±Infinity`,
  `"3,5"` and `"3.5"` for each bound.

`boundToSend` is unchanged. The new check runs before it, on the same `dropped` rule, so anything it lets
through is a finite number or blank.

## 3. Evidence

**R0, the new tests against HEAD's components** (with the constant added): **form 14 red**: 12 refusal
cases (6 inputs × 2 bounds), a bad bound typed into a range a unit edit cleared, and *"clears the message
once corrected"*. **Per-reading edit 13 red**: 12 refusal cases and the same unit-edit case. The
failure output carries the body sent. In the per-reading edit, with a stored 30–100, a low bound of `3,5`
sent `"referenceLow":null,"referenceHigh":100`: the stored 30 was wiped. `0x10` sent `16`, and `1e-400` sent `0`. The
valid-number cases (`3.5`, `" 3.5 "`, `-2`, `0`, `1e2`, `1e1`) and the empty-bound cases are **green at
HEAD**. They are there to catch over-rejection.

**Server pins: green at HEAD**, because `.finite()` already held. They are guards, not a fix. Each schema
was mutated once per bound by removing `.finite()`, and **all 4 went red** (`Infinity` accepted):
`labMarkerInputSchema` low and high, and `labCommitSchema` low and high. The files were restored from
copies, with no diff.

**Mutations of the fix** (file copies, restored and checked with `cmp`):

| # | Mutation | Red |
|---|---|---|
| M1 | form: the `badLow \|\| badHigh` refusal removed | 11 (before finding 1's cases) |
| M2 | per-reading edit: the `badBound` refusal removed | 10 |
| M3 | predicate weakened to `Number.isNaN(Number(t))` | 12 |
| M4 | the pattern removed (finiteness only): `0x10` passes | 4 |
| M5 | finiteness removed (pattern only): `1e999` passes | 4 |
| M6 / M7 | `aria-invalid` removed: form / per-reading edit | 5 / 5 |
| M8 | per-reading edit: a bound skipped whenever the Unit differs (the reviewer's M7, which survived until finding 2's test) | 1 |
| M9 | form: a bound skipped whenever a catalog entry auto-filled (the reviewer's M8, the same) | 1 |
| M10 | the underflow clause removed: `1e-400` passes | 4 |

**Per-file counts, HEAD → after:** `LabMarkerTable` 24 → 44 · `LabMarkerModal` 20 → 39 · `LabReviewConfirm`
10 → 10 (untouched) · `schemas` 41 → 42 · `safety` 12 → 13 · `lab-import` 28 → 28. No existing assertion
changed. The existing renders only gained the new required prop. `npx vitest run src/architecture`:
**30 files, 534 tests, green.**

## 4. Questions for the owner (asked before the review, answered 2026-10-01)

1. **AC-1's import-review leg has no input to type into.** The review shows the extracted range read-only.
   The real gap on that path is the CSV and paste parsers, which strip non-digits (a probe at `e3920c6`:
   `3,5` → 35, `1e999` → 1999, `0x10` → 10, `<5` → 5, `Infinity` → null). **Ruling: land the two paths and
   register the parser finding: N-119, OPEN.**
2. **`LabTimeline.tsx`** is the modal's prop path, not a page. **Ruling: covered by "the page(s) passing
   props".**
3. **The Value field's own leniency** (`0x10` saved as 16; `1e999` sent as null, then a generic 400).
   **Ruling: register only: N-120, OPEN.**

## 5. Review (AC-3)

A fresh subagent on a scratch copy. **Verdict: PASS WITH ADVISORIES.** Asked whether any path can still
turn a typed bound into null without telling the user, it answered no for both components. It re-ran
M1–M5 and the schema mutation, and probed edge inputs through the predicate. Refused: `-`, `.`, `+`, `−5`,
`５`, `1 000`, `3.5.1`, `1e`, `e5`, `--5` and a zero-width space. Accepted as typed: `1.`, `.5`, `1E-3`,
`+5`, `-.5`, `007`. It also checked U22's `dropped` interplay, recovery after a refusal, and the
inverted-range 400. Rule 7 holds: `LabMarkerModal` takes the predicate from its sibling component.

1. `1e-400` underflowed and was sent as **0**: a typed bound sent as a different number. **Fixed:** the
   underflow clause, plus a `1e-400` case in both refusal lists (M10). Rounding of over-long digit strings
   (more than 17 significant digits) is ordinary float behaviour and is accepted.
2. The typed-into-dropped path was right in the code but no test pinned it, so its mutations survived.
   **Fixed:** one test per component; both mutations now go red (M8, M9 above).
3. *UX.* After a correction the message stays until the next Add or Save, while `aria-invalid` clears at
   once. This matches the existing Value message. **Not changed.**
4. An inverted range gets the server's generic *"Invalid input."* It is a message, not silence.
   **Not changed**; noted beside N-120.

## 6. Gate

**First run, on the staged tree, in a clean worktree:** `tsc`, lint, `vitest run` (2153 of 2153 across 152
files), coverage and `next build` were all green. **`verify:bundle` was red on `/profile` alone:**
118,051 B against a limit of 118,021 B (baseline 116,853 B + 1%), 30 B over. CI had measured `/profile` at
117,800 B on `e3920c6`, so U22 had already used 947 B of the 1,168 B headroom. U23's client-side check adds
about 235 B. **Stopped. The owner ruled "Re-baseline"** (phase plan §6): *May touch* was widened to
`docs/05-qa/bundle-baseline.json`, and `npm run bundle:baseline` was run on that build.

| Route | Baseline before | After (this tree) |
|---|---|---|
| shared by all | 105,313 | 105,330 |
| `/profile` | 116,853 | 118,051 |
| `/advisor` | 114,604 | 115,159 |
| `/library` | 110,152 | 110,214 |
| the other seven routes | | within ±18 B |

The `/advisor` and `/library` growth predates U23: CI on `e3920c6` already measured `/advisor` at 115,150.
The local figures run about 15 B above CI's (shared: 105,330 here, 105,315 there), which is the
platform/zlib drift the 1% headroom absorbs.

**Second run, on the final staged tree** (with the baseline): see bkit and the unit report. This file is
inside the commit it would cite.
