# p3-u9-rule7 — PDCA cycle artifact for Phase 3 U9

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U9**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U9** (status APPROVED, ruling D-7).
> Where the two disagree, the register wins.
>
> **Feature**: `p3-u9-rule7` · **Anchor**: `ae567fd` (one docs-only commit past the U7 follow-up merge
> `26b99d0`, the brief's stated anchor — the extra commit appends U10 to the register and touches no code) ·
> **Date**: 2026-09-24 · **Type**: deterministic (no network, no DB, no OpenAI, no CI change)

---

## 0. Owner ruling, recorded first (2026-09-24)

> A TYPE-ONLY import (`import type …`) from `@/lib` or `@/data` is **NOT** a rule-7 violation. It carries no
> runtime code into the client bundle. The guard must allow `import type` explicitly and must still fail a
> runtime import.

**Does this make the red set 7 or 8?** Under `CLAUDE.md` §4's stated predicate (files under
`src/components/**` carrying `"use client"` that import `@/lib/**` or `@/data/**`), re-derived at `ae567fd`:

```
git ls-files 'src/**/*.ts' 'src/**/*.tsx' | xargs grep -l -E "^[[:space:]]*['\"]use client['\"]"   → 32 (31 under src/components, 1 = src/lib/supabase/client.ts)
…of the 31, files importing @/lib or @/data                                                       → 8
…of the 8, type-only (auth/AuthForm.tsx → `import type { AuthActionState } from "@/lib/auth/types"`) → 1
```

**7**, under the stated predicate. **But the guard's derived set is 9 files / 11 edges** — see §1.

## 1. Plan

**Problem.** `CLAUDE.md` §4 rule 7 ("client components receive data as props … they do not import domain
engines or seed data directly") is unenforced, and its figure has already rotted once (P2-9). D-7: guard
first, red against every violator, then refactor, in one unit.

**The predicate the guard uses, and why it is wider than §4's.** §4 counts only files that *carry* the
directive. Next bundles for the browser **everything reachable from a client module over runtime imports**,
directive or not — which is exactly why the brief's AC-6 asks for `CoverageLimit` (no directive, pulled in
by `StackWorkspace`) to be checked. So the guard walks the **client graph**:

1. entries = every tracked source file under `src/` with `"use client"` in its directive prologue (parsed);
2. members = everything reachable from an entry over **runtime** edges (type-only edges carry no code);
3. violation = a runtime edge from a member into `src/lib` or `src/data`, `@/` or relative spelling.

That adds two violators the directive-only count cannot see:

| File | Directive? | Why it is client code | Runtime import |
|---|---|---|---|
| `ui/Disclaimer.tsx` | no | `LabReviewConfirm`, `StackLabClient` import it | `@/lib/safety` (`DISCLAIMERS`) |
| `advisor/ProvenanceChips.tsx` | no | `AdvisorPanel → AdvisorMessageBubble →` | `@/lib/advisor/citation-href`, `@/lib/evidence` |

**AC-6 answered:** `evidence/CoverageLimit.tsx` **is** in the client graph (via `StackWorkspace`), and is
**clean** — its only `@/lib` import is `import type { CoverageCopy }`, exactly what the ruling allows. U7's
comment claiming it "adds no `@/lib` value import" is now machine-checked.

**`src/lib/supabase/client.ts`** carries the directive and is an entry, but it is inside `src/lib`: rule 7
governs what the UI pulls in, not lib's internals. Traversal stops at the layer boundary.

**Stop conditions, checked before (a).** None fires for the guard: the set is derived (no hand-kept list),
nothing is live. For (b), see §5 — **one fires**.

## 2. Design — landing (a)

- New spec `src/architecture/client-props.test.ts` (`CLIENT_TAKES_PROPS`). Own TypeScript-parser walk,
  because `boundaries.test.ts`'s `extractEdges` does not record type-only-ness and a test file cannot import
  another without re-registering its suites.
