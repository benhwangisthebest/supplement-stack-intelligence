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
| **Infrastructure** | Supabase client, repositories | `src/lib/db/`, `src/lib/supabase/` |

```
Presentation → Application → Domain ← Infrastructure
                    └────────→ Infrastructure
```

## Enforced rules

Each rule is checked by `src/architecture/boundaries.test.ts`. All rules apply equally to
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

> No file under `src/components/` or `src/lib/` may import from `src/app/`.

`src/app` is the Next.js routing layer; it depends inward, never the reverse. Reusable
server actions belong in `src/lib/` — a `"use server"` module may live anywhere, since the
directive (not the file path) registers the action. Only `page`/`layout`/`route` files are
path-bound.

If a component needs a server action, move the action to `src/lib/` and keep any shared
form-state type in a plain module (not the `"use server"` file, whose value exports must all
be async functions). See `src/lib/auth/{actions,types}.ts`.

## Known limitations

- **B1 catches direct edges only.** An indirect cycle (`a.ts → ./b → ./index`) is not
  detected. B1 + B2 keep `src/types` a closed set, which bounds the damage.
- **Deferred ("next hardening"):** `src/lib` → `src/components`; the §9.2 purity rule that
  `lib/{evidence,stack-evaluator,safety}` must not import `lib/db`/`lib/supabase`; and full
  cycle detection.

## Running the checks

```bash
npm test                                          # includes the boundary spec
npx vitest run src/architecture/boundaries.test.ts # boundary spec only
```

A failure lists **every** offending `file:line` in one run, with the raw specifier, its
resolved path, and a concrete fix — so a whole class can be fixed in a single pass.
