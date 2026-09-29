# Phase 4 · U15 — Logging redaction (D-7 (d): no sink) · RUNNER

> **Register:** [`phase-4-product-completion.plan.md`](../phase-4-product-completion.plan.md), U15 row. Runner
> spec §6 D-1 items 1–8; owner clarifications RC-1…RC-5 (2026-09-29).
> **bkit:** `p4-u15-logging-redaction`. **Anchor:** `main` at `39fd568`. **Worktree:** `../ssi-u15`, branch
> `p4-u15-logging-redaction` (parallel mode, beside U12 and U16).
> **Status: DONE 2026-09-29.** Parked first on Q-5 (stop class: a staged file outside *May touch*), then landed
> on the owner's rulings on Q-5 and Q-6 after rebasing onto `40adf2d`, which renumbered the queue entries
> (Q-4…Q-6 → Q-5…Q-7). Q-7, the sink's roadmap line, stays queued for a supervised docs-sync landing.

## 1. Problem

N-40 / FU-41: `respond.ts`'s `logInternalError` wrote `err.message`, `err.stack` and one level of
`err.cause` to `console.error`. Every route funnels failures through it, `/api/account/export` included,
and that route's payload is the user's full health record. Nothing stood between health-bearing error
text and a log line (§2.3 rule 15). D-7 (d) narrows the rows with **sink-less redaction** on today's
`console.error` path. N-11, FU-43 and FU-44 stay open.

**Owner definition (2026-09-29), the allowlist, verbatim:** error class name, error code, HTTP status,
route pattern (not the URL with params or query), request id. Everything else is dropped. Changing it is
a stop class.

## 2. Design (as built in the worktree)

- **`src/lib/api/redact.ts` (new, pure).** It has no imports, no console, no clock and no randomness.
  `redactErrorLog(input) → RedactedErrorRecord`, and `REDACTED_LOG_FIELDS = [errorClass, code, status,
  route, requestId]`. Each field is shape-bounded, and a value outside its shape becomes a sentinel or is
  omitted, never passed through:
  - `errorClass`: the **prototype's** constructor name, or `typeof` for a primitive. The instance's `name`
    is never read, and no hook on the value runs. The source of this field is **Q-6**, ruled *keep as built* (see §7).
  - `code`: the envelope code, a literal at every call site (`/^[A-Z][A-Z0-9_]{0,63}$/`, else
    `INVALID_CODE`). The thrown value's own `.code` (for example a Postgres SQLSTATE) is a *Supabase error
    detail* and is not read. The pre-U15 path never read it either.
  - `status`: an integer from 100 to 599, else omitted. `requestId`: the correlation id the client receives.
  - `route`: accepted only as a **pattern**: a leading `/`, no query, fragment or `%`, and no numeric or
    UUID segment. **No call site supplies it today.** Neither `fail()` nor `handle()` is given a route, and
    threading one through the 24 routes is outside *May touch*. It is a stated gap, registered as **FU-79**
    on the owner's ruling, not a stub that claims to work.
- **`respond.ts`.** `logInternalError` shrinks to one line,
  `console.error(redactErrorLog({ thrown, code, status, requestId }))`, inside the same never-throw
  `try`. `describeValue`, `describeCause`, `safeRead` and `constructorName` are deleted, since nothing
  reads those fields any more. `reportInternalError` gains an **optional** `status`: `internalError`
  passes 500, `fail()` passes its own status, and the SSE callers pass none. No caller changes.
  `DeclaredFailure` loses its message, because the class name is now the marker.
  - Also dropped, because the allowlist is exact: the `[api] CODE ID` text prefix and `event:
    "api.internal_error"`. The record is the single argument.
- **`src/middleware.ts`: unchanged.** It has **no** console call today. The guard now makes any future one
  pass through the layer. Adding a catch there would be FU-43, which D-7 keeps open.
