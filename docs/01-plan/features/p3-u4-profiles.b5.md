# p3-u4-profiles — appendix B5: summary corrections, the two re-judged dimensions, and the R12/R13 check

> Appendix to `p3-u4-profiles.plan.md`. **Owner-approved as drafted, 2026-09-24.** Every proposed summary is written **only from its effect's cited, verified abstract** (R1). It states less where the abstract supports less, and uses the required hedged posture ("may", "has evidence for"). An effect with no usable abstract says *"No verified evidence in this library"*, per the owner's U7 principle. All 14 pass `containsBannedLanguage` (checked by script). **No grade changes in B5 itself.**

## 1. Summary corrections (14)

| # | Effect | Source | Current summary | Proposed summary | Cites | Basis (paraphrase of the abstract) |
|---|---|---|---|---|---|---|
| 1 | **melatonin-sleep** (A) | R3(a) item 1; [P3-X5] | Reduces sleep-onset latency and helps shift circadian timing; lower doses often sufficient. | May modestly shorten sleep-onset latency (about 7 minutes) and improve sleep quality in primary sleep disorders; higher doses and longer use showed larger effects. | p-melatonin-sleep (PMID 23691095) | 19 RCTs, 1683 subjects: latency -7.06 min, total sleep +8.25 min, quality SMD 0.22; larger with higher dose and longer use; authors say modest. |
| 2 | **berberine-metabolic** (B) | R3(a) item 4 | May lower fasting glucose and HbA1c; effect size comparable to some first-line agents in small trials. | May lower HbA1c and fasting glucose in type 2 diabetes, alone or added to standard therapy. | p-berberine-metabolic (PMID 34956436) | 46 RCTs: HbA1c MD -0.73, FPG MD -0.86, berberine alone or with standard diabetic therapies versus control. |
| 3 | **vitamin-b12-deficiency** (B) | R3(a) item 6 | Reliably corrects B12 deficiency, especially relevant for plant-based diets. | Oral, sublingual and injected B12 raised serum B12 comparably in people with deficiency, on low-quality randomised evidence; vegans using supplements had better B12 status than non-users. | p-b12-oral-routes, p-b12-oral-vs-im, p-b12-deficiency | B-1: all routes raised cobalamin, no route difference; B-2: similar normalisation, low quality; vegan subgroup: users better on all biomarkers. |
| 4 | **zinc-deficiency** (C) | R3(a) item 7 | Effectively restores zinc status in deficient individuals. | Higher zinc intake is associated with modestly higher serum zinc (about 6% per doubling of intake); the cited evidence does not analyse deficient individuals. | p-zinc-deficiency (PMID 23244547) | Pooled intake-status beta 0.08, about 6% per doubling; adults generally; no deficient subgroup reported. |
| 5 | **caffeine-training** (A) | R9 | Improves endurance and reduces perceived exertion across many trials. | Has evidence for improved endurance running performance, mainly time to exhaustion, in recreational and trained runners. | p-caffeine-training (PMID 36615805) | 21 crossover RCTs: time to exhaustion g 0.39 (medium), time trials g -0.10 (small); no perceived-exertion outcome reported. |
| 6 | **magnesium-metabolic** (C) | B2 ruling | Possible small improvements in insulin sensitivity in deficient individuals. | May improve glucose measures and insulin-sensitivity markers in people with or at high risk of diabetes. | p-magnesium-glucose (PMID 34836329) | Double-blind RCT meta-analysis: fasting glucose fell in diabetes; glucose and insulin-sensitivity markers improved in high-risk people; magnesium status not reported. |
| 7 | **l-theanine-focus** (B) | B3 ruling | Combined with caffeine, improves attention and reduces jitteriness in several trials. | Combined with caffeine, may improve some attention measures in healthy people; the effects are small and uncertain. | p-ltheanine-focus (PMID 40314930) | Theanine plus caffeine: vigilance SMD 0.20, attention switching SMD 0.33; intervals often cross zero; no jitteriness outcome. |
| 8 | **l-theanine-stress** (D) | B3 ruling | May reduce acute stress and support relaxation without sedation. | May reduce heart-rate and salivary IgA responses to acute stress; the evidence is one small laboratory trial. | p-ltheanine-stress (PMID 16930802) | 12 participants, mental arithmetic stressor: reduced heart-rate and s-IgA responses versus placebo; sedation not assessed. |
| 9 | **glycine-sleep** (D) | B3 ruling; R6 | Pre-bed glycine may improve subjective sleep quality and next-day alertness. | No verified evidence in this library: the one cited paper has no abstract to summarise. | p-glycine-sleep (DOI only, title-only) | R6: the DOI-verified paper is title-only; no finding can be stated from it. |
| 10 | **ashwagandha-sleep** (B) | B3 ruling | Some evidence for improved sleep, often secondary to stress reduction. | May modestly improve sleep in adults, with larger effects in insomnia, at 600 mg/day or more and over 8 weeks or longer. | p-ashwagandha-sleep (PMID 34559859) | 5 RCTs, 400 adults: small but significant effect (SMD -0.59); larger in insomnia, at >=600 mg/day and >=8 weeks. |
| 11 | **zinc-immune** (C) | B4 ruling | Lozenges started early may modestly reduce common-cold duration. | Used as treatment, zinc may shorten colds (low-certainty evidence); it shows little or no effect on preventing them. | p-zinc-immune (PMID 38719213) | Cochrane 2024: treatment duration -2.37 days, low certainty; prevention RR 0.93, little or no effect; timing not analysed. |
| 12 | **taurine-training** (C) | B4 ruling | Small possible endurance benefits; evidence mixed. | Has evidence for improved endurance performance, with similar benefit for single or repeated doses of 1–6 g. | p-taurine-training (PMID 29546641) | 10 studies: g 0.40 overall, 0.43 time to exhaustion; no acute-versus-chronic difference; dose did not moderate. |
| 13 | **nac-antioxidant** (D) | B4 ruling; R5 | Raises glutathione; broad clinical benefits remain context-dependent. | No verified evidence in this library: this effect cites no paper. | none | R5: no cited paper (U6 #20 removed the only candidate). |
| 14 | **protein-powder-recovery** (D) | B4 ruling; R5 | Supports post-exercise recovery and appetite control. | No verified evidence in this library: this effect cites no paper. | none | R5: no cited paper (U6 S3 found none). |

## 2. `[P3-X5]`: the melatonin correction as the recorded demonstration

Row 1 lands **first, in its own commit**, before the other 13, so that the demonstration is one change:
1. Edit **only** `content/seed/seed-effects.json`: melatonin-sleep's `summary`.
2. Run `npm run content:generate`, which rewrites `src/data/seed-effects.ts`. **Nothing under `src/` is hand-edited**; `CONTENT_FIDELITY` fails any hand edit.
3. Record in the cycle artifact: the JSON diff (one line), the regenerated constant's diff, and `content:generate --check` → 0 stale.
4. **P-12 test** (new, `src/architecture/`, or beside `CONTENT_FIDELITY`): take the authored effects, change one `summary` in memory, and run `emitModule` for the effects module. The emitted text must differ from the committed module and contain the new summary. With the authored JSON unchanged, the output must equal the committed module byte for byte. **Red proof:** make the emitter drop `summary`, and the test fails.

## 3. The two re-judged dimensions (R3(b))

U6 removed each one's citation, and R5 now makes an uncited score of 2 or 3 unsupportable. Both are re-judged from the effect's own verified abstract:

| Effect | Dimension | Now | Proposed | Rationale | paperIds | Basis | Composite, grade |
|---|---|---|---|---|---|---|---|
| **magnesium-sleep** | populationRelevance | 2, *(empty)*: "Largest in adults with suboptimal magnesium." | **1** | Older adults with insomnia; magnesium status is not reported in the abstract. | `p-magnesium-sleep` (PMID 33865376) | 3 RCTs, 151 older adults with insomnia; no magnesium-status measure. | 0.617 → 0.583, **B → B** |
| **melatonin-sleep** | populationRelevance | 3, *(empty)*: "Directly relevant to delayed onset and jet lag." | **1** | Adults and children with primary sleep disorders; jet lag and delayed sleep phase are not studied. | `p-melatonin-sleep` (PMID 23691095) | Participants: adults and children with primary sleep disorders; no circadian or jet-lag population. | 0.883 → 0.817, **A → A** |

**R5 guard**, added with these: every dimension with `score > 0` has a non-empty `paperIds`. **Red proof:** at the current tree it fails on exactly these two dimensions, and nothing else.

## 4. AC-3: the seed-text safety sweep

A new guard in `seed-integrity.test.ts` runs `containsBannedLanguage` (`src/lib/safety`, unchanged) over **every `summary` and every dimension `rationale`** in `content/seed/seed-effects.json`: 27 summaries and 135 rationales. It includes an anti-vacuity count. **Red proof:** plant a banned phrase in one rationale, see the test fail, and restore from backup (shasum equal). A planted phrase the sweep misses is a **stop condition**. All 14 proposed summaries above pass it already (checked by script).

## 5. The R12/R13 check of the 8 original profiles. **Listed, not changed.**

Each original dimension was re-judged against its **verified** cited abstract, using the rules U4's 19 used (R1, R5, R12, R13; consistency only from a heterogeneity figure or a subgroup comparison). The *after B5* column includes §3's two re-judgements.

| Effect | Scores after B5 (hE·sQ·co·eS·pR) | Grade | Under R12/R13 | Grade | Dimensions that differ |
|---|---|---|---|---|---|
| magnesium-sleep | 2·2·2·1·1 | B (0.583) | 1·1·0·2·1 | **D (0.317)** | hE, sQ, co, eS |
| creatine-strength | 3·3·3·3·2 | A (0.967) | 3·2·2·3·2 | A (0.817) | sQ, co |
| creatine-cognition | 2·1·1·1·2 | C (0.467) | 2·1·1·0·2 | C (0.417) | eS |
| vitamin-d-deficiency | 3·3·3·2·3 | A (0.950) | 1·2·1·0·1 | **C (0.367)** | all five |
| fish-oil-cardiovascular | 2·3·2·1·2 | B (0.700) | 3·2·2·2·2 | **A (0.767)** | hE, sQ, eS |
| melatonin-sleep | 3·3·2·2·1 | A (0.817) | 3·2·2·1·1 | **B (0.683)** | sQ, eS |
| ashwagandha-stress | 2·2·2·2·2 | B (0.667) | 2·1·1·3·2 | B (0.567) | sQ, co, eS |
| caffeine-focus | 3·3·3·2·2 | A (0.917) | 2·2·1·0·2 | **C (0.500)** | hE, sQ, co, eS |

**Why each differs**, from the verified abstract:
- **magnesium-sleep** (33865376): **3 RCTs, 151 older adults**, all at moderate-to-high risk of bias, and *low to very-low quality* evidence (hE 1, sQ 1). No heterogeneity figure (co 0). Sleep-onset latency was **−17.4 min**, while total sleep time was not significant (eS 2). The current rationales (*"Human trials, several…"*, *"Subjective sleep benefit recurs"*) are not what the abstract says.
- **creatine-strength** (39519498): placebo comparisons, but the abstract gives **no randomisation or risk-of-bias** detail (sQ 2, the convention used for the 19). Males gained significantly, **females did not**, which contradicts *"replicate across populations"* (co 2).
- **creatine-cognition** (29704637): no magnitudes are reported (eS 0).
- **vitamin-d-deficiency** (22552031): the cited meta-analysis **compares vitamin D3 with D2**. It does not compare supplementation against none, and it does not study deficient people. Its finding is *D3 raised 25(OH)D more than D2, with bolus dosing; the advantage was lost with daily dosing*. So hE 1 (no supplement-vs-none result), sQ 2, co 1 (the result depends on regimen), eS 0 (P-values only), pR 1 (the authors could not verify effects across age, sex or ethnicity).
- **fish-oil-cardiovascular** (37264945, 39163858): **90 RCTs, 72,598 participants**, with near-linear triglyceride lowering, so hE **3** (the current 2 undercounts). No risk-of-bias rating (sQ 2). The T2D trial: TG −1.51 vs −0.66 mmol/L (eS 2).
- **melatonin-sleep** (23691095): no risk-of-bias rating (sQ 2). The authors call the effects **modest**, ~7 minutes of latency (eS 1). This is U4 item 1.
- **ashwagandha-stress** (37832082, 36017529): the meta-analysis rates certainty **low** (sQ 1). Stress **I² 83.1%** (co 1). Stress SMD **−1.75** (eS 3). At eS 2 the composite is 0.517, which is **C**, so this row sits on a boundary.
- **caffeine-focus** (25527035, 23108937): one RCT of **20 sleep-restricted soldiers** and one double-blind study of 369 people, in which caffeine gave **little alertness benefit in non-low consumers** (hE 2, co 1). Neither is a crossover series (sQ 2). No magnitudes (eS 0). This is U4 item 5.

**Also found, and not in any ruling: the 8 original rationales were not drafted from these abstracts.** Several state things the abstracts do not show, e.g. *"Large human literature on alertness"*, *"Numerous controlled crossover trials"*, *"Well-controlled dose-response data"* and *"Findings replicate across populations"*. That breaks U4 hard rule 1 for 40 rationale strings U4 did not write. **Proposed:** a **B6** that re-drafts the 8 original profiles under R1 exactly as the 19 were drafted: scores, rationales and `paperIds`, with the same review table. The five grade moves above would then land as reviewed content, not as a silent change. Or rule each row here.

## 6. Raised, not edited

1. **Original-8 summaries** that overstate their verified abstracts. None is in any B5 ruling:
   - caffeine-focus: *"Strong evidence for improved alertness…"*
   - vitamin-d-deficiency: *"Effectively raises serum 25(OH)D in deficient individuals"*
   - creatine-strength: *"…and lean mass"* (the abstract reports strength only)
   - magnesium-sleep: *"…or those with low intake"*
   - ashwagandha-stress: *"Multiple trials…"* (the cited trial is one)
2. **`relevantPopulation`** also disagrees with the cited papers in places, e.g. melatonin-sleep's *"adults with delayed sleep onset, jet lag"*. It is not in U4's *May touch*.
