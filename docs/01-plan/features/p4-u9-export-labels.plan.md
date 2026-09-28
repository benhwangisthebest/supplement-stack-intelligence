# p4-u9-export-labels — PDCA cycle artifact for Phase 4 U9, landing (a)

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U9**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U9 (a) · Export labels · **SUPERVISED** · deterministic · **Anchor** `2ba950b` · **Date** 2026-09-28
> **Authority:** the owner's standing approval for U9 (2026-09-28): branch, commit, push, fast-forward `main`, delete the
> branch, on a green G over the staged tree in a clean worktree, green branch CI, and the staged set equal to *May
> touch*. **Not covered, shown verbatim and stopped on:** the export's new field shape and any explanatory copy (§5).
> **Rulings:** D-16 (b); the owner clarification (2026-09-28: every citation kind that resolves to a seed id); the
> owner's option-2 ruling (2026-09-28); N-41's ruling (no cap); R-3 (reviewer on a scratch copy). All verbatim in plan §6.

## 1. Plan

**Goal (the brief's):** every stored citation in the account export carries its stored label unchanged plus the label
the Library shows for that id today, resolved by the same function the UI uses.
**Carried:** FU-60 (closes). N-41 (touch recorded; stays OUT). **Raised and closed:** N-100. **Void:** N-99 (§6).

**Premises, measured at `2ba950b`:**

| | Claim | Measured |
|---|---|---|
| P-a | the stored label, and every `kind` written | Only `advisor_messages.citations` persists citations: written at `src/lib/advisor/repo.ts:186`, read as stored at `:54`. `label` is stored for every kind, so D-16 (b)'s stop does not fire. Kinds, all from `src/lib/advisor/tools.ts`: `effect-grade` (:123, :178), `paper` (:188), `stack-eval` (:215), `interaction-rule` (:246), `biomarker-rule` (:279), `lab-trend` (:309), `side-effect` (:339). Proposal (`actions/proposals.ts:55`, `:250`) and identity (`identity/index.ts:61`) citations are not persisted |
| P-b | the UI's resolver, and whether the export may import it | `displayed()` at `src/components/advisor/ProvenanceChips.tsx:48` (module-private), fed by `buildCitationIndex()` at `citation-index.ts:28`. Both in `src/components`; B5 (`boundaries.test.ts:162`, `NO_UI_IMPORT_FROM = ["src/lib", "src/services"]`) forbids `src/lib/db/export-repo.ts` to import either. **And** it resolved only an effect's grade letter (`:52-57`), never its name, so no existing function produced "Triglyceride lowering": AC-2 and AC-3 conflicted. **Stopped; owner ruled option 2** |
| P-c | the resolver on a tombstoned or unknown id | `displayed()` never returned null: an unknown refId, an unverified paper, and every non-seed kind fell back to the stored label (`:55`, `:58`, `:60`) |
| P-d | highest issued ids | `git grep -ohE` over `docs CLAUDE.md`: **N-98, FU-75**; `N-99` appears only as a fixture (`src/architecture/doc-truth.test.ts:677`) |

## 2. Design

**One resolver, two consumers.** `src/lib/advisor/citation-label.ts` (pure; imports `@/lib/evidence` and types only):

- `libraryLabel(kind, refId)` is the Library's own answer, independent of any stored label. `effect-grade`: the
  effect is in `defaultLibrary.effects` and its supplement exists, so `${supp.name} → ${effect.name}, Grade ${grade}`.
  `paper`: `getPaperById` holds it, so its title when it carries a DOI or PMID, else `label: null`. Absent:
  `not-in-library`. Any other kind: `not-resolved`. Lookups are `===` over arrays, so `constructor` never resolves.
- `currentCitationLabel(c)` gives `{ labelResolution, currentLabel }`. `resolved` carries `libraryLabel(...).label ??
  c.label`; the other two carry `null`.

**The paper case the ruling asked about (present, no verified title).** Implemented as the ruling's second branch:
`resolved`, `currentLabel` = the stored label. `citation-label.ts:51` returns `not-in-library` only when
`getPaperById` finds nothing; `:52` returns `resolved` with `label: null` when the paper is present without a DOI or
PMID, and `currentCitationLabel` substitutes the stored label. **Why:** the id is in the Library, so
`not-in-library` would be false; the Library has no verified title to offer, so the stored label is the only label
anything shows for it (the chip showed it before this unit and still does). Today this is only `p-nac-antioxidant`
(FU-57), measured: the one paper of 38 without a DOI or PMID; 0 dangling `paperIds`; 0 effects without a supplement.

**The chip.** It is in the client graph (`AdvisorPanel` is `"use client"`), so CLIENT_TAKES_PROPS forbids it a runtime
import of `@/lib`. `buildCitationIndex()` (server) now stores `label: libraryLabel(kind, id).label` per effect and
paper id, replacing `verifiedTitle`. The chip's private resolution is deleted (the grade-letter rewrite and the
`verifiedTitle` read); `displayed()` keeps only display policy: `index label ?? stored label`, the stale paper note
dropped when a paper has a current label, and U4 R2's "grade updated" marker (stored letter ≠ current grade). The
whole-corpus chip test now binds the rendered label to `currentCitationLabel(c).currentLabel ?? c.label` for every
effect and paper id plus prototype names: that is the chip↔export binding (CLAUDE.md §5 rule 4).

