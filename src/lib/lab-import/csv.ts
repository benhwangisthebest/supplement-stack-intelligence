// Domain layer — PURE deterministic CSV parser (Design §11.1). No I/O.
// Plan SC-1: CSV upload → review candidates without hand-typing.
// Header-driven: tolerant to column order and common header aliases.
import { normalizeMarker } from "@/lib/biomarkers";
import type { ParsedMarkerCandidate } from "@/types/lab";

// Header alias → canonical field. Lowercased/trimmed at match time.
const HEADER_ALIASES: Record<string, keyof FieldIndex> = {
  marker: "marker",
  name: "marker",
  test: "marker",
  analyte: "marker",
  value: "value",
  result: "value",
  unit: "unit",
  units: "unit",
  reflow: "referenceLow",
  referencelow: "referenceLow",
  rangelow: "referenceLow",
  low: "referenceLow",
  refhigh: "referenceHigh",
  referencehigh: "referenceHigh",
  rangehigh: "referenceHigh",
  high: "referenceHigh",
};

interface FieldIndex {
  marker: number;
  value: number;
  unit: number;
  referenceLow: number | null;
  referenceHigh: number | null;
}

/** Split one CSV line, honoring simple double-quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function headerIndex(headerCells: string[]): FieldIndex | null {
  const idx: Partial<FieldIndex> = {
    referenceLow: null,
    referenceHigh: null,
  };
  headerCells.forEach((cell, i) => {
    const key = cell.toLowerCase().replace(/[\s_]+/g, "");
    const field = HEADER_ALIASES[key];
    if (field && idx[field] == null) idx[field] = i;
  });
  if (idx.marker == null || idx.value == null || idx.unit == null) return null;
  return idx as FieldIndex;
}

function parseNumber(cell: string | undefined): number | null {
  if (cell == null) return null;
  const cleaned = cell.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse CSV text → review candidates. Rows missing a numeric value are skipped
 * (never guessed). Returns [] for empty input or an unrecognized header.
 * Pure & deterministic: identical text → identical candidates.
 */
export function parseCsv(text: string): ParsedMarkerCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const fields = headerIndex(splitLine(lines[0]));
  if (!fields) return [];

  const out: ParsedMarkerCandidate[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitLine(lines[r]);
    const rawLabel = cells[fields.marker]?.trim();
    const value = parseNumber(cells[fields.value]);
    const unit = cells[fields.unit]?.trim();
    if (!rawLabel || value === null || !unit) continue;

    const biomarkerId = normalizeMarker(rawLabel);
    out.push({
      rawLabel,
      value,
      unit,
      referenceLow:
        fields.referenceLow === null ? null : parseNumber(cells[fields.referenceLow]),
      referenceHigh:
        fields.referenceHigh === null ? null : parseNumber(cells[fields.referenceHigh]),
      biomarkerId,
      confidence: biomarkerId ? "high" : "low",
    });
  }
  return out;
}
