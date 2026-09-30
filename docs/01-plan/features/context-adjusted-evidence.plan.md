# context-adjusted-evidence (v13) — Plan

> **Revised 2026-09-30, Phase 4 U14a.** Docs only, anchor `49b3fc2`. Applies the owner's rulings R1–R4 of 2026-09-30, recorded verbatim in the Phase 4 plan's U14 row: **R1** no adjusted grade (the grade stays universal, and personalisation is an applicability note beside it) · **R2** the two example lines (§5.3) · **R3** the personal-signal track stays separate · **R4** revised within this file's pinned 399 lines (Q-1).
> Text that no longer holds is struck and dated, not rewritten. A block struck whole is cited as `49b3fc2:<lines>` of this file. The cycle record is `p4-u14a-context-plan-revision.plan.md`.
>
> Built with **Plan-Plus** (brainstorming-enhanced PDCA planning).
> Milestone: **v13** — first feature beyond v12 `food-pairings`. **[2026-09-30]** Now Phase 4 roadmap item 1 (D-3).
> Architecture posture: **Approach A (two-track)**, display-only, additive, Library-universal.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: v13
> **Date**: 2026-07-16 · **revised 2026-09-30**
> **Status**: ~~Draft — awaiting approval~~ **Draft — revised, awaiting approval.** Approval is a future owner decision; U14a does not approve it.
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

*[2026-09-30, U14a] Revised under R1–R3. The v13 rows are at `49b3fc2:19-22`.*

