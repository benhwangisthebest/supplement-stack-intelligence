# p3-u4-profiles — appendix S4: candidate table for zinc-deficiency and vitamin-b12-deficiency

> Appendix to `p3-u4-profiles.plan.md`. **For owner decision.** Under ruling R7, S4 ran one live search: **12 calls, all HTTP 200, $0** (record: `docs/05-qa/2026-09-23-p3-u6-verification-record.md` §S4; captures: `content/verification/captures/2026-09-23-s4/`). As in U6, the search wrote nothing to the corpus or the fixture. **Every abstract excerpt below is checked against its committed SHA-256 (all match).** Each candidate is judged against the claim **as the Library states it**. None is on `DO_NOT_CITE`.

## vitamin-b12-deficiency — *"Reliably corrects B12 deficiency, especially relevant for plant-based diets."*

| # | Candidate | Type | What the abstract shows (paraphrase) | Fit to the claim | Recommendation |
|---|---|---|---|---|---|
| **B-1** | PMID **41487531** — *Efficacy of sublingual and oral vitamin B12 versus intramuscular administration: insights from a systematic review and meta-analysis.* Front Pharmacol 2025 | SR + MA; RCTs, cohort and case-control; 16 studies, 6,098 participants | Serum cobalamin rose (+402.6 pg/mL) and homocysteine fell (−4.83 µmol/L) across all routes. Routes did not differ, and neither did RCTs versus observational studies. Efficacy was comparable by age and clinical condition. I² > 80%, and possible publication bias. | **Direct**: it measures supplementation raising B12 status, including in older adults and malabsorption (gastrectomy). The authors flag the heterogeneity. | **Approve**, as a new paper id |
| **B-2** | PMID **29543316** — *Oral vitamin B12 versus intramuscular vitamin B12 for vitamin B12 deficiency.* Cochrane 2018 (CD004655.pub3) | SR of RCTs, no meta-analysis; 3 RCTs, 153 participants | In people with deficiency, oral and IM B12 normalised serum B12 similarly, on **low-quality** evidence. Only one trial was low or unclear risk of bias. No trial reported clinical signs or symptoms. | **Direct but thin**: randomised, in deficient people, and graded low quality. It would support studyQuality and the "RCT only" side honestly. | **Approve, optional.** Citing it beside B-1 shows the RCT evidence is small |
| B-3 | PMID 38231320 — network MA of routes, 2024 | SR + network MA; 13 comparative studies, 4,275 patients | All three routes raised B12 levels effectively, with no significant difference between them. | Direct, but it overlaps B-1 (routes compared, not supplement vs none) | Not recommended: redundant with B-1 |
| — | PMID 16034940 (Cochrane 2005) | earlier version of B-2 | — | superseded by B-2 | Not recommended |
| — | PMIDs 38189492, 38051700 | pregnancy outcomes | — | off-claim | Not recommended |
| — | Crossref: 3 conference abstracts or single trials (oral vs IM/IV) | no abstract in Crossref | — | R6: a title-only record supports nothing | Not recommended |

**If B-1 (± B-2) is approved:** following U6's process, one S2 `resolve` per identifier (**1–2 calls**) captures the fixture entry. The new paper's card fields are written from its abstract only, and the B12 profile is re-drafted against it. Per the abstract, B-1 would support a dimension for human evidence (16 studies, 6,098 people), consistency (reported I² > 80%, so weak), effect size (+402.6 pg/mL), and population (older adults, malabsorption, *"comparable efficacy across populations"*). **The resulting grade is not predicted here**, because it depends on the re-draft you review.

## zinc-deficiency — *"Effectively restores zinc status in deficient individuals."*

