# Architecture Boundaries

> **Status**: Active — feature-independent design doc.
> **Promotes** §9.1 Layer Structure, §9.2 Dependency Rules, and §9.3 File Import Rules of
> `docs/archive/2026-06/mvp-core-loop/mvp-core-loop.design.md:525-552` to active status.
> The archived document is **not** edited; this file supersedes it for boundary questions.
> **Executable spec**: [`src/architecture/boundaries.test.ts`](../../src/architecture/boundaries.test.ts) — runs on `npm test`.

## Why this document exists

The layer rules were written during the MVP, then archived. Nothing enforced them, and 16
violations accumulated silently while an active analysis document continued to assert
"Architecture Compliance: ~98%" — a figure that had been asserted, never measured.

Documentation alone caused this. So the rules below are duplicated as an executable test:
**if the prose and the test ever disagree, the test wins.**

## Layer structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | Pages, components, hooks | `src/app/`, `src/components/` |
| **Application** | Orchestration, route handlers, services | `src/app/api/`, `src/services/` |
| **Domain** | Entities, types, pure rules | `src/types/`, `src/lib/{evidence,stack-evaluator,safety}` |
| **Reference data** | Inert curated seed data | `src/data/` |
| **Infrastructure** | Supabase client, repositories | `src/lib/db/`, `src/lib/supabase/` |
| **Guardrails** | The executable specs themselves | `src/architecture/` |

```
Presentation → Application → Domain ← Infrastructure
                    └────────→ Infrastructure
```

## Enforced rules

**The inventory is Git's tracked-file set, not the filesystem.** Discovery runs
`git ls-files --cached -- src`, so untracked scratch files and ignored generated output are structurally
incapable of reaching a rule or hiding one. This changed in `a338370` (remediation **R1**, closeout
finding **C-1**): the guard previously walked `src/` with `fs.readdirSync`, which made its verdict a
property of one developer's working directory rather than of the repository. A sync-client conflict copy
named `id-stability.test 2.ts` — not matching `.test.ts` — was linted as product data and failed a rule
against a file that was not in Git, not in the build, and not in CI.

**Scanned layers (5):** `src/types`, `src/components`, `src/lib`, `src/services`, `src/data`.
**Exempt (2):** `src/app` (composition root — a target of rules, never a source) and `src/architecture`
(the guardrails themselves, `*.test.ts` only). Every top-level `src/*` directory must appear in exactly
one of those lists, and each exemption must carry a written reason — so a new layer cannot appear
silently ungoverned. Each scanned layer also has a minimum non-test file count, so a rule cannot pass
vacuously because a directory was renamed away.

Each rule is checked by `src/architecture/boundaries.test.ts` (28 tests). All rules apply equally to
`import`, `import type`, `export … from`, dynamic `import()`, and `require()` — the checker
uses the TypeScript parser, so type-only and multi-line forms cannot slip through.

Specifiers are normalized before matching: `@/x` → `src/x`; `./x` and `../x` resolve against
the importing file; a trailing extension and a trailing `/index` are stripped. So `./index`,
`@/types`, `@/types/index`, and `../types` **all** canonicalize to `src/types`.

### B1 — `TYPES_NO_BARREL_CYCLE`

> No file under `src/types/` except `index.ts` may import the `src/types` barrel.

`src/types/index.ts` is a **barrel and nothing else** — it declares no types. Shared
primitives live in `src/types/primitives.ts`; everything else lives in the module that owns
it. A barrel that also declares creates `index → leaf → index`.

| ✅ Allowed | ❌ Denied |
|---|---|
| `effect.ts` → `"./primitives"` | `effect.ts` → `"./index"` |
| `effect.ts` → `"./evidence-grading"` | `effect.ts` → `"@/types"` |
| `index.ts` → `"./supplement"` | `protocol.ts` → `"../types"` |

Import the **owning sibling** directly. Never route a leaf→leaf dependency through the barrel.

### B2 — `TYPES_IS_A_LEAF`

> Every non-external import in `src/types/` must resolve inside `src/types/`.

Domain declares contracts; outer layers conform to them. When a type is derived from an
implementation (e.g. a Zod schema), invert it: hand-write the contract in `src/types/` and
assert conformance in the implementing module. See `src/lib/validation/schemas.ts`, where
`Equal<>`/`Expect<>` make drift a `TS2344` compile error.

### B2b — `TYPES_NO_EXTERNAL_DEPS`

> `src/types/**` imports no packages at all.

Enforced via an intentionally empty `TYPES_ALLOWED_EXTERNALS` allowlist in the test. Adding
an entry should be a reviewed decision, not a deleted rule.

### B3 — `NO_UPWARD_APP_IMPORT`

> No file under `src/components/`, `src/lib/`, `src/services/`, or `src/data/` may import from `src/app/`.

`src/app` is the Next.js routing layer; it depends inward, never the reverse. Reusable
server actions belong in `src/lib/` — a `"use server"` module may live anywhere, since the
directive (not the file path) registers the action. Only `page`/`layout`/`route` files are
path-bound.

If a component needs a server action, move the action to `src/lib/` and keep any shared
form-state type in a plain module (not the `"use server"` file, whose value exports must all
be async functions). See `src/lib/auth/{actions,types}.ts`.

