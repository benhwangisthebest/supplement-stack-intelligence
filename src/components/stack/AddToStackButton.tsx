"use client";

import { useState } from "react";
import Link from "next/link";
import type { Stack, StackMode } from "@/types";

// Design §5.4 — "Add to Current/Planned Stack" from a Library detail page.
// Client island on an otherwise static page: fetches the user's stacks on demand.
export function AddToStackButton({
  supplementId,
  defaultDose,
  unit,
}: {
  supplementId: string;
  defaultDose: number;
  unit: string;
}) {
  const [open, setOpen] = useState<StackMode | null>(null);
  const [stacks, setStacks] = useState<Stack[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openFor(mode: StackMode) {
    setOpen(mode);
    setStatus(null);
    if (stacks) return;
    const res = await fetch("/api/stacks");
    if (res.status === 401) {
      setNeedsAuth(true);
      return;
    }
    const json = await res.json();
    if (res.ok) setStacks(json.data as Stack[]);
  }

  async function addTo(stackId: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/stacks/${stackId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId,
          customName: null,
          dose: defaultDose,
          unit,
          timing: null,
          frequency: null,
          reason: null,
          notes: null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message ?? "Failed to add.");
      }
      setStatus("Added ✓");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setBusy(false);
    }
  }

  const visible = open ? (stacks ?? []).filter((s) => s.mode === open) : [];

  return (
    <div className="rounded-lg border border-hairline p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void openFor("current")}
          className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white"
        >
          Add to Current Stack
        </button>
        <button
          type="button"
          onClick={() => void openFor("planned")}
          className="rounded-md border border-hairline px-3 py-2 text-sm font-medium text-body hover:bg-surface-soft"
        >
          Add to Planned Stack
        </button>
      </div>

      {needsAuth && (
        <p className="mt-3 text-sm text-body">
          <Link href="/auth/login" className="underline">
            Log in
          </Link>{" "}
          to add this to a stack.
        </p>
      )}

      {open && !needsAuth && (
        <div className="mt-3">
          {visible.length === 0 ? (
            <p className="text-sm text-muted">
              No {open} stacks yet.{" "}
              <Link href="/stack-lab" className="underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {visible.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addTo(s.id)}
                    className="rounded-full border border-hairline px-3 py-1 text-sm text-body hover:border-muted disabled:opacity-50"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status && <p className="mt-2 text-sm text-success">{status}</p>}
    </div>
  );
}
