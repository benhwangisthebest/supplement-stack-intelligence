# p3-u4-profiles — appendix B3: fish-oil-longevity, l-theanine-focus, l-theanine-stress, glycine-sleep, ashwagandha-sleep

> Appendix to `p3-u4-profiles.plan.md`. **Owner-approved as drafted, 2026-09-23.** This batch is the next five in `ALLOWLIST_ORIGIN` order. Drafting follows B1/B2's rules: R1, R5, R6 and R12. Consistency means agreement across studies. An unaddressed dimension is empty and scores 0. Every PMID abstract matched its committed SHA-256. Checked by script: no dimension cites outside its effect's `paperIds`, and `containsBannedLanguage` finds no banned phrase in any rationale. Grades come from `deriveGrade` after F-1 (`478ccf7`).

## Derived grades

| Effect | Composite | Derived grade | Current grade (at `fe0441d`) |
|---|---|---|---|
| fish-oil-longevity | 0.4500 | **C** | C (hand-typed) |
| l-theanine-focus | 0.5500 | **B** | B (hand-typed) |
| l-theanine-stress | 0.2500 | **D** | B (hand-typed) — **changes** |
| glycine-sleep | 0.0000 | **D** | B (hand-typed) — **changes** |
| ashwagandha-sleep | 0.5500 | **B** | C (hand-typed) — **changes** |

## Per-dimension drafts

| Effect | Dimension | Score | Rationale | paperIds | Basis (paraphrase of the abstract) |
|---|---|---|---|---|---|
| **fish-oil-longevity** | humanEvidence | 1 (weak) | 86 randomised trials (162,796 participants) found little or no effect on all-cause mortality (high certainty) and slight reductions in coronary events (low certainty). | `p-fish-oil-longevity`<br>PMID 32114706 | All-cause mortality RR 0.97 (0.93-1.01), high-certainty; coronary heart disease events RR 0.91, low-certainty. |
|  | studyQuality | 2 (moderate) | Randomised trials of at least 12 months; 28 of 86 at low summary risk of bias. | `p-fish-oil-longevity`<br>PMID 32114706 | RCTs lasting 12 to 88 months; 28 trials at low summary risk of bias. |
|  | consistency | 1 (weak) | No mortality benefit across trials, whatever the duration or dose; the coronary reductions are low certainty. | `p-fish-oil-longevity`<br>PMID 32114706 | Effects did not differ by trial duration or omega-3 dose in subgroups or meta-regression. |
|  | effectSize | 1 (weak) | All-cause mortality risk ratio 0.97; coronary heart disease events 0.91 (number needed to treat 167). | `p-fish-oil-longevity`<br>PMID 32114706 | RR 0.97 for all-cause mortality; RR 0.91, NNTB 167, for coronary heart disease events. |
|  | populationRelevance | 2 (moderate) | Adults at varying cardiovascular risk, mainly in high-income countries. | `p-fish-oil-longevity`<br>PMID 32114706 | Trials included adults at varying cardiovascular risk, mainly in high-income countries. |
| **l-theanine-focus** | humanEvidence | 2 (moderate) | Meta-analysis of randomised trials in healthy people: theanine plus caffeine improved some attention measures against placebo. | `p-ltheanine-focus`<br>PMID 40314930 | 50 RCTs reviewed, 15 meta-analysed; theanine plus caffeine favoured on vigilance and attention-switching accuracy. |
|  | studyQuality | 2 (moderate) | Randomised controlled trials; the abstract reports no risk-of-bias rating. | `p-ltheanine-focus`<br>PMID 40314930 | Review restricted to RCTs in healthy participants; no bias assessment reported in the abstract. |
|  | consistency | 1 (weak) | Confidence intervals often cross no effect; the authors note uncertainty in direction and magnitude. | `p-ltheanine-focus`<br>PMID 40314930 | Choice reaction time and mood intervals include zero; authors say intervals frequently highlight uncertainty. |
|  | effectSize | 1 (weak) | Small to moderate: SMD 0.20 for vigilance accuracy and 0.33 for attention switching. | `p-ltheanine-focus`<br>PMID 40314930 | Digit vigilance accuracy SMD 0.20; attention switching accuracy SMD 0.33, second hour after intake. |
|  | populationRelevance | 2 (moderate) | Healthy participants; the authors call for studies in free-living settings. | `p-ltheanine-focus`<br>PMID 40314930 | Trials in healthy participants; authors ask for research in free-living participants and tea-equivalent doses. |
| **l-theanine-stress** | humanEvidence | 1 (weak) | One small crossover trial (12 participants) using a laboratory stressor. | `p-ltheanine-stress`<br>PMID 16930802 | Twelve participants, four sessions each, mental arithmetic as the acute stressor. |
|  | studyQuality | 1 (weak) | Double-blind, placebo-controlled and counterbalanced, but only 12 participants. | `p-ltheanine-stress`<br>PMID 16930802 | Double-blind sessions in counterbalanced order with placebo and no-treatment controls; n = 12. |
|  | consistency | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Single trial; agreement across studies cannot be assessed. |
|  | effectSize | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Heart-rate and salivary IgA responses were reduced; no magnitudes are given in the abstract. |
|  | populationRelevance | 2 (moderate) | Participants under an acute laboratory stressor (mental arithmetic). | `p-ltheanine-stress`<br>PMID 16930802 | Acute stress induced by a mental arithmetic task in a laboratory setting. |
| **glycine-sleep** | humanEvidence | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | R6: the only paper is DOI-verified but title-only; no abstract was captured. |
|  | studyQuality | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | R6: title-only paper supports no dimension. |
|  | consistency | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | R6: title-only paper supports no dimension. |
|  | effectSize | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | R6: title-only paper supports no dimension. |
|  | populationRelevance | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | R6: title-only paper supports no dimension. |
| **ashwagandha-sleep** | humanEvidence | 2 (moderate) | Five placebo-controlled randomised trials (400 adults) found an effect on overall sleep. | `p-ashwagandha-sleep`<br>PMID 34559859 | Five RCTs, 400 participants, ashwagandha extract versus placebo; significant effect on overall sleep. |
|  | studyQuality | 2 (moderate) | Randomised placebo-controlled trials; the abstract reports no risk-of-bias rating. | `p-ashwagandha-sleep`<br>PMID 34559859 | Only placebo-controlled RCTs included; no bias assessment reported in the abstract. |
|  | consistency | 1 (weak) | Substantial heterogeneity (I² 62%); effects larger in insomnia, at ≥600 mg/day and over ≥8 weeks. | `p-ashwagandha-sleep`<br>PMID 34559859 | I-squared 62%; subgroups with insomnia, at least 600 mg/day and at least 8 weeks showed larger effects. |
|  | effectSize | 1 (weak) | Described by the authors as small but significant (SMD −0.59). | `p-ashwagandha-sleep`<br>PMID 34559859 | Overall sleep SMD -0.59 (-0.75 to -0.42), called small but significant. |
|  | populationRelevance | 2 (moderate) | Adults 18 and over; the effect was larger in adults diagnosed with insomnia. | `p-ashwagandha-sleep`<br>PMID 34559859 | Participants aged 18 and above; insomnia subgroup showed the more prominent effect. |

