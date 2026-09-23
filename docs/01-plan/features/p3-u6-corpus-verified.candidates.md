# p3-u6-corpus-verified — appendix: S1 candidate table

> Appendix to `p3-u6-corpus-verified.plan.md` §6. **Generated** from `content/verification/captures/2026-09-23-s1/candidates.json` (resolver data, captured 2026-09-23, S1, 96 calls) plus the agent's verdicts. **Verdicts are Claude's judgement** against the row's *Library claim* (`libraryClaim`, copied from the seed JSON), made from the captured abstract, and **are not decisions**. Every mapping is the owner's call (R1). Verdicts: **supports** · partial · doesn't · title only (a Crossref record with no abstract captured). "Excerpt" is the first 120 characters of the committed ≤300-character excerpt. The full abstract is local, and its SHA-256 is in `candidates.json`. Source files: `crossref.json` and `esearch.json` (committed), and `local/…/efetch.xml` (gitignored; its SHA-256 is committed).

## 1. `paper:p-creatine-strength` — **no full support — owner decides**

**Library claim:** Creatine Monohydrate — Strength & power output (Grade A): Robust evidence for improved strength, power, and lean mass when combined with resistance training.

PubMed scope: filtered · query `creatine supplementation resistance training strength lean mass meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 37432300 | 10.3390/nu15092116 | Meta-Analysis, Systematic Review | 2023 | Nutrients | The Effects of Creatine Supplementation Combined with Resistance Training on Regional Measures of Muscle Hypertrophy: A Systematic Review with Meta-Analysis. | The purpose of this paper was to carry out a systematic review with a meta-analysis of randomized controlled trials that… | partial | hypertrophy only (small increase); strength/power not the outcome | efetch.xml (local) |
| 2 | 39074168 | 10.1519/JSC.0000000000004862 | Systematic Review, Meta-Analysis | 2024 | Journal of strength and conditioning research | The Effect of Creatine Supplementation on Resistance Training-Based Changes to Body Composition: A Systematic Review and Meta-analysis. | Desai, I, Wewege, MA, Jones, MD, Clifford, BK, Pandit, A, Kaakoush, NO, Simar, D, and Hagstrom, AD. The effect of creati… | partial | lean mass up, fat down with RT; no strength outcome | efetch.xml (local) |
| 3 | 35986981 | 10.1016/j.nut.2022.111791 | Meta-Analysis, Systematic Review | 2022 | Nutrition (Burbank, Los Angeles County, Calif.) | Influence of age, sex, and type of exercise on the efficacy of creatine supplementation on lean body mass: A systematic review and meta-analysis of randomized clinical trials. | Creatine supplementation has been shown to increase measures of lean body mass (LBM); however, there often is high heter… | partial | LBM up with RT (larger in males); no strength outcome | efetch.xml (local) |

## 2. `paper:p-creatine-cognition` — candidate supports

**Library claim:** Creatine Monohydrate — Cognitive performance (Grade C): Emerging evidence for cognitive benefits, strongest under sleep deprivation or in vegetarians.

PubMed scope: filtered · query `creatine supplementation cognitive performance sleep deprivation`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 42075005 | 10.3390/nu18081192 | Randomized Controlled Trial | 2026 | Nutrients | Single-Dose Creatine Reduces Sleep Deprivation-Induced Deterioration in Cognitive Performance. | Background/Objectives: Creatine is a supplement that, beyond its physiological effects, has been shown to have positive … | **supports** | single dose reduced sleep-deprivation cognitive decline | efetch.xml (local) |
| 2 | 17046034 | 10.1016/j.physbeh.2006.08.024 | Randomized Controlled Trial | 2007 | Physiology & behavior | Creatine supplementation, sleep deprivation, cortisol, melatonin and behavior. | The effect of creatine supplementation and sleep deprivation, with intermittent moderate-intensity exercise, on cognitiv… | partial | effect limited to complex executive tasks under sleep loss | efetch.xml (local) |
| 3 | 18579168 | 10.1016/j.physbeh.2008.05.009 | Randomized Controlled Trial | 2008 | Physiology & behavior | Creatine supplementation does not improve cognitive function in young adults. | Creatine supplementation has been reported to improve certain aspects of cognitive and psychomotor function in older ind… | partial | no benefit without sleep deprivation — consistent with 'strongest under' framing, not a positive finding | efetch.xml (local) |

## 3. `paper:p-melatonin-sleep` — candidate supports

**Library claim:** Melatonin — Sleep onset (Grade A): Reduces sleep-onset latency and helps shift circadian timing; lower doses often sufficient.

PubMed scope: filtered · query `melatonin sleep onset latency meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 38888087 | 10.1111/jpi.12985 | Systematic Review, Meta-Analysis | 2024 | Journal of pineal research | Optimizing the Time and Dose of Melatonin as a Sleep-Promoting Drug: A Systematic Review of Randomized Controlled Trials and Dose-Response Meta-Analysis. | Previous studies have reported inconsistent results about exogenous melatonin's sleep-promoting effects. A possible expl… | **supports** | dose/timing meta-analysis; efficacy optimised by earlier, higher dose — onset/TST outcomes | efetch.xml (local) |
| 2 | 23691095 | 10.1371/journal.pone.0063773 | Meta-Analysis | 2013 | PloS one | Meta-analysis: melatonin for the treatment of primary sleep disorders. | STUDY OBJECTIVES: To investigate the efficacy of melatonin compared to placebo in improving sleep parameters in patients… | **supports** | reduces sleep-onset latency, raises TST; modest effect | efetch.xml (local) |
| 3 | 36701954 | 10.1016/j.smrv.2023.101746 | Systematic Review, Network Meta-Analysis | 2023 | Sleep medicine reviews | Efficacy and tolerability of pharmacological treatments for insomnia in adults: A systematic review and network meta-analysis. | Insomnia is one of the most common and burdensome disorders in adults. We compared and ranked insomnia medication on the… | partial | network MA of insomnia drugs; melatonin-receptor agonists, not melatonin alone | efetch.xml (local) |

## 4. `paper:p-magnesium-sleep` — **no full support — owner decides**

**Library claim:** Magnesium — Sleep quality (Grade B): May improve subjective sleep quality, particularly in older adults or those with low intake. | Magnesium — Stress & relaxation (Grade C): Emerging evidence for stress symptom reduction, often combined with B6.

PubMed scope: filtered · query `magnesium supplementation insomnia elderly randomized placebo`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 33865376 | 10.1186/s12906-021-03297-z | Meta-Analysis, Systematic Review | 2021 | BMC complementary medicine and therapies | Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis. | BACKGROUND: Magnesium supplementation is often purported to improve sleep; however, as both an over-the-counter sleep ai… | partial | older adults with insomnia; RCTs may support, but low to very-low quality — sleep only, stress effect not addressed | efetch.xml (local) |
| 2 | 39534260 | 10.3389/fendo.2024.1370733 | Randomized Controlled Trial | 2024 | Frontiers in endocrinology | Effects of magnesium and potassium supplementation on insomnia and sleep hormones in patients with diabetes mellitus. | OBJECTIVES: Diabetes mellitus is a metabolic condition with hyperglycemia. Literature has shown a correlation between po… | partial | Mg+K in diabetics; insomnia severity down; confounded by K, diabetic population | efetch.xml (local) |
| 3 | 40923590 | 10.1177/10815589251378179 | Randomized Controlled Trial | 2026 | Journal of investigative medicine : the official publication of the American Federation for Clinical Research | Effects of magnesium and potassium on insulin resistance and blood sugar level among insomniac patients with diabetes mellitus-A randomized controlled trial. | The aim of this study is to compare the effect of magnesium and potassium on insulin resistance and blood sugar levels a… | doesn't | outcome is insulin resistance/glucose, not sleep quality | efetch.xml (local) |

## 5. `paper:p-vitamin-d-deficiency` — **no full support — owner decides**

**Library claim:** Vitamin D3 — Correcting deficiency (Grade A): Effectively raises serum 25(OH)D in deficient individuals. | Vitamin D3 — Immune support (Grade C): Mixed evidence; respiratory infection benefit appears largest in deficient people.

