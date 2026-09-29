// Guardrail for the shared API error boundary — Phase 0 closeout finding C-8.
//
// `handle()` is the single trust boundary between an unexpected server exception
// and the HTTP response. It used to return `err.message` verbatim on a 500, so a
// Postgres connection string, a filesystem path, or a provider error reached the
// client — and 17 call sites across 15 files (14 components plus the useLabImport
// hook) render `error.message` straight into the page.
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
  reportInternalError,
  unauthorized,
  validationError,
  type ApiEnvelope,
} from "./respond";
import { AI_SERVICE_NOT_CONFIGURED, NotConfiguredError } from "./errors";
import { REDACTED_LOG_FIELDS, type RedactedErrorRecord } from "./redact";
import { getSupabaseEnv } from "@/lib/supabase/env";

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

/**
 * Every record the boundary wrote, each asserted to be the allowlisted shape
 * (Phase 4 U15, D-7 (d)): one argument per console.error call, and no key
 * outside `REDACTED_LOG_FIELDS`. Before U15 the log held the exception's
 * message, stack and cause; the rewritten tests below say so where they flip.
 */
function loggedRecords(spy: ReturnType<typeof captureLog>): RedactedErrorRecord[] {
  return spy.mock.calls.map((args) => {
    expect(args, "one argument: the redacted record").toHaveLength(1);
    const record = args[0] as RedactedErrorRecord;
    for (const key of Object.keys(record)) {
      expect(REDACTED_LOG_FIELDS as readonly string[], `${key} is not an allowlisted field`).toContain(key);
    }
    return record;
  });
}

/** The one record a single failure wrote. */
function loggedRecord(spy: ReturnType<typeof captureLog>): RedactedErrorRecord {
  expect(spy, "the failure must still be logged, exactly once").toHaveBeenCalledTimes(1);
  return loggedRecords(spy)[0];
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
    // [U15, D-7 (d)] The log holds the allowlisted record under that id — and
    // not the error text, which before U15 was "allowed to live" here.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: FIRST });
    for (const fragment of SECRET_FRAGMENTS) expect(log, `log leaked ${fragment}`).not.toContain(fragment);
    // ...and the response is where it is not.
    expect(text).not.toContain(SECRET_MESSAGE);
  });

  it("logs the class and the id, and drops the name, message, stack, and cause (U15)", async () => {
    const spy = captureLog();

    const cause = new Error("underlying driver socket reset");
    const err = new Error("query failed", { cause });
    err.name = "DatabaseError";

    const { text, json } = await readBody(await handle(throwing(err)));
    const log = loggedText(spy);

    // [U15] Before: the instance name, the message, the cause and the stack were
    // all logged. Now the class comes off the prototype (an instance `name` can
    // hold anything), and the rest is dropped.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    for (const dropped of ["DatabaseError", "query failed", "underlying driver socket reset", "respond.test.ts"]) {
      expect(log, `log kept ${dropped}`).not.toContain(dropped);
    }
    expect(text).not.toContain("driver socket reset");
  });
});

// ------------------------------------------------------------------- T3 ------

