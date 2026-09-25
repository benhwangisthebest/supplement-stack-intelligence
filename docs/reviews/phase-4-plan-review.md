# Phase 4 Plan — Independent Review

> **Date:** 2026-09-25 · **Subject:** `docs/01-plan/phase-4-product-completion.plan.md` (252 lines, status **DRAFT — AWAITING OWNER APPROVAL**) · **Anchor:** `6355a5d`, verified by `git rev-parse --short HEAD` in both the reviewer's session and the clerk's.
> **Scope:** read-only. No source file, guard, plan or register was modified. The plan is unchanged.
> **Decisions D-1 … D-12 are unruled, and this review does not rule them.** Where a finding can only be resolved by a ruling, it says so and states what the options imply.

## Reviewer and method

| | |
|---|---|
| **Reviewer** | One independent agent that did not author the plan. **Inputs:** the plan, `docs/roadmap.md`, `CLAUDE.md`, the Phase 3 report and closeout Check, and the repository at `6355a5d`. **Denied:** the author's cycle artifact (`docs/01-plan/features/phase4-plan.plan.md`) and the authoring session's record. |
| **Read** | Documents: the plan and the roadmap in full, root `CLAUDE.md`, and the Phase 3 report §9–§11. Also the Phase 3 Check in full (incl. §8), Phase 3 register §6–§7, and Phase 2 report §9–§11. From the Phase 2 plan: register rows (`:370-690`), decisions 2–3 and §10. Also Phase 1 plan §10, `project-status.md` §3, `product-direction.md` §6–§7, `context-adjusted-evidence.plan.md` `:15-70`, and `phase-3-plan-review.md` (house style). |
| **Source read against** | `src/lib/auth/actions.ts`, `src/lib/safety/{index,safety.test}.ts`, `src/services/advisor-actions.ts`, `src/architecture/{error-disclosure,not-found-uniformity,doc-truth,boundaries,criteria-parity}.test.ts`, `src/app/api/stacks/[id]/route.ts`, `playwright.config.ts`, `vitest.config.ts`, `vitest.workspace.ts`, `src/lib/db/seed.ts`, `tests/e2e/advisor*.spec.ts`. |
| **Commands** | `git rev-parse/status/show/log/grep/ls-files`; `npx vitest run --project node` → 120 / 1563; `--project jsdom` → 24 / 130; `npm run lint` → 415 of 415, 0 errors; `npx tsc --noEmit` → 0. `node -e` over the seed JSON, fixture, manifest and bundle baseline. `npx tsx` over the **generated** `@/data/seed-effects` and `@/data/seed-papers`, plus `deriveGrade`. `awk`/`grep`/`comm` over the §3 source set, and `diff` of the exit-criterion text. |
| **Spend** | **None.** No network. `next build`, E2E, `verify:bundle` and `verify:rendering` were **not run**: the build fetches Google Fonts (FU-66). |

### Disclosures