PubMed scope: filtered · query `vitamin D3 versus vitamin D2 serum 25-hydroxyvitamin D meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 39385006 | 10.1038/s41430-024-01520-x | Systematic Review, Meta-Analysis, Comparative Study | 2025 | European journal of clinical nutrition | Effect of cholecalciferol versus calcifediol on serum 25(OH)D concentrations: a systematic review with meta-analysis. | BACKGROUND: Deficiency in vitamin D is widely prevalent around the world. Oral vitamin D supplementation is suggested fo… | partial | calcifediol beat cholecalciferol; D3 raises 25(OH)D but is the comparator | efetch.xml (local) |
| 2 | 25025896 | 10.3310/hta18450 | Systematic Review | 2014 | Health technology assessment (Winchester, England) | Vitamin D supplementation in pregnancy: a systematic review. | BACKGROUND: It is unclear whether or not the current evidence base allows definite conclusions to be made regarding the … | doesn't | pregnancy; maternal status/outcomes, not correcting deficiency | efetch.xml (local) |
| 3 | 24414552 | 10.1002/14651858.CD007470.pub3 | Meta-Analysis, Systematic Review | 2014 | The Cochrane database of systematic reviews | Vitamin D supplementation for prevention of mortality in adults. | BACKGROUND: Available evidence on the effects of vitamin D on mortality has been inconclusive. In a recent systematic re… | doesn't | mortality outcome, not 25(OH)D | efetch.xml (local) |

## 6. `paper:p-fish-oil-cv` — candidate supports

**Library claim:** Fish Oil (Omega-3) — Cardiovascular support (Grade B): May lower triglycerides; benefits dose-dependent on EPA/DHA content.

PubMed scope: filtered · query `omega-3 fatty acids triglycerides dose-response meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 37264945 | 10.1161/JAHA.123.029512 | Meta-Analysis | 2023 | Journal of the American Heart Association | Association Between Omega-3 Fatty Acid Intake and Dyslipidemia: A Continuous Dose-Response Meta-Analysis of Randomized Controlled Trials. | Background Previous results provide supportive but not conclusive evidence for the use of omega-3 fatty acids to reduce … | **supports** | dose-response MA: near-linear triglyceride lowering | efetch.xml (local) |
| 2 | 32114706 | 10.1002/14651858.CD003177.pub5 | Meta-Analysis, Systematic Review | 2020 | The Cochrane database of systematic reviews | Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease. | BACKGROUND: Omega-3 polyunsaturated fatty acids from oily fish (long-chain omega-3 (LCn3)), including eicosapentaenoic a… | **supports** | Cochrane 2020: reduces serum triglycerides; small CHD effect | efetch.xml (local) |
| 3 | 30019766 | 10.1002/14651858.CD003177.pub3 | Meta-Analysis, Systematic Review | 2018 | The Cochrane database of systematic reviews | Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease. | BACKGROUND: Researchers have suggested that omega-3 polyunsaturated fatty acids from oily fish (long-chain omega-3 (LCn3… | partial | Cochrane 2018 (superseded by 2020): little/no CV effect; TG not the headline | efetch.xml (local) |

## 7. `paper:p-fish-oil-mood` — candidate supports

**Library claim:** Fish Oil (Omega-3) — Mood support (Grade C): Some evidence for depressive symptoms with higher-EPA formulations.

PubMed scope: filtered · query `EPA omega-3 depression meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 31383846 | 10.1038/s41398-019-0515-5 | Meta-Analysis, Review | 2019 | Translational psychiatry | Efficacy of omega-3 PUFAs in depression: A meta-analysis. | We conducted this meta-analysis of double-blind randomized placebo-controlled trials to estimate the efficacy of omega-3… | **supports** | EPA ≥60% formulas benefit depression | efetch.xml (local) |
| 2 | 37028202 | 10.1016/j.plefa.2023.102572 | Meta-Analysis, Systematic Review | 2023 | Prostaglandins, leukotrienes, and essential fatty acids | Effects of long-chain omega-3 polyunsaturated fatty acids on reducing anxiety and/or depression in adults; A systematic review and meta-analysis of randomised controlled trials. | The omega-3 polyunsaturated fatty acids (PUFAs) eicosapentaenoic- (EPA), docosahexaenoic- (DHA) and docosapentaenoic aci… | **supports** | EPA ≥60% at 1–<2 g/day shows potential; heterogeneity noted | efetch.xml (local) |
| 3 | 39564892 | 10.1002/14651858.CD014803.pub2 | Systematic Review, Meta-Analysis | 2024 | The Cochrane database of systematic reviews | Omega-3 fatty acid supplementation for depression in children and adolescents. | BACKGROUND: Mental health disorders including major depressive disorder (MDD) are well recognized as major contributors … | doesn't | children/adolescents; conclusions uncertain | efetch.xml (local) |

## 8. `paper:p-ltheanine-focus` — candidate supports

**Library claim:** L-Theanine — Calm focus (with caffeine) (Grade B): Combined with caffeine, improves attention and reduces jitteriness in several trials.

PubMed scope: filtered · query `L-theanine caffeine attention randomized placebo`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 40314930 | 10.1093/nutrit/nuaf054 | Systematic Review, Meta-Analysis | 2025 | Nutrition reviews | Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials. | CONTEXT: The bioactive compounds found in tea from Camellia sinensis, namely theanine, caffeine, and polyphenols, can po… | **supports** | MA: theanine+caffeine may benefit cognition/mood; CIs uncertain | efetch.xml (local) |
| 2 | 18681988 | 10.1179/147683008X301513 | Randomized Controlled Trial | 2008 | Nutritional neuroscience | The combined effects of L-theanine and caffeine on cognitive performance and mood. | The aim of this study was to compare 50 mg caffeine, with and without 100 mg L-theanine, on cognition and mood in health… | **supports** | attention switching and distraction improved with the combination | efetch.xml (local) |
| 3 | 21040626 | 10.1179/147683010X12611460764840 | Randomized Controlled Trial | 2010 | Nutritional neuroscience | The combination of L-theanine and caffeine improves cognitive performance and increases subjective alertness. | The non-proteinic amino acid L-theanine and caffeine, a methylxanthine derivative, are naturally occurring ingredients i… | **supports** | task-switching accuracy and alertness improved; other tasks unchanged | efetch.xml (local) |

## 9. `paper:p-ltheanine-stress` — candidate supports

**Library claim:** L-Theanine — Stress & relaxation (Grade B): May reduce acute stress and support relaxation without sedation.

PubMed scope: filtered · query `L-theanine acute stress heart rate randomized`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 16930802 | 10.1016/j.biopsycho.2006.06.006 | Randomized Controlled Trial | 2007 | Biological psychology | L-Theanine reduces psychological and physiological stress responses. | L-Theanine is an amino acid contained in green tea leaves which is known to block the binding of L-glutamic acid to glut… | **supports** | reduced HR and s-IgA responses to acute stress task | efetch.xml (local) |
| 2 | — | 10.1016/j.biopsycho.2006.06.006 | journal-article | 2007 | Biological Psychology | l-Theanine reduces psychological and physiological stress responses | — | title only | same paper as PMID 16930802 (Crossref record) | crossref.json |
| 3 | — | 10.1007/978-94-011-7460-2_4 | book-chapter | 1983 | Stress | Physiological and Psychological Responses to Stress | — | doesn't | 1983 book chapter on stress physiology, not L-theanine | crossref.json |
| 4 | — | 10.1007/978-94-010-9798-7_4 | book-chapter | 1982 | Stress | Physiological and Psychological Responses to Stress | — | doesn't | 1982 book chapter, not L-theanine | crossref.json |

## 10. `paper:p-glycine-sleep` — **no full support — owner decides**

**Library claim:** Glycine — Sleep quality (Grade B): Pre-bed glycine may improve subjective sleep quality and next-day alertness.

PubMed scope: filtered · query `glycine ingestion sleep quality`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 42730704 | 10.1080/15502783.2026.2711032 | Randomized Controlled Trial | 2026 | Journal of the International Society of Sports Nutrition | Effects of six weeks of guanidinoacetic acid supplementation with and without creatine monohydrate on cognitive function and markers of health in healthy adults. | BACKGROUND: Guanidinoacetic acid (GAA) supplementation has been reported to increase brain creatine content more effecti… | doesn't | guanidinoacetic acid, not glycine | efetch.xml (local) |
| 2 | — | 10.1111/j.1479-8425.2006.00193.x | journal-article | 2006 | Sleep and Biological Rhythms | Subjective effects of glycine ingestion before bedtime on sleep quality | — | title only | title matches the claim (pre-bed glycine, subjective sleep); no abstract captured | crossref.json |
| 3 | — | 10.1111/j.1479-8425.2007.00262.x | journal-article | 2007 | Sleep and Biological Rhythms | Glycine ingestion improves subjective sleep quality in human volunteers, correlating with polysomnographic changes | — | title only | title matches the claim (glycine, subjective sleep + PSG); no abstract captured | crossref.json |
| 4 | — | 10.1186/s41606-025-00169-0 | journal-article | 2026 | Sleep Science and Practice | Impact of hydration habits before bedtime on sleep quality | — | doesn't | hydration habits, not glycine | crossref.json |

## 11. `paper:p-ashwagandha-stress` — candidate supports

**Library claim:** Ashwagandha — Stress & cortisol (Grade B): Multiple trials show reduced perceived stress and cortisol over 6-8 weeks. | Ashwagandha — Sleep quality (Grade C): Some evidence for improved sleep, often secondary to stress reduction.

PubMed scope: filtered · query `ashwagandha root extract stress cortisol randomized placebo`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 37832082 | 10.1097/MD.0000000000035521 | Randomized Controlled Trial | 2023 | Medicine | A standardized Ashwagandha root extract alleviates stress, anxiety, and improves quality of life in healthy adults by modulating stress hormones: Results from a randomized, double-blind, placebo-controlled study. | BACKGROUND: The coronavirus disease-2019 (COVID-19) pandemic has resulted in a surge in stress, anxiety, and depression … | **supports** | root extract reduced stress, anxiety and cortisol vs placebo (8 wk) | efetch.xml (local) |
| 2 | 27055824 | 10.1177/2156587216641830 | Randomized Controlled Trial | 2017 | Journal of evidence-based complementary & alternative medicine | Body Weight Management in Adults Under Chronic Stress Through Treatment With Ashwagandha Root Extract: A Double-Blind, Randomized, Placebo-Controlled Trial. | Chronic stress has been associated with a number of illnesses, including obesity. Ashwagandha is a well-known adaptogen … | partial | chronic stress, cortisol and stress scores improved; primary aim body weight | efetch.xml (local) |
| 3 | 41815853 | 10.25122/jml-2025-0172 | Randomized Controlled Trial | 2026 | Journal of medicine and life | A proprietary herbal extract of ashwagandha root for stress and anxiety in healthy adults: a randomized, double-blind, three-arm, placebo-controlled efficacy and safety study. | Stress and anxiety are interconnected, sharing both behavioural and neural foundations. Ashwagandha (Withania somnifera)… | **supports** | 300 mg twice daily reduced PSS and anxiety vs placebo; sleep effect (2nd citing effect) not addressed | efetch.xml (local) |

## 12. `paper:p-berberine-metabolic` — candidate supports

**Library claim:** Berberine — Blood sugar control (Grade B): May lower fasting glucose and HbA1c; effect size comparable to some first-line agents in small trials.

PubMed scope: filtered · query `berberine type 2 diabetes meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 36467075 | 10.3389/fphar.2022.1015045 | Systematic Review | 2022 | Frontiers in pharmacology | Glucose-lowering effect of berberine on type 2 diabetes: A systematic review and meta-analysis. | Background: Insulin secretory agents are commonly used to treat type 2 diabetes. However, traditional insulin secretory … | **supports** | glucose-lowering effect in T2D; safety noted | efetch.xml (local) |
| 2 | 34956436 | 10.1155/2021/2074610 | Meta-Analysis, Systematic Review | 2021 | Oxidative medicine and cellular longevity | The Effect of Berberine on Metabolic Profiles in Type 2 Diabetic Patients: A Systematic Review and Meta-Analysis of Randomized Controlled Trials. | OBJECTIVE: Rhizoma Coptidis is an herb that has been frequently used in many traditional formulas for the treatment of d… | **supports** | RCT MA in T2D: glycaemic and lipid improvements | efetch.xml (local) |
| 3 | 30393248 | 10.1507/endocrj.EJ18-0109 | Meta-Analysis, Systematic Review | 2019 | Endocrine journal | Effects of berberine on blood glucose in patients with type 2 diabetes mellitus: a systematic literature review and a meta-analysis. | We conducted a systematic review and meta-analysis to evaluate the effect of Berberine on glucose in patients with type … | **supports** | lowers glucose; effect modified by dose/duration/age; combination better | efetch.xml (local) |

## 13. `paper:p-zinc-immune` — candidate supports

**Library claim:** Zinc — Immune / cold duration (Grade B): Lozenges started early may modestly reduce common-cold duration.

PubMed scope: filtered · query `zinc acetate lozenges common cold duration`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 38719213 | 10.1002/14651858.CD014914.pub2 | Systematic Review | 2024 | The Cochrane database of systematic reviews | Zinc for prevention and treatment of the common cold. | BACKGROUND: The common cold is an acute, self-limiting viral respiratory illness. Symptoms include nasal congestion and … | **supports** | Cochrane 2024: may reduce duration of ongoing colds; low certainty | efetch.xml (local) |
| 2 | 25924708 | 10.1002/14651858.CD001364.pub5 | Meta-Analysis, Systematic Review | 2015 | The Cochrane database of systematic reviews | WITHDRAWN: Zinc for the common cold. | September 2016 updated withdrawal notice This Cochrane Review was withdrawn in April 2015, and this withdrawal notice wa… | doesn't | WITHDRAWN Cochrane review — must not be cited | efetch.xml (local) |
| 3 | 27378206 | 10.1111/bcp.13057 | Meta-Analysis | 2016 | British journal of clinical pharmacology | Zinc acetate lozenges for treating the common cold: an individual patient data meta-analysis. | AIMS: The aim of this study was to determine whether the allergy status and other characteristics of common cold patient… | **supports** | IPD MA: zinc acetate lozenges shorten colds | efetch.xml (local) |

## 14. `paper:p-zinc-deficiency` — **no candidate supports — owner decides (stop condition)**

**Library claim:** Zinc — Correcting deficiency (Grade A): Effectively restores zinc status in deficient individuals.

PubMed scope: filtered · query `zinc supplementation biomarkers of zinc status systematic review`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 35010904 | 10.3390/nu14010029 | Systematic Review | 2021 | Nutrients | Nutrient Intake and Status in Adults Consuming Plant-Based Diets Compared to Meat-Eaters: A Systematic Review. | Health authorities increasingly recommend a more plant-based diet, rich in fruits, vegetables, pulses, whole grains and … | doesn't | dietary pattern intake/status comparison, not supplementation | efetch.xml (local) |
| 2 | 39683462 | 10.3390/nu16234068 | Systematic Review | 2024 | Nutrients | The Impact of Minerals on Female Fertility: A Systematic Review. | UNLABELLED: Female fertility and reproductive system disorders are influenced by a complex interplay of biological, phys… | doesn't | female fertility | efetch.xml (local) |
| 3 | 41382333 | 10.1080/10408398.2025.2572983 | Systematic Review, Meta-Analysis | 2026 | Critical reviews in food science and nutrition | Lacto-ovo-vegetarian and vegan diets in children and adolescents: a systematic review and meta-analysis of nutritional and health outcomes. | The health implications of lacto-ovo-vegetarian and vegan diets in childhood remain debated. This meta-analysis compares… | doesn't | vegetarian children's diets | efetch.xml (local) |

## 15. `paper:p-b12-deficiency` — candidate supports

**Library claim:** Vitamin B12 — Correcting deficiency (Grade A): Reliably corrects B12 deficiency, especially relevant for plant-based diets.

PubMed scope: filtered · query `vitamin B12 status vegetarians vegans supplementation`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 35010904 | 10.3390/nu14010029 | Systematic Review | 2021 | Nutrients | Nutrient Intake and Status in Adults Consuming Plant-Based Diets Compared to Meat-Eaters: A Systematic Review. | Health authorities increasingly recommend a more plant-based diet, rich in fruits, vegetables, pulses, whole grains and … | doesn't | dietary pattern comparison, not supplementation | efetch.xml (local) |
| 2 | 39373282 | 10.1111/nbu.12712 | Systematic Review, Meta-Analysis | 2024 | Nutrition bulletin | A systematic review and meta-analysis of functional vitamin B12 status among adult vegans. | The dietary intake of vitamin B12 among unsupplemented vegans is notably lower compared to both vegetarians and omnivore… | **supports** | B12 supplement use in vegans improves all status biomarkers | efetch.xml (local) |
| 3 | 37892416 | 10.3390/nu15204341 | Systematic Review | 2023 | Nutrients | Nutrient Intake and Status in Children and Adolescents Consuming Plant-Based Diets Compared to Meat-Eaters: A Systematic Review. | Health authorities increasingly recommend sustainable and healthy diets rich in plant foods and with moderate amounts of… | doesn't | children's diets, not supplementation | efetch.xml (local) |

## 16. `paper:p-caffeine-focus` — **no full support — owner decides**

**Library claim:** Caffeine — Alertness & focus (Grade A): Strong evidence for improved alertness, reaction time, and vigilance.

PubMed scope: filtered · query `caffeine cognitive performance vigilance alertness review`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20464765 | 10.1002/14651858.CD008508 | Meta-Analysis, Systematic Review | 2010 | The Cochrane database of systematic reviews | Caffeine for the prevention of injuries and errors in shift workers. | BACKGROUND: Sleepiness leads to a deterioration in performance and attention, and is associated with an increased risk o… | partial | shift workers: caffeine reduces errors/improves performance; narrow population | efetch.xml (local) |
| 2 | — | 10.1093/sleep/10.4.306 | journal-article | 1987 | Sleep | Ethanol and Caffeine Effects on Daytime Sleepiness/Alertness | — | title only | title: caffeine and daytime alertness (1987); no abstract captured | crossref.json |
| 3 | — | 10.1111/j.1365-2869.2006.00547.x | journal-article | 2006 | Journal of Sleep Research | The effects of chewing versus caffeine on alertness, cognitive performance and cardiac autonomic activity during sleep deprivation | — | title only | title: caffeine vs chewing on alertness under sleep deprivation; no abstract | crossref.json |
| 4 | — | 10.1371/journal.pone.0076707 | journal-article | 2013 | PLoS ONE | A Comparison of Blue Light and Caffeine Effects on Cognitive Function and Alertness in Humans | — | title only | title: blue light vs caffeine on alertness; no abstract | crossref.json |

## 17. `paper:p-caffeine-training` — candidate supports

**Library claim:** Caffeine — Exercise performance (Grade A): Improves endurance and reduces perceived exertion across many trials.

PubMed scope: filtered · query `caffeine exercise performance meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 36870101 | 10.1016/j.smrv.2023.101764 | Meta-Analysis, Systematic Review | 2023 | Sleep medicine reviews | The effect of caffeine on subsequent sleep: A systematic review and meta-analysis. | The consumption of caffeine in response to insufficient sleep may impair the onset and maintenance of subsequent sleep. … | doesn't | caffeine and subsequent sleep, not exercise | efetch.xml (local) |
| 2 | 36615805 | 10.3390/nu15010148 | Meta-Analysis, Systematic Review | 2022 | Nutrients | Effects of Caffeine Intake on Endurance Running Performance and Time to Exhaustion: A Systematic Review and Meta-Analysis. | Caffeine (1,3,7-trimethylxanthine) is one of the most widely consumed performance-enhancing substances in sport due to i… | **supports** | endurance running: TTE and time trials improved | efetch.xml (local) |
| 3 | 33800853 | 10.3390/nu13030868 | Meta-Analysis, Systematic Review | 2021 | Nutrients | Caffeine and Cognitive Functions in Sports: A Systematic Review and Meta-Analysis. | Cognitive functions are essential in any form of exercise. Recently, interest has mounted in addressing the relationship… | partial | cognition during sport, not endurance/RPE | efetch.xml (local) |

## 18. `paper:p-protein-mps` — candidate supports

**Library claim:** Protein Powder (Whey) — Muscle protein synthesis (Grade A): Supplemental protein supports muscle mass and strength gains when total intake is adequate. | Protein Powder (Whey) — Recovery & satiety (Grade B): Supports post-exercise recovery and appetite control.

PubMed scope: filtered · query `protein supplementation resistance training muscle mass strength meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28698222 | 10.1136/bjsports-2017-097608 | Meta-Analysis, Systematic Review | 2018 | British journal of sports medicine | A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. | OBJECTIVE: We performed a systematic review, meta-analysis and meta-regression to determine if dietary protein supplemen… | **supports** | protein augments RT gains in strength and FFM; plateau ~1.6 g/kg/d | efetch.xml (local) |
| 2 | 38350303 | 10.1016/j.jnha.2024.100184 | Meta-Analysis, Systematic Review | 2024 | The journal of nutrition, health & aging | Improving sarcopenia in older adults: a systematic review and meta-analysis of randomized controlled trials of whey protein supplementation with or without resistance training. | OBJECTIVES: The aim of the study was to comprehensively analyze the effects of whey protein (WP)-enriched supplement int… | partial | older adults with sarcopenia; recovery/satiety (2nd citing effect) not addressed | efetch.xml (local) |
| 3 | 37571361 | 10.3390/nu15153424 | Meta-Analysis, Systematic Review | 2023 | Nutrients | Effectiveness of Whey Protein Supplementation during Resistance Exercise Training on Skeletal Muscle Mass and Strength in Older People with Sarcopenia: A Systematic Review and Meta-Analysis. | OBJECTIVE: To determine the effectiveness of whey protein (WP) supplementation during resistance exercise training (RET)… | partial | sarcopenia; small effects, low-quality evidence | efetch.xml (local) |

## 19. `paper:p-taurine-training` — candidate supports

**Library claim:** Taurine — Exercise performance (Grade C): Small possible endurance benefits; evidence mixed.

PubMed scope: filtered · query `taurine supplementation endurance performance`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 41032459 | 10.1080/15502783.2025.2566371 | Network Meta-Analysis, Systematic Review | 2025 | Journal of the International Society of Sports Nutrition | Caffeine and taurine: a systematic review and network meta-analysis of their individual and combined effects on physical capacity, cognitive function, and physiological markers. | BACKGROUND: Caffeine (CAF) and taurine (TAU) have each demonstrated ergogenic effects across physical and cognitive doma… | partial | caffeine+taurine network MA; endurance effects vary | efetch.xml (local) |
| 2 | 30776254 | 10.1080/17461391.2019.1578417 | Randomized Controlled Trial | 2019 | European journal of sport science | Acute taurine supplementation enhances thermoregulation and endurance cycling performance in the heat. | This study investigated the effects of oral taurine supplementation on cycling time to exhaustion at a fixed-intensity a… | partial | single RCT (n=11) in heat: endurance improved | efetch.xml (local) |
| 3 | 29546641 | 10.1007/s40279-018-0896-2 | Meta-Analysis, Review | 2018 | Sports medicine (Auckland, N.Z.) | The Effects of an Oral Taurine Dose and Supplementation Period on Endurance Exercise Performance in Humans: A Meta-Analysis. | BACKGROUND: Taurine is central to many physiological processes, some of which are augmented by exogenous supply and have… | **supports** | MA: oral taurine improves endurance performance (g≈0.4) | efetch.xml (local) |

## 20. `paper:p-nac-antioxidant` — **no full support — owner decides**

**Library claim:** N-Acetylcysteine (NAC) — Antioxidant / glutathione (Grade C): Raises glutathione; broad clinical benefits remain context-dependent.

PubMed scope: filtered · query `N-acetylcysteine glutathione supplementation randomized`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 35975308 | 10.1093/gerona/glac135 | Randomized Controlled Trial | 2023 | The journals of gerontology. Series A, Biological sciences and medical sciences | Supplementing Glycine and N-Acetylcysteine (GlyNAC) in Older Adults Improves Glutathione Deficiency, Oxidative Stress, Mitochondrial Dysfunction, Inflammation, Physical Function, and Aging Hallmarks: A Randomized Clinical Trial. | BACKGROUND: Elevated oxidative stress (OxS), mitochondrial dysfunction, and hallmarks of aging are identified as key con… | partial | GlyNAC (glycine+NAC) raises glutathione in older adults; not NAC alone | efetch.xml (local) |
| 2 | 32900213 | 10.1177/0004867420952540 | Meta-Analysis, Systematic Review | 2021 | The Australian and New Zealand journal of psychiatry | Effectiveness of N-acetylcysteine in autism spectrum disorders: A meta-analysis of randomized controlled trials. | OBJECTIVE: Currently, pharmaceutical treatment options for autism spectrum disorder are limited. Brain glutaminergic dys… | doesn't | autism outcomes, not glutathione | efetch.xml (local) |
| 3 | 31826654 | 10.1177/0004867419893439 | Meta-Analysis, Systematic Review | 2020 | The Australian and New Zealand journal of psychiatry | Meta-analysis of randomised controlled trials with N-acetylcysteine in the treatment of schizophrenia. | OBJECTIVE: There is accumulating evidence that adjunctive treatment with N-acetylcysteine may be effective for schizophr… | doesn't | schizophrenia outcomes, not glutathione | efetch.xml (local) |

## 21. `effect:magnesium-metabolic` — candidate supports

**Library claim:** Magnesium — Glucose metabolism (Grade C): Possible small improvements in insulin sensitivity in deficient individuals.

PubMed scope: filtered · query `magnesium supplementation insulin sensitivity meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 34836329 | 10.3390/nu13114074 | Meta-Analysis, Systematic Review | 2021 | Nutrients | Oral Magnesium Supplementation for Treating Glucose Metabolism Parameters in People with or at Risk of Diabetes: A Systematic Review and Meta-Analysis of Double-Blind Randomized Controlled Trials. | There is a large and growing body of literature focusing on the use of oral magnesium (Mg) supplementation for improving… | **supports** | improves glucose and insulin-sensitivity markers in (at-risk) diabetes | efetch.xml (local) |
| 2 | 32654500 | 10.1080/10408398.2020.1790498 | Systematic Review | 2021 | Critical reviews in food science and nutrition | The effects of magnesium supplementation on obesity measures in adults: a systematic review and dose-response meta-analysis of randomized controlled trials. | Previous studies reported inconsistent findings regarding the effects of magnesium supplementation on obesity measures. … | doesn't | obesity measures, not insulin sensitivity | efetch.xml (local) |
| 3 | 27329332 | 10.1016/j.phrs.2016.06.019 | Meta-Analysis, Systematic Review | 2016 | Pharmacological research | A systematic review and meta-analysis of randomized controlled trials on the effects of magnesium supplementation on insulin sensitivity and glucose control. | A systematic review and meta-analysis was conducted to evaluate the effect of oral magnesium supplementation on insulin … | **supports** | ≥4 months improves HOMA-IR and fasting glucose | efetch.xml (local) |

## 22. `effect:creatine-recovery` — candidate supports

**Library claim:** Creatine Monohydrate — Recovery (Grade C): May reduce muscle damage markers and support recovery between sessions.

PubMed scope: filtered · query `creatine supplementation muscle damage recovery`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 38999792 | 10.3390/nu16132044 | Systematic Review | 2024 | Nutrients | Omega-3 Fatty Acid Supplementation on Post-Exercise Inflammation, Muscle Damage, Oxidative Response, and Sports Performance in Physically Healthy Adults-A Systematic Review of Randomized Controlled Trials. | Omega-3 is a family of n-3 polyunsaturated fatty acids (PUFAs), which have been used to treat a wide variety of chronic … | doesn't | omega-3, not creatine | efetch.xml (local) |
| 2 | 34472118 | 10.1111/jfbc.13916 | Meta-Analysis, Systematic Review | 2021 | Journal of food biochemistry | Creatine supplementation effect on recovery following exercise-induced muscle damage: A systematic review and meta-analysis of randomized controlled trials. | Exercise-induced muscle damage (EIMD) causes increased soreness, impaired function of muscles, and reductions in muscle … | **supports** | creatine lowered CK after muscle damage; heterogeneity, caution | efetch.xml (local) |
| 3 | 40507040 | 10.3390/nu17111772 | Randomized Controlled Trial | 2025 | Nutrients | The Effects of Creatine Monohydrate Supplementation on Recovery from Eccentric Exercise-Induced Muscle Damage: A Double-Blind, Randomized, Placebo-Controlled Trial Considering Sex and Age Differences. | Background/Objectives: In this study, we aimed to examine the effect of creatine monohydrate (CrM) supplementation on re… | **supports** | RCT: creatine may enhance recovery from eccentric damage | efetch.xml (local) |

## 23. `effect:fish-oil-longevity` — candidate supports

**Library claim:** Fish Oil (Omega-3) — Healthy aging (Grade C): Associated with favorable markers; causal longevity benefit unproven.

PubMed scope: filtered · query `omega-3 fatty acids all-cause mortality meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 32114706 | 10.1002/14651858.CD003177.pub5 | Meta-Analysis, Systematic Review | 2020 | The Cochrane database of systematic reviews | Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease. | BACKGROUND: Omega-3 polyunsaturated fatty acids from oily fish (long-chain omega-3 (LCn3)), including eicosapentaenoic a… | partial | small CHD-mortality reduction; no longevity outcome | efetch.xml (local) |
| 2 | 30019766 | 10.1002/14651858.CD003177.pub3 | Meta-Analysis, Systematic Review | 2018 | The Cochrane database of systematic reviews | Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease. | BACKGROUND: Researchers have suggested that omega-3 polyunsaturated fatty acids from oily fish (long-chain omega-3 (LCn3… | **supports** | little/no effect on mortality — supports 'causal longevity benefit unproven' | efetch.xml (local) |
| 3 | 36103100 | 10.1007/s10557-022-07379-z | Systematic Review, Meta-Analysis | 2024 | Cardiovascular drugs and therapy | Efficacy and Safety of Omega-3 Fatty Acids in the Prevention of Cardiovascular Disease: A Systematic Review and Meta-analysis. | BACKGROUND: It is widely accepted that omega-3 fatty acids are beneficial in the prevention of cardiovascular disease, b… | partial | CV prevention MA; mortality not the headline | efetch.xml (local) |

## 24. `dimension:magnesium-sleep/populationRelevance` — **no full support — owner decides**

**Library claim:** Magnesium — Sleep quality (Grade B): May improve subjective sleep quality, particularly in older adults or those with low intake. [dimension populationRelevance, score 2: Largest in adults with suboptimal magnesium.]

PubMed scope: filtered · query `magnesium supplementation sleep systematic review`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 35184264 | 10.1007/s12011-022-03162-1 | Systematic Review | 2023 | Biological trace element research | The Role of Magnesium in Sleep Health: a Systematic Review of Available Literature. | To date, no study has critically reviewed the current literature on the association between magnesium (Mg) and sleep hea… | partial | association with sleep; RCTs uncertain; no status subgroup | efetch.xml (local) |
| 2 | 33865376 | 10.1186/s12906-021-03297-z | Meta-Analysis, Systematic Review | 2021 | BMC complementary medicine and therapies | Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis. | BACKGROUND: Magnesium supplementation is often purported to improve sleep; however, as both an over-the-counter sleep ai… | partial | older adults with insomnia; not stratified by Mg status | efetch.xml (local) |
| 3 | 33441476 | 10.1136/postgradmedj-2020-139319 | Meta-Analysis, Systematic Review | 2022 | Postgraduate medical journal | Efficacy of dietary supplements on improving sleep quality: a systematic review and meta-analysis. | PURPOSE: Different dietary supplements aimed at improving sleep quality are available on the market, but there has not b… | partial | supplements MA; Mg 'may improve', needs research | efetch.xml (local) |

## 25. `dimension:creatine-strength/populationRelevance` — candidate supports

**Library claim:** Creatine Monohydrate — Strength & power output (Grade A): Robust evidence for improved strength, power, and lean mass when combined with resistance training. [dimension populationRelevance, score 2: Strongest in training adults; less relevant to the sedentary.]

PubMed scope: filtered · query `creatine supplementation resistance training older adults meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 37432300 | 10.3390/nu15092116 | Meta-Analysis, Systematic Review | 2023 | Nutrients | The Effects of Creatine Supplementation Combined with Resistance Training on Regional Measures of Muscle Hypertrophy: A Systematic Review with Meta-Analysis. | The purpose of this paper was to carry out a systematic review with a meta-analysis of randomized controlled trials that… | partial | hypertrophy; slightly larger in younger adults | efetch.xml (local) |
| 2 | 39519498 | 10.3390/nu16213665 | Meta-Analysis, Systematic Review | 2024 | Nutrients | Effects of Creatine Supplementation and Resistance Training on Muscle Strength Gains in Adults <50 Years of Age: A Systematic Review and Meta-Analysis. | BACKGROUND: Numerous meta-analyses have assessed the efficacy of creatine supplementation in increasing muscle strength.… | **supports** | strength gains with RT in adults <50 | efetch.xml (local) |
| 3 | 34836013 | 10.3390/nu13113757 | Meta-Analysis, Systematic Review | 2021 | Nutrients | Efficacy of Creatine Supplementation Combined with Resistance Training on Muscle Strength and Muscle Mass in Older Females: A Systematic Review and Meta-Analysis. | Sarcopenia refers to the age-related loss of muscle strength and muscle mass, which is associated with a reduced quality… | partial | older females, RT ≥24 wk | efetch.xml (local) |

## 26. `dimension:creatine-cognition/consistency` — candidate supports

**Library claim:** Creatine Monohydrate — Cognitive performance (Grade C): Emerging evidence for cognitive benefits, strongest under sleep deprivation or in vegetarians. [dimension consistency, score 1: Benefit appears mainly under stressors (sleep loss, vegetarian).]

PubMed scope: filtered · query `creatine supplementation cognitive function systematic review`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 39070254 | 10.3389/fnut.2024.1424972 | Systematic Review | 2024 | Frontiers in nutrition | The effects of creatine supplementation on cognitive function in adults: a systematic review and meta-analysis. | BACKGROUND: This study aimed to evaluate the effects of creatine monohydrate supplementation on cognitive function in ad… | partial | memory/processing speed benefits; population effects unresolved | efetch.xml (local) |
| 2 | 35984306 | 10.1093/nutrit/nuac064 | Meta-Analysis, Systematic Review | 2023 | Nutrition reviews | Effects of creatine supplementation on memory in healthy individuals: a systematic review and meta-analysis of randomized controlled trials. | CONTEXT: From an energy perspective, the brain is very metabolically demanding. It is well documented that creatine play… | partial | memory benefit, strongest in older adults — not the stressors the rationale names | efetch.xml (local) |
| 3 | 29704637 | 10.1016/j.exger.2018.04.013 | Systematic Review | 2018 | Experimental gerontology | Effects of creatine supplementation on cognitive function of healthy individuals: A systematic review of randomized controlled trials. | BACKGROUND AND AIMS: Creatine is a supplement used by sportsmen to increase athletic performance by improving energy sup… | **supports** | short-term memory/reasoning; potential benefit for stressed individuals | efetch.xml (local) |

## 27. `dimension:creatine-cognition/populationRelevance` — candidate supports

**Library claim:** Creatine Monohydrate — Cognitive performance (Grade C): Emerging evidence for cognitive benefits, strongest under sleep deprivation or in vegetarians. [dimension populationRelevance, score 2: Most relevant to sleep-deprived adults and vegetarians.]

PubMed scope: filtered · query `creatine supplementation vegetarians cognitive`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 29704637 | 10.1016/j.exger.2018.04.013 | Systematic Review | 2018 | Experimental gerontology | Effects of creatine supplementation on cognitive function of healthy individuals: A systematic review of randomized controlled trials. | BACKGROUND AND AIMS: Creatine is a supplement used by sportsmen to increase athletic performance by improving energy sup… | partial | benefit for aging and stressed individuals | efetch.xml (local) |
| 2 | 37968687 | 10.1186/s12916-023-03146-5 | Randomized Controlled Trial | 2023 | BMC medicine | The effects of creatine supplementation on cognitive performance-a randomised controlled study. | BACKGROUND: Creatine is an organic compound that facilitates the recycling of energy-providing adenosine triphosphate (A… | partial | small possible effect in general adults | efetch.xml (local) |
| 3 | 21118604 | 10.1017/S0007114510004733 | Randomized Controlled Trial | 2011 | The British journal of nutrition | The influence of creatine supplementation on the cognitive functioning of vegetarians and omnivores. | Creatine when combined with P forms phosphocreatine that acts as a reserve of high-energy phosphate. Creatine is found m… | **supports** | better memory in vegetarians specifically | efetch.xml (local) |

## 28. `dimension:vitamin-d-deficiency/populationRelevance` — candidate supports

**Library claim:** Vitamin D3 — Correcting deficiency (Grade A): Effectively raises serum 25(OH)D in deficient individuals. [dimension populationRelevance, score 3: Directly applicable to deficient adults.]

PubMed scope: filtered · query `vitamin D supplementation deficient adults serum 25-hydroxyvitamin D response`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 22552031 | 10.3945/ajcn.111.031070 | Comparative Study, Meta-Analysis, Systematic Review | 2012 | The American journal of clinical nutrition | Comparison of vitamin D2 and vitamin D3 supplementation in raising serum 25-hydroxyvitamin D status: a systematic review and meta-analysis. | BACKGROUND: Currently, there is a lack of clarity in the literature as to whether there is a definitive difference betwe… | **supports** | D3 raises 25(OH)D more than D2 | efetch.xml (local) |
| 2 | 37865222 | 10.1016/j.advnut.2023.09.016 | Meta-Analysis, Systematic Review | 2024 | Advances in nutrition (Bethesda, Md.) | Comparison of the Effect of Daily Vitamin D2 and Vitamin D3 Supplementation on Serum 25-Hydroxyvitamin D Concentration (Total 25(OH)D, 25(OH)D2, and 25(OH)D3) and Importance of Body Mass Index: A Systematic Review and Meta-Analysis. | BACKGROUND: Two previous meta-analyses showed smaller differences between vitamin D3 and vitamin D2 in raising serum 25-… | **supports** | daily D3 vs D2 on 25(OH)D; baseline status and BMI matter | efetch.xml (local) |
| 3 | 30089075 | 10.1056/NEJMoa1800927 | Randomized Controlled Trial | 2018 | The New England journal of medicine | Vitamin D Supplementation in Pregnancy and Lactation and Infant Growth. | BACKGROUND: It is unclear whether maternal vitamin D supplementation during pregnancy and lactation improves fetal and i… | doesn't | pregnancy/infant growth outcome | efetch.xml (local) |

## 29. `dimension:fish-oil-cardiovascular/populationRelevance` — candidate supports

**Library claim:** Fish Oil (Omega-3) — Cardiovascular support (Grade B): May lower triglycerides; benefits dose-dependent on EPA/DHA content. [dimension populationRelevance, score 2: Largest in adults with elevated triglycerides.]

PubMed scope: filtered · query `omega-3 hypertriglyceridemia triglyceride lowering`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 30415628 | 10.1056/NEJMoa1812792 | Clinical Trial, Phase III, Multicenter Study, Randomized Controlled Trial | 2019 | The New England journal of medicine | Cardiovascular Risk Reduction with Icosapent Ethyl for Hypertriglyceridemia. | BACKGROUND: Patients with elevated triglyceride levels are at increased risk for ischemic events. Icosapent ethyl, a hig… | partial | REDUCE-IT: EPA ethyl ester in raised TG on statins cut events; drug formulation, events not TG change | efetch.xml (local) |
| 2 | 39163858 | 10.1016/j.medj.2024.07.024 | Clinical Trial, Phase IV, Multicenter Study, Randomized Controlled Trial | 2025 | Med (New York, N.Y.) | Impact of omega-3 fatty acids on hypertriglyceridemia, lipidomics, and gut microbiome in patients with type 2 diabetes. | BACKGROUND: Fish oil (FO), a mixture of omega-3 fatty acids mainly comprising docosahexaenoic acid (DHA) and eicosapenta… | **supports** | fish oil TG lowering in T2D with hypertriglyceridemia | efetch.xml (local) |
| 3 | 38777770 | 10.5551/jat.64896 | Randomized Controlled Trial, Comparative Study | 2024 | Journal of atherosclerosis and thrombosis | Comparison of Efficacy between Pemafibrate and Omega-3-Acid Ethyl Ester in the Liver: the PORTRAIT Study. | AIM: No pharmacotherapeutic treatment has been established for metabolic dysfunction-associated steatotic liver disease … | doesn't | pemafibrate comparison in MASLD | efetch.xml (local) |

## 30. `dimension:melatonin-sleep/populationRelevance` — **no full support — owner decides**

**Library claim:** Melatonin — Sleep onset (Grade A): Reduces sleep-onset latency and helps shift circadian timing; lower doses often sufficient. [dimension populationRelevance, score 3: Directly relevant to delayed onset and jet lag.]

PubMed scope: filtered · query `melatonin jet lag`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 24780537 | — | Systematic Review | 2014 | BMJ clinical evidence | Jet lag. | INTRODUCTION: Jet lag is a syndrome caused by disruption of the 'body clock', and affects most air travellers crossing f… | partial | BMJ Clin Evid jet-lag review lists melatonin; findings not in abstract; no DOI | efetch.xml (local) |
| 2 | 34030534 | 10.1080/07420528.2021.1930029 | Systematic Review | 2021 | Chronobiology international | Evening wear of blue-blocking glasses for sleep and mood disorders: a systematic review. | Blue-blocking glasses, also known as amber glasses, are plastic glasses that primarily block blue light. Blue-blocking g… | doesn't | blue-blocking glasses, not melatonin | efetch.xml (local) |
| 3 | 19445780 | — | Systematic Review | 2008 | BMJ clinical evidence | Jet lag. | INTRODUCTION: Jet lag affects most air travellers crossing five or more time zones; it tends to be worse on eastward tha… | partial | older edition of the same review; no DOI | efetch.xml (local) |

## 31. `dimension:ashwagandha-stress/populationRelevance` — candidate supports

**Library claim:** Ashwagandha — Stress & cortisol (Grade B): Multiple trials show reduced perceived stress and cortisol over 6-8 weeks. [dimension populationRelevance, score 2: Studied in chronically stressed adults.]

PubMed scope: filtered · query `ashwagandha stress systematic review meta-analysis`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 36017529 | 10.1002/ptr.7598 | Meta-Analysis, Systematic Review | 2022 | Phytotherapy research : PTR | Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials. | Clinical trial studies revealed conflicting results on the effect of Ashwagandha extract on anxiety and stress. Therefor… | **supports** | MA of RCTs: stress and anxiety reduced; low certainty | efetch.xml (local) |
| 2 | 39348746 | 10.1016/j.explore.2024.103062 | Systematic Review, Meta-Analysis | 2024 | Explore (New York, N.Y.) | Effects of Ashwagandha (Withania Somnifera) on stress and anxiety: A systematic review and meta-analysis. | BACKGROUND: Ashwagandha (Withania somnifera) is an adaptogenic herb used to prevent and treat psychosomatic disorders. T… | **supports** | MA: stress and anxiety benefits | efetch.xml (local) |
| 3 | 39083548 | 10.1002/hup.2911 | Systematic Review, Meta-Analysis | 2024 | Human psychopharmacology | Safety and efficacy of Withania somnifera for anxiety and insomnia: Systematic review and meta-analysis. | OBJECTIVE: Despite the historical neurological use of Withania somnifera, limited evidence supports its efficacy for con… | partial | anxiety and insomnia focus | efetch.xml (local) |

## 32. `dimension:caffeine-focus/populationRelevance` — candidate supports

**Library claim:** Caffeine — Alertness & focus (Grade A): Strong evidence for improved alertness, reaction time, and vigilance. [dimension populationRelevance, score 2: Broad in healthy adults; tolerance varies.]

PubMed scope: filtered · query `caffeine tolerance habitual consumption alertness`

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 23108937 | 10.1007/s00213-012-2889-4 | Randomized Controlled Trial | 2013 | Psychopharmacology | Faster but not smarter: effects of caffeine and caffeine withdrawal on alertness and performance. | RATIONALE: Despite 100 years of psychopharmacological research, the extent to which caffeine consumption benefits human … | partial | tolerance: habitual users gain little net alertness — supports 'tolerance varies', tensions with Grade A | efetch.xml (local) |
| 2 | 16541243 | 10.1007/s00213-006-0341-3 | Randomized Controlled Trial | 2006 | Psychopharmacology | Subjective, behavioral, and physiological effects of acute caffeine in light, nondependent caffeine users. | RATIONALE: Caffeine produces mild psychostimulant effects that are thought to underlie its widespread use. However, the … | **supports** | acute effects in light, nondependent users | efetch.xml (local) |
| 3 | 16423144 | 10.1111/j.1469-7610.2005.01457.x | Randomized Controlled Trial | 2006 | Journal of child psychology and psychiatry, and allied disciplines | Psychostimulant and other effects of caffeine in 9- to 11-year-old children. | BACKGROUND: Recent research on adults suggests that "beneficial" psychostimulant effects of caffeine are found only in t… | doesn't | children | efetch.xml (local) |

---

# S3 re-search — the 8 claims the owner sent back (2026-09-23)

> Generated from `content/verification/captures/2026-09-23-s3/candidates.json` (S3, 24 calls). Same filters as S1, with targeted queries (`content/verification/u6-claims-s3.json`). Verdicts are Claude's judgement against the Library claim. **They are not decisions.**

## S3-1. `paper:p-zinc-deficiency` — **no candidate supports — owner decides**

**Library claim:** Zinc — Correcting deficiency (Grade A): Effectively restores zinc status in deficient individuals.

Query `zinc supplementation plasma serum zinc concentration` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 27087396 | 10.1002/14651858.CD009747.pub2 | Meta-Analysis, Systematic Review | 2016 | The Cochrane database of systematic reviews | Daily iron supplementation for improving anaemia, iron status and health in menstruating women. | BACKGROUND: Iron-deficiency anaemia is highly prevalent among non-pregnant women of reproductive age (menstruating women… | doesn't | iron, not zinc |
| 2 | 23806573 | 10.1016/j.biopsych.2013.05.008 | Meta-Analysis | 2013 | Biological psychiatry | Zinc in depression: a meta-analysis. | BACKGROUND: Zinc is an essential micronutrient with diverse biological roles in cell growth, apoptosis and metabolism, a… | doesn't | zinc levels in depression; no supplementation outcome |
| 3 | 30012497 | 10.1016/j.ejphar.2018.07.019 | Meta-Analysis, Systematic Review | 2018 | European journal of pharmacology | The effect of zinc supplementation on plasma C-reactive protein concentrations: A systematic review and meta-analysis of randomized controlled trials. | Previous studies have shown zinc has potential anti-inflammatory and anti-oxidative effects. However, findings from clin… | doesn't | zinc supplementation lowers CRP; zinc status not the outcome |

## S3-2. `paper:p-caffeine-focus` — **no full support — owner decides**

**Library claim:** Caffeine — Alertness & focus (Grade A): Strong evidence for improved alertness, reaction time, and vigilance.

Query `caffeine vigilance reaction time alertness placebo` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 18006208 | 10.1016/j.biopsycho.2007.09.008 | Randomized Controlled Trial | 2008 | Biological psychology | The effects of L-theanine, caffeine and their combination on cognition and mood. | L-Theanine is an amino acid found naturally in tea. Despite the common consumption of L-theanine, predominantly in combi… | partial | theanine+caffeine study; caffeine raised alertness ratings, combination is the focus |
| 2 | 32593750 | 10.1016/j.physbeh.2020.113031 | Randomized Controlled Trial | 2020 | Physiology & behavior | Effect of acute caffeine intake on hit accuracy and reaction time in professional e-sports players. | Caffeine is considered a cognitive enhancer at low to moderate doses because it improves alertness, vigilance, attention… | partial | 3 mg/kg improved reaction time and accuracy; e-sports players only |
| 3 | 3680601 | — | Clinical Trial, Controlled Clinical Trial, Randomized Controlled Trial | 1987 | Journal of clinical psychopharmacology | The effects of caffeine and aspirin on mood and performance. | Caffeine, in addition to being a food constituent, is also a common analgesic adjuvant that is used in combination with … | partial | vigilance up, reaction time down, but caffeine combined with aspirin; 1987; no DOI |

## S3-3. `paper:p-nac-antioxidant` — **no full support — owner decides**

**Library claim:** N-Acetylcysteine (NAC) — Antioxidant / glutathione (Grade C): Raises glutathione; broad clinical benefits remain context-dependent.

Query `oral N-acetylcysteine supplementation blood glutathione` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 35674828 | 10.1007/s00421-022-04964-w | Randomized Controlled Trial | 2022 | European journal of applied physiology | Blood oxidative stress biomarkers in women: influence of oral contraception, exercise, and N-acetylcysteine. | PURPOSE: To compare physiological responses to submaximal cycling and sprint cycling performance in women using oral con… | partial | women on oral contraceptives, exercise oxidative stress; glutathione not the headline |
| 2 | 24576857 | 10.1249/MSS.0000000000000222 | Randomized Controlled Trial | 2014 | Medicine and science in sports and exercise | Effect of N-acetylcysteine on cycling performance after intensified training. | PURPOSE: This investigation examined the ergogenic effect of short-term oral N-acetylcysteine (NAC) supplementation and … | partial | measured reduced/oxidised glutathione; improved redox balance and cycling in athletes |
| 3 | 37386885 | 10.1002/npr2.12360 | Randomized Controlled Trial | 2023 | Neuropsychopharmacology reports | Effects of N-acetylcysteine on oxidative stress biomarkers, depression, and anxiety symptoms in patients with multiple sclerosis. | AIM: N-acetylcysteine (NAC), a thiol-containing antioxidant and glutathione (GSH) precursor, attenuates oxidative stress… | doesn't | MS patients; erythrocyte GSH did NOT change — tension with 'raises glutathione' (for U4) |

## S3-4. `dimension:melatonin-sleep/populationRelevance` — **no full support — owner decides**

**Library claim:** Melatonin — Sleep onset (Grade A): Reduces sleep-onset latency and helps shift circadian timing; lower doses often sufficient. [dimension populationRelevance, score 3: Directly relevant to delayed onset and jet lag.]

Query `melatonin (jet lag OR delayed sleep phase)` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 33259790 | 10.1016/j.cub.2020.10.092 | Randomized Controlled Trial | 2021 | Current biology : CB | Prolonged, Controlled Daytime versus Delayed Eating Impacts Weight and Metabolism. | A delayed eating schedule is associated with increased risk of obesity and metabolic dysfunction in humans.1-9 However, … | doesn't | meal timing, not melatonin |
| 2 | 24780537 | — | Systematic Review | 2014 | BMJ clinical evidence | Jet lag. | INTRODUCTION: Jet lag is a syndrome caused by disruption of the 'body clock', and affects most air travellers crossing f… | partial | BMJ Clin Evid jet-lag review lists melatonin; findings not in abstract; no DOI |
| 3 | 34030534 | 10.1080/07420528.2021.1930029 | Systematic Review | 2021 | Chronobiology international | Evening wear of blue-blocking glasses for sleep and mood disorders: a systematic review. | Blue-blocking glasses, also known as amber glasses, are plastic glasses that primarily block blue light. Blue-blocking g… | doesn't | blue-blocking glasses |

## S3-5. `effect:magnesium-stress` — candidate supports

**Library claim:** Magnesium — Stress & relaxation (Grade C): Emerging evidence for stress symptom reduction, often combined with B6.

Query `magnesium supplementation stress anxiety` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 28445426 | 10.3390/nu9050429 | Systematic Review | 2017 | Nutrients | The Effects of Magnesium Supplementation on Subjective Anxiety and Stress-A Systematic Review. | BACKGROUND: Anxiety related conditions are the most common affective disorders present in the general population with a … | partial | suggestive benefit on subjective anxiety; poor-quality evidence; no study measured stress |
| 2 | 33864354 | 10.1002/smi.3051 | Randomized Controlled Trial | 2021 | Stress and health : journal of the International Society for the Investigation of Stress | Effect of magnesium and vitamin B6 supplementation on mental health and quality of life in stressed healthy adults: Post-hoc analysis of a randomised controlled trial. | Magnesium status and vitamin B6 intake have been linked to mental health and/or quality of life (QoL). In an 8-week Phas… | **supports** | Mg ± B6 in stressed adults with low magnesemia: meaningful benefit; post-hoc analysis |
| 3 | 32503201 | 10.3390/nu12061661 | Systematic Review | 2020 | Nutrients | The Role and the Effect of Magnesium in Mental Disorders: A Systematic Review. | INTRODUCTION: Magnesium is an essential cation involved in many functions within the central nervous system, including t… | partial | mental disorders review; supplementation 'could be beneficial' |

## S3-6. `effect:vitamin-d-immune` — candidate supports

**Library claim:** Vitamin D3 — Immune support (Grade C): Mixed evidence; respiratory infection benefit appears largest in deficient people.

Query `vitamin D supplementation acute respiratory infection` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 28202713 | 10.1136/bmj.i6583 | Meta-Analysis, Systematic Review | 2017 | BMJ (Clinical research ed.) | Vitamin D supplementation to prevent acute respiratory tract infections: systematic review and meta-analysis of individual participant data. | Objectives To assess the overall effect of vitamin D supplementation on risk of acute respiratory tract infection, and t… | **supports** | IPD MA: protective against acute respiratory infection; most benefit in the very deficient |
| 2 | 39993397 | 10.1016/S2213-8587(24)00348-6 | Systematic Review, Meta-Analysis | 2025 | The lancet. Diabetes & endocrinology | Vitamin D supplementation to prevent acute respiratory infections: systematic review and meta-analysis of stratified aggregate data. | BACKGROUND: A 2021 meta-analysis of 37 randomised controlled trials (RCTs) of vitamin D supplementation for prevention o… | partial | 2025 update: similar point estimate but CI now includes 1 — no significant protection (for U4) |
| 3 | 30675873 | 10.3310/hta23020 | Meta-Analysis | 2019 | Health technology assessment (Winchester, England) | Vitamin D supplementation to prevent acute respiratory infections: individual participant data meta-analysis. | BACKGROUND: Randomised controlled trials (RCTs) exploring the potential of vitamin D to prevent acute respiratory infect… | **supports** | HTA IPD MA: benefit in deficient individuals and without bolus dosing |

## S3-7. `effect:ashwagandha-sleep` — candidate supports

**Library claim:** Ashwagandha — Sleep quality (Grade C): Some evidence for improved sleep, often secondary to stress reduction.

Query `ashwagandha Withania somnifera sleep` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 34559859 | 10.1371/journal.pone.0257843 | Meta-Analysis, Systematic Review | 2021 | PloS one | Effect of Ashwagandha (Withania somnifera) extract on sleep: A systematic review and meta-analysis. | OBJECTIVE: To determine the effect of Ashwagandha extract on sleep. METHODS: A comprehensive search was conducted in CEN… | **supports** | MA: extract improved sleep in adults |
| 2 | 39083548 | 10.1002/hup.2911 | Systematic Review, Meta-Analysis | 2024 | Human psychopharmacology | Safety and efficacy of Withania somnifera for anxiety and insomnia: Systematic review and meta-analysis. | OBJECTIVE: Despite the historical neurological use of Withania somnifera, limited evidence supports its efficacy for con… | **supports** | MA: reduced sleep-onset latency, raised total sleep time and PSQI |
| 3 | 32818573 | 10.1016/j.jep.2020.113276 | Multicenter Study, Randomized Controlled Trial | 2021 | Journal of ethnopharmacology | Clinical evaluation of the pharmacological impact of ashwagandha root extract on sleep in healthy volunteers and insomnia patients: A double-blind, randomized, parallel-group, placebo-controlled study. | ETHNOPHARMACOLOGICAL RELEVANCE: Ashwagandha (Withania somnifera (L.) Dunal.) is long known for its sleep-inducing effect… | **supports** | RCT: root extract improved sleep quality in healthy and insomnia groups |

## S3-8. `effect:protein-powder-recovery` — **no candidate supports — owner decides**

**Library claim:** Protein Powder (Whey) — Recovery & satiety (Grade B): Supports post-exercise recovery and appetite control.

Query `protein supplementation recovery exercise-induced muscle damage` (filtered)

| # | PMID | DOI | Type | Year | Journal | Title | Excerpt | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 39060741 | 10.1007/s40279-024-02079-0 | Systematic Review, Meta-Analysis | 2024 | Sports medicine (Auckland, N.Z.) | Impact of Collagen Peptide Supplementation in Combination with Long-Term Physical Training on Strength, Musculotendinous Remodeling, Functional Recovery, and Body Composition in Healthy Adults: A Systematic Review with Meta-analysis. | INTRODUCTION: Over the past decade, collagen peptide (CP) supplements have received considerable attention in sports nut… | doesn't | collagen peptides, not whey |
| 2 | 37462346 | 10.1080/15502783.2023.2236060 | Systematic Review | 2023 | Journal of the International Society of Sports Nutrition | Effects of dietary supplements on athletic performance in elite soccer players: a systematic review. | Dietary supplements are widely used among athletes, and soccer players are no exception. Nevertheless, evidence supporti… | doesn't | soccer supplements review; no protein recovery finding |
| 3 | 33441158 | 10.1186/s12970-020-00405-1 | Randomized Controlled Trial | 2021 | Journal of the International Society of Sports Nutrition | The effect of Omega-3 polyunsaturated fatty acid supplementation on exercise-induced muscle damage. | BACKGROUND: Exercise-induced muscle damage (EIMD) results in transient muscle inflammation, strength loss, muscle sorene… | doesn't | omega-3, not protein |
