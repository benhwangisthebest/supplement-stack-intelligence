"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProtocolResult, ProtocolSuggestion } from "@/types";
import { SuggestionCard } from "./SuggestionCard";

// Design §5.4 — Protocol Builder panel on the stack detail page.
// Generates ephemeral suggestions from the profile; accepts into THIS stack.
function key(s: ProtocolSuggestion): string {
  return `${s.outcomeCategory}:${s.supplementId}`;
}

export function ProtocolPanel({ stackId }: { stackId: string }) {
  const [result, setResult] = useState<ProtocolResult | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/protocol/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stackId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Generation failed.");
      setResult(json.data as ProtocolResult);
      setDismissed(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  // Mark a suggestion as added (so the card shows "In stack").
  function markAdded(s: ProtocolSuggestion) {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            groups: prev.groups.map((g) => ({
              ...g,
              suggestions: g.suggestions.map((x) =>
                key(x) === key(s) ? { ...x, alreadyInStack: true } : x,
              ),
            })),
          }
        : prev,
    );
  }

  async function accept(s: ProtocolSuggestion): Promise<boolean> {
    const res = await fetch(`/api/stacks/${stackId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplementId: s.supplementId,
        customName: null,
        dose: s.dose.min,
        unit: s.dose.unit,
        timing: s.timing,
        frequency: null,
        reason: `Protocol: ${s.outcomeCategory}`,
        notes: null,
      }),
    });
    if (res.ok) {
      markAdded(s);
      return true;
    }
    return false;
  }

  async function acceptOne(s: ProtocolSuggestion) {
    setBusy(true);
    setError(null);
    const okFlag = await accept(s);
    if (!okFlag) setError("Failed to add suggestion.");
    setBusy(false);
  }

  async function acceptAll() {
    if (!result) return;
    setBusy(true);
    setError(null);
    for (const g of result.groups) {
      for (const s of g.suggestions) {
        if (s.alreadyInStack || dismissed.has(key(s))) continue;
        await accept(s);
      }
    }
    setBusy(false);
  }

  function dismiss(s: ProtocolSuggestion) {
    setDismissed((prev) => new Set(prev).add(key(s)));
  }

  const hasGroups = result && result.groups.length > 0;
  const noGoals = result && result.groups.length === 0;

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Suggested Protocol</h2>
          <p className="text-sm text-neutral-500">
            Evidence-graded suggestions from your profile — accept what fits.
          </p>
        </div>
        <div className="flex gap-2">
          {hasGroups && (
            <button
              type="button"
              onClick={() => void acceptAll()}
              disabled={busy}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Accept all
            </button>
          )}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Working…" : result ? "Regenerate" : "Generate Protocol"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {noGoals && (
        <p className="mt-4 text-sm text-neutral-500">
          Add goals to your{" "}
          <Link href="/profile" className="underline">
            Profile
          </Link>{" "}
          to generate a protocol.
        </p>
      )}

      {hasGroups && (
        <div className="mt-4 space-y-6">
          {result!.groups.map((g) => {
            const visible = g.suggestions.filter((s) => !dismissed.has(key(s)));
            if (visible.length === 0) return null;
            return (
              <div key={g.goal}>
                <h3 className="mb-2 text-sm font-medium capitalize text-neutral-700">
                  {g.goal} ({visible.length})
                </h3>
                <div className="space-y-3">
                  {visible.map((s) => (
                    <SuggestionCard
                      key={key(s)}
                      suggestion={s}
                      busy={busy}
                      onAccept={() => void acceptOne(s)}
                      onDismiss={() => dismiss(s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
