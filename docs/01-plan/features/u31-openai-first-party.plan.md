# u31-openai-first-party — PDCA cycle artifact for Phase 2 unit U31

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U31** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). U31 was added to that plan by a **scope amendment** on the owner's instruction of
> 2026-09-14 (rank 2), the same route by which U25 was added on 2026-08-10. The amendment is written —
> Phase 2 plan, "**[2026-09-14] SCOPE AMENDMENT — U31**" — and was **APPROVED as drafted by the
> repository owner on 2026-09-18**, together with decision 9.
>
> ~~**Until that amendment is written and approved, this file authorises nothing.**~~ **[2026-09-18]
> RETIRED — the condition was met, not waived** (`CLAUDE.md` §7: retire with rationale, never delete).
> It existed because a subordinate artifact that reads as authoritative *before* its parent plan admits
> the unit is precisely how rank 5 gets borrowed for work nobody approved. **The underlying risk still
> needs controlling, and still is:** this document remains subordinate, and the next unit drafted here
> ahead of its own amendment inherits that sentence unchanged.
> Numbering is append-only — U31 follows U29, it is not inserted.
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U31 — the LLM provider changes again: Omniroute → OpenAI's first-party API
> **Date**: 2026-09-14 · **approved 2026-09-18**
> **Status**: **APPROVED** — decision 9 and the U31 scope amendment approved **as drafted** by the
> repository owner, 2026-09-18 (`CLAUDE.md` §6 rank 2). This artifact now carries the rank-5 authority
> of an approved plan's cycle record; it does not acquire any authority above that.
> ~~**Status**: DRAFT — awaiting owner approval. A Draft outranks nothing (`CLAUDE.md` §6 rank 5).~~
> **[2026-09-18] RETIRED, not deleted (`CLAUDE.md` §7).** The DRAFT line existed so nothing in this file
> could be cited as authority while its parent amendment was unapproved. **The approval discharges the
> condition; it does not repeal the rule.** "A Draft outranks nothing" is permanent and lives where
> permanent rules live — `CLAUDE.md` §6 rank 5 — not in this line.
> **Method**: bkit PDCA (plan → design → do → check → report)
>
> **[2026-09-15] U31 IS DEVELOPED IN A SEPARATE WORKTREE, AND THAT CHANGES WHERE ITS bkit CYCLE LIVES.**
> Worktree `../supplement-stack-intelligence-u31`, branch `feat/u31-openai-first-party`, created because
> another session shares the main worktree and its index, and the two collided — U31's staged entry for
> the Phase 2 plan was overwritten and unstaged there.
>
> `.bkit/state/pdca-status.json` is **gitignored** (`.gitignore:68`) and therefore exists **only in the
> main worktree**. It is not visible from here and is not copied: duplicating a local tracker into a second
> checkout would create two states that disagree, which is worse than one that is absent. **U31 registered
> in that state file on 2026-09-14** (feature `u31-openai-first-party`, phase `plan`, verified through the
> bkit MCP reader) and it will **not advance past `plan` there** while the work happens in this worktree.
>
> **So THIS DOCUMENT is U31's bkit cycle record**, not the state file — which is what `CLAUDE.md` §9
> already says is the tracked, versioned artifact. The §9 condition that "every unit from U26 onward
> registers with bkit and is driven plan → design → do → check → report" is met by the phases recorded
> here in §7 and §8, and a reader of `bkit_pdca_status` on the main machine will see U31 sitting at `plan`
> while this artifact shows it complete. **That divergence is stated here rather than papered over**,
> because a tracker that is current for some units and silent for others is exactly the half-use §9's
> retired note forbade. Advancing the state file is a main-worktree action at closeout, listed in §8.

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | The one module in `src/` permitted to spend money, `src/lib/omniroute/client.ts`, is named for and configured against an Omniroute gateway the owner no longer uses. Every operational setting (`OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`, `OMNIROUTE_TIMEOUT_MS`), both probe scripts, five architecture guards and one coverage-threshold key are pinned to that name. |
| **Solution** | Point the existing client at `https://api.openai.com`, rename the module and its settings to `OPENAI_*`, and make the three request-body facts that differ between a gateway and OpenAI's own endpoint correct: `max_completion_tokens` replaces `max_tokens`, an optional `reasoning_effort` is sent when configured, and the base URL gains no default. **The wire protocol does not change** — the client was already written to OpenAI's shapes (U25 header, `client.ts:36`), which is why this unit is a rename plus two body fields rather than a second protocol rewrite. |
| **Function/UX Effect** | **No user-visible change when correctly deployed.** Three declared changes: (1) the request body's token cap field is renamed; (2) a `reasoning_effort` field appears when `OPENAI_REASONING_EFFORT` is set; (3) **a deployment that does not update its environment variables answers 503 `AI_SERVICE_NOT_CONFIGURED` on the advisor and lab-import PDF paths** rather than silently calling a gateway that is gone. CSV/paste lab import and every unit test still run with nothing configured. |
| **Core Value** | The paid boundary keeps its shape — one module, one credential, one completions path, a model id that lives only in the environment — while the provider behind it changes. The guards that made U25 safe are re-pointed, not relaxed. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | Owner instruction, 2026-09-14: "at the moment it is designed to use omniroute … I want to use regular API from open-AI". |
| **WHO** | `/api/advisor` and `/api/lab-import/extract` — the two routes `PAID_API_BUDGET` governs, and the only two that can spend money. |
| **RISK** | **The model id and the reasoning-effort value cannot be verified from inside this repository.** See §5. |
| **SUCCESS** | Four gate commands green, five mutations shown red, **and an owner-run live probe record** — a green suite cannot prove this unit works. |
| **SCOPE** | 21 tracked non-doc files + `vitest.config.ts` + `.env.example`. No new dependency. No change to the agent loop, the ledger, the safety gate, or `src/types/`. |

