"use client";

import { useMemo, useState } from "react";
import type {
  EvaluationFlag,
  EvaluationSummary,
  FlagSeverity,
  Stack,
  StackItem,
} from "@/types";
import { AddItemForm, type SupplementOption } from "./AddItemForm";
import { FlagCard } from "./FlagCard";
import { CompareView } from "./CompareView";
import { StackItemRow } from "./StackItemRow";

// Design §5.4, §2.2 — Stack Lab detail: editor + evaluate + report + compare.
// This is where the core loop closes (Plan North Star).
export function StackWorkspace({
  stack,
  initialItems,
  initialFlags,
  supplements,
}: {
  stack: Stack;
  initialItems: StackItem[];
  initialFlags: EvaluationFlag[];
  supplements: SupplementOption[];
}) {
  const [items, setItems] = useState<StackItem[]>(initialItems);
  const [flags, setFlags] = useState<EvaluationFlag[]>(initialFlags);
  const [summary, setSummary] = useState<EvaluationSummary | null>(
    initialFlags.length
      ? {
          critical: initialFlags.filter((f) => f.severity === "critical").length,
          warning: initialFlags.filter((f) => f.severity === "warning").length,
          info: initialFlags.filter((f) => f.severity === "info").length,
        }
      : null,
  );
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of supplements) m.set(s.id, s.name);
    return m;
  }, [supplements]);

  function itemLabel(item: StackItem) {
    if (item.supplementId) return nameById.get(item.supplementId) ?? item.supplementId;
    return item.customName ?? "Custom item";
  }

  async function removeItem(itemId: string) {
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== itemId)); // optimistic
    const res = await fetch(`/api/stacks/${stack.id}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) setItems(prev);
  }

  async function evaluate() {
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/stacks/${stack.id}/evaluate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Evaluation failed.");
      setFlags(json.data.flags as EvaluationFlag[]);
      setSummary(json.data.summary as EvaluationSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setEvaluating(false);
    }
  }

  const order: FlagSeverity[] = ["critical", "warning", "info"];

  return (
    <div className="space-y-8">
      {/* Items */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Items ({items.length})</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">
            No items yet. Add supplements below, then evaluate.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {items.map((item) => (
              <StackItemRow
                key={item.id}
                item={item}
                label={itemLabel(item)}
                stackId={stack.id}
                onUpdated={(updated) =>
                  setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)))
                }
                onRemoved={(id) => void removeItem(id)}
              />
            ))}
          </ul>
        )}
      </section>

      <AddItemForm
        stackId={stack.id}
        supplements={supplements}
        onAdded={(item) => setItems((xs) => [...xs, item])}
      />

      {/* Evaluate */}
      <section>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void evaluate()}
            disabled={evaluating || items.length === 0}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {evaluating ? "Evaluating…" : "Evaluate stack"}
          </button>
          {summary && (
            <p className="text-sm text-neutral-600">
              {summary.critical} critical · {summary.warning} warning · {summary.info} info
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {flags.length > 0 && (
          <div className="mt-4 space-y-3">
            {order.flatMap((sev) =>
              flags
                .filter((f) => f.severity === sev)
                .map((f) => <FlagCard key={f.id} flag={f} />),
            )}
          </div>
        )}
      </section>

      {/* Compare */}
      <CompareView stackId={stack.id} />
    </div>
  );
}