- **Allowlist per edge** (`file -> specifier`), not per file, so an allowlisted component cannot gain a
  second `@/lib` import. `ALLOWLIST_ORIGIN` frozen at `ae567fd` = the 11 edges; allowlist ⊆ origin (R7c,
  the U3/G4d pattern); every allowlisted edge must still exist (R7d, the `DOMAIN_IS_PURE` ratchet).
- Only the **clause-level** `import type` / `export type … from` is exempt. `import { type T }` is flagged:
  whether it is elided depends on compiler settings; the fix is to write `import type`.
- An internal specifier that resolves to no tracked file fails R7a (the walk would otherwise be silently
  incomplete).
- **SPEC_COUNT 28 → 29**: `git ls-files 'src/architecture/*.test.ts' | wc -l` → **29**. All four bound sites
  (`README.md` ×1, `docs/project-status.md` ×2, `docs/02-design/architecture-boundaries.md` ×1) and the pin
  at `spec-count.test.ts:97` moved in the same commit.

## 3. Check — red evidence (`[P3-X7]`)

**AC-1 — the red run.** Allowlist emptied (file-copy backup, restored and `cmp`-verified identical):

```
 ❯ |node| src/architecture/client-props.test.ts (13 tests | 1 failed)
   × … > R7b every runtime @/lib or @/data import in the client graph is allowlisted
AssertionError: rule 7: 11 runtime import(s) from client code into src/lib or src/data:
  src/components/advisor/AdvisorPanel.tsx:9 imports '@/lib/api/error-text' at runtime  ("use client")
  src/components/checkin/DailyCheckinForm.tsx:8 imports '@/lib/safety' at runtime  ("use client")
  src/components/checkin/DailyCheckinForm.tsx:9 imports '@/lib/side-effects/vocab' at runtime  ("use client")
  src/components/profile/LabMarkerModal.tsx:10 imports '@/lib/biomarkers' at runtime  ("use client")
  src/components/profile/LabMarkerTable.tsx:9 imports '@/lib/biomarkers/marker-catalog' at runtime  ("use client")
  src/components/profile/ProfileForm.tsx:15 imports '@/lib/interactions/medication-names' at runtime  ("use client")
  src/components/stack/StackItemRow.tsx:4 imports '@/lib/product-matcher' at runtime  ("use client")
  src/components/stack/StackWorkspace.tsx:11 imports '@/lib/safety' at runtime  ("use client")
  src/components/ui/Disclaimer.tsx:1 imports '@/lib/safety' at runtime  (client via src/components/profile/LabReviewConfirm.tsx → src/components/ui/Disclaimer.tsx)
  src/components/advisor/ProvenanceChips.tsx:7 imports '@/lib/advisor/citation-href' at runtime  (client via src/components/advisor/AdvisorPanel.tsx → src/components/advisor/AdvisorMessageBubble.tsx → src/components/advisor/ProvenanceChips.tsx)
  src/components/advisor/ProvenanceChips.tsx:8 imports '@/lib/evidence' at runtime  (client via src/components/advisor/AdvisorPanel.tsx → src/components/advisor/AdvisorMessageBubble.tsx → src/components/advisor/ProvenanceChips.tsx)
 Test Files  1 failed (1)
      Tests  1 failed | 12 passed (13)
```

`auth/AuthForm.tsx` is absent, as the ruling requires.

**AC-2 — planted imports in a clean client component** (`ui/Tabs.tsx`, backup restored, `cmp` identical):

| Mutation | Result |
|---|---|
| `import { COVERAGE } from "@/lib/safety";` | **red** — `src/components/ui/Tabs.tsx:2 imports '@/lib/safety' at runtime  ("use client")` |
| `import type { CoverageCopy } from "@/lib/safety";` | **green** — `Tests  13 passed (13)` |

