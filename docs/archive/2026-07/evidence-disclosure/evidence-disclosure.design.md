# evidence-disclosure (v13) — Design Document

> **Summary**: Delete fabricated provenance from the `Paper` type so the compiler proves no surface can render invented studies as real; disclose the dataset as illustrative, proven reachable.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: v13
> **Date**: 2026-07-16
> **Status**: Draft
> **Planning Doc**: [evidence-disclosure.plan.md](../../01-plan/features/evidence-disclosure.plan.md)

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | The declared trust layer renders fabricated science as real; this is the acute integrity defect in the product |
| **WHO** | Every Library visitor (public, unauthenticated) + every advisor user |
| **RISK** | Fixing grades *before* disclosure would make it worse — grounding letters in fabricated papers manufactures rigor |
| **SUCCESS** | No fabricated provenance renders anywhere; fabrication is unauthorable by type; disclosure proven reachable |
| **SCOPE** | Disclosure only. **Not** grounding — grades stay as-is this cycle |

---

## 1. Overview

### 1.1 Design Goals

1. Make fabricated provenance **unauthorable**, not merely absent — enforced by the compiler, not by reviewer vigilance.
2. Preserve the educational content that makes the Library worth visiting.
3. Disclose honestly, and **prove the disclosure is mounted** on every surface that shows evidence-derived content.
4. Ship small. This is a trust fix, not a redesign.

### 1.2 Design Principles

- **The type is the guard.** `Paper.link: string` being *required* is what compelled 20 fabricated URLs. Removing the field is a stronger fix than any lint rule or code review.
- **Delete provenance, keep pedagogy.** "Creatine, 3–5 g/day, 6–12 weeks, increases strength, heterogeneous protocols" teaches. "Branch JD, et al. · J Strength Cond Res (2018) · n=1200" manufactures authority the data does not have.
- **Reachability over existence.** (v11 lesson) A disclosure component that exists but isn't mounted is the same class of bug as a rule unreachable from its production caller.
- **Guards must target the fabrication, not the pointers.** (v14 lesson) Referential-integrity tests pass on fabrications.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | **Option C: Pragmatic** |
|---|:-:|:-:|:-:|
| **Approach** | `link?` + `isIllustrative` flag + render guards | Rename `Paper` → `EvidenceSummary`, remodel entity | Delete 6 provenance fields; keep type name + wiring |
| **New Files** | 1 | 3+ | 1 |
| **Modified Files** | ~7 | ~15 | ~9 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | **Low** — fabrication stays authorable | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | **Medium** — guard is a convention; same shape that produced the bug | Low (but wide blast radius) | Low |
| **Recommendation** | — | Long-term, if the entity is remodelled anyway | **Selected** |

**Selected: Option C** — **Rationale**: removing *required* fields converts every consumer into a compile error, so coverage is proven by `tsc`/`build` rather than by grep. Fabrication becomes structurally impossible instead of discouraged. Option A preserves the exact affordance that caused the defect (a `link` field that must be filled, with no real link to fill it). Option B's rename is semantically nicer but touches `Effect.paperIds`, `getPaperById`, `getPapersForEffect`, `citationHref`, the advisor `Citation` kind `"paper"`, and `ProvenanceChips` — a large refactor for a naming win on a cycle whose whole value is shipping honestly and soon.

### 2.1 Component Diagram

```
src/types/paper.ts ──────── Paper (6 provenance fields DELETED)
        │ compiler proves every consumer
        ▼
src/data/seed-papers.ts ─── 20 entries, provenance stripped, header rewritten
        │
        ├──▶ PaperSummaryCard.tsx      content only; no provenance line, no "View source ↗"
        ├──▶ EvidenceBreakdown.tsx     chips → inert <span> (ProvenanceChips idiom)
        ├──▶ SupplementDetail.tsx      label "Papers" → "Evidence summaries"
        │                              + <IllustrativeDatasetNotice/> mounted per tab
        └──▶ lib/advisor/tools.ts      tool output + citation labels drop year/studyType

src/data/seed-products.ts ─ 10 example.org affiliateLinks stripped
        └──▶ ProductMatchCard.tsx      inert when no link
```

### 2.2 Data Flow

```
build time (SSG — /library/[slug] is prerendered)
  getEffectsForSupplement() ─┐
  getPapersForEffect() ──────┤ lib/evidence (unchanged)
                             ▼
  SupplementDetail
    ├─ EffectsTab   → EvidenceBreakdown → inert chips  + Notice
    └─ PapersTab    → PaperSummaryCard  (content only) + Notice
  → static HTML · no external seed-derived href exists to render

advisor (runtime)
  tools.ts → { id, title } only  → LLM → ProvenanceChips (internal citationHref, already clean)
```

