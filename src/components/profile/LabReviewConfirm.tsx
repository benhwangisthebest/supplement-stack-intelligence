"use client";

// Presentation — the CONFIRM GATE (Design §5.4). Shows parsed candidates; the
// user edits/approves each. Commit is disabled until ≥1 marker is approved.
// Nothing here writes to the DB until the user clicks Confirm & save.
import { useState } from "react";
import { Disclaimer, type DisclaimerText } from "@/components/ui/Disclaimer";
import type { labRangeClearedCopy } from "@/lib/safety";
import { normalizeEnteredUnit } from "./LabMarkerTable";
import type { ReviewRow } from "./useLabImport";

interface Props {
  rows: ReviewRow[];
  approvedCount: number;
  committing: boolean;
  error: string | null;
  onSetRow: (i: number, patch: Partial<ReviewRow>) => void;
  onConfirm: (collectedAt: string) => void;
  onCancel: () => void;
  /** `DISCLAIMERS.labs`, from the server page (U9, rule 7). */
  labsDisclaimer: DisclaimerText;
  /** `labRangeClearedCopy.review`, from the server page (U22, N-115, rule 7). */
  rangeCleared: (typeof labRangeClearedCopy)["review"];
}

/** What extraction produced for a row, before any edit (U22). */
interface Extracted {
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
}

// [Phase 4 U22, N-114] An extracted range is in the extracted unit. Kept under an
// edited unit, it would be saved mislabelled and statusOf would read it in the
// new unit. So a row keeps its range only while its unit normalises to the one
// extracted (the rule the Profile form has followed since U21); an edit back
// restores it.
function rangeFor(extracted: Extracted | undefined, unit: string) {
  return extracted && normalizeEnteredUnit(unit) === normalizeEnteredUnit(extracted.unit)
    ? { referenceLow: extracted.referenceLow, referenceHigh: extracted.referenceHigh }
    : { referenceLow: null, referenceHigh: null };
}

function fmtBound(n: number | null): string {
  return n === null ? "—" : String(n);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LabReviewConfirm({
  rows,
  approvedCount,
  committing,
  error,
  onSetRow,
  onConfirm,
  onCancel,
  labsDisclaimer,
  rangeCleared,
}: Props) {
  const [collectedAt, setCollectedAt] = useState(today());
  // The rows as extracted. This gate mounts per review and unmounts on cancel or
  // save, so the first render's rows are the extraction's.
  const [extracted] = useState<Extracted[]>(() =>
    rows.map((r) => ({ unit: r.unit, referenceLow: r.referenceLow, referenceHigh: r.referenceHigh })),
  );
  // [Phase 4 U22, N-116] The Value as typed. Number("") is 0, so a cleared field
  // used to be saved as a reading of 0. A blank draft leaves the row's number
  // alone and holds the gate shut while that row is approved.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const blank = (i: number) => drafts[i] !== undefined && drafts[i].trim() === "";
  const blocked = rows.some((r, i) => r.approved && blank(i));
  // [Phase 4 U22, N-115] A range the user was shown, now cleared by a unit edit.
  const cleared = (r: ReviewRow, i: number) =>
    r.referenceLow === null &&
    r.referenceHigh === null &&
    (extracted[i]?.referenceLow != null || extracted[i]?.referenceHigh != null);

  return (
    <div className="rounded-lg border border-hairline p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Review parsed markers</h3>
        <label className="text-xs text-muted">
          Collected
          <input
            type="date"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            className="ml-2 rounded border border-hairline px-2 py-1 text-xs"
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted">
        Nothing is saved until you confirm. Uncheck anything that looks wrong.
      </p>

      <ul className="mt-3 divide-y divide-hairline-soft">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 py-2">
            <input
              type="checkbox"
              checked={r.approved}
              aria-label={`Approve ${r.rawLabel}`}
              onChange={(e) => onSetRow(i, { approved: e.target.checked })}
            />
            <span className="min-w-[8rem] flex-1 text-sm">{r.rawLabel}</span>
            <input
              type="number"
              value={drafts[i] ?? r.value}
              aria-label={`Value for ${r.rawLabel}`}
              aria-invalid={blank(i)}
              onChange={(e) => {
                const v = e.target.value;
                setDrafts((d) => ({ ...d, [i]: v }));
                if (v.trim() !== "") onSetRow(i, { value: Number(v) });
              }}
              className={`w-20 rounded border px-2 py-1 text-sm ${blank(i) ? "border-error" : "border-hairline"}`}
            />
            <input
              type="text"
              value={r.unit}
              aria-label={`Unit for ${r.rawLabel}`}
              onChange={(e) =>
                onSetRow(i, { unit: e.target.value, ...rangeFor(extracted[i], e.target.value) })
              }
              className="w-20 rounded border border-hairline px-2 py-1 text-sm"
            />
            {(r.referenceLow !== null || r.referenceHigh !== null) && (
              <span className="text-xs text-muted">
                Reference <span>{`${fmtBound(r.referenceLow)}–${fmtBound(r.referenceHigh)}`}</span>
              </span>
            )}
            {r.biomarkerId === null && (
              <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs text-warning">
                not recognized
              </span>
            )}
            {r.confidence === "low" && r.biomarkerId !== null && (
              <span className="rounded bg-surface-card px-1.5 py-0.5 text-xs text-muted">
                low confidence
              </span>
            )}
            {cleared(r, i) && (
              <p role="status" className="w-full text-xs text-muted">
                {rangeCleared}
              </p>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <Disclaimer text={labsDisclaimer} className="mt-3" />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={approvedCount === 0 || committing || blocked}
          onClick={() => onConfirm(collectedAt)}
          className="rounded bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {committing ? "Saving…" : `Confirm & save (${approvedCount})`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted hover:text-body"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
