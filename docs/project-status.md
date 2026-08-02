# Project Status

> **Status:** Active. Describes the repository's *actual* condition, not its intended design.
> **Assessed:** 2026-07-30, by an independent five-reviewer MVP-transition review.
> **Refreshed:** 2026-08-02 at Phase 0 close, against `main` @ `1792f9f`. Sections §0, §1.1, §2.6, §2.8,
> §2.9 and §7 carry measured updates; the 2026-07-30 findings are retained beside them rather than
> deleted (`CLAUDE.md` §7). Where a row is superseded it is marked **[2026-08-02]**.
> **Rule:** Existing code is evidence of current state, **not** automatically the intended final design.
> Nothing below is labelled production-ready without stated evidence.

---

## 0. Verification baseline (measured 2026-07-30)

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **Clean**, exit 0 |
| Unit tests | `npx vitest run` | ~~**408 passed / 408**, 39 files~~ → **[2026-08-02] 524 passed / 524, 42 files** |
| Production build | `npx next build` | **Succeeds**; 15 Library pages prerendered (SSG) |
| Migrations | `supabase/migrations/` | 7 files, `0001`–`0007` |
| E2E (default run) | `npx playwright test` | ~33 of 89 tests execute; the rest are `E2E_LIVE`-gated |
| CI | — | ~~**None.** No workflow files anywhere~~ → **[2026-08-02] GitHub Actions `CI` exists and is green** on `main` @ `1792f9f` ([run 30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782)): `npm ci` → typecheck → `vitest run` → `next build`. **Not** a required status; `main` has no branch protection. |
| Lint | `npm run lint` | **Enforces nothing** — no ESLint dependency, no config |

**[2026-08-02] Coverage scope was widened** in `8b1bd16`: `include` is now `src/**/*.{ts,tsx}`. Measured
at `1792f9f`: **200 files, 47.68 % statements · 81.23 % branches · 69.85 % functions** repo-wide. Six of
the **seven** top-level `src` directories appear in the report — `src/architecture` holds only `*.test.ts`,
which `coverage.exclude` drops; it is still a governed layer under §4.6, which counts all seven.
Visibility only — the sole threshold remains `src/lib/stack-evaluator/**`. The paragraph below described
the pre-`8b1bd16` state and its central warning still stands: a green suite is not a verified product.

**Read the green suite carefully.** 408/408 does *not* mean the product is verified. Coverage is
configured to measure `src/lib/**` only, so `src/app/api/**`, `src/services/**`, and
`src/components/**` are invisible to the report rather than covered. Vitest's `include` is
`src/**/*.test.ts` — **`.tsx` test files are silently never collected.** See §2.9.

---

## 1. Repository shape

- The git repository root **is** the application directory (`…/Supplement-Advisor/v1.0`). It holds the
  authoritative `CLAUDE.md`, `docs/`, `src/`, `supabase/`, `tests/`, and `.bkit/`. The `graphify-out/`
  knowledge graph lives at `graphify-out/` **inside** the repository root but is **gitignored** as a
  generated artifact (U1, commit `4337a24`) — so it is absent from a fresh clone until regenerated.
- Stack: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind, Supabase (Postgres + Auth),
  Anthropic SDK, Zod. Vitest + Playwright. No ORM (deliberate — hand-written repos so RLS does tenant
  isolation). No linter, no formatter, no CI.
- ~12,958 LOC `src/lib`, 5,518 `src/components`, 2,275 `src/data`, 1,786 `src/app`, 1,308 `src/types`.
- Exactly **one** `TODO` in the whole source tree (`src/types/stack.ts:56`).
- No import cycles (independently confirmed via `graphify-out/GRAPH_REPORT.md`).

### 1.1 Git state — the most urgent non-code risk

