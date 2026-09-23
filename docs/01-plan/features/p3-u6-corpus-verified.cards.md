# p3-u6-corpus-verified — appendix: card-field review for (c)

> Appendix to `p3-u6-corpus-verified.plan.md` §7. **For owner review before (c) is committed.** One table: every field of every verified paper, **before** (the illustrative text at anchor `4ee80b6`) and **after**. **Titles** are the resolver's (fixture entry, checked by P4). **All other fields** were rewritten by Claude **only from that paper's captured PubMed abstract**, or read *"Not reported in abstract"* (owner ruling, 2026-09-23). The abstracts are in the gitignored `captures/2026-09-23-s1/local/`, and their SHA-256 values are committed. All seven card fields were rewritten, not only the four the ruling names: intervention, duration and limitations were illustrative too.

**24 papers** (7 new ids) · **168 card fields** rewritten, **41** of them *"Not reported in abstract"*, plus 24 resolver titles.

| Paper | Field | Before (illustrative) | After |
|---|---|---|---|
| **#1** `p-creatine-strength`<br>PMID 39519498 | title | Effects of creatine supplementation on strength and lean mass | Effects of Creatine Supplementation and Resistance Training on Muscle Strength Gains in Adults <50 Years of Age: A Systematic Review and Meta-Analysis. |
|  | population | Trained and untrained adults | Adults under 50 years; 23 studies (20 in males, 2 in females, 1 mixed) |
|  | intervention | Creatine monohydrate + resistance training | Creatine supplementation combined with resistance training vs placebo |
|  | dose | 3-5 g/day | Not reported in abstract |
|  | duration | 6-12 weeks | Not reported in abstract |
|  | outcomes | Significant increases in maximal strength and lean body mass vs placebo. | Greater upper-body (WMD 4.43 kg) and lower-body (WMD 11.35 kg) strength gains vs placebo; gains significant in males, not in females. |
|  | limitations | Heterogeneous training protocols across included studies. | Not reported in abstract |
|  | summary | Pooled analysis supports creatine as one of the most effective performance aids for strength when paired with training. | Meta-analysis: creatine plus resistance training increased upper- and lower-body strength in adults under 50, with larger benefits likely in males than females. |
| **#2** `p-creatine-cognition`<br>PMID 29704637 | title | Creatine and cognitive performance under sleep deprivation | Effects of creatine supplementation on cognitive function of healthy individuals: A systematic review of randomized controlled trials. |
|  | population | Healthy adults | Healthy individuals (6 RCTs, 281 participants) |
|  | intervention | Creatine vs placebo | Oral creatine supplementation |
|  | dose | 5 g/day | Not reported in abstract |
|  | duration | 4 weeks | Not reported in abstract |
|  | outcomes | Modest cognitive benefits, most apparent under sleep deprivation. | Short-term memory and intelligence/reasoning may improve; results for other cognitive domains conflicting; no change in young individuals; vegetarians responded better than meat-eaters on memory tasks. |
|  | limitations | Small sample; effects inconsistent in rested participants. | Effects on most cognitive domains unclear; authors call for larger samples. |
|  | summary | Suggests context-dependent cognitive benefits rather than a universal nootropic effect. | Systematic review: creatine may improve short-term memory and reasoning in healthy people, with potential benefit suggested for aging and stressed individuals. |
| **#3** `p-melatonin-sleep`<br>PMID 23691095 | title | Melatonin for sleep onset: a meta-analysis | Meta-analysis: melatonin for the treatment of primary sleep disorders. |
|  | population | Adults with sleep difficulties | Adults and children with primary sleep disorders (19 studies, 1683 participants) |
|  | intervention | Melatonin vs placebo | Melatonin vs placebo |
|  | dose | 0.5-5 mg | Not reported in abstract |
|  | duration | Varied | Not reported in abstract |
|  | outcomes | Reduced sleep-onset latency and improved total sleep time. | Sleep latency 7.06 min shorter, total sleep time 8.25 min longer, overall sleep quality improved (SMD 0.22); longer trials and higher doses showed larger effects on latency and total sleep time. |
|  | limitations | Effect sizes smaller than prescription hypnotics. | Effects are modest and smaller than those of other prescription sleep medicines. |
|  | summary | Consistent evidence for melatonin reducing time to fall asleep, with a favorable safety profile. | Meta-analysis: melatonin modestly shortened sleep-onset latency and lengthened total sleep time, and the effects did not fade with continued use. |
| **#4** `p-magnesium-sleep`<br>PMID 33865376 | title | Magnesium supplementation and subjective sleep quality | Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis. |
|  | population | Older adults with insomnia | Older adults with insomnia (3 RCTs, 151 participants) |
|  | intervention | Magnesium vs placebo | Oral magnesium vs placebo |
|  | dose | 500 mg/day | Less than 1 g, up to three times a day (authors' conclusion) |
|  | duration | 8 weeks | Not reported in abstract |
|  | outcomes | Improved sleep efficiency and subjective insomnia scores. | Sleep onset latency 17.36 min shorter vs placebo; total sleep time 16.06 min longer, not statistically significant. |
|  | limitations | Small, older-adult sample; may not generalize. | All trials at moderate-to-high risk of bias; low to very low quality of evidence. |
|  | summary | Suggests benefit chiefly in those with low magnesium status or older age. | Systematic review: the evidence is too weak for firm recommendations, though RCT evidence may support oral magnesium for insomnia symptoms in older adults. |
| **#5** `p-vitamin-d-deficiency`<br>PMID 22552031 | title | Vitamin D supplementation to correct deficiency | Comparison of vitamin D2 and vitamin D3 supplementation in raising serum 25-hydroxyvitamin D status: a systematic review and meta-analysis. |
|  | population | Vitamin D-deficient adults | Adults in RCTs directly comparing vitamin D2 and D3 |
|  | intervention | Vitamin D3 vs D2 vs placebo | Vitamin D3 vs vitamin D2 |
|  | dose | 1000-4000 IU/day | Not reported in abstract |
|  | duration | 12 weeks | Not reported in abstract |
|  | outcomes | D3 raised serum 25(OH)D more effectively than D2. | D3 raised serum 25(OH)D more than D2 (P = 0.001); the advantage held for bolus doses but was lost with daily supplementation. |
|  | limitations | Focused on biomarker, not clinical endpoints. | Effects across age, sex and ethnicity could not be verified. |
|  | summary | Strong support for D3 to correct deficiency; clinical benefits largest in deficient people. | Meta-analysis: vitamin D3 raised serum 25(OH)D more effectively than D2, particularly when given as a bolus. |
| **#6** `p-fish-oil-cv`<br>PMID 37264945 | title | Omega-3 fatty acids and triglycerides: a meta-analysis | Association Between Omega-3 Fatty Acid Intake and Dyslipidemia: A Continuous Dose-Response Meta-Analysis of Randomized Controlled Trials. |
|  | population | Adults with elevated triglycerides | 90 RCTs, 72,598 participants |
|  | intervention | EPA/DHA vs placebo | Omega-3 fatty acids (DHA, EPA or both) |
|  | dose | 1-4 g/day | Dose-response modelled; near-linear effects most evident at medium to high doses (>2 g/d) |
|  | duration | Varied | Not reported in abstract |
|  | outcomes | Dose-dependent reduction in triglycerides. | Near-linear, dose-dependent lowering of triglycerides and non-HDL cholesterol; J-shaped curves for LDL and HDL cholesterol. |
|  | limitations | Cardiovascular event reduction less consistent than lipid effects. | Not reported in abstract |
|  | summary | Reliable triglyceride lowering; broader CV outcomes depend on dose and population. | Dose-response meta-analysis: omega-3 intake lowered triglycerides and non-HDL cholesterol roughly in proportion to dose. |
| **#7** `p-fish-oil-mood`<br>PMID 31383846 | title | EPA-rich omega-3 for depressive symptoms | Efficacy of omega-3 PUFAs in depression: A meta-analysis. |
|  | population | Adults with depressive symptoms | 26 double-blind, placebo-controlled RCTs (2160 participants) |
|  | intervention | High-EPA omega-3 vs placebo | Omega-3 PUFAs (EPA, DHA) vs placebo |
|  | dose | 1-2 g/day EPA | EPA ≤1 g/d in the formulations showing benefit |
|  | duration | 12 weeks | Not reported in abstract |
|  | outcomes | Modest improvement in depressive symptoms with higher-EPA formulas. | Overall benefit on depression symptoms (SMD -0.28); EPA-pure and EPA-major (≥60% EPA) formulations showed benefit, DHA-pure and DHA-major did not. |
|  | limitations | Mixed across formulations; publication bias possible. | Not reported in abstract |
|  | summary | Suggests EPA-dominant formulations may help mood in some individuals. | Meta-analysis: omega-3 formulations with at least 60% EPA, at up to 1 g/d EPA, were associated with improved depression symptoms. |
| **#8** `p-ltheanine-focus`<br>PMID 40314930 | title | L-theanine and caffeine on attention | Effects of Tea (Camellia sinensis) or its Bioactive Compounds l-Theanine or l-Theanine plus Caffeine on Cognition, Sleep, and Mood in Healthy Participants: A Systematic Review and Meta-Analysis of Randomized Controlled Trials. |
|  | population | Healthy adults | Healthy participants (50 RCTs reviewed, 15 meta-analysed) |
|  | intervention | L-theanine + caffeine vs placebo | Tea, L-theanine alone, or L-theanine plus caffeine vs placebo |
|  | dose | 100 mg theanine + 50 mg caffeine | Not reported in abstract |
|  | duration | Acute | Acute; outcomes in the first and second hour after intake |
|  | outcomes | Improved attention-switching and reduced distraction. | Small-to-moderate differences favouring theanine plus caffeine on choice reaction time, digit vigilance accuracy, attention-switching accuracy and mood; theanine alone favoured on choice reaction time. |
|  | limitations | Acute, small sample. | Confidence intervals frequently left the direction and size of the effects uncertain. |
|  | summary | Supports the popular theanine+caffeine pairing for calm, sustained focus. | Meta-analysis: theanine plus caffeine, and theanine alone, could benefit short-term cognition and mood, but wide confidence intervals leave the size and direction of the effects uncertain. |
| **#9** `p-ltheanine-stress`<br>PMID 16930802 | title | L-theanine and acute stress response | L-Theanine reduces psychological and physiological stress responses. |
|  | population | Healthy adults | 12 participants |
|  | intervention | L-theanine vs placebo | L-theanine vs placebo vs nothing, double-blind, counterbalanced, during a mental arithmetic stress task |
|  | dose | 200 mg | Not reported in abstract |
|  | duration | Acute | Single laboratory sessions |
|  | outcomes | Reduced heart-rate and stress markers under task stress. | Smaller heart-rate and salivary IgA responses to acute stress vs placebo; heart-rate variability suggested reduced sympathetic activation. |
|  | limitations | Very small sample. | Not reported in abstract |
|  | summary | Early evidence for acute stress buffering without sedation. | Small crossover study: L-theanine reduced physiological stress responses to an acute mental task. |
| **#10** `p-glycine-sleep`<br>DOI 10.1111/j.1479-8425.2007.00262.x | title | Glycine ingestion before bedtime improves sleep quality | Glycine ingestion improves subjective sleep quality in human volunteers, correlating with polysomnographic changes |
|  | population | Adults with sleep complaints | Not reported in abstract |
|  | intervention | Glycine vs placebo before bed | Not reported in abstract |
|  | dose | 3 g | Not reported in abstract |
|  | duration | Several nights | Not reported in abstract |
|  | outcomes | Improved subjective sleep quality and next-day alertness. | Not reported in abstract |
|  | limitations | Small sample; subjective endpoints. | Not reported in abstract |
|  | summary | Suggests pre-bed glycine improves perceived sleep, possibly via thermoregulation. | Not reported in abstract |
| **#11** `p-ashwagandha-stress`<br>PMID 37832082 | title | Ashwagandha root extract on stress and cortisol | A standardized Ashwagandha root extract alleviates stress, anxiety, and improves quality of life in healthy adults by modulating stress hormones: Results from a randomized, double-blind, placebo-controlled study. |
|  | population | Chronically stressed adults | Healthy adults with mild to moderate stress and anxiety (54 randomised, 50 completed) |
|  | intervention | Ashwagandha vs placebo | Ashwagandha root extract standardised to 2.5% withanolides, with piperine, vs placebo |
|  | dose | 300 mg twice daily | 500 mg extract (12.5 mg withanolides) with 5 mg piperine, once daily at night |
|  | duration | 8 weeks | 60 days |
|  | outcomes | Significant reductions in perceived stress and serum cortisol. | Perceived stress, anxiety (GAD-7) and quality-of-life scores improved vs placebo; morning salivary cortisol fell more and urinary serotonin rose; NO, GSH and MDA unchanged. |
|  | limitations | Single-center; industry-funded. | Not reported in abstract |
|  | summary | One of several trials supporting ashwagandha for stress and cortisol modulation. | Randomized, double-blind trial: the extract reduced perceived stress and anxiety and lowered morning cortisol vs placebo in healthy adults. |
| **#12** `p-berberine-metabolic`<br>PMID 34956436 | title | Berberine for type 2 diabetes: a meta-analysis | The Effect of Berberine on Metabolic Profiles in Type 2 Diabetic Patients: A Systematic Review and Meta-Analysis of Randomized Controlled Trials. |
|  | population | Adults with type 2 diabetes | Patients with type 2 diabetes (46 RCTs) |
|  | intervention | Berberine vs placebo or oral hypoglycemics | Berberine alone or with standard diabetes therapy vs control |
|  | dose | 0.9-1.5 g/day | Not reported in abstract |
|  | duration | Varied | Not reported in abstract |
|  | outcomes | Reductions in fasting glucose and HbA1c comparable to some agents. | Lower HbA1c (MD -0.73), fasting glucose (MD -0.86) and 2-h postprandial glucose (MD -1.26); improved insulin-resistance measures; lower triglycerides and higher HDL. |
|  | limitations | Variable study quality; GI side effects common. | Not reported in abstract |
|  | summary | Promising glycemic effects, tempered by GI tolerability and study heterogeneity. | Meta-analysis: berberine, alone or added to standard therapy, improved glycaemic and lipid measures in type 2 diabetes. |
| **#13** `p-zinc-immune`<br>PMID 38719213 | title | Zinc lozenges and common cold duration | Zinc for prevention and treatment of the common cold. |
|  | population | Adults with common cold | Children and adults (34 RCTs, 8526 participants) |
|  | intervention | Zinc acetate lozenges vs placebo | Zinc in any form (mostly lozenges: acetate, gluconate or orotate) vs placebo, for prevention or during a cold |
|  | dose | 80-100 mg/day (lozenge) | Zinc gluconate lozenges 45-276 mg/day; other forms not reported in abstract |
|  | duration | Cold episode | Gluconate lozenges 4.5-21 days; prevention follow-up 5-18 months |
|  | outcomes | Shortened cold duration when started early. | Little or no effect on catching a cold; when taken during a cold, duration may be shorter (MD -2.37 days, low certainty); non-serious adverse events probably more frequent. |
|  | limitations | High lozenge doses; taste-related blinding issues. | Most studies at unclear or high risk of bias; wide variation in interventions and outcomes; incomplete reporting. |
|  | summary | Early high-dose lozenges may modestly shorten colds; not for chronic daily use. | Cochrane review: zinc may shorten ongoing colds (low-certainty evidence) but probably does not prevent them, and non-serious side effects are more common. |
| **#15** `p-b12-deficiency`<br>PMID 39373282 | title | Vitamin B12 status in vegetarians and supplementation | A systematic review and meta-analysis of functional vitamin B12 status among adult vegans. |
|  | population | Vegetarians and vegans | Adult vegans compared with vegetarians and omnivores (19 studies; 17 meta-analysed) |
|  | intervention | Oral B12 supplementation | Observational diet comparison; subgroup of vitamin B12 supplement users among vegans |
|  | dose | 250-1000 mcg/day | Not reported in abstract |
|  | duration | Varied | Not reported in abstract |
|  | outcomes | Supplementation corrected low B12 status. | Vegans had lower serum B12 and higher homocysteine than omnivores; vegans using B12 supplements had better values on all B12 biomarkers than non-users. |
|  | limitations | Observational; varied assay methods. | Serum B12 alone has limited sensitivity and specificity for functional deficiency. |
|  | summary | Strong rationale for B12 supplementation in plant-based diets. | Meta-analysis: vegan adults showed lower B12 status, and B12 supplement use among vegans was associated with better status on every measured biomarker. |
| **#17** `p-caffeine-training`<br>PMID 36615805 | title | Caffeine and exercise performance: a meta-analysis | Effects of Caffeine Intake on Endurance Running Performance and Time to Exhaustion: A Systematic Review and Meta-Analysis. |
|  | population | Athletes and active adults | 254 recreational and trained runners, mostly men (21 crossover RCTs) |
|  | intervention | Caffeine vs placebo | Acute caffeine vs placebo |
|  | dose | 3-6 mg/kg | 3-9 mg/kg |
|  | duration | Acute | Acute intake |
|  | outcomes | Improved endurance, power, and reduced perceived exertion. | Time to exhaustion improved (g = 0.392, medium); running time-trial times shorter (g = -0.101, small). |
|  | limitations | Inter-individual variability (genetics, habituation). | Few women studied; best dose not established. |
|  | summary | Strong ergogenic evidence across multiple exercise modalities. | Meta-analysis: acute caffeine improved endurance running performance in recreational and trained runners. |
| **#18** `p-protein-mps`<br>PMID 28698222 | title | Protein supplementation and resistance training adaptations | A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. |
|  | population | Resistance-trained adults | Healthy adults in resistance-training RCTs (49 studies, 1863 participants) |
|  | intervention | Protein supplementation + training | Dietary protein supplementation with resistance training |
|  | dose | 20-40 g/day | No further fat-free-mass gain beyond ~1.6 g/kg/day total protein |
|  | duration | 6+ weeks | Resistance training of at least 6 weeks |
|  | outcomes | Greater gains in strength and lean mass with adequate total protein. | Greater gains in 1-RM strength (2.49 kg), fat-free mass (0.30 kg) and muscle size; effect smaller with age and larger in resistance-trained people. |
|  | limitations | Benefit plateaus once total protein intake is sufficient. | Not reported in abstract |
|  | summary | Protein powder helps mainly by closing total daily protein gaps. | Meta-analysis: protein supplementation enhanced resistance-training gains in strength and muscle size, up to about 1.6 g/kg/day total protein. |
| **#19** `p-taurine-training`<br>PMID 29546641 | title | Taurine and endurance performance | The Effects of an Oral Taurine Dose and Supplementation Period on Endurance Exercise Performance in Humans: A Meta-Analysis. |
|  | population | Trained adults | Participants in 10 studies (7 time-to-exhaustion trials) |
|  | intervention | Taurine vs placebo | Isolated oral taurine |
|  | dose | 1-3 g | 1-6 g/day; dose did not change the effect |
|  | duration | Acute | Single dose up to 2 weeks |
|  | outcomes | Small endurance improvements in some protocols. | Endurance performance improved (g = 0.40), similarly in time-to-exhaustion trials (g = 0.43); acute and chronic supplementation did not differ. |
|  | limitations | Inconsistent dosing/timing across studies. | Not reported in abstract |
|  | summary | Possible minor ergogenic effect; evidence remains mixed. | Meta-analysis: a single oral dose of taurine (1-6 g) improved endurance performance. |
| **#21 (new id)** `p-magnesium-glucose`<br>PMID 34836329 | title | — (new id) | Oral Magnesium Supplementation for Treating Glucose Metabolism Parameters in People with or at Risk of Diabetes: A Systematic Review and Meta-Analysis of Double-Blind Randomized Controlled Trials. |
|  | population | — (new id) | People with diabetes or at high risk of diabetes |
|  | intervention | — (new id) | Oral magnesium vs placebo |
|  | dose | — (new id) | Not reported in abstract |
|  | duration | — (new id) | Not reported in abstract |
|  | outcomes | — (new id) | Lower fasting glucose in diabetes; in people at high risk, better plasma glucose, 2-h oral glucose tolerance results and insulin-sensitivity markers. |
|  | limitations | — (new id) | Not reported in abstract |
|  | summary | — (new id) | Meta-analysis of double-blind RCTs: oral magnesium improved glucose measures in diabetes and may improve insulin sensitivity in people at high risk. |
| **#22 (new id)** `p-creatine-recovery`<br>PMID 34472118 | title | — (new id) | Creatine supplementation effect on recovery following exercise-induced muscle damage: A systematic review and meta-analysis of randomized controlled trials. |
|  | population | — (new id) | Participants in 9 trials of exercise-induced muscle damage |
|  | intervention | — (new id) | Creatine vs placebo |
|  | dose | — (new id) | Not reported in abstract |
|  | duration | — (new id) | Not reported in abstract |
|  | outcomes | — (new id) | Lower creatine kinase overall (WMD -30.94) and at 48, 72 and 96 h; lactate dehydrogenase not significantly lower overall. |
|  | limitations | — (new id) | High heterogeneity and medium risk of bias; authors advise caution. |
|  | summary | — (new id) | Meta-analysis: creatine lowered creatine kinase after muscle-damaging exercise, though heterogeneity was high. |
| **#23 (new id)** `p-fish-oil-longevity`<br>PMID 32114706 | title | — (new id) | Omega-3 fatty acids for the primary and secondary prevention of cardiovascular disease. |
|  | population | — (new id) | Adults at varying cardiovascular risk (86 RCTs, 162,796 participants) |
|  | intervention | — (new id) | More long-chain omega-3 (mostly capsules) or ALA vs usual or lower intake |
|  | dose | — (new id) | Long-chain omega-3 from 0.5 g to more than 5 g a day |
|  | duration | — (new id) | 12 to 88 months |
|  | outcomes | — (new id) | Little or no effect of long-chain omega-3 on all-cause mortality (RR 0.97) or cardiovascular events; may slightly reduce coronary heart disease deaths and events; triglycerides about 15% lower. |
|  | limitations | — (new id) | Only 28 of 86 trials at low summary risk of bias. |
|  | summary | — (new id) | Cochrane review: more long-chain omega-3 had little or no effect on all-cause mortality, may slightly reduce coronary heart disease events, and lowered triglycerides. |
| **#27 (new id)** `p-creatine-vegetarian-cognition`<br>PMID 21118604 | title | — (new id) | The influence of creatine supplementation on the cognitive functioning of vegetarians and omnivores. |
|  | population | — (new id) | 128 young adult women, vegetarian or omnivore |
|  | intervention | — (new id) | Creatine vs placebo, double-blind |
|  | dose | — (new id) | 20 g creatine supplement |
|  | duration | — (new id) | 5 days |
|  | outcomes | — (new id) | No effect on verbal fluency or vigilance; better memory in vegetarians but not in meat-eaters; less variable choice reaction times in both groups. |
|  | limitations | — (new id) | Not reported in abstract |
|  | summary | — (new id) | RCT: five days of creatine improved memory in vegetarian but not in omnivorous young women. |
| **#29 (new id)** `p-fish-oil-triglycerides-t2d`<br>PMID 39163858 | title | — (new id) | Impact of omega-3 fatty acids on hypertriglyceridemia, lipidomics, and gut microbiome in patients with type 2 diabetes. |
|  | population | — (new id) | 309 Chinese patients with type 2 diabetes and hypertriglyceridemia |
|  | intervention | — (new id) | Fish oil vs corn oil, double-blind |
|  | dose | — (new id) | 4 g fish oil |
|  | duration | — (new id) | 12 weeks |
|  | outcomes | — (new id) | Larger triglyceride reduction with fish oil (-1.51 vs -0.66 mmol/L); minor effects on gut microbiota; baseline microbiota predicted the triglyceride response. |
|  | limitations | — (new id) | Not reported in abstract |
|  | summary | — (new id) | RCT: fish oil lowered triglycerides more than corn oil in type 2 diabetes with hypertriglyceridemia. |
| **#31 (new id)** `p-ashwagandha-stress-anxiety`<br>PMID 36017529 | title | — (new id) | Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress? A systematic review and meta-analysis of randomized controlled trials. |
|  | population | — (new id) | 12 RCTs, 1,002 participants aged 25-48 |
|  | intervention | — (new id) | Ashwagandha extract vs placebo |
|  | dose | — (new id) | Favourable effect on stress at 300-600 mg/d (dose-response analysis) |
|  | duration | — (new id) | Not reported in abstract |
|  | outcomes | — (new id) | Lower anxiety (SMD -1.55) and stress (SMD -1.75) vs placebo. |
|  | limitations | — (new id) | Low certainty of evidence for both outcomes; I² 83-94%. |
|  | summary | — (new id) | Meta-analysis: ashwagandha reduced stress and anxiety vs placebo, with low certainty of evidence. |
| **#32 (new id)** `p-caffeine-tolerance`<br>PMID 23108937 | title | — (new id) | Faster but not smarter: effects of caffeine and caffeine withdrawal on alertness and performance. |
|  | population | — (new id) | 369 adults: 212 medium-high and 157 non-low habitual caffeine consumers |
|  | intervention | — (new id) | Caffeine vs placebo after overnight abstinence, double-blind |
|  | dose | — (new id) | 100 mg, then 150 mg |
|  | duration | — (new id) | Single day |
|  | outcomes | — (new id) | Caffeine reversed withdrawal effects in medium-high consumers; in non-low consumers it reduced sleepiness but raised anxiety/jitteriness, with little net gain in alertness or mental performance; motor performance improved in both groups. |
|  | limitations | — (new id) | Not reported in abstract |
|  | summary | — (new id) | RCT: because of tolerance, habitual caffeine use gave little net gain in mental alertness beyond reversing withdrawal, though motor performance improved. |
