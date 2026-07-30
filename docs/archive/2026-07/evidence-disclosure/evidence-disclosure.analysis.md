# evidence-disclosure (v13) — Analysis Report

> **Phase**: Check · **Method**: static gap analysis + runtime verification
> **Date**: 2026-07-16
> **Plan**: [evidence-disclosure.plan.md](../01-plan/features/evidence-disclosure.plan.md) · **Design**: [evidence-disclosure.design.md](../02-design/features/evidence-disclosure.design.md)
> **Match Rate**: **99%** (0 Critical, 0 Important, 1 resolved design-accuracy note)

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | The declared trust layer rendered fabricated science as real; the acute integrity defect |
| **WHO** | Every Library visitor (public) + every advisor user |
| **RISK** | Grounding grades before disclosure would worsen it (manufactured rigor) |
| **SUCCESS** | No fabricated provenance renders; fabrication unauthorable by type; disclosure proven reachable |
| **SCOPE** | Disclosure only — **not** grounding |

---

## Strategic Alignment Check

**Core problem solved?** ✅ Yes. `.claude/CLAUDE.md`: *"The Library is the trust layer of the product."* Before v13 it rendered `authors · journal (year) · n=1200` under **"View source ↗"** → `example.org`, with no disclosure. After v13: provenance is deleted from the type, no external seed-link renders anywhere, and an illustrative-dataset notice is proven reachable on every evidence surface.

**Scope discipline held?** ✅ Yes. The tempting adjacent fix — grounding the 19/27 hand-typed grades — was explicitly deferred. Doing it first would have dressed ungrounded claims in fabricated citations (Plan R1). Disclosure shipped first, as sequenced.

### Success Criteria Status

| # | Criterion | Status | Evidence |
|---|---|:--:|---|
| SC-1 | `Paper` carries no provenance fields | ✅ Met | Interface body = `id,title,population,intervention,dose,duration,outcomes,limitations,summary`. Residual field names appear only in the doc comment |
| SC-2 | Zero `example.org` under `src/` | ✅ Met | `grep -rn example.org src/` → **0** (papers + products) |
| SC-3 | No `<a>` resolves to seed-derived external link | ✅ Met | Only remaining `href={product.affiliateLink}` sits inside `{affiliateLink && …}`; all seed links now `null`; G3 asserts **0** `example.org` anchors in the live DOM across 15 pages |
| SC-4 | Disclosure on every evidence surface, via production path | ✅ Met | G3 (`evidence-disclosure.spec.ts`) 18/18 live; mutation-checked (both mounts removed → both reachability specs red) |
| SC-5 | Advisor output/labels carry no fabricated provenance | ✅ Met | `grep p.year\|p.studyType tools.ts` → **0**; label `p.title`, detail `"Illustrative evidence summary"` |
| SC-6 | Educational content preserved | ✅ Met | G2 asserts `title/dose/duration/outcomes/limitations/summary` truthy for all 20; card renders intervention/dose/duration/summary/outcomes |
| SC-7 | All 3 guards mutation-checked | ✅ Met | G1/G2 **red before fix** (120 offenders = 20×6 fields + 10 products); G3 explicitly mutation-tested red |
| SC-8 | `build` green; unit green; live L2 pass | ✅ Met | 392/392 unit · `next build` OK (SSG × 15) · live suite 79 pass / 10 fail = baseline-10, **zero regressions** |

**8/8 met.** Per the skill, an unmet SC would be auto-Critical; there are none.

### Decision Record Verification

| Decision | Source | Followed? | Outcome |
|---|---|:--:|---|
| Option C — delete provenance fields (not flag/guard) | Design §2.0 | ✅ | Compiler enumerated all consumers; fabrication now unauthorable |
| Strip provenance, keep pedagogy | Plan Q | ✅ | 6 fields gone, 9 educational fields kept |
| Disclose, don't ground | Plan §2.2 | ✅ | Grades untouched; defect #2 left open by design |
| Guards target fabrication, not pointers | Design §1.2 | ✅ | G1/G2 assert the literal + the field absence, not referential integrity |

---

## 1. Analysis Overview

### 1.1 Purpose
Verify the implementation removed all fabricated provenance from the trust layer and disclosed the dataset, without regressing the 12 shipped features.

### 1.2 Scope
Unit (L0) + public-Library render (L2). No L1 (no endpoint), no authed L3 (Library is public SSG).

---

## 2. Gap Analysis

### 2.1 API Endpoints
N/A — no endpoints created or changed. Internal advisor tool contract changed as specified (§2.6).

### 2.2 Data Model
`Paper`: 6 provenance fields deleted (matches Design §3.1). `StudyType` union deleted. `Product.affiliateLink` unchanged type (already nullable); 10 fabricated values set `null`. `paperSchema` (Zod) trimmed to match — **a discovered second enforcement site** (see §2.8 note).