> **[2026-08-02] RESOLVED IN FULL by Phase 0.** Every row in the table below is now false, and that is the
> point of Phase 0. Measured: `main` @ `1792f9f` == `origin/main`, **0 ahead / 0 behind**; history linear
> with **zero merge commits**; the layering guardrail and the v13 anti-fabrication guards are committed
> **and pushed**; working tree clean. The four `fix/*` remediation branches and nine `feat/*` branches are
> all intact on `origin` — no branch was deleted, no tag created, no history rewritten.
>
> The table is retained unedited as the record of what Phase 0 was called into existence to fix.

| Fact | Evidence |
|---|---|
| `main` is still at **MVP v1** | `git log main` = 2 commits (`910d773`, `30f74e1`) |
| `main` is **15 commits behind** the working tip | `git rev-list --count main..HEAD` (was 14 before Phase 0 U1 added `4337a24`) |
| The 10 feature branches are a **single linear chain**, not parallel work | Each was created by `checkout` at the previous branch's tip; zero divergent merge bases |
| The boundary-enforcement work **is committed** as `d9fc1ef` — but **unpushed** | `git log --diff-filter=A -- src/architecture/boundaries.test.ts` → `d9fc1ef`; local ref `d9fc1ef` ≠ `origin` ref `d89cf1c` |
| v13 `evidence-disclosure` is the **only genuinely uncommitted** milestone | `git status` — `seed-papers.ts`, `types/paper.ts`, `validation/seed.ts` + UI modified; `seed-integrity.test.ts` and `IllustrativeDatasetNotice.tsx` untracked |
| Branch labels misdescribe contents | v11 `side-effect-engine` was committed *after* v12 onto the v12 branch; no `v11` branch exists |

**Important correction to an intuitive reading:** this is **not** a merge-conflict problem.
Because the history is linear, `main` can `merge --ff-only` to the tip with **guaranteed zero
conflicts**, and the integrated state is already validated — it is what §0 was measured against.

The real risks are different and sharper:

1. **The two highest-leverage guardrails exist only on this machine — for two different reasons.**
   `src/architecture/boundaries.test.ts` (layering) is **committed** in `d9fc1ef` but **not pushed**, so it
   is lost if the working copy is lost. The v13 anti-fabrication guards in `src/data/seed-integrity.test.ts`
   are **not even committed** — they exist only as an untracked file. The second case is the more fragile:
   an uncommitted file has no git object at all.
2. **`main` is a two-commit MVP that matches no document and no test expectation.** Anyone — human or
   agent — who clones and checks out `main` gets a codebase with no `services/`, no
   `boundaries.test.ts`, and ten missing engines. This is arguably a *larger* cause of the repo
   "reading as a prototype" than `CLAUDE.md`, because it is the default branch.
3. Ten stale labels create a false impression of parallel work, discouraging the trivially safe
   fast-forward.

---

## 2. Subsystem status

Key — **P** = production-suitable · **B** = bounded refactor required · **X** = prototype-only.

### 2.1 Knowledge base / evidence content — **X**
- **Implementation:** 15 supplements, 27 effects, 20 papers, plus interactions/food-pairings/
  biomarkers/side-effects/products as static TypeScript arrays in `src/data/*.ts`.
- **Works:** integrity tests validate internal referential consistency; Zod seed validation runs.
  `src/data/*.ts` imports **only** `@/types` — a clean leaf.
- **Incomplete:** **19 of 27 effect grades are hand-typed letters with no `evidenceProfile`**
  (verified: 8 profiles vs 27 grades). Eight are Grade A. Some carry zero papers
  (`magnesium-metabolic`: `paperIds: []`). v13 **deleted** all provenance fields because they were
  LLM-recalled and unverifiable — an honest fix leaving the evidence layer *disclosed* but still
  **ungrounded**.
- **Persistence:** none — content ships in the code bundle. Every correction is a deploy.
- **Tests:** integrity/validation only. **No test can assert a grade is correct** — no ground truth exists.
- **Risks:** the product's declared trust layer is its weakest subsystem. Grades are editorial opinion
  in a scientific frame.
- **Classification: X.** The *shape* survives; the content and its authoring format must be replaced.

