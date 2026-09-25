# Phase 4 — Product completion

> **STATUS: DRAFT — AWAITING OWNER APPROVAL.** A Draft outranks nothing (`CLAUDE.md` §6: rank 5 is *an approved* plan). **Nothing here authorises work.** No unit may start, and no guard may be written or relaxed, until this file carries an APPROVED status line and every decision in §6 that gates a unit has been answered.
>
> **Base SHA `49bb62e`** · authored **2026-09-25** · unit **PHASE4-PLAN** · landing (a) the draft · **landing (c) revises it against `docs/reviews/phase-4-plan-review.md` (P-01…P-20), anchor `e7e249c`.** §9 dispositions every finding. **The revision answers no decision.** It corrects, splits and adds them (D-13…D-16 are new). Cycle artifact: `docs/01-plan/features/phase4-plan.plan.md`.
> **Scope authority:** `docs/roadmap.md` §Phase 4 (rank 6). **Predecessors:** the Phase 0–3 plans and reports (§3 reads every register), `docs/reviews/phase-3-closeout-check.md`.
>
> **Discipline.** Every §2 figure carries its command. **G** means the full `CLAUDE.md` §5 rule 10 set: `npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npx next build` · `npm run verify:bundle`, plus `npm run verify:rendering` and the non-live E2E suite. **G makes one network call:** `next build` fetches Google Fonts (FU-66). That fetch is pre-existing behaviour, made by every gate since Phase 0, and is named here so no runner mistakes it for a live call (D-1, D-10). Whether G gains `test:coverage` and `verify:migrations` is **D-15** (P-18). Commit, push, merge, tag and branch deletion each need the owner's approval (`CLAUDE.md` §10 rule 5); D-1 decides whether a standing approval replaces that in this phase.

---

## 1. Objective

**Complete the intended core product on a foundation that is now correct, verified, operable, and grounded** (roadmap, verbatim).

**What this constrains.** The roadmap's Included work is *"candidates, prioritized by product value — not a commitment"*, so **this plan commits to no product candidate. D-3 does.** The draft fixes two things. Every issued register id gets a position (§3). Each candidate is set out as a conditional unit (§4) that an answer in §6 turns on or off. The personalization prerequisite is met: Phase 3 grounded 27 of 27 grades.

