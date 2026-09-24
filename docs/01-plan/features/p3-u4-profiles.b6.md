# p3-u4-profiles — appendix B6: the original 8 profiles re-drafted (R15)

> Appendix to `p3-u4-profiles.plan.md`. **Approved by the owner on 2026-09-24, with the rulings in §8, which supersede the draft wherever they differ.** Under R15, the 8 original profiles are re-drafted from their verified abstracts under the same rules as the other 19 (R1, R5, R6, R12, R13). **None of the 40 original rationales is kept by default.** Two B5 re-judgements (magnesium-sleep and melatonin-sleep `populationRelevance`) were written from the abstract and are re-confirmed word for word. Every cited abstract was checked against its committed SHA-256 (all match). Conventions: an unaddressed dimension is `[]`, score 0, *"Not addressed by a verified paper in the corpus."* Consistency is scored only from a heterogeneity figure or a subgroup comparison. Every dimension cites only papers on its effect's list (the drafting script refuses otherwise). Nothing was drafted toward a grade; §3 lists every grade that one point would flip.

## 1. S5 papers captured (owner decision 2026-09-24)

**S2 run `2026-09-24-s2h`: 5 calls, all 200, 5 titles matched, no refusals.** The fixture holds 37 entries. Card fields come only from each paper's S5-captured abstract, and the ids are manifest adds. Declined: V-2 (lactating mothers only) and C-3.

| Id | PMID | Decision | What the card records |
|---|---|---|---|
| `p-vitamin-d-prediabetes-rct` | 34473295 | V-1 | RCT, D3 4000 IU/day vs placebo, 24 months, prediabetes, not selected by vitamin D status. 25(OH)D 27.9 → 54.9 ng/mL; placebo unchanged. Sample size not in the abstract. |
| `p-vitamin-d-weekly-daily` | 39396907 | V-3 | 8 RCTs, 542 people below 30 ng/mL; weekly ≈ daily (OR 1.5, 0.3–6.9); I² 85.3%; most studies at risk of bias. |
| `p-caffeine-shift-work` | 20464765 | C-1 | Cochrane, 13 RCTs, jet lag and shift work; attention SMD −0.55; errors fewer; **high risk of bias**; mostly young people under simulated conditions. |
| `p-caffeine-military` | 28969341 | C-2 | 25 RCTs, military-like stressors (17 sleep deprivation); attention, vigilance, complex reaction time and reasoning improved under sleep deprivation; descriptive, no pooled sizes. |
| `p-caffeine-glucose` | 20521321 | C-4 | RCT, 72 healthy adults aged 18–25; 75 mg caffeine alone improved **only simple reaction time**; attention and memory gains only with glucose. |

C-4's abstract calls its subjects adequately activated. It does not use the word "rested", so the table below says *rested* only where the owner's ruling uses it.

## 2. The 8 profiles

Order of dimensions: hE humanEvidence · sQ studyQuality · co consistency · eS effectSize · pR populationRelevance.

### magnesium-sleep: B (0.583) → **D (0.317)**, confidence moderate → low

Cited: `p-magnesium-sleep` (33865376)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 2 | **1** | Three small placebo-controlled randomised trials (151 older adults with insomnia) found a shorter time to fall asleep. | `p-magnesium-sleep` | 3 RCTs vs placebo, 151 older adults; pooled sleep-onset latency significantly shorter. |
| sQ | 2 | **1** | All trials at moderate-to-high risk of bias; the evidence is rated low to very low quality. | `p-magnesium-sleep` | RoB 2.0: moderate-to-high risk in all trials; GRADE low to very low. |
| co | 2 | **0** | Not addressed by a verified paper in the corpus. | *(empty)* | No heterogeneity figure or subgroup comparison in the abstract. |
| eS | 1 | **2** | Sleep-onset latency 17.36 minutes shorter than placebo; total sleep time +16.06 minutes, not significant. | `p-magnesium-sleep` | SOL MD -17.36 min (95% CI -27.27 to -7.44); TST +16.06 min, NS. |
| pR | 1 | **1** | Older adults with insomnia; magnesium status is not reported in the abstract. | `p-magnesium-sleep` | Older adults with insomnia, three countries; no magnesium-status measure (B5 wording, re-confirmed). |

