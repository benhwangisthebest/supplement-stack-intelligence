# architecture-boundary-repair Planning Document

> **Summary**: Repair three verified architecture-boundary defects (types barrel cycle, app-layer auth leak, Domain→validation dependency) and add a zero-dependency regression guardrail, without changing any runtime behavior.
>
> **Project**: supplement-stack-intelligence
> **Version**: 0.1.0
> **Author**: Claude (ECC planner / architect / typescript-reviewer, read-only analysis)
> **Date**: 2026-07-30
> **Status**: Draft — awaiting Plan checkpoint approval

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | The project's own documented dependency rule ("Domain imports Domain only") lives **only in `docs/archive/`** and is enforced by nothing. 16 live violations have accumulated: a 13-file `src/types` barrel cycle, 2 upward `@/app` imports from `src/components`, and 1 Domain→`src/lib/validation` edge. |
| **Solution** | Four isolated, behavior-preserving modules: extract type primitives to a leaf; relocate auth server actions to the existing `src/lib/auth/`; invert the Domain→Zod dependency with a compile-time conformance assertion; then lock all three with a Vitest boundary test built on the already-installed TypeScript compiler API. |
| **Function/UX Effect** | **None.** Zero user-visible change. No endpoint, schema, migration, dependency, or UI change. Every edit is an import-path move, a type declaration, or a test/doc addition. |
| **Core Value** | Converts an archived, unenforced architecture principle into an executable, self-checking rule — so the boundary cannot silently rot again. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Architecture rules exist but are archived and unenforced; drift has already produced 16 violations. |
| **WHO** | Maintainers and coding agents working in this repo — the guardrail primarily stops the *agent* from regenerating violations. |
| **RISK** | A blind find/replace across the 13 barrel importers silently breaks `effect.ts` and `protocol.ts`, which pull non-primitive symbols through the barrel. |
| **SUCCESS** | `tsc --noEmit` exit 0; Vitest ≥ 392 tests passing; boundary test green; violation greps return 0/0/0. |
| **SCOPE** | 4 sequential modules: M1 barrel → M2 auth → M3 Domain contracts → M4 guardrail (must be last). |

---

## 1. Overview

### 1.1 Purpose

Repair the immediate architecture-boundary problems and make them non-recurring, with the minimum possible diff and provably zero behavior change.

### 1.2 Background

`docs/archive/2026-06/mvp-core-loop/mvp-core-loop.design.md:525-552` defines §9.1 Layer Structure, §9.2 Dependency Rules, and §9.3 File Import Rules. §9.3 states verbatim that the **Domain** layer may import **"Domain only (pure)"** and must not import services.

That document is archived. There is **no** `docs/02-design/features/mvp-core-loop.design.md`. The active `docs/03-analysis/mvp-core-loop.analysis.md:65` and `:198` explicitly cite "Design §9 Clean Architecture" and assert "Architecture Compliance: ~98%" (line 207) against it. This active→archive reference is what qualifies the archived doc for use here, per the task's archive exception.

**Root cause:** the source of truth for architecture boundaries is archived and unenforced. Restoring enforcement is Module 4's job; Modules 1–3 clear the existing debt so enforcement can be switched on green.

### 1.3 Related Documents

- Archived source of truth: `docs/archive/2026-06/mvp-core-loop/mvp-core-loop.design.md` §9.1–§9.3
- Active reference to it: `docs/03-analysis/mvp-core-loop.analysis.md:65,198,207`
- Agent guidance: `.claude/CLAUDE.md` ("Suggested Project Structure", "Important Development Rules")
- `README.md:18-22` ("Architecture principles")

---

## 2. Scope

### 2.1 In Scope

- [ ] M1 — Remove the `src/types` barrel cycle
- [ ] M2 — Move reusable authentication actions out of `src/app`
- [ ] M3 — Remove the `src/types` → `src/lib/validation` dependency
- [ ] M4 — Add narrow regression guardrails + update active architecture guidance

### 2.2 Out of Scope

