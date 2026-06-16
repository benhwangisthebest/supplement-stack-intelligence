"use client";

// Presentation — the CONFIRM GATE (Design §5.4). Shows parsed candidates; the
// user edits/approves each. Commit is disabled until ≥1 marker is approved.
// Nothing here writes to the DB until the user clicks Confirm & save.
import { useState } from "react";
import { Disclaimer } from "@/components/ui/Disclaimer";
import type { ReviewRow } from "./useLabImport";

interface Props {
  rows: ReviewRow[];
  approvedCount: number;
  committing: boolean;
  error: string | null;
  onSetRow: (i: number, patch: Partial<ReviewRow>) => void;
  onConfirm: (collectedAt: string) => void;
  onCancel: () => void;
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
}: Props) {
  const [collectedAt, setCollectedAt] = useState(today());

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Review parsed markers</h3>
        <label className="text-xs text-neutral-500">
          Collected
          <input
            type="date"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            className="ml-2 rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Nothing is saved until you confirm. Uncheck anything that looks wrong.
      </p>

      <ul className="mt-3 divide-y divide-neutral-100">
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
              value={r.value}
              aria-label={`Value for ${r.rawLabel}`}
              onChange={(e) => onSetRow(i, { value: Number(e.target.value) })}
              className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={r.unit}
              aria-label={`Unit for ${r.rawLabel}`}
              onChange={(e) => onSetRow(i, { unit: e.target.value })}
              className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
            />
            {r.biomarkerId === null && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                not recognized
              </span>
            )}
            {r.confidence === "low" && r.biomarkerId !== null && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                low confidence
              </span>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <Disclaimer variant="labs" className="mt-3" />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={approvedCount === 0 || committing}
          onClick={() => onConfirm(collectedAt)}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {committing ? "Saving…" : `Confirm & save (${approvedCount})`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
