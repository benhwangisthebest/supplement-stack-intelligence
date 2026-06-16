"use client";

import { useId, useState } from "react";
import type { LabMarker } from "@/types";
import {
  markerCatalogEntry,
  markerSuggestions,
} from "@/lib/biomarkers/marker-catalog";

// biomarker-intelligence v3 — autocomplete options computed once.
const MARKER_SUGGESTIONS = markerSuggestions();

// Design §5.4 — manual lab marker entry/list. Feeds the evaluator's lab-relevance rule.
export function LabMarkerTable({ initial }: { initial: LabMarker[] }) {
  const [markers, setMarkers] = useState<LabMarker[]>(initial);
  const [marker, setMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refLow, setRefLow] = useState("");
  const [refHigh, setRefHigh] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const markerListId = useId();

  // On a recognized marker, auto-fill canonical unit + reference range (overridable).
  function onMarkerChange(name: string) {
    setMarker(name);
    const entry = markerCatalogEntry(name);
    if (!entry) return;
    if (!unit.trim()) setUnit(entry.unit);
    if (refLow === "" && entry.refLow !== null) setRefLow(String(entry.refLow));
    if (refHigh === "" && entry.refHigh !== null) setRefHigh(String(entry.refHigh));
  }

  async function add() {
    setError(null);
    const num = Number(value);
    if (!marker.trim() || !unit.trim() || Number.isNaN(num)) {
      setError("Marker, numeric value, and unit are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lab-markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker: marker.trim(),
          value: num,
          unit: unit.trim(),
          referenceLow: refLow === "" ? null : Number(refLow),
          referenceHigh: refHigh === "" ? null : Number(refHigh),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to add marker.");
      setMarkers((m) => [...m, json.data as LabMarker]);
      setMarker("");
      setValue("");
      setUnit("");
      setRefLow("");
      setRefHigh("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add marker.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const prev = markers;
    setMarkers((m) => m.filter((x) => x.id !== id)); // optimistic
    const res = await fetch(`/api/lab-markers/${id}`, { method: "DELETE" });
    if (!res.ok) setMarkers(prev); // rollback
  }

  return (
    <div>
      {markers.length > 0 ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">Marker</th>
              <th className="py-2 pr-3">Value</th>
              <th className="py-2 pr-3">Reference</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {markers.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100">
                <td className="py-2 pr-3 text-neutral-800">{m.marker}</td>
                <td className="py-2 pr-3 text-neutral-600">
                  {m.value} {m.unit}
                </td>
                <td className="py-2 pr-3 text-neutral-500">
                  {m.referenceLow ?? "—"}–{m.referenceHigh ?? "—"}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-neutral-500">No lab markers added yet.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          value={marker}
          list={markerListId}
          onChange={(e) => onMarkerChange(e.target.value)}
          placeholder="Marker (e.g. Vitamin D)"
          className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <datalist id={markerListId}>
          {MARKER_SUGGESTIONS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          inputMode="decimal"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Add
        </button>
        <input
          value={refLow}
          onChange={(e) => setRefLow(e.target.value)}
          placeholder="Ref low (optional)"
          inputMode="decimal"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <input
          value={refHigh}
          onChange={(e) => setRefHigh(e.target.value)}
          placeholder="Ref high (optional)"
          inputMode="decimal"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