describe("T3 — a non-Error throw is handled without stringifying it to the client", () => {
  it.each([
    ["a string", "postgres password=do-not-return", "string"],
    ["an object", { password: "do-not-return", host: "/Users/example/internal.sock" }, "Object"],
    ["a number", 42, "number"],
    ["null", null, "null"],
    ["undefined", undefined, "undefined"],
  ])("returns the safe 500 when %s is thrown", async (_label, value, errorClass) => {
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
    // [U15] It says so in `errorClass` (a primitive's type, `null`, or a plain
    // object's `Object`), where the "non-Error" marker used to sit; the value
    // itself is dropped.
    expect(loggedRecord(spy)).toEqual({ errorClass: errorClass, code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    expect(loggedText(spy)).not.toContain("do-not-return");
    expect(loggedText(spy)).not.toContain("internal.sock");
  });

  it("records the thrown value's type in the log", async () => {
    const spy = captureLog();
    const { json } = await readBody(await handle(throwing({ password: "do-not-return" })));
    // [U15] The type is the record's class; the value and its keys are dropped.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Object", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    expect(loggedText(spy)).not.toContain("do-not-return");
    expect(loggedText(spy)).not.toContain("password");
  });
});

// ------------------------------------- R3b: routes that never reach handle() --
//
// Three catch sites — two in advisor/actions `POST`, one in undo — returned
// `err.message` in a 500, and a fourth streamed it into an SSE `error` event:
// four sites across three handler functions. All bypass `handle()`, so R3's fix
// did not reach them. They keep their public codes — the shared boundary now
// supplies the safe message and the id.

describe("R3b — internalError serves callers that own their error mapping", () => {
  it("keeps a caller's public code and details while hiding the exception", async () => {
    const spy = captureLog();

    const res = internalError(new Error(SECRET_MESSAGE), {
      code: "ACTION_ERROR",
      details: { rolledBack: true },
    });
    const { text, json } = await readBody(res);

    expect(res.status).toBe(500);
    expect(json.error?.code).toBe("ACTION_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toBeTruthy();
    // `rolledBack` is a computed fact the client acts on, not error text.
    expect(json.error?.details).toEqual({ rolledBack: true });
    for (const fragment of SECRET_FRAGMENTS) {
      expect(text, `response leaked ${fragment}`).not.toContain(fragment);
    }
    // The caller's code is what gets logged, so a log line maps to a call site.
    expect(loggedText(spy)).toContain("ACTION_ERROR");
  });

  it("defaults to INTERNAL_ERROR with no details", async () => {
    captureLog();
    const { json } = await readBody(internalError(new Error("boom")));
    expect(json.error?.code).toBe("INTERNAL_ERROR");
    expect(json.error?.details).toBeUndefined();
  });

  it("reportInternalError logs and returns an id for already-streaming responses", async () => {
    const spy = captureLog();

    const id = reportInternalError(new Error(SECRET_MESSAGE), "ADVISOR_ERROR");

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const log = loggedText(spy);
    // [U15] An SSE stream has no status, so the record carries none; the
    // message, which before U15 "belonged" in the log, is dropped.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "ADVISOR_ERROR", requestId: id });
    for (const fragment of SECRET_FRAGMENTS) expect(log, `log leaked ${fragment}`).not.toContain(fragment);
  });

  it("ignores a caller-supplied message option instead of honouring it", async () => {
    captureLog();

    // Behavioural, not structural. An earlier version of this test asserted
    // `internalError.length === 1` under the claim "the signature is the guard".
    // `Function.length` stops counting at the first defaulted parameter, so
    // adding `options.message` — the exact reintroduction — leaves it at 1: the
    // assertion could not go red against the defect it named (CLAUDE.md §5.2).
    // This smuggles the option in through the type system and checks the wire.
    const SMUGGLED = "SMUGGLED_INTERNAL_TEXT";
    const res = internalError(new Error(SECRET_MESSAGE), {
      code: "UNDO_ERROR",
      message: SMUGGLED,
    } as unknown as { code?: string; details?: unknown });
    const { text, json } = await readBody(res);

    expect(json.error?.code).toBe("UNDO_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(text).not.toContain(SMUGGLED);
    for (const fragment of SECRET_FRAGMENTS) {
      expect(text, `response leaked ${fragment}`).not.toContain(fragment);
    }
  });

  it("ignores a smuggled message on reportInternalError too", async () => {
    const spy = captureLog();

    const SMUGGLED = "SMUGGLED_STREAM_TEXT";
    // reportInternalError returns only an id, so the sole way a message could
    // reach a client is if the helper grew a third parameter that a caller then
    // rendered. Pin the return contract: an id, and nothing else.
    const id = (reportInternalError as unknown as (e: unknown, c?: string, m?: string) => unknown)(
      new Error(SECRET_MESSAGE),
      "ADVISOR_ERROR",
      SMUGGLED,
    );

    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(id).not.toContain(SMUGGLED);
    // The smuggled text must not become part of the record's public code either.
    expect(loggedText(spy)).not.toContain(SMUGGLED);
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
    // [U15] The record's class is the only metadata; "non-Error" is what it says.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Object", code: "INTERNAL_ERROR", status: 500, requestId: json.error!.correlationId! });
  });

  it("does not enumerate properties of a class instance or an array", async () => {
    const spy = captureLog();

    class PatientRecord {
      constructor(readonly medications: string[]) {}
    }
    await handle(throwing(new PatientRecord(["levothyroxine 75mcg"])));
    await handle(throwing([SENSITIVE_PAYLOAD]));

    const log = loggedText(spy);
    // Shape is recorded — as each record's class (U15)...
    expect(loggedRecords(spy).map((r) => r.errorClass)).toEqual(["PatientRecord", "Array"]);
    // ...contents are not.
    expect(log).not.toContain("levothyroxine");
    expect(log).not.toContain("medications");
  });
});

describe("S2 — a thrown string reaches neither the client nor the log", () => {
  // Decision: raw thrown strings are NOT logged, only their type. A string is
  // the most common non-Error throw and is exactly as attacker-shaped as any
  // other payload — a rejected query, a token, a serialized row. [U15] The
  // repository now has a redaction layer (`./redact.ts`), and it keeps this
  // decision: it is an allowlist, not a filter, so the value is never read.
  it("records the type but not the value", async () => {
    const spy = captureLog();

    const { text, json } = await readBody(await handle(throwing(SECRET_MESSAGE)));
    const log = loggedText(spy);

    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(loggedRecord(spy)).toEqual({ errorClass: "string", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
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

describe("S4 — an unsafe Error cause is dropped, not reduced (U15)", () => {
  it("records the outer Error's class and id while disclosing nothing about it or the cause", async () => {
    const spy = captureLog();

    const err = new Error("stack item insert failed", { cause: { ...SENSITIVE_PAYLOAD } });
    err.name = "RepositoryError";

    const { text, json } = await readBody(await handle(throwing(err)));
    const log = loggedText(spy);

    // [U15] Before: the outer Error's name, message and stack were logged. Now
    // the record is its class (off the prototype) and the id, and nothing else.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    for (const dropped of ["RepositoryError", "stack item insert failed", "respond.test.ts"]) {
      expect(log, `log kept ${dropped}`).not.toContain(dropped);
    }
    // Non-disclosure is asserted before the shape metadata, so a regression that
    // serializes the cause fails on the leak itself rather than on a missing
    // field — the diagnostic should name the defect, not a side effect of it.
    for (const token of SENSITIVE_TOKENS) {
      expect(log, `log leaked ${token}`).not.toContain(token);
      expect(text, `response leaked ${token}`).not.toContain(token);
    }
    // [U15] The cause is not present at all — not even as shape.
    expect(log).not.toContain("Object");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
  });
});

describe("S5 — a nested Error cause is never traversed", () => {
  it("records the class and id, and no message, custom property, or cause at any depth (U15)", async () => {
    const spy = captureLog();

    const root = new Error("root cause: connection reset");
    Object.assign(root, { query: "select * from lab_markers", token: "sk-live-do-not-log" });
    const middle = new Error("middle cause: retry exhausted", { cause: root });
    const outer = new Error("outer failure", { cause: middle });

    const { text, json } = await readBody(await handle(throwing(outer)));
    const log = loggedText(spy);

    // [U15] Before: the outer message and ONE level of cause were logged. Now
    // no level is read, so no chain — long or cyclic — can be walked.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    expect(log).not.toContain("outer failure");
    expect(log).not.toContain("middle cause: retry exhausted");
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
    // [U15] The record, and neither the outer message nor the first cause.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    expect(log).not.toContain("outer cyclic failure");
    expect(log).not.toContain("cycle A");
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
  // Decision (R3): unchanged in substance, retyped by Phase 2 U1. The authored
  // strings still name only public variable names — src/lib/supabase/env.ts,
  // src/lib/advisor/model-adapter.ts, src/lib/lab-import/pdf-adapter.ts —
  // carrying no secret value, path, host, or driver text. What changed is HOW
  // the boundary recognises them: `err.message.includes("not configured")`
  // became `err instanceof NotConfiguredError`, so the 503 is opted into at the
  // throw site rather than inferred from text the boundary does not own.
  //
  // These cases pin the exact strings, so a future edit to any of them is a
  // deliberate, reviewed change to a public API message.
  it.each([
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    AI_SERVICE_NOT_CONFIGURED,
  ])("returns 503 NOT_CONFIGURED with the authored message: %s", async (message) => {
    const spy = captureLog();
    const res = await handle(throwing(new NotConfiguredError(message, "missing-key")));
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
      AI_SERVICE_NOT_CONFIGURED,
    ]) {
      const { text } = await readBody(
        await handle(throwing(new NotConfiguredError(message, "missing-key"))),
      );
      expect(text).not.toMatch(/password|secret|sk-|eyJ|\/Users\/|postgres:\/\//i);
    }
  });

  it("answers 503 on the CLASS, not on the text — an empty message still routes", async () => {
    // The inverse of the pin below, and the reason the class exists: recognition
    // is by type. A NotConfiguredError whose text says nothing about
    // configuration is still a 503; a bare Error that says everything about it
    // is not. Neither could be true under substring dispatch.
    const res = await handle(throwing(new NotConfiguredError("Storage bucket missing.", "missing-key")));
    const { json } = await readBody(res);

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.message).toBe("Storage bucket missing.");
  });

  // ---- Phase 2 U1, DECLARED BEHAVIOUR CHANGE #1 ----------------------------
  it.each([
    ["a bare Error carrying the old magic phrase", "Supabase is not configured."],
    ["a dependency error that merely mentions it", 'pg: SSL is not configured for host db.internal'],
  ])("returns 500, not 503, for %s", async (_label, message) => {
    // BEFORE U1 both of these were 503 with `message` returned verbatim, because
    // `handle()` tested `err.message.includes("not configured")` — a substring
    // of text authored by whoever threw, including third-party code. The second
    // case is why that was a disclosure risk and not merely imprecise: it names
    // an internal host, and the old boundary would have put it on the wire.
    //
    // Now an unconverted throw is an unexpected exception like any other. This
    // pin is what makes the change deliberate rather than absorbed.
    const spy = captureLog();
    const res = await handle(throwing(new Error(message)));
    const { json, text } = await readBody(res);

    expect(res.status).toBe(500);
    expect(json.error?.code).toBe("INTERNAL_ERROR");
    expect(json.error?.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(json.error?.correlationId).toEqual(expect.any(String));
    // The whole point: the authored text does not cross the boundary.
    expect(text).not.toContain("not configured");
    expect(text).not.toContain("db.internal");
    // [U15] Before: "it is not lost — it goes to the log". Now the log holds the
    // record under the same id, and the authored text goes nowhere.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error?.correlationId });
    expect(loggedText(spy)).not.toContain(message);
  });

  it("reaches the 503 from the one throw site that actually gets there", async () => {
    // REACHABILITY, not a restatement of the pins above (CLAUDE.md §5.3). Those
    // construct the error themselves, so they would stay green if every throw
    // site in the repository reverted to a bare `Error` — the guard would be
    // pure unit theatre. This one runs the real production path:
    // `getSupabaseEnv()` with the env unset, inside `handle()`, which is how an
    // unconfigured deployment actually answers a request. Of U1's three
    // converted sites it is the only one that reaches this boundary, so it is
    // the only one whose conversion is observable here.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const spy = captureLog();
    try {
      const res = await handle(async () => {
        getSupabaseEnv();
        throw new Error("unreachable — getSupabaseEnv must have thrown");
      });
      const { json } = await readBody(res);

      expect(res.status).toBe(503);
      expect(json.error?.code).toBe("NOT_CONFIGURED");
      expect(json.error?.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(spy).not.toHaveBeenCalled();
    } finally {
      if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
    }
  });

  it("logs neither a PostgrestError's message nor its details or hint (U34, U15)", async () => {
    // [2026-09-29, U15] The exclusion below is no longer incidental: the log is
    // an allowlist (`./redact.ts`), so `details` and `hint` are dropped with the
    // message, and `console.error(err)` is a red build (LOG_REDACTION). The
    // U34 text is kept as the record of why the test exists.
    // [2026-09-21, U34, from `ecc:security-reviewer`] MAKING AN IMPLICIT
    // EXCLUSION EXPLICIT.
    //
    // `logInternalError` reads `name`, `message`, `stack` and one level of
    // `cause` BY NAME — it never enumerates the thrown object. That is the
    // only reason a PostgrestError's `details` and `hint` stay out of the log,
    // and `@supabase/postgrest-js`'s own doc comment says those fields "often"
    // carry *the offending value, key, or row*. In this application that row
    // is a stack item: supplement, dose, unit, timing, and the free-text
    // `reason` and `notes` where a user plausibly writes a condition or a
    // medication (§2.3 rule 15).
    //
    // So the protection is real and it is INCIDENTAL — nothing would go red if
    // someone "improved" the logger to `console.error(err)` wholesale, or
    // added `details` to the named-field list because it looked useful. This
    // test is that red.
    const spy = captureLog();
    const pgError = Object.assign(new Error("new row violates check constraint"), {
      code: "23514",
      details: "Failing row contains (i1, magnesium, 200, mg, SENTINEL-NOTES-TEXT).",
      hint: "SENTINEL-HINT-TEXT",
    });

    const res = await handle(throwing(pgError));
    const logged = loggedText(spy);

    // Positive first, so this cannot pass by the logging having stopped.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: expect.any(String) });
    // [U15] The message is dropped as well, and the Postgres code with it: the
    // record's `code` is the envelope's, never the thrown value's.
    expect(logged).not.toContain("new row violates check constraint");
    expect(logged).not.toContain("23514");
    expect(res.status).toBe(500);

    expect(logged, "PostgrestError.details reached the log").not.toContain("SENTINEL-NOTES-TEXT");
    expect(logged, "PostgrestError.hint reached the log").not.toContain("SENTINEL-HINT-TEXT");
    expect(logged).not.toContain("Failing row contains");

    // And neither reaches the client, which the generic message already
    // guarantees — asserted anyway, because the two are separate claims.
    const body = await res.text();
    expect(body).not.toContain("SENTINEL");
  });

  it("keeps publicMessage and message identical, so the wire text cannot drift", () => {
    // One constructor parameter sets both. If a later edit lets them diverge,
    // `respond.ts` would answer with text no log or stack trace ever shows.
    const err = new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED, "missing-key");
    expect(err.publicMessage).toBe(AI_SERVICE_NOT_CONFIGURED);
    expect(err.message).toBe(err.publicMessage);
    expect(err.name).toBe("NotConfiguredError");
    expect(err).toBeInstanceOf(Error);
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
    // [U15] Before, the record named the field it lost ("unreadable"). Now
    // nothing the record holds is read off the exception but its class, so the
    // hostile getter is never reached and the record is complete.
    expect(loggedRecord(spy)).toEqual({ errorClass: "Error", code: "INTERNAL_ERROR", status: 500, requestId: json.error!.correlationId! });
    expect(loggedText(spy)).not.toContain("stack getter exploded");
    expect(loggedText(spy)).not.toContain("unreadable");
  });
});
