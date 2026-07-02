// Presentation — daily-checkin v10 (Design §5.1). Premium consistency surface: a
// GitHub-contribution-style heatmap + a consistency % and streak. NO points/badges
// (CLAUDE.md — premium, not childish). Pure/server component.
import { shiftDate } from "@/lib/checkin";
import type { CheckinConsistency } from "@/types/checkin";

const CELLS = 28; // trailing 4 weeks

export function ConsistencyHeatmap({
  dates,
  consistency,
  today,
}: {
  dates: string[]; // YYYY-MM-DD of days checked in
  consistency: CheckinConsistency;
  today: string;
}) {
  const checked = new Set(dates);
  const cells = Array.from({ length: CELLS }, (_, i) => {
    const d = shiftDate(today, -(CELLS - 1 - i));
    return { date: d, on: checked.has(d) };
  });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-title-sm text-ink">Consistency</h3>
        <p className="text-xs text-muted">
          {Math.round(consistency.checkinRate * 100)}% · {consistency.currentStreak}-day streak ·{" "}
          {Math.round(consistency.adherenceRate * 100)}% adherence
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Check-in heatmap">
        {cells.map((c) => (
          <span
            key={c.date}
            title={`${c.date}${c.on ? " — checked in" : ""}`}
            className={`h-3.5 w-3.5 rounded-sm ${c.on ? "bg-ink" : "bg-surface-card"}`}
          />
        ))}
      </div>
    </div>
  );
}
