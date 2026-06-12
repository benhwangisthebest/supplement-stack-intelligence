# Claude.me

## Project Name

Working name: **Supplement Stack Intelligence Platform**

This is a web application for evidence-based supplement education, stack building, personalized supplement strategy, and product matching.

The product is not a simple quiz app. It is a serious supplement research and stack intelligence platform designed primarily for health nerds, biohackers, athletes, longevity-focused users, and moderately health-interested people who want to understand supplements at a deeper level.

The application should feel:

* Scientific
* Premium
* Nerd-native
* Trustworthy
* Organized
* Approachable, but not oversimplified
* Evidence-first
* User-controlled

The goal is not to “make supplements simple.”
The goal is to **make complex supplement science navigable**.

---

# Core Product Concept

The application has three main pillars:

1. **Library**
2. **Profile**
3. **Stack Lab**

The product should be designed around the relationship between these three sections.

## 1. Library

The Library is the supplement knowledge base.

Users can search and explore:

* Supplements
* Nutrients
* Effects
* Mechanisms
* Biomarkers
* Health goals
* Side effects
* Dosing ranges
* Research papers
* Evidence grades

The Library should feel similar in depth to Examine.com, but with a more interactive and personalized direction.

Each supplement page should eventually include:

* Plain-English overview
* Evidence-based effect summaries
* Dosing ranges
* Common forms
* Side effects
* Contraindications
* Medication interaction warnings
* Mechanism explanations
* Biomarker relevance
* Related supplements
* Common stack pairings
* Academic paper links
* Summaries of individual studies
* Evidence strength grading by effect category

The Library is the trust layer of the product.

It should not make unsupported claims. It should organize claims by strength of evidence.

---

## 2. Profile

The Profile is the user’s biological and lifestyle context layer.

The Profile is not a shallow quiz. It should feel like a living health context file that users can improve over time.

The Profile may include:

* Health goals
* Training habits
* Sleep patterns
* Diet style
* Current supplement preferences
* Form preferences: capsules, powder, gummies, liquid, etc.
* Allergies and sensitivities
* Medications
* Medical conditions users voluntarily disclose
* Blood test results
* Allergy test results
* Relevant biomarkers
* Avoided ingredients
* Budget preferences
* Risk tolerance
* Caffeine sensitivity
* Supplement experience level
* Current symptoms or concerns, if provided by the user

The Profile should influence:

* Stack Lab evaluations
* Protocol suggestions
* Product matching
* Allergy warnings
* Dosing relevance
* Lab-informed prioritization
* Library personalization notes

Important: The Profile should not diagnose the user. It provides context for educational and decision-support features.

---

## 3. Stack Lab

The Stack Lab is the main action center of the application.

This is where users:

* Build their current supplement stack
* Add supplements manually
* Add supplements suggested by the app
* Create multiple stacks
* Define stack intent
* Evaluate their stack
* Compare current stack vs suggested protocol
* Generate supplement protocols based on Profile data
* Match real-world products to the stack or protocol

The Stack Lab should contain what would otherwise be separate “Protocol Builder” and “Product Match” sections.

Therefore, do not create separate top-level navigation items for Protocol Builder or Product Match unless explicitly instructed later.

Main navigation should stay clean:

* Library
* Profile
* Stack Lab

Inside Stack Lab, include sub-sections or modes:

* Current Stack
* Planned Stack
* Suggested Protocols
* Stack Evaluation
* Product Match
* Compare Mode

---

# Key Product Philosophy

## User Freedom Comes First

The application should not lock users into the app’s recommendations.

Health nerds want freedom. They may disagree with the recommendation, experiment with compounds, add advanced supplements, adjust doses, or build multiple versions of a stack.

The app should allow this.

The product should behave like an evidence-aware lab assistant, not a strict doctor.

The app can say:

* “Recommended”
* “Reasonable but optional”
* “Experimental”
* “Flagged”
* “Not enough information”
* “Potentially redundant”
* “Potential interaction”
* “Dose exceeds common studied range”

But it should not unnecessarily block the user from adding things to their stack.

Exceptions: The app may strongly warn users about potentially dangerous combinations, high doses, medication conflicts, allergy conflicts, or other safety issues.

---

# Core User Flows

## Flow 1: Search First

A user searches for a supplement in the Library.

Example:

