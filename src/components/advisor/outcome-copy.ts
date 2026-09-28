// Presentation helper — fills the confirm surface's outcome sentences (Phase 4 U10).
// The strings arrive as props from the server page (src/lib/safety's
// advisorOutcomeCopy, CLAUDE.md §4 rule 7); this module only reads the confirm
// route's error envelope and substitutes numbers.

/** The advisor outcome copy the panel receives from its server page. */
export interface AdvisorOutcomeCopy {
  partiallyApplied: string;
  aborted: string;
}

/**
 * The PARTIALLY_APPLIED sentence for a confirm response, or null if the response
 * is not one. Only `reverted` and `unreverted` are read, and only as non-negative
 * integers: under D-14 (a) nothing else in `details` may reach the screen, even if
 * a future server change put more there.
 */
export function partiallyAppliedText(template: string, envelope: unknown): string | null {
  const error = (envelope as { error?: { code?: unknown; details?: unknown } } | null)?.error;
  if (error?.code !== "PARTIALLY_APPLIED") return null;
  const d = error.details as { reverted?: unknown; unreverted?: unknown } | undefined;
  const reverted = count(d?.reverted);
  const unreverted = count(d?.unreverted);
  if (reverted === null || unreverted === null) return null;
  return template
    .replace("{reverted}", String(reverted))
    .replace("{unreverted}", String(unreverted));
}

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}