- Wholesale clean-architecture rewrite; broad `src/lib` reorganization
- Splitting `src/lib/advisor/tools.ts` or `src/lib/stack-evaluator/rules.ts`
- API route orchestration refactor; DB migrations; package upgrades; UI redesign
- Any change to health, safety, scoring, evidence, or recommendation logic
- Introducing ESLint (see §7.2 for the decision record)
- Fixing the `intent` type hole in `schemas.ts` (see Open Decision OD-1)
- Full cycle detection, `lib`→`components` rules, Domain-purity rules (deferred to "next hardening")

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | No file under `src/types/` (except `index.ts`) imports the `src/types` barrel | High | Pending |
| FR-02 | No file under `src/components/` or `src/lib/` imports from `src/app/` | High | Pending |
| FR-03 | No file under `src/types/` imports anything outside `src/types/` | High | Pending |
| FR-04 | FR-01..03 are enforced automatically by `npm test` | High | Pending |
| FR-05 | Active documentation states the boundary rules and points at the executable spec | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Behavior preservation | Zero runtime change | `tsc --noEmit` exit 0; Vitest ≥ 392 tests pass; no emitted-JS semantic change |
| Dependency budget | Zero new runtime or dev dependencies | `git diff package.json` shows no `dependencies`/`devDependencies` change |
| Guardrail cost | Boundary test adds < ~1s | Compare `npm test` duration vs 1.54s baseline |
| Coverage integrity | `src/lib/stack-evaluator/**` thresholds unmoved | `npm run test:coverage` vs baseline |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] All four modules implemented and individually revertible
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npm test` → ≥ 392 tests passing (baseline count + new boundary tests)
- [ ] Boundary test fails loudly when a violation is reintroduced (proven by fixture tests, not assumed)
- [ ] Active docs updated; no duplicate documentation root created

### 4.2 Quality Criteria

- [ ] Violation counts: `src/types`→barrel = 0, `components|lib`→`@/app` = 0, `src/types`→`@/lib` = 0
- [ ] Zero new dependencies
- [ ] Coverage thresholds still pass

### 4.3 Verified Baseline (captured 2026-07-30, pre-change)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | 38 files, **392 tests passing**, 1.54s |
| Working tree | dirty on `feat/food-pairings-v12` (13 modified, 14 untracked) — **must not be reset or reformatted** |
| `npm run lint` | non-enforcing (`next lint`, no config, `eslint` not installed) |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Blind `sed 's/.\/index/.\/primitives/'` across 13 files breaks `effect.ts` + `protocol.ts` + `advisor.ts` | High | **High** | Hand-edit those 3 files (§M1). Verified: they are the *only* 3 with non-primitive symbols. |
| M4 lands before M1–M3 → `npm test` red on merge | High | Medium | Hard sequencing constraint: M4 **must** be last (§10). |
| Guardrail silently passes vacuously (bad cwd, degraded parser) | High | Medium | Sanity floors (`files.length > 50`, `typesFiles.length ≥ 15`) + a parser self-test over all 8 pitfall forms. |
| Hand-written `StackInput.intent` narrows callers | High | Medium | Must be `string`, not `StackIntent` — see OD-1. `Equal<>` assertion makes any mismatch a compile error. |
| Working tree is dirty; changes get entangled with in-flight `feat/food-pairings-v12` work | Medium | Medium | Commit per module; never `git checkout`/`reset`/`stash` unrelated files. |
| Server-action ID hash changes on file move (M2) | Low | Low | Only affects a form submitted mid-deploy against an old bundle. Not applicable locally. |
| `graphify-out/` is stale (built Jul 16, at repo root not `v1.0/`) | Low | High | Already handled — all findings verified directly against source; graph used only as supplementary orientation. Run `graphify update .` after M1–M3. |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `src/types/index.ts` | Type barrel | Declarations moved out; becomes a pure re-export barrel |
| `src/app/auth/actions.ts` | Server actions | Moved to `src/lib/auth/actions.ts`; type extracted |
| `StackInput` / `StackItemInput` | Type contracts | Ownership inverted: Domain declares, Zod conforms |
| `vitest` suite | Test config | +1 test file (no config change needed) |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `@/types` barrel | READ (type) | 72 files / 74 import lines | **None** — `export * from "./primitives"` republishes every name |
| `EVIDENCE_GRADES` (value) | READ | `lib/interactions/schema.ts:9`, `lib/biomarkers/schema.ts:3`, `lib/validation/seed.ts:4` | **None** — `export *` re-exports values identically |
| `OUTCOME_CATEGORIES` (value) | READ | `components/profile/ProfileForm.tsx:5`, `components/stack/NewStackForm.tsx:5`, `lib/identity/traits.ts:6`, `lib/validation/seed.ts:5`, `lib/validation/schemas.ts:5` | **None** |
| `SUPPLEMENT_FORMS` (value) | READ | `components/profile/ProfileForm.tsx:6`, `lib/validation/schemas.ts:6`, `lib/validation/seed.ts:6` | **None** |
| `auth/actions` | READ (alias) | `components/auth/AuthForm.tsx:5`, `components/layout/TopNav.tsx:3` | **Breaking** — import path must update |
| `auth/actions` | READ (**relative**) | `app/auth/login/page.tsx:2`, `app/auth/signup/page.tsx:2` (`from "../actions"`) | **Breaking** — invisible to an alias-only grep; must not be missed |
| `StackInput`/`StackItemInput` | READ | `types/advisor-action.ts:6`, `lib/advisor/actions/proposals.ts:30,236`, `lib/advisor/actions/apply.ts:17+`, `lib/db/stack-repo.ts:4,39,60`, `lib/db/stack-item-repo.ts:5,24,48` | **None** for the 4 `lib` consumers (schemas.ts keeps exporting `z.infer` unchanged); 1 line changes in `advisor-action.ts` |
| `TopNav` | RENDER | `app/layout.tsx:30` (sole call site) | **None** — component signature unchanged |

> Note: `src/lib/stack-evaluator/index.ts` appeared in a naive grep for `StackInput` but is a **false positive** — the match is the substring in `EvaluateStackInput`. It does not consume either contract.

### 6.3 Verification

- [ ] All consumers above verified against the proposed changes
- [ ] No auth/permission behavior changes
- [ ] No field additions/removals affecting queries or mutations

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| Starter | ☐ |
| **Dynamic** (feature modules, BaaS/Supabase, layered `src/`) | **☑** |
| Enterprise | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Barrel repair | Extract primitives / delete barrel / keep + explicit re-exports | **Extract `primitives.ts`; barrel declares nothing** | 72 consumers untouched. A barrel that *declares* is the defect; leaving one declaration re-primes the trap. |
| Auth actions home | `src/lib/auth/` / prop-drill / leave in `src/app` | **`src/lib/auth/`** | `src/lib/auth/session.ts` already exists and `TopNav.tsx:2` already imports from it — no new layer edge, no new abstraction. |
| Domain contract owner | `src/types/stack.ts` / new `advisor-input.ts` / leave | **`src/types/stack.ts`** | Already owns `Stack`, `StackItem`, `ItemTiming`, `ItemFrequency`. Reusing those avoids duplicating literal unions. |
| Conformance check | `satisfies` / mutual-extends / invariant `Equal<>` | **Invariant `Equal<>` + `Expect<>`** | Verified: mutual-extends lets required↔optional drift pass; `Equal<>` catches it and errors at `TS2344` with no value binding needed. |
| Guardrail mechanism | ESLint+plugins / regex scan / **Vitest + `ts` compiler API** | **Vitest + TypeScript compiler API** | See below. |
| Guardrail parser | regex / `ts.preProcessFile` / `ts.createSourceFile` | **`ts.createSourceFile` + `forEachChild`** | Fully public, stable API; exact node kinds and positions. |

**Why not ESLint (the "prefer existing tooling" test):** there is **no ESLint config anywhere** in this repo and `eslint` is **not a devDependency** — `npm run lint` is bare `next lint`, which enforces nothing and, with no config, drops into an interactive setup prompt that hangs in CI. Adopting it means `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-import`/`boundaries` + a flat config + triaging base-rule violations across ~200 files. That fails the "do not add a dependency unless no existing mechanism can enforce reliably" constraint. Meanwhile **`typescript@^5.7.2` is already installed**, so the compiler's own parser is available at zero cost with identical fidelity to what ESLint's parser would give. `next lint` is also deprecated going into Next 16, so the investment would need migrating almost immediately.

**Why not regex:** it is not merely inelegant here, it is *wrong on this specific repo*. All 13 barrel violations are `import type`, and `index.ts:60-68` is entirely `export * from`. A `/^import\s+\{/` regex catches **zero** of them. `effect.ts` puts its `from "./index"` on line 7 with the brace list opening earlier, defeating line-anchored patterns. And `src/lib/advisor/**` contains LLM prompt templates that can embed code samples — a live false-positive source.

### 7.3 Target Dependency Direction

```
Presentation (app/, components/)  ─┐
Application  (app/api/, services/) ├─→  Domain (types/, lib/{evidence,stack-evaluator,safety})
Infrastructure (lib/db/, lib/supabase/) ─┘

src/types/:  index.ts (barrel, ZERO declarations)
                 └─ export * ─→ primitives.ts + 9 leaves
             leaf ─→ primitives.ts   (never ─→ index.ts)
             leaf ─→ leaf            (direct, never laundered through the barrel)
             src/types ─→ nothing outside src/types
```

---

## 8. Implementation Modules

> Four isolated modules. Each is independently revertible. **No coding occurs during the Plan phase.**

---

### Module 1 — Remove the `src/types` barrel cycle

**Exact files expected to change (15 total: 1 new, 14 modified)**

| File | Change |
|------|--------|
| `src/types/primitives.ts` | **NEW** — receives verbatim: `EvidenceGrade`, `EVIDENCE_GRADES`, `Confidence`, `OutcomeCategory`, `OUTCOME_CATEGORIES`, `SupplementForm`, `SUPPLEMENT_FORMS`, `DoseRange` |
| `src/types/index.ts` | Delete lines 4-58 (all declarations); prepend `export * from "./primitives";` above the existing 9 `export *` lines |
| `src/types/supplement.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/evidence-grading.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/evaluation.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/profile.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/product.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/stack.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/biomarker.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/interaction.ts:1` | `"./index"` → `"./primitives"` |
| `src/types/checkin.ts:5` | `"./index"` → `"./primitives"` |
| `src/types/identity.ts:5` | `"./index"` → `"./primitives"` |
| **`src/types/effect.ts:1-7`** | **SPLIT** — `Confidence, DoseRange, EvidenceGrade, OutcomeCategory` from `"./primitives"`; **`EvidenceProfile` from `"./evidence-grading"`** |
| **`src/types/protocol.ts:1`** | **SPLIT** — `DoseRange, EvidenceGrade, OutcomeCategory` from `"./primitives"`; **`ItemTiming` from `"./stack"`** |
| **`src/types/advisor.ts:4`** | **SPLIT** — `Stack, StackItem` from `"./stack"`; `UserProfile, LabMarker` from `"./profile"` |

**Current dependency problem.** `index.ts` is simultaneously a declaring module (8 symbols, 3 of them **runtime consts**) and a re-export barrel for 9 leaves. Leaves need the primitives; the only published path is the barrel; so `index → leaf → index`. 13 leaves import back; the **8** both re-exported *and* importing back form true cycles: `effect`, `supplement`, `evidence-grading`, `product`, `stack`, `protocol`, `profile`, `evaluation`. Three files additionally launder **leaf→leaf** edges through the barrel (`effect`→`EvidenceProfile`, `protocol`→`ItemTiming`, `advisor`→`Stack`/`StackItem`/`UserProfile`/`LabMarker`).

**Honest severity note.** All 13 back-imports are `import type` and erase completely under `isolatedModules` — so this is **not a live runtime cycle today**. It is a module-graph/tooling defect and a *latent* hazard: the moment any leaf needs a **value** from the barrel (`EVIDENCE_GRADES`, `OUTCOME_CATEGORIES`, `SUPPLEMENT_FORMS` are runtime consts), it becomes a genuine ESM initialization cycle. Fix it for that reason, not for a bug you currently have.

**Proposed dependency direction.** `index.ts (zero declarations) → { primitives.ts, 9 leaves }`; `leaf → primitives.ts`; `leaf → leaf` directly. Strictly acyclic.

**Behavior that must remain unchanged.**
- All 72 files / 74 import lines using `from "@/types"` keep resolving — `export * from "./primitives"` republishes every name, values included.
- The 8 **value** call sites for the three const arrays are unaffected; `export *` re-exports values with the same real binding, so emitted JS is semantically identical.
- `evidence-grading.ts:49`'s `export type { EvidenceGrade }` stays as-is (only its import source flips). **Verified by isolated repro:** this produces **no `TS2308` ambiguity**, before or after, because both `export *` paths resolve to the *same* originating binding, not two competing declarations.
- No `export *` ordering sensitivity: no two barrel-exported leaves independently declare the same name.

**Tests / checks to run.**
```bash
npx tsc --noEmit
npx vitest run
grep -rn 'from "./index"' src/types/ | wc -l   # expect 0
```

**Rollback strategy.** Single self-contained commit. `git revert <sha>`, or `git checkout <sha>~1 -- src/types/`. No other directory is touched, so rollback cannot disturb the in-flight `feat/food-pairings-v12` changes.

**Risks and edge cases.**
- **Primary risk:** a uniform find/replace across all 13 files silently breaks `effect.ts`, `protocol.ts`, `advisor.ts`. These three need hand edits. Verified these are the *only* three (each import list diffed against the primitive set).
- `isolatedModules` + `export *` from a type-and-value module: already the existing pattern; no emit change.
- Nothing imports `@/types/index` explicitly (verified), so no path breaks.

**Acceptance criteria.**
- [ ] `grep -rn 'from "./index"' src/types/` returns nothing
- [ ] `src/types/index.ts` contains **only** `export * from` lines — zero declarations
- [ ] `effect.ts`, `protocol.ts`, `advisor.ts` each import from ≥ 2 sources
- [ ] `tsc --noEmit` exit 0; Vitest ≥ 392 passing

---

### Module 2 — Move reusable authentication actions out of `src/app`

**Exact files expected to change (6 total: 1 new, 1 moved, 4 modified)**

| File | Change |
|------|--------|
| `src/lib/auth/types.ts` | **NEW** — `export interface AuthActionState { error: string \| null }` (no directive, pure) |
| `src/app/auth/actions.ts` → `src/lib/auth/actions.ts` | **MOVE** — keep `"use server"`; import `AuthActionState` from `./types`; **stop exporting the interface** |
| `src/components/layout/TopNav.tsx:3` | `@/app/auth/actions` → `@/lib/auth/actions` |
| `src/components/auth/AuthForm.tsx:5` | `@/app/auth/actions` → `@/lib/auth/types` |
| `src/app/auth/login/page.tsx:2` | `"../actions"` → `@/lib/auth/actions` |
| `src/app/auth/signup/page.tsx:2` | `"../actions"` → `@/lib/auth/actions` |

**Current dependency problem.** Two upward edges from Presentation into the App layer — the only two `@/app` imports anywhere outside `src/app`:
- `TopNav.tsx:3` — a **value** import of `signOut`; a real runtime edge.
- `AuthForm.tsx:5` — **type-only**, erased at build; purely architectural. Note `AuthForm` already receives `action` as a **prop** (`login/page.tsx:16` passes `login`), so it only ever needed the *shape*, never the module.

**The two page files import via a relative path (`"../actions"`), so they are invisible to an alias-only grep.** Missing them breaks the build — this is the single most likely execution mistake in this module.

**Proposed dependency direction.** `app → lib` and `components → lib`. No `@/app` specifier anywhere outside `src/app`.

**Behavior that must remain unchanged.**
- `login`, `signup`, `signOut` keep identical signatures, `revalidatePath("/", "layout")` calls, and `redirect` targets (`/stack-lab`, `/profile`, `/`).
- `TopNav` is a **Server Component** (`async function`, no `"use client"`) rendering `<form action={signOut}>` at line 37 — the canonical RSC pattern. `signOut` is never passed as a prop into a client component, so no client/server boundary constraint applies. Signature and single call site (`app/layout.tsx:30`) unchanged.
- `AuthForm`'s `useActionState` typing continues to resolve: `redirect()` returns `never`, so `login`/`signup` still infer `Promise<AuthActionState>`. Structural identity is automatic **provided the type is moved, not duplicated**.
- `middleware.ts` does not reference auth actions — unaffected.

**Note on the current code.** `export interface AuthActionState` inside a `"use server"` file is *legal today* — Next's "only async function exports" rule is enforced against compiled JS, and interfaces erase before that check. So this is hygiene, not a live bug. A `"use server"` module may live under `src/lib` in Next 15: the directive registers actions, and only `page`/`layout`/`route` files are path-bound.

**Tests / checks to run.**
```bash
npx tsc --noEmit
npx vitest run
grep -rn '@/app/' src/components/ src/lib/        # expect 0
grep -rn 'from "../actions"' src/app/auth/        # expect 0
npm run build                                      # exercises the server-action registration
```
Optional runtime confirmation (needs app + Supabase): `npx playwright test tests/e2e/mvp-core-loop.spec.ts`.

**Rollback strategy.** Single commit; `git revert <sha>`. Because it is a file move, verify `src/app/auth/actions.ts` is restored and the 4 import sites revert together — a partial revert leaves a broken build, so revert the whole commit, never a subset.

**Risks and edge cases.**
- **Missing the two relative-path page imports** → build break. Explicitly enumerated above.
- Do **not** let the `"use client"` `AuthForm` import from the `"use server"` module even type-only after the move — that is why `types.ts` exists.
- Server-action ID hashes change on file move; only observable mid-deploy against a stale client bundle. Not applicable locally.
- No test or e2e spec references `auth/actions` (verified).

**Acceptance criteria.**
- [ ] `grep -rn '@/app/' src/components/ src/lib/` returns nothing
- [ ] `src/lib/auth/actions.ts` exports **only** async functions
- [ ] `src/app/auth/actions.ts` no longer exists
- [ ] `npm run build` succeeds; login / signup / sign-out flows unchanged

---

### Module 3 — Remove the `src/types` → `src/lib/validation` dependency

**Exact files expected to change (3 modified, 0 new)**

| File | Change |
|------|--------|
| `src/types/stack.ts` | **ADD** hand-written `StackInput` and `StackItemInput` interfaces (reusing the file's existing `ItemTiming`, `ItemFrequency`, `StackMode`) |
| `src/types/advisor-action.ts:6` | `@/lib/validation/schemas` → `"./stack"` — **the single line that fixes the violation** |
| `src/lib/validation/schemas.ts` | **ADD** aliased type import + `Equal`/`Expect` conformance assertions. **Keep both `export type X = z.infer<...>` lines exactly as-is.** |

**Current dependency problem.** `src/types/advisor-action.ts` — whose own header (lines 1-3) asserts "Domain layer … PURE types, no I/O" — imports two `z.infer` aliases from `@/lib/validation/schemas`, which itself imports **runtime values** from `@/types` (`schemas.ts:4-7`). This is latent-cycle-shaped: `advisor-action.ts` is currently *not* in the barrel, but adding `export * from "./advisor-action"` to `index.ts` would immediately produce `types/index → advisor-action → lib/validation/schemas → types/index` with a **value** import on the final hop.

**Proposed dependency direction.** `lib/validation/schemas.ts → src/types`. Domain declares the contract; Zod becomes an implementation that must *conform* to it, checked at compile time.

**The exact shapes to hand-write** (verified field-by-field against the real Zod install; these are **output** types — `z.infer`, i.e. defaults resolved — which is what all 6 consumers rely on):

```
StackItemInput = {
  supplementId: string | null;  customName: string | null;
  dose: number;                 unit: string;
  timing: ItemTiming | null;    frequency: ItemFrequency | null;
  reason: string | null;        notes: string | null;
}
StackInput = { name: string; intent: string; mode: StackMode; description: string | null }
```

**Why every `.default()` field is required-but-nullable, not optional.** `.nullable().default(null)` gives input type `T | null | undefined` (optional key) but **output** type `T | null` (key always present). Verified that all consumers use the output shape: `stack-item-repo.ts:20-42` reads `input.supplementId` etc. with no optional-chaining or fallback, and `apply.ts:28-67` returns complete object literals with every key populated. Neither is sound against the input type. **No output/input split needs reconciling.**

**`timing`/`frequency` reuse is safe:** `schemas.ts:115-122` declares the enums inline with literal arrays and **no** widening cast, so they correctly narrow to exactly the unions already declared at `stack.ts:6-12` (`ItemTiming`) and `stack.ts:14` (`ItemFrequency`). `Equal<>` will confirm this rather than assume it.

**⚠ `intent` must be `string`, not `StackIntent`.** `schemas.ts:11-13` casts `z.enum(OUTCOME_CATEGORIES as [string, ...string[]])`, which collapses the generic to plain `string`. So `StackInput["intent"]` is **`string`** today — which is why `apply.ts:103` contains `pl.intent as StackInput["intent"]`, a cast that currently does nothing. Writing the domain-correct `OutcomeCategory | "experimental"` would **fail to compile** against the assertion and would narrow callers. See **OD-1**.

**Conformance mechanism** (placed in `schemas.ts`, which already legitimately depends on both Zod and `@/types`):

```ts
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
```

Verified: naive mutual-extends lets required↔optional drift pass; `Equal<>` returns `false` for exactly that drift, and `Expect<false>` errors at **`TS2344`** with **no value binding required** — TS checks the generic constraint eagerly at instantiation. Zero runtime cost.

**Behavior that must remain unchanged.**
- `schemas.ts` keeps exporting `StackInput`/`StackItemInput` as `z.infer`, so **all four `src/lib` consumers change zero lines** (`proposals.ts`, `apply.ts`, `stack-repo.ts`, `stack-item-repo.ts`).
- All runtime Zod parsing, `.refine()` validation, defaults, and error messages are untouched.
- `apply.ts:103`'s no-op cast keeps compiling.

**Tests / checks to run.**
```bash
npx tsc --noEmit                        # the assertion IS the test
npx vitest run
grep -rn '@/lib/' src/types/            # expect 0
```
Negative check (prove the assertion is reachable, not dead): temporarily add a field to `StackItemInput`, confirm `tsc` fails with `TS2344`, then revert. **Do this — an unexercised assertion is indistinguishable from no assertion.**

**Rollback strategy.** Single commit; `git revert <sha>`. Lowest-risk module to revert: `schemas.ts`'s public exports are unchanged, so reverting cannot ripple into the four `lib` consumers.

**Risks and edge cases.**
- **OD-1 (`intent`) must be decided before implementation** — otherwise the assertion fails on day one.
- `stackItemInputSchema` is a `ZodEffects` (`.refine` at line 126). The "either `supplementId` or `customName`" invariant is **runtime-only and unrepresentable** in the hand-written type. This is not a regression (it was equally unrepresentable in `z.infer`), but it means `Equal<>` cannot detect a change to that refinement. Document it in a comment.
- Anyone later switching a call site to `z.input<>` silently breaks the correspondence.
- Alias the imported domain types in `schemas.ts` (e.g. `DomainStackInput`) to avoid a name collision with the local `z.infer` exports.

**Acceptance criteria.**
- [ ] `grep -rn '@/lib/' src/types/` returns nothing
- [ ] `src/types/advisor-action.ts` imports only from `./advisor`, `./evaluation`, `./stack`
- [ ] `schemas.ts` still exports `StackInput`/`StackItemInput` as `z.infer`; the 4 `lib` consumers have zero diff
- [ ] Drift is proven to fail compilation (negative check performed and reverted)

---

### Module 4 — Narrow regression guardrails + architecture guidance

> **Must land last.** M4 fails on the violations M1–M3 remove.

**Exact files expected to change (2 new, 3–4 modified)**

| File | Change |
|------|--------|
| `src/architecture/boundaries.test.ts` | **NEW** — the executable spec |
| `docs/02-design/architecture-boundaries.md` | **NEW** — promotes archived §9.1–§9.3 to active status |
| `README.md:18-22` | Add the three rules + pointer to the test under "Architecture principles" |
| `.claude/CLAUDE.md` | Add imperative deny-rules under "Suggested Project Structure" and "Important Development Rules" |
| `docs/03-analysis/mvp-core-loop.analysis.md:198,207` | *(optional)* repoint "Design §9" to the new active doc; correct the unmeasured "~98%" claim |
| `package.json` | *(optional)* `"test:boundaries": "vitest run src/architecture/boundaries.test.ts"` |

**Why `src/architecture/boundaries.test.ts` specifically.** It matches the existing `include: ["src/**/*.test.ts"]` (no vitest config change), and sits **outside** coverage `include: ["src/lib/**/*.ts"]` so it can neither dilute the denominator nor inflate `src/lib/stack-evaluator/**` and mask a real regression. Precedent exists for non-`lib` tests: `src/data/seed-integrity.test.ts`, `src/services/evaluation.test.ts`.
- **Do not** use `src/lib/architecture/` — the test file itself would be excluded, but the *directory* enters the coverage glob, so any future non-test helper beside it silently joins the denominator.
- **Do not** use `src/types/boundaries.test.ts` — it would live inside the layer it polices and import `vitest`, self-violating rule B2 and forcing an exemption.

**The three rules.** Normalize every edge first: `@/x` → `src/x`; `./x`/`../x` → POSIX-normalized against the importer's dir; anything else → `EXTERNAL`. Then strip `.ts`/`.tsx`/`.js`/`.jsx` and collapse trailing `/index` to the bare directory — so `./index`, `@/types`, `@/types/index`, and `../types` **all** canonicalize to `src/types`. Layer matching must be segment-aware (`p === layer || p.startsWith(layer + "/")`), never raw `startsWith`, so `src/apparel` isn't matched by `src/app`.

| ID | Rule |
|----|------|
| **B1** `TYPES_NO_BARREL_CYCLE` | No file under `src/types/` except `index.ts` may have an edge canonicalizing to `src/types` |
| **B2** `TYPES_IS_A_LEAF` | Every non-external edge from `src/types/` must canonicalize under `src/types/` |
| **B2b** `TYPES_NO_EXTERNAL_DEPS` | `src/types/**` imports zero bare packages (empty allowlist constant — green today; relaxing is a visible, deliberate edit) |
| **B3** `NO_UPWARD_APP_IMPORT` | No file under `src/components/` or `src/lib/` may resolve into `src/app` |

All rules apply identically to `import`, `import type`, and `export … from`. B2 must still allow the four real intra-types edges: `advisor.ts:5→"./lab"`, `identity.ts:6→"./advisor"`, `advisor-action.ts:4→"./advisor"`, `advisor-action.ts:5→"./evaluation"`.

**Parsing.** Use the installed `typescript`: `ts.createSourceFile(..., setParentNodes=true, ScriptKind.TSX|TS)`, then `ts.forEachChild` collecting `ImportDeclaration`, `ExportDeclaration` (with `moduleSpecifier`), dynamic `import()` calls, and `require()`. This handles type-only imports, multi-line imports, `export * from`, side-effect imports, and dynamic imports — and comments/strings vanish for free because a real parser never treats them as syntax. Prefer `createSourceFile` over `ts.preProcessFile` (public and stable vs. lightly-documented). Syntax-only, no `Program`, no type-checker: well under a second.

**Structure the test to prove the rules are reachable.** Export a pure `classify(fromFileRel, specifier): Violation | null`, then:
1. **Parser self-test** against an inline fixture containing all 8 pitfall forms, asserting the exact extracted specifier list.
2. **Fixture tests** asserting each of B1/B2/B3 **fires** on a synthetic bad edge *and* **stays silent** on the four real legal edges.
3. Only then run `classify` over the real tree.

This directly answers a bug class already recorded for this project — rules that are unreachable from production and therefore silently never fire.

**Vacuous-pass guards** (the most dangerous failure mode): resolve the repo root from `import.meta.url`, not `process.cwd()`; assert `allFiles.length > 50` and `typesFiles.length >= 15` (18 exist). Also assert `Object.keys(tsconfig.compilerOptions.paths)` deep-equals `["@/*"]`, so adding a new alias *forces* a guardrail update instead of silently un-governing an import style.

**Error message shape.** Collect **all** violations (never fail-fast); one `it()` per rule asserting `expect(violations).toEqual([])`, each entry preformatted with rule id, `file:line`, the raw specifier **and** its resolved form (so normalization bugs are self-evident), a concrete fix, and the doc pointer.

**Behavior that must remain unchanged.** No production source is touched. Test-only + docs. Coverage thresholds unmoved.

**Tests / checks to run.**
```bash
npx vitest run src/architecture/boundaries.test.ts
npx vitest list | grep boundaries      # guards against a placement typo → silent no-op
npm test
npm run test:coverage                  # compare stack-evaluator numbers to baseline
```

**Rollback strategy.** Purely additive — delete `src/architecture/` and revert the doc edits. Cannot affect runtime under any circumstance.

**Risks and edge cases.**
- Prefix collisions (`src/apparel`, `src/types-extra`) → segment-aware matching + fixture tests for both.
- Indirect cycles (`a.ts → ./b → ./index`) are **not** detected — B1 catches direct edges only. Honest limitation; document it and list full cycle detection under "next hardening".
- If M4 must ship alongside M1–M3, a dated single-entry `KNOWN_VIOLATIONS` allowlist is the escape hatch — but **strongly prefer sequencing**.
- Deferred rules (`lib`→`components`, Domain-purity per §9.2, cycle detection) are explicitly out of scope.

**Acceptance criteria.**
- [ ] `npm test` runs the boundary test; total ≥ 392 + new tests, all passing
- [ ] Each of B1/B2/B3 proven to fire via fixtures, and proven silent on the 4 legal edges
- [ ] Reintroducing any real violation turns `npm test` red with an actionable message
- [ ] `docs/02-design/architecture-boundaries.md` exists; `README.md` and `.claude/CLAUDE.md` state the rules
- [ ] No new dependency; coverage thresholds unchanged
- [ ] The archived design doc is **not** edited

---

## 9. Open Decision (blocks Module 3)

**OD-1 — `StackInput["intent"]` is currently typed `string`, not `StackIntent`.**

`schemas.ts:11-13` casts `OUTCOME_CATEGORIES as [string, ...string[]]`, collapsing `z.enum`'s inference to plain `string`. The Zod **runtime** validation has always been correct (it still validates against the real string values); only the TypeScript type is wrong. Options:

| Option | Effect | Scope verdict |
|--------|--------|---------------|
| **(a) Mirror reality — hand-write `intent: string`** | Assertion passes immediately; zero behavior change; bakes in the type hole with a `// TODO` | **Recommended** — the only option inside "no behavior changes" |
| (b) Fix the cast, then write the precise union | Tightens types across `ProfileInput.goals`/`formPreferences` too; makes `apply.ts:103`'s cast meaningful | **Out of scope** — type-tightening with unknown blast radius across 5+ call sites; propose as a separate follow-up |
| (c) Assert only `StackItemInput` | Leaves `StackInput` unguarded | Rejected — defeats the purpose |

**Recommendation: (a)**, with a `// TODO` in `stack.ts` recording that `intent` *should* be `StackIntent` and that fixing it requires dropping the casts at `schemas.ts:11-13`.

---

## 10. Module Dependency Order

```
M1 (types barrel)  ─┐
                    ├─→  M3 (Domain contracts)  ─→  M4 (guardrail + docs)
M2 (auth actions)  ─┘
```

| Order | Module | Depends on | Why |
|:-----:|--------|-----------|-----|
| 1 | **M1** — barrel cycle | — | Independent. Largest file count; do it first while the tree is otherwise untouched. |
| 2 | **M2** — auth actions | — | Independent of M1 (disjoint files); sequenced second only to keep commits reviewable. |
| 3 | **M3** — Domain contracts | M1 (soft) | Touches `src/types/stack.ts`, which M1 also edits. Sequencing after M1 avoids a conflicting edit to the same line region. |
| 4 | **M4** — guardrail + docs | **M1, M2, M3 (hard)** | M4 asserts zero violations. Running it earlier turns `npm test` red. |

M1 and M2 may run in parallel if desired. **M4 is a hard gate — never first.**

Run `graphify update .` after M3 to refresh the stale knowledge graph.

---

## 11. Next Steps

1. [ ] **Resolve OD-1** (`intent: string` vs. fixing the cast)
2. [ ] Approve this Plan at the checkpoint
3. [ ] `/pdca design architecture-boundary-repair` (optional — the modules are already file-level specific)
4. [ ] Implement M1 → M2 → M3 → M4, one commit each

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-30 | Initial draft; all findings verified against source at `v1.0/`, cross-checked by ECC architect / typescript-reviewer / planner | Claude |