---

## 1. Problem statement

U25 replaced the Anthropic SDK with an Omniroute gateway and, in doing so, moved the paid boundary from
a **package** marker to a **module** marker — because a gateway reached over plain HTTP has no package
to import, and an import-graph rule has nothing to bind to (`boundaries.test.ts:929`). That design
survives this unit unchanged: OpenAI's first-party API is also reached over plain HTTP.

What does not survive is the naming. Five guards and one coverage key are pinned to the literal strings
`src/lib/omniroute/client.ts`, `OMNIROUTE_API_KEY` and `OMNIROUTE_MODEL`. A rename that does not move
them in the same commit is a red build; a rename that moves them carelessly is a guard that passes
vacuously over nothing — the failure mode `CLAUDE.md` §5 names first.

## 2. Approach — four groups

**Group A — the client.** `src/lib/omniroute/` → `src/lib/openai/`, including `client.test.ts`.
`OmnirouteError` → `OpenAIError`, `OmnirouteMessage` → `OpenAIMessage`, and so on; `COMPLETIONS_PATH`
and `completionsUrl` are unchanged in value and behaviour. Two body changes in `createCompletion`:

- `max_tokens` → **`max_completion_tokens`**. OpenAI's GPT-5-era models reject `max_tokens` on Chat
  Completions. Both call sites already pass a neutral `maxTokens`, so the rename is confined to the one
  `JSON.stringify` body.
- a new optional **`reasoning_effort`**, present in the body **only when the caller supplies one**.
  `CompletionRequest` gains `reasoningEffort?: string` — typed as `string`, deliberately **not** a union
  of `"none" | "low" | …`. A union here would be this repository asserting which values a provider it has
  never contacted accepts, which is §2.2 rule 7 in the shape N-21 already cost us once.

**Group B — the two adapters and two routes.** `model-adapter.ts`, `pdf-adapter.ts`,
`api/advisor/route.ts`, `api/lab-import/extract/route.ts`: the four `OMNIROUTE_*` reads become
`OPENAI_*`, and a fifth is added — `OPENAI_REASONING_EFFORT`, resolved per call like the model id,
**with no default and omitted from the body when unset** (owner ruling, 2026-09-14). The
`NotConfiguredError` throws stay exactly where `NOT_CONFIGURED_TOTALITY`'s sanctioned list expects them;
reasoning effort is **not** added to the not-configured triple, because it is genuinely optional and a
missing value is a working call, not a broken one.

**Group C — the guards.** `PAID_MODULES`; `SOLE_PAID_CLIENT`'s key literal and its three-file reader
pin; `NO_PINNED_MODEL_ID`'s model-variable reader pin; the `src/lib/omniroute/**` coverage key in
`vitest.config.ts`. `NO_PINNED_MODEL_ID`'s `FAMILIES` list **already contains `"gpt-"`**, so a hardcoded
OpenAI id is red today and stays red — no widening needed, and that is worth stating rather than
assuming.

**Group D — the operational surface.** `.env.example`; `scripts/probes/omniroute-*.ts` →
`openai-*.ts` and their `load-env.ts` keys; the `probe:*` npm scripts; the three E2E specs' env gating;
`CLAUDE.md` §4's enforcement-table row for rule 9, which names `src/lib/omniroute/client.ts` as the paid
marker; `docs/project-status.md`. The two dated U25 probe records under `docs/05-qa/` are **historical
and are not edited** (§7: never delete historical rationale) — a new record is written instead.

## 3. Out of scope, each with its reason

- **The `openai` npm package.** Recommended against and not used. The whole `PAID_MODULES` /
  `SOLE_PAID_CLIENT` design exists *because* the boundary is a module rather than a dependency; adding
  an SDK would reopen `RETIRED_PACKAGE`'s story for no behavioural gain, and `src/lib/openai/client.ts`
  must keep its zero imports to stay inside `DOMAIN_IS_PURE`.
- **The Responses API.** Chat Completions is what the client already speaks and what OpenAI still
  supports. Moving to `/v1/responses` would be the protocol rewrite this unit is specifically not.
- **Renaming the `ClaudeAdapter` port.** Pre-existing naming debt, recorded in U25's report. Renaming it
  opens `agent.ts` and `src/types/advisor.ts` — governed files — for zero behavioural gain. **Named, not
  absorbed** (§8.1); it is now two providers stale and should be registered as a follow-up.
- **Streaming from the provider.** `stream: false` stays explicit. Model tokens on a socket before the
  safety gate is the one thing the design forbids (§2.1 rule 5).
- **Ledger, budget, reservation and `usage: null` semantics.** Untouched. OpenAI reports
  `prompt_tokens`/`completion_tokens`, the names `readUsage` already reads.

## 4. Red list — every guard this unit edits, and the mutation that must redden it

No guard in Group C may be edited without showing it red first. Per §5 rule 2, a test not shown red
against the bug it targets is not a guard.

