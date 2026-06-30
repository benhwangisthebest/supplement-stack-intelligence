"use client";

import type { ProtocolSuggestion, ProtocolTier } from "@/types";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";

// Design §5.4 — one protocol suggestion with badges, dose/timing, rationale, accept/dismiss.
const TIER_STYLES: Record<ProtocolTier, string> = {
  foundational: "bg-success/10 text-success border-success/30",
  targeted: "bg-brand/10 text-brand border-brand/30",
  advanced: "bg-warning/10 text-warning border-warning/30",
  experimental: "bg-surface-card text-body border-hairline",
};

export function SuggestionCard({
  suggestion,
  busy,
  onAccept,
  onDismiss,
}: {
  suggestion: ProtocolSuggestion;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const s = suggestion;
  return (
    <article className="rounded-lg border border-hairline p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-ink">{s.supplementName}</h4>
          <EffectGradeBadge grade={s.grade} />
          <span
            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${TIER_STYLES[s.tier]}`}
          >
            {s.tier}
          </span>
          {s.labBoosted && (
            <span
              className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800"
              title="Prioritized based on your lab markers"
            >
              ✦ lab
            </span>
          )}
        </div>
        {s.alreadyInStack ? (
          <span className="shrink-0 rounded-full bg-surface-card px-2 py-0.5 text-xs text-muted">
            In stack
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-body">{s.rationale}</p>
      <p className="mt-1 text-xs text-muted">
        {s.dose.min}–{s.dose.max} {s.dose.unit}
        {s.timing ? ` · ${s.timing}` : ""}
      </p>

      {s.confidenceNote && (
        <p className="mt-1 text-xs text-muted-soft">{s.confidenceNote}</p>
      )}
      {s.medicationCaution && (
        <p className="mt-1 text-xs text-warning">
          May interact with medications — worth discussing with a clinician.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || s.alreadyInStack}
          className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {s.alreadyInStack ? "Already added" : "Accept"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="rounded-md border border-hairline px-3 py-1.5 text-xs text-body hover:bg-surface-soft disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}