**The export.** `export-repo.ts:157` maps `advisor_messages` through `withCurrentLabels` (`:181`). Each citation is
`{ ...stored, currentLabel, labelResolution }`: the stored object spread first and never rewritten. A stored element
that is not an object (jsonb read unvalidated) is exported exactly as stored, not thrown on. No shared type changed:
`UserDataExport.tables` is `Record<string, unknown>`; `ExportedCitation` is declared in the repo.

**N-41 touch.** The export's first per-row transform: two fields per stored citation. Still uncapped, per the ruling.

## 3. Do — files

| File | Change |
|---|---|
| `src/lib/advisor/citation-label.ts` (new) + `.test.ts` (new, 8 tests) | the resolver |
| `src/components/advisor/citation-index.ts` | `label` from `libraryLabel`; `verifiedTitle` removed |
| `src/components/advisor/ProvenanceChips.tsx` | private resolution deleted; reads `label` from the index |
| `src/components/advisor/ProvenanceChips.test.tsx` | U4 R2 expectations use the current label; whole-corpus binding to `currentCitationLabel`; new U9/N-100 fish-oil case |
| `src/lib/db/export-repo.ts` + `.test.ts` | `withCurrentLabels`; 5 new tests (AC-1, AC-2, AC-4, message untouched, malformed element) |
| `src/app/api/account/export/route.test.ts` | the route serves the shape unchanged, `null` intact |
| `src/components/advisor/AdvisorMessageBubble.test.tsx` | one assertion; ~~HELD — outside *May touch*~~ added to *May touch* by the owner at AC-5 (§6) |
| phase-4 plan · this artifact | U9 row, FU-60/N-41 row, N-99 (void), N-100, rulings verbatim |

## 4. Check — red evidence

All on a scratch worktree at `2ba950b` (R-3), `node_modules` symlinked. Restores were by file copy from the working tree.
In M1's restore a `git checkout --` also ran in the scratch worktree before the copy. It is redundant, and §5 rule 11
says copy, not checkout.

| Proof | Setup | Result |
|---|---|---|
| R1 (AC-2 red at HEAD) | HEAD code + the new `export-repo.test.ts` | 3 U9 tests fail. AC-2: `currentLabel by refId` expected `{fish-oil-cardiovascular: "Fish Oil (Omega-3) → Triglyceride lowering, Grade A", p-creatine-strength: "Effects of Creatine Supplementation … Meta-Analysis."}`, received both `undefined` |
| R3 (chip red at HEAD) | HEAD chip + the new chip test (+ lib module so it imports) | U9/N-100 case fails: *Unable to find … "Fish Oil (Omega-3) → Triglyceride lowering, Grade A"*. Also red: both U4 R2 cases, whole-corpus binding |
| M1 (resolver call removed) | new tree; `messages.flat().map(withCurrentLabels)` → `messages.flat()` | AC-2 fails naming both ids (received `undefined`) |
| M2 (stored label passed off as current) | `currentCitationLabel(c)` → `{ currentLabel: c.label, labelResolution: "resolved" }` | AC-2 and AC-4 fail |
| M3 (chip index without the resolver) | `label: libraryLabel("effect-grade", id).label` → `label: null` | 4 chip tests fail, including U9/N-100 |
| restore | files copied back | 10/10 export-repo, 21/21 `src/components/advisor` |