| # | Candidate | What it is | Fit to the claim | Recommendation |
|---|---|---|---|---|
| — | PMID 33724446 — *Zinc supplementation for improving pregnancy and infant outcome.* Cochrane 2021 | 25 RCTs, over 18,000 pregnant women; birth outcomes | Reports **no** zinc-status outcome. It planned a zinc-deficient subgroup but did not conduct it (*"very few studies used normal zinc populations"*) | **Off-claim** |
| — | PMIDs 32075071, 36849195 (×2), 27087396, 23764669 | multi-micronutrient pregnancy, iron in children and women, zinc for diarrhoea | none tests restoring zinc status | **Off-claim** |
| — | Crossref `10.61336/cmejgm/2025-12-30` — *Effects of Zinc Supplementation on Serum Zinc Concentrations and Cellular Immune Function in Older Adults with Marginal Zinc Status: A Randomized Controlled Pilot Trial* (2025) | Crossref only: **no abstract**, and the title states no direction of effect | On-topic by title, but **R6: title-only supports nothing**. The same test U6 applied to the NAC DOI (#20) | **Not recommended** |
| — | Crossref: allergy review, non-randomised open-label ARI study, and 3 off-claim reports | — | off-claim or non-randomised | Not recommended |

**Outcome for zinc, per R7:** *"if nothing supports the claims, their C grades stand."* **Nothing in S4 supports it.** `zinc-deficiency` stays at its B1 draft (**C, 0.4333**), and the summary correction (item 7) goes to B5.

## Decisions requested

1. **B12:** approve **B-1**, **B-1 + B-2**, or neither. Approving means an S2 capture of 1–2 calls, then card fields and a re-drafted B12 profile for your review.
2. **Zinc:** confirm there is no candidate, so C stands.

## Owner decisions (2026-09-23) and the B12 re-draft

**B12: B-1 and B-2 approved as new ids**, `p-b12-oral-routes` and `p-b12-oral-vs-im`, each a manifest `add`. **Zinc: no candidate confirmed.** C stands, `confidence` is set to agree with C, and the summary is corrected in B5. The card fields for the two new rows were written only from their abstracts (`content/seed/seed-papers.json`).

**Capture (S2, 2 calls, `captures/2026-09-23-s2d`): B-1 resolved, B-2 refused, and nothing was written** (the script writes all or nothing). B-2's PubMed title carries markup: `Oral vitamin B<sub>12</sub> versus intramuscular vitamin B<sub>12</sub> for vitamin B<sub>12</sub> deficiency.` (raw S4 efetch XML). `normaliseTitle` (`provenance.mjs:74`) turns a tag into a **space** (`b 12`). The approved title came from `plainText`, which removes tags without a space, so it reads `b12`. **A retry with the markup title would not fix it.** `applyResolved` stores the display title through `plainText` (`B12`) and puts the markup title in the fixture, and P4 then compares the two with `normaliseTitle` (`b12` ≠ `b 12`) and rejects the pair. **This is a gap in U5/U6's tooling, first hit here.** The only fixture title that already contains `<` is `<50 Years`, which is not a tag.

**The B12 profile, re-drafted to cite both.** Consistency is scored from B-1's stated heterogeneity and quality from B-2's *low quality*, and neither is rounded up:

| Effect | Composite | Derived grade | Grade at `fe0441d` |
|---|---|---|---|
| vitamin-b12-deficiency | 0.5167 | **C** | A (hand-typed) — **changes** |

| Effect | Dimension | Score | Rationale | paperIds | Basis (paraphrase of the abstract) |
|---|---|---|---|---|---|
| **vitamin-b12-deficiency** | humanEvidence | 2 (moderate) | 16 human studies (6,098 participants) of oral, sublingual or injected B12, mixing trials with observational studies; 3 small randomised trials compare oral with injected B12. | `p-b12-oral-routes` (PMID 41487531)<br>`p-b12-oral-vs-im` (PMID 29543316) | B-1: 16 studies, RCTs plus cohort and case-control, 6,098 participants; B-2: 3 RCTs, 153 participants with deficiency. |
|  | studyQuality | 1 (weak) | The randomised evidence is rated low quality, from 3 trials with 153 participants. | `p-b12-oral-vs-im` | B-2: low-quality evidence due to serious imprecision; only one trial at low or unclear risk of bias in all domains. |
|  | consistency | 1 (weak) | Substantial heterogeneity between studies (I² > 80% in most comparisons). | `p-b12-oral-routes` | B-1: I-squared above 80% in most comparisons; Egger's test suggested publication bias. |
|  | effectSize | 2 (moderate) | Serum cobalamin +402.6 pg/mL and homocysteine −4.83 µmol/L; no trial reported clinical signs or symptoms. | `p-b12-oral-routes`<br>`p-b12-oral-vs-im` | B-1 pooled differences for cobalamin and homocysteine; B-2 notes no trial measured clinical signs or symptoms of deficiency. |
|  | populationRelevance | 2 (moderate) | People with deficiency, with comparable effects across age groups and after gastrectomy; vegans using supplements had better B12 status than non-users. | `p-b12-oral-routes`<br>`p-b12-oral-vs-im`<br>`p-b12-deficiency` (PMID 39373282) | B-1: comparable efficacy by age and clinical condition; B-2: deficient participants; vegan subgroup: supplement users better on all biomarkers. |

The effect's `paperIds` becomes `p-b12-deficiency`, `p-b12-oral-routes`, `p-b12-oral-vs-im`. The result is **C (0.5167)**, the same letter as the B1 draft, now on three papers instead of one. **Population relevance is the swing dimension.** At 1 the composite is 0.4833 (C). At 3 it computes as **0.5499999999999999 → C**, although the exact value is 0.55, the B threshold. That is finding **F-1** in the cycle artifact. Confidence becomes `low`, because the seed's convention is exact: every A is `high`, every B `moderate`, every C `low`.
