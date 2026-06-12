"use client";

import type { ProtocolSuggestion, ProtocolTier } from "@/types";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";

// Design §5.4 — one protocol suggestion with badges, dose/timing, rationale, accept/dismiss.
const TIER_STYLES: Record<ProtocolTier, string> = {
  foundational: "bg-emerald-100 text-emerald-800 border-emerald-200",
  targeted: "bg-sky-100 text-sky-800 border-sky-200",
  advanced: "bg-amber-100 text-amber-800 border-amber-200",
  experimental: "bg-neutral-100 text-neutral-600 border-neutral-200",
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
    <article className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-neutral-900">{s.supplementName}</h4>
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
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            In stack
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-neutral-700">{s.rationale}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {s.dose.min}–{s.dose.max} {s.dose.unit}
        {s.timing ? ` · ${s.timing}` : ""}
      </p>

      {s.confidenceNote && (
        <p className="mt-1 text-xs text-neutral-400">{s.confidenceNote}</p>
      )}
      {s.medicationCaution && (
        <p className="mt-1 text-xs text-amber-700">
          May interact with medications — worth discussing with a clinician.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || s.alreadyInStack}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {s.alreadyInStack ? "Already added" : "Accept"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}
