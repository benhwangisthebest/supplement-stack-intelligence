# Phase 4 — Product completion

> **STATUS: DRAFT — AWAITING OWNER APPROVAL.** A Draft outranks nothing (`CLAUDE.md` §6: rank 5 is *an approved* plan). **Nothing here authorises work.** No unit may start, and no guard may be written or relaxed, until this file carries an APPROVED status line and every decision in §6 that gates a unit has been answered.
>
> **Base SHA `49bb62e`** (`main`: `291e287` plus the owner's content-delivery X → B ruling, landed first by this unit's brief) · authored **2026-09-25** · unit **PHASE4-PLAN**, landing (a) · cycle artifact `docs/01-plan/features/phase4-plan.plan.md` (bkit `phase4-plan`).
> **Scope authority:** `docs/roadmap.md` §Phase 4 (rank 6). **Predecessors:** `docs/04-report/phase-3-evidence-grounding.report.md` (§10 is the deferral table), `docs/reviews/phase-3-closeout-check.md` (incl. its §8 delta addendum), and the Phase 2 report §9–§11.
>
> **Discipline.** Every §2 figure carries the command that produced it at the base SHA; none is carried from another document. **Every unit gates on the full `CLAUDE.md` §5 rule 10 set**: `npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npx next build` · `npm run verify:bundle`, plus `npm run verify:rendering` and the non-live E2E suite. In the unit table, *G* means exactly this set. **Commit, push, merge, tag and branch deletion each need the owner's approval** (`CLAUDE.md` §10 rule 5), or a standing approval the owner has recorded. D-1 decides how that works in this phase.

---

## 1. Objective

**Complete the intended core product on a foundation that is now correct, verified, operable, and grounded** (roadmap, verbatim).

**What this constrains.** The roadmap's Included work is *"candidates, prioritized by product value — not a commitment"*, so **this plan commits to no product candidate. D-3 does.** The draft fixes two things: every item Phases 2–3 handed on gets a position (§3), and each candidate is set out as a conditional unit (§4) that an answer in §6 turns on or off. The personalization prerequisite (*"must not precede grounding"*) is met: Phase 3 grounded 27 of 27 grades.

---

## 2. Baseline, re-derived at `49bb62e`

Seed figures read the authored JSON directly (`node -e` over `content/seed/*.json`), not the generated modules. Test and bundle figures come from the full gate, run in a clean worktree with no `.env.local` (the same shape as CI).

| Figure | Value | Command |
|---|---|---|
| Unit tests | **1693 / 144 files** (node 1563 / 120 · jsdom 130 / 24) | `npx vitest run --project node` · `npx vitest run --project jsdom` |
| Architecture specs | **30** | `git ls-files 'src/architecture/*.test.ts' \| wc -l` (bound by `SPEC_COUNT`) |
| Lint scope | **415 of 415**, 0 errors | `npm run lint` |
| Bundle | **OK**: every route within **1%** of baseline · **10** routes · shared **105313 B** | `npm run verify:bundle` · `node -e 'const b=require("./docs/05-qa/bundle-baseline.json");console.log(Object.keys(b.routes).length,b.sharedByAll)'` |
| Rendering | **OK**: no prerendered page HTML | `npm run verify:rendering` |
| E2E non-live | **70 passed / 30 `[LIVE]` skipped** | `npm run test:e2e` |
| Effects · grades | **27** · **A 4 · B 9 · C 8 · D 6** | `node -e 'const E=require("./content/seed/seed-effects.json");const g={};for(const e of E)g[e.grade]=(g[e.grade]??0)+1;console.log(E.length,g)'` |
| …with `evidenceProfile` | **27 / 27** | same script, `E.filter(e=>e.evidenceProfile).length` |
| …citing no paper | **2**: `nac-antioxidant`, `protein-powder-recovery` | same script, `E.filter(e=>!(e.paperIds??[]).length).map(e=>e.id)` |
| Papers | **38** | `node -e 'console.log(require("./content/seed/seed-papers.json").length)'` |
| Provenance fixture entries | **37** | `node -e 'console.log(Object.keys(require("./content/verification/provenance-fixture.json")).length)'` |
| `id-manifest.json` location · version | **`src/data/`** · **2** | `ls src/data/id-manifest.json` · `node -e 'console.log(require("./src/data/id-manifest.json").version)'` |
| Subsystems classified **X** | **1**: `db/seed.ts` shared demo fixture | `grep -n '| \*\*X\*\* |$' docs/project-status.md` |
| Register ceilings (highest id mentioned) | **N 85 · FU 72 · OP 8** | `git grep -ohE 'N-[0-9]+' -- docs CLAUDE.md \| sed 's/N-//' \| sort -n -u \| tail -1`, likewise `FU-`, `OP-` (at `49bb62e`, before this landing adds N-86) |
| …highest **issued** OP row | **OP-7** | `git grep -n 'OP-8' -- docs CLAUDE.md`: every hit is a *"next free"* annotation or the Phase 3 Check saying OP-8 *"was never issued"*. None is a row |

