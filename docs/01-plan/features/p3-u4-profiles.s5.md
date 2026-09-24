# p3-u4-profiles — appendix S5: candidate table for vitamin-d-deficiency and caffeine-focus

> Appendix to `p3-u4-profiles.plan.md`. **For owner decision.** Under ruling R16, S5 ran one live search with S4's process: **12 calls, all HTTP 200, $0**, no widening needed (record: `docs/05-qa/2026-09-23-p3-u6-verification-record.md` §S5; captures: `content/verification/captures/2026-09-24-s5/`). As in S4, the search wrote nothing to the corpus or the fixture. **Every abstract below was checked against its committed SHA-256 (all match).** Candidates are judged against each effect's claim **as the Library states it** at `fe0441d`. None is on `DO_NOT_CITE`, and none is already in the corpus. The paraphrases are ≤25 words each.

## vitamin-d-deficiency — *"Effectively raises serum 25(OH)D in deficient individuals."*

Its current paper (22552031) compares **D3 with D2**. It never tests supplementation against none, and it does not study deficient people (B5 §5).

| # | Candidate | Design | What the abstract shows | Fit | Recommendation |
|---|---|---|---|---|---|
| **V-1** | PMID **34473295**, *Effects of Vitamin D Supplementation on Insulin Sensitivity and Secretion in Prediabetes.* J Clin Endocrinol Metab 2022 | RCT (secondary analysis of the D2d trial), D3 4000 IU/day vs placebo, 24 months | Serum 25(OH)D rose from 27.9 to 54.9 ng/mL on D3 and was unchanged on placebo. The participants were adults with prediabetes, not selected for vitamin D status. | **Direct supplement-vs-placebo rise in 25(OH)D.** Population not selected as deficient | **Approve** |
| **V-2** | PMID **34718374**, *The Effect of Maternal Vitamin D Supplementation on Vitamin D Status of Exclusively Breastfeeding Mothers…* Adv Nutr 2022 | Meta-analysis, 19 controlled trials, 3,337 breastfeeding mothers | 1000 IU/day raised 25(OH)D by 7.8 ng/mL, with a non-linear dose-response. Doses above 6000 IU/day corrected deficiency in mothers and infants. | Direct, **dose-response**, and deficiency correction at high dose. Population: lactating women | **Approve** |
| V-3 | PMID 39396907, *Efficacy of weekly versus daily cholecalciferol for repleting serum vitamin D (25(OH)D) deficiency…* 2024 | Meta-analysis, 8 RCTs, 542 people with hypovitaminosis D | Weekly and daily dosing did not differ in correcting deficiency (I² 85.3%). Most studies were at risk of bias. | Deficient population, but it compares **regimens**, not supplement vs none, and gives no repletion rate | Optional: shows regimen equivalence and heterogeneity |
| — | PMID 31809869 (correcting deficiency and arterial stiffness) | Placebo RCTs in deficient adults | The outcome is arterial stiffness; the abstract does not report the 25(OH)D change | Off-claim | Not recommended |
| — | PMIDs 35939577 (fractures), 30089075 (pregnancy/infant growth); Crossref: 3 title-only records | | | Off-claim or title-only (R6) | Not recommended |

## caffeine-focus — *"Strong evidence for improved alertness, reaction time, and vigilance."* Population: *healthy adults*

Its current papers are one RCT of 20 sleep-restricted soldiers (25527035) and 23108937, which found little alertness benefit in non-low habitual consumers.

| # | Candidate | Design | What the abstract shows | Fit | Recommendation |
|---|---|---|---|---|---|
| **C-1** | PMID **20464765**, *Caffeine for the prevention of injuries and errors in shift workers.* Cochrane 2010 | Systematic review with meta-analysis, 13 RCTs | Caffeine improved orientation and attention (SMD −0.55) and memory, and reduced errors, compared with placebo. There was a high risk of bias, mostly young participants, and simulated conditions. | Direct on attention, **in shift workers and jet lag**, not rested healthy adults | **Approve** |
| **C-2** | PMID **28969341**, *Caffeine to optimize cognitive function for military mission-readiness: a systematic review…* Nutr Rev 2017 | Systematic review of 25 RCTs, no meta-analysis | In sleep-deprived subjects, caffeine improved attention and vigilance, complex reaction time, and problem solving. | Direct on vigilance and reaction time, **under sleep deprivation** | **Approve** |
| C-3 | PMID 35684105, *The Matrix Matters: Beverage Carbonation Impacts the Timing of Caffeine Effects on Sustained Attention.* Nutrients 2022 | Randomised controlled crossover trial, 24 healthy adults | A caffeinated beverage improved hits, reaction time and false alarms on a 60-minute sustained-attention task, compared with a flavour-matched control. | One of the few **rested healthy adult** results; small; beverage-matrix design | Optional |
| C-4 | PMID 20521321, *Effects of caffeine and glucose, alone and combined, on cognitive performance.* Hum Psychopharmacol 2010 | Double-blind RCT, 72 healthy adults aged 18–25 | Caffeine alone (75 mg) improved only simple reaction time. The attention and memory benefits appeared only with glucose. | **Rested healthy adults: limited effect.** Pairs with 23108937 | Optional: honest about limits |
| — | PMID 25113164 (shift-work pharmacology, Cochrane 2014) | | Only one trial was caffeine plus naps | Off-claim | Not recommended |
| — | Crossref: 1998 trial record and unrelated items, all title-only | | | R6 | Not recommended |

## What each decision leads to

Any approved PMID gets one S2 `resolve` call, with its body saved. That records the fixture entry, and then the card fields are written from the abstract only. I estimate at most 4–6 calls; it needs your separate go. B6 then drafts vitamin-d-deficiency and caffeine-focus citing whatever is approved. Their populations will be stated as the papers give them: **the approved caffeine evidence is mostly sleep-deprived or shift-work populations**, and the B6 `relevantPopulation` and summary will say so. **If you approve none**, B6 drafts each against its current papers, and the R12/R13 grades in B5 §5 (vitamin-d-deficiency C, caffeine-focus C) stand as the draft.

**Decisions requested:** (1) vitamin D: V-1, V-2, V-3, or any combination, or none. (2) caffeine: C-1, C-2, C-3, C-4, or any combination, or none. (3) The go for the S2 capture calls.
