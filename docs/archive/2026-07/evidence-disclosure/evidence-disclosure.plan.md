# evidence-disclosure (v13) — Plan

> **Summary**: Stop the Library — the declared trust layer — from rendering fabricated study provenance as real research.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: v13
> **Date**: 2026-07-16
> **Status**: Draft
> **Method**: PDCA (compact cycle — scope + architecture settled interactively; see §Brainstorming Log)

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | `.claude/CLAUDE.md` declares *"The Library is the trust layer of the product."* It renders **fabricated studies as real**: all 20 entries in `seed-papers.ts` are synthetic (`example.org` links, invented authors like "Branch JD, et al.", real journals, specific sample sizes like `n: 1200`, zero DOI/PMID). The file header admits this; **no UI surface does.** Users see `authors · journal (year) · n=1200` under a **"View source ↗"** anchor, and the advisor restates the same fabricated provenance as grounded, sourced fact. |
| **Solution** | **Make fabrication unauthorable at the type level.** Delete the six provenance fields (`authors`, `journal`, `link`, `year`, `sampleSize`, `studyType`) from `Paper`, keeping the educational content (`title`, `population`, `intervention`, `dose`, `duration`, `outcomes`, `limitations`, `summary`). The compiler then proves every consumer is fixed. Add an explicit illustrative-dataset disclosure, proven reachable on every surface. |
| **Function / UX Effect** | Evidence summaries keep their teaching value (what the evidence broadly says, at what dose, with what limitations) and lose the manufactured authority (fake people, venues, sample sizes, and dead source links). The advisor stops citing invented studies. Fake affiliate links are stripped from Product Match. |
| **Core Value** | The trust layer stops lying. A product that advises what people **ingest** must not dress ungrounded claims in the costume of research — and the fix is enforced by the compiler, not by a convention the next cycle re-breaks. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | The declared trust layer renders fabricated science as real; this is the acute integrity defect in the product |
| **WHO** | Every Library visitor (public, unauthenticated) + every advisor user |
| **RISK** | Fixing grades *before* disclosure would make it worse — grounding letters in fabricated papers manufactures rigor (see §6 R1) |
| **SUCCESS** | No fabricated provenance renders anywhere; fabrication is unauthorable by type; disclosure proven reachable |
| **SCOPE** | Disclosure only. **Not** grounding — grades stay as-is this cycle |

---

## 1. Problem Detail

Audited 2026-07-16 at `d89cf1c`; every claim independently verified this session.

| Defect | Evidence |
|---|---|
| All seed papers fabricated | `grep -c "id:" seed-papers.ts` → **20**; `grep -c "example.org"` → **20**; DOI/PMID → **0** |
| Header admits, UI doesn't | `seed-papers.ts:4` — *"Links are illustrative placeholders"*; **no disclosure exists** anywhere in `src/components/` or `src/app/` |
| Rendered as real research | `PaperSummaryCard.tsx:14` → `{authors} · {journal} ({year}) · n={sampleSize}`; `:43,48` → `href={paper.link}` **"View source ↗"** |
| Per-dimension citation chips | `EvidenceBreakdown.tsx:58,64` → `href={paper.link}`, label `"Branch 2018"` |
| **Advisor cites fabrications as grounded** | `lib/advisor/tools.ts:154` returns `{id,title,year,studyType}` to the LLM; `:173` labels citations `"${p.title} (${p.year})"` |
| Fake affiliate links | `seed-products.ts` → **10** `example.org` affiliateLinks; `ProductMatchCard.tsx:79` |

**Root cause: the type compels it.** `Paper.link: string` is **required** — every seeded paper *must* carry a link, and with no real literature that means `example.org` × 20. The fabrication is not an oversight; it is what the type demanded.

## 2. Scope

### 2.1 In Scope

- [ ] Delete 6 provenance fields from `Paper`; strip them from all 20 seed entries
- [ ] Inert (non-anchor) rendering of citation chips — reusing the existing `ProvenanceChips` idiom
- [ ] Illustrative-dataset disclosure component + mounting on every evidence surface
- [ ] Advisor tool output + citation labels drop `year`/`studyType`
- [ ] Strip 10 `example.org` affiliate links; `ProductMatchCard` renders inert
- [ ] User-visible label: "Papers" → "Evidence summaries"
- [ ] Three guards (§4), each proven to fail on current code first

### 2.2 Out of Scope

- **Grounding grades against real literature** — the discarded v14 scope. *Disclose before grounding.*
- **Badging the 19/27 hand-typed grades** — disclosure-adjacent, but invites drift into grounding; own cycle
- **Renaming `Paper` → `EvidenceSummary`** (Option B) — large refactor for a naming win
- **Authoring real papers** — requires real DOI/PMID; never invent