**Two figures deliberately not re-derived:** the CI step count and the coverage floors. CI re-measures both on every push, and the plan has no unit that turns on either. Re-running them here would only produce another snapshot to rot (FU-32).

---

## 3. Disposition of every inherited item

**Source set, by command:** every `N-`/`FU-`/`OP-` id in (i) the Phase 2 report §9–§11 (`awk 'NR>=223&&NR<=367'`), (ii) the Phase 3 report §10 (`NR>=265&&NR<=317`) and (iii) the Phase 3 register §7 (`docs/01-plan/phase-3-evidence-grounding.plan.md`, `NR>=531&&NR<=594`), piped through `grep -oE '\b(N|FU|OP)-[0-9]+' | sort -u` → **66 ids**. It also includes the 5 unnumbered residues those sources carry and the ruling's id-manifest candidate. **IN** names a unit. **OUT** names a later phase, a condition or a standing class, and gives the reason. **CLOSED** means the register closed the id, so nothing is carried; it is listed only so the completeness check can run. AC-3's check is in the cycle artifact §4.

| Item | What | Position |
|---|---|---|
| **N-85** + criteria parity (P-08) | DOC_TRUTH is blind to `describe`-title guards; `[P3-Xn]` ids are absent from the roadmap | **IN U1.** The roadmap-side id insertion is **D-11**, because the roadmap is outside every unit's *May touch* unless the owner opens it |
| **FU-42** | `CRITERIA_PARITY` cannot express `[~]` | **IN U1**, with the parity row shape |
| **FU-45 · FU-46 · FU-47** (+ **N-79**) | cycle-artifact cap unmeasured · four register row shapes · four private comment-strippers | **IN U1.** All three are doc-guard instrumentation. N-79's blind spot closes with FU-47's shared stripper |
| **FU-61 · FU-71** | rubric weights let a well-studied null reach B · R17's size clause depends on the authors flagging it | **IN U5, shaped by D-2** |
| **FU-68** | fish-oil-cardiovascular: *"Cardiovascular support"* at A on a triglyceride surrogate | **IN U6, shaped by D-5.** A content decision |
| **FU-62** | sourcing for glycine-sleep and zinc-deficiency · plus FU-49's glycine-dose residue (*"target 3 g"* vs `generalDose` 3–5 g) | **Sourcing IN U7 (live).** **Dose residue IN U6** (deterministic, owner batch) |
| **FU-49** | editorial-notes format; closed in format only | **CLOSED** (format). Its residue is FU-62's, above |
| **FU-72** | scheduled live re-verification between closeouts | **IN U8 (live), shaped by D-6** |
| **FU-63** | make `Effect.evidenceProfile` required | **IN U2.** Its condition (*post-U4*) has fired |
| **FU-58** | `src/types/paper.ts` header still reads *"not a citable study"* | **IN U2** |
| **FU-30 · FU-31** | 4 dead `safetyCopy` helpers · `"use server"` auth actions return raw `error.message`, seen by no guard | **FU-30 IN U2** (delete, per `CLAUDE.md` §8 rule 4). **FU-31 IN U4** (guard reach, §2.3 rule 13) |
| **id-manifest move** *(owner ruling 2026-09-25)* | an id-adding correction still hand-edits `src/data/id-manifest.json` | **IN U3** |
| **FU-65** | `getBiomarker` seam, waiting on a real caller | **IN U14c only if D-3 admits longitudinal intelligence**, whose biomarker surface is the likely first caller. Otherwise **OUT**, trigger-bound, and the owner ruling (U8 R1) against a synthetic caller stands |
| **FU-66** | build-time Google Fonts fetch | **IN U18, shaped by D-10** |
| **FU-59** (products) | `ProductMatchPanel` has no coverage-limit statement | **IN U13** (copy, owner batch). The real catalog beside it is **D-3** |
| **FU-60** | account export emits stored pre-U6 paper labels | **IN U9** |
| **FU-57** | `p-nac-antioxidant`, an uncited row: removing it needs a tombstone plus a migration over `advisor_messages.citations[].refId` | **D-8.** It needs a deployed-database write, which this draft may not schedule without a decision. Also holds `[P3-X6]`'s future-tombstone obligation |
| **FU-29** | 13 `mappers.ts` casts on columns with no CHECK | **D-8.** An app-side half (runtime validation at the mapper) is deterministic; the CHECK half is a deployed migration |
| **FU-25** | per-worker user isolation for `[LIVE]` specs; serialisation is guarded by nothing | **Split.** **The guard half is IN U12**: assert the `E2E_LIVE` serialisation in `playwright.config.ts`, red when removed (Phase 2 report §3.3). **The isolation half is D-9**, because it is also the route to exit criterion 2 |
| **FU-50** | `@vitejs/plugin-react` is declared and referenced by nothing | **IN U18, shaped by D-10** (remove, or record why it stays) |
| **FU-36** | the port type `ClaudeAdapter` is two providers stale | **IN U18, shaped by D-10** (rename, or accept with the reason recorded) |
| **FU-35 · FU-37** | no guard covers `scripts/` · stale `.env.local` after a worktree split | **IN U4** (guard reach) |
| **FU-38** | the lab-import probe verifies shape, never content | **OUT.** Proving the compare needs a paid probe run (OpenAI). **Condition:** the next owner-run lab-import probe. The code change lands with that run, not before it |
| **FU-1** | `executeProposal`'s unlocked read on `attach_product` | **IN U10**: compare-and-set on `stack_items.product_id` in the update itself; no migration |
| **FU-34** + **N-71** (product half) | nothing renders `PARTIALLY_APPLIED` | **IN U10**: the confirm surface tells the user. New user-facing copy, owner batch |
| **FU-33** | `handleParams` wrapper | **OUT, ruling intact.** U30's two-layer guard is the interim control, and the register calls it *"not a placeholder"*. No Phase 4 candidate needs the wrapper |
| **N-50** | the uniform-404 question: *"must be decided rather than inherited"* | **D-4**, then **U11** if the answer changes behaviour |
| **N-11 · N-40 · FU-41 · FU-43 · FU-44** | all need one logging sink | **D-7.** A sink is a new external integration: threat review first (roadmap §Security), possible spend, an account |
| **OP-5** | three UNKNOWN provider-account facts; the DPA page returned HTTP 403 | **OUT of phase work, kept visible.** A deployment gate, not a unit: *before any deployment carries user traffic*. **What it forbids claiming:** if a Phase 4 unit exposes the advisor to real users, it inherits this gate. It is not waived |
| **N-22** | `auto/*` gateway aliases | **OUT: moot.** Withdrawn on 2026-08-10 (register §4.5). The gateway was retired at U31 (OpenAI first-party, `CLAUDE.md` §4 row 9) |
| **N-25** | PDF transcription measured on clean renders only | **OUT, condition intact:** a dated probe against a real photographed or faxed report (live and paid). Claims keep saying *clean image-only renders* |
| **N-69** | `recordBatch` can stamp another user's `conversation_id` | **OUT, condition-bound** (a second writer or a transferable conversation). **If D-3 admits a candidate that meets the condition, that unit closes N-69 first** |
| **N-70** | ownership guards are check-then-act | **OUT, gate intact.** Any transferable- or shared-conversation proposal must cite it and close it first |
| **FU-40** | `RLS_COVERAGE` sees policy existence, not semantics | **OUT, condition-bound:** CI ceasing to apply migrations. CI's `pg_policies.cmd` check is the control |
| **FU-32** | counts-written-once | **OUT: standing class**, every phase. This plan's §2 carries commands, which makes it re-derivable but not bound |
| `CLAUDE.md` §4 **rule 8** | no mechanical form exists | **OUT: standing.** No candidate adds a trust boundary without its own module test (roadmap §Testing) |
| **Live E2E BLOCKED(env)** (unnumbered) | `[LIVE]` half is owner-run | **OUT, ruling intact:** *no secrets enter this public repository*. Its ordering consequence is **D-12** |
| **`replaceFlags` residue** (unnumbered) | three round trips, no transaction | **OUT, condition-bound:** the next second writer to `evaluation_flags`. No unit adds one |
| **`[P3-X5]` wording** (unnumbered) | false for id-changing corrections | **Decided 2026-09-25 (wording kept, caveat recorded).** **U3 makes the caveat obsolete** by moving the manifest |
| **Roadmap item 5, seam half** (unnumbered) | UNMET (U8 R1) | See **FU-65** |
| **N-86** *(new, this landing)* | roadmap Phase 0's U-DEFER-4 box (`docs/roadmap.md:179`) still reads `[ ] Unmet`, but the capability exists (U0) and U-DEFER-4 closed in full (U10) | **OUT of units: a record correction** for the landing that moves the roadmap's Phase 4 status at approval. Named because the roadmap's ordering rule reads that box (**D-12**) |
| **N-1 · N-52 · N-74 · N-75 · N-76 · N-77 · OP-1 · OP-7 · FU-39** | Phase 2 closures | **CLOSED:** no carry (Phase 3 register §7) |
| **N-80 · N-81 · N-82 · N-84 · FU-48 · FU-53 · FU-54 · FU-56 · FU-64 · FU-67 · FU-69 · FU-70** | Phase 3 closures | **CLOSED:** no carry (Phase 3 register §7, report §9) |

