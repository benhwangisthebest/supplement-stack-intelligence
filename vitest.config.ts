import { defineConfig } from "vitest/config";
import path from "node:path";

// Design Ref: §8.1 — L0 unit tests target the pure lib/ engine (evidence, safety, stack-evaluator)
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Phase 0 U6 — coverage VISIBILITY only, not a gate.
      // Spec: docs/01-plan/phase-0-integration-enforcement.plan.md (U6)
      // Review: docs/reviews/phase-0-plan-review.md (P-07, P-08, P-09)
      //
      // The report previously spanned `src/lib` alone, so `src/app`,
      // `src/components`, `src/services`, `src/data`, and `src/types` were
      // absent from the table entirely — invisible rather than shown untested.
      // P-09: config-excluded is not the same as genuinely-uncovered.
      //
      // Widening `include` does NOT imply a repo-wide floor is safe. Measured
      // across all of `src/`: 47.11% lines / 68.86% functions. Any plausible
      // 70% global threshold fails immediately. Global and per-engine
      // thresholds are deferred to Phase 1 (U-DEFER-5).
      include: ["src/**/*.{ts,tsx}"],
      // Tests measure product code; they are not product coverage themselves.
      exclude: ["src/**/*.test.{ts,tsx}"],
      // ---------------------------------------------------------------------
      // Per-engine thresholds (Phase 1 U13). Gate D1: set from MEASURED
      // per-directory coverage, ≥10 pp below observed.
      // ---------------------------------------------------------------------
      //
      // EVERY NUMBER BELOW IS `measured − 10`, rounded down, measured on
      // 2026-08-05 at the U15 tip (837 tests / 72 files) with
      // `vitest run --coverage`. They are FLOORS THAT MUST NOT FLAKE, not
      // targets: a threshold set at today's exact figure turns any harmless
      // refactor into a red build, which is how coverage gates get deleted.
      //
      // D-2 — THE JITTER CONSTRAINT, and why it is not negotiable:
      // branch coverage in this repository is not deterministic. It was measured
      // drifting by ±0.02 pp between identical runs, so a `branches` threshold
      // sitting on the measured value fails at random. Hence two rules, both
      // recorded here so a later "tightening" cannot quietly undo them:
      //   1. no `branches` threshold within 10 pp of measured — the margin below
      //      is 500× the observed jitter;
      //   2. NO `branches` threshold at all on any directory containing
      //      `src/lib/protocol-builder/rules.ts`, which is where the jitter was
      //      observed. `src/lib/protocol-builder` therefore carries lines,
      //      functions and statements only — deliberately, not by omission.
      //
      // SCOPE — pure engine directories only. `src/lib/{auth,api,supabase}` are
      // infrastructure and `src/lib/db` is persistence (15.65% statements: it is
      // exercised through routes, not unit-tested — see follow-up FU-16), while
      // `src/lib/advisor` and `src/lib/identity` each still contain a file that
      // reaches into `@/lib/db`. Those five are excluded here and are U18's
      // subject, not U13's; adding them would be asserting a purity claim this
      // unit has not established.
      thresholds: {
        "src/lib/biomarkers/**": { lines: 78, functions: 75, branches: 84, statements: 78 },
        "src/lib/checkin/**": { lines: 90, functions: 90, branches: 82, statements: 90 },
        "src/lib/compare/**": { lines: 68, functions: 40, branches: 90, statements: 68 },
        "src/lib/evidence/**": { lines: 90, functions: 90, branches: 80, statements: 90 },
        "src/lib/evidence-grading/**": { lines: 87, functions: 90, branches: 74, statements: 87 },
        "src/lib/interactions/**": { lines: 83, functions: 85, branches: 74, statements: 83 },
        "src/lib/lab-import/**": { lines: 65, functions: 54, branches: 81, statements: 65 },
        "src/lib/lab-trends/**": { lines: 85, functions: 90, branches: 71, statements: 85 },
        "src/lib/product-matcher/**": { lines: 85, functions: 82, branches: 83, statements: 85 },
        // D-2 rule 2: no `branches` key here. Do not add one.
        "src/lib/protocol-builder/**": { lines: 89, functions: 90, statements: 89 },
        "src/lib/safety/**": { lines: 88, functions: 86, branches: 84, statements: 88 },
        "src/lib/side-effects/**": { lines: 87, functions: 77, branches: 77, statements: 87 },
        // Was 80/80/70/80 (the MVP plan's "≥80% on the evaluation engine").
        // Raised to measured−10; the old figures were a target set before the
        // engine was written, not a measurement.
        "src/lib/stack-evaluator/**": { lines: 89, functions: 90, branches: 78, statements: 89 },
        "src/lib/validation/**": { lines: 87, functions: 90, branches: 71, statements: 87 },
      },
    },
  },
});