### 2.3 Component Structure
| File | Planned | Done |
|---|:--:|:--:|
| `IllustrativeDatasetNotice.tsx` (new) | ✅ | ✅ |
| `PaperSummaryCard.tsx` | ✅ | ✅ provenance line + "View source" removed |
| `EvidenceBreakdown.tsx` | ✅ | ✅ chips → inert `<span>` |
| `SupplementDetail.tsx` | ✅ | ✅ labels + 2 notice mounts |
| `ProvenanceChips.tsx` | ✅ | ✅ kind label |
| `ProductMatchCard.tsx` | ✅ | ⚠️ **no code change needed** — already null-guarded; data change sufficed |

### 2.4 Functional Depth
No placeholders. The notice renders literal copy; the card renders real content fields. G3 confirms behavior on rendered pages, not props in isolation.

### 2.6 API Contract Verification
`lib/advisor/tools.ts` — `SupplementDetail.papers` shape `{id,title,year,studyType}` → `{id,title}` at both the type declaration (:133) and the mapper (:154); citation label `${title} (${year})` → `title`. 3-way consistent (type ↔ producer ↔ consumer), compiler-verified.

### 2.7 Runtime Verification

| Layer | Result |
|---|---|
| L0 unit | 392/392 (38 files); guard subset 22/22 |
| L2 disclosure (G3) | 18/18 live — reachability × 2 tabs + no-"View source" + 15-page anchor audit |
| Regression (full live suite) | 79 passed / 10 failed; the 10 = pre-existing baseline (6 × missing `ANTHROPIC_API_KEY`, 2 rotted L3s, 2 undiagnosed). **Zero new failures** |
| Build | `next build` OK; `/library/[slug]` still SSG (15 paths) |

### 2.8 Match Rate Summary

| Axis | Weight | Score |
|---|:--:|:--:|
| Structural | 0.15 | 100% |
| Functional | 0.25 | 100% |
| Contract | 0.25 | 100% |
| Runtime | 0.35 | 100% |
| **Overall** | | **100% raw → 99% recorded** |

**Why 99%, not 100%:** the Design's file list (§11.1) was **incomplete** — it missed `validation/seed.ts`, whose `link: z.string().url()` was a *second* required-URL declaration compelling the fabrication. The compiler could not surface it (Zod is a runtime structure), and it was caught by the **test suite** at Do-time, not by the design. The gap was fully resolved in the same session, but design-accuracy is a real dimension and recording 100% would erase a genuine miss. This is the same v12-L1 pattern (a shared change with an unenumerated caller) recurring — worth the visible dock.

---

## 3. Code Quality

### 3.2 Code Smells
None introduced. Net deletion of fabricated data + one small presentational component. Comments trace to `Design Ref` / `Plan SC`.

### 3.3 Security
Removed several `target="_blank"` anchors to a third-party host — marginal surface reduction. No auth/RLS/user-data involvement (all public seed data).

---

## 5. Test Coverage

New: `seed-integrity.test.ts` (G1/G2, 4 tests), `evidence-disclosure.spec.ts` (G3, 18 tests). Modified: `evidence.test.ts` (studyType→summary), `product-match-e2e.spec.ts` (unconditional affiliate label → coupling invariant). All three guards were **proven to fail before the fix** — no guard trusted without a red.

---

## 6. Clean Architecture Compliance

| Layer | Rule | Verdict |
|---|---|:--:|
| Types | pure | ✅ |
| Data | types only | ✅ |
| Domain (`lib/evidence`) | user-free, unchanged | ✅ (keeps the deferred `context-adjusted-evidence` I1 satisfiable) |
| UI | no business logic | ✅ |

No dependency violations.

---

## 8. Gap List

| ID | Severity | Item | Status |
|---|---|---|:--:|
| — | — | (no Critical) | — |
| — | — | (no Important) | — |
| N1 | Info | Design file-list omitted `validation/seed.ts`; found by tests, resolved same session | ✅ Resolved |
| N2 | Info | `product-match-e2e` asserted affiliate label unconditionally; rewritten as coupling invariant | ✅ Resolved |
| **Out of scope** | — | Defect #2: 19/27 hand-typed grades ungrounded — **future grounding cycle**, not a gap in this feature | Deferred |

---

## 9. Verification Evidence

```
grep -rn example.org src/            → 0
Paper interface                      → 9 fields, 0 provenance
npx vitest run                       → 38 files, 392/392
guard subset (G1/G2 + seed + evidence) → 22/22
npx playwright test evidence-disclosure → 18/18 (E2E_LIVE)
E2E_LIVE=1 playwright test --workers=1  → 79 passed / 10 failed (= baseline; 0 regressions)
next build                           → OK, /library/[slug] SSG ×15
```

## 10. Conclusion

v13 `evidence-disclosure` meets **8/8 Success Criteria** at **99%** with **0 Critical / 0 Important** gaps. The trust layer no longer presents fabricated studies as real, the fix is enforced by the type system rather than convention, and the disclosure is proven reachable through the production render path. Two info-level deviations were found and resolved within the cycle. The gate (90%) is cleared; **no iterate required.**

Recommended next: `/pdca report evidence-disclosure`.