**"Feature", for `[P4-X5]` (P-19):** an item D-3 admits, meaning roadmap items 1–4 or a `product-direction.md` §7 capability named under item 5. Copy inside correctness units (U4, U10, U11, U13's statement) is not a feature; it carries an owner batch instead. **Vacuous case, a known property:** if D-3 admits nothing, X1–X3 can hold with no product shipped. A closeout in that state must say the objective is unmet. It may not declare "product completion".

---

## 2. Baseline, re-derived at `49bb62e` (rows marked (c) re-derived at `e7e249c`; nothing under `src/` changed between)

Seed figures read the authored JSON (`node -e` over `content/seed/*.json`). Test and bundle figures come from the full gate, run in a clean worktree with no `.env.local`.

| Figure | Value | Command |
|---|---|---|
| Unit tests | **1693 / 144 files** (node 1563 / 120 · jsdom 130 / 24) | `npx vitest run --project node` · `--project jsdom` |
| Architecture specs | **30** | `git ls-files 'src/architecture/*.test.ts' \| wc -l` (bound by `SPEC_COUNT`) |
| Lint scope | **415 of 415**, 0 errors | `npm run lint` |
| Bundle | **OK**, within 1% · **10** routes · shared **105313 B** | `npm run verify:bundle` · `node -e` over `docs/05-qa/bundle-baseline.json` |
| Rendering · E2E non-live | **OK** · **70 passed / 30 `[LIVE]` skipped** | `npm run verify:rendering` · `npm run test:e2e` |
| Effects · grades | **27** · **A 4 · B 9 · C 8 · D 6**; 27/27 profiled; **2** cite no paper (`nac-antioxidant`, `protein-powder-recovery`) | `node -e 'const E=require("./content/seed/seed-effects.json");…'` (grade tally, `evidenceProfile`, empty `paperIds`) |
| Papers · fixture entries | **38** · **37** | `node -e` over `seed-papers.json` · `content/verification/provenance-fixture.json` |
| `id-manifest.json` location · version | **`src/data/`** · **2** | `ls src/data/id-manifest.json` · `node -e '…require("./src/data/id-manifest.json").version'` |
| Subsystems classified **X** | **1**: `db/seed.ts` shared demo fixture (`project-status.md:474`, **no written basis**; P-20) | `grep -n '\| \*\*X\*\* \|$' docs/project-status.md` |
| Register ceilings · issued range | **N 85 · FU 72 · OP 8** mentioned at `49bb62e` (N prints **86** once this plan issues N-86); **OP-7** highest issued (OP-8 is only ever *"next free"*) → **164 issued ids** | `git grep -ohE 'N-[0-9]+' -- docs CLAUDE.md \| sed 's/N-//' \| sort -n -u \| tail -1`, likewise `FU-`, `OP-`; `git grep -n 'OP-8' -- docs CLAUDE.md` |
| (c) API `notFound("…")` sites | **15**: Stack **8** · Stack item **4** · Conversation **2** · Action **1** | `git grep -ho 'notFound("[^"]*")' -- 'src/app/api/**/route.ts' \| sort \| uniq -c` |
| (c) Service 404 literals | **3** at `src/services/advisor-actions.ts:80,88,95`; `:80` and `:95` echo a caller-supplied supplement id | `grep -n NOT_FOUND src/services/advisor-actions.ts` |
| (c) Coverage floors | **17** entries over **23** `src/lib` directories. Unfloored by recorded design (`vitest.config.ts:83-89`): `advisor`, `identity` (not pure); `api`, `auth`, `supabase` (infrastructure); `db` (persistence) | `node -e` diffing the `"src/lib/<dir>/**"` keys of `vitest.config.ts` against `readdirSync("src/lib")` |
| (c) CI steps G omits | `npm run test:coverage` (`ci.yml:191`) · `npm run verify:migrations` (`ci.yml:220`, needs a live Postgres) | `grep -n 'test:coverage\|verify:migrations' .github/workflows/ci.yml` |

The CI step count is not re-derived: no unit turns on it, and a fresh snapshot would only rot (FU-32). The coverage floors **are** re-derived at (c), because X3's *"all engines"* needs a printed reading (P-18).

---

## 3. Disposition of every issued register id

**Source set, widened at (c) on P-01, permanently.** Phase 3 bounded its register by section and lost FU-25; landing (a) repeated that boundary. Selecting rows by status text is no safer: the register uses four row shapes (FU-46), and Phase 1's rows record their later status in Phase 2's prose (§4.3). **So the source is every id ever issued, and each one gets a position:**

```
{ seq -f 'N-%g' 1 85; seq -f 'FU-%g' 1 72; seq -f 'OP-%g' 1 7; } | sort > src-ids.txt       # 164 = §2's issued range
awk '/^## 3\./{f=1;next} /^## 4\./{f=0} f && /^\| /' docs/01-plan/phase-4-product-completion.plan.md \
  | cut -d'|' -f2 | grep -oE '\b(N|FU|OP)-[0-9]+' | sort -u > table-ids.txt
comm -23 src-ids.txt table-ids.txt      # → (empty)
comm -13 src-ids.txt table-ids.txt      # → N-86   (the one id this plan issues)
```

**OPEN is a status with a cited record, not a section.** An id is open unless a register row, a unit report or a closeout list records it closed. The CLOSED rows at the foot of the table name that record. **Registers read in full for status:** Phase 0 plan (deferred units) and report §5 · Phase 1 plan §5, §12 and report §8–§9 · Phase 2 plan §4.2–§4.6, §10.3 and report §9–§11 · Phase 3 plan §7 and report §9–§10. **Unnumbered residues cannot be seen by an id `comm`**, so they are checked by name: the **11** rows marked *(unnumbered)* (landing (a) said 5; P-20 counted 6; P-01's widening adds F7, the email exposure, U-DEFER-4's record, N-50's service sub-case and the manifest candidate). **Result: 73 open, 91 closed**, and 1 issued here.

| Item | What | Position |
|---|---|---|
| **N-85** + criteria parity *(unnumbered)* | DOC_TRUTH blind to `describe`-title guards · `[P3-Xn]` absent from the roadmap | **N-85 IN U1.** **Parity IN U1 only under D-11 (a)/(b)**; under D-11 (c) it stays absent (P-16) |
| **FU-42 · FU-45 · FU-46 · FU-47 · N-79** | parity can't say `[~]` · artifact cap unmeasured · four row shapes · four private strippers · N-79's blind spot | **IN U1** (doc-guard instrumentation). N-14's class continues here |
| **FU-61 · FU-71** | a well-studied null can reach B · R17's size clause relies on author flags | **IN U5, shaped by D-2** |
| **FU-68** | fish-oil-cardiovascular at A on a triglyceride surrogate | **IN U6, shaped by D-5** |
| **FU-62** | sourcing for glycine-sleep, zinc-deficiency · FU-49's residue: glycine *"target 3 g"* vs `generalDose` 3–5 g | **Sourcing IN U7 (live). Dose residue IN U6** |
| **FU-72** | scheduled live re-verification between closeouts | **IN U8, shaped by D-6** |
| **FU-63 · FU-58 · FU-30** | `evidenceProfile` required · stale `paper.ts` header · 4 dead `safetyCopy` helpers | **IN U2.** `labSupported`/`labCaution` are deleted **only if D-3 excludes item 1**: U14a's compliant copy reuses `labSupported`'s template (P-06, P-10) |
| **N-12** | `getRemainingBudget` has no non-test caller | **IN U2**, landed after D-3 is answered. The row's own condition, *"If no UI claims it by phase close, delete it then"*, fell due at Phase 2's close and was not acted on. No Phase 4 candidate renders budget state |
| **N-35** | `src/lib/supabase/client.ts` imported by no non-test module; the register calls it *prototype-only in status* | **OUT, recorded for `[P4-X2]`.** X2 reads `project-status.md` rows, and none names this file, so X2 does not fire on it. The closeout records the file in P/B/X terms, or deletes it on an owner batch |
| **FU-31** | `"use server"` auth actions return raw `error.message` (`actions.ts:27,44`) | **IN U4, retargeted (P-04):** the taint model, not the scan scope |
| **FU-35 · FU-37 · N-26** | no guard covers `scripts/` · stale `.env.local` · probe fixture cannot discriminate (`openai-advisor-probe.ts:247`) | **IN U4.** N-26's trigger (*"the next unit touching the probes"*) fires there. Deterministic edit; running a probe is paid and not planned |
| **FU-38** | lab-import probe verifies shape, never content | **OUT, owner to confirm** (Phase 3 report §10 put it in Phase 4). Proof needs a paid probe run |
| **id-manifest move** *(unnumbered; ruling 2026-09-25)* | an id-adding correction hand-edits `src/data/id-manifest.json` | **D-13**, then **U3** if admitted. `project-status.md` registers it as a *candidate* (P-03) |
| **N-47** | two manifest fields, `Namespace.dereferenced` and `manifest.version`, declared and asserted by nothing | **IN U3 if D-13 admits it.** Trigger: *"whichever unit next opens `id-stability.test.ts`"*. Otherwise OUT, trigger intact |
| **FU-65** | `getBiomarker` seam, no real caller | **IN U14c only if D-3 admits item 4.** Otherwise OUT; the U8 R1 ruling against a synthetic caller stands |
| **FU-66 · FU-50 · FU-36** | build-time font fetch · unused `@vitejs/plugin-react` · stale `ClaudeAdapter` port name | **IN U18, shaped by D-10** |
| **FU-59** (products) | `ProductMatchPanel` has no coverage-limit statement | **IN U13** (copy, owner batch). The catalog is D-3 |
| **FU-60 · N-41** | export emits stored pre-U6 labels · the export is unbounded | **FU-60 IN U9, shaped by D-16.** **N-41 OUT, ruling intact:** U9 fires its trigger. The ruling at Phase 2 plan approval stands: a cap makes the export quietly partial. U9 records the touch |
| **FU-57** | `p-nac-antioxidant` uncited: tombstone + migration over `advisor_messages.citations[].refId` | **D-8** (deployed DB). Holds `[P3-X6]`'s tombstone obligation |
| **FU-29 · FU-17** | 13 `mappers.ts` casts with no CHECK · dead coalescing in `toCheckin` (DDL and type agree) | **D-8.** FU-17 rides with FU-29 (a): same mapper, same validation question. Otherwise OUT |
| **FU-25 · N-32** | `[LIVE]` isolation; serialisation guarded by nothing · `reuseExistingServer` lets a stale dev server stand in for the build | **Guard half + N-32 IN U12** (`playwright.config.ts` is N-32's trigger). **Isolation half: D-9** |
| **FU-1 · FU-34 · N-71 · N-15** | unlocked read on `attach_product` · `PARTIALLY_APPLIED` unrendered · N-71's product half · `AdvisorPanel` ignores `aborted` | **IN U10** (N-15's trigger is U10's `AdvisorPanel` edit). What U10 renders is **D-14** (P-12) |
| **FU-33** | `handleParams` wrapper | **OUT, owner to confirm** (Phase 3 report §10). U30's two-layer guard is the interim control, *"not a placeholder"* |
| **N-50** + service sub-case *(unnumbered)* | the 404 voice · `advisor-actions.ts:80,88,95` literals | **D-4**, then **U11** |
| **N-11 · N-40 · FU-41 · FU-43 · FU-44** | all need one logging sink | **D-7** |
| **N-36** | the middleware matcher is broad, so non-app requests do Supabase work | **IN U15 if D-7 (a)** (U15 edits `middleware.ts`); otherwise OUT, condition: the next matcher edit |
| **OP-5** | three UNKNOWN provider-account facts; the DPA page returned 403 | **OUT, kept visible:** a deployment gate, *before any deployment carries user traffic*. A unit exposing the advisor to real users inherits it |
| **N-22 · N-25** | `auto/*` aliases (withdrawn 2026-08-10) · PDF accuracy measured on clean renders only | **OUT, owner to confirm.** N-22 is moot: the gateway was retired at U31. N-25's condition: a dated probe on a real photographed report (live, paid) |
| **N-69** | `recordBatch` can stamp another user's `conversation_id` | **OUT, condition-bound.** The register's condition: *a second writer or a transferable conversation*. The Phase 2 report's (`:285`): *the next unit touching `recordBatch` or the `advisor_actions` schema*. **U10** edits `execute.ts`, not `recordBatch`. **U16**'s casts touch no `advisor_actions` column. Neither fires. A unit that does closes N-69 first (P-17) |
| **N-70** | ownership guards are check-then-act | **OUT, gate intact** for any transferable or shared-conversation proposal |
| **FU-40** | `RLS_COVERAGE` sees existence, not semantics (and FU-6's remainder) | **OUT, owner to confirm.** Condition: CI stops applying migrations. `pg_policies.cmd` is the control |
| **FU-32** · `CLAUDE.md` §4 **rule 8** *(unnumbered)* | counts written once · no mechanical form | **OUT: standing classes**, every phase |
| **N-37** | the build summary reports `/library/[slug]` as SSG with no HTML emitted | **IN U14a's revision:** SC-4 asserts SSG and must be restated against N-37 and U28. Otherwise OUT |
| **FU-18** | `labMarkerInputSchema.value` accepts negatives; needs a real clinical source | **IN U14c if admitted** (lab input is its surface); otherwise OUT, unowned |
| **N-18 · N-30 · N-33 · N-45** | the budget is in tokens, not cost · three deferred security headers · CSP has no report sink · `parseNumber` duplicated in lab-import | **OUT, each condition intact:** a price table is §2.2 rule 8 territory · each header is a deployment or domain decision · **re-raise on any enforcing CSP flip** · the next lab-import parsing change. No unit fires any of them |
| **N-43 · FU-24** | the gate measured the working tree, not the staged tree · cited artifacts must be copied into `docs/` | **OUT: standing procedures**, written into D-1's runner specification |
| **FU-4 · FU-8 · FU-9 · FU-10 · FU-11 · FU-12 · FU-14 · FU-15 · FU-19 · FU-20 · FU-21 · FU-22** | Phase 1 rows, each deferred with its own reason in Phase 1 plan §12, re-listed open in Phase 2 plan §4.3 | **OUT, reasons intact** (aliased `getUser` · services floor of 1 · SSE parse helper · F6 text · `belongsToStack` round trip · `?days` coercion · coupled reachability rows · anti-drift regex · two untested Zod modules · row-type placement · floors catch layer scale only · coverage ≠ verification). **No Phase 4 unit fires a trigger.** FU-21 and FU-22 qualify X3's reading (§5) |
| **F7** *(unnumbered)* | error-disclosure detector gaps: destructured bodies, two-argument `.then` | **OUT, condition intact:** a route adopts either form |
| **Email exposure** *(unnumbered)* | the developer's email in tracked files (52 at Phase 0) | **OUT: accepted exposure** (Phase 0 report §5) |
| **Live E2E BLOCKED(env)** *(unnumbered)* | the `[LIVE]` half is owner-run | **OUT, ruling 3 intact** (*no secrets enter this public repository*). The ordering consequence is **D-12** |
| **`replaceFlags` residue** *(unnumbered)* | three round trips, no transaction | **OUT, condition-bound:** the next second writer to `evaluation_flags` |
| **`[P3-X5]` wording** *(unnumbered)* | false for id-changing corrections | **Kept, with the caveat recorded (2026-09-25).** U3, if admitted, makes the caveat obsolete |
| **Roadmap item 5, seam half** *(unnumbered)* | UNMET (U8 R1) | See **FU-65** |
| **U-DEFER-4 record** *(unnumbered)* → **N-86** *(new)* | roadmap `:179` reads `[ ] Unmet`, but U0 met it and U10 closed it in full | **A record correction at the approval landing, independent of D-12** (P-08). It also owes the stale text at `:58`, `:72`, `:117`, `:198`, `:214`, `:513` and `:520` |
| **N-3**→FU-29 · **N-4**→FU-30 · **N-6**→FU-32 · **N-7**→FU-31 · **N-14**→FU-47 (audit delivered at U10) · **N-53**→FU-35 · **N-54**→FU-36 · **N-57**→FU-37 · **N-61**→FU-38 · **FU-6**→FU-40 (U3 closed part) · **FU-49**→FU-62 | **CLOSED, carried under another id** | Nothing carried beyond the target row |
| **FU-2 · FU-3 · FU-23** | **CLOSED in Phase 1** | Phase 1 plan §12; Phase 2 plan §4.3 |
| **N-1 · N-2 · N-5 · N-8 · N-9 · N-10 · N-13 · N-16 · N-17 · N-19 · N-20 · N-21 · N-23 · N-24 · N-27 · N-28 · N-29 · N-31 · N-34 · N-38 · N-39 · N-42 · N-44 · N-46 · N-48 · N-49 · N-51 · N-52 · N-55 · N-56 · N-58 · N-59 · N-60 · N-62 · N-63 · N-64 · N-65 · N-66 · N-67 · N-68 · N-72 · N-73 · N-74 · N-75 · N-76 · N-77 · N-78 · FU-5 · FU-7 · FU-13 · FU-16 · FU-26 · FU-27 · FU-28 · FU-39 · OP-1 · OP-2 · OP-3 · OP-4 · OP-6 · OP-7** | **CLOSED in Phase 2** | Phase 2 plan §4.4–§4.6 cells and §10.3. N-24 and N-31 were closed as instances, with the class stated as a rule. OP-1 is closed with a recorded residual |
| **N-80 · N-81 · N-82 · N-83 · N-84 · FU-48 · FU-51 · FU-52 · FU-53 · FU-54 · FU-55 · FU-56 · FU-64 · FU-67 · FU-69 · FU-70** | **CLOSED in Phase 3** | Phase 3 report §9 |

**Five items the Phase 3 report assigned to Phase 4 are moved OUT, each marked *owner to confirm*:** FU-33, FU-38, FU-40, N-22 and N-25. Confirming them is **D-3 (e)**.

---

## 4. Units

**Liveness test (Phase 3's, kept):** a unit is **live** if it needs the network (G's font fetch excepted, see the header), the deployed database, an OpenAI or other paid call, **or a data migration over any `persistedAt` surface in the id manifest**. Every live path has a spend line in §7. **Red proof** is owed by every unit that ships a guard, against the bug and before the fix (`[P4-X4]`). **Owner batches** apply wherever a unit changes content, grades, user-facing or health-adjacent copy, the rank-1 id ledger, or safety-copy sweeps (corrected at (c) on P-10). **Size** is the review's estimate (P-11). **May touch** makes every stop file-path-decidable (P-05 (4)). Every list also implicitly includes the tests beside each listed file, the unit's own record under `docs/01-plan/features/` and `docs/05-qa/`, and, when the unit adds a spec, the three `SPEC_COUNT`-bound sites (`docs/project-status.md`, `docs/02-design/architecture-boundaries.md`, `README.md`; `spec-count.test.ts`). *Conditional* means the unit exists only if the named decision admits it.

**Order.** U1 first: its guards bind the documents every later closeout writes. U2 → U3, to keep their diffs apart. **U5 before U6 and U7:** content is judged once, under the final rubric. **U8 after U7.** The rest are independent. **Gate: G for every unit**, plus the extras named in *Type*.

| Unit | Goal | Type | Size | May touch | Closes | Red proof | Owner batch |
|---|---|---|---|---|---|---|---|
| **U1** Doc-guard instrumentation | DOC_TRUTH derives tokens and markers from `describe` titles. One declared register row shape. A `[~]`-capable parity row (**D-11**). A length assertion on `docs/01-plan/features/*.plan.md`. One shared anchored stripper | det | L | `src/architecture/**` (new and extended specs; no assertion removed) | N-85, FU-42, FU-45, FU-46, FU-47, N-79; parity per D-11 | N-85's D1/D2 replayed: a rule-7 row flipped to *Not enforced* goes red, a backticked `CLIENT_TAKES_PROPS` goes green. A planted over-cap artifact. A planted `[~]` row. A `//` inside a URL literal | no |
| **U2** Type and dead-code hygiene | `Effect.evidenceProfile` required; `paper.ts` header corrected; dead `safetyCopy` helpers and `getRemainingBudget` deleted (§3 conditions) | det | S | `src/types/{effect,paper}.ts`, `src/lib/safety/**`, `src/lib/advisor/repo.ts`, `src/lib/advisor/repo.test.ts` (its `getRemainingBudget` cases), callers `tsc` names | FU-63, FU-58, FU-30, N-12 | `tsc` fails on a profile-less seed effect. **Deletions: zero *non-test* callers** (`git grep` excluding `*.test.ts`). The test callers at `safety.test.ts:36,38,39` and `getRemainingBudget`'s cases in `repo.test.ts` go with them, which **narrows the banned-language sweep** by those entries. The sweep edit is named in the landing | **yes** (sweep narrowing, safety copy) |
| **U3** *(conditional, D-13)* Id manifest out of `src/` | Move the manifest to D-13's target. `id-stability` reads it by path. Rule 16's append-only policy survives unweakened. Settle N-47 | det | M | `content/**`, `src/data/id-manifest.json` (delete), `src/data/id-stability.test.ts`, the 9 GENERATED `src/data/seed-*.ts`, one new spec binding the diff | ruling candidate; `[P3-X5]` caveat; N-47 | **(i)** A planted id removal is red at the new location. **(ii) No hand edit of `src/`, stated precisely (P-03):** a recorded id-adding correction whose diff touches `content/**` plus only `src/` files whose line 1 reads `// GENERATED from content/seed/…` (today exactly the 9 `src/data/seed-*.ts`), with CONTENT_FIDELITY (`canonical-layout.test.ts:110`) green, which proves each such file is byte-for-byte generator output. A test binds the name-only diff to that set: red on a planted diff touching the manifest or any non-GENERATED `src/` path. **Named consequences:** `docs/roadmap.md` names the old path at `:45`, `:441`, `:553`, `:569` (a roadmap edit, D-11) | **yes** (rank-1 ledger, append-only policy) |
| **U4** Guard reach | **FU-31, retargeted (P-04):** extend `error-disclosure`'s taint sources to a destructured Supabase result, `const { error } = await supabase.…`, whose `error.message` is returned. `actions.ts` is already walked (`error-disclosure.test.ts:87-93`), and the scan scope is not the gap. Replace both sites with generic copy. A guard that probe scripts import request bodies from `src/`. Env loader warns on a populated file matching zero keys. Probe fixture made answerable (N-26) | det | M | `src/architecture/error-disclosure.test.ts`, a new `scripts/` spec, `src/lib/auth/actions.ts`, `scripts/probes/**` | FU-31, FU-35, FU-37, N-26 | **HEAD is the red case:** `actions.ts:27` and `:44` go red under the extended taint model with no plant; green after the fix. A probe with an inline body is red. FU-37's record says the observed case would **not** have been caught (three keys matched); the unit restates that limit | **yes: login/signup error copy is an owner-review item** (usability vs account enumeration) |
| **U5** Rubric | Apply D-2 to the weights and R17's size clause. Hand-update and pin each stored letter that moves (G4b, `seed-integrity.test.ts:209`, reddens until then). State D-2's effect on persisted `kind='effect-grade'` chips | det; **live under D-2 (d)** unless the captured abstracts are present | M; **XL (d)** | `content/seed/seed-effects.json`, `src/lib/evidence-grading/**`, GENERATED `seed-effects.ts` | FU-61, FU-71 | A planted well-studied-null profile reaches B today and not after. A planted 12-participant unflagged study scores as the new clause says | **yes** (every grade move) |
| **U6** Content corrections | Apply D-5 to fish-oil-cardiovascular; resolve the glycine *"target 3 g"* note | det; **live if D-5 (b)/(c) sources new papers, or (c) retires the id** | S (a/d) · M (b) · L (c) | `content/seed/*.json`, GENERATED modules, `content/verification/**` | FU-68, FU-62 (dose) | A pin on the corrected name or grade, red on the old value | **yes** |
| **U7** Sourcing pass | Glycine-sleep and zinc-deficiency by Phase 3 U6's process: verified abstracts, captured responses, no model recall | **live** (network) | M | `content/seed/seed-papers.json`, `content/verification/**`, `docs/05-qa/**` | FU-62 (sourcing) | P3/P7/P8 stay red on a planted unverified entry at the new ids | **yes** |
| **U8** Re-verification | Implement D-6 | **live** under (a)/(b); none under (c) (docs only); det under (d) | S (b/c/d) · M (a) | `scripts/**`, `docs/05-qa/**`; `.github/workflows/**` only under (a) | FU-72 | A planted drifted title or retraction `pubtype` in a captured response is reported, not passed | **yes** (attestation is the owner's: `verifiedBy`) |
| **U9** Export labels | Apply D-16 to the account export's paper labels. Record N-41's trigger | det | S | `src/app/api/account/export/**`, its service and tests | FU-60 | A pre-U6 stored label reaches the export today; red, then green | **yes (D-16: data faithfulness)** |
| **U10** Advisor confirm surface | Compare-and-set on `stack_items.product_id` inside the update. Render `PARTIALLY_APPLIED` as **D-14** answers. `AdvisorPanel` handles `aborted` | det | M | `src/lib/advisor/actions/execute.ts`, `src/lib/db/stack-item-repo.ts` (`setItemProduct`, where the compare-and-set lands), `src/components/advisor/**`, their tests; `src/services/advisor-actions.ts` only under D-14 (b); **not** `recordBatch` (N-69) | FU-1, FU-34, N-71 (product), N-15 | Two interleaved confirms persist an inverse that was never current. A component test is red while `PARTIALLY_APPLIED` renders nothing. A turn ending `aborted` renders blank today | **yes** (new user-facing copy) |
| **U11** *(conditional, D-4)* API voice | Implement D-4 across the 15 sites and/or the 3 service literals | none under D-4 (a) with (c)(i) (record only); det otherwise | S–M | the 15 route files, `src/services/advisor-actions.ts`, their tests | N-50 | Under every option, `NOT_FOUND_UNIFORMITY` stays red on a response that distinguishes another user's resource from a missing one | **yes** (copy) |
| **U12** Live-run and server guards | Assert `workers: 1` and `fullyParallel: false` under `E2E_LIVE` (`playwright.config.ts:37-38`). Settle N-32's stale-server substitution | det | S | `src/architecture/**` (a new spec), `playwright.config.ts`. **A consequential `CLAUDE.md` edit** (`:209-210` would call the serialisation unguarded) is **queued, not made** | FU-25 (guard), N-32 | Removing either setting is red. A planted `reuseExistingServer: true` outside CI is red (or N-32 records why it is kept) | no |
| **U13** Products | A coverage-limit statement in `ProductMatchPanel` via `CoverageLimit`. **The catalog (roadmap item 2) only if D-3 admits it**, with ranking independence test-proven (§2.4 rule 17). **Catalog path (P-07):** append-only for the 21 seeded ids (`stack_items.product_id` and `advisor_actions` payloads persist them). Label data (dose per serving, allergens, testing claims) is verified against a real label source, never recall (§2.2 rules 7, 8, 10) | statement: det · **catalog: live; deployed DB + OP row if any seeded id is retired** | S · **XL** catalog | `src/components/stack/ProductMatchPanel.tsx`, `src/components/evidence/CoverageLimit.test.tsx`; catalog adds `content/seed/seed-products.json`, `src/lib/product-matcher/**` | FU-59; item 2 if admitted | `CoverageLimit`'s completeness test is red until the panel is registered. Catalog: a planted unverified label field fails; a planted removed id fails `id-stability` | **yes** (copy; every catalog label batch) |
| **U14** *(conditional, D-3)* Roadmap candidates | **a** revise `context-adjusted-evidence.plan.md`, **revision only** unless a later amendment admits code. Its gate names **§2.1 rules 1, 4, 6** and **§2.2 rules 7, 9, 10**. It restates stale **SC-4** (SSG, false since U28; N-37) and **SC-11** (a live E2E run, i.e. paid). Its example copy follows §6 D-3 item 1's compliance requirements · **b** the accessibility half of item 3 · **c** longitudinal intelligence, with a **rule-4 check** (no correlational signal presented as causal), a **§2.2 rule-9 check** (self-reported signals never override evidence) and a placed disclaimer. It adds FU-65 and FU-18 if it is their first caller | a: docs · b: det · c: det, **live if it migrates** | a: M · b: M–L · c: XL | a: that plan file · b: `src/components/**` · c: per its plan | roadmap items 1, 3, 4 | Roadmap §Testing: engine tests, a reachability guard, a copy↔computation binding, component tests | **yes** (a, b, c: grades, flags and citations in screen-reader text are safety copy) |
| **U15** *(conditional, D-7)* Logging | D-7's option: a sink with redaction (a), or a sink-less redaction layer (d) | **live** (a) · det (d) | L–XL (a) · M (d) | `src/lib/api/respond.ts`, `src/middleware.ts`, a new `src/lib/api/redact.ts` | N-11, N-40, FU-41, FU-43, FU-44 (all under (a); (d) narrows N-40/FU-41), N-36 | A planted health-bearing message is redacted before the sink or log; red without the layer | no; **threat review before merge** under (a) |
| **U16** *(conditional, D-8)* DB-value integrity | FU-29 (a) mapper validation (+ FU-17); (b) CHECK constraints; FU-57's tombstone and migration | det (a) · **live, deployed DB** (b, FU-57) | M (a) · L (live) | `src/lib/db/mappers.ts`; `supabase/migrations/**` under (b) | FU-29, FU-17, FU-57 | (a): a mapper test red on a planted out-of-domain row value. (b): migration coherence (CI Postgres, `verify:migrations`) red on the same value | no; OP row + dated record for live paths |
| **U17** *(conditional, D-9)* Demo fixture | D-9's option for `db/seed.ts`. Under (a) the service-role key stays confined to the dev seed script, never reachable from `src/app` or `src/components` (§2.3 rule 14) | a: **live** · b, c: docs | L (a) · S (b/c) | a: `src/lib/db/seed.ts`, `tests/e2e/**` · b/c: `docs/project-status.md`, roadmap (D-11) | `[P4-X2]`; FU-25 (isolation) | a: two live workers on distinct users, owner-run | no |
| **U18** *(D-10)* Either/or hygiene | FU-66, FU-50, FU-36, each as D-10 answers | det; the font self-host is one live download | S | `src/app/layout.tsx`, a font file, `package.json` (FU-50), `src/types/advisor.ts` + 3 adapters (FU-36) | FU-66, FU-50, FU-36 | FU-66 self-hosted: `next build` succeeds with the network blocked. FU-50 removed: G green, `git grep` empty | no |

---

## 5. Exit criteria

**`[P4-X1]`…`[P4-X3]` are word for word the roadmap's. `[P4-X4]`…`[P4-X8]` are plan-only**, and a parity guard must exclude them by name, as Phase 3 did for X6–X9.

- [ ] **[P4-X1]** Each shipped item meets its own plan's success criteria, with no "partial" left unexplained.
- [ ] **[P4-X2]** No subsystem classified prototype-only in an updated `docs/project-status.md`. *(Today one: `db/seed.ts`. **D-9**.)*
- [ ] **[P4-X3]** Coverage thresholds hold across all engines; CI green on `main` continuously. *(**"All engines", printed (P-18):** the 17 floor entries hold. They cover every `src/lib` directory except the 6 unfloored by recorded design (§2). FU-21 and FU-22 limit what a held floor proves. **"Continuously":** every `main` push in the phase has a green CI run on that head SHA. The check is `gh run list --branch main`, **a network call**; D-15 decides who runs it.)*
- [ ] **[P4-X4]** *(plan-only)* Every guard this phase ships has a recorded red-evidence entry against the bug it targets.
- [ ] **[P4-X5]** *(plan-only)* Every new **feature** (§1's definition) ships with pure-engine tests, a reachability guard, a copy↔computation binding, and a component test if it renders a safety-relevant value.
- [ ] **[P4-X6]** *(plan-only)* Any new external integration has a threat review before merge; any new paid endpoint is inside `PAID_API_BUDGET`'s derived set.
- [ ] **[P4-X7]** *(plan-only)* N-50 is decided and the decision recorded (roadmap item 0: *"decided rather than inherited"*).
- [ ] **[P4-X8]** *(plan-only, **conditional on D-13**)* A content correction that adds an id can be reviewed and shipped without hand-editing `src/`, proven as U3 (ii) states. Under D-13 (c) this criterion is withdrawn and the `[P3-X5]` caveat stays.

---

## 6. Decisions for the owner

**Options only; no answer is recorded here.** Where an option crosses a `CLAUDE.md` §2 rule, it says so. The Phase 3 Check's delta items D-1…D-5 are unrelated and were resolved at its declaration.

### D-1 — Execution mode
- **(a) Supervised per unit, as in Phase 3.** *Strongest control; throughput bound to owner availability.*
- **(b) Unattended runner** for deterministic units, under the specification below. *Highest throughput; review of landed work comes after the fact.*
- **(c) Hybrid.** (b) for units that are deterministic **and** carry no owner batch in the corrected §4 column: **U1, U12, U16 under D-8 FU-29 (a), U15 under D-7 (d), and U18's FU-66-keep branch only**. U18's FU-50 removal (`package.json`) and FU-36 rename (`src/types/`) hit stop classes and queue; its keep/accept branches are records and qualify. **Excluded with a reason:** U17 (b)/(c), because a reclassification or roadmap edit is the owner's record (stop classes 2 and 7); U11 under D-4 (a), because recording N-50's answer is the owner's. (a) for everything else. *Re-derived at (c) on P-10 and the delta check: U2, U3, U4 and U9 now carry batches. A mistyped unit lands under the wrong mode; Phase 3's re-typing of U6 is the precedent.*

**Runner specification, required for (b) and for (c)'s unattended half (P-05).**
1. **Authority.** A dated **standing approval**, recorded in this plan at approval as an explicit rank-2 exception to `CLAUDE.md` §10 rule 5. Its scope: branch, commit, push, fast-forward `main` and delete the branch, only for a unit whose G is green, whose staged files are all inside its *May touch*, and whose branch CI passes. Nothing wider.
2. **Stop classes. Hard stop, and queue the question:** a live call (network, deployed DB, OpenAI or other paid API); any spend; a migration; any edit to `CLAUDE.md`, `docs/roadmap.md` or `docs/product-direction.md`; `package.json` or the lockfile; `src/types/**`; the id ledger (`id-manifest.json`, or any id removed or renamed under `content/**`); `.github/workflows/**`; force-push; a staged file outside *May touch*; **a guard or allowlist weakened**, defined by diff: a deleted `it(`/`test(`/`describe(`, an entry removed from a shrink-only list, an allowlist or exemption list that grows, a scan pathspec that narrows, or a threshold that loosens, or **a sweep narrowed**: an entry removed from a test's inventory or sweep array, as U2's removal of `safety.test.ts:36,38,39` does (new specs and new assertions are not weakenings, so U1, U4 and U12 proceed); a content, grade or health-copy decision; **any unit that finds it needs a decision**.
3. **Permitted network:** G's `next build` Google Fonts fetch only (FU-66, pre-existing). Nothing else.
4. **Gate on the staged tree** (N-43): `git stash -u --keep-index`, or a clean checkout of the index.
5. **Decision queue:** `docs/01-plan/phase-4-decision-queue.md`, append-only. Each entry gives a date, unit, question, options, and whether it blocks that unit. **It never blocks independent work.** A unit waiting on an entry parks, and the runner moves to the next unblocked unit. A batch-bearing landing waits for its answer.
6. **Independent reviewer at each unit closeout:** a fresh subagent. Inputs: the unit's §4 row, its diff and this plan. Denied the authoring session's record. Cited artifacts must be copied into `docs/` (FU-24). **Veto:** any finding it marks blocking stops the landing and becomes a queue entry.
7. **No attestation.** The runner never writes `verifiedBy`/`verifiedOn`, a ruling, an approval, an exit-criterion tick, or a `CLAUDE.md` §5 baseline. Those lines are the owner's.
8. **Sessions and caps:** a fresh session per unit, with scratchpad resume notes holding the brief verbatim and progress, so a compaction loses nothing. **Per-unit caps on tool calls and wall-clock time**, values set by the owner at ruling. Hitting a cap is a stop class.

### D-2 — FU-61 / FU-71: the rubric
**Corrected at (c) on P-13:** `content/generate.mjs` never calls `deriveGrade`. G4b (`seed-integrity.test.ts:209`) asserts stored = derived, so a weight change **reddens G4b** until each moved letter is hand-updated in the JSON. Persisted `kind='effect-grade'` chips keep their old letters under every option unless they resolve at render, as U9 does for labels.
- **(a) No weight change.** Record the limit where the rubric is documented. *No grade or chip moves.*
- **(b) Reweight; hand-update every moved letter** through an owner batch, with pins. *Fixes the flaw at source. Moved grades leave stale chips.*
- **(c) Keep the weights; add a gate** (e.g. an effect-size or consistency floor for B). *Only null-case letters move. Their persisted chips keep the old letters unless they resolve at render.*
- **(d) Reweight and re-score dimensions from the captured abstracts.** *Most thorough, XL. Live wherever the gitignored local abstracts are absent. Moved letters leave stale chips, as under (b).*
- **FU-71, independently:** keep R17's author-flag clause · an objective participant threshold (the number is the owner's) · drop the size clause.

### D-3 — Which roadmap candidates enter Phase 4
**Per candidate** (the original choice): each of items 1–4 in or out, and for item 5, which `product-direction.md` §7 capability (if any) gets an explicit decision.
- **1 Context-adjusted evidence** (U14a first, docs only). **Compliance requirements for its example copy (P-06), requirements only:** no sentence labels the user deficient or diagnoses them (§2.1 rule 1). The user's own entered value, unit and date are compared **only** to the reference range the user entered. The study population is stated as the paper's inclusion criterion, from the verified record. There is **no personal grade letter**: the grade describes evidence, never the user (rule 4). The copy says the app cannot determine whether the evidence applies, and escalates on an out-of-range value (rule 6). Every bracketed field binds to an entered, computed or verified value, test-enforced (§2.2 rule 7). **Two draft lines for the owner's later review**, bracketed fields bound as named:
  - *"Your {marker} entry of {value} {unit} ({date}) is {below\|above} the reference range you entered ({refLow}–{refHigh}). {n} of the {m} studies cited for {effect} enrolled {inclusionCriterion} ({paperLabels}). The {grade} grade describes those studies, not you, and the app cannot determine from the information provided whether they apply to you. A lab value outside the range you entered may be worth discussing with a clinician."*
  - *"Your {marker} entry of {value} {unit} ({date}) is within the reference range you entered. The evidence behind the {grade} grade for {effect} comes from studies that enrolled {inclusionCriterion} ({paperLabels}); the app cannot determine whether it applies to you."*
- **2 Real product catalog** (U13, XL, live; P-07's append-only and label-verification terms apply). **3 Accessibility half** (U14b). **4 Longitudinal intelligence** (U14c, XL). **5 §7 capabilities:** none, or name them one by one.
- **(e) The five OUT moves** (FU-33, FU-38, FU-40, N-22, N-25): confirm each, or move it back IN (P-16).

**Size estimate (the review's, verbatim), bearing on D-3:**

| Size | Units |
|---|---|
| S | U2, U9, U12, U18; U8 (b/c); U6 (a/d); U13 statement; U17 (b/c) |
| M | U3, U4, U7, U10, U14a, U16 (FU-29 a); U5 (a–c); U6 (b); U8 (a) |
| L | U1 (five guards, five red proofs); U6 (c, retiring); U16 (live); U17 (a); U14b (M–L) |
| XL | U5 (d, 135 dimensions); U13 catalog; U14c; U15 (L–XL) |

**Is 18 units one phase?** Only if D-3 admits little. With the catalog, U14c and U15 all admitted, it is several phases of Phase 2's size. **Smaller-phase options (the review's, verbatim), offered alongside the per-candidate choice:**
- **A. Carried correctness:** U1–U4, U9, U10, U12, U18, plus D-4 (X7) and D-9 (b/c) for X2. This meets the criteria without product work: a "Phase 4a" that leaves the objective unmet (P-19).
- **B. Trust-layer follow-through:** U5–U8, plus U2 for FU-63. Content work, owner batches, $0 of network calls.
- **C. Product candidates:** U14a first, then the U13 catalog, U14b and U14c as admitted. The largest value and the largest safety surface (P-06, P-07).
- **D. Operational readiness:** U15–U17. This matches D-7(b), a new roadmap phase.

### D-4 — N-50: the API's voice on 404 (rewritten at (c) on P-02)
**What ships today:** `notFound(what)` renders *"`<What>` not found."* at **15** route sites (Stack 8 · Stack item 4 · Conversation 2 · Action 1). Each is uniform within its route across the ownership boundary, guarded per route by `NOT_FOUND_UNIFORMITY`, whose own header (`not-found-uniformity.test.ts:13-18`) leaves the API-wide question to N-50. A malformed id has answered 400 since U30 (N-51, `stacks/[id]/route.test.ts:194`). **N-50's question:** is a resource-named 404 the product's voice, or should the API speak one 404?
- **(a) Status quo, recorded as the product's voice.** *No code change; U11 is a record. The owner's 2026-09-11 ruling found no security property in flattening: rule 13 governs internal error text, and a single-resource route has no oracle.*
- **(b) One API-wide 404 message** at all 15 sites. *The owner's 2026-09-11 ruling called this "a product-wide UX regression bought for no security property". Choosing it reverses that reasoning, and the record should say why.*
- **(c) The service sub-question, independent of (a)/(b):** `advisor-actions.ts:80,88,95` (`Stack not found.` and two `Supplement "<id>" not found.`, which echo a caller-supplied id). (i) Keep: an echo of public reference data. (ii) Stop echoing the id. (iii) Align with whatever (a)/(b) chooses.

### D-5 — FU-68: fish-oil-cardiovascular
- **(a)** Rename to what the evidence measures (triglyceride lowering); keep the grade and the id. **(b)** Keep the name and re-score against the clinical outcome. *Both cited papers concern triglycerides, so this likely needs live sourcing, and the grade likely falls.* **(c)** Split: a new surrogate effect (a manifest `add`) plus the clinical one re-scored. *Live if new papers are sourced. Deployed-DB if the old id is retired* (migration over `advisor_messages.citations[].refId`). **(d)** Keep, and add a qualifier sentence bound to the profile. *The name still over-claims.*

### D-6 — FU-72: how re-verification runs between closeouts
- **(a) A scheduled CI workflow** with network, not required. *Automatic. It puts a network dependency in CI. **It can only report.** Refreshing `verifiedOn` or attesting `verifiedBy: owner` would need a bot commit, which §10 rule 5 forbids, so the owner commits (P-14).*
- **(b) An owner-run script on a fixed cadence**, with a dated `docs/05-qa/` record. *No CI network; nothing enforces the calendar.*
- **(c) Phase-closeout trigger only** (today's policy). *The E1-R2b window stays phase-length.*
- **(d) An offline cadence guard:** CI fails when the newest dated re-verification record is older than N days. *No network. Enforces (b)'s calendar.*

### D-7 — The logging-sink cluster (N-11, N-40, FU-41, FU-43, FU-44)
Five rows name *"the next operational phase"*, which the roadmap does not contain.
- **(a) In Phase 4 (U15):** a sink. *A new external integration: threat review, account, possible spend. Health data is redacted first (§2.3 rule 15).*
- **(b) A new roadmap phase for operational readiness.** *A roadmap edit, so **D-11** governs whether a unit may make it (P-15).*
- **(c) Stay deferred.** *The rows go on naming a phase that does not exist (the N-11 shape).*
- **(d) Sink-less redaction** on today's `console.error` path. *Narrows N-40/FU-41 with no third party, spend or account. N-11, FU-43 and FU-44 stay open.*

### D-8 — Deployed-database work (FU-29, FU-57)
- **FU-29:** (a) mapper validation only (det, carries FU-17) · (b) plus CHECK constraints (live, OP row) · (c) out.
- **FU-57:** (a) keep the uncited row · (b) tombstone plus a migration over `advisor_messages.citations[].refId` (live, OP row).

### D-9 — `[P4-X2]` and `db/seed.ts` (the one **X**)
`project-status.md:474` gives **no written basis** for the X (P-20). The owner is asked to write one, or to accept (b)'s argument against it.
- **(a) Build per-worker isolation (FU-25).** *The service-role key is used locally and owner-run, confined per §2.3 rule 14. Email rate limits are the documented obstacle. The full live suite makes **OpenAI calls** (the advisor specs need `OPENAI_*`) unless those specs are excluded.*
- **(b) Reclassify with a written reason:** a dev/test fixture, not a product subsystem. *It must be argued against §8 rule 2.*
- **(c) Re-scope the criterion** to production subsystems. *A roadmap edit (D-11).*

### D-10 — Three either/or hygiene items (U18)
- **FU-66:** keep the build-time fetch (G keeps its one network call) · self-host with `next/font/local` (one download; permission and a licence check).
- **FU-50:** remove `@vitejs/plugin-react` · keep it with a written reason. **FU-36:** rename `ClaudeAdapter` (opens `src/types/`) · accept the name with the reason recorded.

### D-11 — May a unit edit the roadmap?
- **(a)** Insert `[P4-X1]`…`[P4-X3]` at approval · **(b)** also backfill `[P3-X1]`…`[P3-X5]` · **(c)** no roadmap edit: parity stays absent, U1 ships without it, and U3's roadmap path references stay stale.

### D-12 — Opening Phase 4 against the roadmap's ordering rule (rewritten at (c) on P-08)
The rule, quoted exactly. `:14-15`: *"a later phase may not start while an earlier phase's exit criteria are unmet."* `:650-651`: *"Do not start a later phase while an earlier phase has unmet exit criteria. If pressure demands it, record the exception in this file with a reason — do not proceed silently."* **Only one box bears on it:** Phase 1's `[~]` live-E2E criterion (`:319`). Phase 0's `:179` box is stale, not unmet, and **N-86 corrects it under every option below**, together with the stale U-DEFER-4 text. **No dated exception exists for Phase 1's `[~]`.** The one at `:183` is Phase 0's and ended at U0 (`:520`), so Phases 2 and 3 opened against the `[~]` with no record.
- **(a) Record, for the first time, a dated exception** in the roadmap, with its reason, at the approval landing. *Live-E2E status stays `[~]` PARTIAL, now recorded.*
- **(b) Proceed with no record, as Phases 2 and 3 did.** *This is the silent proceeding `:650-651` forbids. Status stays `[~]` with no record.*
- **(c) Hold Phase 4 until the criterion is met.** *The blocker is **scheduling an owner-run live run** (ruling 3, `:265`), not credentials in CI. Ruling 5 retired "reproducible in CI" (`:320-322`). A live run calls OpenAI and writes to the demo account (spend, §7). Status → `[x]` when the run lands.*
- **(d) An owner-run live baseline before approval**, which meets the criterion. *Same spend as (c), with no hold if it is scheduled first. Status → `[x]` with a dated record.*
- **(e) Reword or retire the live half by a recorded ruling**, as Phase 2's decision 5 did. *No spend. Status → met as reworded. The live half becomes a standing owner-run obligation or is retired.*

### D-13 — The id-manifest move (new at (c), P-03)
`project-status.md` registers the move as a **candidate**. The manifest is the ledger behind rank-1 §2.4 rule 16.
- **(a) In, to `content/`** (e.g. `content/id-manifest.json`), as U3 specifies. *Makes `[P3-X5]`'s caveat obsolete. Needs owner review of the append-only policy. Makes 4 roadmap references stale (D-11).*
- **(b) In, to another location** the owner names. *Same terms.*
- **(c) Out.** *The manifest stays at `src/data/`; `[P4-X8]` is withdrawn; the `[P3-X5]` caveat stays recorded; N-47's trigger does not fire.*

### D-14 — What U10 renders for `PARTIALLY_APPLIED` (new at (c), P-12)
U34 ruled that *"ONLY NUMBERS CROSS THE BOUNDARY"* (`advisor-actions.ts:145-150`).
- **(a) Render the counts** (`reverted`, `unreverted`) with a sentence. *U34's ruling stands.*
- **(b) Reopen U34's ruling:** return the unreverted item ids, restricted to `remove_item`/`edit_item`. `reason` and `notes` only after explicit sign-off (§2.3 rule 15, per FU-34's text). *More useful; widens what crosses the boundary.*
- **(c) A generic sentence, no counts.** *Least disclosure; least useful.*

### D-15 — What G contains, and who reads CI (new at (c), P-18)
- **(a) Add `npm run test:coverage` and `npm run verify:migrations` to G.** *Every unit then needs a local Postgres.*
- **(b) Add `test:coverage` only.** `verify:migrations` gates U16 alone, locally or through CI's run.
- **(c) Keep G as is; both are read from the unit's branch CI run.** *Needs `gh` or the owner to read CI.*
- **And for X3's "continuously":** the owner reads `gh run list` at closeout · or the runner may make that one read-only `gh` call.

### D-16 — What the account export says about paper labels (new at (c), P-10)
- **(a) Current label at export,** as the chip resolves at render. *Consistent with the UI; the export no longer records what the user was shown.*
- **(b) Stored label, as shown at the time**, with the current label beside it. *Most faithful; a larger payload and new copy.*
- **(c) Stored label only**, as today, with a note that labels may have been corrected since. *No resolution logic.*

---

## 7. Spend and typing

**This draft performs no spend and authorises none.** OP numbers are allocated only when an option that opens one is chosen, starting at **OP-8**. This draft issues none.

| Unit × option | Why live | Deployed DB | Expected calls / cost | OP row |
|---|---|---|---|---|
| **U7** | PubMed / Crossref lookups, 2 effects | no | on the order of Phase 3 U4 (37 calls), **$0** | none (public APIs) |
| **U8 × D-6 (a)/(b)** | re-resolve every fixture entry | no | **37**/run plus U7's additions, **$0** | (a) opens one: CI egress · (b) none |
| **U8 × D-6 (c)/(d)** | not live | no | none | none |
| **U5 × D-2 (d)** | re-fetch abstracts wherever the gitignored local copies are absent | no | ≤ 38 lookups, **$0** | none |
| **U6 × D-5 (b)/(c)** | new clinical-outcome papers sourced | only (c) retiring the id | ~U7's scale, **$0**; one deployed write if retiring | one if retiring |
| **U13 × catalog** | label data sourcing | **yes, if any of the 21 seeded ids is retired** | unknown until scoped; **$0** lookups | **one** |
| **U14c × item 4** | if it adds tables | possibly | one per migration | one if migrating |
| **U15 × D-7 (a)** | an external log sink | no | account cost unknown | **one** (account-held) |
| **U16 × D-8 live options** | deployed migrations | **yes** | one per migration | **one** |
| **U17 × D-9 (a)** | seeding per-worker users; the full live suite | **yes** (users seeded) | owner-run; **OpenAI** calls if the advisor specs run | **one** |
| **D-12 (c)/(d)** | an owner-run live E2E run | writes via the demo account | **OpenAI** calls | one if the owner wants the spend recorded |
| **U18 × D-10 font** | one font download | no | 1 | none |
| **every unit × D-1 (b)/(c)** | G's font fetch, permitted and pre-existing | no | 1 per `next build` | none |

**OpenAI calls occur only on the owner-run paths above:** U17 × D-9 (a) with the advisor specs included, and D-12 (c)/(d). Each is owner-run, with a dated record. Every other unit makes none, and a unit that finds it needs one stops.

---

## 8. Appendix — claims checked, withdrawn and corrected

| Claim, as found | Status after checking |
|---|---|
| Roadmap Phase 0: U-DEFER-4 *"Unmet"* (`:179`) | **WITHDRAWN as a fact:** met since U0, closed in full by U10. **N-86**, corrected under every D-12 option |
| Roadmap item 1: *"a `populationRelevance` seam that exists for only 8 of 27"* · item 3 | **STALE:** 27/27 profiled. Item 3's component-test half was delivered early (17 of 17); only accessibility remains |
| *"Doc guards accept the new plan"* | **True and vacuous:** no spec reads `docs/01-plan/phase-4-*` |
| N-22 as an open advisor question | **Moot:** withdrawn 2026-08-10; the gateway was retired at U31 |
| (a) §2 ceiling *"OP-7"* beside a command printing 8 · §3 *"72 ids"* | **Corrected at (a):** two ceiling rows · 66 under (a)'s boundary. **Superseded at (c):** the source is the issued range, 164 |
| (a) §3's source set, three sections, 66 ids | **WITHDRAWN at (c) (P-01):** it missed 13 open Phase 2 rows and 15 open Phase 1 rows |
| (a) D-4's options (b) and (c) | **WITHDRAWN (P-02):** both already ship; rewritten |
| (a) N-50's *"fourteen route sites"* (register text) · the review's *"14"* | **Corrected: 15** by §2's command (Stack 8 · Stack item 4 · Conversation 2 · Action 1) |
| (a) U3's *"diff shows no `src/` path"* | **WITHDRAWN (P-03):** unsatisfiable; restated as *no hand-edited `src/` path* |
| (a) U4 *"scans `"use server"` modules"* | **WITHDRAWN (P-04):** already walked; the taint model is the gap |
| (a) U2 *"zero callers"* | **Corrected (P-10):** zero *non-test* callers; test callers at `safety.test.ts:36,38,39` |
| (a) D-2 *"re-derives all 27 automatically"* | **WITHDRAWN (P-13):** G4b reddens, and letters are hand-updated |
| (a) D-12 *"extend Phase 1's dated exception"* · *"needs credentials"* | **WITHDRAWN (P-08):** no such exception exists; the blocker is scheduling and spend |
| (a) *"No OpenAI call is planned in any unit"* | **Made conditional (P-09):** §7 names the paths |
| (a) §2: *"coverage floors deliberately not re-derived"* | **Re-derived (P-18):** 17 over 23 |
| Review: *"Size them at start"* at `roadmap.md:647` | **Corrected: `:649`** (`grep -n 'Size them at start' docs/roadmap.md`) |
| Review P-02 *"14"*, P-07 `:612`, P-08 `:299-300`, P-18 *"14"* | Corrected by the clerk before recording: 15 · `:606` · `:265` · 17. **Each re-derived here by command** |
| (a) residue count *"5"*; the review's *"6"* | **Corrected: 11** named (§3) |

---

## 9. Disposition of the (b) review — P-01…P-20

| Finding | Disposition |
|---|---|
| P-01 | ADDRESSED `:49-112`. §3's source is now the issued range, 164 ids; the command is at `:51-57`, with `comm` empty (cycle artifact (c)). Every open row gets a position. The review's seven: N-47 → U3 `:76` · N-15 → U10 `:84` · N-26 → U4 `:73` · N-41 → OUT via U9 `:80` · N-32 → U12 `:83` · N-12 → U2 `:70` · N-35 → OUT for X2 `:71`. The other six: N-36 `:88` · N-37 `:95` · N-18, N-30, N-45 `:97` · N-43 `:98`. Also 15 open Phase 1 rows: 12 at `:99`, plus FU-17 `:82`, FU-1 `:84`, FU-18 `:96`; F7 at `:100` |
| P-02 | ADDRESSED `:210-214`. D-4 rewritten from the tree. It cites the 15 sites and names N-51's 400 and `NOT_FOUND_UNIFORMITY`'s header as shipped behaviour. It quotes the owner's 2026-09-11 remark and makes the service literals a separate sub-question. U11 restated at `:134` |
| P-03 | ADDRESSED. U3's red proof (ii) is stated precisely at `:126`: the GENERATED line-1 header plus CONTENT_FIDELITY. **New D-13** is at `:257-261`. U3 is conditional and carries an owner batch for the append-only policy. The roadmap's `:45`, `:441`, `:553` and `:569` references and N-47 are named (`:76`, `:126`). `[P4-X8]` is conditional (`:156`) |
| P-04 | ADDRESSED `:127`. U4 targets the taint model (a destructured Supabase `{ error }`), not the scan scope. HEAD's `:27` and `:44` are the red case. The login and signup copy is an owner-review item |
| P-05 | ADDRESSED `:164-177`. All eight points, and the brief's list, are specified in the runner specification (`:169-177`). "Guard weakened" is defined by diff, and includes sweep narrowing (`:171`). The font fetch is permitted as pre-existing behaviour (FU-66) at `:8` and `:172`. Options (a)–(c) remain unanswered |
| P-06 | ADDRESSED. The compliance requirements are at `:189`, with two draft lines for later review at `:190-191` (not answered). U14a's gate names §2.1 rules 1, 4, 6 and §2.2 rules 7, 9, 10, plus SC-4 and SC-11, and U14a is revision only unless amended. U14c gets its rule-4 and rule-9 checks and a placed disclaimer (`:137`) |
| P-07 | ADDRESSED. U13's catalog path is typed live, with deployed DB and an OP row if an id is retired. It is append-only, with label verification and owner batches (`:136`). The §7 row is at `:293` |
| P-08 | ADDRESSED `:249-255`. The rule is quoted exactly (`:14-15`, `:650-651`). There is no Phase 1 exception to extend, so (a) records one for the first time. (c)'s blocker is restated with its spend. Two options are added, (d) and (e), and each option states its effect on the live-E2E status. N-86 is independent, and widened to the stale U-DEFER-4 text (`:106`) |
| P-09 | ADDRESSED `:282-302`. The typing matrix covers every combination the review flagged. The OpenAI statement is now conditional (`:302`). U8 × D-6 (c) is retyped as none (`:131`, `:290`) |
| P-10 | ADDRESSED. The owner-batch column is corrected for U2, U3, U4, U9 and U14b (`:125-137`). U2's proof now reads zero *non-test* callers, and its sweep edit is named (`:125`). D-1 (c)'s list is re-derived, adding U15 × D-7 (d) and limiting U18 to branches that hit no stop class (`:167`). U9's label question is **new D-16** (`:275-278`) |
| P-11 | ADDRESSED. §4 has a Size column, per unit and per option (`:124-141`; U8's covers D-6 (a)–(d)). The review's estimate and its options sit in D-3 (`:195-208`) |
| P-12 | ADDRESSED. **New D-14** (`:263-267`) cites U34's boundary. U10 renders whatever D-14 chooses (`:133`) |
| P-13 | ADDRESSED `:180`. The framing is corrected: G4b reddens, and moved letters are hand-updated. Each option states its effect on persisted chips (`:181-184`) |
| P-14 | ADDRESSED `:219-223`. (d) is added as the offline cadence guard, and (a)'s write-back consequence is stated |
| P-15 | ADDRESSED `:225-230`. (d) is added as sink-less redaction, and (b) is cross-referenced to D-11 |
| P-16 | ADDRESSED. The five OUT moves are marked *owner to confirm* (`:112`) and put to D-3 (e) (`:193`). The parity row is conditional on D-11 (`:63`) |
| P-17 | ADDRESSED `:91`. Both conditions are quoted, and the row states that neither U10 nor U16 fires them |
| P-18 | ADDRESSED. **New D-15** (`:269-273`). X3's *"all engines"* reading is printed as 17 floors over 23 directories (`:40`, `:151`). The `gh` call is named as network |
| P-19 | ADDRESSED `:18`. "Feature" is defined and the vacuous case stated. `[P4-X5]` refers to both (`:153`) |
| P-20 | ADDRESSED. D-9 asks the owner for the X's basis (`:237`, `:36`). U17 (a) names the key-confinement constraint (`:140`). The residue count is restated as 11 (`:59`) |
