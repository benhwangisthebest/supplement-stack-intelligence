// Presentation — side-effect-engine v11 (Design §5.3). Curated "what to watch"
// section on a Library supplement page. Public — driven only by the curated seed
// (no user data). Correlational language via lib/safety.
//
// Phase 3 U7: this section used to return null when a supplement had no curated
// profile ("no hollow section"), so on those pages the absence of side-effect
// notes disappeared silently, which reads as "nothing to watch" (CLAUDE.md §2.2
// rule 10). It now states the gap instead (CoverageLimit.test.tsx).
import { COVERAGE } from "@/lib/safety";
import { CoverageLimit } from "@/components/evidence/CoverageLimit";
import { profileForSupplement } from "@/lib/side-effects";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import type { FrequencyTier } from "@/types/side-effect";

const TIER_LABEL: Record<FrequencyTier, string> = {
  common: "common",
  infrequent: "sometimes",
  rare: "rare",
};

export function WhatToWatch({ supplementId }: { supplementId: string }) {
  const profile = profileForSupplement(supplementId);
  if (!profile || profile.entries.length === 0) {
    return (
      <section>
        <h3 className="text-sm font-semibold text-ink">What to watch</h3>
        <CoverageLimit copy={COVERAGE.watchNone} className="mt-1" />
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">What to watch</h3>
      <p className="mt-1 text-xs text-muted-soft">
        Effects people commonly report — informational, not predictions.
      </p>
      <ul className="mt-2 space-y-1.5">
        {profile.entries.map((e) => (
          <li key={e.label} className="flex items-start gap-2 text-sm text-body">
            <span className="mt-0.5 shrink-0 rounded-full border border-hairline px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
              {TIER_LABEL[e.frequencyTier]}
            </span>
            <span>
              <span className="capitalize text-ink">{sideEffectLabel(e.label)}</span>
              {" — "}
              {e.watchNote}
            </span>
          </li>
        ))}
      </ul>
      <CoverageLimit copy={COVERAGE.watchLimit} className="mt-2" />
    </section>
  );
}