- **`five-xx-is-logged.test.ts`** gains `LOG_REDACTION` (RC-1: no new spec, `SPEC_COUNT` stays 30). A
  TypeScript-AST scan of `respond.ts` and `middleware.ts` fails **any** `console` reference that is not
  exactly `console.error(redactErrorLog(...))` with one argument. Aliases, `console['error']`, a second
  argument and other methods all fail. Four more parts:
  - A known-answer self-test on eight planted shapes.
  - An anti-vacuity check that `respond.ts` still logs.
  - A purity check on `redact.ts`.
  - The allowlist pinned as an **equality** against the imported binding.

## 3. Acceptance criteria and red evidence

Probes ran on a scratch worktree (RC-2, detached at `39fd568` with the four files copied in). Each was
restored by `cp` and verified with `cmp`, never with `git checkout`. The scratch copy matched the worktree
by `cmp` afterwards.

| AC | Test | Red proof |
|---|---|---|
| **AC-1** redact.ts pure and exported; every console call in the two files goes through it | `LOG_REDACTION`: *every console call…*, *redact.ts is pure*, the self-test | **M1**, a planted `console.error(err)` in `respond.ts`: 1 red. **M2**, a planted `console.error("[mw]", err)` catch in `middleware.ts`: 1 red. **M3**, a second argument beside the record: 5 red |
| **AC-2** a planted error with a supplement name, a dose and a lab value logs none of them, only allowlisted fields | `redact.test.ts` *AC-2* ×3, through `handle()`, `internalError()` and `reportInternalError()`, plus 6 unit cases | **R0**, the new test against `respond.ts` at `39fd568` (without the layer): the 3 AC-2 cases red, *log leaked "Ashwagandha"*. **M5**, the layer copies `message`: 5 red |
| **AC-3** 5xx still logged, allowlisted fields present | `LOG_REDACTION` *AC-3*: `{errorClass: "DeclaredFailure", code, status: 502, requestId}`. The existing `FIVE_XX_IS_LOGGED` cases stay green | **M6**, the log call removed: 6 red, including the original *writes exactly one record*. **M7**, status not passed: 1 red |
| Allowlist pin | *the allowlist is exactly the owner's five fields* | **M4**, `"message"` added: 2 red |

## 4. The stop (Q-5), its measurement, and the rewrite

`src/lib/api/respond.test.ts` is **not** in *May touch*, and it asserts the log contains what the
allowlist drops. Measured in the worktree: **19 red in that file, 148 other files green.**

| Group | Red tests | Field asked for |
|---|---|---|
| T2 | 2 | `message`, `"api.internal_error"`; name, stack and cause |
| T3 | 6 (5 `it.each` rows + *records the type*) | `"non-Error"`, `"object"` |
| R3b | 1 (*reportInternalError logs…*) | `message` |
| S1 | 2 | `"non-Error"`, `"array"` |
| S2 | 1 | `"non-Error"`, `"string"` |
| S4 | 1 | the outer `message` and `stack` |
| S5 | 2 | `message` and cause `message` |
| T5 | 3 | `message` (×2); `"api.internal_error"` + `message` (U34) |
| T7/S6 | 1 | `"unreadable"` |

