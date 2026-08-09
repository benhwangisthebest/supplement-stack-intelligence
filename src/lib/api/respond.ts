// Application — shared API response envelope + error mapping (Design §4, §6.2).
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotConfiguredError } from "./errors";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  /**
   * Present only on unexpected-exception 500s. It is an opaque random id with no
   * internal meaning — safe to render, quote in a support ticket, or paste into
   * an incident report. The matching server log holds the real exception.
   */
  correlationId?: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * The only client-facing text an unexpected exception may produce. Stable by
 * design: it must never vary with the underlying error, because the whole point
 * of CLAUDE.md §2.3 rule 13 is that the client learns nothing from it.
 */
export const INTERNAL_ERROR_MESSAGE = "An unexpected internal error occurred.";

export function ok<T>(data: T, status = 200): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  correlationId?: string,
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    { data: null, error: { code, message, details, correlationId } },
    { status },
  );
}

export const unauthorized = () =>
  fail("UNAUTHORIZED", "Authentication required.", 401);

export const notFound = (what = "Resource") =>
  fail("NOT_FOUND", `${what} not found.`, 404);

export const validationError = (err: ZodError) =>
  fail("VALIDATION_ERROR", "Invalid input.", 400, {
    fieldErrors: err.flatten().fieldErrors,
  });

/**
 * The thrown value's constructor name, read off the prototype chain rather than
 * off the instance. `value.constructor` would fire an own accessor on a hostile
 * object; `getPrototypeOf` does not.
 */
