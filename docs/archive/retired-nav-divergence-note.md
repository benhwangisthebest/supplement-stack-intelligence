# Retired: the `CLAUDE.md` §1 navigation-divergence note (FU-27)

**Retired 2026-08-10 by Phase 2 U24**, which executed §7 decision 1 (ruled **Option A**, 2026-08-08).
Reference material. It never overrode anything while it lived, and it overrides nothing now — rank 8.

> **Why this file exists rather than a deletion.** `CLAUDE.md` §7 forbids deleting historical rationale:
> *"Retire it with an explanation of why it existed and whether the underlying risk still needs
> controlling."* Phase 2's exit criterion for U24 separately requires `grep -c 'FU-27' CLAUDE.md` = 0. Those
> two requirements are only jointly satisfiable if the rationale moves somewhere, and this is where —
> the same shape as `original-mvp-instructions.md`, which preserves the retired MVP scope caps and the
> reason each existed. The conflict between the two clauses is registered as **N-31** in the Phase 2 plan.

---

## The note, verbatim as it stood in `CLAUDE.md` §1 from 2026-08-06 to 2026-08-10

> **[2026-08-06] The shipped UI diverges from this rule, and the rule is NOT being relaxed to match.**
> `src/components/layout/TopNav.tsx` appends an `Advisor` pill to the same `NavPills` group for signed-in
> users, so an authed reader sees **four**. The v6 design did record an explicit decision — but for a
> "top-level-adjacent surface … **not** a 4th main pillar". Rendering it inside the pillar list is an
> implementation divergence from that decision, not an authorised fourth pillar, and
> `docs/product-direction.md` still states the three-item rule as permanent. Recorded as **FU-27** for a
> product decision: move the Advisor out of the pillar group, or change the rule deliberately. Not
> resolved here — §8.1, name it rather than absorb it.

---

## Why it existed

A rank-3 rule stated as **permanent** in `CLAUDE.md` §1, and repeated as permanent in
`docs/product-direction.md` §3.3 — *"Main navigation stays exactly three items: Library, Profile, Stack
Lab"* — was contradicted by shipped code for every signed-in user. `TopNav.tsx` built
`user ? [...PILLARS, {href:"/advisor"}] : PILLARS` and handed the result to one `<NavPills>`.

The honest move at the time was neither to quietly obey the code (by relaxing the rule) nor to quietly obey
the rule (by changing the code inside an unrelated unit). §8.1 says: **name it, don't absorb it.** So it was
named, and it sat named — visible in the most-read file in the repository — until a product decision could
be taken. That is the note working as intended, not the note failing.

## Whether the underlying risk still needs controlling

**Yes, and it is now controlled by a mechanism instead of by this paragraph.**

The risk was never "the Advisor is in the wrong place." It was that **a permanent rule lived only in
prose**, so nothing could tell anyone when code drifted from it — which is how the divergence survived
long enough to need a register row at all. `CLAUDE.md` §3.5: *a documented rule that nothing runs will
rot.*

`src/architecture/nav-pillars.test.ts` now asserts, on every `npm test`:

- `PILLARS` has exactly three entries, with the three `docs/product-direction.md` labels and hrefs;
- no pillar points at `/advisor`, asserted **by value**;
- at source level, that `NavPills` receives that constant **unconditionally**, that no `[...PILLARS`
  spread survives anywhere in the file, and that `<NavPills` is rendered exactly once;
- that `docs/product-direction.md` **still states the three-item rule** — so if the rule is ever
  deliberately relaxed (decision 1's option B, which was **not** ruled), the guard fails and has to be
  revisited alongside it, rather than silently enforcing a rule the product has abandoned;
- that the Advisor is **still rendered** beside the sign-out control. Option A was *placement, not
  removal*, and a future change that simply deleted the Advisor would satisfy every rule above while
  quietly losing a shipped surface.

Shown red against four mutations: appending a fourth entry, restoring the `user ? [...PILLARS, …]`
conditional, renaming a pillar, and deleting the Advisor link.

## What replaced it

`CLAUDE.md` §1 now carries the rule and a dated pointer to this file. The rule itself is unchanged — it was
never relaxed. The code moved to meet it.
