// Presentation — lab timeline (Design §5.1, §5.4). Server component: receives
// trend signals + canonical timeline points and renders one row per biomarker.
// Single-point markers show an honest "not enough data yet" state (no fabricated
// trend). All copy here is descriptive movement — never diagnostic.
import type { LabMarkerTimelinePoint, TrendSignal } from "@/types/lab";
import { TrendChart } from "./TrendChart";

interface Props {
  trends: TrendSignal[];
  points: LabMarkerTimelinePoint[];
}

const ARROW: Record<TrendSignal["direction"], string> = {
  rising: "↑",
  falling: "↓",
  stable: "→",
  insufficient: "·",
};

function seriesFor(
  biomarkerId: string,
  points: LabMarkerTimelinePoint[],
): number[] {
  return points
    .filter((p) => p.biomarkerId === biomarkerId)
    .sort((a, b) => (a.collectedAt < b.collectedAt ? -1 : 1))
    .map((p) => p.canonicalValue);
}

export function LabTimeline({ trends, points }: Props) {
  if (trends.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No recognized markers yet. Upload a report or add markers to start a timeline.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {trends.map((t) => {
        const series = seriesFor(t.biomarkerId, points);
        const trending = t.direction === "rising" || t.direction === "falling";
        return (
          <li key={t.biomarkerId} className="flex items-center gap-3 py-2.5">
            <div className="flex-1">
              <p className="text-sm font-medium">{t.biomarkerName}</p>
              <p className="text-xs text-neutral-500">
                {t.latest.value} {t.latest.unit}
                {t.direction === "insufficient" && (
                  <span className="ml-2 text-neutral-400">
                    1 point — not enough data points yet
                  </span>
                )}
              </p>
            </div>

            {trending && t.pctChange !== null && (
              <span
                className={
                  t.direction === "rising"
                    ? "text-xs font-medium text-green-700"
                    : "text-xs font-medium text-red-700"
                }
              >
                {ARROW[t.direction]} {t.pctChange > 0 ? "+" : ""}
                {Math.round(t.pctChange)}%
                {t.windowDays !== null && (
                  <span className="text-neutral-400"> · {t.windowDays}d</span>
                )}
              </span>
            )}

            <TrendChart values={series} />
          </li>
        );
      })}
    </ul>
  );
}
