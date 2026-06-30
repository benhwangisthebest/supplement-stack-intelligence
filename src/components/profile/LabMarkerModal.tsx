"use client";

// Presentation — a focused look at one biomarker (lab-history UX). Opened from a
// timeline row. Shows an enlarged chart of every reading (canonical, unit-correct)
// plus the full reading history with per-reading Edit/Remove — the place to manage
// individual readings (the manual-entry table only removes whole marker blocks).
// All copy is descriptive movement only — never diagnostic.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeMarker } from "@/lib/biomarkers";
import type { LabMarker } from "@/types";
import type { LabMarkerTimelinePoint, TrendSignal } from "@/types/lab";

interface Props {
  trend: TrendSignal;
  points: LabMarkerTimelinePoint[];
  markers: LabMarker[];
  onClose: () => void;
}

interface Draft {
  value: string;
  unit: string;
  date: string;
  refLow: string;
  refHigh: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toDraft(m: LabMarker): Draft {
  return {
    value: String(m.value),
    unit: m.unit,
    date: m.date ? m.date.slice(0, 10) : "",
    refLow: m.referenceLow === null ? "" : String(m.referenceLow),
    refHigh: m.referenceHigh === null ? "" : String(m.referenceHigh),
  };
}

export function LabMarkerModal({ trend, points, markers, onClose }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Chronological canonical series (oldest → newest) drives the chart.
  const series = points
    .filter((p) => p.biomarkerId === trend.biomarkerId)
    .slice()
    .sort((a, b) => (a.collectedAt < b.collectedAt ? -1 : 1));
  const values = series.map((p) => p.canonicalValue);
  const unit = trend.latest.unit;

  // Raw rows (with ids) for this biomarker — newest first — power the history list.
  const readings = markers
    .filter((m) => normalizeMarker(m.marker) === trend.biomarkerId)
    .slice()
    .sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return 0;
    });
  const latest = readings[0];

  // Enlarged chart geometry.
  const W = 520;
  const H = 200;
  const PAD = 28;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const xAt = (i: number) =>
    series.length <= 1 ? W / 2 : PAD + (i / (series.length - 1)) * innerW;
  const yAt = (v: number) => PAD + innerH - ((v - min) / span) * innerH;
  const line = series
    .map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.canonicalValue).toFixed(1)}`)
    .join(" ");

  function startEdit(m: LabMarker) {
    setError(null);
    setEditingId(m.id);
    setDraft(toDraft(m));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function saveEdit(m: LabMarker) {
    if (!draft) return;
    const num = Number(draft.value);
    if (!draft.unit.trim() || Number.isNaN(num)) {
      setError("A numeric value and a unit are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lab-markers/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker: m.marker,
          value: num,
          unit: draft.unit.trim(),
          referenceLow: draft.refLow === "" ? null : Number(draft.refLow),
          referenceHigh: draft.refHigh === "" ? null : Number(draft.refHigh),
          date: draft.date === "" ? null : draft.date,
          notes: m.notes,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Failed to save.");
      }
      cancelEdit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function removeReading(m: LabMarker) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lab-markers/${m.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove reading.");
      if (editingId === m.id) cancelEdit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove reading.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-hairline px-2 py-1 text-sm outline-none focus:border-ink";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${trend.biomarkerName} history`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{trend.biomarkerName}</h3>
            <p className="mt-0.5 text-sm text-muted">
              {latest ? (
                <>
                  Latest{" "}
                  <span className="font-medium text-ink">
                    {latest.value} {latest.unit}
                  </span>{" "}
                  ·{" "}
                </>
              ) : null}
              {readings.length} {readings.length === 1 ? "reading" : "readings"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-soft hover:bg-surface-card hover:text-body"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Enlarged chart */}
        {series.length >= 2 ? (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-4 w-full"
            role="img"
            aria-label={`${trend.biomarkerName} readings over time`}
          >
            <line
              x1={PAD}
              y1={PAD + innerH}
              x2={W - PAD}
              y2={PAD + innerH}
              stroke="#e5e5e5"
              strokeWidth="1"
            />
            <polyline
              points={line}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {series.map((p, i) => (
              <circle
                key={p.collectedAt + i}
                cx={xAt(i)}
                cy={yAt(p.canonicalValue)}
                r="3.5"
                fill="#2563eb"
              />
            ))}
            <text x={PAD} y={PAD - 10} fontSize="11" fill="#737373">
              {max} {unit}
            </text>
            <text x={PAD} y={PAD + innerH + 18} fontSize="11" fill="#737373">
              {fmtDate(series[0].collectedAt)}
            </text>
            <text
              x={W - PAD}
              y={PAD + innerH + 18}
              fontSize="11"
              fill="#737373"
              textAnchor="end"
            >
              {fmtDate(series[series.length - 1].collectedAt)}
            </text>
          </svg>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-soft p-4 text-sm text-muted">
            Only one charted reading so far — add another dated reading to see a trend line.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}

        {/* Full history (newest first) with per-reading edit/remove */}
        <h4 className="mt-6 text-sm font-semibold tracking-tight">Reading history</h4>
        {readings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No readings for this marker.</p>
        ) : (
          <ul className="mt-2 divide-y divide-hairline-soft">
            {readings.map((m, idx) => {
              const isEditing = editingId === m.id;
              return (
                <li key={m.id} className="py-2.5">
                  {isEditing && draft ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <input
                          aria-label="Value"
                          value={draft.value}
                          inputMode="decimal"
                          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                          placeholder="Value"
                          className={inputCls}
                        />
                        <input
                          aria-label="Unit"
                          value={draft.unit}
                          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                          placeholder="Unit"
                          className={inputCls}
                        />
                        <input
                          aria-label="Date"
                          type="date"
                          value={draft.date}
                          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                          className={`${inputCls} col-span-2`}
                        />
                        <input
                          aria-label="Reference low"
                          value={draft.refLow}
                          inputMode="decimal"
                          onChange={(e) => setDraft({ ...draft, refLow: e.target.value })}
                          placeholder="Ref low"
                          className={inputCls}
                        />
                        <input
                          aria-label="Reference high"
                          value={draft.refHigh}
                          inputMode="decimal"
                          onChange={(e) =>
                            setDraft({ ...draft, refHigh: e.target.value })
                          }
                          placeholder="Ref high"
                          className={inputCls}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveEdit(m)}
                          className="rounded-md bg-ink px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                          className="rounded-md border border-hairline px-3 py-1 text-sm text-body hover:bg-surface-soft disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-ink">
                          {m.value} {m.unit}
                          {idx === 0 && (
                            <span className="ml-2 rounded-full bg-surface-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {fmtDate(m.date)}
                          <span className="ml-2 text-muted-soft">
                            ref {m.referenceLow ?? "—"}–{m.referenceHigh ?? "—"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(m)}
                        className="text-xs text-muted hover:text-ink disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeReading(m)}
                        className="text-xs text-muted-soft hover:text-error disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
