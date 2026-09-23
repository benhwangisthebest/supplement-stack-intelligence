# p3-u4-profiles — appendix B2: magnesium-stress, magnesium-metabolic, creatine-recovery, vitamin-d-immune, fish-oil-mood

> Appendix to `p3-u4-profiles.plan.md`. **Owner-approved 2026-09-23; fish-oil-mood as ruled.** This batch is the first five of the remaining 15, in `ALLOWLIST_ORIGIN` order. Drafting follows B1's rules: R1, R5 and R6; consistency means agreement across studies; an unaddressed dimension is empty and scores 0. Every abstract matched its committed SHA-256. Checked by script: no dimension cites a paper outside its effect's `paperIds`, and `containsBannedLanguage` finds no banned phrase in any rationale.

## Derived grades

| Effect | Composite | Derived grade | Current grade (at `fe0441d`) |
|---|---|---|---|
| magnesium-stress | 0.2167 | **D** | C (hand-typed) — **changes** |
| magnesium-metabolic | 0.5333 | **C** | C (hand-typed) |
| creatine-recovery | 0.4000 | **C** | C (hand-typed) |
| vitamin-d-immune | 0.5167 | **C** | C (hand-typed) |
| fish-oil-mood | 0.7000 | **B** | C (hand-typed) — **changes** |

## Per-dimension profiles (as committed)

| Effect | Dimension | Score | Rationale | paperIds | Basis (paraphrase of the abstract) |
|---|---|---|---|---|---|
| **magnesium-stress** | humanEvidence | 1 (weak) | One randomised trial in stressed adults with low blood magnesium, comparing magnesium plus B6 with magnesium alone. | `p-magnesium-stress`<br>PMID 33864354 | 8-week randomised trial, magnesium 300 mg plus B6 30 mg versus magnesium alone, adults with severe stress and low magnesemia. |
|  | studyQuality | 1 (weak) | Post-hoc secondary analysis with no placebo arm. | `p-magnesium-stress`<br>PMID 33864354 | Previously unreported secondary analysis; both arms received magnesium, so no untreated comparison exists. |
|  | consistency | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Single trial; agreement across studies cannot be assessed. |
|  | effectSize | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Anxiety and depression improved from baseline in both arms; no effect against an untreated control is reported. |
|  | populationRelevance | 1 (weak) | Only adults with severe stress and low blood magnesium. | `p-magnesium-stress`<br>PMID 33864354 | Inclusion required DASS-42 stress score above 18 and low magnesemia in otherwise healthy adults. |
| **magnesium-metabolic** | humanEvidence | 2 (moderate) | Meta-analysis of double-blind placebo-controlled trials in people with or at high risk of diabetes; the abstract gives no trial count. | `p-magnesium-glucose`<br>PMID 34836329 | Systematic review and meta-analysis of double-blind RCTs of oral magnesium versus placebo; number of trials not stated. |
|  | studyQuality | 2 (moderate) | Double-blind randomised trials only; the abstract reports no risk-of-bias rating. | `p-magnesium-glucose`<br>PMID 34836329 | Inclusion limited to double-blind placebo-controlled RCTs; no bias assessment reported. |
|  | consistency | 2 (moderate) | Glucose measures improved both in people with diabetes and in those at high risk. | `p-magnesium-glucose`<br>PMID 34836329 | Fasting glucose fell in diabetes; glucose, 2-hour OGTT and insulin-sensitivity markers improved in high-risk people. |
|  | effectSize | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Results reported as significant standardised mean differences, but no magnitudes are given in the abstract. |
|  | populationRelevance | 1 (weak) | People with or at high risk of diabetes; magnesium status is not reported in the abstract. | `p-magnesium-glucose`<br>PMID 34836329 | Population defined by diabetes or diabetes risk; baseline magnesium status not mentioned. |
| **creatine-recovery** | humanEvidence | 2 (moderate) | Meta-analysis of 9 randomised placebo-controlled trials. | `p-creatine-recovery`<br>PMID 34472118 | Nine RCTs comparing creatine with placebo after exercise-induced muscle damage. |
|  | studyQuality | 1 (weak) | Included trials carried a medium risk of bias. | `p-creatine-recovery`<br>PMID 34472118 | Cochrane risk-of-bias tool applied; authors report medium risk of bias and urge cautious interpretation. |
|  | consistency | 1 (weak) | High heterogeneity; creatine kinase fell, but lactate dehydrogenase did not change overall. | `p-creatine-recovery`<br>PMID 34472118 | Authors cite high heterogeneity; CK reduced, LDH not significant overall (only at 48 h). |
|  | effectSize | 1 (weak) | Lower creatine kinase (weighted mean difference −30.94); no overall change in lactate dehydrogenase. | `p-creatine-recovery`<br>PMID 34472118 | CK WMD -30.94 (CI -53.19 to -8.69); LDH WMD -5.99, not significant. |
|  | populationRelevance | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Abstract does not describe participants' training status or other characteristics. |
| **vitamin-d-immune** | humanEvidence | 2 (moderate) | Large placebo-controlled trial meta-analyses: protection overall in 2017, not statistically significant in the 2025 update. | `p-vitamin-d-respiratory-ipd`<br>PMID 28202713<br>`p-vitamin-d-respiratory-update`<br>PMID 39993397 | 2017 IPD: 25 RCTs, OR 0.88; 2025 update: 40 studies, 61,589 participants, OR 0.94, CI includes 1. |
|  | studyQuality | 2 (moderate) | Double-blind randomised trials, rated high quality in 2017; the 2025 update found funnel-plot asymmetry. | `p-vitamin-d-respiratory-ipd`<br>PMID 28202713<br>`p-vitamin-d-respiratory-update`<br>PMID 39993397 | 2017 evidence assessed as high quality; 2025 Egger's test p=0.002 for funnel asymmetry. |
|  | consistency | 1 (weak) | The 2017 analysis found protection with significant heterogeneity; the 2025 update does not. | `p-vitamin-d-respiratory-ipd`<br>PMID 28202713<br>`p-vitamin-d-respiratory-update`<br>PMID 39993397 | 2017 P for heterogeneity <0.001; 2025 estimate no longer statistically significant. |
|  | effectSize | 1 (weak) | Odds ratio 0.88 in 2017; 0.94, with a confidence interval including no effect, in 2025. | `p-vitamin-d-respiratory-ipd`<br>PMID 28202713<br>`p-vitamin-d-respiratory-update`<br>PMID 39993397 | OR 0.88 (0.81-0.96) in 2017; OR 0.94 (0.88-1.00) in 2025. |
|  | populationRelevance | 1 (weak) | 2017 found most benefit in very deficient people; the 2025 update found no modification by baseline vitamin D status. | `p-vitamin-d-respiratory-ipd`<br>PMID 28202713<br>`p-vitamin-d-respiratory-update`<br>PMID 39993397 | 2017: OR 0.30 below 25 nmol/L with daily/weekly dosing; 2025: no effect modification by baseline status. |
| **fish-oil-mood** | humanEvidence | 3 (strong) | 26 double-blind placebo-controlled trials, 2,160 participants. | `p-fish-oil-mood`<br>PMID 31383846 | Meta-analysis of 26 double-blind randomised placebo-controlled trials with 2,160 participants. |
|  | studyQuality | 2 (moderate) | Double-blind randomised trials only; the abstract reports no risk-of-bias rating. | `p-fish-oil-mood`<br>PMID 31383846 | Inclusion limited to double-blind placebo RCTs; publication bias was evaluated but the result is not given. |
|  | consistency | 1 (weak) | Benefit only in the EPA-rich subgroups of one meta-analysis (EPA-major P = 0.03); DHA-dominant formulations showed none. | `p-fish-oil-mood`<br>PMID 31383846 | Agreement is between two formulation subgroups within one meta-analysis; DHA-pure and DHA-major showed no benefit. |
|  | effectSize | 2 (moderate) | Overall SMD −0.28; −0.50 and −1.03 for EPA-pure and EPA-major formulations at about 1 g/day. | `p-fish-oil-mood`<br>PMID 31383846 | Overall SMD -0.28; EPA-pure -0.50; EPA-major -1.03, at EPA about 1 g per day. |
|  | populationRelevance | 2 (moderate) | Trials in depression; participants are not described further in the abstract. | `p-fish-oil-mood`<br>PMID 31383846 | Trials of omega-3 for depression symptoms; ages and settings not reported. |

