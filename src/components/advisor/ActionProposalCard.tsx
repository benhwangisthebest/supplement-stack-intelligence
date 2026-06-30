// Presentation — the suggest-then-confirm card (Design §5.1, §5.3, §5.4). v8: renders
// ONE OR MORE proposed changes as human-readable diffs + the CUMULATIVE pre-apply
// safety flags, lets the user TOGGLE individual actions (selective confirm, SC5) and
// edit dose/timing (SC-5), then Confirm/Reject. Confirm POSTs the SELECTED SUBSET to
// /api/advisor/actions; the SERVER re-validates + re-checks safety over the projected
// combined stack (the client is never trusted). A projected critical flag disables
// Confirm (hard-block, SC-4); applied changes share one batch_id for grouped undo.
"use client";

import { useState } from "react";
import type { ActionProposal, EditableProposalFields } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";

const TIMINGS = ["morning", "midday", "evening", "pre-workout", "with-meal", "bedtime"] as const;

const SEVERITY_STYLE: Record<DraftFlag["severity"], string> = {
  critical: "border-error/40 bg-error/5 text-error",
  warning: "border-hairline bg-surface-soft text-body",
  info: "border-hairline bg-surface-soft text-muted",
};

export interface ConfirmResult {
  actionId: string;
  resultingItemId: string | null;
  createdStackId: string | null;
}

export function ActionProposalCard({
  proposals,
  safetyFlags,
  conversationId,
  onConfirmed,
  onRejected,
}: {
  proposals: ActionProposal[];
  safetyFlags: DraftFlag[];
  conversationId: string | null;
  onConfirmed: (result: ConfirmResult, summary: string) => void;
  onRejected: () => void;
}) {
  // Per-action selection (default all checked) + per-action edits.
  const [selected, setSelected] = useState<boolean[]>(() => proposals.map(() => true));
  const [edits, setEdits] = useState<EditableProposalFields[]>(() => proposals.map(() => ({})));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasCritical = safetyFlags.some((f) => f.severity === "critical");
  const selectedCount = selected.filter(Boolean).length;
  const isBatch = proposals.length > 1;

  function setEditAt(i: number, patch: Partial<EditableProposalFields>) {
    setEdits((prev) => prev.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  }

  async function confirm() {
    if (busy || hasCritical || selectedCount === 0) return;
    setBusy(true);
    setError(null);
    try {
      const actions = proposals
        .map((proposal, i) => ({
          proposal,
          edits: hasEdits(edits[i]) ? edits[i] : undefined,
          keep: selected[i],
        }))
        .filter((a) => a.keep)
        .map(({ proposal, edits }) => ({ proposal, edits }));

      const res = await fetch("/api/advisor/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, actions }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Couldn't apply that change.");
        return;
      }
      setDone(true);
      // The response carries back-compat single fields + batch info; undoing any
      // member reverses the whole batch (the undo route is batch-aware).
      const data = json.data as ConfirmResult;
      onConfirmed(data, summarize(proposals, selected));
    } catch {
      setError("Something went wrong applying the change.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return null; // replaced by the UndoToast in the panel

  return (
    <div className="mt-2 max-w-[85%] rounded-xl border border-hairline bg-white p-3 text-sm shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 font-medium text-ink">
        <span aria-hidden>⚙</span>{" "}
        {isBatch ? `Proposed changes (${proposals.length})` : "Proposed change"}
      </p>

      <ul className="space-y-2" aria-label="Proposed actions">
        {proposals.map((proposal, i) => {
          const editable = proposal.editable;
          return (
            <li key={i} className="rounded-lg border border-hairline/70 p-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected[i]}
                  aria-label={`Include: ${proposal.diff[0]?.label ?? LABEL[proposal.type]}`}
                  onChange={(e) =>
                    setSelected((prev) => prev.map((s, j) => (j === i ? e.target.checked : s)))
                  }
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-normal text-muted">
                    {LABEL[proposal.type]}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {proposal.diff.map((d, k) => (
                      <li key={k} className="text-body">
                        <span className="font-medium">{d.label}</span>
                        {d.before && d.after ? (
                          <span className="text-muted">
                            {" "}
                            — <span className="line-through">{d.before}</span> → {d.after}
                          </span>
                        ) : d.after ? (
                          <span className="text-muted"> — {d.after}</span>
                        ) : d.before ? (
                          <span className="text-muted"> — {d.before}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {editable && selected[i] && (
                    <span className="mt-2 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-muted">
                        Dose
                        <input
                          type="number"
                          min={0}
                          defaultValue={editable.dose}
                          aria-label="Dose"
                          onChange={(e) =>
                            setEditAt(i, { dose: e.target.value ? Number(e.target.value) : undefined })
                          }
                          className="ml-2 w-20 rounded-md border border-hairline px-2 py-1 text-sm focus:border-muted focus:outline-none"
                        />
                      </label>
                      <label className="text-xs text-muted">
                        Timing
                        <select
                          defaultValue={editable.timing ?? ""}
                          aria-label="Timing"
                          onChange={(e) => setEditAt(i, { timing: e.target.value || null })}
                          className="ml-2 rounded-md border border-hairline px-2 py-1 text-sm focus:border-muted focus:outline-none"
                        >
                          <option value="">—</option>
                          {TIMINGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {safetyFlags.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="Safety flags">
          {safetyFlags.map((f, i) => (
            <li key={i} className={`rounded-md border px-2 py-1 text-xs ${SEVERITY_STYLE[f.severity]}`}>
              <span className="font-medium">
                {f.severity === "critical" ? "⚠ " : ""}
                {f.title}
              </span>
              {f.recommendation ? <span className="block text-muted">{f.recommendation}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {hasCritical && (
        <p className="mt-2 text-xs text-error">
          {isBatch ? "These changes would" : "This change would"} introduce a serious safety flag, so
          {isBatch ? " they" : " it"} can&apos;t be applied here. Consider discussing it with a clinician.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || hasCritical || selectedCount === 0}
          className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-surface-dark-elevated disabled:opacity-40"
        >
          {busy
            ? "Applying…"
            : isBatch
              ? `Confirm ${selectedCount} change${selectedCount === 1 ? "" : "s"}`
              : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onRejected}
          disabled={busy}
          className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-body hover:bg-surface-soft disabled:opacity-40"
        >
          Reject
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-soft">Nothing is saved until you confirm.</p>
    </div>
  );
}

const LABEL: Record<ActionProposal["type"], string> = {
  add_item: "Add item",
  remove_item: "Remove item",
  edit_item: "Edit item",
  generate_protocol: "Generate protocol",
  attach_product: "Attach product",
};

function hasEdits(e: EditableProposalFields): boolean {
  return Object.values(e).some((v) => v !== undefined);
}

/** A short label for the UndoToast after applying (the selected subset). */
function summarize(proposals: ActionProposal[], selected: boolean[]): string {
  const kept = proposals.filter((_, i) => selected[i]);
  if (kept.length === 1) return kept[0].diff[0]?.label ?? LABEL[kept[0].type];
  return `${kept.length} changes`;
}