### 2.2 Domain engines (`stack-evaluator`, `interactions`, `product-matcher`, `protocol-builder`, `compare`, `biomarkers`, `checkin`, `side-effects`, `identity`, `lab-trends`, `evidence-grading`, `evidence`) — **P**
- **Implementation:** pure, deterministic, DB-agnostic, with a uniform injection seam (each engine
  takes its dataset as a last parameter, defaulting to the seed).
- **Works:** genuinely. Independent review found **no** copy asserting an uncomputed fact and **no**
  evaluator rule unreachable from production — the two bug classes that shipped in v11 and were fixed.
  All 10 rules run via `ALL_RULES` → `services/evaluation.ts:49`. Affiliate-blindness is *structural*:
  `toScorable()` strips `affiliateLink` before scoring (`product-matcher/index.ts:41-46`) so the ranker
  cannot read it. Evidence supremacy is regression-tested.
- **Incomplete:** three superseded `safetyCopy` helpers have no production callers (dead code, not a
  fabrication risk). `getBiomarker()` (`biomarkers/index.ts:151`) bypasses the injection seam.
- **Risks:** engines are tested only with hand-built fixtures; nothing binds them to real DB data.
- **Classification: P.** Materially more mature than "MVP" implies.

### 2.3 Safety layer (`lib/safety`, `advisor/safety-recheck`) — **P**
- Centralized hedged copy builders plus a `BANNED_PHRASES` sweep (`containsBannedLanguage()`) invoked
  on every model-produced string. A real code-level gate, not prose convention — the best-engineered
  module in the codebase.
- **Standing caveat:** the sweep validates **vocabulary, not truth**. It cannot catch a
  correctly-hedged false statement. This is the v11 lesson and it is permanent.

### 2.4 AI advisor (`lib/advisor`) — **B**
- **Works — unusually disciplined:** the LLM **cannot write data**. Tools only *propose*;
  `POST /api/advisor/actions` re-loads context server-side, re-validates every proposal with Zod
  against fresh RLS-scoped data, and runs an **authoritative** `cumulativeRecheck` that hard-blocks
  (409) on any new critical flag before `executeBatch`. The system prompt is a fixed string never
  concatenated with user or DB data — no injection path into it. No tool performs network, shell, or
  file access. `claude-adapter.ts` is textbook ports-and-adapters (structural types, lazy server-only
  import, injectable client). Turn cap 5, batch cap 4.
- **Incomplete:** `execute.ts` — the **sole write path** for advisor-driven mutations — has **0% unit
  coverage** (168 lines), exercised only by credential-gated E2E. Rollback failure is silently
  swallowed with no logging (`execute.ts:127-136`). No timeout on the Anthropic call. Daily budget
  check is non-atomic (read-then-write-later), so concurrency can exceed the cap. Client disconnect
  neither stops the loop nor stops billing. ~190 lines of orchestration/safety-gate logic live inside
  the route handler rather than a testable service.
- **Persistence:** conversations, messages, usage, actions — all persisted with RLS.
- **Classification: B.** Architecture sound; write path needs tests, logging, timeout, extraction.

### 2.5 Persistence (`lib/db`, `supabase/migrations`) — **B**
- **Works:** RLS is **complete and correct** — every table across all 7 migrations has both
  `enable row level security` and a matching policy; child tables derive ownership via `EXISTS` on the
  parent stack. Server clients use the **anon key** bound to session cookies, so RLS genuinely applies
  per request. Service-role key appears only in the dev seed script, never in HTTP-reachable code.
  Schema quality is high (derived-ownership policies, `touch_updated_at` triggers).
- **Incomplete:** `src/lib/db/**` has **0% executed coverage** — no test calls any mapper. **No
  contract test binds the SQL schema to `types.ts`**; `mappers.ts` casts (`row.intent as StackIntent`)
  against plain `text` columns with no CHECK constraint, so drift is silent. `replaceFlags()` is a
  non-atomic delete-then-insert — a failed insert leaves zero flags. No migration tooling, no `down`
  migrations, no record of what is deployed; migrations are applied by hand.
