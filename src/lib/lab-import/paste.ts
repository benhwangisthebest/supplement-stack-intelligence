// Domain layer — PURE deterministic paste-table parser (Design §11.1). No I/O.
// Plan SC-2: pasted table + explicit column map → review candidates.
// Unlike CSV, the caller supplies the column map (no header inference); rows are
// whitespace/comma/tab-delimited. Pure & deterministic.
import { normalizeMarker } from "@/lib/biomarkers";
import type { ParsedMarkerCandidate } from "@/types/lab";
import type { ColumnMap } from "./schema";

/** Split a pasted row on tab, comma, or runs of spaces. */
function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  if (line.includes(",")) return line.split(",").map((c) => c.trim());
  return line.split(/\s{2,}|\s+(?=\S)/).map((c) => c.trim());
}

function parseNumber(cell: string | undefined): number | null {
  if (cell == null) return null;
  const cleaned = cell.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function at(cells: string[], i: number | null): string | undefined {
  return i === null ? undefined : cells[i];
}

/**
 * Parse pasted text using an explicit column map. Each non-empty line becomes a
 * candidate when it has a label, a numeric value, and a unit. Rows that don't
 * are skipped (never guessed).
 */
export function parsePaste(
  text: string,
  columnMap: ColumnMap,
): ParsedMarkerCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: ParsedMarkerCandidate[] = [];
  for (const line of lines) {
    const cells = splitRow(line);
    const rawLabel = at(cells, columnMap.marker)?.trim();
    const value = parseNumber(at(cells, columnMap.value));
    const unit = at(cells, columnMap.unit)?.trim();
    if (!rawLabel || value === null || !unit) continue;

    const biomarkerId = normalizeMarker(rawLabel);
    out.push({
      rawLabel,
      value,
      unit,
      referenceLow: parseNumber(at(cells, columnMap.referenceLow)),
      referenceHigh: parseNumber(at(cells, columnMap.referenceHigh)),
      biomarkerId,
      confidence: biomarkerId ? "high" : "low",
    });
  }
  return out;
}
