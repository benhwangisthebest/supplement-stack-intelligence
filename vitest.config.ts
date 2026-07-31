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
      // Plan SC: ≥80% coverage on the evaluation engine.
      // Scoped to `src/lib/stack-evaluator/**` only, so it is numerically
      // unaffected by the widened `include` above. Deliberately unchanged.
      thresholds: {
        "src/lib/stack-evaluator/**": { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
});