**Number derived for N-86:** `git grep -ohE 'N-[0-9]+' -- docs CLAUDE.md | sed 's/N-//' | sort -n -u | tail -1` → **85**. It was allocated in this landing, before `N-86` appeared anywhere else.

---

## 4. Units

**Liveness test (Phase 3's, kept):** a unit is **live** if it needs the network, the deployed database, an OpenAI or other paid call, **or a data migration over any `persistedAt` surface in the id manifest**. Every live unit carries a spend line in §7. **Red proof** is owed by every unit that ships a guard, against the bug it targets and before the fix (`CLAUDE.md` §5 rule 2; `[P4-X4]`). **Owner review batches** are required wherever a unit changes content, grades or user-facing health copy, as in Phase 3's U4 and U6. *Conditional* means the unit exists only if the named decision admits it.

**Order.** U1 first: its guards bind the documents every later closeout writes. Then U2 → U3, because U3 moves a file U2's type change does not touch, and the order keeps their diffs apart. **U5 before U6 and U7**: a rubric change re-derives grades, and content should be judged once, under the final rubric. **U8 after U7**, so it re-verifies the fixture U7 extends. The rest are independent.

| Unit | Goal | Type | Closes | Red proof | Gate | Owner batch |
|---|---|---|---|---|---|---|
| **U1** Doc-guard instrumentation | DOC_TRUTH derives its token universe and unenforced-marker check from `describe` titles across `src/architecture/*.test.ts`. One declared register row shape, with a guard keyed on it. A parity row shape that can say `[~]`. A length assertion on `docs/01-plan/features/*.plan.md`. One anchored comment-stripper, shared | deterministic | N-85, P-08 parity (with D-11), FU-42, FU-45, FU-46, FU-47, N-79 | Replay N-85's D1/D2 (today a rule-7 row flipped to *Not enforced* stays **green** and must go red; today a backticked `CLIENT_TAKES_PROPS` is **red** and must go green). A planted over-cap artifact. A planted `[~]` row. A `//` inside a URL literal | G | no |
| **U2** Type and dead-code hygiene | `Effect.evidenceProfile` required, the no-profile branch and its fallback test removed; the stale `paper.ts` header corrected; the 4 dead `safetyCopy` helpers deleted | deterministic | FU-63, FU-58, FU-30 | `tsc` fails on a seed effect with its profile removed (the compiler, not vitest, now carries `[P3-X1]`). The deletions are proven by `git grep` showing zero callers before removal | G | no |
| **U3** Id manifest out of `src/` | Move the manifest to the authored side (`content/`) so that an id-adding correction touches no `src/` file. `id-stability` reads the new path. The append-only policy (`CLAUDE.md` §2.4 rule 16) must survive **unweakened** | deterministic | ruling candidate; `[P3-X5]` caveat | A planted id removal is red at the new location. A recorded id-adding correction whose diff shows no `src/` path, with a test binding the two (as P-12 did for X5) | G | no |
| **U4** Guard reach | `error-disclosure` scans `"use server"` modules. A guard that probe scripts import their request bodies from `src/`. The env loader warns on a populated file matching zero keys | deterministic | FU-31, FU-35, FU-37 | Planted raw `error.message` return in `src/lib/auth/actions.ts` is red; a probe with an inline body is red. FU-37's own record says the observed case would **not** have been caught (three keys matched), and the unit must restate that limit | G | no |
| **U5** Rubric | Apply D-2 to the weights and to R17's size clause. Re-derive and pin every grade that moves (R10 pattern), and state what happens to persisted `kind='effect-grade'` citations | deterministic | FU-61, FU-71 | A planted *well-studied null* profile reaches B today and must not after. A planted 12-participant unflagged study scores as the new clause says | G | **yes** (every grade move) |
| **U6** Content corrections | Apply D-5 to fish-oil-cardiovascular, and resolve the glycine *"target 3 g"* note against `generalDose` | deterministic *(live if D-5's split option mints an id **and** retires the old one)* | FU-68, FU-62 (dose residue) | A pin on the corrected name or grade, red on the old value | G | **yes** |
| **U7** Sourcing pass | Glycine-sleep and zinc-deficiency, by U6-of-Phase-3's process: verified abstracts only, captured resolver responses, no model recall | **live** (network) | FU-62 (sourcing) | P3/P7/P8 stay red on a planted unverified entry at the new ids | G + dated record under `docs/05-qa/` | **yes** |
| **U8** Re-verification between closeouts | Implement D-6's mechanism for re-resolving all fixture entries | **live** (network) | FU-72 | A planted drifted title or a retraction `pubtype` in a captured response is reported, not passed | G + dated record | **yes** (attestation: `verifiedBy`) |
| **U9** Export labels | The account export resolves paper labels at export, as the chip already does at render | deterministic | FU-60 | A pre-U6 stored label reaches the export today; red, then green | G | no |
| **U10** Advisor confirm surface | Compare-and-set on `attach_product`; render `PARTIALLY_APPLIED` with its unreverted items | deterministic | FU-1, FU-34, N-71 (product half) | Two interleaved confirms today persist an inverse that was never current; a component test is red when `details.unreverted` is not rendered | G | **yes** (new user-facing copy) |
| **U11** *(conditional, D-4)* API voice | Implement the chosen 404 voice without breaking `NOT_FOUND_UNIFORMITY`'s security property | deterministic | N-50 | Whatever D-4 chooses, the guard stays red on a response that distinguishes *another user's* resource from a missing one | G | **yes** (copy) |
| **U12** Live-run serialisation guard | Assert `workers: 1` and `fullyParallel: false` under `E2E_LIVE` | deterministic | FU-25 (guard half) | Removing either setting is red | G | no |
| **U13** Products | A coverage-limit statement in `ProductMatchPanel`, routed through `CoverageLimit`. **The real catalog (roadmap item 2) only if D-3 admits it**, with ranking independence still test-proven (`CLAUDE.md` §2.4 rule 17) | deterministic *(catalog sourcing is **live**)* | FU-59 (products); item 2 if admitted | `CoverageLimit`'s completeness test is red until the panel is registered | G | **yes** |
| **U14** *(conditional, D-3)* Roadmap candidates | **a** revise `context-adjusted-evidence.plan.md` (docs only; its *"A for you, because your 25-OH D is 18 ng/mL"* framing must be re-checked against §2.1 rule 1 before any code) · **b** the accessibility half of item 3 · **c** longitudinal intelligence (+ FU-65 if it is the first `getBiomarker` caller) | a: docs · b, c: deterministic | roadmap items 1, 3, 4 | Per roadmap §Testing: engine unit tests, a reachability guard, a copy↔computation binding, component tests | G | **yes** (a, c: health copy) |
| **U15** *(conditional, D-7)* Logging sink | A sink with a redaction layer at the boundary, correlation ids past `handle()`'s reach, `middleware.ts` `getUser()` logged | **live** (external service) | N-11, N-40, FU-41, FU-43, FU-44 | A planted health-bearing error message is redacted before the sink; red without the layer | G + threat review before merge | no |
| **U16** *(conditional, D-8)* Database-value integrity | FU-29's mapper validation and/or CHECK constraints; FU-57's tombstone and migration | deterministic for FU-29 (a) · **live** (deployed DB) for CHECK constraints or FU-57 (b) | FU-29, FU-57 | A migration-coherence run (CI's Postgres) red on a planted out-of-domain value | G + OP row + dated record | no |
| **U17** *(conditional, D-9)* Demo fixture | Whatever D-9 chooses for the one remaining **X** (`db/seed.ts`) | a: **live** · b, c: docs | exit criterion 2; FU-25 (isolation half) | a: two live workers on distinct users, owner-run | G (+ owner-run live record for a) | no |
| **U18** *(shaped by D-10)* Either/or hygiene | FU-66 font, FU-50 dependency, FU-36 port name, each as D-10 answers | deterministic *(self-hosting the font is one **live** download)* | FU-66, FU-50, FU-36 | FU-66 self-hosted: `next build` succeeds with the network blocked. FU-50 removed: gate green, `git grep` empty | G | no |

---

## 5. Exit criteria

**`[P4-X1]`…`[P4-X3]` are word for word the roadmap's.** **`[P4-X4]`…`[P4-X8]` are plan-only.** They bind roadmap Testing and Security requirements, the opening decisions and the ruling's candidate, and have no roadmap counterpart by design. A parity guard (U1) must exclude them **by name**, as Phase 3 did for X6–X9.

- [ ] **[P4-X1]** Each shipped item meets its own plan's success criteria, with no "partial" left unexplained.
- [ ] **[P4-X2]** No subsystem classified prototype-only in an updated `docs/project-status.md`. *(Today one: `db/seed.ts`. **D-9**.)*
- [ ] **[P4-X3]** Coverage thresholds hold across all engines; CI green on `main` continuously. *("Continuously" is read as: every `main` push in the phase has a green CI run whose head SHA is that push. Checked at closeout by `gh run list --branch main`.)*
- [ ] **[P4-X4]** *(plan-only)* Every guard this phase ships has a recorded red-evidence entry against the bug it targets.
- [ ] **[P4-X5]** *(plan-only)* Every new feature ships with pure-engine tests, a reachability guard, a copy↔computation binding, and a component test if it renders a safety-relevant value (roadmap §Testing, restated as a criterion because the roadmap gives it none).
- [ ] **[P4-X6]** *(plan-only)* Any new external integration has a threat review recorded before merge. Any new paid endpoint is inside `PAID_API_BUDGET`'s derived set (roadmap §Security).
- [ ] **[P4-X7]** *(plan-only)* N-50 is decided and the decision is recorded (roadmap item 0: *"decided rather than inherited"*).
- [ ] **[P4-X8]** *(plan-only)* A content correction that adds an id can be reviewed and shipped without hand-editing `src/` (U3; this closes the `[P3-X5]` caveat).

**No rewording of the roadmap's three.** X3's reading of *"continuously"* is an interpretation, printed beside the criterion. It is not an edit.

---

## 6. Decisions for the owner

**All options, none chosen.** Where an option crosses a `CLAUDE.md` §2 rule, it says so. Numbering is this plan's own; the Phase 3 Check's delta items D-1…D-5 are unrelated and were all resolved at the declaration.

### D-1 — Execution mode
- **(a) Supervised per unit, as in Phase 3.** The owner rules at each unit's plan, reviews each landing, and gives each go. *Strongest control; throughput limited by owner availability; deterministic units wait behind content decisions they do not depend on.*
- **(b) Unattended runner.** Executes **deterministic** units end to end. Content, copy and attestation decisions go to a **daily owner batch** without blocking independent work. It **hard-stops** on live calls, spend, the deployed database, migrations, `CLAUDE.md`, force-push, or any guard weakened, with an **independent reviewer at each unit closeout**. *Highest throughput. It needs a standing approval of today's shape recorded for the phase, because `CLAUDE.md` §10 rule 5 otherwise asks each time. Batch latency moves review after the fact for anything the runner lands, and "any guard weakened" needs a mechanical definition (e.g. a diff touching `src/architecture/**` or an allowlist growing), or the stop is a judgement the runner makes about itself.*
- **(c) Hybrid by unit type.** (b) for units typed deterministic **with no owner batch** (U1, U2, U3, U4, U9, U12, and U18 without the font download); (a) for everything live or batch-bearing. *Keeps content and live work supervised. The split is by this table's typing, so a mistyped unit lands under the wrong mode. Phase 3's (c) re-typing of U6 is the precedent that typing can be wrong.*

### D-2 — FU-61 / FU-71: the rubric
The question is whether to reweight, and whether existing grades are re-derived under the new weights. **Under G4b every grade is already derived, so any weight change re-derives all 27 automatically.** The real choice is whether to accept those moves.
- **(a) No weight change.** Record the limit (*a well-studied null can reach B*) where the rubric is documented. *No grade moves. The known flaw stays in the trust layer, disclosed.*
- **(b) Reweight, and re-derive all 27.** Every move goes through an owner batch and is pinned. *Fixes the flaw at its source. Grades move again one phase after they were approved.*
- **(c) Keep weights, add a gate.** e.g. an effect-size or consistency floor for B. *Targets the null case without touching other grades. A second mechanism beside the weights.*
- **(d) Reweight and re-score dimensions from the captured abstracts.** *Most thorough. Largest review load.*
- **FU-71, independently:** keep R17's author-flag clause · an objective participant threshold (what number?) · drop the size clause.

### D-3 — Which roadmap candidates enter Phase 4
Each of items 1–4 in or out, and for item 5, which (if any) `product-direction.md` §7 capability gets an explicit decision:
- **1 Context-adjusted evidence** (U14a first, docs only). *The biggest product value, and the highest §2.1 risk: its halted plan's example copy asserts a user's lab state.*
- **2 Real product catalog** (U13). *Live sourcing; ranking independence must stay provable. `product-direction.md` §7 keeps the live commerce API out.*
- **3 Accessibility half** (U14b). *The component-test half is already done (U10 of Phase 3).*
- **4 Longitudinal intelligence** (U14c). *Likely FU-65's first real caller.*
- **5 §7 deferred capabilities**: none, or name them one by one.

### D-4 — N-50: the API's voice on 404
- **(a) Keep the uniform bytes** and record them as the chosen voice. *No change. A user with a mistyped id and a user probing another's resource get the same sentence.*
- **(b) Distinguish *malformed* from *not found*** (a 400 for an id that fails validation), keeping every well-formed miss uniform. *Helps typos. Leaks nothing about ownership.*
- **(c) Per-resource wording** (*"Stack not found."*), identical for own-missing and other-owned. *Friendlier. Must stay byte-identical across the ownership boundary or it becomes an existence oracle (§2.3).*

### D-5 — FU-68: fish-oil-cardiovascular
- **(a)** Rename the effect to what its evidence measures (triglyceride lowering); keep the grade. *Truthful name. The display changes; the id does not.*
- **(b)** Keep the name, re-score against the clinical outcome. *The grade likely falls.*
- **(c)** Split into two effects: a new surrogate effect (a manifest `add`) and the clinical one re-scored. *Most precise. If the old id is retired, U6 becomes live (a tombstone plus a migration over `advisor_messages.citations[].refId`).*
- **(d)** Keep both, and add a qualifier sentence bound to the profile. *Smallest change. The name still over-claims.*

### D-6 — FU-72: how re-verification runs between closeouts
- **(a) A scheduled CI workflow** with network, **not** a required check. *Automatic. It puts a network dependency in CI, which Phase 3's D-3 kept out of the build, and it can fail on someone else's outage.*
- **(b) An owner-run script on a fixed cadence**, with a dated record under `docs/05-qa/`. *No CI network. Relies on the cadence being kept, and nothing enforces a calendar.*
- **(c) Phase-closeout trigger only** (today's policy). *No new mechanism. The E1-R2b window stays as long as a phase.*

### D-7 — The logging-sink cluster (N-11, N-40, FU-41, FU-43, FU-44)
Five register rows name *"the next operational phase"*, and **no such phase exists in the roadmap** (Phase 3 report §10).
- **(a) In Phase 4 (U15).** *Closes five rows. A new external integration with a threat review, an account and possible spend. Health data must be redacted before it reaches a third party (§2.3 rule 15).*
- **(b) A new roadmap phase for operational readiness.** *Honest sequencing. Needs a roadmap edit.*
- **(c) Stay deferred; Observability stays B.** *No cost. The rows go on naming a phase that does not exist, which is the N-11 shape.*

### D-8 — Deployed-database work (FU-29, FU-57)
- **FU-29:** (a) app-side validation at the mapper only (deterministic) · (b) plus CHECK constraints (live, OP row) · (c) out.
- **FU-57:** (a) keep the uncited row; it is cited by nothing and harms nothing · (b) tombstone plus migration over `advisor_messages.citations[].refId` (live, OP row).

### D-9 — Exit criterion 2 and `db/seed.ts` (the one **X**)
- **(a) Build per-worker isolation (FU-25)** and reclassify on the evidence. *Needs the service-role key locally (owner-run, never in CI). Email rate limits are the documented obstacle.*
- **(b) Reclassify with a written reason**: a dev/test fixture, not a product subsystem. *Cheap. Must be argued against §8 rule 2 (a mock never labelled permanent by default).*
- **(c) Re-scope the criterion** to production subsystems. *A roadmap edit; it changes what "complete" means.*

### D-10 — Three either/or hygiene items (U18)
- **FU-66:** keep the build-time font fetch · self-host with `next/font/local` (one font download: needs the owner's permission and a licence check).
- **FU-50:** remove `@vitejs/plugin-react` · keep it with a written reason.
- **FU-36:** rename `ClaudeAdapter` (opens `src/types/`, zero behaviour change) · accept the stale name with the reason recorded.

### D-11 — Criteria parity: may a unit edit the roadmap?
- **(a)** Insert `[P4-X1]`…`[P4-X3]` into the roadmap at approval · **(b)** also backfill `[P3-X1]`…`[P3-X5]` · **(c)** no roadmap edit, so parity stays absent and U1 ships without it.

### D-12 — Opening Phase 4 against the roadmap's ordering rule
The roadmap says a later phase *"may not start while an earlier phase has unmet exit criteria"*. Two boxes read unmet. **Phase 0's U-DEFER-4** is stale (N-86): it is met. **Phase 1's `[~]` live-E2E criterion** is PARTIAL under ruling 3.
- **(a)** Tick Phase 0's box with evidence, and extend Phase 1's dated exception to Phase 4 explicitly, in the approval landing.
- **(b)** Tick Phase 0's box only, and leave Phase 1's exception implicit (as Phases 2 and 3 did). *That is the silent proceeding the rule forbids.*
- **(c)** Hold Phase 4 until the live-E2E criterion is met. *Needs credentials that ruling 3 keeps out of CI.*

---

## 7. Spend

**This draft performs no spend and authorises none.**

| Unit | Why live | Expected calls / cost | OP row |
|---|---|---|---|
| **U7** | PubMed E-utilities / Crossref lookups for 2 effects | on the order of Phase 3's U4 sourcing (37 calls), **$0** | none (public APIs, as in Phase 3) |
| **U8** | re-resolve every fixture entry | **37** per run (today's fixture) plus U7's additions, **$0** | none under D-6 (b)/(c). **(a) opens one**: CI network egress |
| **U6** *(only D-5 (c) with retirement)* | migration over `advisor_messages.citations[].refId` | one deployed write | **opens one** |
| **U13** *(only if D-3 admits the catalog)* | sourcing product label data | unknown until scoped, **$0** in lookups | none unless a paid API is proposed, which §7 of `product-direction.md` excludes |
| **U15** *(only D-7 (a))* | an external log sink | account cost unknown | **opens one** (account-held, like OP-5) |
| **U16** *(only D-8 live options)* | deployed-database migrations | one per migration | **opens one** |
| **U17** *(only D-9 (a))* | seeding per-worker users with the service-role key | owner-run | **opens one** |
| **U18** *(only D-10 font self-host)* | one font file download | 1 | none |

**No OpenAI call is planned in any unit.** Any unit that finds it needs one stops. **OP numbers are allocated only when an option that opens one is chosen**, starting at **OP-8** (the highest *issued* row is OP-7, per §2's second ceiling row). This draft issues none, so no number is promised without a row (the Phase 2 *"promise is not a record"* shape).

---

## 8. Appendix — claims checked and withdrawn

| Claim, as found | Status after checking |
|---|---|
| Brief: base *"HEAD 291e287"* | **HOLDS at session open.** The plan's base is **`49bb62e`**, that SHA plus the owner's X → B landing, which the brief orders first |
| `project-status.md`: *"Content delivery … X"* | **Superseded at `49bb62e`** by the owner's ruling (X → B) |
| Phase 3 report §10: the register's *"next operational phase"* | **HOLDS as a defect:** no such phase exists in the roadmap. **D-7** decides where those rows land |
| Roadmap Phase 0: U-DEFER-4 *"Unmet"* (`:179`) | **WITHDRAWN as a fact**: met since U0 (`.test.tsx` collected and run by the jsdom project), closed in full by U10. **Registered N-86**; the box is ticked only by a roadmap edit (**D-12**) |
| Roadmap Phase 4 item 3: component tests + accessibility | **HALF DELIVERED EARLY:** Phase 3 U10 plus `RULE8_COMPONENT_TESTS`, 17 of 17. Only the accessibility half remains (U14b) |
| Roadmap Phase 4 item 1: *"assumed a `populationRelevance` seam that exists for only 8 of 27 effects"* | **STALE:** 27 of 27 are profiled (§2). The plan still needs revising first, as the roadmap says, and now for the §2.1 reason U14a names |
| Brief: *"doc guards accept the new plan"* | **True, and vacuous for this file:** no spec in `src/architecture/` reads `docs/01-plan/phase-4-*`. `CRITERIA_PARITY` pins the Phase 2 plan by path. AC-6 proves only that nothing broke; **U1 is where a guard would start reading it** |
| Delta item D-5 (`CLAUDE.md` baseline 1679) | **Resolved at the declaration:** 1693 / 144, which §2 re-measures and matches |
| N-22 as an open advisor question | **WITHDRAWN as live:** re-scoped and withdrawn 2026-08-10, and the gateway it concerned was retired at U31 |
| This draft's own first §2 ceiling row, *"OP-7"*, beside a command | **CORRECTED:** that command prints **8**, because OP-8 appears in text as *"next free"*. The row now prints what the command prints, and a second row carries the issued ceiling with its own command |
| This draft's own first count of the §3 source set, *"72 ids"* | **CORRECTED → 66** by the command §3 prints. The first figure was estimated before the command was run: FU-32's class, caught before landing by AC-3 |
| FU-29 *"needs a deployed-database migration"* | **REFINED:** only its CHECK half does. Runtime validation at the mapper is deterministic (D-8 (a)) |