### creatine-strength: A (0.967) → **A (0.767)**, confidence high → high

Cited: `p-creatine-strength` (39519498)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 3 | **3** | 23 placebo-controlled studies found greater upper- and lower-body strength gains with creatine plus resistance training. | `p-creatine-strength` | 23 studies vs placebo; upper- and lower-body strength both significantly greater (p < 0.001). |
| sQ | 3 | **2** | Placebo-controlled studies; the abstract reports no randomisation or risk-of-bias detail. | `p-creatine-strength` | Placebo comparison stated; no randomisation, blinding or risk-of-bias assessment described. |
| co | 3 | **2** | Gains were significant in men; the few women studied (49 across three studies) showed no significant gains. | `p-creatine-strength` | Sex subgroup: males significant upper and lower; females not significant; no other variable moderated. |
| eS | 3 | **2** | Upper-body strength +4.43 kg and lower-body strength +11.35 kg versus placebo. | `p-creatine-strength` | WMD 4.43 kg upper, 11.35 kg lower; absolute kg, no standardised effect size or baseline given. |
| pR | 2 | **2** | Adults under 50 in resistance training, mostly men. | `p-creatine-strength` | Adults <50; 20 male studies (447), 2 female (40), 1 mixed (13 M, 9 F). |

### creatine-cognition: C (0.467) → **C (0.417)**, confidence low → low

Cited: `p-creatine-cognition` (29704637), `p-creatine-vegetarian-cognition` (21118604)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 2 | **2** | Six randomised trials (281 healthy people) suggest better short-term memory and reasoning; a further trial found better memory in vegetarians only. | `p-creatine-cognition`, `p-creatine-vegetarian-cognition` | SR of 6 RCTs: STM and intelligence/reasoning may improve; RCT n=128: memory better in vegetarians, not omnivores. |
| sQ | 1 | **1** | Small randomised trials with no quality rating reported; the authors call for larger samples. | `p-creatine-cognition` | 6 RCTs, 281 individuals; no RoB rating; 'future studies should include larger sample sizes'. |
| co | 1 | **1** | Results conflicted across most cognitive domains; performance was unchanged in young people, and vegetarians responded better on memory. | `p-creatine-cognition`, `p-creatine-vegetarian-cognition` | Conflicting results for 11 domains; unchanged in young; vegetarian vs meat-eater memory difference in both papers. |
| eS | 1 | **0** | Not addressed by a verified paper in the corpus. | *(empty)* | Neither abstract reports a magnitude. |
| pR | 2 | **2** | Healthy people; the memory benefit was in vegetarians, and young people overall showed no change. | `p-creatine-cognition`, `p-creatine-vegetarian-cognition` | Healthy individuals; 128 young women split by diet; young individuals unchanged in the review. |

### vitamin-d-deficiency: A (0.950) → **B (0.650)**, confidence high → moderate

