// Presentation — daily-checkin v10 (Design §5.1, Plan SC6). Correlational insight
// cards that explain a re-ranking. Each carries an explicit "correlational" qualifier
// (from lib/safety) so nothing reads as a causal/efficacy claim. Pure/server.
import type { CheckinInsight } from "@/types/checkin";

export function InsightCards({ insights }: { insights: CheckinInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div>
      <h3 className="text-title-sm text-ink">What you&apos;ve noticed</h3>
      <ul className="mt-2 space-y-2">
        {insights.map((c) => (
          <li
            key={`${c.supplementId}:${c.outcome}`}
            className="rounded-lg border border-hairline bg-surface-soft p-3"
          >
            <p className="text-sm text-body">{c.text}</p>
            <p className="mt-1 text-xs text-muted">{c.qualifier}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
