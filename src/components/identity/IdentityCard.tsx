// Presentation — the user's Identity Card (Design §5.1). Server component: premium,
// non-childish render of a DERIVED archetype + trait bars + a deep-linked "why"
// trail. The emerging state shows a "sharpen" checklist instead of a hollow
// archetype (Plan SC5). Deep-links reuse the pure citationHref resolver (Plan SC2).
import Link from "next/link";
import { citationHref } from "@/lib/advisor/citation-href";
import { TraitBars } from "./TraitBars";
import type { ConfidenceLevel, IdentityCard as IdentityCardData } from "@/types/identity";

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  emerging: "Emerging",
  developing: "Developing",
  established: "Established",
};

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  emerging: "border-hairline text-muted",
  developing: "border-hairline text-body",
  established: "border-ink text-ink",
};

export function IdentityCard({ card }: { card: IdentityCardData }) {
  const isEmerging = card.confidence === "emerging";

  return (
    <section
      className="rounded-xl border border-hairline bg-surface-soft p-6"
      aria-label="Your supplement identity"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Your supplement identity</p>
          <h2 className="mt-1 text-title-lg text-ink">{card.name}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${CONFIDENCE_STYLE[card.confidence]}`}
        >
          {CONFIDENCE_LABEL[card.confidence]}
        </span>
      </div>

      <p className="mt-2 text-sm text-body">{card.tagline}</p>

      {isEmerging ? (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Sharpen your card
          </p>
          <ul className="mt-2 space-y-1.5">
            {card.sharpen.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-body">
                <span aria-hidden className="text-muted">
                  ○
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <TraitBars traits={card.traits} />
          </div>

          {card.trail.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Why this archetype
              </p>
              <ul className="mt-2 space-y-1">
                {card.trail.map((sig) => {
                  const href = sig.citation ? citationHref(sig.citation) : null;
                  return (
                    <li key={sig.label} className="text-sm" title={sig.detail}>
                      {href ? (
                        <Link href={href} className="text-body hover:text-ink">
                          {sig.label} <span aria-hidden>↗</span>
                        </Link>
                      ) : (
                        <span className="text-body">{sig.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {card.sharpen.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              {card.sharpen.length} way{card.sharpen.length === 1 ? "" : "s"} to sharpen your
              card — hover a trait to see how it&apos;s derived.
            </p>
          )}
        </>
      )}

      <p className="mt-5 border-t border-hairline pt-3 text-xs text-muted">{card.disclaimer}</p>
    </section>
  );
}