In all 19, the **no-leak** half (nothing to the client, no sentinel in the log) still passed. The
runner may not stage this file (stop class), and rewriting these assertions changes a property rather
than a wording. Hence Q-5. **Q-6** (the source of the class name under minification) and **Q-7** (the
sink's roadmap line) were queued on the same pass.

**Owner ruling on Q-5 (2026-09-29): option (a).** *May touch* is widened to `respond.test.ts`, and each of
the 19 is rewritten **in place**. Each now asserts the redacted record, as an exact `toEqual`, **and** the
absence of the field it used to require. None is deleted. A shared `loggedRecords` helper also fails any
record key outside `REDACTED_LOG_FIELDS`, or any call with more than one argument. **Retitled, in place,**
because the old title would state the opposite of the assertion: 4 `it` (T2b, S4, S5a, T5 U34) and 2
`describe` (S4, S5). T3's `it.each` rows gain a third column, the expected class. Every input is unchanged.

**Not exercised:** the ruling *permits* carrying `"api.internal_error"`, `"non-Error"` and `"unreadable"` in
`code`. It is unnecessary, for three reasons:
- `errorClass` already says *non-Error* (`string`, `number`, `null`, `undefined`, `Object`).
- Every record from this path is an internal-error event.
- Nothing the record holds can be *unreadable*, because only the class is read.

Overloading `code` would also break its meaning (the envelope code) and its `/^[A-Z][A-Z0-9_]*$/`
shape check. T7's rewrite asserts `"unreadable"` is **absent**.

**Red proofs for the rewrite** (scratch worktree at `40adf2d`, restored by `cp` and verified with `cmp`):

| Probe | Result |
|---|---|
| **RT1**: `respond.ts` at `39fd568` (no layer) | **19 red**, exactly the rewritten tests |
| **RT2**: the layer copies `message` | 17 red |
| **RT3**: the class read from the instance `name` | 2 red (T2b, S4) |
| **RT4**: `status` not passed to the layer | 17 red |

## 5. Counts (`it(` / `it.each(` / `describe(` at line start, before → after)

| File | `it(` | `it.each(` | `describe(` |
|---|---|---|---|
| `src/architecture/five-xx-is-logged.test.ts` | 10 → 15 | 3 → 3 | 2 → 3 |
| `src/lib/api/redact.test.ts` (new) | 0 → 6 | 0 → 1 | 0 → 2 |
| `src/lib/api/respond.test.ts` (19 rewritten in place, 6 retitled) | 29 → 29 | 3 → 3 | 13 → 13 |

None is lower.

## 6. Landing record

- **Independent reviewer** (D-1 item 6: a fresh `ecc:security-reviewer`, working on a scratch worktree,
  given the brief, the rulings and the diff): **PASS WITH ADVISORIES**, with no blocking findings.
  - It re-ran the full suite: 1903 tests, all passed.
  - It ran eight mutations, all red, and hostile-value probes against `redactErrorLog`, none of which
    made it throw.
  - It confirmed every `code` at a call site is a string literal.
  - It confirmed the `respond.test.ts` rewrite deletes no test and removes no `.not` assertion.
- **Advisories, and what was done with each:**
  1. `routePatternOf` cannot tell a slug from a pattern (`/api/stacks/Magnesium` passes). It is latent,
     because nothing supplies `route` yet. Recorded on **FU-79**: routes must be static pattern strings,
     never a request path.
  2. Any identifier-shaped constructor name passes as `errorClass`. User input cannot set one; only code
     that defines a class can. Accepted under the Q-6 ruling.
  3. `process.stderr.write` in `respond.ts` passes the guard. Recorded as a limit in §7 and in the
     spec's header. The brief's scope is `console`.
  4. `middleware.ts` meets AC-1 only vacuously today (it has no console call). This was already stated.
  - **Corrected on review:** my stated limit said the guard does not see `globalThis.console`. It does.
    The text is corrected and a known-answer case now pins it.
- The gate, the commit and the CI run: see the runner report.

## 7. Limits, stated

- **No sink.** The guard proves what is written, not where it goes (N-11, FU-43, FU-44 open).
- **Two files, by name.** `src/lib/db/seed.ts` (`console.log` and `console.error`) and
  `src/lib/openai/client.ts` (`console.warn`) are outside the brief's scope and unguarded here.
- **Diagnosis cost.** An unexpected 500 is identified by its code and class only. There is no message
  and no throw site.
- **Minification (Q-6, ruled *keep as built*, 2026-09-29).** The class name is read off the prototype so
  that instance data cannot enter it. The production server build minifies app-defined classes: in the
  main checkout's `.next/server` output built 2026-09-24, `DeclaredFailure` ships as `class u`, and
  `ExtractionError`, `OpenAIError` and `StaleWriteError` do not appear by name. **So in production an
  app-thrown failure logs `errorClass` as a single letter**, and the envelope `code` is its only real
  diagnostic. Library classes (`PostgrestError`, `AuthError`) keep their names. Keeping class names
  would need a `next.config` change, outside this unit.
- **The guard governs `console` identifiers, in two files.** `globalThis.console` and local aliases are
  caught; a known-answer case pins the `globalThis` one, which the reviewer found. Not caught: a computed
  `globalThis["console"]`, an alias built in another module, and other sinks such as
  `process.stderr.write(err.message)`, which the reviewer's probe G3 showed passes the guard.
