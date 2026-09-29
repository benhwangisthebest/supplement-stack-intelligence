// Phase 4 U15 (D-7 (d)) — the allowlist between an internal failure and the log.
// AC-2: a planted error carrying a supplement name, a dose and a lab value logs
// none of them, and only allowlisted fields appear. RED without the layer: at
// `39fd568` `respond.ts` wrote `err.message`, `err.stack` and `err.cause`, so the
// end-to-end cases below fail there (red record in the U15 artifact).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { redactErrorLog, REDACTED_LOG_FIELDS } from "./redact";
import { handle, internalError, reportInternalError } from "./respond";

// Health-bearing tokens a real failure could plausibly carry: a supplement and
// its dose, a lab marker and its value, and a medication.
const PLANTED = ["Ashwagandha", "600 mg", "ferritin", "12 ng/mL", "levothyroxine"] as const;
const PLANTED_TEXT = "insert failed for Ashwagandha 600 mg; ferritin 12 ng/mL; on levothyroxine";

class RepositoryError extends Error {}

function plantedError(): Error {
  const err = new RepositoryError(PLANTED_TEXT, {
    cause: new Error(`driver: ${PLANTED_TEXT}`),
  });
  Object.assign(err, {
    details: PLANTED_TEXT,
    hint: PLANTED_TEXT,
    code: "23514",
    row: { supplement: "Ashwagandha", dose: "600 mg", marker: "ferritin", value: "12 ng/mL" },
  });
  return err;
}

let calls: unknown[][];

beforeEach(() => {
  calls = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    calls.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Every key of every object argument, and every argument as text. */
function everything(): { text: string; keys: string[] } {
  const keys = calls.flat().flatMap((a) => (a !== null && typeof a === "object" ? Object.keys(a) : []));
  return { text: JSON.stringify(calls) + calls.flat().map(String).join("\n"), keys };
}

describe("AC-2 — a health-bearing error reaches the log as the allowlisted record only", () => {
  it.each([
    ["handle() catching a throw", async () => handle(async () => { throw plantedError(); })],
    ["internalError()", async () => internalError(plantedError(), { code: "ACTION_ERROR" })],
    ["reportInternalError() (the SSE path)", async () => reportInternalError(plantedError(), "ADVISOR_ERROR")],
  ])("%s logs no planted token and no field outside the allowlist", async (_label, run) => {
    await run();
    const { text, keys } = everything();

    expect(calls.length, "the failure must still be logged — exactly one record").toBe(1);
    for (const token of PLANTED) expect(text, `log leaked "${token}"`).not.toContain(token);
    expect(text).not.toContain("23514"); // Supabase error details, including its code
    expect(text).not.toContain("redact.test.ts"); // no stack
    expect(calls[0], "one argument: the record, with no text prefix beside it").toHaveLength(1);
    for (const key of keys) expect(REDACTED_LOG_FIELDS as readonly string[]).toContain(key);
    expect(text).toContain("RepositoryError"); // the class name survives
  });
});

describe("redactErrorLog — pure, total, allowlist-only", () => {
  const ID = "0b9f2c1e-6a1d-4c4e-9f53-3f7a8d2e1b00";

  it("returns exactly the allowlisted fields it was given valid values for", () => {
    const record = redactErrorLog({
      thrown: plantedError(),
      code: "INTERNAL_ERROR",
      status: 500,
      route: "/api/stacks/[id]/items/[itemId]",
      requestId: ID,
    });
    expect(record).toEqual({
      errorClass: "RepositoryError",
      code: "INTERNAL_ERROR",
      status: 500,
      route: "/api/stacks/[id]/items/[itemId]",
      requestId: ID,
    });
    expect(Object.keys(record).sort()).toEqual([...REDACTED_LOG_FIELDS].sort());
  });

  it("names a class from the prototype, never from the instance's own `name`", () => {
    const err = new Error("x");
    err.name = "Ashwagandha 600 mg";
    expect(redactErrorLog({ thrown: err, code: "X", requestId: ID }).errorClass).toBe("Error");
  });

  it("records a non-Error throw by type alone", () => {
    for (const [thrown, cls] of [
      ["Ashwagandha 600 mg", "string"],
      [600, "number"],
      [null, "null"],
      [undefined, "undefined"],
      [{ supplement: "Ashwagandha" }, "Object"],
      [["ferritin"], "Array"],
      [Object.create(null), "unknown"],
    ] as const) {
      const record = redactErrorLog({ thrown, code: "X", requestId: ID });
      expect(record.errorClass).toBe(cls);
      expect(JSON.stringify(record)).not.toMatch(/Ashwagandha|ferritin|600/);
    }
  });

  it("never throws, even on a hostile prototype, and never runs the value's own hooks", () => {
    const hooks = vi.fn(() => "levothyroxine");
    const hostile = new Proxy(
      { toString: hooks, toJSON: hooks, valueOf: hooks, [Symbol.toStringTag]: "levothyroxine" },
      { getPrototypeOf() { throw new Error("levothyroxine"); } },
    );
    const record = redactErrorLog({ thrown: hostile, code: "X", requestId: ID });
    expect(record.errorClass).toBe("unknown");
    expect(hooks).not.toHaveBeenCalled();
  });

  it("drops a status outside 100–599 and a route that is a URL rather than a pattern", () => {
    for (const status of [0, 99, 600, 500.5, Number.NaN]) {
      expect(redactErrorLog({ thrown: null, code: "X", status, requestId: ID })).not.toHaveProperty("status");
    }
    for (const route of [
      "/api/stacks?user=ferritin",
      "/api/stacks#x",
      "/api/stacks/0b9f2c1e-6a1d-4c4e-9f53-3f7a8d2e1b00",
      "/api/lab-markers/12",
      "/api/profile/Ashwagandha%20600%20mg",
      "api/stacks",
      "https://example.test/api/stacks",
    ]) {
      expect(redactErrorLog({ thrown: null, code: "X", route, requestId: ID }), route).not.toHaveProperty("route");
    }
    expect(redactErrorLog({ thrown: null, code: "X", route: "/api/stacks/[id]", requestId: ID }).route).toBe(
      "/api/stacks/[id]",
    );
  });

  it("replaces a code or request id outside its shape with a sentinel instead of passing it through", () => {
    const record = redactErrorLog({ thrown: null, code: "ferritin 12 ng/mL", requestId: "Ashwagandha 600 mg" });
    expect(record.code).toBe("INVALID_CODE");
    expect(record.requestId).toBe("invalid");
  });
});