### B4 — `DATA_IS_A_LEAF`

> Every non-external import in `src/data/` must resolve inside `src/types/`.

`src/data/` is curated reference data — inert by design. It states facts; it must not reach into engines,
services, or UI to compute them. Enforced since `0adf331` (U7).

### B4b — `DATA_NO_EXTERNAL_DEPS`

> `src/data/` imports no package.

Same reasoning as B2b for Domain: reference data that needs a library is no longer data.

### B5 — `NO_UI_IMPORT`

> No file under `src/lib/` or `src/services/` may import from `src/components/`.

Business and persistence code must not reach into the Presentation layer.

**Provenance note (closeout finding C-5).** This rule was implemented in U7 without appearing in that
unit's four-rule table, and this document previously listed it as *deferred* "next hardening" — prose
contradicting the test it specifies, the exact defect this document's "Why this document exists" section
was written to prevent. It passes today and has always passed (no `@/components` import exists under
`src/lib` or `src/services`), so it is a safe ratchet, and it is hereby recorded as **enforced and
ratified** rather than deferred.

## The error-disclosure guard

`src/architecture/error-disclosure.test.ts` (29 tests) is a second executable spec, enforcing
`CLAUDE.md` §2.3 rule 13 — *internal error text never crosses the API boundary* — across every tracked
`src/app/api/**/route.ts`.

> Within a route handler's `catch` clause or `.catch(handler)` callback, the caught binding's error text
> must not be read. Pass the whole value to the shared boundary instead.

**What it detects.** It seeds a tainted set with the caught binding, follows local aliases
(`const e = err`) and `cause` links at any depth, and flags reads of `message` or `stack` via property
access, element access (`err["message"]`), `String(err)`, template interpolation, and destructuring —
through `()`, `as`, `satisfies`, `!`, and `<Error>` wrappers.

**What it does not flag.** Whole-value passes — `internalError(err, …)`, `reportInternalError(err, …)`,
`validationError(err)`, `throw err`. Note this is *not* a callee allowlist: a pass to **any** callee is
unflagged. Non-text reads such as `e.code` are clean, as is `body.message` on a binding never caught.

**It over-detects in one direction, deliberately.** It flags any read of the text, not only reads that
reach the client, so an `err.message.includes(…)` predicate or a `console.error(err.message)` would fail
it. Neither exists in a route today; if one is genuinely needed, that is a conscious change to the guard.

**Stated gaps — follow-up F7.** Two forms are documented but not detected: the *body* of a destructured
handler (`catch ({ cause }) { send(cause.message) }`), and two-argument
`.then(onFulfilled, onRejected)` rejection handlers. No route uses either form today. Also undetected:
derivations through properties other than `cause`, taint escaping the handler into another module,
reflection, and any file outside `src/app/api/**/route.ts`. It is a regression guard for the forms this
defect actually took, not a taint-analysis engine.

Every claim in that guard's header block has been verified against its own implementation by running the
detector on a fixture per claim — 33 claims, all matching.

## Known limitations

- **B1 catches direct edges only.** An indirect cycle (`a.ts → ./b → ./index`) is not
  detected. B1 + B2 keep `src/types` a closed set, which bounds the damage.
- **Deferred ("next hardening"):** `DOMAIN_IS_PURE` — pure engine directories under `src/lib` must not
  import `@/lib/db`, `@/lib/supabase`, `@/services`, `@/app`, or `next/*` (`CLAUDE.md` §4.5). Scope
  matters here: under the *narrow* reading of `lib/{evidence,stack-evaluator,safety}` the rule already
  passes — none of those three imports persistence. Under §4.5's broader "pure engine directories"
  wording it **would fail today** at `src/lib/identity/context.ts`,
  `src/lib/advisor/context-loader.ts`, and `src/lib/advisor/actions/execute.ts`, which are the only
  `src/lib` engine files importing `@/lib/db`. Settling that scope is a precondition for enforcing it.
- **Deferred:** the client-component rule (would fail on 7 of the 31 `"use client"` modules under
  `src/components` — those importing `@/lib/*` or `@/data`); the `NO_PERSISTENCE_FROM_UI` ratchet (free
  today); and full cycle detection.
- **Tree-partition ignores loose files and symlinks** (closeout finding C-11). A loose
  `src/middleware.ts` — a standard Next.js location — would be neither scanned nor exempt. None exists
  today; latent.
- **`walk()` and vitest disagree on `.tsx`** (closeout finding C-12). The boundary scan considers
  `*.test.tsx` a test file, but `vitest.config.ts` collects only `*.test.ts`, so a `.test.tsx` file would
  be neither scanned nor executed. Zero exist today; latent, and tracked as roadmap exit criterion
  U-DEFER-4.

## Running the checks

```bash
npm test                                              # includes both executable specs
npx vitest run src/architecture/boundaries.test.ts     # layer boundaries only (28)
npx vitest run src/architecture/error-disclosure.test.ts # error disclosure only (29)
```

A failure lists **every** offending `file:line` in one run, with the raw specifier, its
resolved path, and a concrete fix — so a whole class can be fixed in a single pass.
