import Link from "next/link";
import type { Effect, Supplement } from "@/types";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";

// Design §5.4 — Library search result card (name, category, top effect grade).
// Phase 4 U6 (c), owner ruling (3): the description renders only under the background
// label. The card sits in SupplementSearch's client graph, so it cannot import
// @/lib/safety; the server page passes `BACKGROUND_LABEL` down as a prop (rule 7).
export function SupplementCard({
  supplement,
  topEffect,
  backgroundLabel,
}: {
  supplement: Omit<Supplement, "mechanismSummary">;
  topEffect?: Effect;
  backgroundLabel: string;
}) {
  return (
    <Link
      href={`/library/${supplement.slug}`}
      className="card block p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title-sm text-ink">{supplement.name}</h3>
          <p className="text-xs text-muted">{supplement.category}</p>
        </div>
        {topEffect && (
          <EffectGradeBadge grade={topEffect.grade} confidence={topEffect.confidence} />
        )}
      </div>
      <div data-background="description" className="mt-2">
        <p className="text-xs text-muted">{backgroundLabel}</p>
        <p className="line-clamp-2 text-sm text-body">{supplement.description}</p>
      </div>
    </Link>
  );
}