## 5. Stop at AC-5 — the shape (shown to the owner)

An exported `advisor_messages` row's citations, for the AC-2 fixture:

```json
[
  { "kind": "paper", "refId": "p-creatine-strength",
    "label": "Effects of creatine supplementation on strength and lean mass",
    "detail": "Illustrative evidence summary",
    "currentLabel": "Effects of Creatine Supplementation and Resistance Training on Muscle Strength Gains in Adults <50 Years of Age: A Systematic Review and Meta-Analysis.",
    "labelResolution": "resolved" },
  { "kind": "effect-grade", "refId": "fish-oil-cardiovascular",
    "label": "Fish Oil (Omega-3) → Cardiovascular support, Grade A",
    "currentLabel": "Fish Oil (Omega-3) → Triglyceride lowering, Grade A",
    "labelResolution": "resolved" },
  { "kind": "paper", "refId": "p-nac-antioxidant", "label": "Stored NAC title",
    "currentLabel": "Stored NAC title", "labelResolution": "resolved" },
  { "kind": "effect-grade", "refId": "retired-effect", "label": "Gone → Away, Grade C",
    "currentLabel": null, "labelResolution": "not-in-library" },
  { "kind": "interaction-rule", "refId": "rule-x", "label": "A ↔ B (moderate)",
    "currentLabel": null, "labelResolution": "not-resolved" }
]
```

**Explanatory copy: none proposed.** Nothing is added to `notIncluded` or elsewhere, and `src/lib/safety` is untouched.

## 6. Deviations and findings

- **`AdvisorMessageBubble.test.tsx` — ~~outside *May touch*, HELD, not staged~~ approved into *May touch* at AC-5 (2026-09-28).** Its rule-8 test asserted the chip shows a
  made-up stored effect label (`:34` at `2ba950b`); after the ruled change the chip shows the Library's label, so it fails. The
  one-line fix asserts `index.effects[effect.id].label` instead. Staged with the diff as shown.
- **N-99 as a VOID register row.** The ruling asked to *record* the skip. A bare gap fails REGISTER_ROW_SHAPE
  (`doc-truth.test.ts:551`, contiguous ids per prefix), and the guard is outside *May touch*, so the skip is recorded
  as a row marked VOID. **Approved at AC-5.**
- **The effect-name change carries no "updated since" notice.** The U4 R2 marker covers a changed grade letter only.
  Adding a name-change notice would be new copy; none is proposed (§5). **Registered by the owner as FU-76 → U20.**
- **AC-7 review (fresh subagent, scratch worktree, 2026-09-28): verdict BLOCKING, on packaging only.** (1) The staged
  set without the held file is red: the bubble test at `2ba950b` fails 1 of 3 (*Made-up → Sleep quality, Grade D*),
  so a green G and "staged = *May touch*" cannot both hold until the owner rules on that file. **Resolved at AC-5: the owner widened *May touch*.**
  (2) A resolved row stored with no `label` exported `currentLabel: undefined`, which JSON drops. **Fixed:**
  `citation-label.ts` returns `null`; an array element now passes through as stored (`export-repo.ts:192`). Both
  new tests went red with the fix removed and green on restore (copy backup). (3) `boundaries.test.ts:161` → `:162`
  and (4) the U9 row's "two mutations" → three: **fixed**. (5) Note: an effect whose supplement is missing is
  `not-in-library` though its id is present (`citation-label.ts:46`), because no label can be built. 0 such effects
  today. **Recorded, not changed.** The code, the chip↔export agreement, the scope and the §5 shape were verified
  clean.
- **Coverage:** `src/lib/advisor` has no threshold entry (vitest.config.ts: it holds files that reach `@/lib/db`); this
  unit adds a module to an existing directory, not a new engine. No floor edited.

## 7. Act

**Approved at AC-5 (2026-09-28)**, verbatim in plan §6: the shape exactly as shown with no copy; `AdvisorMessageBubble.test.tsx`
into *May touch*; N-99 VOID; N-100 closed; FU-76 registered → U20. AC-6 and AC-8 then ran on the staged tree in a clean
worktree. The commit and its CI run cannot be named inside the commit; they are in the landing report and `git log`.