- **`stack_items.supplement_id` is a soft reference with no FK.** Renaming a seed ID silently orphans
  every persisted row referencing it — a blank, unevaluable stack item. No detection, no test.
- **Classification: B.**

### 2.6 API layer (`src/app/api/**`) — **B**

> **[2026-08-02]** Raw internal error disclosure is **resolved**. `handle()` now returns a fixed generic
> message plus an opaque correlation ID and logs the full exception server-side under that ID (`9e9e15d`,
> **R3**); four further handlers that bypassed `handle()` were fixed in `1792f9f` (**R3b**), and
> `src/architecture/error-disclosure.test.ts` enforces the rule across every tracked route. Route count is
> **23**, of which 20 use `handle()` at 28 call sites.
- **Works:** **all 22–23 routes call `getUser()` and return 401** — verified exhaustively. Zod
  validation on all mutation routes. Consistent `{data, error}` envelope.
- **Incomplete:** **zero tests**; the directory is excluded from coverage measurement entirely. Raw
  error messages returned verbatim to clients (`respond.ts:54`) — PostgREST text can leak constraint,
  table, and column names. `handle()` dispatches on error-message *substrings* (`includes("not
  configured")`) rather than typed errors. No rate limiting on any route, including the paid LLM
  endpoint. No security headers in `next.config.ts`.
- **Classification: B.**

### 2.7 UI (`src/app`, `src/components`) — **B**
- **Works:** production build succeeds; Library is SSG across 15 pages; advisor output renders as plain
  text with no `dangerouslySetInnerHTML` anywhere — no XSS surface today. Design system documented in
  `.claude/DESIGN.md` (542 lines).
- **Incomplete:** **zero component tests**, and `.tsx` tests cannot even run (see §2.9). 31 client
  components; two of them import domain engines and seed data directly into the browser bundle
  (`ProfileForm.tsx` → medication aliases; `StackItemRow.tsx` → `SEED_PRODUCTS` + matcher). Free at 15
  supplements; a bundle cliff at 1,000.
- **Classification: B.**

### 2.8 Observability & operations — **X (absent)**
- **[2026-08-02] Partly addressed.** `handle()` no longer discards the exception: every unexpected error
  is written to the server log as a structured record carrying a correlation ID, the public error code,
  and the error's name/message/stack/cause, with the same ID returned to the client. Non-`Error` throws
  and arbitrary `cause` values are reduced to type metadata so a thrown payload cannot be serialized into
  a log line. That is the whole of it: still **no logging library, no error-reporting service, no request
  IDs outside the error path, no log aggregation**, and no UI surface where a user can read or quote the
  correlation ID (follow-up **F5**).
- **Original finding (2026-07-30), retained:** No logging library, no error reporting, no request IDs. A
  repo-wide grep for `console.` in non-test source matches exactly one dev seed script. `handle()` catches
  every server error and converts it to an HTTP response **without recording anything**.
- **Risk:** a production incident involving a partial write or swallowed rollback would be
  undiagnosable after the fact.
- **Classification: X.** The largest operational gap.

### 2.9 Testing infrastructure — **B**
- **[2026-08-02] Updated:** **524 unit tests across 42 files.** Two executable architecture specs, not
  one: `boundaries.test.ts` (**28** tests) and `error-disclosure.test.ts` (**29** tests). Both derive
  their inventory from `git ls-files`, so a verdict is a property of the repository rather than of one
  working tree (`a338370`, **R1**). `src/services` and `src/data` are now scanned layers, and every
  top-level `src/*` directory must be scanned or explicitly exempted with a written reason. Reference-ID
  stability is enforced across **9** manifest namespaces (`77b3c36`, plus `ea5b270` **R2** which added
  `biomarkerRelevanceRules`). Every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked —
  shown red against the defect it targets — as `CLAUDE.md` §5.2 requires.