### 2.3 Dependencies

None added. No migration. No API change. `/library/[slug]` stays SSG.

---

## 3. Data Model

### 3.1 Entity Definition — `Paper` (after)

| Field | Kept? | Rationale |
|---|:-:|---|
| `id` | ✅ | Wiring (`Effect.paperIds`, `citationHref`, `#paper-{id}` anchors) |
| `title` | ✅ | Topic heading — reads as a subject, not a citation |
| `population` | ✅ | Educational (who the evidence concerns) |
| `intervention` | ✅ | Educational |
| `dose` | ✅ | Educational — a core Library value |
| `duration` | ✅ | Educational |
| `outcomes` | ✅ | Educational |
| `limitations` | ✅ | Educational — teaches uncertainty |
| `summary` | ✅ | Educational |
| `authors` | ❌ | **Fabricated people** ("Branch JD, et al.") |
| `journal` | ❌ | **Fabricated venue** attribution |
| `year` | ❌ | **Fabricated date** — also the advisor's citation label |
| `link` | ❌ | **Fabricated URL** — 20× `example.org`; the field that compelled the whole defect |
| `sampleSize` | ❌ | **Fabricated n** (`n: 1200`) — the strongest authority signal on the card |
| `studyType` | ❌ | **Fabricated design claim** ("meta-analysis") about a study that does not exist |

> `StudyType` union becomes unused → delete with the field.
> **Authoring order (v14 lesson):** strip the seed content **first**, then flip the type — so `tsc` proves coverage rather than the author asserting it.

### 3.2 `Product`

`affiliateLink: string | null` already permits `null` (2 entries use it). Set the 10 `example.org` values to `null`; no type change. `ProductMatchCard.tsx:79` already needs a null-guard.

---

## 4. API Specification

No endpoint changes. The Library ships no API and no migration — public SSR/SSG over seed data, so this cycle is fully verifiable without any authed surface.

Internal contract change (`lib/advisor/tools.ts`):

```diff
- .map((p) => ({ id: p.id, title: p.title, year: p.year, studyType: p.studyType }))
+ .map((p) => ({ id: p.id, title: p.title }))

- label: `${p.title} (${p.year})`,
- detail: p.studyType,
+ label: p.title,
+ detail: "Illustrative evidence summary",
```

---

## 5. UI/UX Design

### 5.1 `PaperSummaryCard` — before → after

| Element | Before | After |
|---|---|---|
| Title | `{paper.title}` | unchanged |
| Type pill | `{paper.studyType}` | **removed** |
| Provenance line | `{authors} · {journal} ({year}) · n={sampleSize}` | **removed** |
| Dose / Duration | `<dl>` | unchanged |
| Summary | `{paper.summary}` | unchanged |
| Outcomes & limitations | `<details>` | unchanged |
| Source link | `<a href={paper.link}>View source ↗</a>` | **removed** |

### 5.2 `EvidenceBreakdown` chips

`<a href={paper.link}>{authors.split(",")[0]} {year}</a>` → inert `<span>` labelled with `paper.title` (truncated), `title=` full title. Mirrors `ProvenanceChips`' documented idiom: *"others render as inert tags (no dead link)."*

### 5.3 `IllustrativeDatasetNotice` (new)

