// Presentation — identity trait axes as labelled bars (Design §5.1, §5.3).
// Pure/server component: renders the five [0,1] axes with derivation tooltips.
import type { IdentityTrait } from "@/types/identity";

export function TraitBars({ traits }: { traits: IdentityTrait[] }) {
  return (
    <ul className="space-y-2.5" aria-label="Trait breakdown">
      {traits.map((t) => {
        const pct = Math.round(t.value * 100);
        return (
          <li key={t.axis} title={t.derivation}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-body">{t.label}</span>
              <span className="tabular-nums text-muted">{t.value.toFixed(2)}</span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-card"
              role="meter"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.label}
            >
              <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
