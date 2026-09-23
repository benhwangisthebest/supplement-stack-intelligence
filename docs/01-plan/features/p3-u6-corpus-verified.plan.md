# p3-u6-corpus-verified — PDCA cycle artifact for Phase 3 U6

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U6**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U6** (L214–217, status APPROVED),
> with §8's spend line and D-6. Where the two disagree, the register wins.
>
> **Feature**: `p3-u6-corpus-verified` · **Anchor**: `4ee80b6` · **Date**: 2026-09-23 ·
> **Type**: **live** (network: Crossref, doi.org, PubMed E-utilities; the deployed DB only on the retire path)

---

## 1. Plan

**Problem.** U5 built the record, and the record is empty. All 20 seed papers carry illustrative titles
(N-84), so P4 blocks any identifier until each paper is re-sourced or retired. D-6 adds the **3** effects and
**9** profile dimensions that cite nothing. The advisor's source chips show those illustrative titles with no
disclosure, although the Library discloses the same content (N-84's UI gap).

**Owner rulings in force (2026-09-23, recorded in the register before any work).** **R1:** a real paper for
the same claim → keep the id, take the resolver's title, attach `doi`/`pmid`. None found → retire via
tombstone, with its deployed-DB migration as a separate landing (own go, own OP row). *"Unverified but
disclosed"* is not an option. **R2:** (a0) adds the notice to the chips before any live work. **R3:** the
contact email is **pending** and blocks (b).

**Hard rules.** (1) No identifier, title or abstract from memory: every candidate comes from a resolver
response captured in this session. (2) `verifiedBy: "owner"` only for a mapping the owner approved in writing
in this session. (3) No grade or profile score changes: a contradiction is recorded for U4 and the owner.
(4) No lookup is reachable from a request path. The capture script is build-time and owner-run.

**Landings.** (a0) chip notice · (a) capture script, no network · (b) **live, search only**, then STOP for owner
decisions · (c) capture the approved mappings and revise the notice · (d) retirements only, separate go ·
closeout.

**Spend, pre-registered** (paste actuals into `docs/05-qa/<date>-p3-u6-verification-record.md`):
S1 search ≤130 calls · S2 capture ≤40 · S3 one re-run ≤ S1+S2 · all $0, ≤3 req/s. Any other call, any paid API
or any OpenAI call → STOP.

## 2. Design — (a0) the advisor chips carry the disclosure

`IllustrativeDatasetNotice` gains a `variant` prop. The default (`"panel"`) renders exactly the markup the
Library already mounts (`SupplementDetail.tsx:149,182`), so the Library is unchanged. The `"inline"` variant
is a one-line version of the same disclosure. `ProvenanceChips` mounts it below the chip list **when any
citation is a `paper` or an `effect-grade`**. Those are the two kinds whose chip text comes from the seed
evidence dataset (a paper's title from `tools.ts:175`, an effect's grade from `tools.ts:170`), matching the
two Library tabs that mount the notice. Chips of other kinds (interaction, biomarker, lab trend, stack,
side-effect) get no notice, because the dataset is not their source. Both variants sit in one file, so (c)
revises one place when verified papers make the wording untrue.

**Callers.** `ProvenanceChips` is mounted once (`AdvisorMessageBubble.tsx:54`). `IllustrativeDatasetNotice`
is mounted at `SupplementDetail.tsx:149,182`, both on the default variant, so neither changes.

**Not changed, recorded for (c):** a paper citation's `detail` is `"Illustrative evidence summary"`
(`src/lib/advisor/tools.ts:176`, the chip's hover `title`). It is outside U6's May-touch, and it is persisted
in `advisor_messages.citations[]`, so historic rows keep it whatever (c) does. (c) must say what happens to it.

## 3. Design — (a) the capture script

*(Written at landing (a).)*

## 4. Do / Check — (a0)

**Test:** `src/components/advisor/ProvenanceChips.test.tsx` (jsdom). A paper chip → notice present,
beside the chip in the `Sources` list; an effect-grade chip alone → notice present; an interaction chip alone →
no notice; no citations → nothing rendered.

**Red proof (AC-1).** Backed up by file copy, then the mount line deleted from `ProvenanceChips.tsx`:

```
   × … > discloses the dataset when a paper chip is shown, alongside the chip
   × … > discloses the dataset when only an effect-grade chip is shown
     → expected null not to be null
      Tests  2 failed | 3 passed (5)
```

Restored from the backup. The restored file's `shasum` equals the backup's
(`fc4eeec5150152db03c6b940cd9838da2f930363`), and `npx vitest run --project jsdom` → **5 passed (5)**.