* Magnesium
* Creatine
* L-theanine
* Berberine
* Ashwagandha
* Vitamin D
* Fish oil

The user sees evidence summaries, effect grades, mechanisms, dosing, risks, and papers.

From the Library page, they can:

* Add to Current Stack
* Add to Planned Stack
* Compare with current stack
* View related supplements
* View products later

---

## Flow 2: Stack First

A user enters their current supplement stack.

For each stack item, collect:

* Supplement name
* Form
* Dose
* Unit
* Frequency
* Timing
* Reason for taking it
* Optional brand/product
* Optional notes

Then the app evaluates the stack based on available evidence and the user’s Profile.

The evaluation should identify:

* Evidence-supported items
* Weakly supported items
* Redundant items
* Possible interaction risks
* Dose concerns
* Timing concerns
* Missing foundational nutrients
* Allergy conflicts
* Medication conflicts
* Lab-informed concerns, if lab data exists
* Cost-efficiency concerns, if product data exists
* Possible simplification opportunities

The output should be educational, not medically directive.

---

## Flow 3: Profile First

A user fills out their Profile.

The Profile can later be used to generate supplement protocols and evaluate stacks.

The Profile should be progressive. The user should not need to complete everything at once.

Start with core fields:

* Goals
* Diet
* Allergies/sensitivities
* Medications
* Current supplements
* Supplement preferences

Then allow deeper additions:

* Blood test results
* Allergy test results
* Biomarkers
* Wearable data
* Advanced notes

---

## Flow 4: Protocol Builder Inside Stack Lab

The user requests a suggested protocol based on their Profile.

The system generates a supplement strategy grouped by purpose.

Example categories:

* Foundational health
* Sleep
* Focus
* Training/performance
* Recovery
* Gut health
* Metabolic health
* Stress
* Longevity
* Deficiency support

The protocol should include:

* Suggested supplement
* Reason for inclusion
* Evidence grade
* Dose range
* Timing
* Relevant warnings
* Why it fits the user’s Profile
* What data would improve confidence
* Whether it is foundational, targeted, advanced, or experimental

The user can accept, reject, edit, or add any item to their stack.

---

## Flow 5: Product Match Inside Stack Lab

After the user has a stack or protocol, the app helps match real-world supplement products.

The Product Match system should evaluate products by:

* Ingredient match
* Dose per serving
* Form of ingredient
* Third-party testing
* Price per effective dose
* Allergen compatibility
* Additives/fillers
* Brand trust signals
* Country availability
* User preferences
* Compatibility with the user’s target dose

Affiliate links may be used later, but product trust must come before monetization.

The application should clearly separate:

* Evidence-based recommendation
* Product availability
* Affiliate relationship

Never make the product feel like it is recommending something only because of commission.

---

# Main Navigation

Use three main top-level sections:

## Library

Purpose: Learn and investigate.

Includes:

* Supplement search
* Supplement pages
* Effect pages
* Mechanism pages
* Paper summaries
* Evidence grading
* Related supplements

## Profile

Purpose: Provide personal context.

Includes:

* Goals
* Diet
* Allergies
* Medications
* Preferences
* Labs
* Biomarkers
* Current health context

## Stack Lab

Purpose: Build, evaluate, optimize, and match products.

Includes:

* Current Stack
* Planned Stack
* Suggested Protocols
* Stack Evaluation
* Product Match
* Compare Mode

---

# Suggested Product Positioning

The product should feel like:

> A personalized supplement research and stack intelligence platform.

Alternative phrasing:

> Build a smarter supplement stack with evidence, context, and control.

Alternative phrasing:

> Search supplements, understand the evidence, build your stack, and see what actually makes sense for your body.

Do not position it as:

* A magic AI doctor
* A cure platform
* A quick supplement quiz
* A generic wellness app
* A basic affiliate supplement shop
* A replacement for medical care

---

# User Experience Principles

## 1. Dense but readable

The product should be information-rich but well-organized.

Avoid oversimplifying scientific information. Instead, layer it.

Example page hierarchy:

1. Practical summary
2. Evidence grade
3. Dose range
4. Side effects
5. Mechanism
6. Study summaries
7. Advanced notes

## 2. Progressive depth

Do not split users into “light / medium / heavy” modes.

Instead, use layered depth.

Every user sees the same serious product, but they can expand sections for more detail.

