// Executable guardrail for Phase 2 U33 — an environment stub may not outlive
// the test that set it.
//
// ---------------------------------------------------------------------------
// WHY A TEST FOR A CONFIG LINE
// ---------------------------------------------------------------------------
// The property this file asserts is delivered by one line in
// `vitest.config.ts`: `unstubEnvs: true`. A config line cannot be
// mutation-checked by reading it — and U30 has just finished paying for the
// general form of that lesson, where a guard that stopped SEEING a handler
// reported nothing and looked exactly like coverage.
//
// So the property is asserted BEHAVIOURALLY, not by reading the config. The
// first test below stubs a variable and deliberately does not clean up; the
// second asserts the stub is gone. With the flag, they pass. Without it, the
// second fails with `Received: "leaked"` — measured, both ways, before this
// file existed.
//
// ---------------------------------------------------------------------------
// WHY NOT ASSERT THE CONFIG TEXT INSTEAD
// ---------------------------------------------------------------------------
// Because `expect(config).toContain("unstubEnvs: true")` is satisfied by a
// commented-out line, by a line inside the wrong block, and by a Vitest
// version that has renamed the option. All three are green configs that do not
// isolate anything. The behaviour is the contract; the line is one way to get
// it.
//
// ---------------------------------------------------------------------------
// WHAT THIS DOES NOT COVER
// ---------------------------------------------------------------------------
// Leakage ACROSS FILES. Vitest isolates modules per test file, so a stub in
// one file was never visible in another; N-67 was always a within-file defect
// and this is a within-file guard. It also says nothing about `vi.stubGlobal`,
// which `unstubGlobals` governs separately and which no test in this
// repository uses today.

import { describe, expect, it, vi } from "vitest";

const PROBE = "U33_ENV_STUB_ISOLATION_PROBE";

describe("ENV_STUB_ISOLATION: a vi.stubEnv does not outlive its test", () => {
  // ORDER IS THE ASSERTION. These two tests are not independent and must not
  // be reordered, renamed into `it.each`, or given a cleanup hook — the whole
  // point is that the FIRST one leaves a mess and the second one finds none.
  it("stubs a variable and deliberately does not clean up", () => {
    vi.stubEnv(PROBE, "leaked");
    expect(process.env[PROBE]).toBe("leaked");
  });

  it("finds no trace of the previous test's stub", () => {
    // Fails with `Received: "leaked"` if `unstubEnvs` is removed from
    // `vitest.config.ts`. That is this file's entire reason to exist, and it
    // is the mutation recorded in U33's red list as M1.
    expect(
      process.env[PROBE],
      "ENV_STUB_ISOLATION: an env stub survived the test that set it.\n" +
        "`unstubEnvs: true` is missing from vitest.config.ts, or the option has\n" +
        "been renamed by a Vitest upgrade. Either way every test after one that\n" +
        "stubs the environment is now running under someone else's settings —\n" +
        "which is N-67, and it shipped a suite that was green over a disabled\n" +
        "security control.",
    ).toBeUndefined();
  });
});
