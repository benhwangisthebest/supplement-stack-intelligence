// GENERATED from content/seed/seed-effects.json — edit the JSON, then run npm run content:generate
import type { Effect } from "@/types";

// Design §3.1, §8.5 — effect-level grades (>=25 effects, >=1 per supplement).
// Grades reflect curated sample data for the MVP, not a formal evidence review.
export const SEED_EFFECTS: Effect[] = [
  {
    id: "magnesium-sleep",
    supplementId: "magnesium",
    name: "Sleep quality",
    outcomeCategory: "sleep",
    grade: "D",
    confidence: "low",
    summary: "May shorten the time to fall asleep (by about 17 minutes) in older adults with insomnia; total sleep time did not change significantly, and the evidence is low to very low quality.",
    relevantPopulation: "older adults with insomnia",
    studiedDose: {
      min: 200,
      max: 400,
      unit: "mg",
    },
    mechanismTags: ["GABA", "relaxation"],
    paperIds: ["p-magnesium-sleep"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 1,
          rationale: "Three small placebo-controlled randomised trials (151 older adults with insomnia) found a shorter time to fall asleep.",
          paperIds: ["p-magnesium-sleep"],
        },
        studyQuality: {
          score: 1,
          rationale: "All trials at moderate-to-high risk of bias; the evidence is rated low to very low quality.",
          paperIds: ["p-magnesium-sleep"],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 2,
          rationale: "Sleep-onset latency 17.36 minutes shorter than placebo; total sleep time +16.06 minutes, not significant.",
          paperIds: ["p-magnesium-sleep"],
        },
        populationRelevance: {
          score: 1,
          rationale: "Older adults with insomnia; magnesium status is not reported in the abstract.",
          paperIds: ["p-magnesium-sleep"],
        },
      },
    },
  },
  {
    id: "magnesium-stress",
    supplementId: "magnesium",
    name: "Stress & relaxation",
    outcomeCategory: "stress",
    grade: "D",
    confidence: "low",
    summary: "Emerging evidence for stress symptom reduction, often combined with B6.",
    relevantPopulation: "otherwise healthy adults with severe stress and low blood magnesium",
    studiedDose: {
      min: 200,
      max: 400,
      unit: "mg",
    },
    mechanismTags: ["GABA", "HPA-axis"],
    paperIds: ["p-magnesium-stress"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 1,
          rationale: "One randomised trial in stressed adults with low blood magnesium, comparing magnesium plus B6 with magnesium alone.",
          paperIds: ["p-magnesium-stress"],
        },
        studyQuality: {
          score: 1,
          rationale: "Post-hoc secondary analysis with no placebo arm.",
          paperIds: ["p-magnesium-stress"],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 1,
          rationale: "Only adults with severe stress and low blood magnesium.",
          paperIds: ["p-magnesium-stress"],
        },
      },
    },
  },
  {
    id: "magnesium-metabolic",
    supplementId: "magnesium",
    name: "Glucose metabolism",
    outcomeCategory: "metabolic",
    grade: "C",
    confidence: "low",
    summary: "May improve glucose measures and insulin-sensitivity markers in people with or at high risk of diabetes.",
    relevantPopulation: "people with or at high risk of diabetes",
    studiedDose: {
      min: 250,
      max: 400,
      unit: "mg",
    },
    mechanismTags: ["insulin-sensitivity"],
    paperIds: ["p-magnesium-glucose"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Meta-analysis of double-blind placebo-controlled trials in people with or at high risk of diabetes; the abstract gives no trial count.",
          paperIds: ["p-magnesium-glucose"],
        },
        studyQuality: {
          score: 2,
          rationale: "Double-blind randomised trials only; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-magnesium-glucose"],
        },
        consistency: {
          score: 2,
          rationale: "Glucose measures improved both in people with diabetes and in those at high risk.",
          paperIds: ["p-magnesium-glucose"],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 1,
          rationale: "People with or at high risk of diabetes; magnesium status is not reported in the abstract.",
          paperIds: ["p-magnesium-glucose"],
        },
      },
    },
  },
  {
    id: "creatine-strength",
    supplementId: "creatine",
    name: "Strength & power output",
    outcomeCategory: "training",
    grade: "A",
    confidence: "high",
    summary: "Has evidence for greater upper- and lower-body strength gains when combined with resistance training in adults under 50; the gains were significant in men but not in the few women studied.",
    relevantPopulation: "resistance-training adults under 50, mostly men",
    studiedDose: {
      min: 3,
      max: 5,
      unit: "g",
    },
    mechanismTags: ["phosphocreatine", "ATP"],
    paperIds: ["p-creatine-strength"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "23 placebo-controlled studies found greater upper- and lower-body strength gains with creatine plus resistance training.",
          paperIds: ["p-creatine-strength"],
        },
        studyQuality: {
          score: 2,
          rationale: "Placebo-controlled studies; the abstract reports no randomisation or risk-of-bias detail.",
          paperIds: ["p-creatine-strength"],
        },
        consistency: {
          score: 2,
          rationale: "Gains were significant in men; the few women studied (49 across three studies) showed no significant gains.",
          paperIds: ["p-creatine-strength"],
        },
        effectSize: {
          score: 2,
          rationale: "Upper-body strength +4.43 kg and lower-body strength +11.35 kg versus placebo.",
          paperIds: ["p-creatine-strength"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Adults under 50 in resistance training, mostly men.",
          paperIds: ["p-creatine-strength"],
        },
      },
    },
  },
  {
    id: "creatine-cognition",
    supplementId: "creatine",
    name: "Cognitive performance",
    outcomeCategory: "focus",
    grade: "C",
    confidence: "low",
    summary: "May improve short-term memory and reasoning in healthy people, with memory benefits seen in vegetarians; results in other cognitive areas conflict.",
    relevantPopulation: "healthy people; vegetarians for memory",
    studiedDose: {
      min: 5,
      max: 5,
      unit: "g",
    },
    mechanismTags: ["brain-energy"],
    paperIds: ["p-creatine-cognition", "p-creatine-vegetarian-cognition"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Six randomised trials (281 healthy people) suggest better short-term memory and reasoning; a further trial found better memory in vegetarians only.",
          paperIds: ["p-creatine-cognition", "p-creatine-vegetarian-cognition"],
        },
        studyQuality: {
          score: 1,
          rationale: "Small randomised trials with no quality rating reported; the authors call for larger samples.",
          paperIds: ["p-creatine-cognition"],
        },
        consistency: {
          score: 1,
          rationale: "Results conflicted across most cognitive domains; performance was unchanged in young people, and vegetarians responded better on memory.",
          paperIds: ["p-creatine-cognition", "p-creatine-vegetarian-cognition"],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 2,
          rationale: "Healthy people; the memory benefit was in vegetarians, and young people overall showed no change.",
          paperIds: ["p-creatine-cognition", "p-creatine-vegetarian-cognition"],
        },
      },
    },
  },
  {
    id: "creatine-recovery",
    supplementId: "creatine",
    name: "Recovery",
    outcomeCategory: "recovery",
    grade: "C",
    confidence: "low",
    summary: "May reduce muscle damage markers and support recovery between sessions.",
    relevantPopulation: "participants in exercise-induced muscle-damage trials (not further described)",
    studiedDose: {
      min: 3,
      max: 5,
      unit: "g",
    },
    mechanismTags: ["phosphocreatine"],
    paperIds: ["p-creatine-recovery"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Meta-analysis of 9 randomised placebo-controlled trials.",
          paperIds: ["p-creatine-recovery"],
        },
        studyQuality: {
          score: 1,
          rationale: "Included trials carried a medium risk of bias.",
          paperIds: ["p-creatine-recovery"],
        },
        consistency: {
          score: 1,
          rationale: "High heterogeneity; creatine kinase fell, but lactate dehydrogenase did not change overall.",
          paperIds: ["p-creatine-recovery"],
        },
        effectSize: {
          score: 1,
          rationale: "Lower creatine kinase (weighted mean difference −30.94); no overall change in lactate dehydrogenase.",
          paperIds: ["p-creatine-recovery"],
        },
        populationRelevance: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
      },
    },
  },
  {
    id: "vitamin-d-deficiency",
    supplementId: "vitamin-d",
    name: "Correcting deficiency",
    outcomeCategory: "deficiency",
    grade: "B",
    confidence: "moderate",
    summary: "Has evidence for raising serum 25(OH)D: in one two-year randomised trial, vitamin D3 at 4000 IU/day roughly doubled levels while placebo did not; in people with low levels, weekly dosing repleted about as well as daily.",
    relevantPopulation: "adults with low vitamin D status",
    studiedDose: {
      min: 1000,
      max: 4000,
      unit: "IU",
    },
    mechanismTags: ["calcitriol"],
    paperIds: ["p-vitamin-d-deficiency", "p-vitamin-d-prediabetes-rct", "p-vitamin-d-weekly-daily"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "One placebo-controlled randomised trial found vitamin D3 raised serum 25(OH)D; the two meta-analyses compare forms (D3 vs D2) and regimens (weekly vs daily), not supplement vs none.",
          paperIds: ["p-vitamin-d-prediabetes-rct", "p-vitamin-d-deficiency", "p-vitamin-d-weekly-daily"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised trials throughout, including a placebo-controlled trial (a prespecified secondary analysis); most studies in the deficiency meta-analysis were at risk of bias.",
          paperIds: ["p-vitamin-d-prediabetes-rct", "p-vitamin-d-deficiency", "p-vitamin-d-weekly-daily"],
        },
        consistency: {
          score: 1,
          rationale: "Heterogeneity was high in the weekly-versus-daily repletion analysis (I² 85.3%); the D3-over-D2 advantage held for bolus but not daily dosing.",
          paperIds: ["p-vitamin-d-weekly-daily", "p-vitamin-d-deficiency"],
        },
        effectSize: {
          score: 3,
          rationale: "Mean serum 25(OH)D rose from 27.9 to 54.9 ng/mL over 24 months on 4000 IU/day and was unchanged on placebo.",
          paperIds: ["p-vitamin-d-prediabetes-rct"],
        },
        populationRelevance: {
          score: 2,
          rationale: "One meta-analysis studied people with hypovitaminosis D (below 30 ng/mL); the placebo-controlled trial enrolled adults with prediabetes not selected by vitamin D status (mean baseline 27.9 ng/mL).",
          paperIds: ["p-vitamin-d-weekly-daily", "p-vitamin-d-prediabetes-rct"],
        },
      },
    },
  },
  {
    id: "vitamin-d-immune",
    supplementId: "vitamin-d",
    name: "Immune support",
    outcomeCategory: "foundational",
    grade: "C",
    confidence: "low",
    summary: "Mixed evidence; respiratory infection benefit appears largest in deficient people.",
    relevantPopulation: "children and adults, across vitamin D status",
    studiedDose: {
      min: 1000,
      max: 4000,
      unit: "IU",
    },
    mechanismTags: ["immune-modulation"],
    paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Large placebo-controlled trial meta-analyses: protection overall in 2017, not statistically significant in the 2025 update.",
          paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
        },
        studyQuality: {
          score: 2,
          rationale: "Double-blind randomised trials, rated high quality in 2017; the 2025 update found funnel-plot asymmetry.",
          paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
        },
        consistency: {
          score: 1,
          rationale: "The 2017 analysis found protection with significant heterogeneity; the 2025 update does not.",
          paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
        },
        effectSize: {
          score: 1,
          rationale: "Odds ratio 0.88 in 2017; 0.94, with a confidence interval including no effect, in 2025.",
          paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
        },
        populationRelevance: {
          score: 1,
          rationale: "2017 found most benefit in very deficient people; the 2025 update found no modification by baseline vitamin D status.",
          paperIds: ["p-vitamin-d-respiratory-ipd", "p-vitamin-d-respiratory-update"],
        },
      },
    },
  },
  {
    id: "fish-oil-cardiovascular",
    supplementId: "fish-oil",
    name: "Cardiovascular support",
    outcomeCategory: "metabolic",
    grade: "A",
    confidence: "high",
    summary: "May lower triglycerides; benefits dose-dependent on EPA/DHA content.",
    relevantPopulation: "adults with elevated triglycerides",
    studiedDose: {
      min: 1000,
      max: 4000,
      unit: "mg",
    },
    mechanismTags: ["triglyceride-lowering", "anti-inflammatory"],
    paperIds: ["p-fish-oil-cv", "p-fish-oil-triglycerides-t2d"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "90 randomised trials (72,598 participants) found omega-3 intake lowered triglycerides near-linearly with dose; a 309-patient randomised trial found the same in type 2 diabetes.",
          paperIds: ["p-fish-oil-cv", "p-fish-oil-triglycerides-t2d"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised trials, including a double-blind placebo-controlled trial; the abstracts report no risk-of-bias rating.",
          paperIds: ["p-fish-oil-cv", "p-fish-oil-triglycerides-t2d"],
        },
        consistency: {
          score: 2,
          rationale: "The triglyceride dose-response was approximately linear in the general population and more evident in hyperlipidaemia and overweight or obesity.",
          paperIds: ["p-fish-oil-cv"],
        },
        effectSize: {
          score: 2,
          rationale: "Triglycerides fell 1.51 mmol/L on 4 g fish oil versus 0.66 mmol/L on corn oil; the meta-analysis reports a dose-response shape, not a pooled size.",
          paperIds: ["p-fish-oil-triglycerides-t2d", "p-fish-oil-cv"],
        },
        populationRelevance: {
          score: 2,
          rationale: "The general population, more evident in hyperlipidaemia and overweight or obesity above 2 g/day; the trial enrolled Chinese adults with type 2 diabetes and high triglycerides.",
          paperIds: ["p-fish-oil-cv", "p-fish-oil-triglycerides-t2d"],
        },
      },
    },
  },
  {
    id: "fish-oil-mood",
    supplementId: "fish-oil",
    name: "Mood support",
    outcomeCategory: "mood",
    grade: "B",
    confidence: "moderate",
    summary: "Some evidence for depressive symptoms with higher-EPA formulations.",
    relevantPopulation: "adults with depressive symptoms",
    studiedDose: {
      min: 1000,
      max: 2000,
      unit: "mg",
    },
    mechanismTags: ["anti-inflammatory"],
    paperIds: ["p-fish-oil-mood"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "26 double-blind placebo-controlled trials, 2,160 participants.",
          paperIds: ["p-fish-oil-mood"],
        },
        studyQuality: {
          score: 2,
          rationale: "Double-blind randomised trials only; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-fish-oil-mood"],
        },
        consistency: {
          score: 1,
          rationale: "Benefit only in the EPA-rich subgroups of one meta-analysis (EPA-major P = 0.03); DHA-dominant formulations showed none.",
          paperIds: ["p-fish-oil-mood"],
        },
        effectSize: {
          score: 2,
          rationale: "Overall SMD −0.28; −0.50 and −1.03 for EPA-pure and EPA-major formulations at about 1 g/day.",
          paperIds: ["p-fish-oil-mood"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Trials in depression; participants are not described further in the abstract.",
          paperIds: ["p-fish-oil-mood"],
        },
      },
    },
  },
  {
    id: "fish-oil-longevity",
    supplementId: "fish-oil",
    name: "Healthy aging",
    outcomeCategory: "longevity",
    grade: "C",
    confidence: "low",
    summary: "Associated with favorable markers; causal longevity benefit unproven.",
    relevantPopulation: "general adults",
    studiedDose: {
      min: 1000,
      max: 2000,
      unit: "mg",
    },
    mechanismTags: ["anti-inflammatory"],
    paperIds: ["p-fish-oil-longevity"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 1,
          rationale: "86 randomised trials (162,796 participants) found little or no effect on all-cause mortality (high certainty) and slight reductions in coronary events (low certainty).",
          paperIds: ["p-fish-oil-longevity"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised trials of at least 12 months; 28 of 86 at low summary risk of bias.",
          paperIds: ["p-fish-oil-longevity"],
        },
        consistency: {
          score: 1,
          rationale: "No mortality benefit across trials, whatever the duration or dose; the coronary reductions are low certainty.",
          paperIds: ["p-fish-oil-longevity"],
        },
        effectSize: {
          score: 1,
          rationale: "All-cause mortality risk ratio 0.97; coronary heart disease events 0.91 (number needed to treat 167).",
          paperIds: ["p-fish-oil-longevity"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Adults at varying cardiovascular risk, mainly in high-income countries.",
          paperIds: ["p-fish-oil-longevity"],
        },
      },
    },
  },
  {
    id: "l-theanine-focus",
    supplementId: "l-theanine",
    name: "Calm focus (with caffeine)",
    outcomeCategory: "focus",
    grade: "B",
    confidence: "moderate",
    summary: "Combined with caffeine, may improve some attention measures in healthy people; the effects are small and uncertain.",
    relevantPopulation: "healthy adults",
    studiedDose: {
      min: 100,
      max: 200,
      unit: "mg",
    },
    mechanismTags: ["alpha-waves", "glutamate-modulation"],
    paperIds: ["p-ltheanine-focus"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Meta-analysis of randomised trials in healthy people: theanine plus caffeine improved some attention measures against placebo.",
          paperIds: ["p-ltheanine-focus"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised controlled trials; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-ltheanine-focus"],
        },
        consistency: {
          score: 1,
          rationale: "Confidence intervals often cross no effect; the authors note uncertainty in direction and magnitude.",
          paperIds: ["p-ltheanine-focus"],
        },
        effectSize: {
          score: 1,
          rationale: "Small to moderate: SMD 0.20 for vigilance accuracy and 0.33 for attention switching.",
          paperIds: ["p-ltheanine-focus"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Healthy participants; the authors call for studies in free-living settings.",
          paperIds: ["p-ltheanine-focus"],
        },
      },
    },
  },
  {
    id: "l-theanine-stress",
    supplementId: "l-theanine",
    name: "Stress & relaxation",
    outcomeCategory: "stress",
    grade: "D",
    confidence: "low",
    summary: "May reduce heart-rate and salivary IgA responses to acute stress; the evidence is one small laboratory trial.",
    relevantPopulation: "adults under acute stress",
    studiedDose: {
      min: 200,
      max: 400,
      unit: "mg",
    },
    mechanismTags: ["alpha-waves", "GABA"],
    paperIds: ["p-ltheanine-stress"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 1,
          rationale: "One small crossover trial (12 participants) using a laboratory stressor.",
          paperIds: ["p-ltheanine-stress"],
        },
        studyQuality: {
          score: 1,
          rationale: "Double-blind, placebo-controlled and counterbalanced, but only 12 participants.",
          paperIds: ["p-ltheanine-stress"],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 2,
          rationale: "Participants under an acute laboratory stressor (mental arithmetic).",
          paperIds: ["p-ltheanine-stress"],
        },
      },
    },
  },
  {
    id: "glycine-sleep",
    supplementId: "glycine",
    name: "Sleep quality",
    outcomeCategory: "sleep",
    grade: "D",
    confidence: "low",
    summary: "No verified evidence in this library: the one cited paper has no abstract to summarise.",
    relevantPopulation: "not described by a verified paper in this library",
    studiedDose: {
      min: 3,
      max: 3,
      unit: "g",
    },
    mechanismTags: ["inhibitory-neurotransmitter", "thermoregulation"],
    paperIds: ["p-glycine-sleep"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        studyQuality: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
      },
    },
  },
  {
    id: "melatonin-sleep",
    supplementId: "melatonin",
    name: "Sleep onset",
    outcomeCategory: "sleep",
    grade: "B",
    confidence: "moderate",
    summary: "May modestly shorten sleep-onset latency (about 7 minutes) and improve sleep quality in primary sleep disorders; higher doses and longer use showed larger effects.",
    relevantPopulation: "adults and children with primary sleep disorders",
    studiedDose: {
      min: 0.5,
      max: 3,
      unit: "mg",
    },
    mechanismTags: ["circadian", "MT-receptor"],
    paperIds: ["p-melatonin-sleep"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "19 placebo-controlled randomised trials (1,683 subjects) found shorter sleep latency, longer total sleep and better sleep quality.",
          paperIds: ["p-melatonin-sleep"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised placebo-controlled trials; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-melatonin-sleep"],
        },
        consistency: {
          score: 2,
          rationale: "Effects on latency and total sleep were larger with longer trials and higher doses; sleep-quality effects did not vary with dose or duration.",
          paperIds: ["p-melatonin-sleep"],
        },
        effectSize: {
          score: 1,
          rationale: "Modest, in the authors' words: sleep latency 7.06 minutes shorter, total sleep 8.25 minutes longer, sleep-quality SMD 0.22.",
          paperIds: ["p-melatonin-sleep"],
        },
        populationRelevance: {
          score: 1,
          rationale: "Adults and children with primary sleep disorders; jet lag and delayed sleep phase are not studied.",
          paperIds: ["p-melatonin-sleep"],
        },
      },
    },
  },
  {
    id: "ashwagandha-stress",
    supplementId: "ashwagandha",
    name: "Stress & cortisol",
    outcomeCategory: "stress",
    grade: "B",
    confidence: "moderate",
    summary: "May reduce perceived stress: a meta-analysis of 12 trials found lower stress than placebo on low-certainty evidence, and one 60-day trial also found lower morning cortisol.",
    relevantPopulation: "adults with mild to moderate stress",
    studiedDose: {
      min: 300,
      max: 600,
      unit: "mg",
    },
    mechanismTags: ["HPA-axis", "cortisol-modulation"],
    paperIds: ["p-ashwagandha-stress", "p-ashwagandha-stress-anxiety"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "A meta-analysis of 12 randomised trials (1,002 participants) and a 54-person randomised trial found lower perceived stress than placebo.",
          paperIds: ["p-ashwagandha-stress-anxiety", "p-ashwagandha-stress"],
        },
        studyQuality: {
          score: 1,
          rationale: "The meta-analysis rates the certainty of the evidence low; the single trial was double-blind and placebo-controlled, with 50 completers.",
          paperIds: ["p-ashwagandha-stress-anxiety", "p-ashwagandha-stress"],
        },
        consistency: {
          score: 1,
          rationale: "High heterogeneity for stress (I² 83.1%).",
          paperIds: ["p-ashwagandha-stress-anxiety"],
        },
        effectSize: {
          score: 3,
          rationale: "Stress SMD −1.75 versus placebo (95% CI −2.29 to −1.22).",
          paperIds: ["p-ashwagandha-stress-anxiety"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Adults aged 25 to 48 in the meta-analysis; the trial enrolled healthy adults with mild to moderate stress and anxiety.",
          paperIds: ["p-ashwagandha-stress-anxiety", "p-ashwagandha-stress"],
        },
      },
    },
  },
  {
    id: "ashwagandha-sleep",
    supplementId: "ashwagandha",
    name: "Sleep quality",
    outcomeCategory: "sleep",
    grade: "B",
    confidence: "moderate",
    summary: "May modestly improve sleep in adults, with larger effects in insomnia, at 600 mg/day or more and over 8 weeks or longer.",
    relevantPopulation: "adults, including adults with insomnia",
    studiedDose: {
      min: 300,
      max: 600,
      unit: "mg",
    },
    mechanismTags: ["HPA-axis"],
    paperIds: ["p-ashwagandha-sleep"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Five placebo-controlled randomised trials (400 adults) found an effect on overall sleep.",
          paperIds: ["p-ashwagandha-sleep"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised placebo-controlled trials; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-ashwagandha-sleep"],
        },
        consistency: {
          score: 1,
          rationale: "Substantial heterogeneity (I² 62%); effects larger in insomnia, at ≥600 mg/day and over ≥8 weeks.",
          paperIds: ["p-ashwagandha-sleep"],
        },
        effectSize: {
          score: 1,
          rationale: "Described by the authors as small but significant (SMD −0.59).",
          paperIds: ["p-ashwagandha-sleep"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Adults 18 and over; the effect was larger in adults diagnosed with insomnia.",
          paperIds: ["p-ashwagandha-sleep"],
        },
      },
    },
  },
  {
    id: "berberine-metabolic",
    supplementId: "berberine",
    name: "Blood sugar control",
    outcomeCategory: "metabolic",
    grade: "B",
    confidence: "moderate",
    summary: "May lower HbA1c and fasting glucose in type 2 diabetes, alone or added to standard therapy.",
    relevantPopulation: "people with type 2 diabetes",
    studiedDose: {
      min: 900,
      max: 1500,
      unit: "mg",
    },
    mechanismTags: ["AMPK", "insulin-sensitivity"],
    paperIds: ["p-berberine-metabolic"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "46 randomised trials in type 2 diabetes found lower HbA1c and fasting glucose with berberine, alone or added to standard therapy.",
          paperIds: ["p-berberine-metabolic"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised trials; the abstract reports no risk-of-bias rating, and comparisons mix berberine alone with berberine added to standard therapy.",
          paperIds: ["p-berberine-metabolic"],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 2,
          rationale: "Mean differences: HbA1c −0.73, fasting glucose −0.86, 2-hour glucose −1.26.",
          paperIds: ["p-berberine-metabolic"],
        },
        populationRelevance: {
          score: 2,
          rationale: "People with type 2 diabetes, often alongside standard diabetic therapy.",
          paperIds: ["p-berberine-metabolic"],
        },
      },
    },
  },
  {
    id: "zinc-immune",
    supplementId: "zinc",
    name: "Immune / cold duration",
    outcomeCategory: "foundational",
    grade: "C",
    confidence: "low",
    summary: "Used as treatment, zinc may shorten colds (low-certainty evidence); it shows little or no effect on preventing them.",
    relevantPopulation: "children and adults with colds",
    studiedDose: {
      min: 10,
      max: 25,
      unit: "mg",
    },
    mechanismTags: ["immune-cell-function"],
    paperIds: ["p-zinc-immune"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 1,
          rationale: "Zinc used as treatment may shorten colds (low-certainty evidence); it shows little or no effect on preventing them.",
          paperIds: ["p-zinc-immune"],
        },
        studyQuality: {
          score: 1,
          rationale: "Most trials were at unclear or high risk of bias in at least one domain; the duration evidence is low certainty.",
          paperIds: ["p-zinc-immune"],
        },
        consistency: {
          score: 1,
          rationale: "Very high heterogeneity for cold duration in treatment trials (I² 97%).",
          paperIds: ["p-zinc-immune"],
        },
        effectSize: {
          score: 2,
          rationale: "Colds 2.37 days shorter on average (95% CI 0.53 to 4.21), low certainty.",
          paperIds: ["p-zinc-immune"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Adults and children; about half the trials used lozenges.",
          paperIds: ["p-zinc-immune"],
        },
      },
    },
  },
  {
    id: "zinc-deficiency",
    supplementId: "zinc",
    name: "Correcting deficiency",
    outcomeCategory: "deficiency",
    grade: "C",
    confidence: "low",
    summary: "Higher zinc intake is associated with modestly higher serum zinc (about 6% per doubling of intake); the cited evidence does not analyse deficient individuals.",
    relevantPopulation: "adults generally; deficiency not analysed",
    studiedDose: {
      min: 8,
      max: 25,
      unit: "mg",
    },
    mechanismTags: ["enzyme-cofactor"],
    paperIds: ["p-zinc-deficiency"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Meta-analysis of human randomised trials and observational studies relating zinc intake to serum/plasma zinc.",
          paperIds: ["p-zinc-deficiency"],
        },
        studyQuality: {
          score: 1,
          rationale: "Pools randomised trials with observational studies; the abstract reports no quality assessment.",
          paperIds: ["p-zinc-deficiency"],
        },
        consistency: {
          score: 1,
          rationale: "High heterogeneity across studies (I² 84.5%).",
          paperIds: ["p-zinc-deficiency"],
        },
        effectSize: {
          score: 1,
          rationale: "About 6% higher serum/plasma zinc for each doubling of zinc intake.",
          paperIds: ["p-zinc-deficiency"],
        },
        populationRelevance: {
          score: 1,
          rationale: "Adults generally; the abstract reports no analysis of deficient individuals.",
          paperIds: ["p-zinc-deficiency"],
        },
      },
    },
  },
  {
    id: "vitamin-b12-deficiency",
    supplementId: "vitamin-b12",
    name: "Correcting deficiency",
    outcomeCategory: "deficiency",
    grade: "B",
    confidence: "moderate",
    summary: "Oral, sublingual and injected B12 raised serum B12 comparably in people with deficiency, on low-quality randomised evidence; vegans using supplements had better B12 status than non-users.",
    relevantPopulation: "vegans, older adults, malabsorbers",
    studiedDose: {
      min: 250,
      max: 1000,
      unit: "mcg",
    },
    mechanismTags: ["methylation"],
    paperIds: ["p-b12-deficiency", "p-b12-oral-routes", "p-b12-oral-vs-im"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "16 human studies (6,098 participants) of oral, sublingual or injected B12, mixing trials with observational studies; 3 small randomised trials compare oral with injected B12.",
          paperIds: ["p-b12-oral-routes", "p-b12-oral-vs-im"],
        },
        studyQuality: {
          score: 1,
          rationale: "The randomised evidence is rated low quality, from 3 trials with 153 participants.",
          paperIds: ["p-b12-oral-vs-im"],
        },
        consistency: {
          score: 1,
          rationale: "Substantial heterogeneity between studies (I² > 80% in most comparisons).",
          paperIds: ["p-b12-oral-routes"],
        },
        effectSize: {
          score: 2,
          rationale: "Serum cobalamin +402.6 pg/mL and homocysteine −4.83 µmol/L; no trial reported clinical signs or symptoms.",
          paperIds: ["p-b12-oral-routes", "p-b12-oral-vs-im"],
        },
        populationRelevance: {
          score: 3,
          rationale: "People with B12 deficiency, with comparable effects across age groups and after gastrectomy; vegans using supplements had better B12 status than non-users.",
          paperIds: ["p-b12-oral-routes", "p-b12-oral-vs-im", "p-b12-deficiency"],
        },
      },
    },
  },
  {
    id: "caffeine-focus",
    supplementId: "caffeine",
    name: "Alertness & focus",
    outcomeCategory: "focus",
    grade: "B",
    confidence: "moderate",
    summary: "May improve attention, vigilance and reaction time, with most evidence from sleep-deprived, shift-work or jet-lag settings; in rested adults, trials found mainly faster reaction times and little gain in mental alertness.",
    relevantPopulation: "sleep-deprived or shift-working adults; rested adults for reaction time",
    studiedDose: {
      min: 100,
      max: 200,
      unit: "mg",
    },
    mechanismTags: ["adenosine-antagonism"],
    paperIds: ["p-caffeine-focus", "p-caffeine-tolerance", "p-caffeine-shift-work", "p-caffeine-military", "p-caffeine-glucose"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "Two reviews of randomised trials (13 and 25 trials) found better attention, vigilance and reaction time, mainly under sleep deprivation or shift work; in rested adults, trials found faster reaction times but little gain in mental alertness.",
          paperIds: ["p-caffeine-shift-work", "p-caffeine-military", "p-caffeine-focus", "p-caffeine-tolerance", "p-caffeine-glucose"],
        },
        studyQuality: {
          score: 1,
          rationale: "The Cochrane review rated its trials at high risk of bias for allocation concealment and selective reporting; the other review reports no quality rating; the single trials are randomised, one with only 20 participants.",
          paperIds: ["p-caffeine-shift-work", "p-caffeine-military", "p-caffeine-focus", "p-caffeine-tolerance", "p-caffeine-glucose"],
        },
        consistency: {
          score: 1,
          rationale: "The benefit depends on context: clear under sleep deprivation or shift work, little mental-alertness gain in non-low habitual consumers, and only simple reaction time in rested young adults.",
          paperIds: ["p-caffeine-shift-work", "p-caffeine-military", "p-caffeine-tolerance", "p-caffeine-glucose"],
        },
        effectSize: {
          score: 2,
          rationale: "Orientation and attention SMD −0.55 versus placebo in shift-work and jet-lag trials; the other sources report no magnitudes.",
          paperIds: ["p-caffeine-shift-work"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Mostly sleep-deprived, shift-work or military settings, largely young participants under simulated conditions; rested adults were studied in two trials.",
          paperIds: ["p-caffeine-shift-work", "p-caffeine-military", "p-caffeine-focus", "p-caffeine-tolerance", "p-caffeine-glucose"],
        },
      },
    },
  },
  {
    id: "caffeine-training",
    supplementId: "caffeine",
    name: "Exercise performance",
    outcomeCategory: "training",
    grade: "A",
    confidence: "high",
    summary: "Has evidence for improved endurance running performance, mainly time to exhaustion, in recreational and trained runners.",
    relevantPopulation: "athletes, training adults",
    studiedDose: {
      min: 150,
      max: 300,
      unit: "mg",
    },
    mechanismTags: ["adenosine-antagonism", "ergogenic"],
    paperIds: ["p-caffeine-training"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "21 placebo-controlled crossover trials in runners.",
          paperIds: ["p-caffeine-training"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised, blinded crossover trials rated unclear-to-low risk of bias; 254 participants in total.",
          paperIds: ["p-caffeine-training"],
        },
        consistency: {
          score: 2,
          rationale: "Benefit found in both recreational and trained runners, and in both test types.",
          paperIds: ["p-caffeine-training"],
        },
        effectSize: {
          score: 2,
          rationale: "Medium for time to exhaustion (g 0.39); small for time trials (g −0.10).",
          paperIds: ["p-caffeine-training"],
        },
        populationRelevance: {
          score: 2,
          rationale: "Recreational and trained runners, mostly men; few women studied.",
          paperIds: ["p-caffeine-training"],
        },
      },
    },
  },
  {
    id: "taurine-training",
    supplementId: "taurine",
    name: "Exercise performance",
    outcomeCategory: "training",
    grade: "C",
    confidence: "low",
    summary: "Has evidence for improved endurance performance, with similar benefit for single or repeated doses of 1–6 g.",
    relevantPopulation: "participants in endurance-performance trials (not further described)",
    studiedDose: {
      min: 1000,
      max: 3000,
      unit: "mg",
    },
    mechanismTags: ["osmoregulation", "ergogenic"],
    paperIds: ["p-taurine-training"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 2,
          rationale: "Meta-analysis of 10 studies found improved endurance performance with oral taurine.",
          paperIds: ["p-taurine-training"],
        },
        studyQuality: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        consistency: {
          score: 2,
          rationale: "Similar benefit in time-to-exhaustion trials, with single or repeated doses, and across doses of 1–6 g.",
          paperIds: ["p-taurine-training"],
        },
        effectSize: {
          score: 2,
          rationale: "Hedges' g 0.40 overall; 0.43 in time-to-exhaustion trials.",
          paperIds: ["p-taurine-training"],
        },
        populationRelevance: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
      },
    },
  },
  {
    id: "nac-antioxidant",
    supplementId: "nac",
    name: "Antioxidant / glutathione",
    outcomeCategory: "longevity",
    grade: "D",
    confidence: "low",
    summary: "This library searched for a verified paper on this effect and has not found one.",
    relevantPopulation: "not described by a verified paper in this library",
    studiedDose: {
      min: 600,
      max: 1800,
      unit: "mg",
    },
    mechanismTags: ["glutathione", "antioxidant"],
    paperIds: [],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        studyQuality: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
      },
    },
  },
  {
    id: "protein-powder-training",
    supplementId: "protein-powder",
    name: "Muscle protein synthesis",
    outcomeCategory: "training",
    grade: "A",
    confidence: "high",
    summary: "Supplemental protein supports muscle mass and strength gains when total intake is adequate.",
    relevantPopulation: "resistance-trained adults",
    studiedDose: {
      min: 20,
      max: 40,
      unit: "g",
    },
    mechanismTags: ["leucine", "MPS"],
    paperIds: ["p-protein-mps"],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 3,
          rationale: "49 randomised trials in 1863 healthy adults.",
          paperIds: ["p-protein-mps"],
        },
        studyQuality: {
          score: 2,
          rationale: "Randomised controlled trials of at least 6 weeks; the abstract reports no risk-of-bias rating.",
          paperIds: ["p-protein-mps"],
        },
        consistency: {
          score: 2,
          rationale: "Gains significant across strength and muscle-size outcomes; smaller with age, larger in trained people.",
          paperIds: ["p-protein-mps"],
        },
        effectSize: {
          score: 1,
          rationale: "+2.49 kg one-repetition maximum and +0.30 kg fat-free mass.",
          paperIds: ["p-protein-mps"],
        },
        populationRelevance: {
          score: 3,
          rationale: "Healthy adults in resistance training; the fat-free-mass gain was larger in resistance-trained people.",
          paperIds: ["p-protein-mps"],
        },
      },
    },
  },
  {
    id: "protein-powder-recovery",
    supplementId: "protein-powder",
    name: "Recovery & satiety",
    outcomeCategory: "recovery",
    grade: "D",
    confidence: "low",
    summary: "This library searched for a verified paper on this effect and has not found one.",
    relevantPopulation: "not described by a verified paper in this library",
    studiedDose: {
      min: 20,
      max: 40,
      unit: "g",
    },
    mechanismTags: ["leucine", "satiety"],
    paperIds: [],
    evidenceProfile: {
      dimensions: {
        humanEvidence: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        studyQuality: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        consistency: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        effectSize: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
        populationRelevance: {
          score: 0,
          rationale: "Not addressed by a verified paper in the corpus.",
          paperIds: [],
        },
      },
    },
  },
];