Use concepts like:

* Summary
* Details
* Mechanism
* Evidence
* Papers
* Advanced

## 3. Evidence before recommendation

Recommendations should be explainable.

Every suggested supplement should have:

* Why it was suggested
* What evidence supports it
* How strong that evidence is
* What the uncertainty is
* What risks or conflicts exist

## 4. User control

The user can override recommendations, add custom supplements, and modify doses.

The app responds by evaluating the user’s choices rather than blocking them by default.

## 5. Trust over monetization

Product matching and affiliate links must never undermine trust.

Product Match should be based on fit, quality, dose, and safety first.

---

# Evidence Grading Concept

The app should eventually grade evidence at the effect level, not only the supplement level.

For example, creatine may have:

* Strong evidence for strength/power
* Moderate evidence for cognitive support in specific contexts
* Weak or emerging evidence for mood
* Different evidence depending on age, population, and baseline status

Each effect should be graded separately.

Possible grading dimensions:

* Human evidence strength
* Study quality
* Consistency of findings
* Effect size
* Population relevance
* Safety profile
* Dose clarity
* Mechanistic plausibility

Avoid giving one universal grade to an entire supplement when possible.

---

# Stack Evaluation Concept

The Stack Evaluation should analyze the full stack in context.

Evaluation categories:

## Evidence Fit

Does each supplement have evidence for the user’s stated goal?

## Dose Fit

Is the dose within common studied ranges?

## Timing Fit

Does the timing make sense?

## Redundancy

Are multiple supplements targeting the same mechanism unnecessarily?

## Interaction Risk

Are there possible supplement-supplement or supplement-medication concerns?

## Allergy Conflict

Does the stack or product contain ingredients the user may need to avoid?

## Lab Relevance

Do uploaded labs change prioritization or risk?

## Goal Alignment

Does the stack match the user’s actual goals?

## Cost Efficiency

Is the stack overly expensive relative to expected benefit?

## Complexity / Adherence

Is the stack too complicated to realistically follow?

---

# Stack Intent Concept

Every stack should have an intent.

Examples:

* Foundational
* Sleep
* Focus
* Training
* Recovery
* Gut health
* Stress
* Metabolic health
* Longevity
* Skin
* Hormonal support
* Experimental

A user may have multiple stacks.

Examples:

* Morning stack
* Pre-workout stack
* Sleep stack
* Daily foundational stack
* Travel stack
* Experimental stack

Evaluation should depend on stack intent.

A supplement that makes sense in a sleep stack may not make sense in a focus stack.

---

# Recommendation Categories

When evaluating or suggesting supplements, use categories like:

## Recommended

Strong fit based on user goal, evidence, and safety context.

## Reasonable but Optional

May help, but not essential.

## Experimental

Interesting or mechanism-based, but limited human evidence or uncertain relevance.

## Flagged

Potential issue due to dose, interaction, allergy, lab marker, medication, redundancy, or safety.

## Not Enough Information

The system needs more profile data or stronger evidence.

This is better than simple “good/bad” judgments.

---

# Safety and Compliance Principles

This product is educational and decision-support oriented.

It should not diagnose, treat, cure, or prevent disease.

Avoid language like:

* “You have a deficiency”
* “This will treat your condition”
* “You should take this”
* “This cures”
* “This replaces medication”
* “Stop taking your medication”

Prefer language like:

* “May support”
* “Has evidence for”
* “Commonly studied for”
* “May be worth discussing with a clinician”
* “Could be relevant based on the information provided”
* “This is flagged due to a potential risk”
* “The app cannot determine this safely from the available information”

Medical disclaimer should be present where appropriate, especially near Profile, labs, protocols, and stack evaluation.

For medications, pregnancy, chronic disease, abnormal labs, very high doses, or risky combinations, the app should strongly recommend professional medical guidance.

---

# MVP Scope

The MVP should prove the core concept:

> A user can search supplements, create a profile, build a stack, and receive an evidence-aware stack evaluation.

The first version does not need a massive database.

Start with a small, high-quality supplement dataset.

Suggested seed supplements:

* Magnesium
* Creatine
* Vitamin D
* Fish oil / omega-3
* L-theanine
* Glycine
* Melatonin
* Ashwagandha
* Berberine
* Zinc
* Vitamin B12
* Caffeine
* Taurine
* NAC
* Protein powder

