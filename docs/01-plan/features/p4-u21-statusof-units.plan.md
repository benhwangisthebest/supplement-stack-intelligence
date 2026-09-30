# P4 · U21 — `statusOf` compares value and range in one unit (+ ARTIFACT_CAP pin)

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U21 row; Q-25). It carries
> no approval status of its own. **Mode: SUPERVISED**, deterministic. Opened 2026-09-30 at anchor `39febb7`, in
> worktree `../ssi-u21`, branch `p4-u21-statusof-units`. Registered with bkit at open (RC-4). Commit and CI ids
> are in bkit and the unit report, not here, because this file is inside the commit it would have to cite.
>
> **Status: stopped at Step 1 for the design, and again at AC-5 (review round 1: BLOCKING, pending the
> owner's query). Landed on the owner's rulings (phase plan §6, 2026-09-30).**

## Step 1 — the map (HEAD `39febb7`)

**(a) `statusOf`** (`src/lib/biomarkers/index.ts:36-44` at HEAD). It converted the value (`toCanonical`) and
returned `unknown` on an unconvertible unit. It left the user's bounds in the entered unit, and fell back per
bound (`??`) to the catalog's canonical bounds. So a user low bound could sit beside a catalog high bound.

**(b) Every marker, probed** (scratch worktree, deleted). The value was the midpoint of the catalog range
expressed in the entered unit, and the user range was that range.

| Marker | Canonical | Other unit (factor) | User range at HEAD | Catalog fallback |
|---|---|---|---|---|
| vitamin-d-25oh | ng/mL | nmol/L (0.4006) | **low** | in-range |
| magnesium-serum | mg/dL | mmol/L (2.43) | **high** | in-range |
| zinc-serum | ug/dL | umol/L (6.54) | **high** | in-range |
| vitamin-b12-serum | pg/mL | pmol/L (1.355) | in-range at the midpoint, **high** above 490 pmol/L | in-range |
| fasting-glucose | mg/dL | mmol/L (18) | **high** | in-range |
| ldl-cholesterol | mg/dL | mmol/L (38.67) | **high** | in-range |
| triglycerides | mg/dL | mmol/L (88.57) | **high** | in-range |
| hs-crp | mg/L | mg/dL (10) | **high** | in-range |
| cortisol-am | ug/dL | nmol/L (0.0363) | **low** | in-range |
| calcium-serum | mg/dL | mmol/L (4) | **high** | in-range |
| homocysteine, hba1c | umol/L, % | none | n/a | n/a |
| alt | U/L | IU/L (1) | correct (factor 1) | in-range |

The Q-25 probe (100 nmol/L against 75–250 nmol/L) returned `low`. The direction could invert: magnesium
0.5 mmol/L against 0.70–0.99 read **high**, and cortisol 800 nmol/L read **low**.

**(c) Consumers and persistence.**
- `assessLabMarkers` feeds stack evaluation (`ruleLabRelevance`), whose flags are **persisted**
  (`replaceFlags`, `evaluation_flags`), read back unrecomputed (`listFlags`), and exported.
- It also feeds the advisor's `biomarkerFindings`, whose citation labels carry the status into
  `advisor_messages.citations` (**persisted**).
- `labBoost` feeds protocol ranking, which is ephemeral on its own route. Through the advisor's
  `generate_protocol`, it shapes stack items the user approves.
- `canonicalize` converts values only and is unaffected.

**(d) Design, approved exactly as shown.** Each user bound converts with the value's factor. The catalog
fallback stays per bound. An unconvertible unit stays `unknown`, and no bound is ever guessed. A range in
a different unit from its value cannot be stored: every write path carries one `unit` per row.

**Found at Step 1: N-113.** The add-marker form auto-filled the catalog's canonical range whatever the unit
field said. Owner ruling 2 chose option (ii): fix it here.

## Step 2 — what changed

- `src/lib/biomarkers/index.ts`: `statusOf` converts each user bound through `toCanonical`. It tests
  `== null`, not `!== null`, so an absent field still falls back as the old `??` did. For the typed contract
  (`number` or `null`) the two are identical.
- `src/components/profile/LabMarkerTable.tsx`: the form remembers what it auto-filled and from which entry.
  On submit, an untouched auto-filled bound is sent as null when the unit normalises differently from the
  catalog unit it came in. On a switch to another entry, the untouched unit and bounds are refilled from it
  (review round 1, finding 2). If the user has typed a bound or value, an untouched auto-filled unit is cleared instead, and submit asks for a unit (rounds 2 and 3). An untouched auto-filled bound is also sent as null when the marker no longer resolves to its entry (round 2, findings 1 and 2). The normaliser is restated locally, because rule 7 bars `src/lib` imports.
  A test pins it equal to `normalizeUnit`.
- `src/architecture/criteria-parity.test.ts`: the pin for `context-adjusted-evidence.plan.md` goes from
  399 to 395.
- Tests: `biomarkers.test.ts` (a table over every accepted pair, plus literal cases),
  `stack-evaluator.test.ts` (no lab flag), `protocol-builder.test.ts` (no boost, identical to the no-labs
  suggestion), `LabMarkerTable.test.tsx` (thirteen new tests).

## Red evidence

| Id | Instrument | Result |
|---|---|---|
| R0 | New engine and caller tests at `39febb7` | **17 failed**: ten markers, the Q-25 probe, the mixed bound, equality at a bound, magnesium direction, assess and boost, the evaluator, the protocol builder. Canonical, fallback and unknown-unit cases passed (controls) |
| R0f | New form tests at `39febb7` | **3 failed**: unit changed after fill, unit typed first, edited bound. Case and spacing, unknown marker and normaliser parity passed (controls) |
| R0s | Switch tests against the first form fix | **3 failed**: two refills and the unit move. The edited-bound-on-switch control passed |
| M1 | Form: unit comparison removed | case and spacing test red |
| M2 | Form: edited-bound check removed | edited-bound test red |
| M3 | Form: local normaliser drops µ→u | parity test red |
| M4 | Form: auto-fill tracking disabled | 3 red |
| M5 | Engine: high bound left unconverted | 10 red |
| M6 | Form: switch clearing disabled | 3 red |
| AC-3 | Plan file padded to 396 lines | `ARTIFACT_CAP` red; restored, green |

Every mutated file was restored from a copy and checked with `cmp` (rule 11).

## Deployed data (owner-run query, 2026-09-30)

The owner ran a select-only, counts-only query: rows_cross_unit_at_head **0**,
rows_autofill_shape_wrong_after_fix **0**, users_affected **0**, unclassified_rows_with_range **0**,
stored_lab_flags_of_affected_users **0**, advisor_msgs_citing_lab_rules_of_affected_users **0**. The pre-fix
form could produce rows with the catalog's canonical range under another unit, and none exist. No stored row
changes status, and no stored-data action is needed. The owner's words are verbatim in the phase plan §6.

## Independent review (AC-5)

**Round 1** used a fresh subagent on a scratch copy. **Verdict: BLOCKING.** On the owner's question, it
found every engine path goes through `statusOf`, so the engine cannot compare across units. It re-ran the
old code and got the 17 failures.

| # | Finding | Disposition |
|---|---|---|
| 1 | Rows stored by the pre-fix form change status under the new `statusOf` (BLOCKING) | Empty on the deployed data: the owner's query found 0 such rows |
| 2 | A marker switch carries the first marker's untouched bound to the second | **Fixed** here (N-113; R0s, M6) |
| 3 | Import review hides the extracted range while the unit is editable | Registered **N-114**, OPEN |
| 4 | An auto-filled range sent as null disappears without notice | Registered **N-115**, OPEN (copy needs owner review) |
| 5 | A bound typed back to its auto-filled value is treated as untouched | Note. Safe: it falls back to the catalog |
| 6 | Rounding | Note. Multiplying both by one positive factor never reverses order |
| 7 | The edit modal shows unit and range together | Note. No change |
| 8 | An empty Value field submits 0 | Registered **N-116**, OPEN (predates U21) |

**Round 2** reviewed the widened diff on a fresh scratch copy. **Verdict: PASS WITH NON-BLOCKING FINDINGS.**
On the owner's question, `statusOf` is the only place in `src` that compares a value with a range, and it now
compares in one unit. Reverting each fix turned its tests red (17 engine, 6 form, 3 switch). A probe of all
2,704 ordered pairs of the 52 catalog keys (typed and backspaced letter by letter) ended on the second entry's
unit and range every time.

| # | Finding | Disposition |
|---|---|---|
| 1 | The switch moved the auto-filled unit under a bound the user had typed (hs-CRP, Ref high 5, then Magnesium sent 5 as mg/dL) | **Fixed** here as a pin (unit kept when a bound or value was typed); **revised** in round 3 |
| 2 | "Glucose" then "Total Magnesium": the server resolves magnesium by contained alias, and the form sent glucose's high of 100 | **Fixed**: an untouched auto-filled bound is also sent as null when the marker no longer resolves to its entry (M8) |
| 3 | A bound retyped to exactly the auto-filled value counts as untouched | Note. Safe, as round 1 finding 5 |
| 4 | The edit modal lets the unit change while the range stays | Note. Both are visible to the user. No change |

| Id | Instrument | Result |
|---|---|---|
| R0r2 | Round-2 tests against the round-1 form | **3 failed**: bound pins the unit, value pins the unit, contained-alias marker |
| M7 | Form: round-2 pin removed | 2 red (superseded by round 3) |
| M8 | Form: entry-identity check removed | 1 red |

**Round 3** reviewed the round-2 fixes on a fresh scratch copy. **Verdict: PASS WITH NON-BLOCKING FINDINGS.**
Reverting each hunk turned its tests red. A switch A→B→A, typing and backspacing letter by letter, a failed submit
then retry, and a reset after success all behaved. No alias maps to different entries in the form and on the
server, and no catalog key is a prefix of another entry's key.

| # | Finding | Disposition |
|---|---|---|
| 1 | The round-2 pin also fired on a value typed before any unit: Value 2, Magnesium (fills mg/dL), hs-CRP sent 2 mg/dL for hs-CRP, stored as 20 mg/L | **Fixed**: an untouched auto-filled unit is **cleared** on a switch when anything is typed. Moving it relabels, keeping it misattributes; empty, the existing required-unit check asks the user (R0r3, M9) |
| 2 | A pinned unit lost its auto-filled status and never moved again | Gone with the pin |
| 3 | An auto-filled unit stays when the name stops resolving ("Alt" to "Alternative") | Note. Bounds are already sent as null there (round 2, finding 2), and the probe case resolves to the same entry on the server. No change |
| 4 | A bound typed to exactly the auto-filled text counts as untouched | Note, as round 1 finding 5: dropped, never mislabelled |
| 5 | Only a typed high bound was tested | **Fixed**: the clear is tested for a high bound, a low bound and a value |
| 6 | An empty Value sends 0, and so does a whitespace-only bound | Pre-existing. Added to **N-116** |

| Id | Instrument | Result |
|---|---|---|
| R0r3 | Round-3 tests against the round-2 form | **4 failed** (three typed-field cases, the value-first case) |
| M9 | Form: the unit always moves on a switch | 4 red |

No fourth round was run. The round-3 change only makes the form more conservative: it empties a field the user
must then fill.

## Scope kept

Not touched: the biomarker catalog's values or ranges, `supabase/migrations/`, stored data, `src/types/**`,
`CLAUDE.md`, `package.json`. Code outside `src/lib/biomarkers` changed only in the owner-widened
`LabMarkerTable.tsx`. No rendered lab-finding copy changed.