Copy (plain, non-alarming, consistent with the product's voice):

> **Illustrative dataset.** These evidence summaries are sample data written to demonstrate the product — they are not real studies and have no sources to cite. Dose ranges and outcomes reflect general scientific consensus, but nothing here should be treated as a citation.

Mounted in **`EffectsTab`** and **`PapersTab`** (the two surfaces rendering evidence-derived content).

### 5.4 Labels

| Location | Before | After |
|---|---|---|
| `SupplementDetail.tsx:28-30` tab label | `Papers (N)` | `Evidence summaries (N)` |
| `PapersTab` empty state | "No study summaries seeded yet." | "No evidence summaries seeded yet." |
| `ProvenanceChips.tsx:14` kind label | `paper: "Paper"` | `paper: "Evidence summary"` |

> Tab **`id`** stays `"papers"` and the `#paper-{id}` anchors are unchanged — v8's `anchorTabMap` deep-linking keeps working. Label-only change.

---

## 6. Error Handling

No new error paths. `ProductMatchCard` must null-guard `affiliateLink` (already nullable).

---

## 7. Security Considerations

Removing `target="_blank"` anchors to a third-party domain marginally reduces surface. No auth/RLS impact. No user data involved — all seed data, all public.

---

## 8. Test Plan

### 8.1 Scope

Unit + L2 (public Library render). No L1 (no endpoint), no L3 authed flow needed — the Library is public SSG.

### 8.2 Guards (each **mutation-checked**: proven red against pre-fix code)

| ID | Test | Assertion |
|---|---|---|
| **G1** | `src/data/seed-integrity.test.ts` | No `example.org` in any seed module (papers **and** products) |
| **G2** | same | No seed paper object carries `authors`/`journal`/`link`/`year`/`sampleSize`/`studyType` keys |
| **G3** | `tests/e2e/evidence-disclosure.spec.ts` (L2) | On a **real rendered** `/library/{slug}`: the notice is visible on Effects **and** Evidence-summaries tabs; **no** `a[href*="example.org"]` exists; no "View source" text |

> **G3 is the load-bearing one.** It asserts through the production render path — the v11 failure was a rule that passed 385 unit tests while being unreachable from production. A notice tested in isolation would repeat that exactly.

### 8.3 L2 Scenarios

1. `/library/creatine` → Effects tab shows the notice; breakdown chips are not anchors
2. `/library/creatine` → Evidence-summaries tab shows the notice; no "View source ↗"
3. Any catalog page → zero `example.org` anchors in DOM
4. Stack Lab product card → no `example.org` affiliate anchor

### 8.4 Regression

- `evidence.test.ts:52` (`expect(papers[0]?.studyType).toBeDefined()`) → **delete** (asserts the fabrication)
- v8 deep-link specs (`#paper-{id}` → papers tab) must stay green — label changed, id did not
- Full unit suite + `npm run build` (**not** `typecheck` — v12 L4)

---

## 9. Clean Architecture

### 9.4 Layer Assignment

| Layer | Files | Rule |
|---|---|---|
| **Types** | `types/paper.ts` | Pure; no imports |
| **Data** | `data/seed-papers.ts`, `data/seed-products.ts` | Types only |
| **Domain** | `lib/evidence` | **Unchanged** — still user-free (v13's `context-adjusted-evidence` I1 stays satisfiable) |
| **UI** | `components/evidence/*`, `components/library/*`, `components/stack/ProductMatchCard` | No business logic |
| **Adapter** | `lib/advisor/tools.ts` | Tool output shape only |

---

## 10. Coding Convention Reference

Existing conventions hold: seed-as-code, pure `lib/*`, no business logic in components. Comment convention per Do phase: `// Design Ref: §{n}` and `// Plan SC: {id}` at the guards.

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/types/paper.ts                                  M   remove 6 fields + StudyType
src/data/seed-papers.ts                             M   strip 20 entries + header
src/data/seed-products.ts                           M   10 affiliateLink → null
src/data/seed-integrity.test.ts                     C   G1 + G2
src/components/evidence/PaperSummaryCard.tsx        M   drop provenance + link
src/components/evidence/EvidenceBreakdown.tsx       M   chips → inert
src/components/evidence/IllustrativeDatasetNotice.tsx  C   the disclosure
src/components/library/SupplementDetail.tsx         M   labels + mount notice ×2
src/components/stack/ProductMatchCard.tsx           M   null-guard affiliate
src/components/advisor/ProvenanceChips.tsx          M   kind label
src/lib/advisor/tools.ts                            M   drop year/studyType
src/lib/evidence/evidence.test.ts                   M   delete studyType assertion
tests/e2e/evidence-disclosure.spec.ts               C   G3 (L2)
```
**3 created · 10 modified · 0 deps · 0 migrations**

### 11.2 Implementation Order

1. **Guards first, red.** Write G1/G2/G3 against current code; **watch them fail.** (v11: a guard not proven to fail is decoration.)
2. **Strip seed content** (`seed-papers.ts`, `seed-products.ts`) — content before type flip.
3. **Flip the type** (`paper.ts`) — `tsc` now enumerates every consumer.
4. **Fix consumers** the compiler names: `PaperSummaryCard`, `EvidenceBreakdown`, `tools.ts`, `evidence.test.ts`.
5. **Add the notice** + mount in `EffectsTab` / `PapersTab`; labels.
6. **`ProductMatchCard`** null-guard.
7. **Verify:** guards green · full unit suite · `npm run build` · `E2E_LIVE=1 npx playwright test evidence-disclosure --workers=1`.

### 11.3 Session Guide

| Module | Contents | Est. |
|---|---|---|
| **module-1** | Guards red → seed strip → type flip → consumer fixes (steps 1–4) | ~60% |
| **module-2** | Notice + mounts + labels + product card (steps 5–6) | ~30% |
| **module-3** | Verification (step 7) | ~10% |

Single session is realistic — the cycle is deliberately small.

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 0.1 | 2026-07-16 | Initial — Option C selected |