MVP should include:

## Library MVP

* Search supplements
* View supplement detail pages
* Show effect summaries
* Show evidence grades
* Show dose ranges
* Show side effects
* Show paper summaries using seeded sample data

## Profile MVP

* Create/edit user profile
* Add goals
* Add diet information
* Add allergies/sensitivities
* Add medications manually
* Add supplement preferences
* Add simple lab markers manually
* Upload UI placeholder for lab/allergy files, even if parsing is not fully implemented yet

## Stack Lab MVP

* Create a stack
* Add supplements to stack
* Add dose, unit, timing, frequency, purpose
* Run a basic stack evaluation
* Show flags and recommendations
* Compare current stack against profile goals
* Generate a simple suggested protocol from profile goals using rule-based logic
* Allow user to accept/edit/reject suggested items

## Product Match MVP

For MVP, Product Match can be a placeholder or simple mock system.

It may show manually seeded products with:

* Brand
* Product name
* Ingredient
* Dose per serving
* Form
* Allergen tags
* Price placeholder
* Product quality notes
* External link placeholder

Do not integrate Amazon API in the earliest MVP unless explicitly instructed.

---

# Out of Scope for MVP

Do not build these in the first MVP unless specifically requested:

* Full Amazon API integration
* Automatic blood test parsing
* Automatic allergy report parsing
* Full research paper ingestion pipeline
* AI-generated paper summaries from live PubMed
* Medication interaction database integration
* Wearable integrations
* Mobile app
* Payment/subscription system
* Community features
* Doctor portal
* Full admin CMS
* Complex gamification system
* Real-time chat coach

These can be future features.

---

# Suggested Technical Direction

Default to a modern web application stack unless instructed otherwise.

Suggested stack:

* Next.js
* TypeScript
* React
* Tailwind CSS
* shadcn/ui or similar component system
* Supabase or PostgreSQL for database
* Prisma or Drizzle for ORM
* Auth system suitable for user profiles
* Server-side data validation
* Zod for schemas
* Clean modular architecture

Prioritize clear structure over clever code.

The project should be easy for an AI coding agent and a human developer to navigate.

---

# Suggested Project Structure

Use a clean structure similar to:

```txt
src/
  app/
    page.tsx
    library/
    profile/
    stack-lab/
    auth/
    api/
  components/
    layout/
    library/
    profile/
    stack/
    evidence/
    product/
    ui/
  lib/
    evidence/
    stack-evaluator/
    protocol-builder/
    product-matcher/
    safety/
    data/
    utils/
  types/
    supplement.ts
    profile.ts
    stack.ts
    evidence.ts
    product.ts
  data/
    seed-supplements.ts
    seed-papers.ts
    seed-products.ts
```

Keep business logic out of UI components.

Important logic should live in:

```txt
lib/evidence
lib/stack-evaluator
lib/protocol-builder
lib/product-matcher
lib/safety
```

---

# Core Data Model Direction

The exact schema can evolve, but conceptually the app should support these entities:

## Supplement

* id
* name
* aliases
* category
* description
* common forms
* mechanism summary
* side effects
* contraindications
* general dose range
* tags

## Effect

* id
* supplementId
* effect name
* outcome category
* evidence grade
* confidence level
* summary
* relevant population
* dose used in studies
* linked papers

## Paper

* id
* title
* authors
* year
* journal
* link
* study type
* population
* sample size
* intervention
* dose
* duration
* outcomes
* limitations
* summary

## UserProfile

* id
* goals
* diet
* allergies
* medications
* preferences
* risk tolerance
* notes

## LabMarker

* id
* userId
* marker name
* value
* unit
* reference range
* date
* source
* notes

## Stack

* id
* userId
* name
* intent
* description
* createdAt
* updatedAt

## StackItem

* id
* stackId
* supplementId
* customName
* dose
* unit
* timing
* frequency
* reason
* productId
* notes

## EvaluationFlag

* id
* stackId
* stackItemId optional
* severity
* category
* title
* explanation
* recommendation
* evidenceLevel

## Protocol

* id
* userId
* goal
* generatedFromProfile
* items
* explanation
* createdAt

## Product

* id
* name
* brand
* supplementId
* ingredient form
* dose per serving
* serving size
* allergen tags
* testing tags
* price
* price per effective dose
* affiliate link optional
* quality notes

