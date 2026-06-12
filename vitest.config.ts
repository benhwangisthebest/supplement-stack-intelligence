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
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      // Plan SC: ≥80% coverage on the evaluation engine
      thresholds: {
        "src/lib/stack-evaluator/**": { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
});
