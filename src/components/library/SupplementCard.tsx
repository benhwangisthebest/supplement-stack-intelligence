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
      className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-neutral-900">{supplement.name}</h3>
          <p className="text-xs text-neutral-500">{supplement.category}</p>
        </div>
        {topEffect && (
          <EffectGradeBadge grade={topEffect.grade} confidence={topEffect.confidence} />
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
        {supplement.description}
      </p>
    </Link>
  );
}
