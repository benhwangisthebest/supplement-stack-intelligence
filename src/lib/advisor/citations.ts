// Domain layer — PURE. Aggregate provenance from the turn's tool results.
// Design Ref: §3.2, §5.1 — every assistant answer carries Citation[]; the UI
// renders them as provenance chips. Plan SC-5.
import type { Citation, ToolResult } from "@/types/advisor";

/** Stable identity for de-duplication: a citation is the same if kind+refId match. */
function key(c: Citation): string {
  return `${c.kind}::${c.refId}`;
}

/**
 * Flatten and de-duplicate citations across all tool results from a turn,
 * preserving first-seen order (which mirrors the order the model gathered them).
 * Only `ok` results contribute provenance — refusals carry none.
 */
export function buildCitations(results: ToolResult[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const c of r.citations) {
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/** True when no tool result this turn produced any grounding (drives refusal). */
export function hasNoGrounding(results: ToolResult[]): boolean {
  return results.length === 0 || results.every((r) => !r.ok);
}
