import Link from "next/link";
import type { Effect, Supplement } from "@/types";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";

// Design §5.4 — Library search result card (name, category, top effect grade).
export function SupplementCard({
  supplement,
  topEffect,
}: {
  supplement: Supplement;
  topEffect?: Effect;
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
      <p className="mt-2 line-clamp-2 text-sm text-body">
        {supplement.description}
      </p>
    </Link>
  );
}