| # | Mutation | Must redden |
|---|---|---|
| **M1** | Rename the module but leave `PAID_MODULES` pointing at `src/lib/omniroute/client.ts` | `PAID_API_BUDGET` — the marker resolves to nothing, so the governed-route set empties and its non-vacuity assertion fires |
| **M2** | Revert `max_completion_tokens` to `max_tokens` in the request body | a new `client.test.ts` case asserting the serialised body's cap field |
| **M3** | Send `reasoning_effort` unconditionally (i.e. as `undefined`) when the env var is unset | a new `client.test.ts` case asserting the key is **absent** from the body, not present-and-undefined |
| **M4** | Add a fourth module reading `OPENAI_API_KEY` | `SOLE_PAID_CLIENT`'s reader pin |
| **M5** | Hardcode `"gpt-mutation-does-not-exist-9f3a"` in `src/` | `NO_PINNED_MODEL_ID` (already covers `gpt-`; this confirms the re-point did not blind it) |

> **[2026-09-18] M5's literal changed, and the owner's proposed replacement was corrected before use
> (N-60).** It was `"gpt-5.6-luna"` — which turned out to be the owner's *actually configured*
> `OPENAI_MODEL`, so the mutation was indistinguishable from live configuration pasted into a test. The
> instruction proposed `"mutation-does-not-exist-9f3a"`. **That string would have made M5 vacuous:**
> `NO_PINNED_MODEL_ID` matches a family list — `claude`, `haiku`, `sonnet`, `opus`, `gpt-`, `o1-`, `o3-`
> — and that literal contains none of them, so the mutation would have passed and §7's M5 row would have
> become a false claim. The literal used is `"gpt-mutation-does-not-exist-9f3a"`: it keeps the `gpt-`
> token the guard scans for while being unmistakably synthetic. **Re-run rather than assumed** — see §7.

Plus two non-vacuity checks, because a rename is exactly how a guard comes to scan an empty set:
`SOLE_PAID_CLIENT` and `NO_PINNED_MODEL_ID` both already assert their inventories are non-empty. Those
assertions must be **observed passing against the new paths**, not assumed.

## 5. Risks — and the one this repository cannot test away

**R1 — the model id cannot be verified here, and neither can the reasoning-effort value.** The owner
named "ChatGPT 5.6 Luna" with `reasoning effort: none`. Neither string is one this agent can confirm
exists; the assistant's knowledge ends May 2026 and both may simply postdate it. **No value is written
into `src/` either way** — `NO_PINNED_MODEL_ID` forbids it, and N-21 is the record of what happens when
a model id is guessed: a default that 400'd on the first real gateway it met, with a green suite.

The residue is honest and must be stated rather than engineered around: **nothing in this repository can
prove this unit works.** A scripted mock accepts whatever id and whatever effort value it is handed.
Only a live call can tell the difference, which is why §6 ends with an owner-run probe and not a test
count. This is OP-4's pattern from U25, reused because it is the only thing that worked last time.

**R2 — `max_completion_tokens` is a one-way bet on model era.** GPT-5-era models reject `max_tokens`;
some older models reject `max_completion_tokens`. The client sends one. If the owner ever routes an
older model, this breaks — loudly, on the first call, which is the correct direction. Registered here
rather than guarded, per §8.4: a fallback that tries both would hide which one the deployment is using.

**R3 — a deployment that does not update its environment silently degrades to 503.** This is the
declared behaviour change, not a defect. The alternative — reading `OMNIROUTE_*` as a fallback — would
leave the old names live in a repository that claims they are gone, which is the "half-migrated" state
`RETIRED_PACKAGE` was written to prevent.

**R4 — probe records are dated evidence, not a standing claim.** The new record proves the gateway
answered on the day it ran. It does not prove the deployed environment is configured, and CI holds no
credentials by design (P-03).

## 6. Success criteria

1. Five mutations M1–M5 shown **red** with verbatim output before the corresponding guard is trusted.
2. Both non-vacuity assertions observed green against the new paths.
3. Four gate commands (`CLAUDE.md` §5.10): `npx tsc --noEmit`, `npm run lint`, `npx vitest run`,
   `npx next build`. Suite count re-measured, not copied from a previous unit.
4. `npm run lint` still reports **every** tracked source file linted, with `EXEMPT_UNLINTED` empty —
   the rename moves files, and a narrowed lint set is exactly how that check goes vacuously green.
5. CI green on the pushed SHA.
6. **An owner-run live probe record** under `docs/05-qa/`, covering: the advisor tool-calling turn, the
   lab-import PDF `file` part, that the configured model id resolves, that `reasoning_effort` is
   accepted, and that `usage` is reported (if it is not, the ledger stops settling — see the
   `usage: null` contract).

Criterion 6 is the one that matters. 1–5 can all be green while the application cannot make a single
successful call.

---

## 7. Verification record — executed 2026-09-14

### Baseline, untouched tree at `f74fcb8`

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | 360/360 tracked source files, 0 errors, `EXEMPT_UNLINTED` empty |
| `npx vitest run` | **1294 passed / 106 files** |
| `boundaries.test.ts` | 47 passed |
| coverage, `src/lib/omniroute/**` | 100 stmts · 88.23 branch · 100 funcs · 100 lines (floors 90/78/90/90) |

### Post-change, re-measured 2026-09-18 — NOT copied from the baseline

Tree: `f74fcb8` + U31's full working diff, **pre-rebase**. Criterion 3 requires the suite count
re-measured rather than carried forward, and the two columns differ, which is the reason for the rule.