function constructorName(value: object): string | undefined {
  try {
    const name = (Object.getPrototypeOf(value) as { constructor?: { name?: unknown } } | null)
      ?.constructor?.name;
    return typeof name === "string" && name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Type metadata for an arbitrary value — deliberately never its contents.
 *
 * A thrown value can be anything the throw site had in scope: a request body, a
 * Supabase row, a lab-result payload, an object holding an authorization header.
 * Recording its *shape* is enough to find the throw site; recording its *value*
 * would move exactly the material CLAUDE.md §2.3 rules 13 and 15 protect into a
 * log line. So: no property enumeration, no `String()`, no `JSON.stringify`, and
 * no `toString`/`toJSON`/`valueOf`/`Symbol.toStringTag` — every one of those is
 * attacker-controlled code on an attacker-shaped object.
 *
 * `Object.prototype.toString.call()` is deliberately NOT used here: it invokes
 * the `Symbol.toStringTag` getter, which is one of those hooks.
 */
function describeValue(value: unknown): Record<string, unknown> {
  if (value === null) return { valueType: "null" };
  const type = typeof value;
  // Primitives are reported by type alone. A thrown string is the common case,
  // and its content is exactly as untrustworthy as any other payload — this
  // repository has no approved redaction mechanism, so nothing is recorded.
  if (type !== "object" && type !== "function") return { valueType: type };
  // Array.isArray sees through a Proxy without triggering a trap.
  if (Array.isArray(value)) return { valueType: "array", constructorName: constructorName(value) };
  return { valueType: type, constructorName: constructorName(value as object) };
}

/**
 * Summarizes `err.cause` one level deep and stops.
 *
 * An Error cause contributes its name, message, and stack — the same fields the
 * top-level Error is allowed to contribute, and nothing custom. Any other cause
 * is type metadata only. The chain is deliberately not followed: `cause.cause`
 * is never read, so a long or cyclic chain cannot be traversed at all.
 */
function describeCause(cause: unknown): Record<string, unknown> | undefined {
  if (cause === undefined) return undefined;
  if (cause instanceof Error) {
    return {
      valueType: "Error",
      name: safeRead(() => cause.name),
      message: safeRead(() => cause.message),
      stack: safeRead(() => cause.stack),
    };
  }
  return describeValue(cause);
}

/** One guarded property read. A hostile accessor yields `undefined`, never a throw. */
function safeRead<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/**
 * Writes the complete internal exception to the server log under `correlationId`.
 *
 * Scope is deliberately narrow, and structurally so: this boundary is handed the
 * thrown value and nothing else — no Request, no body, no headers, no cookies,
 * no profile or health payload — so there is no sensitive request data here to
 * leak even by accident (CLAUDE.md §2.3 rules 13, 15).
 *
 * This is not an observability framework. It is the one place the real error is
 * allowed to exist, paired with the id the client was given.
 */
function logInternalError(correlationId: string, err: unknown, code: string): void {
  // Reading the exception is guarded, not just the write: `err` is an arbitrary
  // thrown value and a getter on `stack` or `cause` can itself throw. Extracting
  // unguarded would let that escape and take down the very response this
  // function exists to protect — and, worse, would emit a correlation id the
  // client can quote with no log entry to join it to.
  let detail: Record<string, unknown>;
  try {
    if (err instanceof Error) {
      // Each field is read independently, so one hostile accessor costs that
      // one field instead of the whole record. `unreadable` names what was lost
      // — silently dropping it would make a booby-trapped error look ordinary.
      const unreadable: string[] = [];
      const field = <T>(name: string, read: () => T): T | undefined => {
        try {
          return read();
        } catch {
          unreadable.push(name);
          return undefined;
        }
      };
      detail = {
        thrownType: "Error",
        name: field("name", () => err.name),
        message: field("message", () => err.message),
        stack: field("stack", () => err.stack),
        cause: field("cause", () => describeCause(err.cause)),
      };
      if (unreadable.length > 0) detail.unreadable = unreadable;
    } else {
      // A non-Error throw has no name, message, or stack. Recording *that*, plus
      // the value's shape, is the whole diagnostic — the value itself is never
      // copied, because nothing here knows what it holds.
      detail = { thrownType: "non-Error", ...describeValue(err) };
    }
  } catch {
    detail = { thrownType: "unreadable" };
  }

  try {
    // The id appears in the plain-text prefix as well as the structured record,
    // so it is greppable in aggregators that do not parse the object argument.
    console.error(`[api] ${code} ${correlationId}`, {
      event: "api.internal_error",
      correlationId,
      code,
      ...detail,
    });
  } catch {
    // A failing logger must never turn into a failing response, and must never
    // be a reason to fall back to returning the raw error to the client.
  }
}

/**
 * Maps an unexpected exception to the only safe 500: a fixed generic message
 * plus a fresh correlation id, with the real error going to the server log.
 *
 * `crypto.randomUUID()` is the platform CSPRNG present in both the Node and Edge
 * runtimes, so it needs no dependency and no runtime-specific branch. Every
 * route reaching this code runs on the default Node runtime today.
 */
export function internalError(
  err: unknown,
  options: { code?: string; details?: unknown } = {},
): NextResponse<ApiEnvelope<never>> {
  const code = options.code ?? "INTERNAL_ERROR";
  return fail(
    code,
    INTERNAL_ERROR_MESSAGE,
    500,
    options.details,
    reportInternalError(err, code),
  );
}

/**
 * Logs an unexpected exception and returns the correlation id to hand the client.
 *
 * Split out of `internalError` for callers that are already committed to a
 * response body a `NextResponse` cannot express — today that is the advisor's SSE
 * stream, which must emit an `error` event rather than a status code. There is
 * deliberately no way to supply the client message: it is always
 * INTERNAL_ERROR_MESSAGE, so no call site can reopen the disclosure by passing
 * `err.message` through.
 */
export function reportInternalError(err: unknown, code = "INTERNAL_ERROR"): string {
  const correlationId = crypto.randomUUID();
  logInternalError(correlationId, err, code);
  return correlationId;
}

/**
 * Wraps a handler with uniform error handling:
 * ZodError -> 400, NotConfiguredError -> 503, anything else -> 500.
 *
 * A bare `Error` whose text merely mentions "not configured" is NOT a 503 —
 * that was Phase 2 U1's declared behaviour change. It is an unexpected
 * exception like any other: 500, generic message, correlation id.
 *
 * The catch-all deliberately does NOT read `err.message`. It previously returned
 * it verbatim, so any driver, filesystem, or provider error text reached the
 * client — and 17 call sites across 15 files (14 components plus the
 * useLabImport hook) render `error.message` directly. See Phase 0 finding C-8.
 */
export async function handle<T>(
  fn: () => Promise<NextResponse<ApiEnvelope<T>>>,
): Promise<NextResponse<ApiEnvelope<T>> | NextResponse<ApiEnvelope<never>>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    if (err instanceof NotConfiguredError) {
      // Phase 2 U1. This replaced `err.message.includes("not configured")` —
      // a substring test over text the boundary does not own. Any dependency,
      // driver, or provider whose error happened to contain that phrase was
      // routed to a 503 and had its raw message returned to the client; the
      // class makes the 503 something a throw site OPTS IN to.
      //
      // `publicMessage`, not `message`: the field is client-safe by
      // construction and by name, and reading it is not a read of error text,
      // so error-disclosure needs no allowlist entry for this line. See
      // ./errors.ts.
      return fail("NOT_CONFIGURED", err.publicMessage, 503);
    }
    return internalError(err);
  }
}