---

# Core Logic Modules

## Evidence Module

Responsible for:

* Returning supplement evidence summaries
* Mapping supplements to effects
* Returning evidence grades
* Returning paper summaries
* Showing uncertainty

## Stack Evaluator

Responsible for:

* Evaluating user stack against Profile
* Detecting dose concerns
* Detecting redundancy
* Detecting allergy conflicts
* Detecting medication warning placeholders
* Checking goal alignment
* Generating evaluation report

## Protocol Builder

Responsible for:

* Generating suggested supplement protocol from Profile
* Grouping recommendations by goal
* Explaining why each item was suggested
* Assigning confidence and evidence level
* Allowing user to add suggestions to Stack Lab

## Product Matcher

Responsible for:

* Matching products to stack/protocol items
* Checking dose per serving
* Checking form
* Checking allergens
* Checking user preferences
* Ranking products by fit
* Keeping affiliate logic separate from ranking logic

## Safety Module

Responsible for:

* Standardized warning language
* High-risk condition checks
* Medication caution placeholders
* Allergy conflict detection
* Dose warning thresholds
* Disclaimer placement

---

# UI Direction

The interface should feel premium and scientific.

Avoid:

* Cheap wellness-app aesthetics
* Overly playful medical UI
* Influencer supplement-shop vibes
* Aggressive sales pages
* Oversimplified quiz funnels

Prefer:

* Clean cards
* Dense but readable layouts
* Tabs
* Expandable evidence sections
* Clear badges
* Tables for dose/evidence
* Confidence labels
* Warning cards
* Comparison views
* Dashboard-like Stack Lab

Suggested UI language:

* Evidence Grade
* Confidence
* Mechanism
* Dose Range
* Stack Fit
* Profile Relevance
* Risk Flags
* Redundancy
* Product Fit
* Research Summary

---

# Gamification Direction

Gamification should be subtle and identity-based, not childish.

Possible future concepts:

* Stack type cards
* Supplement archetype cards
* Profile completeness
* Research depth badges
* Evidence literacy score
* Stack complexity score
* Risk awareness score

Do not prioritize gamification in MVP.

If included, keep it premium and minimal.

---

# Development Priorities

Build in this order:

## Phase 1: App Shell

* Landing page
* Main navigation
* Dashboard layout
* Library/Profile/Stack Lab routes
* Basic responsive design

## Phase 2: Seed Library

* Seed supplement data
* Supplement search
* Supplement detail page
* Evidence cards
* Paper summary cards

## Phase 3: Profile

* Profile creation/editing
* Goals
* Allergies
* Diet
* Medications
* Preferences
* Simple lab marker entry

## Phase 4: Stack Lab

* Create stack
* Add stack item
* Edit stack item
* Remove stack item
* Stack intent
* Timing/frequency fields

## Phase 5: Stack Evaluation

* Basic rule-based evaluator
* Evidence fit
* Dose fit
* Allergy flags
* Redundancy flags
* Goal alignment
* Evaluation report UI

## Phase 6: Protocol Builder

* Generate suggested protocol from profile goals
* Show reasoning
* Allow user to add/edit/reject suggestions
* Compare suggested protocol vs current stack

## Phase 7: Product Match Placeholder

* Seed product data
* Match products to stack items
* Product fit score
* Allergen warnings
* Affiliate link placeholder

---

# Important Development Rules

1. Do not build random features outside the three-pillar structure.
2. Do not create a shallow quiz-first experience.
3. Do not over-focus on Product Match before Library and Stack Lab are useful.
4. Do not make unsupported medical claims.
5. Do not make the system overly conservative to the point of being useless.
6. Always preserve user freedom to customize their stack.
7. Always show why something is recommended or flagged.
8. Keep evidence and product monetization separate.
9. Prefer modular logic that can later be upgraded with real research databases and APIs.
10. Make the MVP useful with seeded data before adding complicated integrations.

---

# Product North Star

The product should help users answer:

> “Does my supplement stack actually make sense?”

Everything should support that question.

Library helps users understand the evidence.

Profile gives personal context.

Stack Lab turns that context and evidence into a practical, editable supplement strategy.

The MVP should make this core loop feel valuable before expanding into advanced automation, AI research ingestion, lab parsing, or affiliate commerce.
