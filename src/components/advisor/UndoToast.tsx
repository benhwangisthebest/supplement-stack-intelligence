// Presentation — post-apply confirmation with one-click undo (Design §5.1, §5.4).
// Undo POSTs to /api/advisor/actions/:id/undo, which replays the stored inverse
// via the existing repos. Once undone, the action is reversed and the button locks.
"use client";

import { useState } from "react";

export function UndoToast({
  actionId,
  summary,
  onUndone,
}: {
  actionId: string;
  summary: string;
  onUndone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function undo() {
    if (busy || undone) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/advisor/actions/${actionId}/undo`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Couldn't undo that.");
        return;
      }
      setUndone(true);
      onUndone?.();
    } catch {
      setError("Something went wrong undoing the change.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex max-w-[85%] items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-soft px-3 py-2 text-sm">
      <span className="text-body">
        {undone ? "↩ Change undone." : `✓ Applied — ${summary}`}
      </span>
      {!undone && (
        <button
          type="button"
          onClick={() => void undo()}
          disabled={busy}
          className="rounded-md border border-hairline bg-white px-2.5 py-1 text-xs font-medium text-body hover:bg-surface-card disabled:opacity-40"
        >
          {busy ? "Undoing…" : "Undo"}
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-error">
          {error}
        </span>
      )}
    </div>
  );
}
