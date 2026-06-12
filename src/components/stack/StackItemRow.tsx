"use client";

import { useState } from "react";
import type { ItemFrequency, ItemTiming, StackItem } from "@/types";

const TIMINGS: ItemTiming[] = [
  "morning",
  "midday",
  "evening",
  "pre-workout",
  "with-meal",
  "bedtime",
];
const FREQUENCIES: ItemFrequency[] = ["daily", "workout-days", "as-needed", "weekly"];

// Design §5.3, §5.4 — a stack item row with view + edit modes.
// Edit wires the existing PUT /api/stacks/:id/items/:itemId (Check IMP-2).
export function StackItemRow({
  item,
  label,
  stackId,
  onUpdated,
  onRemoved,
}: {
  item: StackItem;
  label: string;
  stackId: string;
  onUpdated: (item: StackItem) => void;
  onRemoved: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [dose, setDose] = useState(String(item.dose));
  const [unit, setUnit] = useState(item.unit);
  const [timing, setTiming] = useState<ItemTiming | "">(item.timing ?? "");
  const [frequency, setFrequency] = useState<ItemFrequency | "">(item.frequency ?? "");
  const [reason, setReason] = useState(item.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const doseNum = Number(dose);
    if (!(doseNum > 0) || !unit.trim()) {
      setError("Dose must be positive and unit is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stacks/${stackId}/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId: item.supplementId,
          customName: item.customName,
          dose: doseNum,
          unit: unit.trim(),
          timing: timing || null,
          frequency: frequency || null,
          reason: reason.trim() || null,
          notes: item.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to update item.");
      onUpdated(json.data as StackItem);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update item.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {label}{" "}
            <span className="font-normal text-neutral-500">
              — {item.dose} {item.unit}
            </span>
          </p>
          <p className="text-xs text-neutral-400">
            {[item.timing, item.frequency, item.reason].filter(Boolean).join(" · ") ||
              "no timing set"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onRemoved(item.id)}
            className="text-xs text-neutral-400 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <p className="text-sm font-medium text-neutral-900">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="Dose"
          inputMode="decimal"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
        />
        <select
          value={timing}
          onChange={(e) => setTiming(e.target.value as ItemTiming | "")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          <option value="">Timing…</option>
          {TIMINGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as ItemFrequency | "")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          <option value="">Frequency…</option>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
