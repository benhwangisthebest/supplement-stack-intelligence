# Phase 3 — Evidence grounding (the trust layer)

> **STATUS: DRAFT — AWAITING OWNER APPROVAL.** **A Draft outranks nothing** (`CLAUDE.md` §6: rank 5 is *an approved* plan).
> **Nothing here authorises work.** No unit may start and no guard may be written or relaxed until this file carries an APPROVED status line.
>
> **Base SHA `c4460c7`** · authored 2026-09-22 · **revised at landing (c) against `52e00d9`** on the (b) review `docs/reviews/phase-3-plan-review.md` (P-01…P-17, verdict **REVISE**); **§10 disposes of every item.** Sequenced by `docs/roadmap.md` §Phase 3 (L492–556). Cycle artifact: `docs/01-plan/features/phase3-plan.plan.md`.
>
> **Every §2 figure was re-derived by the command printed beside it** — at `c4460c7` when authored, **again at `52e00d9`** at (c). No number is carried from the roadmap, the Phase 2 report, `project-status.md`, **or the (b) review**. **Three figures did not survive re-derivation** and are corrected in §9 — one of them a §2 figure (the mean), one §7's id total, one the review's own.
>
> **Verification and approval discipline.** **Every unit gates on all four of `CLAUDE.md` §5 rule 10: `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build`** — stated once here and repeated as a **Gate:** line on every unit in §4. **Commit, push, merge, tag and branch deletion each require explicit owner approval every time** (§10 rule 5); approval of one never carries to the next.

---

## 1. Objective, and the one sentence that constrains it

**Make the Library's central claim true.** Today **19 of 27** effect grades are hand-typed letters with no derivation, and the `Paper` type carries **no provenance at all** — by construction, not omission.

**The constraint shaping every unit:** v13 removed provenance because a *required* `link: string` with no real source left fabrication as the only way to satisfy the type (`CLAUDE.md` §8 rule 4). Phase 3 brings provenance back, so **it has to relax the exact control that removed it** — the most dangerous act in this phase. §3 is about nothing else.

**What this is not.** Not a content plan: no unit decides what any grade should be. It builds the apparatus that makes a grade *derivable* and a citation *checkable*, and says who decides. **This plan decides how citations get verified; it verifies none** (§8).

---

## 2. Baseline, re-derived at `c4460c7` and again at `52e00d9`

Seed figures come from one scratch script run as `npx tsx --tsconfig tsconfig.json <script>`, importing `@/data/seed-effects` as `E` and `@/data/seed-papers` as `P` — it reads the real modules rather than grepping them, because a nested key can be counted twice by a grep and was. **Every row prints a runnable command, not a description of one** (P-10).

| Figure | Value | Command |
|---|---|---|
| Effects total | **27** | `E.length` |
| …with `evidenceProfile` | **8** | `E.filter(e => e.evidenceProfile).length` |
| …hand-typed grade, no profile | **19** | `E.filter(e => !e.evidenceProfile).length` — roadmap's 19/27 **holds** |
| Grade A total | **8** | `E.filter(e => e.grade === "A").length` |
| …Grade A **without** a profile | **4** | `E.filter(e => e.grade==="A" && !e.evidenceProfile).map(e => e.id)` → `zinc-deficiency`, `vitamin-b12-deficiency`, `caffeine-training`, `protein-powder-training` |
| Grade distribution | **A 8 · B 9 · C 10** | `E.reduce((a,e) => ({...a,[e.grade]:(a[e.grade]??0)+1}),{})` |
| Effects citing **zero** papers | **3** | `E.filter(e => (e.paperIds??[]).length===0).map(e => e.id)` → `magnesium-metabolic`, `creatine-recovery`, `fish-oil-longevity` |
| Mean `paperIds` per effect | **0.8889** | `E.flatMap(e => e.paperIds??[]).length / E.length` |
| Papers total | **20** | `P.length` |
| Papers cited by no effect | **0** | `P.filter(p => !E.flatMap(e => e.paperIds??[]).includes(p.id)).length` |
| **Unresolved `paperIds`** | **0** effect-level · **0** dimension-level | `refs.filter(r => !new Set(P.map(p=>p.id)).has(r)).length`, over each ref set — see (a) |
| Profile dimensions total | **40** | `E.filter(e=>e.evidenceProfile).flatMap(e => Object.values(e.evidenceProfile.dimensions)).length` |
| …dimensions citing **no** paper | **9** | same, `.filter(d => d.paperIds.length===0).length` |
| Supplements covered | **15** | `new Set(E.map(e => e.supplementId)).size` |
| **`Paper` provenance keys** | **ZERO** | `Object.keys(P[0]).join(", ")` → `id, title, population, intervention, dose, duration, outcomes, limitations, summary`; `P.every(p => Object.keys(p).length === 9)` → `true`. Declared at `src/types/paper.ts:11-21` |
| Client components importing `@/lib`/`@/data` | **8 of 31** | `git ls-files 'src/components/**' \| xargs grep -l '"use client"'` → **31**; pipe through `xargs grep -lE 'from "@/(lib\|data)/'` → **8**. §4 rule 7, unenforced |
| Unit tests | **1446 / 114 files** | `npx vitest run` |
| Lint scope | **369 of 369, 0 errors** | `npm run lint` |
| Architecture specs | **27** | `git ls-files 'src/architecture/*.test.ts' \| wc -l` (bound by `SPEC_COUNT`) |
| Bundle — `/library` | **1.18 kB · 110 kB First Load** | `npx next build` — table below |
| Bundle — `/library/[slug]` | **1.62 kB · 111 kB First Load** (`●` SSG, 15 paths) | `npx next build` |
| Bundle — shared by all | **105 kB** | `npx next build` |

**The three bundle rows have no cheap check and D-5 is set against them (P-17).** No other document records them, so there is no cross-check short of a multi-minute build. Recorded verbatim from `npx next build` at `52e00d9`; **checking this table in is U8's first deliverable**, so the baseline stops depending on a build nobody reruns:

