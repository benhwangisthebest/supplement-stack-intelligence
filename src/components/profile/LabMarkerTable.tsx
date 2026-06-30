"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LabMarker } from "@/types";
import {
  markerCatalogEntry,
  markerSuggestions,
} from "@/lib/biomarkers/marker-catalog";

// biomarker-intelligence v3 — autocomplete options computed once.
const MARKER_SUGGESTIONS = markerSuggestions();

interface MarkerGroup {
  name: string;
  current: LabMarker; // most recent reading — shown in the table
  ids: string[]; // every reading id in this block (for whole-block removal)
  count: number;
}

// One block per marker. Newest reading wins for the displayed value; compare by
// date when present, else original order (later additions are treated as newer).
function groupByMarker(markers: LabMarker[]): MarkerGroup[] {
  const order = new Map<string, number>();
  markers.forEach((m, i) => order.set(m.id, i));
  const by = new Map<string, LabMarker[]>();
  for (const m of markers) {
    const key = m.marker.trim().toLowerCase();
    const list = by.get(key) ?? [];
    list.push(m);
    by.set(key, list);
  }
  const groups: MarkerGroup[] = [];
  for (const list of by.values()) {
    const sorted = list.slice().sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0);
    });
    groups.push({
      name: sorted[0].marker,
      current: sorted[0],
      ids: sorted.map((m) => m.id),
      count: sorted.length,
    });
  }
  return groups;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Design §5.4 — manual lab marker entry. The list is server-authoritative: every
// mutation calls router.refresh() so the table, timeline, chart and history modal
// all reflect the same data. Per-reading remove/edit lives in the history modal;
// here, Remove deletes the WHOLE marker block (all its readings).
export function LabMarkerTable({ initial }: { initial: LabMarker[] }) {
  const router = useRouter();
  const [marker, setMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refLow, setRefLow] = useState("");
  const [refHigh, setRefHigh] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const markerListId = useId();

  const groups = useMemo(() => groupByMarker(initial), [initial]);

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
      setMarker("");
      setValue("");
      setUnit("");
      setRefLow("");
      setRefHigh("");
      router.refresh(); // re-render with fresh markers + recomputed trends/points
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add marker.");
    } finally {
      setBusy(false);
    }
  }

  // Remove the whole block: delete every reading for this marker.
  async function removeBlock(g: MarkerGroup) {
    setBusy(true);
    setError(null);
    try {
      const results = await Promise.all(
        g.ids.map((id) => fetch(`/api/lab-markers/${id}`, { method: "DELETE" })),
      );
      if (results.some((r) => !r.ok)) throw new Error("Failed to remove marker.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove marker.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {groups.length > 0 ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Marker</th>
              <th className="py-2 pr-3">Current value</th>
              <th className="py-2 pr-3">Reference</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.current.id} className="border-b border-hairline-soft">
                <td className="py-2 pr-3 text-ink">
                  {g.name}
                  {g.count > 1 && (
                    <span className="ml-2 text-xs text-muted-soft">
                      {g.count} readings
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-body">
                  {g.current.value} {g.current.unit}
                  {g.current.date && (
                    <span className="ml-2 text-xs text-muted-soft">
                      {fmtDate(g.current.date)}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-muted">
                  {g.current.referenceLow ?? "—"}–{g.current.referenceHigh ?? "—"}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeBlock(g)}
                    title={
                      g.count > 1
                        ? `Remove all ${g.count} readings for ${g.name}`
                        : `Remove ${g.name}`
                    }
                    className="text-xs text-muted-soft hover:text-error disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted">No lab markers added yet.</p>
      )}

      {groups.some((g) => g.count > 1) && (
        <p className="mt-2 text-xs text-muted-soft">
          To edit or remove an individual reading, open the marker under “Current
          markers &amp; trends” above.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          value={marker}
          list={markerListId}
          onChange={(e) => onMarkerChange(e.target.value)}
          placeholder="Marker (e.g. Vitamin D)"
          className="col-span-2 rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
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
          className="rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy}
          className="rounded-md border border-hairline px-3 py-2 text-sm font-medium text-body hover:bg-surface-soft disabled:opacity-50"
        >
          Add
        </button>
        <input
          value={refLow}
          onChange={(e) => setRefLow(e.target.value)}
          placeholder="Ref low (optional)"
          inputMode="decimal"
          className="rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <input
          value={refHigh}
          onChange={(e) => setRefHigh(e.target.value)}
          placeholder="Ref high (optional)"
          inputMode="decimal"
          className="rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