**AC-6 — transitivity** (`evidence/CoverageLimit.tsx` line 1 → `import { type CoverageCopy, COVERAGE as _C }`,
restored): **red** — `src/components/evidence/CoverageLimit.tsx:1 imports '@/lib/safety' at runtime  (client
via src/components/stack/StackWorkspace.tsx → src/components/evidence/CoverageLimit.tsx)`.

The predicate self-test (9 cases, synthetic trees) makes the AC-2 behaviour permanent: runtime named /
namespace / side-effect / re-export, `import type`, inline `{ type }`, relative spelling, `@/data`, `import()`,
`require()`, transitive chain, type-only edge not followed, directive only in the prologue, lib-internal
edges ignored, unresolved import surfaced.

## 4. Landing (a) — gate

Recorded in the register's U9 entry with the landing commit and CI run.

## 5. Landing (b) — STOPPED before any component moved

Per-edge assessment against the brief's stop conditions:

| # | Edge | What the component does with it | (b) route | Verdict |
|---|---|---|---|---|
| 1 | `StackWorkspace → @/lib/safety` | renders `DISCLAIMERS.interaction`, two `COVERAGE` entries (strings) | props from `stack-lab/page.tsx` via `StackLabClient` | feasible |
| 2 | `ProfileForm → medication-names` | `knownMedicationNames()` once at module load (string[]) | prop from `profile/page.tsx` | feasible |
| 3 | `DailyCheckinForm → @/lib/safety` | `checkinCopy.sideEffectDisclaimer` (string) | prop | feasible |
| 4 | `DailyCheckinForm → side-effects/vocab` | `sideEffectLabel(v)` over the finite `SIDE_EFFECT_VOCAB` | precomputed label map, prop | feasible |
| 5 | `LabMarkerModal → @/lib/biomarkers` | `normalizeMarker(m.marker)` over `markers` that arrive as props | precomputed id per marker in the server parent | feasible |
| 6 | `LabMarkerTable → marker-catalog` | `markerSuggestions()` (string[]); `markerCatalogEntry(name)` on typed input = trim + lowercase exact match over seed names/aliases | suggestions + lookup table as props | feasible (the key normalisation, two string ops, would live in the component) |
| 7 | `StackItemRow → product-matcher` | `getProductById(item.productId)` for the attached product's label | products-by-id map as prop | feasible |
| 8 | `Disclaimer → @/lib/safety` | `DISCLAIMERS[variant]` | `text` prop; 6 callers (3 server pages, `SiteFooter`, 2 client) | feasible, wide |
| 9–10 | `ProvenanceChips → citation-href, evidence` | per streamed citation: current grade (`defaultLibrary`), paper title (`getPaperById`), `citationHref` | precomputed citation index over all seed effect/paper ids, drilled `advisor/page → AdvisorPanel → AdvisorMessageBubble → ProvenanceChips` | feasible, heaviest |
| **11** | **`AdvisorPanel → @/lib/api/error-text`** | **`errorText(message, correlationId)` on the error envelope of a failed fetch / stream event, at runtime** | **none within the brief** | **STOP** |