| Check | Baseline (`f74fcb8`, 2026-09-14) | **This tree (2026-09-18)** |
|---|---|---|
| `npx tsc --noEmit` | clean | **clean** |
| `npm run lint` | 360/360 tracked, 0 errors, `EXEMPT_UNLINTED` empty | **360/360 tracked, 0 errors, `EXEMPT_UNLINTED` empty** |
| `npx vitest run` | 1294 passed / 106 files | **1298 passed / 106 files** (+4) |
| `npx next build` | succeeds | **succeeds** |
| `boundaries.test.ts` | 47 passed | **47 passed** |
| `npm run test:coverage` | — | **exit 0, all thresholds met** |
| coverage, paid client | `src/lib/omniroute/**` — 100 · 88.23 · 100 · 100 | **`src/lib/openai/**` — 100 stmts · 89.47 branch · 100 funcs · 100 lines** (floors unchanged at 90/78/90/90) |

**+4 tests, all in `src/lib/openai/client.test.ts`** (28 tests in that file), which is the M3 repair:
the pre-serialisation key-presence assertions for `reasoning_effort` and `max_completion_tokens` that
the parsed-body test could not express. **The file count is unchanged at 106** — the rename moved a
test file, it did not add one.

**This measurement is superseded after the rebase**, as predicted, and the superseding figures are below.
The pre-rebase column stays as written.

### Post-rebase, re-measured 2026-09-18 — C4 discharged

Rebased onto `main` at **`e9a8a73`**; U31 is the single commit on top. The prediction held exactly:
`main` carries U22's `src/architecture/e2e-browser-parity.test.ts`, a spec this tree had never held.

| Check | Pre-rebase (2026-09-18) | **Post-rebase (2026-09-18)** |
|---|---|---|
| `npx tsc --noEmit` | clean | **clean** |
| `npm run lint` | 360/360 tracked, 0 errors | **361/361 tracked, 0 errors**, `EXEMPT_UNLINTED` empty |
| `npx vitest run` | 1298 / 106 files | **1306 / 107 files** (+8 tests, +1 file) |
| `npm run test:coverage` | exit 0 | **exit 0** |
| `npx next build` | succeeds | **succeeds** |
| `npm run test:e2e` (non-live) | not run | **70 passed, 30 skipped** — the 30 are the `[LIVE]`-gated specs, correctly skipped with no credentials configured |
| `boundaries.test.ts` | 47 | **47** |
| executable architecture specs | 20 | **21** |

**The entire delta is U22's**: +1 file and +8 tests from `e2e-browser-parity.test.ts`, and the +1 tracked
source file lint sees. **U31 added no test between the two measurements** — which is the point of
re-measuring rather than carrying a number forward, since a copied figure would have silently attributed
U22's 8 tests to this unit.

### The guards-before-rename proof

Guards re-pointed while the module was still at the old path → **7 failed / 40 passed**, including
`PAID_API_BUDGET`'s own non-vacuity assertion firing unprompted:

```
AssertionError: PAID_API_BUDGET: found 0 paid-API routes; a guard that scans nothing passes
vacuously. Either the import-graph walk is broken or PAID_PACKAGES is stale.: expected 0 to be
greater than or equal to 2
AssertionError: src/lib/openai/client.ts: expected false to be true   [module marker names a file that exists]
AssertionError: SOLE_PAID_CLIENT: ... expected [ 'src/lib/omniroute/client.ts' ] to deeply equal [ 'src/lib/openai/client.ts' ]
```

After `git mv`: 47/47. Red on the stale path, green on the new one — evidence a rename-first order
could not have produced, because every guard would have been green throughout.

### Mutations

| # | Mutation | Failing assertion | Verdict |
|---|---|---|---|
| **M1** | `PAID_MODULES` left at `src/lib/omniroute/client.ts` | `PAID_API_BUDGET: every route reaching a paid API declares a budget and a rate limit` · `…the derived set is exactly the two routes it should be` · `…the single module marker accounts for both paid routes` · `…the module marker names a file that exists` | **RED** (4 assertions) |
| **M2** | `max_completion_tokens` → `max_tokens` | `sends max_completion_tokens, and NOT the legacy max_tokens (U31/M2)` — `expected undefined to be 2048`; also reddened the pre-existing tool test | **RED** (2) |
| **M3** | `reasoning_effort` sent unconditionally (as `undefined`) | `omits reasoning_effort ENTIRELY when unset — the KEY is absent (U31/M3)` — `expected true to be false` | **RED after the guard was fixed — see below** |
| **M3b** | `reasoning_effort: … ?? null` | same assertion | **RED** |
| **M4** | a fourth module reading `OPENAI_API_KEY` | `SOLE_PAID_CLIENT: the gateway key is read only where it is declared to be` | **RED** (only when the file is git-tracked — see limits) |
| **M5** | ~~`?? "gpt-5.6-luna"`~~ **`?? "gpt-mutation-does-not-exist-9f3a"`** in `resolveModel` (literal changed 2026-09-18, N-60) | `NO_PINNED_MODEL_ID: no model identifier is hardcoded anywhere in src/` | **RED, re-run 2026-09-18 with the new literal: 1 failed / 46 passed, `src/lib/advisor/model-adapter.ts: "gpt-mutation-does-not-exist-9f3a"`; 47/47 on revert** |

### M3 FAILED FIRST, AND THE GUARD WAS THE THING THAT WAS WRONG

