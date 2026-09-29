// Application — the allowlist between an internal failure and the server log
// (Phase 4 U15, ruling D-7 (d); closes N-40 and FU-41 as narrowed).
//
// WHY AN ALLOWLIST AND NOT A SCRUBBER. N-40 was structural: `respond.ts` wrote
// `err.message`, `err.stack` and one level of `err.cause` verbatim, so any error
// raised on a health-bearing path (the export route carries medications,
// conditions and lab values) could carry that data into a log line. A scrubber
// has to recognise a supplement name, a dose or a lab value to remove it, and a
// value it does not recognise passes. An allowlist does not need to recognise
// anything: a field not named below is never read into the record at all.
//
// THE ALLOWLIST IS THE OWNER'S, verbatim (2026-09-29): error class name, error
// code, HTTP status, route pattern, request id. Messages, stacks, causes, bodies,
// query strings, headers, Supabase error details and every user-supplied value
// are dropped. `REDACTED_LOG_FIELDS` is pinned as an equality by
// `five-xx-is-logged.test.ts`, so changing it is a red build, not a quiet edit.
//
// PURE. No I/O, no console, no clock, no randomness. The one `console.error`
// that writes this record lives in `respond.ts`, and FIVE_XX_IS_LOGGED fails any
// console call there (or in `src/middleware.ts`) whose sole argument is not a
// call to `redactErrorLog`.

/** The owner's allowlist, as record keys. Pinned by FIVE_XX_IS_LOGGED. */
export const REDACTED_LOG_FIELDS = ["errorClass", "code", "status", "route", "requestId"] as const;

export interface ErrorLogInput {
  /** The thrown value. Only its class name is ever read from it. */
  thrown: unknown;
  /** The envelope code — a literal at every call site, never error text. */
  code: string;
  /** The HTTP status answered, when there is one (an SSE stream has none). */
  status?: number;
  /** A route PATTERN such as `/api/stacks/[id]` — never the requested URL. */
  route?: string;
  /** The correlation id handed to the client. */
  requestId: string;
}

export interface RedactedErrorRecord {
  errorClass: string;
  code: string;
  status?: number;
  route?: string;
  requestId: string;
}

// Shape bounds. Each field is a fixed vocabulary or a generated id, so anything
// outside its shape is replaced by a sentinel rather than passed through.
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;
const ROUTE_SEGMENT = /^(?:[A-Za-z0-9_.-]+|\[{1,2}(?:\.\.\.)?[A-Za-z0-9_]+\]{1,2})$/;
const ID_LIKE_SEGMENT = /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * The thrown value's class name, read off the prototype chain — never
 * `err.name`, which is an instance field and can hold anything. No accessor on
 * the value itself is touched; a hostile prototype costs the name, not the log.
 */
function errorClassOf(thrown: unknown): string {
  if (thrown === null) return "null";
  const type = typeof thrown;
  if (type !== "object" && type !== "function") return type;
  try {
    const name = (Object.getPrototypeOf(thrown) as { constructor?: { name?: unknown } } | null)
      ?.constructor?.name;
    return typeof name === "string" && IDENTIFIER.test(name) ? name : "unknown";
  } catch {
    return "unknown";
  }
}

/** A pattern, not a URL: no query, no fragment, no escapes, no concrete id segment. */
function routePatternOf(route: unknown): string | undefined {
  if (typeof route !== "string" || route.length === 0 || route.length > 200) return undefined;
  if (!route.startsWith("/")) return undefined;
  const segments = route.slice(1).split("/");
  if (route === "/") return route;
  return segments.every((s) => ROUTE_SEGMENT.test(s) && !ID_LIKE_SEGMENT.test(s)) ? route : undefined;
}

/**
 * Reduces an internal failure to the allowlisted record. Never throws: every
 * read is of a field this function was handed, and the one read off the thrown
 * value is guarded.
 */
export function redactErrorLog(input: ErrorLogInput): RedactedErrorRecord {
  const record: RedactedErrorRecord = {
    errorClass: errorClassOf(input.thrown),
    code: typeof input.code === "string" && CODE.test(input.code) ? input.code : "INVALID_CODE",
    requestId:
      typeof input.requestId === "string" && REQUEST_ID.test(input.requestId)
        ? input.requestId
        : "invalid",
  };
  if (Number.isInteger(input.status) && input.status! >= 100 && input.status! <= 599) {
    record.status = input.status;
  }
  const route = routePatternOf(input.route);
  if (route !== undefined) record.route = route;
  return record;
}