- **Still true:** coverage thresholds exist for `stack-evaluator` only; vitest collects `*.test.ts` only,
  so a `.test.tsx` file is silently never run; `environment: "node"` with no jsdom means component tests
  cannot run; the E2E gaps below are unchanged and E2E remains excluded from CI.
- **Original findings (2026-07-30), retained:**
- **Works:** 408 unit tests. Architecture boundaries enforced by a real compiler-API test (16 tests). A
  reachability-guard test exists (`services/evaluation.test.ts`), created in response to the v11 dead-code
  bug. `src/lib/validation/schemas.ts:146-153` makes Zod↔domain drift a *compile error* — the single
  best idea in the codebase, and worth generalizing.
- **Incomplete:**
  - Coverage `include` is `src/lib/**` only — `services`, `api`, `components` are unmeasured, not covered.
  - Vitest `include` is `src/**/*.test.ts`: **a `.tsx` test file is silently never collected**, and
    `environment: "node"` with no jsdom or Testing Library means component tests cannot run at all.
  - Coverage *thresholds* exist for `stack-evaluator` only — one MVP-era module out of ~13 engines,
    several of which emit safety output.
  - Boundary enforcement scans `src/types`, `src/components`, `src/lib` — **`src/services` and
    `src/data` are ungoverned**, despite `src/services` being a documented Application layer.
  - Domain purity (engines must not import `lib/db`/`lib/supabase`) is documented but **explicitly
    deferred and unenforced**.
  - E2E: 17 of 23 spec files are `E2E_LIVE`-gated; **every** write path (profile → stack → evaluate →
    protocol → advisor apply → check-in → lab commit) is behind that gate. The `L1/L2/L3` naming does
    **not** reliably indicate gating. `fullyParallel: true` contradicts a single shared demo user whose
    seed performs destructive deletes — flaky by construction. `webServer` runs `npm run dev`, so a
    production build is never E2E-tested.
- **Contradicting artifact:** `test-results/mvp-core-loop-e2e-.../error-context.md` (dated 2026-07-30)
  records the core-loop E2E failing at login with `fetch failed` — a network/auth failure, **not** a
  missing `ANTHROPIC_API_KEY`. The prior "live suite is fine apart from the API key" framing should not
  be trusted without a fresh, dated re-run.
- **Classification: B.**

---

## 3. Consolidated classification

| Subsystem | Classification |
|---|---|
| `src/types` (dependency-free leaf, enforced) | **P** |
| Domain engines (`lib/*` pure logic) | **P** |
| Safety layer | **P** |
| `lib/validation/schemas.ts` compile-time conformance | **P** |
| `claude-adapter.ts` ports-and-adapters | **P** |
| Migration schema + RLS design | **P** |
| AI advisor write path / orchestration | **B** |
| Persistence repos, mappers, migration *process* | **B** |
| API layer | **B** |
| UI | **B** |
| Testing infrastructure | **B** |
| Evidence content / knowledge base | **X** |
| Content delivery (authoring format) | **X** |
| Observability | **X** |
| Release/integration process | **X** |
| `db/seed.ts` shared demo fixture | **X** |

---

## 4. Mocks, placeholders, temporary behavior — treated as permanent?

**Yes, in three places.**

1. **Hand-typed evidence grades.** Never intended as final; now load-bearing for the product's central claim.
2. **Seeded product catalog** (`seed-products.ts`, 21 products, all `affiliateLink: null`). The
   *matching algorithm* is real and production-suitable; the *catalog* is still the placeholder the
   brief described, and nothing in the UI distinguishes them.
3. **Seed-as-code as the content *authoring format*.** See §5 — the pattern is sound; the format is the shortcut.

**Correctly NOT permanent:** `advisor/mock-adapter.ts` is a legitimate, clearly-documented test double
imported only by tests. `chunkAnswer()` simulates token streaming for an honest reason (the safety gate
must run before any token leaves) and is acceptable indefinitely. `lib/interactions`,
`lib/product-matcher`, and `lib/protocol-builder` have all outgrown their "placeholder" framing.

---

