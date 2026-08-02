// Guardrail for the shared API error boundary — Phase 0 closeout finding C-8.
//
// `handle()` is the single trust boundary between an unexpected server exception
// and the HTTP response. It used to return `err.message` verbatim on a 500, so a
// Postgres connection string, a filesystem path, or a provider error reached the
// client — and 17 UI components render `error.message` straight into the page.
// CLAUDE.md §2.3 rule 13 (rank 1) forbids exactly that.
//
// These tests assert on the *serialized* body, not on an intermediate object,
// because what matters is what crosses the wire. All 28 `handle()` call sites
// across 20 route files inherit this behavior, so the boundary is tested once
// here rather than duplicated per route.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextResponse } from "next/server";
import { z } from "zod";
import {
  INTERNAL_ERROR_MESSAGE,
  handle,
  internalError,
  notFound,
  unauthorized,
  validationError,
  type ApiEnvelope,
} from "./respond";

/**
 * Unmistakably sensitive text: a credential, an internal host, and an absolute
 * filesystem path. Every fragment is asserted absent from the serialized body,
 * so a partial leak fails just as loudly as a whole one.
 */
const SECRET_MESSAGE =
  "postgres password=do-not-return host=/Users/example/internal.sock";
const SECRET_FRAGMENTS = [
  "postgres",
  "password",
  "do-not-return",
  "/Users/example",
  "internal.sock",
];

/** The exact bytes the client receives, plus the parsed envelope. */
async function readBody(res: NextResponse<ApiEnvelope<unknown>>) {
  const text = await res.text();
  return { text, json: JSON.parse(text) as ApiEnvelope<unknown> };
}

/** Silences the boundary's own log while capturing what it wrote. */
function captureLog() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