```
Route (app)                     Size  First Load JS
├ ○ /library                 1.18 kB         110 kB
├ ● /library/[slug]          1.62 kB         111 kB   (15 paths)
+ First Load JS shared by all                 105 kB
```

**(a) The roadmap's Testing requirement *"every `paperIds` entry resolves"* is already satisfied — 0 unresolved at both levels.** A guard for it lands green and proves nothing unless mutation-checked against a planted dangling id (§5 rule 2). **Owner U2, criterion `[P3-X8]`** — not left as a paragraph (P-06).

**(b) "100% of citations carry a verified DOI/PMID" is not a gap to close — it is a field that does not exist.** There are no DOIs to verify. The work introduces the field, the verification and the record together, in that order. Framing item 1 as "fill in the missing DOIs" mis-sizes it.

**Prerequisite checked, not assumed.** `src/data/id-manifest.json` is version **2**, covering `effects` (27), `papers` (20), `supplements` (15), `products` (21), `biomarkers` (13), `biomarkerRelevanceRules` (15), `interactionRules` (30), `sideEffectLabels` (18), `outcomeCategories` (11), `supplementSlugs` (15), with an `add/remove/rename/merge/split/resurrect` policy requiring a tombstone and `supersededBy`. **`[P2-X6]` covers content IDs; the roadmap's prerequisite holds.**

**Where ids actually persist — the fact §4's liveness test turns on.** The manifest puts `papers` and `effects` at **`advisor_messages.citations[].refId`** (`kind='paper'` / `kind='effect-grade'`, migration 0003, jsonb); only `supplements` lists `stack_items`. The roadmap's *"a data migration for existing `stack_items`"* (L538–539) therefore **names the wrong table for exactly the ids Phase 3 touches.**

---

## 3. The central tension, and three findings

**Roadmap item 1:** *"Provenance returns to the `Paper` type **only** alongside a verification mechanism."*

**There are two controls in the way, not one** — the draft named only the first (P-09):

1. **G2, `src/data/seed-integrity.test.ts:48-57`** — no seed paper may carry any key in `FORBIDDEN_PAPER_KEYS = ["authors","journal","year","link","sampleSize","studyType"]` (`:20-27`).
2. **`paperSchema`, `src/lib/validation/seed.ts:56-65`** — a **non-strict** `z.object` whose own header (`:50-55`) calls it *"the SECOND mechanism compelling fabrication"* and warns *"TypeScript could not catch this one … keep the two in step by hand."*

Phase 3 must change G2 from ***no provenance field*** to ***no provenance field without a verification record*** — a strictly weaker guard, and weakening a rank-1-adjacent control is the act this project has most reason to distrust. That is **D-3**, not decided here.