**M3 stayed green on its first run.** `JSON.stringify` deletes keys whose value is `undefined`, so
`{reasoning_effort: undefined}` and an omitted key are byte-identical on the wire, and the original test —
which asserted `not.toHaveProperty` against the **parsed** body — could not distinguish them. The test's
own comment acknowledged the round trip erased the difference and then asserted against the parsed body
anyway. It was decorative: `CLAUDE.md` §5 rule 2's exact failure, in a test written to satisfy §5 rule 2.

**The plan was also wrong**, and that is the more useful half: §4's M3 named a mutation that is a no-op at
the wire and asserted it would redden a wire-level test. A mutation list is only as good as the
observability of the thing it mutates.

**Fix:** the body construction is extracted as a pure exported core, `buildCompletionBody`, matching the
shape `completionsUrl` / `readUsage` / `parseCompletion` already have. Key *presence* is then observable
with `in`, before serialisation. `toHaveProperty` is deliberately **not** used for it — that matcher
reports false for a key that exists holding `undefined`, which is the precise state being ruled out.
Both halves are now asserted: the pre-serialisation key (catches M3) and the wire body (catches M3b's
explicit `null`). A third test extends the same treatment to `max_completion_tokens`, which had the same
unguarded conditional spread.

### Non-vacuity, measured against the new paths

| Inventory | Count | Threshold |
|---|---|---|
| `NON_TEST_SRC` (the scan set) | **215** | ≥ 100 |
| completions-path holders | **1** — `src/lib/openai/client.ts` | exactly 1 |
| `OPENAI_API_KEY` readers | **3** — advisor route, model-adapter, pdf-adapter | pinned equality |
| `OPENAI_MODEL` readers | **3** — same three | pinned equality |
| tracked `src/app/api/**/route.ts` | **25**, of which 2 reach the paid marker | ≥ 2 |

### Stated limits of these guards

- **`SOLE_PAID_CLIENT` and `NO_PINNED_MODEL_ID` scan git-TRACKED files only.** M4 passed green on the
  first attempt because the probe file was untracked; it reddens once staged. This matches
  `verify-lint.mjs`'s git-derived set and is correct for CI, which only ever sees tracked files — but a
  local working tree can hold an unstaged second key reader and show green. Recorded, not filed as a
  defect.
- **`NO_PINNED_MODEL_ID` matches literal text**, so it is still defeated by an id assembled from
  fragments or by a family its list does not name. Unchanged by this unit; `gpt-` was already listed,
  which M5 confirms.
- **No guard here can prove the swap works.** See §5 R1.

### Reviewer verdicts — 2026-09-18, on the rebased diff

| Reviewer | Verdict | Substance |
|---|---|---|
| **`ecc:code-reviewer`** | **APPROVE** — 0 CRITICAL, 0 HIGH, 0 MEDIUM, 1 LOW | Swap complete: no live `OMNIROUTE_*` reference remains in `src/`, `scripts/`, `.env.example` or `package.json` (the only hits are deliberate historical comments and the error-disclosure regexes that still match the retired name). The `pdf-adapter.ts` extraction is **behaviour-preserving** — `buildTranscriptionRequest` reproduces the old inline literal byte-for-byte, same `maxTokens: 2048`, same message order, plus the optional effort passthrough — and production and probe call the identical exported functions, with no copy. No hardcoded credential; the `!response.ok` branch still never reads the upstream body. **No decorative tests**, and `client.test.ts` documents its own prior false pass. **The LOW was fixed rather than noted:** the advisor probe's "model source" line branched on `OPENAI_MODEL` after `requireModel()` had already `process.exit(1)`'d on unset, so the false branch was unreachable *and* named a "probe default" N-53 deleted — §2.2 rule 7 at diagnostic scale |
| **`ecc:security-reviewer`** | **Question answered; one finding** | **(i) Does any path send health context anywhere other than the configured `OPENAI_BASE_URL`? No.** The completions-path literal occurs in exactly one non-test module and `SOLE_PAID_CLIENT` pins it; advisor turns and both lab-import paths funnel through `createCompletion`. The only other `fetch` calls in `src/` are browser-side, to the app's own routes. **(ii) Is that URL validated to be first-party, or merely documented? MERELY DOCUMENTED.** Both readers apply a truthiness check only; `completionsUrl` concatenates without parsing; `.env.example` documents the escape hatch. Registered as **N-63**, assigned to **OP-5's record (C2)** rather than absorbed here. Secondary: **no API-key echo path** — the client withholds error bodies by construction and the loader prints names, never values |

**Both reviewers ran against the rebased tree**, i.e. including U22's specs, not against the pre-rebase
commit. Neither was given a conclusion to confirm; the security question was put as an open question with
two possible answers, and it returned the less comfortable one.

### Findings raised by this unit

