"use client";

import type { ProductMatch } from "@/types";

// Design §5.4 — one matched product: fit score, breakdown, badges, quality notes, affiliate link.
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function ProductMatchCard({ match }: { match: ProductMatch }) {
  const { product, fitScore, breakdown, pricePerEffectiveDose, reasons } = match;

  return (
    <article className="rounded-lg border border-hairline p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">
            {product.brand} · {product.name}
          </h4>
          <p className="text-xs text-muted">
            {product.dosePerServing} {product.doseUnit}/serving · {product.form} ·{" "}
            {product.servingsPerContainer} servings · ${product.price}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-ink">{fitScore}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-soft">fit</div>
        </div>
      </div>

      <p className="mt-2 text-xs text-body">
        <span className="font-medium">${pricePerEffectiveDose.toFixed(2)}</span> per effective dose
      </p>

      {/* Per-criterion breakdown */}
      <dl className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] text-muted">
        {(
          [
            ["Dose", breakdown.dose],
            ["Form", breakdown.form],
            ["Tested", breakdown.testing],
            ["Clean", breakdown.additives],
            ["Value", breakdown.price],
          ] as [string, number][]
        ).map(([label, v]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="font-medium text-body">{pct(v)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {product.testingTags.map((t) => (
          <span key={t} className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            {t}
          </span>
        ))}
        {product.additivesTags.length > 0 && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
            contains additives
          </span>
        )}
      </div>

      {reasons.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-body">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-soft">{product.qualityNotes}</p>

      {product.affiliateLink && (
        <div className="mt-3">
          <a
            href={product.affiliateLink}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="text-xs font-medium text-brand underline"
          >
            View product ↗
          </a>
          <span className="ml-2 text-[10px] text-muted-soft">
            Affiliate link · does not affect ranking
          </span>
        </div>
      )}
    </article>
  );
}