Cited: `p-vitamin-d-deficiency` (22552031), `p-vitamin-d-prediabetes-rct` (34473295), `p-vitamin-d-weekly-daily` (39396907)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 3 | **2** | One placebo-controlled randomised trial found vitamin D3 raised serum 25(OH)D; the two meta-analyses compare forms (D3 vs D2) and regimens (weekly vs daily), not supplement vs none. | `p-vitamin-d-prediabetes-rct`, `p-vitamin-d-deficiency`, `p-vitamin-d-weekly-daily` | V-1: D3 vs placebo, 25(OH)D rose on D3 only. 22552031: D3 vs D2. V-3: weekly vs daily repletion. |
| sQ | 3 | **2** | Randomised trials throughout, including a placebo-controlled trial (a prespecified secondary analysis); most studies in the deficiency meta-analysis were at risk of bias. | `p-vitamin-d-prediabetes-rct`, `p-vitamin-d-deficiency`, `p-vitamin-d-weekly-daily` | V-1 randomised vs matching placebo; 22552031 RCTs, no rating; V-3 'most studies were at risk of bias'. |
| co | 3 | **1** | Heterogeneity was high in the weekly-versus-daily repletion analysis (I² 85.3%); the D3-over-D2 advantage held for bolus but not daily dosing. | `p-vitamin-d-weekly-daily`, `p-vitamin-d-deficiency` | V-3 I² 85.3%, increased by differing doses; 22552031: D3 advantage lost with daily dosing. |
| eS | 2 | **3** | Mean serum 25(OH)D rose from 27.9 to 54.9 ng/mL over 24 months on 4000 IU/day and was unchanged on placebo. | `p-vitamin-d-prediabetes-rct` | V-1: 27.9 -> 54.9 ng/mL vs 28.5 unchanged; V-3 defines hypovitaminosis as < 30 ng/mL. Meta-analyses give no magnitude. |
| pR | 3 | **2** | One meta-analysis studied people with hypovitaminosis D (below 30 ng/mL); the placebo-controlled trial enrolled adults with prediabetes not selected by vitamin D status (mean baseline 27.9 ng/mL). | `p-vitamin-d-weekly-daily`, `p-vitamin-d-prediabetes-rct` | V-3 baseline < 30 ng/mL; V-1 prediabetes, not selected by status; 22552031 could not verify effects across age, sex or ethnicity. |

### fish-oil-cardiovascular: B (0.700) → **A (0.767)**, confidence moderate → high

Cited: `p-fish-oil-cv` (37264945), `p-fish-oil-triglycerides-t2d` (39163858)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 2 | **3** | 90 randomised trials (72,598 participants) found omega-3 intake lowered triglycerides near-linearly with dose; a 309-patient randomised trial found the same in type 2 diabetes. | `p-fish-oil-cv`, `p-fish-oil-triglycerides-t2d` | 90 RCTs, dose-response: TG and non-HDL lowered near-linearly; T2D RCT: TG fell more on fish oil than corn oil (p = 0.02). |
| sQ | 3 | **2** | Randomised trials, including a double-blind placebo-controlled trial; the abstracts report no risk-of-bias rating. | `p-fish-oil-cv`, `p-fish-oil-triglycerides-t2d` | 90 RCTs pooled (no rating given); T2D trial randomised, double-blind, corn-oil placebo. |
| co | 2 | **2** | The triglyceride dose-response was approximately linear in the general population and more evident in hyperlipidaemia and overweight or obesity. | `p-fish-oil-cv` | Subgroups: linear TG relation in the general population, clearer in hyperlipidaemia and overweight/obesity at > 2 g/day. |
| eS | 1 | **2** | Triglycerides fell 1.51 mmol/L on 4 g fish oil versus 0.66 mmol/L on corn oil; the meta-analysis reports a dose-response shape, not a pooled size. | `p-fish-oil-triglycerides-t2d`, `p-fish-oil-cv` | T2D RCT: -1.51 vs -0.66 mmol/L over 12 weeks; meta-analysis gives curve shape only. |
| pR | 2 | **2** | The general population, more evident in hyperlipidaemia and overweight or obesity above 2 g/day; the trial enrolled Chinese adults with type 2 diabetes and high triglycerides. | `p-fish-oil-cv`, `p-fish-oil-triglycerides-t2d` | Meta-analysis subgroups; T2D trial: 309 Chinese patients with hypertriglyceridaemia. |

### melatonin-sleep: A (0.817) → **B (0.683)**, confidence high → moderate

Cited: `p-melatonin-sleep` (23691095)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 3 | **3** | 19 placebo-controlled randomised trials (1,683 subjects) found shorter sleep latency, longer total sleep and better sleep quality. | `p-melatonin-sleep` | 19 RCTs, 1683 subjects: latency, total sleep time and quality all significantly improved vs placebo. |
| sQ | 3 | **2** | Randomised placebo-controlled trials; the abstract reports no risk-of-bias rating. | `p-melatonin-sleep` | RCTs vs placebo only; no quality assessment reported. |
| co | 2 | **2** | Effects on latency and total sleep were larger with longer trials and higher doses; sleep-quality effects did not vary with dose or duration. | `p-melatonin-sleep` | Meta-regression: dose and duration moderated latency and TST; no moderation of sleep quality. |
| eS | 2 | **1** | Modest, in the authors' words: sleep latency 7.06 minutes shorter, total sleep 8.25 minutes longer, sleep-quality SMD 0.22. | `p-melatonin-sleep` | WMD 7.06 min latency, 8.25 min TST, SMD 0.22 quality; authors call the effects modest. |
| pR | 1 | **1** | Adults and children with primary sleep disorders; jet lag and delayed sleep phase are not studied. | `p-melatonin-sleep` | Participants: adults and children with primary sleep disorders (B5 wording, re-confirmed). |

