"use client";

import { useState } from "react";

interface CompareData {
  goals: string[];
  coveredGoals: string[];
  uncoveredGoals: string[];
  itemsByGoal: Record<string, string[]>;
}

// Design §4.2, §5.4 — compare current stack against profile goals (gap view).
export function CompareView({ stackId }: { stackId: string }) {
  const [data, setData] = useState<CompareData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stacks/${stackId}/compare`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Compare failed.");
      setData(json.data as CompareData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-hairline p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Compare to goals</h3>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm text-body hover:bg-surface-soft disabled:opacity-50"
        >
          {busy ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}

      {data &&
        (data.goals.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No goals set in your profile yet — add goals to compare coverage.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-success">
                Covered ({data.coveredGoals.length})
              </h4>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {data.coveredGoals.map((g) => (
                  <li
                    key={g}
                    className="rounded-full bg-success/10 px-2 py-0.5 text-xs capitalize text-success"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-warning">
                Uncovered ({data.uncoveredGoals.length})
              </h4>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {data.uncoveredGoals.length ? (
                  data.uncoveredGoals.map((g) => (
                    <li
                      key={g}
                      className="rounded-full bg-warning/10 px-2 py-0.5 text-xs capitalize text-warning"
                    >
                      {g}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted">All goals covered 🎉</li>
                )}
              </ul>
            </div>
          </div>
        ))}
    </div>
  );
}
