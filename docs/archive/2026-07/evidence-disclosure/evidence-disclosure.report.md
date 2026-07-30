# evidence-disclosure (v13) — PDCA Completion Report

> Feature ID: `evidence-disclosure` · Version: **v13** · Phase: **Completed**
> Cycle: audit → `/pdca plan` → `/pdca design` → `/pdca do` → `/pdca analyze` → `/pdca report`
> Final Match Rate: **99%** · Date: 2026-07-16

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|---|---|
| Feature | evidence-disclosure (v13) |
| Duration | 1 session, 2026-07-16 |
| Cycle shape | Trust-layer audit (mid-design pivot) → Plan → Design → Do (3 modules) → Check (99%) → Report |
| Origin | v13 began as `context-adjusted-evidence`; halted at design when a memory-flagged trust-layer audit was verified true |

### 1.2 Results Summary

```
┌────────────────────────────────────────────────┐
│  Success Criteria:  8 / 8 met                  │
├────────────────────────────────────────────────┤
│  Match Rate:        99%                         │
│  Criticals:         0                           │
│  Important:         0                           │
│  Info (resolved):   2                           │
│  Regressions:       0  (79 pass / 10 baseline)  │
│  Iterate cycles:    0  (gate cleared first pass)│
└────────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Planned | Actually Delivered |
|---|---|---|
| **Problem** | The declared trust layer renders fabricated studies as real (20× `example.org`, invented metadata, "View source ↗", no disclosure) | ✅ Solved — provenance deleted from the type; **0** `example.org` under `src/`; disclosure proven reachable on every evidence surface |
| **Solution** | Make fabrication *unauthorable* by deleting the 6 provenance fields from `Paper`; disclose the dataset | ✅ Delivered as designed — Option C; compiler enumerated all consumers; 0 deps, 0 migrations |
| **Function / UX Effect** | Keep pedagogy (dose/duration/outcomes/limitations/summary), drop manufactured authority; advisor stops citing invented studies; strip fake affiliate links | ✅ All delivered — `PaperSummaryCard` content-only, chips inert, advisor tool trimmed, 10 affiliate links `null` |
| **Core Value** | The trust layer stops lying, enforced by the compiler not by convention | ✅ Achieved — `link` field gone ⇒ re-introducing fabrication is a type error; three guards, all mutation-checked |

**Metrics:** 392/392 unit · +22 guard tests (G1/G2/G3) · `next build` OK (SSG ×15) · live suite 79 pass / 10 fail (= pre-existing baseline, **zero regressions**) · 3 files created, 11 modified, 0 deps, 0 migrations.

---

## 1.4 Success Criteria Final Status

| # | Criterion | Status | Evidence |
|---|---|:--:|---|
| SC-1 | `Paper` carries no provenance fields | ✅ Met | Interface = 9 content fields; field names survive only in the doc comment |
| SC-2 | Zero `example.org` under `src/` | ✅ Met | `grep -rn example.org src/` → 0 |
| SC-3 | No `<a>` resolves to a seed-derived external link | ✅ Met | Sole residual `href` is behind `{affiliateLink && …}`; links now `null`; G3 asserts 0 in live DOM ×15 |
| SC-4 | Disclosure on every evidence surface, via production path | ✅ Met | G3 18/18 live; mutation-checked (mounts removed → red) |
| SC-5 | Advisor output/labels carry no fabricated provenance | ✅ Met | `p.year`/`p.studyType` → 0; label `p.title`, detail literal |
| SC-6 | Educational content preserved | ✅ Met | G2 asserts 6 content fields truthy ×20; card renders them |
| SC-7 | All 3 guards mutation-checked | ✅ Met | G1/G2 red before fix (120+10 offenders); G3 mutation-tested red |
| SC-8 | `build` green; unit green; live L2 pass | ✅ Met | 392/392 · build OK · live baseline-zero-regression |

**Success Rate: 8/8 fully met.**

## 1.5 Decision Record Summary

| # | Decision | Source | Followed? | Outcome |
|---|---|---|:--:|---|
| D1 | v13 subject → `evidence-disclosure`, not `context-adjusted-evidence` | Audit pivot | ✅ | Personalization would have *amplified* fabricated provenance; deferred to v14+ with plan flagged for revision |
| D2 | **Option C** — delete provenance fields, not flag/guard them | Design §2.0 | ✅ | Compiler proved consumer coverage; fabrication now a type error, not a convention |
| D3 | Strip provenance, keep pedagogy | Plan | ✅ | 6 fields removed, 9 kept; the Library stays worth visiting |
| D4 | Disclose before grounding | Plan §2.2 | ✅ | Grades untouched; defect #2 left open *by design*, now unblocked |
| D5 | Guards target fabrication, not pointers | Design §1.2 | ✅ | G1/G2 assert the literal + field-absence; a referential-integrity guard would have passed on fabrications |

---

## 2. Related Documents

- Plan: [evidence-disclosure.plan.md](../01-plan/features/evidence-disclosure.plan.md)
- Design: [evidence-disclosure.design.md](../02-design/features/evidence-disclosure.design.md)
- Analysis: [evidence-disclosure.analysis.md](../03-analysis/evidence-disclosure.analysis.md)

---

## 3. Completed Items

### 3.1 Functional Requirements

| ID | Requirement | Status |
|---|---|:--:|
| FR-01 | `Paper` drops 6 provenance fields | ✅ |
| FR-02 | 20 seed entries stripped + header rewritten | ✅ |
| FR-03 | `PaperSummaryCard` content-only, no "View source" | ✅ |
| FR-04 | `EvidenceBreakdown` chips inert | ✅ |
| FR-05 | Disclosure mounted on Effects + Evidence-summaries tabs | ✅ |
| FR-06 | Advisor tool drops `year`/`studyType` | ✅ |
| FR-07 | Affiliate links stripped; card inert (already null-guarded) | ✅ |
| FR-08 | "Papers" → "Evidence summaries" | ✅ |

### 3.3 Deliverables

**Created (3):** `src/data/seed-integrity.test.ts` (G1/G2), `src/components/evidence/IllustrativeDatasetNotice.tsx`, `tests/e2e/evidence-disclosure.spec.ts` (G3, 18 specs).

**Modified (11):** `types/paper.ts`, `data/seed-papers.ts`, `data/seed-products.ts`, `lib/validation/seed.ts`, `components/evidence/PaperSummaryCard.tsx`, `components/evidence/EvidenceBreakdown.tsx`, `components/library/SupplementDetail.tsx`, `components/advisor/ProvenanceChips.tsx`, `lib/advisor/tools.ts`, `lib/evidence/evidence.test.ts`, `tests/e2e/product-match-e2e.spec.ts`.

---

## 4. Incomplete Items

### 4.1 Carried Over

| ID | Item | Owner decision |
|---|---|---|
| **Defect #2** | 19/27 effect grades are hand-typed literals with no `evidenceProfile`; `EffectGradeBadge` renders derived and asserted letters identically. Some Grade-A claims rest on one (now provenance-free) summary each. | **Grounding cycle (v14?)** — requires real verified DOI/PMID literature, not recalled citations. Disclosure-first unblocked it |
| **context-adjusted-evidence** | Deferred to v14+; plan needs revision (3 recorded reasons incl. the 8/27 `populationRelevance` seam and the fabrication-amplification risk) | Revisit after grounding |

### 4.2 On Hold

- Renaming `Paper` → `EvidenceSummary` (Design Option B) — semantically nicer, large blast radius, no functional gain now.

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

Match Rate **99%** (Structural/Functional/Contract/Runtime all 100% raw; recorded 99% to preserve the design-accuracy miss below). 0 Critical, 0 Important.

### 5.2 Resolved Issues

| ID | Issue | Resolution |
|---|---|---|
| N1 | Design file-list omitted `validation/seed.ts` — its `link: z.string().url()` was a **second** required-URL declaration compelling fabrication. Not compiler-visible (Zod is runtime). | Caught by the test suite at Do-time; schema trimmed; recorded, not papered over |
| N2 | `product-match-e2e` asserted the affiliate label unconditionally — the copy lives inside the `{affiliateLink && …}` block | Rewritten as the durable coupling invariant: *an affiliate anchor never renders without its disclosure* |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)

- **Delete the field, don't guard it.** Removing a *required* field turned every consumer into a compile error — coverage proven by `tsc`, not grep. The root cause was itself a required field (`link: string`), so the fix and the diagnosis were the same move.
- **Guards written red first.** G1/G2 were authored before the fix and *watched to fail* (120 + 10 offenders); G3, written after, was explicitly mutation-tested. No guard trusted without a proven failure. (v11 lesson, applied.)
- **Verify the audit before acting on it.** Every claim in the trust-layer memory was independently re-checked against the tree before a line changed.

### 6.2 What Needs Improvement (Problem)

- **The design's file list was incomplete, and it recurred a known lesson.** Missing `validation/seed.ts` is the same v12-L1 pattern — a shared change with an unenumerated caller — surfacing *in the very cycle whose author cited L1*. A schema mirroring a type is an obvious second site; the design should enumerate type-mirroring schemas by default.
- **I regressed a live test I owned.** `product-match-e2e` broke because the design said "null-guard `ProductMatchCard`" without enumerating dependent *tests*. Design deltas need a "tests asserting the old contract" line.

### 6.3 What to Try Next (Try)

- **A standing check: "does any Zod/validation schema mirror this type?"** whenever a type changes. TypeScript cannot cross-check runtime schemas; only a test or a habit will.
- **Grounding cycle for defect #2**, sequenced exactly as disclosure was: real DOI/PMID, content authored before the type flip so the compiler proves coverage, `humanEvidence: 0` gated to "insufficient" in the domain.

---

## 7. Process Improvement Suggestions

### 7.1 PDCA Process
- The mid-design pivot (context-adjusted-evidence → evidence-disclosure) worked because the halt was cheap — no code had been written. Reinforces the HARD-GATE value of not implementing before the design is right.

### 7.2 Tools/Environment
- `.bkit-memory.json` was clobbered once mid-session by a concurrent write. If two sessions may touch this project, that file is a contention point.
- `ANTHROPIC_API_KEY` absent from `.env.local` keeps 6 advisor live specs red — an environment gap, not a code gap, but it masks real advisor regressions. Worth setting before the next advisor-touching cycle.

---

## 8. Next Steps

### 8.1 Immediate
- `/pdca archive evidence-disclosure` — bank the cycle.

### 8.2 Next PDCA Cycle
- **Grounding cycle (defect #2)** — the natural continuation on the trust layer, now unblocked.
- **Revise `context-adjusted-evidence` plan** before it resumes as v14+.

---

## 9. Changelog

### v13.0 (2026-07-16)
- Deleted 6 provenance fields from `Paper`; stripped 20 seed entries; trimmed `paperSchema`.
- `PaperSummaryCard` content-only; `EvidenceBreakdown` chips inert; advisor tool + labels trimmed.
- Added `IllustrativeDatasetNotice`, mounted on Effects + Evidence-summaries tabs.
- Nulled 10 fabricated affiliate links.
- Added guards G1/G2 (`seed-integrity.test.ts`) + G3 (`evidence-disclosure.spec.ts`), all mutation-checked.

---

## Version History

| Version | Date | Change |
|---|---|---|
| v13 | 2026-07-16 | Completion report — evidence-disclosure closed at 99%, 8/8 SC, 0 regressions. |