### ashwagandha-stress: B (0.667) → **B (0.567)**, confidence moderate → moderate

Cited: `p-ashwagandha-stress` (37832082), `p-ashwagandha-stress-anxiety` (36017529)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 2 | **2** | A meta-analysis of 12 randomised trials (1,002 participants) and a 54-person randomised trial found lower perceived stress than placebo. | `p-ashwagandha-stress-anxiety`, `p-ashwagandha-stress` | 12 RCTs: stress significantly reduced vs placebo; RCT n=54: PSS improved vs placebo. |
| sQ | 2 | **1** | The meta-analysis rates the certainty of the evidence low; the single trial was double-blind and placebo-controlled, with 50 completers. | `p-ashwagandha-stress-anxiety`, `p-ashwagandha-stress` | GRADE-style certainty low for both outcomes; RCT 54 randomised, 50 completed. |
| co | 2 | **1** | High heterogeneity for stress (I² 83.1%). | `p-ashwagandha-stress-anxiety` | Stress I² 83.1%; anxiety I² 93.8%. |
| eS | 2 | **3** | Stress SMD −1.75 versus placebo (95% CI −2.29 to −1.22). | `p-ashwagandha-stress-anxiety` | Pooled stress SMD -1.75; anxiety SMD -1.55. |
| pR | 2 | **2** | Adults aged 25 to 48 in the meta-analysis; the trial enrolled healthy adults with mild to moderate stress and anxiety. | `p-ashwagandha-stress-anxiety`, `p-ashwagandha-stress` | Age range 25-48; RCT: healthy individuals with mild to moderate symptoms, India. |

### caffeine-focus: A (0.917) → **B (0.617)**, confidence high → moderate

Cited: `p-caffeine-focus` (25527035), `p-caffeine-tolerance` (23108937), `p-caffeine-shift-work` (20464765), `p-caffeine-military` (28969341), `p-caffeine-glucose` (20521321)

| Dimension | Was | Proposed | Rationale | paperIds | Basis (abstract, ≤25 words) |
|---|---|---|---|---|---|
| hE | 3 | **3** | Two reviews of randomised trials (13 and 25 trials) found better attention, vigilance and reaction time, mainly under sleep deprivation or shift work; in rested adults, trials found faster reaction times but little gain in mental alertness. | `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-focus`, `p-caffeine-tolerance`, `p-caffeine-glucose` | C-1 13 RCTs, C-2 25 RCTs, soldiers RCT: benefit under sleep loss; 23108937 and C-4: faster reaction time, little mental-alertness gain. |
| sQ | 3 | **1** | The Cochrane review rated its trials at high risk of bias for allocation concealment and selective reporting; the other review reports no quality rating; the single trials are randomised, one with only 20 participants. | `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-focus`, `p-caffeine-tolerance`, `p-caffeine-glucose` | C-1 high RoB; C-2 quality assessed but not reported; RCTs of 20, 369 (double-blind) and 72 (double-blind). |
| co | 3 | **1** | The benefit depends on context: clear under sleep deprivation or shift work, little mental-alertness gain in non-low habitual consumers, and only simple reaction time in rested young adults. | `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-tolerance`, `p-caffeine-glucose` | C-1 domain-by-domain differences; 23108937 consumer-level subgroups; C-4 caffeine alone improved only simple RT. |
| eS | 2 | **2** | Orientation and attention SMD −0.55 versus placebo in shift-work and jet-lag trials; the other sources report no magnitudes. | `p-caffeine-shift-work` | C-1 attention SMD -0.55 (95% CI -0.83 to -0.27); memory SMD -1.08. |
| pR | 2 | **2** | Mostly sleep-deprived, shift-work or military settings, largely young participants under simulated conditions; rested adults were studied in two trials. | `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-focus`, `p-caffeine-tolerance`, `p-caffeine-glucose` | C-1 young, simulated, generalisability unclear; C-2 17 of 25 trials sleep deprivation; soldiers; 369 consumers; 72 young adults. |