> ### N-80 — G2 does not forbid the two fields Phase 3 intends to add
> **[2026-09-22]** `FORBIDDEN_PAPER_KEYS` lists the six fields v13 deleted. **It does not list `doi` or `pmid`.** Adding either to `Paper` today reddens nothing: `tsc` accepts a new optional field and G2 inspects only those six names. **The guard that exists to make provenance unauthorable does not cover the two fields the next phase will reintroduce** — a gap in the guard's *enumeration*, the ratchet-vs-derived distinction `PAID_API_BUDGET` was rebuilt to avoid. **Evidence:** `seed-integrity.test.ts:20-27`, `:48-57`; `src/types/paper.ts:11-21`.
> **Disposition: OPEN, deliberately not fixed here** — closing it before D-3 is ruled would choose D-3 by implementation. **Owner U5, after D-3.** **[(c), widened on P-09 i]** The fix is **not G2 alone**: `paperSchema` must gain the same field **and** a conformance assertion against `Paper` (`CLAUDE.md` §4 rule 2's pattern), or a `doi` the type accepts is silently dropped by validation.

> ### N-81 — `paperSchema` has no conformance assertion against the `Paper` type
> **[2026-09-22, landing (c)]** Registered from P-09 (i); number re-derived by command (`grep -oE "N-[0-9]+" docs/01-plan/phase-2-operational-dependability.plan.md | sort -t- -k2 -n | tail -1` → **N-79**, the closed register's highest, plus this plan's own **N-80**. A docs-wide grep is NOT re-runnable here: it now returns 81, because this allocation is itself tracked). A Zod schema is a runtime structure `tsc` cannot cross-check against an interface. `paperSchema` is non-strict, has exactly **two** references — its definition and one `safeParse` (`seed.ts:94`) — and **no test asserts the two stay in step**, which is precisely what its header asks a human to do by hand. The v13 lesson is that a control depending on someone remembering is not a control.
> **Disposition: OPEN — owner U5, with N-80, after D-3**, because its fix is D-3's shape.

> ### FU-48 — G1 walks only `src/`, and only `.ts|.tsx`
> **[2026-09-22, landing (c)]** Registered from P-09 (ii); number re-derived the same way (`grep -oE "FU-[0-9]+" <the Phase 2 register> | sort -t- -k2 -n | tail -1` → **FU-47**). The roadmap requires *retaining* the no-placeholder-domains guard. G1 builds its file set from `SRC_ROOT = path.resolve(__dirname, "..")` (`seed-integrity.test.ts:14`) filtered by `/\.(ts|tsx)$/` (`:33`). **Content authored as `content/*.yaml` or `*.json` is outside both filters** — so D-2's answer can move the corpus out from under the guard without reddening anything.
> **Disposition: OPEN — owner U2, conditional on D-2.** U2 re-points G1's root and extension filter at wherever D-2 puts the corpus **and proves it red** against a planted placeholder host in the new format. A follow-up rather than a finding because no violation exists today; it goes live the moment D-2 is ruled for a non-`src/`, non-TypeScript home.

---

## 4. Units

**Liveness test, corrected at (c) (P-02).** A unit is **live** if it needs the network, the deployed database, an OpenAI call, **or a data migration over *any* surface `id-manifest.json` lists in `persistedAt`** — for papers and effects that is `advisor_messages.citations[].refId`, **not** `stack_items`. The draft's `stack_items`-only test would have typed a dropped-paper migration as deterministic. Every live unit carries a spend line.

**Red-evidence obligation (P-05; roadmap Testing *"Mutation-check each guard"*).** **Every unit shipping a guard must record it going red against the specific bug it targets, before the fix.** Bound as `[P3-X7]`; Phase 1's report carries such a record as an exit criterion and is the precedent. Each unit names its own red proof.

**Ordering is a claim, not a convenience.** U1 and U2 come first because the roadmap requires codegen to be provably output-identical *before* any content lands on it (L536–538): a content change merged before the identity proof makes the proof unavailable forever, because no pre-migration corpus remains to compare against.

| Unit | Type | Closes |
|---|---|---|
| **U1** Codegen skeleton + byte-identity harness | deterministic | `[P3-X3]` (half) |
| **U2** Corpus migrated to the authored format | deterministic | `[P3-X3]`, `[P3-X5]`, `[P3-X8]`, **FU-48** |
| **U3** Grade derives from profile; a typed grade fails the build | deterministic | `[P3-X1]` (mechanism) |
| **U4** The 19 absent profiles authored | deterministic | `[P3-X1]` (content) |
| **U5** Provenance returns behind a verification record | deterministic | `[P3-X2]` (mechanism), **N-80**, **N-81** |
| **U6** The corpus verified against real DOI/PMID | **live** | `[P3-X2]` (content), `[P3-X6]` |
| **U7** Coverage honesty across the four surfaces | deterministic | `[P3-X4]` — **blocked on D-1** |
| **U8** Injection seam + bundle-size assertion | deterministic | roadmap item 5 |

**`[P3-X7]` is deliberately absent from the Closes column**: it binds **U1, U2, U3, U4, U5, U7 and U8** — every unit shipping a guard — so listing it seven times would read as seven obligations rather than one. **U6 is the sole exclusion**, and not an oversight: its red proof exercises *U5's* guard rather than shipping one of its own.

**U1 — codegen skeleton and the identity proof.** Build-time codegen emitting the existing `SEED_*` constants from an authored source, plus a check asserting the emitted TypeScript is **byte-identical** to `src/data/` today. **No content moves.** The authored source is generated *from* the current modules, so the round trip is provable. **The guard is the deliverable**, not the generator: a codegen whose output is merely *equivalent* is what lets a silent content change ride in on a mechanical migration. **Red proof:** perturb one emitted byte (a trailing comma, a reordered key) and show the harness fails.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus this unit's red proof, recorded.

**U2 — the corpus migrates.** **Scope is the nine `SEED_*` modules** — `seed-{biomarker-relevance,biomarkers,effects,food-pairings,interactions,papers,products,side-effects,supplements}.ts` — **and nothing else** (P-07). **Carved out, staying hand-edited inside `src/`:** `id-manifest.json`, the *independent checked-in* ledger `id-stability.test.ts:12-15` exists to be (*"a test that derives its expectation from the same array it validates cannot detect a rename"*) — generating it destroys the property it holds; `id-stability.test.ts` and `seed-integrity.test.ts`, the guards themselves; and `medication-aliases.ts`, a tenth data module that is not a `SEED_*` constant. `src/data/` holds **13** tracked files (`git ls-files src/data/ | wc -l`), so *"`src/data/` becomes generated"* read literally is wrong three ways. **Mitigating and verified:** `boundaries.test.ts:147` pins `"src/data": 8` in `LAYER_FLOORS` (10 non-test `.ts` today), so a gitignoring variant reddens rather than eroding silently. **Engines, seams and types untouched** (roadmap item 3); **content does not move into Postgres** — seed-as-code is right for read-only reference data; the shortcut is the authoring format. **Also owns:** the **`paperIds`-resolution guard** re-pointed at the authored source (P-06), and **FU-48**'s re-pointing of G1 (P-09 ii). **Red proof — three, all required:** a planted **dangling `paperId`** reddens the resolution guard; a planted **placeholder host in the new format** reddens G1; a hand edit to a *generated* file reddens the identity harness.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus all three red proofs, recorded.

**U3 — the grade becomes derived.** `Effect.grade` stops being authorable where a profile exists, and a grade without a profile becomes a build failure. **Lands before U4 deliberately:** the guard must be red against the 19 before they are written, the only moment its redness is cheaply observable. Expect U3 to ship with the guard scoped to a shrink-only allowlist of those 19, and U4 to empty it. **Red proof:** red against all **19** on the day it lands; record the failure output.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the 19-wide red output, recorded.

**U4 — the 19 profiles. This unit authors 190 new content elements on the trust surface and must be sized as such (P-04).** Each of the 19 effects needs a `DimensionScore { score, rationale, paperIds }` for **5** dimensions (`src/types/evidence-grading.ts:15-21, 27-31`) — **95 `rationale` strings and 95 `paperIds` lists**. The draft typed this as *"authoring no new claim"*; the grades pre-exist, the rationales do not.

- **Sourcing rule, non-negotiable:** a `rationale` states what the cited papers show and nothing else. **No rationale may be written from model recall** (`CLAUDE.md` §2.2 rule 8 — the same rank-1 rule D-3 turns on). A dimension whose papers do not support a sentence gets a *shorter* sentence.
- **An empty `paperIds` is a correct answer, not a hole to fill.** **9 of 40** existing dimensions already cite nothing, and the corpus holds 20 papers against 24 effect-level citations, so many of the 95 new lists have no paper available. **An honestly-empty list is acceptable and must render as such**; a list populated to look complete is the v13 failure in a new field.
- **Authorship is an owner decision**, not an implementation detail. The plan does not assume an agent authors these; whoever does, the rule above binds them.
- **Safety-vocabulary sweep — a gap, stated:** `grep -rn "containsBannedPhrase\|BANNED_PHRASES" src/` outside `src/lib/safety/` returns **only an advisor test**. **Nothing sweeps seed text**, and 95 new rendered strings on the Library is where that starts to matter (`CLAUDE.md` §2.1 rule 6). **U4 ships one over seed rationales**, red-proved with a planted banned phrase — or the owner records why not.
- **A grade change is a behaviour change in five engines, not a Library display change (P-14).** `.grade` is read by `stack-evaluator/rules.ts:93-94,122` (flag suppression, evidence level), `protocol-builder/index.ts:93-110` and `rules.ts:131` (tiering, ordering), `identity/{traits.ts:60, supplement-archetypes.ts:35, index.ts:54-56}`, `advisor/tools.ts:73,114,170` and `actions/proposals.ts:57,247,252`. **Their fixtures must be re-derived**, and persisted `kind='effect-grade'` citations mean **an old advisor message's prose can outlive the grade its citation now resolves to** — U4 must say what happens to those rows before changing a letter.
- **Ordering against U6 (P-04, secondary):** U4's `paperIds` may only cite papers U6 has verified, so either U6 precedes U4 for the cited subset, or U4 re-runs after U6 with its citations re-checked. **Which, depends on D-6.** Not settled here.
- The **4 Grade A effects without profiles** are the highest-risk rows and should be sequenced first.

**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the sweep's red proof and the re-derived engine fixtures, recorded.

**U5 — provenance behind a record.** `Paper` regains a provenance field **only** in the shape D-3 rules, with the guard that makes an unverified one red. **Closes N-80 and N-81** — G2's enumeration *and* `paperSchema` plus its conformance assertion; a field the type accepts and validation drops is a new fabrication path, not a fix. **Red proof:** a planted well-formed-but-unverified DOI must fail, and a planted *malformed* DOI must fail **differently** — one guard passing for both reasons is not two guards.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus both red proofs, recorded.

**U6 — the corpus verified *(live — network, and conditionally the deployed database)*.** Resolving real DOI/PMID for the corpus; volume bounded by D-6, at minimum the **20** existing papers. **Build-time and offline at runtime** (roadmap Security): no lookup reachable from a request path. **Sequencing:** U6 cannot start before U5 — a verification with nowhere to record itself is a spreadsheet. **Owns the ID-change requirement (P-02), `[P3-X6]`:** roadmap L538–539 requires *"a tombstone plus a data migration"* for any ID change, and **U6 is the unit that can force one** — a paper that cannot be verified may have to be retired, which under the manifest's `remove`/`rename` policy needs a tombstone with `supersededBy`/`migration` and, because `papers` persists at `advisor_messages.citations[].refId`, **a data migration against the deployed database**. **Reachable under either D-6 scope.** U6 must state before it starts what it does with an unverifiable citation: retire it, keep it unverified and disclosed, or drop the paper. **Red proof:** a planted unverifiable DOI must redden U5's guard rather than pass silently.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded. **A live unit additionally records its spend** (§8).

**U7 — coverage honesty — BLOCKED ON D-1.** A product-wide treatment of *"we don't know"* versus *"there is nothing"* across effects, interactions, side effects and food pairings. **Absence must never read as safety** (`CLAUDE.md` §2.2 rule 10). **Cannot be verified as `[P3-X4]` requires until D-1 is ruled** (§6). **Red proof:** a partial-coverage surface with no disclosure must fail whichever check D-1 selects.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded.

**U8 — injection seam and bundle budget.** `getBiomarker` takes a catalog parameter, finishing the seam. **Sized honestly (P-16): `getBiomarker` has ZERO call sites** — `grep -rn getBiomarker` over `*.ts|*.tsx|*.mjs` outside `node_modules` and `graphify-out` returns exactly one hit, the definition at `src/lib/biomarkers/index.ts:151`, and no barrel re-exports it. **The refactor is therefore unobservable and `CLAUDE.md` §5 rule 3 (reachability) cannot be satisfied for it as written.** What would make the seam observable: a caller — the Library biomarker surface U7 touches is the candidate — or U8 drops the refactor and ships the bundle assertion alone. **First deliverable: check §2's route table in** (P-17). **Red proof:** the bundle assertion must fail against a deliberately inflated route.
**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build` — plus the red proof, recorded.

---

## 5. Exit criteria

**`[P3-X1]`…`[P3-X5]` are word-for-word the roadmap's** (L550–554). **`[P3-X6]`…`[P3-X8]` are plan-only:** they bind roadmap *requirements* carrying no exit criterion, and have **no roadmap counterpart by design**. A future parity guard must exclude X6–X8 **by name** — Phase 2's convention left plan-only criteria unnumbered, and this plan diverges deliberately so the exclusion is declared rather than inferred (`criteria-parity.test.ts:25-27`; **FU-46**).

- [ ] **[P3-X1]** 27/27 effects have an `evidenceProfile`; a grade without one fails the build. *(U3, U4)*
- [ ] **[P3-X2]** 100% of citations carry a verified DOI/PMID; guards fail red on a planted unverified citation. *(U5, U6)* — **not checkable until D-3 and D-6 are ruled (P-11): D-3 fixes what *"verified"* means** (under option (a), satisfied by a regex over invented strings) **and D-6 fixes the denominator of *"100% of citations"*** (over a 0.8889-per-effect corpus it is trivially true). **Neither pre-filled.**
- [ ] **[P3-X3]** Content source of truth is non-TypeScript; codegen output byte-identical for the pre-migration corpus. *(U1, U2)*
- [ ] **[P3-X4]** Every surface that can show partial coverage states its coverage limit; test-verified. *(U7 — **D-1**)*
- [ ] **[P3-X5]** A content correction can be reviewed and shipped without hand-editing `src/`. *(U2)* — **verified by a recorded end-to-end correction**: one content change, its diff and the regenerated constant, checked in as the artifact, **plus** a test asserting that editing the authored file alone changes an emitted constant (P-12). **Scope caveat (P-07 ii):** it holds only for corrections that do **not** add, remove or rename an id — those require a hand edit to `id-manifest.json` inside `src/` by policy, so **X5 is false as the roadmap words it** for that class. Restated here; **amending the roadmap's wording is an owner decision, not this plan's.**
- [ ] **[P3-X6]** *(plan-only)* Any ID retired or renamed in this phase carries a manifest tombstone with `supersededBy`/`migration` **and** a data migration over every `persistedAt` surface the manifest lists for that namespace. *(U6)*
- [ ] **[P3-X7]** *(plan-only)* Every guard this phase ships has a recorded red-evidence entry against the bug it targets. *(U1, U2, U3, U4, U5, U7, U8)*
- [ ] **[P3-X8]** *(plan-only)* Every `paperIds` entry resolves, **and the guard is red against a planted dangling id**. *(U2)*

**Roadmap item → unit.** 1 → U5, U6 · 2 → U3, U4 · 3 → U1, U2 · 4 → U7 · 5 → U8.
**Roadmap *Testing* requirement → unit** *(added at (c); the draft traced Included work only, which is how three obligations reached no owner)*: placeholder guard → U2 (**FU-48**) · provenance-without-verification → U5 · `paperIds` resolve → U2 (`[P3-X8]`) · grade-has-a-profile → U3, U4 · DOI/PMID format-and-record → U5, U6 · **mutation-check each guard** → all units, via `[P3-X7]`. **Migration requirement → U6** (`[P3-X6]`). **Excluded, as the roadmap excludes them:** live PubMed ingestion, context-adjusted evidence (Phase 4), commerce, new pillars.

**Criteria parity does not exist for this phase and will not unless it is scheduled (P-08).** The `[P3-Xn]` ids were introduced so a parity guard *could* pair the two lists — but that guard pairs on ids present in **both** documents (`criteria-parity.test.ts:25-26`), `grep -c "P3-X" docs/roadmap.md` returns **0**, and no unit here edits the roadmap. **Recorded as a residue, not solved:** Phase 3 ships without criteria parity unless the owner schedules the roadmap-side id insertion. The guard's own header records what that reproduces — `[P2-X6]` once existed in the roadmap only.

---

## 6. Decisions for the owner — options and trade-offs, none pre-chosen

**Seven decisions after (c)'s split.** D-4 bundled two questions into one ruling (P-15); the second is now **D-7**. **D-5 and D-6 keep their numbers** so the (b) review's decision index — a record — stays valid.

### D-1 — `[P3-X4]`'s harness: build it here, or re-sequence the criterion
Raised by Phase 2 Check finding **P2-6**. `[P3-X4]` says *test-verified*; `vitest` collects `src/**/*.test.ts` under `environment: "node"`, so a `.test.tsx` cannot run and `HARNESS_GAP` hard-fails any tracked one. That is **U-DEFER-4**, whose owner-condition names *"the phase that introduces component testing"* — which the roadmap places in **Phase 4**.
- **(a) Build the harness here.** `[P3-X4]` becomes satisfiable. Cost: a jsdom environment, a second vitest project and `HARNESS_GAP`'s retirement — infrastructure at the front of a content phase.
- **(b) Re-sequence `[P3-X4]` to Phase 4.** Phase 3 ships the coverage treatment without the test-verified clause. Cost: the criterion list stops being fully met, and *"absence must never read as safety"* ships unguarded — the property §2.2 rule 10 cares about most.
- **(c) Keep it here, weaken *test-verified* to a source-level assertion** (every surface importing a partial-coverage dataset also imports the disclosure component). Cheaper; proves the import, not the render.

**Not decidable from the repository** — it trades phase shape against verification strength.

### D-2 — authored format, and where codegen lives
- **JSON** — no new dependency, `JSON.parse` is total, noisy diffs, no comments. · **YAML** — reviewable diffs and comments for editorial rationale, adds a parser dependency and a whitespace failure mode.
- Codegen sited in `scripts/` (consistent with `verify-*.mjs`) **or** a `content/` package.

The roadmap says *"JSON/YAML"* and does not choose. **Bearing on D-3:** if verification records live beside the citation in the authored file, comments are worth more than they look. **Bearing on FU-48:** a root `content/` package eases `[P3-X5]` but takes the corpus outside G1's `src/`-only walk; codegen under `scripts/` emitting into `src/data/` does the reverse. **Either way U2 must re-point G1 and prove it red.**

### D-3 — what *"recorded as verified"* means
The load-bearing decision: **who** verifies, **what** the record is, **where** it lives, **what the guard checks** — and, added at (c) on P-01, **whether ruling it needs a recorded rank-1 exception**.

> **Admissibility (`CLAUDE.md` §6, P-01).** §2.2 rule 8 — *never author unverified provenance* — is **rank 1**. §6 permits passing it only by *"an explicit, acknowledged decision by the user … and it must be recorded."* **No option below is removed; the annotation is the fix.** Where a recorded exception is required, the record goes **in this section, dated, beside the ruling** — not in a commit message.

- **(a) Format-only.** A DOI matching `10\.\d{4,}/\S+` and a PMID matching `\d{1,8}` pass. Cheap; **verifies nothing** — a well-formed DOI can be invented, which is the v13 failure with a regex in front of it. **⚠ Ruling (a) permits an invented-but-well-formed DOI into seed content and therefore CROSSES `CLAUDE.md` §2.2 rule 8. It requires a recorded rank-1 exception under §6**, written here, stating that the owner accepts unverified provenance in the trust layer and why. **It cannot be ruled in one word.**
- **(b) Verified-at-authoring, recorded in the content.** Each citation carries `verifiedOn` and `verifiedBy` beside the identifier; the guard checks the record exists and is well-formed. Honest about being a human attestation; does not detect a stale or retracted DOI. **No rank-1 exception** — provenance is verified, by a named human, on a dated record.
- **(c) Verified-at-build, offline against a checked-in fixture.** A build-time resolver checks each DOI against a committed response fixture captured when it was verified. Strongest offline guarantee; introduces a fixture corpus that itself needs refreshing. **No rank-1 exception.**
- **(d) Verified in CI against the live resolver.** Strongest, and it puts a network dependency in the build — which the roadmap's Security requirement pushes against (*build-time and offline*) and which makes CI fail on someone else's outage. **No rank-1 exception.**

**Whatever is chosen determines G2's replacement, `paperSchema`'s change, and therefore N-80's and N-81's fixes, and gives `[P3-X2]` its meaning.** Recommend ruling D-3 before U5 is planned in detail.

### D-4 — FU-29: in or out *(split from the old D-4 on P-15)*
**13 `mappers.ts` cast sites** against columns with no CHECK constraint. Its register row says closing it needs a migration against a **deployed** database plus 13 value-domain decisions, and it would open an OP row. **In-phase makes Phase 3 more live**; out means it waits again. **Options: in · out.**

### D-5 — the bundle budget
U8 asserts a ceiling. Baseline: `/library` **110 kB**, `/library/[slug]` **111 kB**, shared **105 kB**. A budget at today's figure fails on the first legitimate content addition; one set loosely never fires. **Options: absolute ceiling · percentage headroom over the recorded baseline · per-route delta per commit** — the third catches growth without needing a number to be right. **All three depend on the same missing artifact (P-17)**, hence U8's first deliverable.

### D-6 — corpus scope for U6
Does U6 verify **only the 20 existing papers**, or also close the gaps §2 measured — **3 effects citing no paper at all** and **9 profile dimensions citing none**? Cost scales with the first number; the credibility of `[P3-X2]` scales with the second. *"100% of citations are verified"* is trivially true of a corpus with few citations, and a mean of **0.8889** papers per effect is the number that makes that uncomfortable. **Also fixes U4's feasibility and its ordering against U6.** **Under either scope `[P3-X6]`'s tombstone path is reachable**, so P-02 is answered regardless of the ruling.

### D-7 — `CLAUDE.md` §4 rule 7: in or out *(split from the old D-4 on P-15)*
**8 of 31** client components import `@/lib` or `@/data` (one type-only). Phase 3 touches the Library UI in U7, so the overlap is real. **Enforcing it is a refactor of 8 components, not a guard, and carries no liveness cost** — which is why it does not belong in the same ruling as FU-29. **Options: in · out.**

---

## 7. Disposition of everything Phase 2 handed on

Derived from the Phase 2 report §9–§11 (lines 223–367). **The source set is 38 ids and 2 unnumbered residues** — re-derived at (c): `awk 'NR>=223 && NR<=367' <report> | grep -oE '(N|FU|OP)-[0-9]+' | sort -u | wc -l` → **38**. *(The draft said 39; §9.)* **In-phase** means a unit above owns it; **deferred** carries a reason.

| Item | Disposition |
|---|---|
| **FU-29** | **D-4** — the owner decides. Live if in. |
| **§4 rule 7** (8 of 31) | **D-7** *(was bundled into D-4; split at (c) on P-15)*. U7 touches the Library UI, so the overlap is real. |
| **§4 rule 8** (trust boundaries in testable modules) | **Deferred — no mechanical form exists.** Phase 2's report says so, Phase 3 finds no new one, and grounding adds no trust boundary. |
| **U-DEFER-4 / P2-6** | **D-1.** Gates `[P3-X4]`. |
| **OP-5** | **Deferred, owner-held, kept visible.** Three account facts UNKNOWN; the DPA page returned HTTP 403. **Content grounding does not touch it, which is exactly why it is named** — a phase boundary is where an open operational item goes quiet. Phase 3 closes nothing on it and must not be read as having. |
| **N-50** | **Phase 4**, as ruled. Named in `docs/roadmap.md` Phase 4 item 0. |
| **N-11, FU-41, FU-43, FU-44** | **Deferred to the next operational phase — one piece of work.** All four want a logging sink that does not exist; building one here is the scope expansion §0 forbids. |
| **FU-45, FU-46, FU-47** | **Deferred to the next operational phase.** Register and artifact instrumentation. **FU-46 has a Phase 3 cost:** this plan's `[P3-Xn]` ids exist so a parity guard *can* be written; without one declared row shape, writing it repeats the three wrong parses Phase 2 hit. **FU-47 also carries N-79's shared fix** — see that row. |
| **FU-30, FU-31** | **Deferred.** Dead `safetyCopy` helpers and their sibling; neither is on a grounding path. |
| **FU-32** | **Deferred as a standing class, not a task.** The counts-written-once class. **This plan is bound by it only in the weak sense (P-10):** every §2 figure carries a re-runnable command, which makes it *re-derivable*, not *bound*. Nothing fails when a §2 figure rots — and at (c) one had (the mean, §9), alongside two rotted figures elsewhere in the draft. |
| **FU-33, FU-34** | **Deferred.** `handleParams` and the unrendered `PARTIALLY_APPLIED`; both advisor-path, not Library. **FU-34 also holds N-71's unclosed product half** — see that row. |
| **FU-35, FU-36, FU-37, FU-38** | **Deferred to the next operational phase**, as U31's C-table obligations were accepted. |
| **FU-39** | **Closed at Phase 2 (b) by DROP.** Listed only because the report names it; not a residue. |
| **FU-40** | **Deferred.** `RLS_COVERAGE`'s semantic blind spot; CI's catalog check is the control. No Phase 3 migration is planned unless D-4 says otherwise. |
| **FU-42** | **Deferred — and it constrains this plan.** `CRITERIA_PARITY` cannot express `[~]`. If any `[P3-Xn]` finishes PARTIAL, the same trap applies. |
| **N-22, N-25** | **Deferred.** Gateway aliases and PDF transcription on scans; neither is a Library-content path. |
| **N-40** | **Deferred with FU-41** — same cluster, same sink. |
| **N-69** | **Deferred, owner-condition intact.** Security-relevant; the condition is a second writer or a transferable conversation, and Phase 3 creates neither. |
| **N-70** | **Deferred, gate intact.** Any proposal to make conversations transferable must cite it. Phase 3 makes none. |
| **N-1, N-52, N-74, N-75, N-76, N-77** | **Closed in Phase 1 or 2**, verified cell by cell at (c) against the Phase 2 plan's register (`:546`, `:611`, `:633`, `:634`, `:635`, `:636`). None carries a Phase 3 obligation. |
| **N-71** | **NOT CLOSED — corrected at (c) on P-03.** The register reads **"MITIGATED BY U34 AT THE API. NOT CLOSED AT THE PRODUCT — see FU-34"** (Phase 2 plan `:630`; report `:325`). Nothing renders `error.details`, so a correct `PARTIALLY_APPLIED` reaches the log and stops there. **Deferred with FU-34** — advisor-path, not Library — **but deferred, not closed.** |
| **N-79** | **DISCLOSED, NOT CLOSED — corrected at (c) on P-03.** The register reads **"DISCLOSED AT (d4); the shared fix is FU-47"** (`:638`). Each guard carries its blind spot in its own header; no live undetected violation exists in tracked source. **Deferred with FU-47.** |
| **FU-1** | **OPEN — corrected at (c); the draft said "Closed in Phase 1" and that is false.** Phase 2 plan `:240` lists FU-1 under *"Remaining open, deliberately unscheduled"*; Phase 1 plan `:837` reads **"ASSESSED by U11 2026-08-04 → still open, unowned."** It is `executeProposal`'s unlocked read on `attach_product`. **Deferred** — advisor-path, no Phase 3 unit touches it. *(Found at (c); **not** by the (b) review.)* |
| **OP-1, OP-7** | **Discharged** with dated records under `docs/05-qa/`. |
| ***(unnumbered)*** `replaceFlags` transactional residue — three round trips, no transaction | **Deferred, condition intact and restated:** *"the next unit adding a second writer to `evaluation_flags`."* **No Phase 3 unit adds one.** *(Report `:299`; added at (c) on P-03 — the draft's id-keyed extraction could not see it.)* |
| ***(unnumbered)*** **Live E2E — BLOCKED(env)** | **Deferred, ruling intact:** *"no secrets enter this public repository."* Phase 3 changes nothing about it; the `[LIVE]`-gated specs stay skipped in CI. *(No count is given: the figure in `CLAUDE.md`'s baseline was not re-derived at (c), and this plan does not carry unverified numbers.)* *(Report `:300`; added at (c) on P-03.)* |
| **N-80, N-81** *(new, this plan)* | **OPEN — owner U5, after D-3.** See §3. |
| **FU-48** *(new, landing (c))* | **OPEN — owner U2, conditional on D-2.** See §3. |

**What this section claims, precisely** *(restated at (c); the draft's "No item from the source set is omitted" was false twice over — P-03)*. **Id set:** all **38** ids the source names are dispositioned above; `comm -23` over the two extracted sorted sets is **empty**. **Item set:** the source also carries **2 unnumbered residues**, both now dispositioned — the class the Phase 2 (d3) certifier rejected an earlier follow-up set for omitting, which the draft reproduced because its extraction keyed on `FU-/N-/OP-` ids. **Status claims:** where a row reads *closed* or *discharged* that is a statement about the register at `52e00d9`, **verified cell by cell at (c)** — which is how N-71, N-79 and FU-1 were found mis-stated.

---

## 8. Spend

**This plan performs no spend and authorises none.** Of the eight units **U6** is live: **DOI resolver and PubMed E-utilities lookups**, no OpenAI call. **Corrected at (c) (P-02): U6 is *conditionally* also a deployed-database unit.** If verification retires any paper id, `[P3-X6]` requires a tombstone **and a data migration over `advisor_messages.citations[].refId`** — a write against the deployed database, which the draft's spend line excluded. That path is reachable under **either** D-6 scope and, if taken, **opens its own OP row**, as FU-29's would. **D-4 can make the phase more live still.**

---

## 9. Appendix — claims checked, withdrawn, and corrected

| Claim, as it appeared | Status after re-derivation |
|---|---|
| Roadmap: *"19 of 27 effect grades are hand-typed"* | **HOLDS** — 19 of 27 |
| Roadmap: *"four of them Grade A … eight Grade A in all"* | **HOLDS** — 8 Grade A, 4 without a profile |
| Roadmap: *"Target 27/27, up from 8/27"* | **HOLDS** — 8 profiles today |
| Roadmap: *"some with zero linked papers"* | **HOLDS, quantified** — 3 effects, plus 9 of 40 profile dimensions |
| Roadmap Testing: *"every `paperIds` entry resolves"* | **ALREADY TRUE** — 0 unresolved. Mutation-checking is what makes a guard for it mean anything. **Now owned — U2, `[P3-X8]`** |
| Roadmap: *"100% of citations carry a verified DOI/PMID"* | **RE-READ** — not a gap in the data; the **field does not exist** |
| That G2 blocks reintroducing provenance | **WITHDRAWN** — G2 forbids six named keys and **not** `doi`/`pmid`. **N-80** |
| That G2 is *the* control in the way | **WITHDRAWN at (c)** — `paperSchema` is a second, with no conformance assertion. **N-81** |
| `CLAUDE.md` §4 rule 7's *"8 of 31"* | **HOLDS** at `52e00d9`, re-derived by §2's command |
| Draft §7: *"the report names **39** ids"* | **CORRECTED at (c) → 38.** The draft counted its own **N-80** into the source total — FU-32's class, inside the section that names it |
| Draft §7: *"**FU-1** — Closed in Phase 1"* | **WITHDRAWN at (c)** — FU-1 is **open and unowned**. It reached §7 as a *range endpoint* (*"FU-1 … FU-46"*, report `:228`), not as a carried row |
| Draft §7: *"No item from the source set is omitted"* | **WITHDRAWN at (c)** — false for N-71, N-79 and the 2 unnumbered residues. Restated as separate id-set and item-set claims |
| Draft §2: mean `paperIds` per effect *"0.89"* | **REFINED → 0.8889.** The rounded form makes D-6's discomfort read as smaller than it is |
| (b) review P-07: *"`src/data/` … 12 tracked files"* | **CORRECTED at (c) → 13** (`git ls-files src/data/ \| wc -l`). The review's own enumeration lists 13; the count beside it is off by one. **The finding is unaffected** |

---

## 10. Disposition of the (b) review — P-01 … P-17

Verdict **REVISE**. Every item is **ADDRESSED** at the plan section given, or **DECLINED** with a reason. **No item is declined on the ground that it was wrong.**

| Item | Sev | Disposition |
|---|---|---|
| **P-01** | CRITICAL | **ADDRESSED — §6 D-3**, admissibility note plus option (a)'s ⚠ annotation. Each option states whether ruling it needs a **recorded rank-1 exception** under `CLAUDE.md` §6, and where the record goes. **No option removed.** |
| **P-02** | MAJOR | **ADDRESSED — §4 preamble, U6, §2, §8.** Liveness test rewritten to *any* `persistedAt` surface; **U6 owns the ID-change requirement**, criterion **`[P3-X6]`**; the `advisor_messages.citations[].refId` fact and the conditional deployed-DB spend are stated. |
| **P-03** | MAJOR | **ADDRESSED — §7.** N-71 → MITIGATED-not-closed; N-79 → disclosed-not-closed; **FU-1 → open** (found at (c), beyond the review); both unnumbered residues dispositioned; source count corrected 39 → **38**; closing sentence split into id-set and item-set claims. |
| **P-04** | MAJOR | **ADDRESSED — §4 U4**, rewritten: **190 elements** named; sourcing rule (no model recall); honestly-empty `paperIds` declared acceptable; authorship left to the owner; a **safety-vocabulary sweep** added as a U4 deliverable with its red proof; **U4↔U6 ordering** stated as D-6-dependent. |
| **P-05** | MAJOR | **ADDRESSED — §4 preamble + `[P3-X7]`.** Red evidence is an obligation on every guard-shipping unit, and **U1, U2, U3, U4, U5, U7, U8 each carry a named red proof**. |
| **P-06** | MAJOR | **ADDRESSED — §4 U2, `[P3-X8]`.** U2 owns the `paperIds`-resolution guard; red proof is a planted dangling id. §5 now traces the roadmap's **Testing** requirements to owners, not just Included work. |
| **P-07** | MAJOR | **ADDRESSED — §4 U2, `[P3-X5]`.** U2 scoped to the **9 `SEED_*` modules**; manifest, both guard files and `medication-aliases.ts` carved out; `src/data/` re-counted to **13**; `[P3-X5]` restated with the id-change caveat, the roadmap-wording question handed to the owner. |
| **P-08** | MAJOR | **ADDRESSED — §5 closing paragraph.** **Phase 3 ships without criteria parity**, recorded as a residue, naming the roadmap-side id insertion as what would change that. *(The alternative action — scheduling that edit — is declined below.)* |
| **P-09** | MINOR | **ADDRESSED — §3, §4 U2/U5, §6 D-2.** §3 rewritten to two controls; **N-81** and **FU-48** registered at re-derived numbers; N-80 widened; U5 owns N-81, U2 owns FU-48; D-2 states the coverage consequence both ways. |
| **P-10** | MINOR | **ADDRESSED — §2 and §7's FU-32 row.** Every §2 row carries a runnable expression against a named script; the client-component row gets the two-stage `git ls-files` pipeline it lacked; **FU-32's claim downgraded from "bound" to "re-derivable"**, with the three rotted figures as the evidence. |
| **P-11** | MINOR | **ADDRESSED — `[P3-X2]`.** States that **D-3 fixes its meaning and D-6 its denominator**, and that it is not checkable until both are ruled. Neither pre-filled. |
| **P-12** | MINOR | **ADDRESSED — `[P3-X5]`.** Names its artifact: a recorded end-to-end correction with its diff, plus a test binding authored-file edit → emitted-constant change. |
| **P-13** | MINOR | **ADDRESSED — header + §4, in full.** The `CLAUDE.md` §5 rule 10 four-check gate is stated in the header as binding on **every** unit, §10 rule 5's per-action approval rule beside it, **and every unit carries its own `**Gate:**` line** in Phase 2's shape. *(An earlier (c) draft declined the per-unit shape "to stay inside the 400-line cap" — untrue of a 317-line plan, and the delta check said so. The reason was wrong, so the item was satisfied instead of argued.)* |

| **P-14** | MINOR | **ADDRESSED — §4 U4.** All five engines named with line numbers; their fixtures must be re-derived; U4 must say what happens to persisted `kind='effect-grade'` citations before changing a letter. |
| **P-15** | MINOR | **ADDRESSED — §6.** D-4 split: **D-4** = FU-29, **D-7** = §4 rule 7. D-5/D-6 keep their numbers so the review's decision index stays valid. Neither ruling presupposed. |
| **P-16** | MINOR | **ADDRESSED — §4 U8.** Records the **zero call sites** fact, that §5 rule 3 cannot be satisfied as written, and the two ways to make the seam observable. |
| **P-17** | MINOR | **ADDRESSED — §2 and §6 D-5.** The **route table is recorded verbatim**, checking it in is **U8's first deliverable**, and D-5 names it as the artifact all three rulings depend on. |

**Two requested *actions* are DECLINED. None is a disagreement with its finding, and each finding is addressed by the alternative the review itself offered or by an equivalent:**

| Declined action | Reason |
|---|---|
| *"Schedule the roadmap-side id insertion inside a named unit"* — **P-08** | `docs/roadmap.md` is outside this landing's writable set, and adding a unit that edits the sequencing authority is an owner decision (`CLAUDE.md` §6 rank 6). **The review's alternative — record it as a residue — is taken instead.** |
| *"Record that the roadmap's wording needs amending"* for `[P3-X5]` — **P-07** | **Recorded, not acted on.** The caveat is stated in `[P3-X5]`; amending the roadmap is the owner's, for the same reason. |

### Unit typing, re-checked at (c)

| Unit | Before (c) | After (c) | Why |
|---|---|---|---|
| U1 | deterministic | **deterministic** | unchanged |
| U2 | deterministic | **deterministic** | gained the resolution guard and FU-48; both file-local |
| U3 | deterministic | **deterministic** | unchanged |
| U4 | deterministic | **deterministic** | gained a safety sweep and fixture re-derivation; no network, no DB |
| U5 | deterministic | **deterministic** | gained N-81; a Zod conformance test is file-local |
| U6 | **live** (network) | **live** (network **+ conditionally the deployed database**) | `[P3-X6]`'s tombstone migration writes `advisor_messages.citations[].refId`. Already live, so the **type** is unchanged — **the spend line is not** (§8) |
| U7 | deterministic | **deterministic** | unchanged |
| U8 | deterministic | **deterministic** | gained the route-table check-in, a committed artifact |

**No unit changed type. One — U6 — changed spend class, and that is the finding the corrected liveness test produced.**