## Readings to check

- **glycine-sleep B → D is R6 alone.** Its only paper is DOI-verified but title-only, so every dimension is empty and the composite is 0. The paper stays cited at effect level.
- **l-theanine-stress B → D (0.25).** Its one paper is a 12-person crossover trial using a laboratory stressor. It reports no magnitudes, so effect size is empty, and as a single trial it has no consistency score.
- **ashwagandha-sleep C → B and l-theanine-focus B → B both sit exactly at 0.55**, the B floor. F-1 makes those letters exact. **Any one-point change moves either one to C**, so they are the rows to check most closely. On ashwagandha I scored effect size 1 because the authors call SMD −0.59 *"small but significant"*. I followed the authors' description rather than applying my own threshold.
- **fish-oil-longevity: how to read consistency and effect size for a null result.** R12 fixes *humanEvidence* as the strength of evidence **that the effect exists**, so the high-certainty null on all-cause mortality scores 1. I scored **consistency** (1) and **effect size** (1) the same way, as agreement on the **benefit** and the size of the **benefit**, not as how consistently the trials found nothing. Scored the other way, consistency would be 2 or 3 (*"effects did not differ by trial duration or dose"*), and the grade would reach B for an effect the paper reports is essentially absent: FU-61 again. **Please confirm the reading.** The derived grade stays C either way at this batch's other scores, but the rule applies to later batches too.

## P-14: what the three grade changes do (probe with B3 applied over the B2 tree)

| Effect | Grade | Best effect for its outcome | Evidence-fit flag | Protocol tier, rank | Identity high-grade |
|---|---|---|---|---|---|
| l-theanine-stress | B → D | B → D | false → **true** | targeted → **experimental**, 2/3 → 2/3 | true → **false** |
| glycine-sleep | B → D | B → D | false → **true** | targeted → **experimental**, 3/4 → 4/4 | true → **false** |
| ashwagandha-sleep | C → B | C → B | true → **false** | advanced → **targeted**, 4/4 → 3/4 | false → **true** |

With B3 applied, `npx vitest run` passed **1513/1513** and no fixture needed changing. The R10 pins for these three rows land with B3's commit.

## For the owner: raised while drafting, not edited

1. **Summary text the cited abstracts don't support.** Should these join B5?
   - **l-theanine-focus**: *"reduces jitteriness"*. No such outcome is reported.
   - **l-theanine-stress**: *"without sedation"*. Not reported.
   - **glycine-sleep**: *"next-day alertness"*. Title-only paper (R6).
   - **ashwagandha-sleep**: *"often secondary to stress reduction"*. The abstract reports that anxiety improved, but not that the sleep effect is secondary to it.
2. **Confidence after grade changes.** After B3, l-theanine-stress and glycine-sleep would be **D with `moderate`**. ashwagandha-sleep would be **B with `low`**, the same as fish-oil-mood after B2. G5 allows all three, because it only stops `high` below B. The seed's otherwise exact convention (A `high`, B `moderate`, C `low`) has no D entry. **Proposed ruling:** set `confidence` from the grade for every effect whose grade changes (A → `high`, B → `moderate`, C or D → `low`), and extend G5 into an equality guard. Or rule each case yourself.
