// Application — shared API response envelope + error mapping (Design §4, §6.2).
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiError | null;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json({ data: null, error: { code, message, details } }, { status });
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
 * Wraps a handler with uniform error handling:
 * ZodError -> 400, Error('not configured') -> 503, anything else -> 500.
 */
export async function handle<T>(
  fn: () => Promise<NextResponse<ApiEnvelope<T>>>,
): Promise<NextResponse<ApiEnvelope<T>> | NextResponse<ApiEnvelope<never>>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    if (err instanceof Error && err.message.includes("not configured")) {
      return fail("NOT_CONFIGURED", err.message, 503);
    }
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
