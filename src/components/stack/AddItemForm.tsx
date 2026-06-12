"use client";

import { useState } from "react";
import type { ItemFrequency, ItemTiming, StackItem } from "@/types";

export interface SupplementOption {
  id: string;
  name: string;
  unit: string;
}

const TIMINGS: ItemTiming[] = [
  "morning",
  "midday",
  "evening",
  "pre-workout",
  "with-meal",
  "bedtime",
];
const FREQUENCIES: ItemFrequency[] = ["daily", "workout-days", "as-needed", "weekly"];

// Design §5.4 — add a stack item (supplement picker or custom + dose/unit/timing/frequency/reason).
export function AddItemForm({
  stackId,
  supplements,
  onAdded,
}: {
  stackId: string;
  supplements: SupplementOption[];
  onAdded: (item: StackItem) => void;
}) {
  const [supplementId, setSupplementId] = useState("");
  const [customName, setCustomName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("");
  const [timing, setTiming] = useState<ItemTiming | "">("");
  const [frequency, setFrequency] = useState<ItemFrequency | "">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickSupplement(id: string) {
    setSupplementId(id);
    const opt = supplements.find((s) => s.id === id);
    if (opt && !unit) setUnit(opt.unit); // prefill the common unit
  }

  async function add() {
    setError(null);
    const doseNum = Number(dose);
    if ((!supplementId && !customName.trim()) || !unit.trim() || !(doseNum > 0)) {
      setError("Pick a supplement (or custom name), a positive dose, and a unit.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stacks/${stackId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId: supplementId || null,
          customName: supplementId ? null : customName.trim(),
          dose: doseNum,
          unit: unit.trim(),
          timing: timing || null,
          frequency: frequency || null,
          reason: reason.trim() || null,
          notes: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to add item.");
      onAdded(json.data as StackItem);
      setSupplementId("");
      setCustomName("");
      setDose("");
      setUnit("");
      setTiming("");
      setFrequency("");
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Add item</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={supplementId}
          onChange={(e) => pickSupplement(e.target.value)}
          className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          <option value="">Select supplement…</option>
          {supplements.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="…or custom name"
          disabled={Boolean(supplementId)}
          className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
        />
        <input
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="Dose"
          inputMode="decimal"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <select
          value={timing}
          onChange={(e) => setTiming(e.target.value as ItemTiming | "")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
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
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
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
          placeholder="Reason (optional)"
          className="col-span-3 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
