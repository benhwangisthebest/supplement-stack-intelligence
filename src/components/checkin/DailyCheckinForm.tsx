"use client";

// Presentation — daily-checkin v10 (Design §5.1, Plan SC1/SC9). Captures today's
// adherence (check off taken items) + a 1–5 rating per active goal, plus an OPTIONAL
// note / side-effect field that is DISPLAY-ONLY (never consumed by any engine) and
// carries a non-medical disclaimer. Idempotent: re-saving updates today's row.
import { useState } from "react";
import { checkinCopy } from "@/lib/safety";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import type { DailyCheckin, GoalRating } from "@/types/checkin";
import type { CanonicalSideEffect, ReportedSideEffect } from "@/types/side-effect";
import { SIDE_EFFECT_VOCAB } from "@/types/side-effect";
import type { OutcomeCategory } from "@/types";

interface TodayItem {
  supplementId: string;
  name: string;
}

const RATINGS: GoalRating[] = [1, 2, 3, 4, 5];
const SEVERITIES = [1, 2, 3] as const;

export function DailyCheckinForm({
  date,
  items,
  goals,
  initial,
  initialSideEffects = [],
}: {
  date: string;
  items: TodayItem[];
  goals: OutcomeCategory[];
  initial: DailyCheckin | null;
  initialSideEffects?: ReportedSideEffect[];
}) {
  const [taken, setTaken] = useState<Set<string>>(new Set(initial?.taken ?? []));
  const [ratings, setRatings] = useState<Partial<Record<OutcomeCategory, GoalRating>>>(
    initial?.ratings ?? {},
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [sideEffect, setSideEffect] = useState(initial?.sideEffect ?? "");
  const [reported, setReported] = useState<ReportedSideEffect[]>(initialSideEffects);
  const [picker, setPicker] = useState<CanonicalSideEffect | "">("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addReported() {
    if (!picker) return;
    setReported((prev) =>
      prev.some((r) => r.effectLabel === picker) ? prev : [...prev, { effectLabel: picker }],
    );
    setPicker("");
    setSaved(false);
  }

  function removeReported(label: CanonicalSideEffect) {
    setReported((prev) => prev.filter((r) => r.effectLabel !== label));
    setSaved(false);
  }

  function setSeverity(label: CanonicalSideEffect, severity: 1 | 2 | 3) {
    setReported((prev) =>
      prev.map((r) => (r.effectLabel === label ? { ...r, severity } : r)),
    );
    setSaved(false);
  }

  function toggle(id: string) {
    setTaken((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ratings,
          taken: [...taken],
          scheduled: items.map((i) => i.supplementId),
          note: note.trim() || null,
          sideEffect: sideEffect.trim() || null,
          sideEffects: reported,
        }),
      });
      if (!res.ok) throw new Error("Could not save your check-in.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface-soft p-6">
      <h2 className="text-title-lg text-ink">Daily check-in</h2>

      {items.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-body">Did you take these today?</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {items.map((it) => (
              <li key={it.supplementId}>
                <button
                  type="button"
                  onClick={() => toggle(it.supplementId)}
                  aria-pressed={taken.has(it.supplementId)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    taken.has(it.supplementId)
                      ? "border-ink bg-ink text-white"
                      : "border-hairline text-body hover:bg-surface-card"
                  }`}
                >
                  {taken.has(it.supplementId) ? "✓ " : ""}
                  {it.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-body">How are your goals today?</p>
          {goals.map((g) => (
            <div key={g} className="flex items-center justify-between gap-3">
              <span className="text-sm capitalize text-body">{g}</span>
              <div className="flex gap-1" role="radiogroup" aria-label={`${g} rating`}>
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={ratings[g] === r}
                    onClick={() => {
                      setRatings((prev) => ({ ...prev, [g]: r }));
                      setSaved(false);
                    }}
                    className={`h-7 w-7 rounded-full text-xs ${
                      ratings[g] === r ? "bg-ink text-white" : "bg-surface-card text-body"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <label className="text-sm font-medium text-body" htmlFor="checkin-note">
          Note (optional)
        </label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          rows={2}
          className="mt-1 w-full rounded-lg border border-hairline bg-white p-2 text-sm"
          placeholder="Anything you want to remember about today…"
        />
        <input
          aria-label="Side effect (optional)"
          value={sideEffect}
          onChange={(e) => {
            setSideEffect(e.target.value);
            setSaved(false);
          }}
          className="mt-2 w-full rounded-lg border border-hairline bg-white p-2 text-sm"
          placeholder="Side effect to note (optional)"
        />
        <p className="mt-1 text-xs text-muted">{checkinCopy.sideEffectDisclaimer}</p>
      </div>

      {/* side-effect-engine v11 — structured, canonical side-effect capture. */}
      <div className="mt-5">
        <p className="text-sm font-medium text-body">Log a side-effect (optional)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Side-effect to log"
            value={picker}
            onChange={(e) => setPicker(e.target.value as CanonicalSideEffect | "")}
            className="rounded-lg border border-hairline bg-white p-2 text-sm"
          >
            <option value="">Choose an effect…</option>
            {SIDE_EFFECT_VOCAB.filter((v) => !reported.some((r) => r.effectLabel === v)).map(
              (v) => (
                <option key={v} value={v}>
                  {sideEffectLabel(v)}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            onClick={addReported}
            disabled={!picker}
            className="rounded-lg border border-hairline px-3 py-2 text-sm text-body hover:bg-surface-card disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {reported.length > 0 && (
          <ul className="mt-3 space-y-2">
            {reported.map((r) => (
              <li
                key={r.effectLabel}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline p-2"
              >
                <span className="text-sm capitalize text-ink">
                  {sideEffectLabel(r.effectLabel)}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="flex gap-1"
                    role="radiogroup"
                    aria-label={`${sideEffectLabel(r.effectLabel)} severity`}
                  >
                    {SEVERITIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={r.severity === s}
                        onClick={() => setSeverity(r.effectLabel, s)}
                        className={`h-6 w-6 rounded-full text-xs ${
                          r.severity === s ? "bg-ink text-white" : "bg-surface-card text-body"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${sideEffectLabel(r.effectLabel)}`}
                    onClick={() => removeReported(r.effectLabel)}
                    className="text-sm text-muted hover:text-error"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save today"}
        </button>
        {saved && <span className="text-sm text-muted">Saved ✓</span>}
        {error && (
          <span role="alert" className="text-sm text-error">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
