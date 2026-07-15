// Presentation — side-effect-engine v11 (Design §5.3). Per-effect trajectory of
// the user's REPORTED side-effects over time, reusing the v4 TrendChart sparkline
// (zero extra runtime deps). Correlational + honest "insufficient data" state.
import { TrendChart } from "./TrendChart";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import { DISCLAIMERS } from "@/lib/safety";
import type { CanonicalSideEffect, SideEffectReport } from "@/types/side-effect";

export function SideEffectTimeline({ reports }: { reports: SideEffectReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted">
        No side-effects logged yet. Add them in your daily check-in to see trends here.
      </p>
    );
  }

  const byEffect = new Map<CanonicalSideEffect, SideEffectReport[]>();
  for (const r of reports) {
    const arr = byEffect.get(r.effectLabel) ?? [];
    arr.push(r);
    byEffect.set(r.effectLabel, arr);
  }

  const rows = [...byEffect.entries()]
    .map(([label, rs]) => {
      const sorted = [...rs].sort((a, b) => a.date.localeCompare(b.date));
      return {
        label,
        count: sorted.length,
        // severity is optional; a logged-but-unrated day counts as a "1" (present).
        values: sorted.map((r) => r.severity ?? 1),
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-hairline p-3"
          >
            <div>
              <p className="text-sm capitalize text-ink">{sideEffectLabel(row.label)}</p>
              <p className="text-xs text-muted">
                logged on {row.count} day{row.count === 1 ? "" : "s"}
              </p>
            </div>
            {row.values.length >= 2 ? (
              <TrendChart values={row.values} />
            ) : (
              <span className="text-xs text-muted-soft">insufficient data</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{DISCLAIMERS.sideEffect}</p>
    </div>
  );
}