## 5. Is seed-as-code actually wrong?

**No — and this is a correction to the intuitive reading.** For *read-only reference data*, seed-as-code
is defensible and arguably superior to a database: the corpus is small, versioned with the code,
diff-reviewable, compile-time typed, and its correctness is an **editorial** problem — which Git review
solves better than a CMS. Given the fabricated-citation history, reviewability matters more than
queryability. **Do not move it to Postgres for its own sake.**

The real limits, all evidenced:

- **Sync-only.** Every injection seam is synchronous. Moving to async I/O ripples through every engine
  and every server component. This is the actual lock-in.
- **Ships to the browser** via two client components (§2.7).
- **The authoring format**, not the pattern, is the shortcut — TypeScript source blocks a
  non-engineer editorial workflow, which is exactly what grounding work needs.

Bounded path: (1) finish the seam + add an ID manifest + a bundle-size assertion; (2) move the source of
truth to JSON/YAML with build-time codegen emitting the same constants — engines and types untouched;
(3) only if the corpus outgrows the bundle, load server-side and pass props to client components.
Nothing in current evidence justifies step 3.

---

## 6. Does the architecture support continued development without compounding debt?

**Yes — the shape is right and no rewrite is justified.** `src/types` → pure engines → repos/services →
routes → components is correct, cycle-free, and three of four boundary rules are executable.

What compounds debt is not the shape but **the coverage of enforcement**: two layers are ungoverned,
purity is unenforced, the presentation layer is untestable-by-config, and none of it runs automatically.
Plus two content/process issues:

1. **Content debt compounds fastest** — every feature built on ungrounded grades enlarges the surface a
   future grounding cycle must revalidate.
2. **Process debt compounds silently** — with no CI and nothing merged to `main`, any fix can regress invisibly.

---

## 7. Known risks, ranked

1. **Evidence grades are ungrounded** (19/27 hand-typed) in a product whose Library is the declared trust layer.
2. ~~**Single-machine loss risk**~~ — **[2026-08-02] closed.** All guardrails are committed and pushed.
3. ~~**`main` is a stale two-commit MVP**~~ — **[2026-08-02] closed.** `main` is the working tip.
4. **Partial observability** — **[2026-08-02]** unexpected API errors are now logged with a correlation
   ID, but nothing else is instrumented and no UI surfaces the ID (**F5**).
5. ~~**No CI**~~ — **[2026-08-02] closed for existence, open for enforcement.** CI runs and is green, but
   it is not a required status and `main` has no branch protection (closeout finding **C-6**).
6. **Core-loop E2E does not run by default**, and the one live-run artifact on disk shows a login failure.
7. **`execute.ts` (LLM-driven write path) has 0% unit coverage.**
8. **No schema↔type contract test; `supplement_id` has no ID-stability contract** — silent data corruption class.
9. **No rate limiting** on the paid LLM endpoint; budget check non-atomic; no abort on client disconnect.
10. ~~**Raw error messages returned to clients**~~ — **[2026-08-02] closed** by `9e9e15d` (R3) and
    `1792f9f` (R3b), and enforced by `src/architecture/error-disclosure.test.ts`.
11. **`.tsx` tests silently never run** — a developer writing one gets silence, not an error.
12. **No self-service data export/deletion** for stored health data.

---

## 8. What genuinely works — stated plainly

To avoid over-correcting: this is a substantially better codebase than "MVP" implies. Domain logic is
pure, deterministic, injectable, cycle-free, and well-tested. RLS is complete and correct across all 7
migrations. Every API route is authenticated. The advisor is *architecturally* prevented from writing
data unilaterally. Trust-over-monetization is enforced by types, not policy. Architecture boundaries are
compiler-verified. Zod↔domain conformance is a compile error. And the team caught and honestly
documented its own two worst bug classes (v11) and its own fabricated-citation defect (v13) rather than
papering over them.

The gaps are concentrated in the **operational layer** (observability, CI, integration, error hygiene,
rate limiting) and in **content grounding** — not in the domain design.
