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
