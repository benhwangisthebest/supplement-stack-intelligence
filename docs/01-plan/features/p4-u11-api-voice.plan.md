# p4-u11-api-voice — PDCA cycle artifact for Phase 4 U11

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U11**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U11 · API voice · **SUPERVISED** · deterministic · size S · **Anchor** `7e9c9a2` · **Date** 2026-09-29
> **Rulings in force:** D-4 (a) + (c)(ii), quoted in plan §6 · N-87 (only the `:80` and `:95` literals echo; `:88`
> echoes nothing) · RC-1 (no new `src/architecture` spec; SPEC_COUNT 30) · RC-2 (probes and reviewer on a scratch copy;
> restore by copy + `cmp`) · RC-3 (CI ≤ 20 × 60 s) · RC-4 (bkit at open). PARALLEL MODE: U13 runs at the same time.
> **Opening check:** main CI run `36646849737` read once: `completed / success` on `7e9c9a2…`.

## 1. Plan

**Goal (the brief's):** record the 15 route sites' per-resource 404 wording as the API voice, and make the two service
404s in `src/services/advisor-actions.ts` stop echoing the supplement id. **Retires:** N-50, decided and recorded
(`[P4-X7]`; the tick is the owner's) · N-87's echo part.
**May touch:** `src/services/advisor-actions.ts` + its test · the plan's U11, N-50 and N-87 rows · this file · the
decision queue. **May not touch:** the 15 route files, `src/types/**`, `supabase/migrations/`, `CLAUDE.md`,
`package.json`, `.github/workflows/**`, allowlists.
**"Its test".** The service has no sibling test file. Its tests are the differential pins in
`src/app/api/advisor/actions/route.test.ts`, which the service header names as its gate. That route is not one of the
15. The unit reads *its test* as that file, and says so here because the reading decides a staged path.

## 2. Design

**AC-1, the voice (no wording change).** `notFound(what)` (`src/lib/api/respond.ts:108-109`) renders
*"`<What>` not found."* with code `NOT_FOUND` and status 404. The 15 sites, all under `src/app/api/`, lines at `7e9c9a2`:

| # | Site | Message |
|---|---|---|
| 1–3 | `stacks/[id]/route.ts:21`, `:36`, `:52` | *Stack not found.* |
| 4 | `stacks/[id]/evaluate/route.ts:19` | *Stack not found.* |
| 5 | `stacks/[id]/compare/route.ts:21` | *Stack not found.* |
| 6 | `stacks/[id]/items/route.ts:20` | *Stack not found.* |
| 7 | `products/match/route.ts:21` | *Stack not found.* |
| 8 | `protocol/generate/route.ts:27` | *Stack not found.* |
| 9–12 | `stacks/[id]/items/[itemId]/route.ts:65`, `:66`, `:83`, `:84` | *Stack item not found.* |
| 13 | `advisor/route.ts:172` | *Conversation not found.* |
| 14 | `advisor/conversations/[id]/route.ts:44` | *Conversation not found.* |
| 15 | `advisor/actions/[id]/undo/route.ts:61` | *Action not found.* |

Tally: Stack 8 · Stack item 4 · Conversation 2 · Action 1, which matches D-4's count. Found with
`grep -rn 'notFound(' src/app/api --include=route.ts`. No `fail("NOT_FOUND", …)` call appears in any route file.
Each route resolves to one literal, which `NOT_FOUND_UNIFORMITY` already guards.

**AC-2, the service literals.** Two `fail("NOT_FOUND", …, 404)` calls interpolated the caller's id. The register's
`:80`/`:95` predate a one-line shift. At `7e9c9a2` they are `:81` (generate_protocol, per item) and `:96` (add_item),
and after this unit they are `:83` and `:98`. Both become a fixed literal, with code and status unchanged. The
ownership 404 on the same route (`:89` at `7e9c9a2`, *"Stack not found."*) and the service's
`notFound("Conversation")` are unchanged.

| | Before (`7e9c9a2`) | After |
|---|---|---|
| `:81` generate_protocol | `` `Supplement "${item.supplementId}" not found.` `` | `"Supplement not found."` |
| `:96` add_item | `` `Supplement "${pl.supplementId}" not found.` `` | `"Supplement not found."` |

On the wire, for a planted id: `{"data":null,"error":{"code":"NOT_FOUND","message":"Supplement \"qx7j-zv9k-wq3p\" not found."}}`
becomes `{"data":null,"error":{"code":"NOT_FOUND","message":"Supplement not found."}}`.

**The test.** A new describe in `route.test.ts`, *404 does not echo the requested supplement id*, has one `it` per
branch. It plants `qx7j-zv9k-wq3p` and reads the body as raw text and the headers as `name: value` lines, both
lower-cased. It fails if either contains the id, any hyphen segment of it, or any four-character run of it. It then
requires the whole body to equal `{ data: null, error: { code: "NOT_FOUND", message: "Supplement not found." } }`
exactly, and requires `executeBatch` not to have been called.
The one existing pin that named the echo (`PIN 404`, *"… naming an unknown supplement"*) now expects the new string,
and its title now reads *"… for an unknown supplement"*. The file header says *"Do not edit the pins"*, a rule written
for Phase 1 U11's behaviour-preserving move. This change is a ruled behaviour change, and a dated comment at the pin
says so.

**Not computed:** the substring check does not catch an encoded id (reversed, base64, hex) or a run shorter than four
characters. In the body, the whole-body equality catches those. In a **header**, only the substring check applies, so
an encoded id in a header would pass. The planted id was chosen so that none of its runs occurs in the fixed body.

## 3. Do — red proofs

**R0, RED at HEAD** (unit worktree, HEAD's service, new test): 3 failed / 36 passed (39). *PIN 404* received
`Supplement "creatine" not found.`. Both echo tests failed with *404 body echoes "qx7j-zv9k-wq3p" of the requested id*,
and the body was `…"message":"Supplement \"qx7j-zv9k-wq3p\" not found."}}`. **Green after the fix:** 39/39.

Every mutation below ran on a scratch worktree detached at `7e9c9a2`, with the unit's two source files copied in and
`node_modules` symlinked (RC-2). Each was restored from a saved copy and checked with `cmp`, and every restore was clean.

| # | Mutation of the scratch copy | Result | Red test · message |
|---|---|---|---|
| U1 | item route `:66` → `notFound("Item")` (tells *stack not yours* apart from *item missing*) | `NOT_FOUND_UNIFORMITY` 1 failed / 14 | *no route resolves its 404 call sites to more than one message* · `…[itemId]/route.ts answers 2 different 404 messages: "Item not found." · "Stack item not found."` |
| U0 | restored | 15/15 | — |
| M1 | add_item `:98` echoes `slice(0, 4)` | 2 failed / 37 | *PIN 404* (`Supplement "crea" not found.`) · *add_item …* echoes `"qx7j"` |
| M2 | add_item message fixed, `details: { id }` | 1 failed / 38 | *add_item …* echoes the full id |
| M3 | generate_protocol `:83` → HEAD's echo | 1 failed / 38 | *generate_protocol …* echoes the full id |
| M4 | generate_protocol echoes the last hyphen segment | 1 failed / 38 | *generate_protocol …* echoes `"wq3p"` |
| M5 | generate_protocol message fixed, upper-cased id in `details` | 1 failed / 38 | *generate_protocol …* echoes the full id (the lower-casing) |

| M6 | add_item message fixed, id set as an `x-id` **header** | 1 failed / 38 | *add_item …* · *404 headers echo "qx7j-zv9k-wq3p"* |
| M7 | generate_protocol message fixed, **reversed** id in `details` | 1 failed / 38 | *generate_protocol …* · whole-body `toEqual` |
| M8 | generate_protocol message fixed, **base64** id in `details` | 1 failed / 38 | *generate_protocol …* · whole-body `toEqual` |

M1–M5 ran before the reviewer's advisories, against the test as it then stood (body only; `error` compared exactly).
M6–M8 ran after, against the final test, together with a repeat of R0 (still 3 failed / 36). **The part check caught
M1–M5 on its own:** they were re-run with the exact assertion deleted, and each went red with the same test and message.
That is true for those five and not in general: M7 and M8 are caught **only** by the whole-body equality, as the
reviewer showed. Before the lower-casing was added, M5's first form (an
upper-cased message) was caught **only** by the exact assertion. That is why the check now lower-cases. The first
attempt at M1/M2 matched `add_item` in the new source comment and hit the wrong site, so both were re-run by line number.

## 4. Check

- **AC-1:** met. The 15 sites are above and in the U11 row. No route file changed.
- **AC-2:** met. Before/after strings in §2. The code and status are unchanged, and R0 is red at HEAD.
- **AC-3:** met. `NOT_FOUND_UNIFORMITY` is 15/15 green in the unit tree and red on U1. **Its reach is 404 messages
  only.** The reviewer showed it stays green when the second branch answers 403, when it adds a distinguishing
  `details`, and when it calls a local rebinding (`const nf = notFound`). These gaps predate U11, and U11 does not
  widen them. They are named here, not fixed: the spec is outside *May touch*. Registered as **FU-81** on the owner's ruling.
- **AC-4:** met. `src/app/api/advisor/actions` + `src/services`: 3 files, 68 tests green. `npx vitest run
  src/architecture`: 30 files, 518 tests green. The touched code's 401, validation, happy-path and 404 pins are all in
  `route.test.ts`, and all pass.
- **AC-5, AC-6:** §5.
- **Stop classes:** one hit, by design. The two service messages are **changed user-facing strings**, and the
  AdvisorPanel renders server error text through `errorText`. The unit stopped for the owner before commit. **Approved 2026-09-29 (owner):** both strings exactly as shown, and `route.test.ts` counts as the service's test, with the one pin updated. No live call,
  no spend, no migration. Nothing under `src/types/**`, `package.json`, the workflows or any allowlist was touched, and
  no guard was weakened.
- **Debt named, not absorbed (§8 rule 1):** `not-found-uniformity.test.ts:17-18,29-34` still calls N-50 open and still
  describes the service echo. That file is outside *May touch*, so it is queued as **Q-13** with proposed text.

## 5. Act — landing record

- **Independent review (AC-5):** a fresh subagent, on a scratch worktree at `7e9c9a2` with the diff applied. Verdict
  **PASS WITH ADVISORIES**, nothing blocking. It re-ran R0 (3 failed / 36) and U1, confirmed all 15 sites against the 25
  tracked route files, and found no consumer of the old string. Its evasions: an upper-cased id, a dash-stripped id and a
  3-character slice were caught, and so were a reversed id and a base64 id in `details`, by the exact assertion only. It
  found two uncaught: an id in a header, and a transformed id in `data`. **Dispositions:** (1) headers and `data`
  uncaught → fixed with a headers scan and whole-body equality (M6–M8) · (2) the "caught alone" claim overstated → fixed
  in §3 · (3) the uniformity guard's reach → named in §4 · (4) the N-50 row's `:88` → now cites `:89`/`:91` · (5)
  "red at HEAD" → now "red at `7e9c9a2`". The reviewer also asked whether "DONE" was premature, since the unit stops for
  the owner. The row is left as DONE because it lands only after the owner approves the copy · (6) Q-13's "three 404s"
  → now "four sites, three messages". The reviewer did not see the fixes.
- **G, branch CI, landing:** not written here. Recording them would change the tree G measured. They are in the unit's
  bkit entry and the report back.