**Why #11 stops.** The input is a runtime error envelope with a runtime correlation id, so no server parent
can precompute it, and a function cannot cross the server→client prop boundary. Every remaining route is
outside "May touch": (i) duplicate the 2-line logic in the component — breaks Phase 2 U19's single-source
design and `src/architecture/ui-error-text.test.ts:249`, which pins `AdvisorPanel`'s import of
`@/lib/api/error-text`; (ii) relocate `errorText` out of `src/lib` — a lib change plus the same guard edit;
(iii) have the route return the composed text — changes an API route's behaviour. **This is a genuine
conflict between two recorded decisions**: U19 wrote `errorText` to be client-callable on purpose
(`error-text.ts`: *"a client component can call this without dragging `next/server` into the browser
bundle"*), and rule 7 as written forbids a client component to call it.

**Not fired:** no client-side evaluation exists to move — `StackLabClient` imports no engine (evaluation is
server-side), so the latency condition does not apply. No new API route is needed for #1–#10.

**Owner decision needed before (b)** — see the register's U9 entry.

---

## 6. Owner ruling on (b) — 2026-09-24: OPTION A

1. **One named exemption**: `AdvisorPanel.tsx → @/lib/api/error-text`, reason (verbatim, in the guard): *"errorText
   is a pure envelope-to-text mapper built by Phase 2 U19 for client use; it carries no data or business logic,
   and moving it would break ui-error-text.test.ts's pinned import."* Tested to still exist, and the list to hold
   exactly ONE entry. B and C declined — C would also have admitted `markerCatalogEntry`, a seed-data lookup,
   which is what rule 7 and U8's bundle budget exist to stop.
2. **(b)**: the other 10 edges move to props from server parents; no `src/lib` change, no new route; the
   allowlist ends **empty**.

## 7. Landing (b) — Do

**Pattern.** Each page builds what its client tree used to compute in the browser, through a small server-side
props builder beside the components; the client components import **only its types** (`import type`). A
runtime import of a builder from client code would pull its `@/lib` imports into the bundle — the guard reddens
on it, because the walk is transitive.

| Edge (from `ALLOWLIST_ORIGIN`) | Now | Built by |
|---|---|---|
| `StackWorkspace → @/lib/safety` | `copy: StackLabCopy` prop | `stack-lab-props.ts` `stackLabCopy()` ← `stack-lab/[stackId]/page.tsx` |
| `StackItemRow → product-matcher` | `productLabels` prop, own-property lookup | `attachedProductLabels()` — `getProductById` over every seed product (its default catalog), so an unknown id still renders nothing |
| `DailyCheckinForm → @/lib/safety`, `→ side-effects/vocab` | `copy: CheckinFormCopy` prop | `checkin-props.ts` `checkinFormCopy()` ← `stack-lab/page.tsx`; labels total over `SIDE_EFFECT_VOCAB`, same `?? effect` fallback |
| `ProfileForm → medication-names` | `medicationSuggestions` prop | `profile-props.ts` ← `profile/page.tsx` |
| `LabMarkerTable → marker-catalog` | `catalog: MarkerCatalog` prop + `lookupMarkerCatalog` | `markerCatalog()`: `markerCatalogEntry(key)` for every key it can return non-null for |
| `LabMarkerModal → @/lib/biomarkers` | `biomarkerIds` prop, via `LabTimeline` | `biomarkerIdsByMarker(markers)` over the same rows the page passes |
| `Disclaimer → @/lib/safety` | `text: DisclaimerText` prop — the type admits only a `DISCLAIMERS` value, so "never inline it" is now compile-enforced | callers pass `DISCLAIMERS.<variant>`: 3 pages, `SiteFooter`, and (via props) `StackLabClient`, `LabUpload → LabReviewConfirm` |
| `ProvenanceChips → citation-href`, `→ @/lib/evidence` | `index: CitationIndex` prop, via `AdvisorPanel → AdvisorMessageBubble` | `citation-index.ts` `buildCitationIndex()` ← `advisor/page.tsx`: the lib's own answers for every id that can resolve |

Every lookup keyed by user- or DB-supplied text is an **own-property** read, so an id such as `constructor`
cannot resolve to `Object.prototype` (M3 below proves it mattered for product labels).

**Guard.** `NAMED_EXEMPTIONS` (1 entry) added; the working allowlist is **empty**; **R7h** pins it empty; R7c
still binds it to `ALLOWLIST_ORIGIN`. Guard run: `15 → 16 passed`, the only crossing the exempt edge.

## 8. Landing (b) — Check

**Named-exemption red proofs** (file-copy backups, restored, `cmp` identical):

| Mutation | Result |
|---|---|
| second entry planted in `NAMED_EXEMPTIONS` | **red** R7f — `the named-exemption list cannot grow: a second entry needs an owner ruling: expected [ …(2) ] to have a length of 1 but got 2` |
| `AdvisorPanel`'s import turned into `import type { errorText }` (exempt edge gone) | **red** R7g — `an exemption that outlives its import must be deleted, not kept as an amnesty` · `+ "src/components/advisor/AdvisorPanel.tsx -> @/lib/api/error-text"` |

**Behaviour unchanged — one jsdom test file per moved component**, each comparing the rendered output with
the lib call the component used to make, over the whole dataset plus unknown and prototype-named ids:
`Disclaimer.test.tsx`, `StackLabClient.test.tsx` (StackWorkspace + StackItemRow), `DailyCheckinForm.test.tsx`,
`ProfileForm.test.tsx`, `LabMarkerTable.test.tsx`, `LabMarkerModal.test.tsx`, and a new exhaustive block in
`ProvenanceChips.test.tsx` (its 9 existing tests kept, now handed the index). `CoverageLimit.test.tsx`'s
StackWorkspace harness passes the new props; its completeness check is unchanged and green.

**Mutation check of those tests** (`CLAUDE.md` §5 rule 2; each file restored and compared):

| # | Mutation | Result |
|---|---|---|
| M1 | `Disclaimer` renders `text.toUpperCase()` | RED — 7 failed |
| M2 | `interactionDisclaimer: DISCLAIMERS.general` | RED |
| M3 | product lookup without `Object.hasOwn` | RED — "renders no badge for an id … prototype names included" |
| M4 | product label `name: p.brand` | RED |
| M5 | side-effect labels = raw vocab | RED — 2 failed |
| M6 | marker lookup not trimmed | RED — 2 failed |
| M7 | catalog omits canonical names | RED |
| M8 | biomarker ids all `null` | RED — 13 failed |
| M9 | modal filters on the raw name | RED — 13 failed |
| M10 | effect hrefs resolved as papers | RED |
| M11 | unverified paper titles shown | RED |
| M12 | medication suggestions truncated | RED |

**Bundle observation** (after only — the pre-refactor tree was not rebuilt for comparison): `grep -rl` over
`.next/static` finds **0** files containing `calcidiol`, `hydroxyvitamin` (seed biomarker aliases) or
`Magnesium Glycinate 300` (a seed product name).

**Gate:** `tsc` clean · lint 399/399, 0 errors · vitest **130 files / 1611 tests** (119 node, 11 jsdom) with
coverage thresholds · `next build` · `verify:rendering` OK · E2E non-live **70 passed / 30 skipped** · null-byte
check clean.

**Judgment call, recorded:** the four props builders (`stack-lab-props.ts`, `checkin-props.ts`,
`profile-props.ts`, `citation-index.ts`) are **new files under `src/components/`**, not `src/lib` (which the
brief closes to change). They are server-side adapters that call existing lib functions — "moving a call site"
— and are imported at runtime only by `src/app` pages.

## 9. Closeout — 2026-09-24

| Landing | Commit | CI |
|---|---|---|
| (a) guard, red against 9 files / 11 edges | `080d3ce` | 36067623005 — success |
| (b) client components take props | `d8d3542` | 36069654107 — success |

- **`[P3-X9]` ticked:** 0 violators, 1 named exemption (`errorText`), allowlist empty.
- **`[P3-X7]` (U9's share):** red evidence recorded above — §3 (AC-1, AC-2, AC-6), §8 (R7f, R7g, M1–M12).
- **For the phase closeout** (recorded in the register's carry-forward list, item 3): `CLAUDE.md` §4's rule-7
  row ("Not enforced, 8 of 31") is stale — rule 7 is enforced by `client-props.test.ts` with the one named
  exemption. U9 could not edit `CLAUDE.md`.
- **Next:** U8, in a fresh session.