## 3. Grade changes, boundaries and engine consequences (AC-4)

| Effect | Grade (composite) | Confidence (R14) | A single ±1 that would flip it |
|---|---|---|---|
| magnesium-sleep | **B → D** (0.583 → 0.317) | moderate → **low** | Any +1 → C (0.033 below the C line) |
| creatine-strength | A → A (0.967 → 0.767) | high | Any −1 → B. eS 3 is defensible (+11.35 kg lower body); it gives 0.817 and is still A |
| creatine-cognition | C → C (0.467 → 0.417) | low | hE or sQ −1 → D |
| vitamin-d-deficiency | **A → B** (0.950 → 0.650) | high → **moderate** | hE 3 → A. sQ 1, co 0 or eS 2 each stay B; all three together give C (0.450) |
| fish-oil-cardiovascular | **B → A** (0.700 → 0.767) | moderate → **high** | Any −1 → B |
| melatonin-sleep | **A → B** (0.817 → 0.683) | high → **moderate** | sQ or co +1 → A |
| ashwagandha-stress | B → B (0.667 → 0.567) | moderate | Any −1 → C. eS 2 (the SMD −1.75 read as moderate) gives C 0.517 |
| caffeine-focus | **A → B** (0.917 → 0.617) | high → **moderate** | hE −1 → C; sQ 2 (not reflecting C-1's high risk of bias) → B 0.700 |

**P-14 engine probe, working tree vs `98be995`** (`probe.ts`), one row per changed grade:

| Effect | best-for-outcome | evidence-fit flag | protocol tier (rank) | identity high-grade |
|---|---|---|---|---|
| magnesium-sleep | B → D | false → **true** | targeted → **experimental** (2/4 → 3/4) | true → **false** |
| vitamin-d-deficiency | A → B | false | foundational → **targeted** (1/3) | true |
| fish-oil-cardiovascular | B → A | false | targeted → **foundational** (1/3) | true |
| melatonin-sleep | A → B | false | targeted (1/4) | true |
| caffeine-focus | A → B | false | targeted (1/3) | true |

**R10 pins:** 5 rows added to `src/lib/protocol-builder/grade-changes.test.ts`, one per changed effect. **Red proof:** against the pre-B6 seed, all 5 fail; on B6, all pass. The tree was restored by file copy (checksum equal).

**Engine fixtures re-derived** (3 tests failed on B6 before re-derivation; each diff is fixture-only):
1. `protocol-builder.test.ts`, *grade-ranked*: melatonin still ranks first for sleep, but at **B**. The test now asserts B, plus a monotonic grade order across the group (title "A first" → "highest first").
2. `stack-evaluator.test.ts`, *does not flag a strong (A/B) fit*: its premise was "magnesium has a grade B sleep effect", which is now D. The fixture item becomes melatonin (B for sleep). This one passes on both seeds, by design.
3. `services/evaluation.test.ts`, U12 reachability for `stack`: varying the intent sleep → training no longer changes output, because **magnesium now has no A/B effect for any intent**. Varying sleep → `experimental` (which skips evidence-fit) still proves `stack` reaches an observable output. On the pre-B6 seed it is red, as it should be.

Persisted "Grade A/B" advisor chips for the 5 changed effects render the R2 marker (`2dca1c8`). `relevantPopulation` reaches the advisor (`tools.ts`, `proposals.ts`) and identity (`identity/index.ts`) as display `detail` only. No engine branches on it, and no test pinned its text.

## 4. Summaries (R15: the five that overstate)

Safety sweep G7 passes on all 27. Each summary is written only from the cited abstracts.

| Effect | Current | Proposed |
|---|---|---|
| magnesium-sleep | *May improve subjective sleep quality, particularly in older adults or those with low intake.* | May shorten the time to fall asleep (by about 17 minutes) in older adults with insomnia; total sleep time did not change significantly, and the evidence is low to very low quality. |
| vitamin-d-deficiency | *Effectively raises serum 25(OH)D in deficient individuals.* | Has evidence for raising serum 25(OH)D: in one two-year randomised trial, vitamin D3 at 4000 IU/day roughly doubled levels while placebo did not; in people with low levels, weekly dosing repleted about as well as daily. |
| creatine-strength | *Robust evidence for improved strength, power, and lean mass when combined with resistance training.* | Has evidence for greater upper- and lower-body strength gains when combined with resistance training in adults under 50; the gains were significant in men but not in the few women studied. |
| ashwagandha-stress | *Multiple trials show reduced perceived stress and cortisol over 6-8 weeks.* | May reduce perceived stress: a meta-analysis of 12 trials found lower stress than placebo on low-certainty evidence, and one 60-day trial also found lower morning cortisol. |
| caffeine-focus | *Strong evidence for improved alertness, reaction time, and vigilance.* | May improve attention, vigilance and reaction time, with most evidence from sleep-deprived, shift-work or jet-lag settings; in rested adults, trials found mainly faster reaction times and little gain in mental alertness. |

**Raised, outside the five, not applied:** creatine-cognition says *"strongest under sleep deprivation"*, and neither cited abstract studies sleep deprivation. The review only *suggests* potential benefit for "aging and stressed individuals". Proposed: *"May improve short-term memory and reasoning in healthy people, with memory benefits seen in vegetarians; results in other cognitive areas conflict."* **Approve or leave for U7.**

## 5. `relevantPopulation`, all 27 (R15)

**16 changed:** 12 contradict their cited papers and 4 have no verified paper describing a population. Where no paper speaks, the value says so plainly and invents nothing.

| Effect | Current | Proposed | Why (cited abstract) |
|---|---|---|---|
| magnesium-sleep | *adults with suboptimal magnesium status* | **older adults with insomnia** (contradicts) | Paper: older adults with insomnia; magnesium status not reported. |
| magnesium-metabolic | *insulin-resistant adults with low magnesium* | **people with or at high risk of diabetes** (contradicts) | Paper: people with diabetes or at high risk; magnesium status and insulin resistance not reported. |
| creatine-strength | *training adults across age ranges* | **resistance-training adults under 50, mostly men** (contradicts) | Paper: adults under 50 only; 20 of 23 studies in men. |
| creatine-cognition | *sleep-deprived adults, vegetarians* | **healthy people; vegetarians for memory** (contradicts) | Neither paper studies sleep deprivation; the review covers healthy individuals, the trial young women by diet. |
| creatine-recovery | *resistance-trained adults* | **participants in exercise-induced muscle-damage trials (not further described)** (not described) | Paper describes participants only as those in 9 trials of exercise-induced muscle damage; 'resistance-trained' is not stated. |
| vitamin-d-immune | *deficient adults* | **children and adults, across vitamin D status** (contradicts) | 2017: ages 0 to 95, most benefit in very deficient; 2025: no modification by baseline status. |
| melatonin-sleep | *adults with delayed sleep onset, jet lag* | **adults and children with primary sleep disorders** (contradicts) | Paper: primary sleep disorders; jet lag and delayed sleep onset not studied. |
| ashwagandha-stress | *chronically stressed adults* | **adults with mild to moderate stress** (contradicts) | Trial: healthy adults with mild to moderate stress and anxiety; meta-analysis ages 25 to 48; 'chronically' not stated. |
| ashwagandha-sleep | *stressed adults with sleep complaints* | **adults, including adults with insomnia** (contradicts) | Paper: adults 18 and over, larger effect in insomnia; stress not a selection criterion in the abstract. |
| zinc-immune | *adults at cold onset* | **children and adults with colds** (contradicts) | Paper: children and adults; timing relative to onset not analysed. |
| zinc-deficiency | *adults with low zinc intake* | **adults generally; deficiency not analysed** (contradicts) | Paper: adults across intakes; no low-intake or deficient subgroup reported. |
| caffeine-focus | *healthy adults* | **sleep-deprived or shift-working adults; rested adults for reaction time** (contradicts) | Owner S5 ruling; C-1, C-2 and the soldier trial are sleep-loss settings; rested adults only in 23108937 and C-4. |
| taurine-training | *training adults* | **participants in endurance-performance trials (not further described)** (not described) | Paper describes only 10 studies (7 time-to-exhaustion); 'training adults' is not stated. |
| glycine-sleep | *adults with mild sleep complaints* | **not described by a verified paper in this library** (not described) | Only paper is title-only (R6). |
| nac-antioxidant | *adults under oxidative stress* | **not described by a verified paper in this library** (not described) | No cited paper (R5). |
| protein-powder-recovery | *active adults* | **not described by a verified paper in this library** (not described) | No cited paper (R5). |

**11 unchanged.** Each value matches its papers: vitamin-d-deficiency, fish-oil-cardiovascular, fish-oil-mood, fish-oil-longevity, l-theanine-focus, l-theanine-stress, vitamin-b12-deficiency, caffeine-training and protein-powder-training. Two are **broader than their paper but do not contradict it**, so under R15's limit they are unchanged and raised: magnesium-stress *"adults reporting stress"* (the paper: severe stress **and** low blood magnesium) and berberine-metabolic *"adults with elevated blood sugar"* (the paper: type 2 diabetes). **Rule on each, or leave.**

## 6. Gate on the B6 working tree

tsc 0 · lint 386/386, 0 errors · vitest **1532/1532** across 122 files · next build 0 · verify:rendering OK · **full non-live E2E 70 passed / 30 `[LIVE]` skipped** · `content:generate --check` 0 stale · null bytes 0. G4 (derived grade), G5 (confidence), G6 (R5), G7 (sweep) and P7 are all green.

## 7. Decisions requested

1. **The 8 profiles** as drafted, or rule on any row. Boundaries to note: creatine-strength eS (2 vs 3; A either way), ashwagandha-stress eS (3 vs 2 flips B → C), vitamin-d-deficiency hE (2 vs 3 flips B → A), caffeine-focus sQ (1, per your C-1 instruction).
2. **The five summaries** in §4, and **creatine-cognition's** (raised).
3. **`relevantPopulation`**: the 16 changes, and a ruling on the two broader values.
4. **Landing:** one commit `feat(content): U4 B6 — …` carrying the S5 files (search captures, claims, scenario line, dated record, S5 table), the S2 capture, 5 corpus rows, 5 manifest adds, the approvals file, the profiles, summaries and populations, the 5 pins and the 3 re-derived fixtures.

## 8. Owner rulings (2026-09-24) and final values

1. **Profiles approved as drafted.** creatine-strength effectSize is **2**, as drafted, so no grade moves. Re-derived after the rulings: **every stored grade equals its derived grade, creatine-strength is A (0.767), and 0 grades moved against the draft.** ashwagandha-stress effectSize stays 3: low certainty and heterogeneity are scored under sQ and co and are not counted twice. vitamin-d-deficiency hE stays 2. caffeine-focus sQ stays 1.
2. **Caffeine wording** accepted as drafted: *"mainly faster reaction times and little gain in mental alertness"*.
3. **Summaries:** the five in §4 are approved, and **creatine-cognition's is applied in B6**: *"May improve short-term memory and reasoning in healthy people, with memory benefits seen in vegetarians; results in other cognitive areas conflict."*
4. **Populations:** the 16 in §5 are approved, and the two broader values are **tightened**, because a population broader than the evidence overstates who it applies to:

| Effect | Was | Final | Cited paper's population |
|---|---|---|---|
| magnesium-stress | *adults reporting stress* | **otherwise healthy adults with severe stress and low blood magnesium** | Otherwise healthy adults with low magnesemia and severe/extremely severe stress (DASS-42 stress > 18) |
| berberine-metabolic | *adults with elevated blood sugar* | **people with type 2 diabetes** | Patients with type 2 diabetes (46 RCTs) |

`relevantPopulation`: **18 of 27 changed** in total, and 9 are unchanged.