| Perspective | Content |
|---|---|
| **Problem** | Evidence grades are **universal**, and under R1 they stay universal. What is missing is **applicability**. The platform holds a user's own lab entries (v3, v4) and the studies behind each grade (Phase 3 grounded 27 of 27 grades), and shows neither beside the other. Deferred twice already: v5 ("population-adjusted grades") and v6 ("personalization: context-adjusted grades"). ~~Creatine's cognitive evidence is stronger in vegetarians and older adults; vitamin D's evidence is far stronger if you're actually deficient~~ *[struck 2026-09-30: unsourced claims about the evidence (§2.2 rules 7, 8), and "deficient" is §2.1 rule 1's word]* |
| **Solution** | **Two tracks, never merged.** Track 1: a pure `lib/evidence-context` module builds an **applicability note** beside the universal grade. It uses the user's own lab entry, compared **only** to the reference range the user entered. The grade is never changed, and no personal grade letter exists (R1). Track 2: adherence and outcomes (v10) and side-effect findings (v11) render as a **separate, labelled personal signal** beside the grade. They never feed it (§2.2 rule 9) and never imply cause (§2.1 rule 4) (R3). **Display-only**: no ranking path changes. |
| **Function / UX Effect** | Stack Lab and Profile show the universal grade. The note sits beside it only where §5.3's render condition holds; otherwise nothing new renders. The advisor gains a read-only 8th grounded tool. **The Library is untouched, and its rendered output is identical for any two users.** Two tests enforce this (SC-4), not convention. |
| **Core Value** | ~~*"B generally — A for you, because the trials were in deficient adults and your 25-OH D is 18 ng/mL"*~~ *[struck 2026-09-30: a personal grade letter, and a user labelled deficient (§2.1 rules 1, 4; R1)]*. It is replaced by the approved within-range line (§5.3; owner, 2026-09-30): *"Your {marker} entry of {value} {unit} ({date}) is within the reference range you entered. The {grade} grade for {effect} describes the studies behind it, not you; the app cannot determine whether they apply to you."* The grade remains a claim about **the evidence**, never a claim about **the user**. |

---

## 1. User Intent Discovery (Phase 1)

### 1.1 Core Problem

Make the evidence layer **personal without making it private-truth**. Grades today are a single universal letter per effect; the science they summarize is not universal. The platform already owns the context needed to say which evidence applies to whom, and has deferred using it twice. **[2026-09-30]** "Personal" means a note beside the grade, never a different grade (R1). The note says the app cannot determine whether the evidence applies (§2.1 rule 6).

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|---|---|---|
| Health nerds / biohackers / longevity-focused | Existing audience; no new persona | Know whether a grade *applies to them* — not just that it exists |
| Users with lab data (v4 adopters) | Have uploaded biomarkers | ~~See their labs actually change what the evidence means for them~~ See their own entries placed beside the evidence, with no judgment about whether it applies to them *[2026-09-30]* |

### 1.3 Success Criteria

*[2026-09-30, U14a] Revised. Each criterion carries its v13 line at `49b3fc2`. SC-4 and SC-11 are restated with the old text struck in place; neither named the adjusted grade.*

- [ ] **SC-1** — A pure `lib/evidence-context` module ships a note function: `(effect, the user's lab markers) → ApplicabilityNote | null`. Unit-tested, DB-agnostic, zero I/O. The note carries no grade of its own. *(v13 `:41`, struck: R1)*
- [ ] **SC-2** — A curated **marker→effect pairing** table, integrity-tested to reference only ids present in `SEED_EFFECTS` and `SEED_BIOMARKERS`. The demographic axis is struck: it has no approved copy, and it needs the verified enrolment field §5.3 defers. *(v13 `:42`)*
- [ ] **SC-3** — **I1 proven**: `lib/evidence` never imports user/context types. *(unchanged)*
- [ ] **SC-4** — **I2 proven**: the Library route never imports `lib/evidence-context`~~; `/library/[slug]` remains SSG and byte-identical across users~~, **and its rendered output is identical for any two users.** *[2026-09-30: "SSG" is false since Phase 2 U28. Every page is request-dependent: the root layout's `getUser()` calls `cookies()`, and the build emits no Library HTML (N-37).]* **Test shape:** (a) an import-graph walk over the transitive runtime imports of every tracked file under `src/app/library/**`, failing on any edge into `src/lib/evidence-context/**` (the walk `client-props.test.ts` uses); (b) render equality: `SupplementDetailPage`, server-rendered for one slug under two fixture users with different profiles and lab entries, compared as strings. The root layout is excluded because it renders signed-in chrome. Each is mutation-checked: a planted import turns (a) red, and a planted user-dependent render turns (b) red.
- [ ] **SC-5** — **I3 proven**: the note function is pure. It never mutates its inputs, and identical inputs give identical outputs. *(v13 `:45`)*
- [ ] **SC-6** — **I4 proven**: `ApplicabilityNote` never reaches `compareSuggestions` or `stack-evaluator/rules.ts`. All v5/v10 ranking tests are unchanged and green. *(v13 `:46`)*
- [ ] **SC-7** — **I5 proven**: where no entry qualifies (no lab entry, no user-entered range, no pairing, or an unbound field), the note is `null` and the rendered output is byte-identical to today's (the v10 no-feedback test's shape). *(v13 `:47`)*
- [ ] **SC-8** — Stack Lab and Profile render the universal grade, with the note beside it in §5.3's two approved lines only. **Every bracketed field is bound by a test to the entered, computed or verified value it names** (§2.2 rule 7; v11 lesson L1). *(v13 `:48`)*
- [ ] **SC-9** — The personal signal track renders beside the grade, never inside it, with **no call edge** from `PersonalSignal` into the note function, `lib/evidence`, the grade, or ranking beyond v10's within-grade ordering (a mutation-checked import assertion). Its copy states an association, never a cause (R3). *(v13 `:49`, extended)*
- [ ] **SC-10** — Advisor tool #8 ships read-only and grounded. It returns the universal grade and the note's bound fields, and its answer relays the §5.3 line verbatim or cites those fields. The banned-language guard (`src/lib/advisor/agent.ts:265`) checks wording, not truth, so it is a backstop only. Lab values reach the provider only as the existing lab tools already send them (§2.3 rule 15). *(v13 `:50`)*
- [ ] **SC-11** — ~~`next build` OK (**not** `typecheck` alone — see Risk R5); prior suites green; **live suite verified with `E2E_LIVE=1 --workers=1`**, including the new surfaces.~~ **G is green: the Phase 4 plan's full gate, including the non-live E2E suite, with specs covering the new surfaces.** *[2026-09-30: a live run is paid and is owner-run (D-12), so the build cannot meet it. It is an owner-run item, not a success criterion.]*

### 1.4 Constraints

| Constraint | Details | Impact |
|---|---|---|
| **Library universality** | *User-specified.* Grades in the Library must be identical for all users. Personalization is confined to Stack Lab + Profile. | **High** — I1 + I2; shapes the entire module boundary |
| **Display-only** | *User-specified.* ~~Adjusted grade~~ The note *[2026-09-30]* must not change protocol/stack-eval recommendations. | **High** — I4; keeps v10's evidence-dominant guarantee intact |
| **Grade ≠ claim about the user** | n=1 signal (adherence, side-effects) may not enter the grade. **[2026-09-30]** Nothing enters it: the grade is universal (R1). | **High** — I4/I5, track separation by type |
| **Non-diagnostic** | ~~Adjusted grade~~ The note *[2026-09-30]* is educational context, never a deficiency finding or medical claim. | **High** — §5.4 gate |
| **User-entered range only** *[2026-09-30, R2]* | The entry is compared only to the range on the user's own row, in the unit it was entered in. The catalog's population range is never used. | **High** — §5.3 |
| **Additive** | Target 0 migrations, 0 engine rewrites, 0 new dependencies (v5/v9/v12 posture). | Medium |
| **Naming collision** | `EvidenceProfile` (evidence dimensions) vs `UserProfile` (the person); `Effect.evidenceProfile` already exists. New type is `UserEvidenceContext`. | Medium — a known footgun, named deliberately |

---

## 2. Alternatives Explored (Phase 2)

*[2026-09-30] R1 settles the grade question by ruling. A's grade half is struck. C is struck (v13 `49b3fc2:88-96`: demographics + baseline adjust the grade), and its fallback role passes to A without Track 2, the note alone. B's rejection stands and is now also ruled.*

### 2.1 Approach A: Two-track — ~~adjusted grade~~ applicability note + personal signal layer — **Selected**

| Aspect | Details |
|---|---|
| **Summary** | ~~Grade adjusted by demographics + baseline only~~ A note beside the universal grade, from the user's own lab entry *[2026-09-30]*; adherence/side-effects render as a separate labeled layer beside it. |
| **Pros** | Delivers the full context picture on one screen; preserves the honesty invariant and v10's evidence-subordinate decision without special-casing; each track testable in isolation; reuses v3/v4 and v10/v11 — mostly wiring, not new engines. |
| **Cons** | ~~Two numbers on screen~~ A grade and two notes on screen; needs real design care so they read as complementary, not competing. No single "personalized grade". |
| **Effort** | ~~Medium-High (curation on two axes is the cost)~~ Medium (one pairing table; no grade machinery) |
| **Best For** | Keeping the trust layer trustworthy while surfacing everything. |

### 2.2 Approach B: Single blended personalized grade

| Aspect | Details |
|---|---|
| **Summary** | One grade per effect per user, all four signal classes weighted into the composite. |
| **Pros** | One number; maximum felt personalization; simple to the user. |
| **Cons** | The grade becomes a claim about *you*, near the diagnostic line the brief forbids; reverses v10's architecture; **unexplainable** — "why is my creatine a B?" mixes study dimensions with personal logs, and the brief requires every recommendation be explainable. Wants central resolution → structurally pressures Library universality. |
| **Effort** | High |
| **Best For** | A product optimizing engagement over trust. Not this product. |

### 2.3 ~~Approach C: Adjusted grade only~~ *(struck 2026-09-30, R1; see §2's note)*

### 2.4 Decision Rationale

**Selected: Approach A.** The user asked for every signal the platform holds to reach them. A delivers that, and refuses only one thing: laundering n=1 data through a word ("grade A") that users trust to mean something about the science. The signals are **two different kinds of fact** — ~~demographics and baseline answer *"which study population do you belong to?"* (still curated science)~~ a lab entry answers *"where does my entry sit against my own range?"*, and, once the enrolment field exists, *"what did the studies enrol?"*, with the app declining to decide *[2026-09-30]*; adherence and side-effects answer *"what happened to you?"* (not evidence about the supplement at all). B collapses that distinction; ~~C ignores half the ask~~. The user's Library-universality constraint is Approach A's thesis restated, and independently rules out B.

---

## 3. YAGNI Review (Phase 3)

### 3.1 Non-negotiable core (not up for cutting)

- [ ] `lib/evidence-context` — pure ~~adjusting~~ note module *[2026-09-30]*; context passed explicitly; seed grade never mutated
- [ ] ~~Curated population modifiers~~ Curated marker→effect pairings *[2026-09-30]* — without them there is nothing to place beside the grade
- [ ] **Invariant tests I1–I5** — *these are the Library constraint.* Everything else is negotiable; these are not
- [ ] Stack Lab surfacing ~~+ "why adjusted for you" trail~~ of the note beside the grade *[2026-09-30]*; the note's bound fields are its explanation

### 3.2 Included (all four discretionary items selected)

- [ ] ✅ **~~Baseline/biomarker adjustment~~ Biomarker applicability note** *[2026-09-30]* — reuses v3 marker normalization for the pairing only, **not** `statusOf` (R8)
- [ ] ✅ **Personal signal layer** (v10 adherence/outcomes + v11 side-effect findings) — the second track
- [ ] ✅ **Profile surface** — cheap once Stack Lab exists; a second consumer of the same module
- [ ] ✅ **Advisor integration** — read-only 8th grounded tool; deferred once already in v9

> **Honest note:** this YAGNI review **cut nothing**. Mitigating factor: the *display-only* ranking choice makes v13 a presentation layer over engines that already exist (v3/v4/v10/v11), so four surfaces × display-only is materially less risky than two surfaces × ranking. The scope remains larger than any prior cycle — see Risk R1. **[2026-09-30]** R1 removed the grade machinery and the demographic axis, which narrows it.

### 3.3 Deferred (v14+)

| Feature | Reason for Deferral | Revisit When |
|---|---|---|
| ~~Adjusted grade feeds ranking (bounded, v10-style ±cap)~~ | *Struck 2026-09-30: R1 leaves no adjusted grade to feed anything* | — |
| **The enrolment sentence, both lines** *(R2, re-ruled 2026-09-30)*: the studies' inclusion criteria and citation labels (§5.3) | Needs a **verified per-paper enrolment field**. `Paper.population` (`src/types/paper.ts:18`) is authored text, and the verified record holds a `doi`/`pmid` and a title only | Live sourcing lands (U7, OUT under D-3; roadmap backlog) |
| Demographic applicability (age, sex, training, diet) *[2026-09-30]* | No approved copy; needs the same verified enrolment field | With the enrolment field |
| Population-adjusted **dose** ranges | Different curation axis; dose is not a grade | v14+ |
| Context-adjusted **evidence-literacy score** (v9 deferral) | Separate concern | Still deferred |
| Wearable-derived context signals | No ingestion path exists | When wearable import lands |

### 3.4 Removed (Won't Do)

| Feature | Reason for Removal |
|---|---|
| **Any personal or adjusted grade letter** *[2026-09-30, R1]* | The grade describes evidence, never the user (§2.1 rule 4; D-3 item 1) |
| Personalized grades in the **Library** | *User-specified.* The Library is the trust layer; a grade that shifts per viewer can't be cited or compared between users |
| Single blended personalized grade (Approach B) | Makes the grade a claim about the user; unexplainable; structurally pressures Library universality |
| Mutating `defaultLibrary` / `resolveEffect` to be user-aware | **Would be a real bug**: `defaultLibrary` is a module-level const resolved once in a server process shared across all users → cross-user grade contamination, plus Library leakage |

---

## 4. Scope

### 4.1 In Scope

- [ ] **M0** — spec repair (prerequisite): fix 2 rotted L3s; diagnose 2 remaining failures~~; add `ANTHROPIC_API_KEY`~~ *[2026-09-30: the provider is OpenAI since U31. M0's state is not re-derived here; it is a Do-phase entry check]*
- [ ] **M1** — pure domain: types, ~~curated modifiers (2 axes), `adjustForContext`, explain trail~~ marker→effect pairings, the note function *[2026-09-30]*, invariant tests
- [ ] **M2** — context assembly: `UserEvidenceContext` from ~~`getProfile()` +~~ `listLabMarkers()`; `PersonalSignal` from `listCheckins()`/`analyzeCheckins()` + `listSideEffectReports()`/`correlateReports()`
- [ ] **M3** — surfaces: Stack Lab, Profile, advisor tool #8

### 4.2 Out of Scope

- Any Library change (§3.4)
- Any ranking change (§3.3) — `runEvaluation`, `evaluateStack`, `compareSuggestions`, `generateProtocol` all untouched
- New migrations, new dependencies, engine rewrites
- **[2026-09-30]** Any user-facing string beyond §5.3's two lines. Other copy (labels, the personal-signal wording, a coverage statement) is an owner batch at design (D-3)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-01 | ~~`adjustForContext` returns an adjusted view~~ The note function returns `ApplicabilityNote \| null`: the bound fields of §5.3 and which line applies | High | Pending |
| FR-02 | The universal grade is always carried, never dropped or overwritten. It is the only grade | High | Pending |
| FR-03 | ~~Curated demographic modifiers~~ *struck: deferred (§3.3)* | — | — |
| FR-04 | ~~Curated biomarker modifiers; reuse v3 unit normalization~~ Compare the entry's `value` with the **same row's** `referenceLow`/`referenceHigh`, in the unit entered, with no conversion and no catalog fallback | High | Pending |
| FR-05 | The explain trail **is** the note: every rendered claim names the entered value, the range or the record it came from | High | Pending |
| FR-06 | ~~Downgrade copy~~ *struck: no downgrade exists.* The copy is §5.3's two lines, verbatim | High | Pending |
| FR-07 | Partial context (the common case) degrades gracefully. ~~Adjust on what exists, state what's missing~~ With no qualifying entry the note is `null`, and nothing new renders | High | Pending |
| FR-08 | `PersonalSignal` aggregates v10 adherence/outcomes + v11 findings in a distinct shape | Medium | Pending |
| FR-09 | Stack Lab + Profile render both tracks side by side, visually distinct | High | Pending |
| FR-10 | Advisor tool #8: read-only, grounded, returns the universal grade and the note's bound fields | Medium | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|---|---|---|
| **Purity** | `lib/evidence-context` performs zero I/O; the note function never mutates its inputs | I3 test + `DOMAIN_IS_PURE` (`CLAUDE.md` §4 rule 5) |
| **Isolation** | `lib/evidence` user-free; Library never imports the note module | I1 + I2 (SC-4's two tests) |
| **Regression safety** | No qualifying entry ⇒ byte-identical output | I5 test (v10 pattern) |
| **Honesty** | No banned causal/diagnostic language; every bracketed field bound to its value | Banned-language sweep + binding tests (§5.4) |
| **Security** | Context is per-request, never module-scoped; RLS unchanged | I3 + live authed specs (owner-run) |
| **Build** | ~~`next build` succeeds~~ G green *[2026-09-30]* | The Phase 4 plan's G |

### 5.3 Approved example copy *(R2, re-ruled by the owner 2026-09-30: both lines lose the enrolment clause; the superseded drafts are in the Phase 4 plan, D-3 item 1 and §6)*

**Outside the range:** *"Your {marker} entry of {value} {unit} ({date}) is {below\|above} the reference range you entered ({refLow}–{refHigh}). The {grade} grade for {effect} describes the studies behind it, not you, and the app cannot determine from the information provided whether they apply to you. A lab value outside the range you entered may be worth discussing with a clinician."*

**Within the range:** *"Your {marker} entry of {value} {unit} ({date}) is within the reference range you entered. The {grade} grade for {effect} describes the studies behind it, not you; the app cannot determine whether they apply to you."*

| Field | Binds to | Kind |
|---|---|---|
| `{marker}` `{value}` `{unit}` `{date}` | `LabMarker.marker`, `.value`, `.unit`, `.date` on the user's row (`src/types/profile.ts:25-35`), rendered as stored | entered |
| `{refLow}` `{refHigh}` | the same row's `referenceLow`, `referenceHigh` (`:31-32`) | entered |
| `{below\|above}`, and the choice of line | `value < referenceLow` → below, `value > referenceHigh` → above, otherwise within. Same row, same unit | computed |
| `{grade}` `{effect}` | the paired effect's universal `Effect.grade` and `Effect.name` (`src/types/effect.ts:13,15`) | computed / seed |

**Field rule (owner, 2026-09-30).** An entry with no date omits *"({date})"*, parentheses included. No other field may be omitted: if any other field cannot bind, the note is `null`.

**Render condition.** Either line renders only when the reference range was entered by the user: `referenceLow` **and** `referenceHigh` are non-null on the user's own lab row. A range stored on that row counts as entered, including one extracted at import and confirmed by the user (`LabReviewConfirm`) (owner, Q-28). The catalog's population range (`Biomarker.refLow`/`refHigh`, `src/types/biomarker.ts:26`), which `statusOf` uses as a runtime fallback (`src/lib/biomarkers/index.ts:39-40`), **never counts, so no note renders against it**. The note therefore does not call `statusOf` (R8; its unit defect is U21). A test must prove that no write path fills the range from the catalog; today the modal pre-fills only from the row being edited (`LabMarkerModal.tsx:43-44`). **Otherwise:** the universal grade renders alone, exactly as today (SC-7). No placeholder, no "missing data" copy, and nothing that implies the evidence does or does not apply.

**Deferred** (future work, both lines): an enrolment sentence naming the studies' inclusion criteria and their citation labels, e.g. the drafts' *"{n} of the {m} studies cited for {effect} enrolled {inclusionCriterion} ({paperLabels})."* and *"…comes from studies that enrolled {inclusionCriterion} ({paperLabels})"*. It depends on a **verified per-paper enrolment field**, which does not exist (`Paper.population`, `src/types/paper.ts:18`, is authored text). It needs live sourcing (U7 backlog).

### 5.4 Gate: the rules this plan must satisfy *(D-3; U14 row)*

| Rule | Design element that satisfies it |
|---|---|
| **§2.1 rule 1** (never tell a user they have a deficiency or condition) | The copy is the two approved lines only. They state where the entry sits against the user's own range and name no condition or deficiency. The banned-language sweep covers both lines, and SC-10's advisor guard covers tool #8 |
| **§2.1 rule 4** (no correlation presented as cause) | No personal grade letter (R1): *"describes the studies behind it, not you"*. The personal-signal track is separate, and its copy states association only (R3, SC-9). Its copy is an owner batch (§4.2), so this row holds only once that batch is approved |
| **§2.1 rule 6** (copy through `src/lib/safety`; escalate) | Both lines are to live in `src/lib/safety`. The outside-range line carries the clinician escalation. Both say the app cannot determine whether the evidence applies |
| **§2.2 rule 7** (never assert an uncomputed fact) | §5.3's binding table, with a binding test per field (SC-8). A field that cannot bind means no line; only `{date}` may be omitted, with its parentheses (§5.3 field rule). No field needs the unverified enrolment data, which is deferred |
| **§2.2 rule 9** (self-reported signals never override evidence) | The grade takes no personal input. `PersonalSignal`, the self-reported track, has no edge into `lib/evidence`, the grade or ranking beyond v10's within-grade ordering (SC-9); the note is display-only (I4, SC-6) |
| **§2.2 rule 10** (curated coverage never reads as complete) | A null note renders nothing, never a reassurance (SC-7). Pairing coverage is partial by design, and its coverage statement is an owner batch at design, through `<CoverageLimit>`. **This row is met only once that batch is approved**; until then a note on some effects and not others could read as "not applicable" elsewhere |

---

## 6. Success Criteria

*[2026-09-30, U14a] Revised; the v13 section is at `49b3fc2:188-201`.*

### 6.1 Definition of Done

- [ ] SC-1 … SC-11 met, as revised 2026-09-30 (§1.3)
- [ ] All invariants I1–I5, *and every §5.3 field binding [2026-09-30]*, have a test **proven to fail when the invariant is violated** (mutation-checked — v11 lesson: a guard not proven to fail is decoration)
- [ ] Design doc reconciled with any Do-phase deviations before Report

### 6.2 Quality Criteria

- [ ] ~~Full unit suite green (v12 baseline 374 + v11 388 → v13 target ≥ prior + new)~~ · ~~`npm run build` green~~ · ~~Zero lint errors~~ → **G green**: the Phase 4 plan's full gate, which holds all three, plus coverage thresholds for the new engine (`CLAUDE.md` §5 rule 7)
- [ ] ~~`E2E_LIVE=1 npx playwright test --workers=1` — new surfaces covered~~ Non-live E2E covers the new surfaces (inside G), **no new gated-and-forgotten specs**. The live run is an owner-run item (D-12), not a criterion

---

## 7. Risks and Mitigation

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| **R1** | **Scope exceeds any prior cycle.** New module + curation on 2 axes + 4 surfaces. v11 was 4 surfaces/3 modules and still shipped 2 Criticals through a green suite. *[2026-09-30: one axis, no grade machinery]* | High | ~~High~~ Medium | Display-only shrinks blast radius; M0 first; fall back to the note alone (drop Track 2) if M1 overruns |
| **R2** | **Curation cost underestimated.** v12's L3: seed data must be curated against the *real* catalog. ~~15 supplements × multiple effects × 2 axes~~ Pairings over the real catalog | ~~High~~ Medium | Medium | Integrity test constrains pairings to existing IDs; partial coverage is acceptable and must render nothing rather than a false reassurance (§5.4, rule 10) |
| **R3** | ~~**Downgrade UX reads as a bug.**~~ *Struck 2026-09-30: no downgrade exists.* **The note reads as a diagnosis.** | High | Medium | Approved lines only; the §5.4 gate; the independent review's rule-1 question at every copy change |
| **R4** | **Cross-user contamination** if the note function is ever hoisted to module scope (`defaultLibrary` precedent). | **Critical** | Low | I3 purity test + explicit context argument; §3.4 records this as a Won't-Do |
| **R5** | **`npm run typecheck` is not trustworthy in this repo** (v12 L4 — stale `tsconfig.tsbuildinfo` masked errors that `build` caught). *[2026-09-30: G runs `tsc --noEmit` and `next build` both]* | Medium | Medium | Gate on G, never on a typecheck alone |
| **R6** | **Gated specs rot silently.** Two L3s asserted on `/stack-lab` while the banner moved to `/stack-lab/[stackId]`; skipped for months, nothing noticed. | High | Medium | M0 repairs them first; v13 adds no spec that is gated-and-unrun; a skipped test is an **unknown**, not a pass |
| **R7** | Two-track UI reads as competing ~~numbers~~ statements rather than complementary. | Medium | Medium | Design-phase validation; distinct components + copy (v12 L2's `mapSeverity` guard is the precedent) |
| **R8** *[2026-09-30]* | **The existing marker status is wrong for the note.** `statusOf` falls back to the catalog range, and compares a canonical-unit value with a user range in the entered unit. So 100 nmol/L against 75–250 nmol/L reads `low` (probe, U14a record §4) | High | Certain if reused | The note compares within one row and one unit (FR-04). The defect itself is unit U21 (owner, 2026-09-30), outside this plan |

---

## 8. Architecture Considerations

### 8.1 Project Level

**Dynamic** ✅ (of Starter / Dynamic / Enterprise). *[2026-09-30: the v13 selection table, `49b3fc2:223-227`, folded to this line to fit R4; the selection is unchanged]*

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|---|---|---|---|
| Signal partition | Blend all / population-only / population + separate personal track | ~~**Population-only in grade; personal track beside**~~ **Nothing in the grade; note + personal track beside** *[R1]* | ~~Demographics+baseline = *which evidence applies*~~ A lab entry beside the grade (and, once the field exists, the enrolment) is context; adherence/side-effects = *what happened to you*. Different kinds of fact |
| Ranking reach | Display-only / feeds ranking / bounded | **Display-only** | Zero risk to v10's evidence-dominant regression; every existing engine test stays valid |
| Module boundary | Extend `lib/evidence` / new `lib/evidence-context` | **New module** | Extending would leak to Library **and** risk cross-user contamination (R4) |
| Track separation | Convention / types | **Distinct types, no call edge** | Structural enforcement survives future contributors; convention doesn't |
| Context type name | `UserContext` / `EvidenceContext` / `UserEvidenceContext` | **`UserEvidenceContext`** | Avoids collision with existing `EvidenceProfile` / `Effect.evidenceProfile` |
| Render strategy | SSR-compute / self-fetch | **SSR-compute** | v9 precedent (Profile IdentityCard); the client receives props (`CLAUDE.md` §4 rule 7) |

### 8.3 Component Overview

*[2026-09-30] Redrawn for R1; the v13 diagram and invariant table are at `49b3fc2:242-265`.*

```
lib/evidence  ← UNIVERSAL, user-free. The Library reads this, per request since U28. UNCHANGED.
     │ seed grade, never mutated, the only grade
     ▼
lib/evidence-context  ← NEW, pure
     note(effect, the user's LabMarker rows) → ApplicabilityNote | null
     └── marker→effect pairings (curated seed; ids integrity-tested)
     ▼
Stack Lab · Profile · advisor tool #8:   grade │ note (§5.3) │ personal signal — side by side, none inside another
```

| ID | Invariant | Guards |
|---|---|---|
| **I1** | `lib/evidence` never imports user/context types | Library universality |
| **I2** | The Library route never imports `lib/evidence-context`, and renders identically for any two users (SC-4) | Library universality |
| **I3** | The note function is pure: no mutation, deterministic | Cross-user contamination (R4) |
| **I4** | `ApplicabilityNote` never reaches `compareSuggestions` / stack-eval ranking | Display-only |
| **I5** | No qualifying entry ⇒ `null` ⇒ output byte-identical to today's | Regression safety |

### 8.4 Data Flow

*[2026-09-30] Flow 1's build-time description (`49b3fc2:272-280`) is struck. It described a static page, and since U28 the page renders per request (N-37). Flow 2 (`:283-300`) is struck under R1 and redrawn below.*

```
═══ FLOW 1 — Library (universal) ══════════════════ [UNCHANGED]
  request → SupplementDetailPage(slug)  app/library/[slug]/page.tsx
    ├─ getSupplementBySlug() · getEffectsForSupplement() · getPapersForEffect()
    └─ lib/evidence → defaultLibrary = SEED_EFFECTS.map(resolveEffect), resolved ONCE at module load
  → identical page output for every user (SC-4) · ✗ UserEvidenceContext not in scope (I1, I2)
═══ FLOW 2 — Stack Lab / Profile: applicability note ═ [NEW]
  authed request → requireUser()
  ├─ M2  listLabMarkers()  db/lab-marker-repo → the user's rows → UserEvidenceContext
  ├─ M1  getEffectsForSupplement() → Effect (universal grade)
  │        └─ note(effect, ctx) → ApplicabilityNote | null   ← same-row, same-unit comparison (FR-04)
  └─ M3  render: grade, and beside it the outside- or within-range line (§5.3), or nothing (SC-7)
═══ FLOW 3 — personal signal track ════════════════ [REUSE, parallel]
  listCheckins() → analyzeCheckins()   lib/checkin      → adherence · outcomes
  listSideEffectReports() → correlateReports()   lib/side-effects → findings
    └──→ PersonalSignal: own component, own copy, association only (R3)
  ✗ never enters the note function or the grade — no call edge, no shared type
═══ FLOW 4 — advisor tool #8 ══════════════════════ [NEW, read-only]
  agent loop → tool → note(...) → grounded citations; banned-language guard on the answer
═══ RANKING PATH ══════════════════════════════════ [UNTOUCHED — I4]
  runEvaluation() → evaluateStack → stack-evaluator/rules.ts → getBestEffectForOutcome()  ← universal
  generateProtocol() → compareSuggestions() → labSignal → grade → feedback → composite → name
  ✗ ApplicabilityNote reaches neither — I4 asserts the absent import
```

### 8.5 Module Plan

| Module | Contents | Files modified | Risk |
|---|---|---|---|
| **M0** — spec repair | Fix `medication-interactions` L3 + `biomarker-intelligence` L3 (drive the real flow against `/stack-lab/[stackId]`); diagnose `lab-timeline-actions` L2 + `advisor-actions` L1~~; add `ANTHROPIC_API_KEY`~~ *(state not re-derived, §4.1)* | tests only | Low |
| **M1** — pure domain | `types/evidence-context.ts`, `lib/evidence-context/{pairings,note,index}.ts` + tests, pairing integrity, `invariants.test.ts` (I1–I5), binding tests (§5.3), a coverage threshold entry (`CLAUDE.md` §5 rule 7) | **0** | Medium (curation) |
| **M2** — context assembly | `UserEvidenceContext` + `PersonalSignal` assembly (v9 `lib/identity/context.ts` pattern); read-only; a reachability guard (`CLAUDE.md` §5 rule 3) | few | Medium |
| **M3** — surfaces | Stack Lab, Profile, advisor tool #8; component tests (`CLAUDE.md` §5 rule 8) | several UI | Medium |

> **M2 note:** `checkins` and `side_effect_reports` are currently **empty** on the live project — M2's live specs must create their own rows. *[2026-09-30: a 2026-07-16 observation, not re-derived]*

---

## 9. Convention Prerequisites

- [x] Existing conventions verified — pure `lib/*` domain, seed-as-code, additive posture (v2/v3/v5/v9/v10/v11/v12)
- [x] Naming confirmed — `UserEvidenceContext` chosen against the `evidenceProfile` collision
- [x] Folder structure confirmed — `lib/evidence-context` sits as a sibling to `lib/evidence`, `lib/interactions`, `lib/biomarkers`, `lib/side-effects`
- [x] Business logic stays out of UI components

---

## 10. Next Steps

1. [ ] Approve this Plan (owner; not done by U14a). **[2026-09-30]** Q-26, Q-27 and Q-28 were answered by the owner (the §5.3 re-ruling and the Q-28 ruling); Q-25 (the `statusOf` defect, R8) became unit U21
2. [ ] `/pdca design context-adjusted-evidence` — must resolve: ~~**downgrade copy** (FR-06)~~, **partial-context** degradation (FR-07), two-track visual language (R7), the owner batches of §4.2, and per v12's L1, **enumerate every existing caller and test affected by any shared default change**
3. [ ] `/pdca do context-adjusted-evidence` — M0 → M1 → M2 → M3, only once an amendment admits code (U14 row: revision only)

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|---|---|---|---|
| Intent | What core problem should v13 solve? | Context-adjusted evidence | Picked the item deferred in both v5 and v6 |
| Intent | Which context signals adjust the grade? | "Everything the platform knows" | Honored — but split across two tracks, since demographics/baseline and n=1 logs are different kinds of fact. *[2026-09-30: R1 — none adjust it]* |
| Constraint | Does the adjusted grade change the Library? | **No** — Library universal; Stack Lab + Profile only | Became I1 + I2. Investigation showed the architecture *already* enforces this (lib/evidence is user-free; ~~`/library/[slug]` is SSG~~ *[struck 2026-09-30, N-37]*) — the job is to protect it, not build it |
| Alternatives | A (two-track) / B (blended) / C (adjusted-only) | **A** | B makes the grade a claim about the user and pressures Library universality; C ignores half the ask. *[2026-09-30: C struck, R1]* |
| YAGNI | Which discretionary items? | **All four selected** | Nothing cut — flagged honestly (§3.2, R1). Display-only materially offsets the risk |
| YAGNI | Does the adjusted grade feed ranking? | **Display-only** | Zero risk to v10's evidence-dominant regression. *[2026-09-30: no adjusted grade exists, R1]* |
| Verification | How to handle the personal layer's dead-backend dependency? | "Restore backend first" — **then invalidated** | **User challenged the premise and was right.** Backend is alive; all 7 migrations applied; v11 authed specs pass 7/7 live; full suite 61/71. The restore cycle was deleted and replaced by M0 (spec repair) |

---

## Appendix B: Verification Findings (2026-07-16)

Investigated during Phase 4 after the user challenged the stored "backend is gone" claim. *[2026-09-30: a dated record, kept as written. "Phase 4" here is v13's PDCA phase, not the roadmap's. Its live figures are not re-derived. The advisor key it names was Anthropic's, and the provider is OpenAI since U31.]*

| Check | Result |
|---|---|
| Bogus project ref | NXDOMAIN → resolution *is* project-specific; no wildcard |
| Real project ref | Resolves; GoTrue **v2.193.0** answers `/auth/v1/health` |
| Migrations `0001`–`0007` | **All applied** — incl. `side_effect_reports` (`0007`) |
| v11 authed side-effect specs | **7/7 pass live**, both L3 round-trips included |
| Full live suite (`--workers=1`) | **61 passed / 10 failed** (~5 min) |

**The 10 failures are not product bugs:**
- **6 advisor specs** — `ANTHROPIC_API_KEY` absent from `.env.local`. Environmental.
- **`medication-interactions` L3 + `biomarker-intelligence` L3** — **rotted.** Both assert evaluation copy on `/stack-lab`, but that copy lives in `StackWorkspace`, which mounts via `StackLabClient` from `/stack-lab/[stackId]`. Both tests' comments describe "build a stack, then evaluate" steps the code never performs; they lean on demo-account state. The `[stackId]` route arrived later and moved the target; being `E2E_LIVE`-gated, nothing noticed.
- **`lab-timeline-actions` L2 + `advisor-actions` L1** — undiagnosed → M0.

**Consequences:** the prior session's memory was wrong on every count and had propagated into v11's report and into v13 planning. Memory corrected 2026-07-16. **A skipped test is not a passing test — it is an unknown, and the unknown compounds silently.**

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 0.1 | 2026-07-16 | Initial draft (Plan Plus) — Approach A, display-only, Library-universal; v13.0 restore cycle removed after live verification disproved the dead-backend premise |
| 0.2 | 2026-09-30 | Phase 4 U14a revision (R1–R4): adjusted grade removed; applicability note; §5.3 approved lines; §5.4 gate; SC-4 and SC-11 restated; R8; owner re-ruling of §5.3 (both lines lose the enrolment clause; field rule; Q-28); Q-25 → U21 |