## Owner rulings applied (2026-09-23)

- **Approved as drafted:** magnesium-stress (**D**), magnesium-metabolic (C), creatine-recovery (C) and vitamin-d-immune (C).
- **fish-oil-mood: consistency set to 1**, lowered from the drafted 2. The agreement is between two subgroups within one meta-analysis (P = 0.03 for EPA-major), and DHA forms showed no benefit. That moves the composite from 0.7667 to **0.7000 → B**, the grade the owner expected. The draft's A is superseded.
- **R12:** *humanEvidence* means the strength of human evidence **that the effect exists**. vitamin-d-immune's score of 2 is scored that way. FU-61 records the rubric-weight question.
- **B5 adds** the magnesium-metabolic summary: *"in deficient individuals"* is not in the cited abstract.

## P-14: what the two grade changes do (probe vs the B1 tree)

| Effect | Grade | Best effect for its outcome | Evidence-fit flag | Protocol tier, rank | Identity high-grade |
|---|---|---|---|---|---|
| magnesium-stress | C → D | C → D | true → true | advanced → **experimental**, 3/3 → 3/3 | false → false |
| fish-oil-mood | C → B | C → B | true → **false** | advanced → **targeted**, 1/1 → 1/1 | false → **true** |

**R10 pins** (`src/lib/protocol-builder/grade-changes.test.ts`): magnesium-stress → experimental, fish-oil-mood → targeted. Both rows failed against the B1 seed.

## For the owner: raised, not edited

1. **fish-oil-mood keeps `confidence: "low"` at Grade B.** G5 allows it, since only `high` needs A or B. It still breaks the seed's otherwise exact convention of B pairing with `moderate`, which R8 applied to B12. Setting it to `moderate` needs your word, because `confidence` was not part of the B2 approval.
2. **magnesium-stress becomes the only Grade D** effect with a profile. `tierFor` maps D to *experimental*, which is existing engine behaviour.
