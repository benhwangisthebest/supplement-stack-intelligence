import { defineWorkspace } from "vitest/config";
import base from "./vitest.config";

// Phase 3 U0 — the component-test harness. Spec:
// docs/01-plan/phase-3-evidence-grounding.plan.md (U0);
// cycle record: docs/01-plan/features/p3-u0-component-harness.plan.md.
//
// Two projects. `node` is `vitest.config.ts` itself, unchanged apart from its
// name. `jsdom` runs `.test.tsx` files. Coverage is configured once, in
// `vitest.config.ts`, and applies to both projects.
//
// The jsdom project SPREADS the base config. It does not `extends` it:
// `extends` concatenates `include` arrays, so a jsdom project declaring only
// `*.test.tsx` also collected every node test. TEST_COLLECTION in
// `src/architecture/boundaries.test.ts` refuses an `extends` entry for that
// reason.
//
// `jsx: "automatic"` is load-bearing. tsconfig's `"jsx": "preserve"` belongs
// to Next, and without this line esbuild emits classic `React.createElement`
// calls, which fail with "React is not defined".
export default defineWorkspace([
  "./vitest.config.ts",
  {
    ...base,
    esbuild: { jsx: "automatic" },
    test: { ...base.test, name: "jsdom", environment: "jsdom", include: ["src/**/*.test.tsx"] },
  },
]);
