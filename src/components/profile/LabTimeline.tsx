"use client";

// Presentation — lab timeline (Design §5.1, §5.4). A clean latest-value snapshot:
// one row per biomarker showing the CURRENT reading + trend. Click a row to open
// a pop-up with the enlarged chart and the full archived reading history.
// Single-point markers show an honest "not enough data yet" state (no fabricated
// trend). All copy here is descriptive movement — never diagnostic.
import { useState } from "react";
import type { LabMarker } from "@/types";
import type { LabMarkerTimelinePoint, TrendSignal } from "@/types/lab";
import { TrendChart } from "./TrendChart";
import { LabMarkerModal } from "./LabMarkerModal";

interface Props {
  trends: TrendSignal[];
  points: LabMarkerTimelinePoint[];
  markers: LabMarker[]; // raw rows (with ids) so the history modal can edit/remove
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

export function LabTimeline({ trends, points, markers }: Props) {
  const [selected, setSelected] = useState<TrendSignal | null>(null);

  if (trends.length === 0) {
    return (
      <p className="text-sm text-muted">
        No recognized markers yet. Upload a report or add markers to start a timeline.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-hairline-soft">
        {trends.map((t) => {
          const series = seriesFor(t.biomarkerId, points);
          const trending = t.direction === "rising" || t.direction === "falling";
          return (
            <li key={t.biomarkerId}>
              <button
                type="button"
                onClick={() => setSelected(t)}
                aria-label={`View ${t.biomarkerName} history`}
                className="flex w-full items-center gap-3 rounded-md py-2.5 pr-2 text-left hover:bg-surface-soft"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.biomarkerName}</p>
                  <p className="text-xs text-muted">
                    {t.latest.value} {t.latest.unit}
                    {t.direction === "insufficient" && (
                      <span className="ml-2 text-muted-soft">
                        1 point — not enough data points yet
                      </span>
                    )}
                    {t.points > 1 && (
                      <span className="ml-2 text-muted-soft">
                        · {t.points} readings
                      </span>
                    )}
                  </p>
                </div>

                {trending && t.pctChange !== null && (
                  <span
                    className={
                      t.direction === "rising"
                        ? "text-xs font-medium text-success"
                        : "text-xs font-medium text-error"
                    }
                  >
                    {ARROW[t.direction]} {t.pctChange > 0 ? "+" : ""}
                    {Math.round(t.pctChange)}%
                    {t.windowDays !== null && (
                      <span className="text-muted-soft"> · {t.windowDays}d</span>
                    )}
                  </span>
                )}

                <TrendChart values={series} />
                <span aria-hidden="true" className="text-muted-soft">
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <LabMarkerModal
          trend={selected}
          points={points}
          markers={markers}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