1. **Bundle, rendering and E2E rows were not rebuilt by the reviewer.** They were checked only against `docs/05-qa/bundle-baseline.json` (10 routes, `sharedByAll` 105313).
2. **Independence.** Every grep that could reach the excluded artifact used a `':!…phase4-plan.plan.md'` pathspec. There were two exceptions. A `-oh` id-ceiling grep printed bare numbers, which may include ids from that file. `git show --stat 6355a5d` printed its name and line count. No content was read. **The plan's AC-3 evidence lives in that artifact, so the reviewer re-derived AC-3 itself** (see *What survived*).
3. **macOS has no `timeout`.** One backgrounded vitest call failed with "command not found" and was re-run without it. Graphify was not used, because `graphify update` writes.
4. **Clerk's verification** (`CLAUDE.md` §5 rule 11: a subagent's report is data *about* the tree). Before recording, the clerk re-ran every load-bearing check at `6355a5d`. **Confirmed:** P-01 (N-12, N-15, N-26, N-32, N-35, N-41 and N-47 are OPEN with the quoted owner-conditions; N-12, N-15, N-41 and N-47 appear nowhere in the Phase 3 register or report; `phase-2-closeout-check.md:132-133` lists the eleven) · P-02 (`not-found-uniformity.test.ts:13-18`; `route.test.ts:194`, N-51) · P-03 (`git show --stat e653b91` includes `src/data/seed-effects.ts`; `git grep -c id-manifest -- docs/roadmap.md` → 4) · P-04 (`error-disclosure.test.ts:87-93`; `actions.ts:27,44`) · P-05 (`layout.tsx:2` `next/font/google`; the fixture reads `owner|2026-09-24` ×37) · P-06 (`context-adjusted-evidence.plan.md:22`; `safety/index.ts:298-304`) · P-09 (fish-oil `paperIds` = `p-fish-oil-cv`, `p-fish-oil-triglycerides-t2d`; the advisor specs require `OPENAI_*`) · P-12 (`advisor-actions.ts:145-150`) · P-13 (`deriveGrade` occurs 0 times in `content/generate.mjs` and `emit.mjs`; G4b is at `seed-integrity.test.ts:209`) · P-17 (Phase 2 report `:285`).
   **Corrected by the clerk (each item's substance stands):** P-02 has **15** 404 sites, not 14 (Stack 8, Stack item 4, Conversation 2, Action 1) · P-07's roadmap line is **`:606`**, not `:612` · P-08's ruling-3 quote is at **`:265`**, not `:299-300` · P-10's test callers are at `safety.test.ts:36,38,39` · P-18 has **17** coverage-floor entries over 23 `src/lib` directories, not 14.

---

## Findings

Severity follows the reviewer's scale: **CRITICAL / MAJOR / MINOR / OBSERVATION**. Nothing is authorised yet, so these findings block *approval*, not execution.

### P-01 · MAJOR · §3's source set misses at least 13 open Phase 2 register rows, and Phase 4 units trigger several of them
- **Location:** plan §3 `:48` · **Bears on:** D-1, D-3, D-9
- **Defect:** The set copies the Phase 3 register's boundary (report §9–§11), which already lost FU-25 once. Undispositioned rows whose owner-condition a Phase 4 unit fires: **N-47** (*"whichever unit next opens `id-stability.test.ts`"*) → **U3** · **N-15** (`AdvisorPanel` ignores the `aborted` turn status) → **U10** · **N-26** (probes) → **U4** · **N-41** (the export is unbounded) → **U9** · **N-32** (`playwright.config.ts`) → **U12** · **N-12** (`getRemainingBudget` has no production caller; *"if no UI claims it by phase close, delete it then"*, the same class as FU-30) · **N-35** (`supabase/client.ts` is *"`prototype-only` in status"*, which bears on `[P4-X2]`). Also open and undispositioned: N-18, N-30, N-36, N-37, N-43, N-45.
- **Evidence:** `phase-2-closeout-check.md:132-133`. Disposition cells in the Phase 2 plan `:370-690`. `git grep -w` finds none of N-12, N-15, N-41 or N-47 in the Phase 3 register or report.
- **Action:** widen §3's source to the Phase 2 register's open rows, selected by status, not by section. Disposition each one, naming the triggering unit or recording why the trigger does not fire.

### P-02 · MAJOR · D-4 misdescribes today's 404 behaviour: two of its "options" already ship, and N-50's real question is missing
- **Location:** D-4 `:171-174`; U11 `:118`; `[P4-X7]` `:139` · **Bears on:** D-4
- **Defect:** (b), a 400 on a malformed id, has been live since U30 (N-51). (c), per-resource wording uniform across ownership, is today's `notFound("Stack")` pattern, guarded per route by `NOT_FOUND_UNIFORMITY`. (a), "keep the uniform bytes", describes an API-wide uniformity that does not exist. N-50 actually asks whether a resource-named 404 is the product's voice or whether the API should speak one 404. The `services/advisor-actions.ts` sub-case is separate: three literals, two of which echo a caller-supplied supplement id.
- **Evidence:** 15 `notFound("…")` sites. `not-found-uniformity.test.ts:13-18`: *"It is NOT 'every 404 in the API must be uniform' … That wider question is finding N-50"*. The N-51 test is at `stacks/[id]/route.test.ts:194`.
- **Action:** rewrite D-4 from the tree. Options: status quo · one API-wide 404 (cite the owner's 2026-09-11 remark that this was a UX regression) · the services' literals as a separate sub-question. Restate U11 against those options.

### P-03 · MAJOR · U3's red proof is unsatisfiable as written, and U3 and `[P4-X8]` turn a registered *candidate* into committed work without a decision
- **Location:** U3 `:110`; §3 `:63`; `[P4-X8]` `:140` · **Bears on:** none today; a D-n is needed
- **Defect:** **(i)** Every content correction's diff includes the regenerated `src/data/seed-*.ts` (CONTENT_FIDELITY), so *"diff shows no `src/` path"* can never hold. `[P3-X5]`'s test is *"without **hand-editing** `src/`"*. **(ii)** `project-status.md` registers the move as a *candidate*; the plan makes it unconditional, with no D-n. **(iii)** The manifest is the ledger behind rank-1 §2.4 rule 16, yet D-1(c) places U3 in the unattended set. **(iv)** `docs/roadmap.md` names the path 4 times. **(v)** N-47 triggers here (P-01).
- **Evidence:** `git show --stat e653b91` lists `content/seed/seed-effects.json` **and** `src/data/seed-effects.ts`. `git grep -c id-manifest -- docs/roadmap.md` → 4.
- **Action:** restate the test as *no hand-edited `src/` path*, with generated modules excepted and identified by their GENERATED header. Add a D-n covering in/out and the target location. Mark U3 for owner review of the append-only policy. Name the roadmap references and N-47.

### P-04 · MAJOR · U4 misdescribes FU-31: the module is already walked, the violation already exists and stays green, and the fix is user-facing auth copy
- **Location:** U4 `:111`; §3 `:62` · **Bears on:** D-1
- **Defect:** `error-disclosure` already walks `actions.ts`. It misses `:27` and `:44` because they read a *returned Supabase result*, not a caught binding, so the **taint model** must change, not the scan scope. Nothing needs planting: HEAD is the red case. Fixing it replaces the login and signup error text, a trade between usability and account enumeration, yet U4 is marked *no owner batch*.
- **Evidence:** `error-disclosure.test.ts:87-93`; `actions.ts:27,44` `return { error: error.message }`.
- **Action:** re-specify the goal as extending taint sources to destructured Supabase `{ error }` results. Red proof: HEAD's `:27` and `:44` go red. Fix both sites with generic copy, and add an owner batch for the auth copy.

### P-05 · MAJOR · D-1 (b)/(c): the unattended runner is not specified enough to be safe
- **Location:** header `:8`; D-1 `:150-153` · **Bears on:** D-1, D-10, D-11
- **Defect:** (1) **G is itself a network call:** every `next build` fetches Google Fonts, so a runner that "hard-stops on live calls" stops at every gate, unless D-10 self-hosts the font or the fetch is a named exemption. (2) The proposed "guard weakened" test ("a diff touching `src/architecture/**`") hard-stops U1, U4 and U12, the core of (c)'s own list. (3) **Missing stop classes:** roadmap or `product-direction.md` edits · `package.json`/dependency changes · `src/types/**` · the rank-1 id ledger · test deletions or sweep narrowing · consequential `CLAUDE.md` edits (U12 makes `CLAUDE.md:209-210` stale) · CI workflow edits · "a unit discovers it needs a decision". (4) **No unit has a *May touch* list,** so stops are not file-path-decidable. (5) **The decision queue is undefined:** its location, its format, and whether a batch-bearing unit's landing waits for the owner. (6) **The independent reviewer is undefined:** who, which inputs, what independence rules, whether it has a veto. (7) **Attestation is not forbidden:** nothing says the runner never writes `verifiedBy`/`verifiedOn`, rulings or ticks (all 37 fixture entries read `owner|2026-09-24`). (8) **The "standing approval" wording** reads as compatible with `CLAUDE.md` §10 rule 5 (*"each time"*); it must be recorded as an explicit rank-2 exception.
- **Action:** if (b) or (c) stays on offer, specify all eight points. Do not choose among (a)–(c).

### P-06 · MAJOR · U14's safety check is too narrow: the quoted copy breaks §2.1 by implication, and U14c has no causal-inference check
- **Location:** U14 `:121`; D-3 item 1 `:165` · **Bears on:** D-3
- **Defect:** *"B generally — A for you, because the trials were in deficient adults and your 25-OH D is 18 ng/mL"* (`context-adjusted-evidence.plan.md:22`). **Rule 1:** it places the user's value beside "deficient adults", so the engine's matching threshold acts as a deficiency criterion applied to the user. **"A for you"** makes the grade a claim about the user, contrary to that plan's own premise and to the required posture. **Rule 4:** a population-matched grade reads as a personal efficacy forecast. **Rule 6 / `product-direction.md` §6:** an abnormal lab needs clinician escalation, and the copy has none. **§2.2 rule 7:** both the value and the population must bind to computed or verified fields.
  **What a compliant version would need** (options, not a ruling): the user's **own entered value, unit and date**, compared only to the **reference range the user entered** (the existing template does exactly this: `safetyCopy.labSupported`, *"Your ${marker} is below the reference range you entered"*, `safety/index.ts:298-304`); the study population stated as the paper's inclusion criterion, from the verified record; no personal grade letter; "the app cannot determine whether this applies to you" plus escalation; copy↔computation binding tests.
  **U14c** (longitudinal intelligence over labs, adherence and outcomes) is where rule 4 and §2.2 rule 9 bite hardest, and it names neither. The halted plan also has stale success criteria, SC-4 (*SSG*, false since U28) and SC-11 (a live E2E run, i.e. paid), and "item 1 in" schedules only a docs revision.
- **Action:** U14a's gate names §2.1 rules 1, 4 and 6 and §2.2 rules 7, 9 and 10, and lists SC-4 and SC-11. State that "item 1 in" means revision only unless a later amendment says otherwise. Give U14c a rule-4 and rule-9 check and a disclaimer placement.

### P-07 · MAJOR · U13's catalog path would retire persisted product ids, a rank-1 concern, yet it is typed with no deployed migration or OP row
- **Location:** U13 `:120`; §7 `:227`; D-3 item 2 · **Bears on:** D-3
- **Defect:** The roadmap's item 2 *replaces* the seeded 21 (`roadmap.md:606`). Product ids persist in `stack_items.product_id` and in `advisor_actions` payloads, so retiring any needs a tombstone and a data migration, which makes the path live and deployed-DB by the plan's own test. Catalog label data (dose per serving, allergens, testing claims) is safety-bearing, and no verification mechanism is specified (§2.2 rules 7, 8, 10).
- **Evidence:** `id-manifest.json` gives `products.persistedAt` = `["stack_items.product_id (0004, text, no FK)", "advisor_actions.payload/inverse (0004, jsonb …)"]`.
- **Action:** type the catalog path as *live, deployed DB if any seeded id is retired, OP row*. Require append-only handling. Add label-data verification and owner batches.

### P-08 · MAJOR · D-12 extends a Phase 1 exception that was never recorded, mislabels (c)'s blocker, and omits two options
- **Location:** D-12 `:210-214`; N-86 `:92` · **Bears on:** D-12
- **Defect:** (1) **No dated exception exists for Phase 1's `[~]`** (`roadmap.md:319`). The only one, at `:183`, is Phase 0's U-DEFER-4, and it ended at U0 (`:520`), so (a)'s "extend" extends nothing and Phases 2–3 opened against the `[~]` silently. (2) **(c)'s stated blocker is wrong:** ruling 5 retired "reproducible in CI" (`:319-323`), and ruling 3 made the live run owner-run (*"what blocks it is scheduling, not credentials-in-CI"*, `:265`). A live run also calls OpenAI and writes to the demo account, so it carries spend §7 omits. (3) **Two options are missing:** reword or retire the live half by recorded ruling, as Phase 2's decision 5 did; or an owner-run live baseline before approval, which *meets* the criterion. (4) **The ordering quote blends `:14-15` and `:650`.** (5) **N-86's correction also owes the stale U-DEFER-4 text at `:72`, `:117`, `:198`, `:214`, `:520`,** and applies under every D-12 option.
- **No other unmet boxes:** `grep -n '^\s*- \[[ ~]\]' docs/roadmap.md` → `:179`, `:319`, and Phase 4's own three.
- **Action:** rewrite (a) as *record, for the first time, a dated exception*. Correct (c) and add its spend. Add the two options. Quote the rule exactly. Widen N-86 and state that it is independent of D-12.

### P-09 · MAJOR · Several unit×option combinations turn live, deployed-DB or paid while typed deterministic, and §7 omits them
- **Location:** unit table `:106-125`; §7 `:218-233` · **Bears on:** D-2, D-3, D-5, D-6, D-9, D-12
- **Defect** (matrix below): **U5×D-2(d)**: the captured abstracts are gitignored and local to the owner's machine, so anywhere else this means network re-fetches · **U6×D-5(b)/(c)**: both fish-oil papers are about triglycerides, so a clinical re-score likely needs live sourcing · **U14c**: new tables and migrations are possible, yet the unit is untyped for them · **U17×D-9(a) and D-12(c)**: a live suite makes OpenAI calls, contradicting *"No OpenAI call is planned"* (`:233`) · **U8×D-6(c)**: docs only, yet typed live.
- **Action:** add these rows to the typing and to §7. Make "No OpenAI call" conditional, or have those paths exclude the advisor specs.

### P-10 · MAJOR · Units that change user-facing, health-adjacent or rank-1 surfaces are marked "no owner batch", and D-1(c) would run them unattended
- **Location:** the unit table's *Owner batch* column; D-1(c) `:153` · **Bears on:** D-1, D-3
- **Defect:** **U9** changes what a user's export says; stored versus current labels is a data-faithfulness decision. **U14b**: screen-reader text for grades, flags and citations is safety copy, yet it is excluded from the batch. **U4**: auth copy (P-04). **U3**: the rank-1 ledger (P-03). **U2**: its proof, *"zero callers"*, is false, because test callers exist at `safety.test.ts:36,38,39`; the true claim is *zero non-test callers*. U2 also narrows the banned-language sweep and deletes `labSupported`, the compliant template U14a would need (P-06).
- **Action:** mark U9 as needing an owner decision. Add U14b to the owner batches. Restate U2's proof and name the sweep edit. Re-derive D-1(c)'s list from the corrected column.

### P-11 · MAJOR · No sizing, although D-3 chooses among candidates that differ by orders of magnitude
- **Location:** §4; D-3 · **Bears on:** D-3
- **Defect:** the roadmap says *"Size them at start"* (`:647`), and Phase 2's plan carried a sizing section. This plan does not.
- **Action:** add S/M/L/XL per unit and option (the reviewer's estimate is below).

### P-12 · MINOR · U10 promises "unreverted items", but a U34 ruling lets only counts cross the boundary
- **Location:** U10 `:117` · **Evidence:** `advisor-actions.ts:145-150`, *"ONLY NUMBERS CROSS THE BOUNDARY … ruled against it"* · **Action:** say *render the counts*, or raise a decision.

### P-13 · MINOR · D-2 says a weight change "re-derives all 27 automatically"; it does not
- **Location:** D-2 `:156` · **Bears on:** D-2
- **Evidence:** `content/generate.mjs` never calls `deriveGrade`. G4b (`seed-integrity.test.ts:209`) asserts that stored equals derived, so a weight change **reddens** G4b until every stored letter is hand-updated. Persisted effect-grade chips keep their old letters.
- **Action:** correct the framing, and state each option's effect on persisted chips.

### P-14 · MINOR · D-6 lacks an offline cadence-enforcement option, and (a) collides with the attestation policy
- **Location:** D-6 `:182-185` · **Bears on:** D-6
- **Defect:** a non-network guard could fail CI when the newest dated re-verification record is older than N days. Separately, under (a), CI cannot refresh `verifiedOn` or attest `verifiedBy: owner` without a bot commit (§10 rule 5).
- **Action:** add the option, and state (a)'s write-back consequence.

### P-15 · MINOR · D-7 lacks a sink-less option, and its (b) is D-11 territory
- **Location:** D-7 `:187-191` · **Bears on:** D-7, D-11
- **Defect:** a redaction layer on today's `console.error` path would narrow N-40/FU-41 (§2.3 rule 15) with no third party, spend or account.
- **Action:** add that option, and cross-reference D-11.

### P-16 · MINOR · §3 moves Phase-4-assigned items OUT, and books parity as IN, before D-11 is ruled
- **Location:** §3 `:52`, `:74`, `:77`, `:81`, `:82`, `:85` · **Bears on:** D-3, D-11
- **Defect:** the Phase 3 report §10 assigned FU-33, FU-35–38, FU-40, N-22 and N-25 to Phase 4 *"for the owner to confirm or move"*. The plan moves five of them OUT without surfacing those moves. Parity is booked IN U1, which is false under D-11(c).
- **Action:** list the OUT moves for the owner to confirm, and make the parity row conditional.

### P-17 · MINOR · N-69's owner-condition is quoted narrower than the Phase 2 report records it
- **Location:** §3 `:83` · **Evidence:** Phase 2 report `:285`, *"the next unit touching `recordBatch` or the `advisor_actions` schema"* · **Action:** quote both conditions, and state whether U10 or U16 fires either one.

### P-18 · MINOR · G omits CI steps its own criteria rely on
- **Location:** header `:8`; `[P4-X3]` `:135`
- **Defect:** G omits `npm run test:coverage` (CI `:191`, the basis of X3) and `npm run verify:migrations` (CI `:220`), which U16's proof relies on. X3's "all engines" has no printed reading: 17 floor entries cover 23 `src/lib` directories. X3's check (`gh run list`) needs the network.
- **Action:** add both scripts to G or give a reason, and print the "all engines" reading.

### P-19 · MINOR · `[P4-X5]`'s "every new feature" is undefined, and X1–X3 can hold with no product shipped
- **Location:** §5 `:133-140` · **Bears on:** D-3
- **Defect:** without a definition, X5 is not mechanically decidable (do U10's copy or U13's statement count?), and if D-3 admits nothing, the "Product completion" phase completes vacuously.
- **Action:** define "feature", for example as a D-3-admitted item, and state the vacuous case as a known property.

### P-20 · OBSERVATION · Smaller record points
- `project-status.md:474`'s **X** for `db/seed.ts` has no written basis, yet D-9 argues against it.
- U17(a) must keep the service-role key confined (§2.3 rule 14).
- §3's "5 unnumbered residues" is 6 if `CLAUDE.md` rule 8 is counted. All six are dispositioned.
- **Location:** `project-status.md:474`; U17 `:124`; plan §3 `:48` · **Action:** have D-9 cite (or ask the owner to write) the basis for the X; name the key-confinement constraint in U17; restate the residue count as 6.

---

## Size (R-3) and typing (R-5)

**Size per unit** (reviewer's estimate):

| Size | Units |
|---|---|
| S | U2, U9, U12, U18; U8 (b/c); U6 (a/d); U13 statement; U17 (b/c) |
| M | U3, U4, U7, U10, U14a, U16 (FU-29 a); U5 (a–c); U6 (b); U8 (a) |
| L | U1 (five guards, five red proofs); U6 (c, retiring); U16 (live); U17 (a); U14b (M–L) |
| XL | U5 (d, 135 dimensions); U13 catalog; U14c; U15 (L–XL) |

**Is 18 units one phase?** Only if D-3 admits little. With the catalog, U14c and U15 all admitted, it is several phases of Phase 2's size. **These are options bearing on D-3; none is recommended:**
- **A. Carried correctness:** U1–U4, U9, U10, U12, U18, plus D-4 (X7) and D-9 (b/c) for X2. This meets the criteria without product work: a "Phase 4a" that leaves the objective unmet (P-19).
- **B. Trust-layer follow-through:** U5–U8, plus U2 for FU-63. Content work, owner batches, $0 of network calls.
- **C. Product candidates:** U14a first, then the U13 catalog, U14b and U14c as admitted. The largest value and the largest safety surface (P-06, P-07).
- **D. Operational readiness:** U15–U17. This matches D-7(b), a new roadmap phase.

**Typing gaps.** "Plan ✓" means the plan's typing and §7 already cover the combination. Covered combinations are omitted from this table.

| Unit × option | Type | Deployed DB | Spend / OP | Plan |
|---|---|---|---|---|
| U5 × D-2(d) | live unless the local abstracts are present | no | $0 | ✗ |
| U6 × D-5(b), (c) keeping the id | live if new papers are sourced | no | $0 | ✗ |
| U8 × D-6(c) | docs / none | no | none | ✗ (typed live) |
| U11 × D-4 | none or det | no | none | ✗ (options mis-described, P-02) |
| U13 × catalog | **live** | **yes** if any of the 21 ids is retired | **OP** | ✗ |
| U14c × item 4 | det, or **live** if migrating | possibly | OP if migrating | ✗ |
| U17 × D-9(a) | live | yes (users seeded) | OP **+ OpenAI** if the full suite runs | ✗ spend |
| D-12(c) | live E2E, owner-run | writes via the demo account | **OpenAI** | ✗ |
| every unit × D-1(b) | G's `next build` fetches fonts | no | none | ✗ (P-05) |

---

## Summary

**Counts:** CRITICAL 0 · MAJOR 11 (P-01…P-11) · MINOR 8 (P-12…P-19) · OBSERVATION 1 (P-20).

**What survived scrutiny** (checked and found true): tests 1693/144 (node 1563/120, jsdom 130/24) · specs 30 (`ls` = `git ls-files`) · lint 415/415 · tsc clean · grades **re-derived from the generated TS via `tsx`**: A4 B9 C8 D6, 27 profiled, 2 uncited, 38 papers, `deriveGrade` mismatches `[]`, matching the JSON · 37 fixture entries · manifest at `src/data/`, version 2 · one X · ceilings N 85 · FU 72 · OP 8, with OP-7 the highest issued, so N-86 is the correct next id · §3 reproduces **66** ids with `comm` empty (AC-3, re-derived without the artifact) · N-86's substance (`vitest.workspace.ts:26` runs `.test.tsx`; the register reads *"CLOSED IN FULL by U10"*) · `[P4-X1]`…`[P4-X3]` are word for word the roadmap's (`diff` → identical) · the named identifiers exist as described (`getBiomarker` has 0 callers; `@vitejs/plugin-react` appears only in `package.json` and the lockfile; `ClaudeAdapter` in 4 files; `playwright.config.ts:37-38` unguarded; `CRITERIA_PARITY` pins only the Phase 2 plan) · the objective is quoted verbatim · §8's *"no spec reads the Phase 4 plan"* is true.

## Verdict

**REVISE.** The draft's measurements hold, and its §3 is complete against the source set it chose. But that set repeats the boundary that already lost FU-25, and it misses open Phase 2 rows that Phase 4 units trigger (P-01). Two decisions give the owner option lists built on false descriptions: **D-4** offers options that are already shipped behaviour (P-02), and **D-12** extends an exception that was never recorded (P-08). Two units are specified against code that does not behave as described: **U3** (P-03) and **U4** (P-04). D-1's unattended option lacks the stop list, scopes, queue, reviewer and no-attestation rule that would make it safe, and its gate is itself a network call (P-05). The typing and owner-review columns miss rank-1 and paid paths (P-07, P-09, P-10). **None of this needs a ruling to correct, and all of it changes what the owner would be ruling on.**

## Decision index: items bearing on each D-n

| Decision | Items |
|---|---|
| D-1 Execution mode | P-01, P-04, P-05, P-10 |
| D-2 Rubric (FU-61 / FU-71) | P-09, P-13 |
| D-3 Roadmap candidates | P-01, P-06, P-07, P-09, P-10, P-11, P-16, P-17, P-19 |
| D-4 N-50, the 404 voice | P-02 |
| D-5 fish-oil-cardiovascular | P-09 |
| D-6 Re-verification mechanism | P-09, P-14 |
| D-7 Logging sink | P-15 |
| D-8 Deployed-DB work | P-17 |
| D-9 `db/seed.ts` / `[P4-X2]` | P-01 (N-35), P-09, P-20 |
| D-10 Hygiene either/or | P-05 (the font fetch inside G) |
| D-11 Roadmap parity edits | P-05, P-15, P-16 |
| D-12 Ordering rule | P-08, P-09 |
| *(no D-n yet; one is needed)* | P-03 (U3 / `[P4-X8]`), P-12, P-18 |