## 3. Success Criteria

- [ ] **SC-1** — `Paper` carries no `authors`/`journal`/`link`/`year`/`sampleSize`/`studyType`; the type makes provenance unauthorable
- [ ] **SC-2** — Zero `example.org` occurrences under `src/` (papers **and** products)
- [ ] **SC-3** — No `<a>` anywhere resolves to seed-derived external link data
- [ ] **SC-4** — Every surface rendering evidence summaries also renders the disclosure, **asserted through the production render path** (not the component in isolation)
- [ ] **SC-5** — Advisor tool output and citation labels contain no fabricated provenance
- [ ] **SC-6** — Educational content preserved: `title`, `population`, `intervention`, `dose`, `duration`, `outcomes`, `limitations`, `summary` still render
- [ ] **SC-7** — All three guards mutation-checked: each proven red on pre-fix code
- [ ] **SC-8** — `npm run build` green (**not** `typecheck` — see R3); full unit suite green; live L2 Library specs pass

## 4. Guards (test-enforced)

| ID | Guard | Rationale |
|---|---|---|
| **G1** | No `example.org` anywhere under `src/` | Anti-fabrication, blunt and unambiguous |
| **G2** | Seed objects carry no provenance fields | Unauthorable-by-construction |
| **G3** | **Disclosure reachability** — each evidence surface renders the notice via its production path | v11's lesson: a rule unreachable from its production caller is dead code. A disclosure component that exists but isn't mounted is that exact failure — and would let this ship "green" while still misleading users |

## 5. Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | `Paper` type drops the 6 provenance fields | High |
| FR-02 | All 20 seed entries stripped; header rewritten to state the dataset is illustrative | High |
| FR-03 | `PaperSummaryCard` renders content only — no provenance line, no "View source ↗" | High |
| FR-04 | `EvidenceBreakdown` chips render inert (no anchor, no dead link) | High |
| FR-05 | Disclosure notice mounted on Library detail (Effects + Evidence summaries tabs) | High |
| FR-06 | `advisor/tools.ts` tool output + citation labels drop `year`/`studyType` | High |
| FR-07 | `seed-products.ts` affiliate links stripped; `ProductMatchCard` inert | Medium |
| FR-08 | Visible label "Papers" → "Evidence summaries" | Medium |

## 6. Risks

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| **R1** | **Doing grades first would make this worse** — grounding letters in fabricated papers dresses ungrounded claims in rating bars and citation chips, manufacturing rigor | Critical | Sequence enforced: disclosure ships **before** any grounding |
| **R2** | A referential-integrity guard proves nothing over synthetic data (v14's "every paperId resolves" would pass on fabrications — it validates *pointers, not provenance*) | High | G1/G2 target the fabrication itself, not the pointers |
| **R3** | `npm run typecheck` is untrustworthy here (v12 L4 — stale `tsconfig.tsbuildinfo` masked errors `build` caught) | Medium | Gate on `npm run build` |
| **R4** | Disclosure exists but isn't mounted → ships "green", still misleads | High | G3 reachability, asserted through the production path |
| **R5** | Stripping fields breaks consumers silently | Low | Inverted into a benefit: removing **required** fields makes every consumer a compile error — coverage is compiler-proven |

## 7. Next Steps

1. [ ] Design doc → `/pdca design evidence-disclosure`
2. [ ] Implement (Checkpoint 4 approval required)
3. [ ] `/pdca analyze evidence-disclosure`

---

## Appendix: Brainstorming Log

| Question | Answer | Decision |
|---|---|---|
| v13 subject | Was `context-adjusted-evidence`; **halted** | v13 became `evidence-disclosure`; context-adjusted-evidence deferred to v14+ and needs revision (its M1 curation would have had Claude author population-specific evidence claims — fabrication in a different type signature; and its `populationRelevance` seam exists for only 8/27 effects) |
| How far should disclosure go? | **Strip provenance, keep content** | Fake authors/journals/n/studyType removed; dose/outcomes/limitations/summary retained. A badge beside "Branch JD, et al. · n=1200" doesn't survive a screenshot |
| Also badge hand-typed grades? | **No** | Keeps the cycle focused; grade provenance is the grounding problem |
| Architecture | **Option C — Pragmatic** | Delete provenance fields; compiler proves coverage; fabrication becomes unauthorable rather than discouraged. A (flag + render guards) leaves it authorable — the shape that produced the bug. B (rename entity) is a large refactor for a naming win |

## Version History

| Version | Date | Changes |
|---|---|---|
| 0.1 | 2026-07-16 | Initial — compact plan; v13 repurposed from context-adjusted-evidence after the trust-layer audit was verified |