| # | Finding | Disposition |
|---|---|---|
| **N-63** | **`OPENAI_BASE_URL` is documented as first-party, never validated as first-party.** Found by `ecc:security-reviewer` on the U31 diff, 2026-09-18. Both readers — `model-adapter.ts:365-368` and `pdf-adapter.ts:244-249` — apply a **truthiness check only**; `completionsUrl` (`client.ts:179-181`) concatenates whatever string it is given, with no `new URL()` parse, no https-only assertion, no host allowlist. `.env.example:26` documents the escape hatch in as many words: *"Point it elsewhere for a proxy or a compatible gateway."* **Consequence:** anyone who can set the deployment's environment can silently redirect full health context — medications, conditions, lab values, whole lab-report PDFs — to an arbitrary endpoint, carrying `OPENAI_API_KEY` in the `Authorization` header. `SOLE_PAID_CLIENT` does not cover this and says so itself: it proves the code funnels through one module, not what host that module is configured to call | **OPEN — NOT fixed in U31, and deliberately so.** This is **OP-5's code-level half** and it belongs to OP-5's record (§8 C2), not to a provider rename that must not silently acquire a deployment control (§8.1). **Registered because the distinction is the finding:** U31's commit message says the advisor is development-only until OP-5's record exists — which is true and self-aware, but it is an admission in prose, and prose is not a control. Candidate remedy from the reviewer, for OP-5's ruling: reject non-`https://` schemes unconditionally, and either pin `api.openai.com` or require an explicit `OPENAI_ALLOW_CUSTOM_HOST` opt-in, applied once where both adapters already read the variable |
| **N-62** | *(was N-52 until 2026-09-18 — see the numbering note under this table)* `load-env.ts` filtered on prefix `OMNIROUTE_`; after the env rename the probes would load nothing from `.env.local` and report "not configured" with the operator's file present | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**FIXED in this unit** — prefix is `OPENAI_`~~ |
| **N-53** | Both probe scripts hardcoded `"cc/claude-haiku-4-5-20251001"` as a model fallback — an Omniroute-namespaced Claude id, invisible to `NO_PINNED_MODEL_ID` because that guard scans `src/` and probes live in `scripts/` | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**The instance is FIXED** — defaults deleted, unset exits 1. **The class is OPEN and now OWNED: §8 C6**, a closeout decision point. `scripts/` is unguarded territory: `NO_PINNED_MODEL_ID`, `SOLE_PAID_CLIENT` and `verify-lint.mjs` all scan `src/`, and `scripts/probes/*` authenticate paid calls. The ruling due at closeout is *extend the scan, or accept the class with a written reason* — **not** silence~~ |
| **N-54** | The `ClaudeAdapter` port name is now **two providers stale** | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~~~OPEN, unassigned.~~ **OPEN and OWNED: §8 C7**, a closeout decision point. Renaming opens `agent.ts` and `src/types/advisor.ts` for zero behavioural gain, which is the argument for *accepting* it — but acceptance is a ruling with a recorded reason, not a default reached by nobody deciding. A port named for a provider the repository has not called since U25 is a §8.2 naming-debt finding, not a fact of life~~ |
| **N-55** | §5 of the Phase 2 plan omitted **U30** from its sequence line entirely | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**FIXED in passing** — `U29 → U30 → U31`, per U30's own "Scheduled after U29"~~ |
| **N-57** | **`.env.local` goes stale after a worktree split**, and an append onto a file with no trailing newline silently glues the new setting into the previous value, where `parseEnvFile` absorbs it. N-52's failure mode from the opposite side | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**ACCEPTED by the owner 2026-09-18 → §8 C9.** Full detail in the probe record~~ |
| **N-58** | **Both probe scripts sent legacy `max_tokens`** in hand-rolled bodies — the field U31's own M2 replaced with `max_completion_tokens`. `openai-advisor-probe.ts` step 1 and `openai-labimport-probe.ts` option (a) both 400. **The probes no longer mirrored production on the one field this unit changed** | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**FIXED 2026-09-18, by owner ruling.** Neither probe hand-rolls a body now: the advisor's step 1 calls `buildCompletionBody`, and lab-import's option (a) composes `pdfContentParts` + `buildTranscriptionRequest` + `buildCompletionBody`, all **imported** from the modules under test. Option (b)'s second leg was repaired too — unreachable while `/v1/ocr` 404s, but the identical defect one function down. Two pure cores were **extracted and exported** from `pdf-adapter.ts`; nothing was copied~~ |
| **N-59** | **The lab-import probe printed a verdict it had not earned** — `REJECTED — option (a) does not work for this model`, from a request carrying two candidate causes of failure. **N-26 recurring**: the 2026-08-10 record withdrew its own §2/§3 for the same reason. Decision 7B relies on this script's output shape | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**FIXED 2026-09-18.** The line now reads `NOT ACCEPTED — HTTP <status>. Status recorded; no verdict inferred (N-59)`. With N-58 fixed the request finally isolates the variable, so a 400 *can* now be attributed — but the script still declines to name a cause it cannot see, because the response body is deliberately not printed~~ |
| **N-61** | *(candidate remedy now at §8 C10)* **The lab-import probe verifies shape, never content** — `reportTranscript` prints candidate and recognised-marker counts and never a transcribed value, so a schema-valid hallucination and a correct transcription are indistinguishable in its output. N-59's class one level deeper: N-59 was an unearned verdict, N-61 is an unmeasured dimension | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**OPEN, unassigned.** Not fixed here: printing values means printing health-shaped content even when synthetic, which needs a rule-15 judgement rather than a patch. Registered so "verified against a PDF" does not travel further than "verified schema-valid against a PDF"~~ |
| **N-60** | The configured model id `gpt-5.6-luna` was the same literal **M5** used as its mutation string, which made M5's red weaker evidence than an obviously-synthetic id would | **[2026-09-18] PROMOTED TO THE PHASE 2 REGISTER (§4.5) AND SUPERSEDED THERE.** The register row is the one that counts; this copy is kept, not deleted (§7), as the dated record that U31 raised it. Mirror, never replacement — see the register's numbering note. ~~**FIXED 2026-09-18** — now `"gpt-mutation-does-not-exist-9f3a"`, re-run red. **The owner's proposed literal was corrected first**: `"mutation-does-not-exist-9f3a"` carries none of the guard's family tokens and would have made M5 pass vacuously. See §4~~ |
> **[2026-09-18] NUMBERING RECONCILED AT THE REBASE — one collision, renumbered rather than merged over.**
>
> **`N-52` was claimed twice, by two sessions that could not see each other.** This artifact registered
> N-52 on **2026-09-14** (`load-env.ts`'s prefix). The U22 review registered a *different* N-52 on
> **2026-09-15** (`README.md:26`'s stale per-spec test counts) and it reached the canonical register in
> `docs/01-plan/phase-2-operational-dependability.plan.md` first. **The register wins**, so this row is
> renumbered to **N-62** — the next free number — and the Phase 2 register's N-52 is untouched. Renumber,
> never merge over: two findings sharing a number is how one of them stops being findable.
>
> **The two probe records cite the old number and are NOT edited.** `2026-09-18-u31-openai-probe-record.md`
> §"Registered by this record" describes N-57 as "N-52's failure mode from the opposite side", and that is
> **N-62's** failure mode. The records are dated evidence accepted as written by the owner; silently
> rewriting a number inside one would be worse than a mapping line here. **The mapping is: this artifact's
> and both records' `N-52` = the register's `N-62`.**
>
> **N-53, N-54 and N-55 are NOT collisions** — they are this artifact's alone, and the register has no
> rows at those numbers. **N-56 is the same finding on both sides**, not a collision: the bkit-state
> divergence this artifact raised was independently written up, more fully and with the owner's ruling, by
> the session working in the main worktree. **That write-up is uncommitted in that worktree and is
> therefore not on `main`**, so this rebase cannot carry it; when it is committed, its N-56 and this row
> are one finding and the fuller text should win.
>
> **[2026-09-18, after this unit merged at `f9c34e3`] SETTLED, exactly as predicted.** The other
> session's write-up is now committed in the Phase 2 register with the owner's ruling attached, and
> **that row is the one N-56**. The row below is superseded — kept, not deleted (§7), because it is the
> dated evidence that this unit saw the divergence first.

| **N-56** | bkit tracker shows **u12** at phase `report`, not `completed`, despite its closeout commit `f74fcb8` | **SUPERSEDED 2026-09-18 by the N-56 row in the Phase 2 register** (`docs/01-plan/phase-2-operational-dependability.plan.md` §4.5), which carries the fuller finding — u22 was parked at `plan` too — and the owner's ruling closing it for all units. **Both units are now `completed`.** Read that row, not this one; this text is kept as the dated record that U31 raised it. ~~**OPEN** — another unit's state, not touched here. **Surfaced, not owned by U31: §8 C8.** It is registered because `CLAUDE.md` §9's revived-tracker condition holds only while *every* unit from U26 on is driven to completion; a unit stuck at `report` is the half-use that condition forbids |

---

## 8. Closeout obligations — what is owed, and by whom

**This section was referenced twice by the header block before it existed** (§"U31 IS DEVELOPED IN A
SEPARATE WORKTREE", written 2026-09-15; the dangling reference was found 2026-09-18 during a pre-landing
status check). **The repair was to write the section, not to delete the references** — the obligations
below are real, and until now they were listed nowhere. A document that cites a section it does not have
is the same defect class as copy citing a computation nobody ran (`CLAUDE.md` §2.2 rule 7); it is recorded
here rather than quietly fixed, because the interesting part is that a *plan artifact* reproduced the
failure mode its own §5 exists to catch.

**Nothing below is unowned.** Every row is DONE, owned by a named unit, or carries an explicit ruling due
at closeout. "Unassigned" is not a state this table permits.

| # | Obligation | Owner | State |
|---|---|---|---|
| **C1** | **Live probe record**, success criterion 6 — `docs/05-qa/2026-09-18-u31-openai-probe-record.md`. Advisor tool-calling turn; lab-import PDF `file` part against a text fixture **and** an image-only one; the model id that actually resolved; `reasoning_effort` accepted; `usage` reported. Run **before** the code commit, per the owner's 2026-09-18 sequence — N-21 is the reason: an unset or unresolvable id fails every turn from a green suite | Owner-run; executed 2026-09-18 | **DONE — SATISFIED**, on the second run. **Record 1** `docs/05-qa/2026-09-18-u31-openai-probe-record.md` **FAILED** and stays as written: advisor half PASS, lab-import half not measured (N-58/N-59, an instrument defect). **Record 2** `docs/05-qa/2026-09-18-u31-openai-probe-record-2.md` **PASSES every clause** after the probes were rewired to production builders — including option (a) at 200 on **both** the text and the image-only fixture. **Decision 7B holds against `api.openai.com`.** Limits that remain: N-25 (clean renders only) and **N-61** (the probe checks shape, never values) |
| **C2** | **OP-5 record** — `docs/05-qa/2026-09-18-op5-provider-record.md`. Two halves: the provider's data-usage and retention policy **fetched from primary sources** with URL and date read (never recalled — `CLAUDE.md` §2.2 rule 8), and the account facts only the owner holds (configured base URL, DPA executed, ZDR enabled). **OP-5 is not discharged on an assumption:** any account fact returning "unknown" leaves OP-5 **OPEN**, with the record naming exactly what is missing and the "development-only, no real user health data" instruction still in force | Owner supplies the account facts | **OPEN — BLOCKED on U32 (N-63) and on the owner's account facts.** Not discharged, not written. Two blockers, stated separately because they fail differently: U32 is buildable and scheduled; the account facts exist only with the owner. See the OP-5 row in the Phase 2 register |
| **C3** | **[2026-09-18 DISCHARGED — the main session advanced the tracker; see the Phase 2 entry's U31 STAMP ROW bkit line. Kept as written, §7.]** ~~Advance `.bkit/state/pdca-status.json` for `u31-openai-first-party` from `plan` to completion. **A main-worktree action** — the file is gitignored (`.gitignore:68`) and does not exist here, deliberately, since a duplicated tracker in two checkouts is worse than one that is absent | Closeout, in the main worktree | **PENDING**~~ |
| **C4** | **Re-measure the four gates after the rebase**, plus `test:coverage` and non-live `test:e2e` | This unit, step 4 | **DONE 2026-09-18** — see §7's post-rebase table. **1306/107**, lint **361/361**, coverage exit 0, build succeeds, E2E **70 passed / 30 skipped**. All of the delta from the pre-rebase figures is U22's |
| **C5** | Push, fast-forward of `main`, branch deletion, and the closeout commit. **Each needs its own approval** — `CLAUDE.md` §10 rule 5: prior approval of one does not carry to the next | Owner, one at a time | **PENDING** |
| **C6** | **N-53's open class: no guard covers `scripts/`.** **[2026-09-18] CONSTRAINT ADDED BY OWNER RULING, and this incident is the class's concrete instance:** any guard proposed here must **at minimum assert that the probe scripts import their request bodies from `src/` rather than defining them**. N-58 is what the absence of that guard costs — a probe drifted one field away from production, 400'd, and printed a wrong conclusion about a different component entirely. A guard that only scanned for hardcoded model ids would not have caught it. The instance is fixed, the class is not. `NO_PINNED_MODEL_ID`, `SOLE_PAID_CLIENT` and `verify-lint.mjs` all scan `src/` or tracked *source*; `scripts/probes/*` read `OPENAI_API_KEY` and spend real money, and a hardcoded id there is invisible to every guard in the repository. **Ruling due at closeout: extend the scan to `scripts/`, or accept the class with a written reason.** Accepting is defensible — probes are developer tools, not shipped paths — but it is a decision, and a decision nobody makes is how U31 found the stale Claude id in the first place | **Closeout ruling** | **OPEN, decision point** |
| **C7** | **N-54: the `ClaudeAdapter` port name is two providers stale.** **Ruling due at closeout: rename, or accept with the reason recorded.** The case for accepting is real — the rename opens `agent.ts` and `src/types/advisor.ts` for zero behavioural gain, and `src/types/` is governed by §4 rules 1–2. The case against is that the repository's one paid port is named for a vendor it has not called since U25, and `CLAUDE.md` §8.2 says a temporary name that became load-bearing is a finding, not a fact of life | **Closeout ruling** | **OPEN, decision point** |
| **C10** | **N-61 — the lab-import probe verifies shape, never content.** Candidate remedy, registered by owner ruling 2026-09-18 and **not built now**: *the probe compares the transcript against the fixture's known synthetic values and prints only match/mismatch counts — **compare, never print***. That shape is what makes it buildable at all: it closes the unmeasured dimension without putting health-shaped content, even synthetic, into a pasted transcript (§2.3 rule 15). **Reinforced 2026-09-18 by `ecc:security-reviewer`, which found the probe ALREADY prints `first 200 chars` of a raw model response on a schema failure** (`openai-labimport-probe.ts`) — owner-run and outside `src/`, but it is the exact behaviour C10 must not extend, and arguably one C10 should retract. Ruled at closeout | **Closeout ruling** | **OPEN, decision point** |
| **C9** | **N-57 — `.env.local` goes stale after a worktree split.** Accepted as registered by the owner, 2026-09-18. Remedy candidates ruled at closeout: *loader warns on a populated file with zero matching keys*, or *a documented split procedure*. **The probe record adds a constraint on that ruling:** the first candidate would not have caught the observed case, because three keys did match and a fourth was swallowed into another key's value | **Closeout ruling** | **OPEN, decision point** |
| **C8** | **[2026-09-18 DISCHARGED — see the Phase 2 register's N-56 row and its owner ruling; u12, u22 and u31 are all `completed`, and the advance is now a standing STAMP ROW line. The condition below is kept as written, per §7.]** ~~**N-56: the bkit tracker shows `u12` at `report`, not `completed`**, despite closeout commit `f74fcb8`. Not U31's state and not touched here. Surfaced because `CLAUDE.md` §9's revived-tracker condition holds *only* while every unit from U26 onward is driven to completion — a unit parked at `report` is exactly the half-use the retired note forbade, and the note reinstates itself as written if it stays that way | Owner / U12's closeout | **OPEN, referred** |

> **[2026-09-22, Phase 2 closeout] PRINT-ORDER NOTE.** This table prints `C1…C7, C10, C9, C8` — an
> append-order artifact of rows edited after they were written. It changes no disposition and is left in
> place; recorded because it is the **same class** as the Phase 2 register's §4.6, which printed OP-7
> before OP-6 and was reordered at this closeout. Two instances is a pattern worth a reader knowing about:
> a table whose rows are revised out of sequence stops being scannable for "what is last".
> **C6, C7, C9 and C10 are now registered as FU-35…FU-38** in the Phase 2 plan §4.3.

**C1 and C2 are the two that cannot be satisfied from inside this repository**, and they are the two that
matter. §5 R1 and §7's "Stated limits" both say it plainly: no test here can prove the swap works, and no
test here can prove where the health context goes. Everything else in this table is bookkeeping by
comparison.