/** Everything a single console.error call passed, flattened to searchable text. */
function loggedText(spy: ReturnType<typeof captureLog>): string {
  return spy.mock.calls
    .map((args) =>
      args
        .map((a) => {
          try {
            return typeof a === "string" ? a : JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" "),
    )
    .join("\n");
}

const throwing = (value: unknown) => async () => {
  throw value;
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ------------------------------------------------------------------- T1 ------

describe("T1 — an unexpected Error never reaches the client", () => {
  it("returns a 500 with INTERNAL_ERROR, the stable message, and a correlation id", async () => {
    captureLog();

    const res = await handle(throwing(new Error(SECRET_MESSAGE)));
    const { text, json } = await readBody(res);

    expect(res.status).toBe(500);
    expect(json.data).toBeNull();
    expect(json.error?.code).toBe("INTERNAL_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // The whole point: not one fragment of the raw exception survives.
    for (const fragment of SECRET_FRAGMENTS) {
      expect(text).not.toContain(fragment);
    }
  });

  it("leaks no stack trace, and does not vary its message with the error", async () => {
    captureLog();

    const err = new Error(SECRET_MESSAGE);
    err.stack = "Error: at /Users/example/src/lib/db/secret-mapper.ts:42:7";

    const first = await readBody(await handle(throwing(err)));
    const second = await readBody(await handle(throwing(new TypeError("a wholly different failure"))));

    expect(first.text).not.toContain("secret-mapper");
    expect(first.text).not.toContain("stack");
    expect(second.json.error?.message).toBe(first.json.error?.message);
    expect(second.text).not.toContain("wholly different failure");
  });
});

// ------------------------------------------------------------------- T2 ------

describe("T2 — the correlation id joins the response to the log", () => {
  it("puts the same id in the client body and the server log", async () => {
    const spy = captureLog();

    // Deliberately a *sequence*, not a constant. A constant mock makes every
    // generated id identical, so a boundary that minted one id for the response
    // and a second for the log would still appear to join correctly. Distinct
    // values are what make this test able to fail.
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(
      () => `00000000-0000-4000-8000-00000000000${(n += 1)}` as ReturnType<
        typeof crypto.randomUUID
      >,
    );
    const FIRST = "00000000-0000-4000-8000-000000000001";

    const res = await handle(throwing(new Error(SECRET_MESSAGE)));
    const { text, json } = await readBody(res);

    expect(json.error?.correlationId).toBe(FIRST);

    const log = loggedText(spy);
    expect(log).toContain(FIRST);
    // Exactly one id exists for this failure — the log must not carry a second.
    expect(log).not.toContain("00000000-0000-4000-8000-000000000002");
    // The log is where the real error is allowed to live.
    expect(log).toContain(SECRET_MESSAGE);
    expect(log).toContain("api.internal_error");
    // ...and the response is where it is not.
    expect(text).not.toContain(SECRET_MESSAGE);
  });

  it("logs the error name, stack, and cause alongside the id", async () => {
    const spy = captureLog();

    const cause = new Error("underlying driver socket reset");
    const err = new Error("query failed", { cause });
    err.name = "DatabaseError";

    const { text } = await readBody(await handle(throwing(err)));
    const log = loggedText(spy);

    expect(log).toContain("DatabaseError");
    expect(log).toContain("query failed");
    expect(log).toContain("underlying driver socket reset");
    expect(log).toContain("respond.test.ts"); // the stack was captured
    expect(text).not.toContain("driver socket reset");
  });
});

// ------------------------------------------------------------------- T3 ------

describe("T3 — a non-Error throw is handled without stringifying it to the client", () => {
  it.each([
    ["a string", "postgres password=do-not-return"],
    ["an object", { password: "do-not-return", host: "/Users/example/internal.sock" }],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
  ])("returns the safe 500 when %s is thrown", async (_label, value) => {
    const spy = captureLog();

    const res = await handle(throwing(value));
    const { text, json } = await readBody(res);

    expect(res.status).toBe(500);
    expect(json.error?.code).toBe("INTERNAL_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();
    expect(text).not.toContain("do-not-return");
    expect(text).not.toContain("internal.sock");

    // The log must say a non-Error was thrown — otherwise the absence of a name
    // and stack reads as a logger bug rather than a bug at the throw site.
    expect(loggedText(spy)).toContain("non-Error");
  });

  it("records the thrown value's type in the log", async () => {
    const spy = captureLog();
    await handle(throwing({ password: "do-not-return" }));
    expect(loggedText(spy)).toContain("object");
  });
});

// ------------------------------------------------------- S1-S6: log hardening --
//
// The client-side fix above stops the raw error reaching the browser. It says
// nothing about what the *server log* holds. A thrown value is whatever the
// throw site had in scope — a request body, a Supabase row, a lab-result
// payload, an object carrying an authorization header — so serializing it moves
// exactly the material CLAUDE.md §2.3 rules 13 and 15 protect into a log line,
// where it is retained, shipped to an aggregator, and read by people who never
// touched the request. These tests pin "type metadata only".

/** Field names and values that must never appear in a log line. */
const SENSITIVE_PAYLOAD = {
  password: "hunter2-do-not-log",
  authorization: "Bearer sk-live-do-not-log",
  cookie: "sb-access-token=do-not-log",
  labResults: [{ marker: "ferritin", value: 12 }],
  medications: ["levothyroxine 75mcg"],
};
const SENSITIVE_TOKENS = [
  "password",
  "authorization",
  "cookie",
  "labResults",
  "medications",
  "hunter2-do-not-log",
  "sk-live-do-not-log",
  "sb-access-token",
  "ferritin",
  "levothyroxine",
];

describe("S1 — a thrown non-Error object is never logged raw", () => {
  it("logs only type metadata, with no sensitive field name or value", async () => {
    const spy = captureLog();

    const { text, json } = await readBody(await handle(throwing({ ...SENSITIVE_PAYLOAD })));

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();

    const log = loggedText(spy);
    expect(spy).toHaveBeenCalled();
    expect(log).toContain(json.error!.correlationId!);
    for (const token of SENSITIVE_TOKENS) {
      expect(log, `log leaked ${token}`).not.toContain(token);
      expect(text, `response leaked ${token}`).not.toContain(token);
    }
    expect(log).toContain("non-Error");
    expect(log).toContain("Object"); // constructorName — safe metadata
  });

  it("does not enumerate properties of a class instance or an array", async () => {
    const spy = captureLog();

    class PatientRecord {
      constructor(readonly medications: string[]) {}
    }
    await handle(throwing(new PatientRecord(["levothyroxine 75mcg"])));
    await handle(throwing([SENSITIVE_PAYLOAD]));

    const log = loggedText(spy);
    // Shape is recorded...
    expect(log).toContain("PatientRecord");
    expect(log).toContain("array");
    // ...contents are not.
    expect(log).not.toContain("levothyroxine");
    expect(log).not.toContain("medications");
  });
});

describe("S2 — a thrown string reaches neither the client nor the log", () => {
  // Decision: raw thrown strings are NOT logged, only their type. A string is
  // the most common non-Error throw and is exactly as attacker-shaped as any
  // other payload — a rejected query, a token, a serialized row. This repository
  // has no approved redaction mechanism (grep: no redact/mask/scrub helper
  // anywhere in src/), so there is nothing to safely filter it through.
  it("records the type but not the value", async () => {
    const spy = captureLog();

    const { text, json } = await readBody(await handle(throwing(SECRET_MESSAGE)));
    const log = loggedText(spy);

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(log).toContain("non-Error");
    expect(log).toContain("string");
    for (const fragment of SECRET_FRAGMENTS) {
      expect(log, `log leaked ${fragment}`).not.toContain(fragment);
      expect(text, `response leaked ${fragment}`).not.toContain(fragment);
    }
  });
});

describe("S3 — hostile inspection hooks are never invoked", () => {
  it("leaves toString, toJSON, valueOf, and Symbol.toStringTag untouched", async () => {
    const spy = captureLog();

    const toString = vi.fn(() => SECRET_MESSAGE);
    const toJSON = vi.fn(() => SENSITIVE_PAYLOAD);
    const valueOf = vi.fn(() => SECRET_MESSAGE);
    const toStringTag = vi.fn(() => "Leak");
    const secretGetter = vi.fn(() => {
      throw new Error("getter exploded with hunter2-do-not-log");
    });

    const hostile = { toString, toJSON, valueOf };
    Object.defineProperty(hostile, Symbol.toStringTag, { get: toStringTag });
    Object.defineProperty(hostile, "password", { enumerable: true, get: secretGetter });

    const { text, json } = await readBody(await handle(throwing(hostile)));

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();
    expect(spy).toHaveBeenCalled();

    // Not "the hook threw and we caught it" — the hook is never reached at all.
    expect(toString).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(valueOf).not.toHaveBeenCalled();
    expect(toStringTag).not.toHaveBeenCalled();
    expect(secretGetter).not.toHaveBeenCalled();

    const log = loggedText(spy);
    for (const token of [...SENSITIVE_TOKENS, ...SECRET_FRAGMENTS, "Leak"]) {
      expect(log, `log leaked ${token}`).not.toContain(token);
      expect(text, `response leaked ${token}`).not.toContain(token);
    }
  });
});

describe("S4 — an unsafe Error cause is reduced to type metadata", () => {
  it("keeps the outer Error diagnosable while disclosing nothing about the cause", async () => {
    const spy = captureLog();

    const err = new Error("stack item insert failed", { cause: { ...SENSITIVE_PAYLOAD } });
    err.name = "RepositoryError";

    const { text, json } = await readBody(await handle(throwing(err)));
    const log = loggedText(spy);

    // The outer Error stays fully available server-side.
    expect(log).toContain("RepositoryError");
    expect(log).toContain("stack item insert failed");
    expect(log).toContain("respond.test.ts"); // its stack
    // Non-disclosure is asserted before the shape metadata, so a regression that
    // serializes the cause fails on the leak itself rather than on a missing
    // field — the diagnostic should name the defect, not a side effect of it.
    for (const token of SENSITIVE_TOKENS) {
      expect(log, `log leaked ${token}`).not.toContain(token);
      expect(text, `response leaked ${token}`).not.toContain(token);
    }
    // The cause is present as shape only.
    expect(log).toContain("Object");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
  });
});

describe("S5 — a nested Error cause is summarized, not traversed", () => {
  it("records name and message but no custom properties and no deeper chain", async () => {
    const spy = captureLog();

    const root = new Error("root cause: connection reset");
    Object.assign(root, { query: "select * from lab_markers", token: "sk-live-do-not-log" });
    const middle = new Error("middle cause: retry exhausted", { cause: root });
    const outer = new Error("outer failure", { cause: middle });

    const { text } = await readBody(await handle(throwing(outer)));
    const log = loggedText(spy);

    expect(log).toContain("outer failure");
    expect(log).toContain("middle cause: retry exhausted");
    // Exactly one level. The grandparent is never reached, so an arbitrarily
    // long — or cyclic — chain cannot be walked.
    expect(log).not.toContain("root cause: connection reset");
    // Custom properties hung off an Error are not part of the allowed field set.
    expect(log).not.toContain("select * from lab_markers");
    expect(log).not.toContain("sk-live-do-not-log");
    expect(text).not.toContain("middle cause");
  });

  it("terminates on a cyclic cause chain instead of recursing", async () => {
    const spy = captureLog();

    // a <-> b form a cycle, and the thrown error sits above it. Depth 1 is `a`;
    // a single step further would reach `b` and then loop forever.
    const a = new Error("cycle A");
    const b = new Error("cycle B", { cause: a });
    Object.defineProperty(a, "cause", { value: b, writable: true });
    const thrown = new Error("outer cyclic failure", { cause: a });

    const { json } = await readBody(await handle(throwing(thrown)));
    const log = loggedText(spy);

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(log).toContain("outer cyclic failure");
    expect(log).toContain("cycle A");
    // Never reached — so the cycle is unreachable by construction, not by a
    // visited-set or a depth counter that could be tuned wrong later.
    expect(log).not.toContain("cycle B");
  });
});

// ------------------------------------------------------------------- T4 ------

describe("T4 — intentionally handled errors keep their public behavior", () => {
  it("maps a ZodError to the unchanged 400 envelope, with no correlation id", async () => {
    const schema = z.object({ dose: z.number() });
    const res = await handle(async () => {
      schema.parse({ dose: "not a number" });
      throw new Error("unreachable");
    });
    const { json } = await readBody(res);

    expect(res.status).toBe(400);
    expect(json.error?.code).toBe("VALIDATION_ERROR");
    expect(json.error?.message).toBe("Invalid input.");
    expect(json.error?.details).toBeTruthy();
    // Correlation ids identify a logged internal exception. A rejected input is
    // not one, so attaching an id would imply a server fault that did not occur.
    expect(json.error?.correlationId).toBeUndefined();
  });

  it("leaves the direct helpers untouched", async () => {
    const unauth = await readBody(unauthorized());
    expect(unauth.json.error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    expect(unauth.json.error?.correlationId).toBeUndefined();

    const missing = await readBody(notFound("Stack"));
    expect(missing.json.error).toMatchObject({
      code: "NOT_FOUND",
      message: "Stack not found.",
    });
    expect(missing.json.error?.correlationId).toBeUndefined();

    const invalid = await readBody(
      validationError(z.object({ a: z.string() }).safeParse({}).error!),
    );
    expect(invalid.json.error?.code).toBe("VALIDATION_ERROR");
    expect(invalid.json.error?.correlationId).toBeUndefined();
  });

  it("passes a successful handler through unchanged", async () => {
    const spy = captureLog();
    const { NextResponse } = await import("next/server");
    const res = await handle(async () =>
      NextResponse.json({ data: { id: "s1" }, error: null }, { status: 200 }),
    );

    expect(res.status).toBe(200);
    expect((await readBody(res)).json.data).toEqual({ id: "s1" });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------- T5 ------

describe("T5 — NOT_CONFIGURED keeps its evidence-backed 503 contract", () => {
  // Decision (R3): unchanged. Every "not configured" throw site in this repo
  // raises hand-authored operational text naming only public variable names —
  // src/lib/supabase/env.ts, src/lib/advisor/claude-adapter.ts,
  // src/lib/lab-import/pdf-adapter.ts. None carries a secret value, path, host,
  // or driver text. These cases pin the exact strings so a future edit to any
  // of them is a deliberate, reviewed change to a public API message.
  it.each([
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    "API_ANTHROPIC_KEY not configured",
  ])("returns 503 NOT_CONFIGURED with the authored message: %s", async (message) => {
    const spy = captureLog();
    const res = await handle(throwing(new Error(message)));
    const { json } = await readBody(res);

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.message).toBe(message);
    // A configuration gap is a known operational state, not an unexpected
    // exception: no id is minted and nothing is written to the error log.
    expect(json.error?.correlationId).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("carries no secret value, absolute path, or host in those messages", async () => {
    for (const message of [
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
      "API_ANTHROPIC_KEY not configured",
    ]) {
      const { text } = await readBody(await handle(throwing(new Error(message))));
      expect(text).not.toMatch(/password|secret|sk-|eyJ|\/Users\/|postgres:\/\//i);
    }
  });
});

// ------------------------------------------------------------------- T6 ------

describe("T6 — correlation ids are unique and unpredictable in production", () => {
  it("mints a different id for each unexpected exception", async () => {
    captureLog();

    const ids = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      const { json } = await readBody(await handle(throwing(new Error("boom"))));
      ids.add(json.error?.correlationId ?? "");
    }

    expect(ids.size).toBe(25);
    expect(ids.has("")).toBe(false);
  });

  it("uses the platform CSPRNG rather than a counter or a timestamp", async () => {
    captureLog();
    const spy = vi.spyOn(crypto, "randomUUID");

    const { json } = await readBody(await handle(throwing(new Error("boom"))));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(json.error?.correlationId).toBe(spy.mock.results[0]!.value);
    // A v4 UUID's variant/version nibbles — a counter or Date.now() has neither.
    expect(json.error?.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

// ------------------------------------------------------------------- T7 ------

describe("T7 / S6 — a failing logger does not degrade the response", () => {
  it("still returns the safe generic 500 when console.error throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("log transport unavailable");
    });

    const res = await handle(throwing(new Error(SECRET_MESSAGE)));
    const { text, json } = await readBody(res);

    expect(res.status).toBe(500);
    expect(json.error?.code).toBe("INTERNAL_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();
    for (const fragment of SECRET_FRAGMENTS) {
      expect(text).not.toContain(fragment);
    }
    expect(text).not.toContain("log transport unavailable");
  });

  it("survives an exception whose own properties throw when read", async () => {
    const spy = captureLog();

    const hostile = new Error("outer");
    Object.defineProperty(hostile, "stack", {
      get() {
        throw new Error("stack getter exploded");
      },
    });

    // internalError() is exercised directly: handle() would reach the same code,
    // but this pins the contract of the exported boundary helper itself.
    const { text, json } = await readBody(internalError(hostile));

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();
    expect(text).not.toContain("stack getter exploded");
    // An id the client can quote is worthless without a log entry to join it
    // to, so an unreadable exception must still produce a record.
    const log = loggedText(spy);
    expect(log).toContain(json.error!.correlationId!);
    expect(log).toContain("unreadable");
  });
});
