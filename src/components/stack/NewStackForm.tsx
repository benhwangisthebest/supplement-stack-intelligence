"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OUTCOME_CATEGORIES, type StackIntent, type StackMode } from "@/types";

const INTENTS: StackIntent[] = [...OUTCOME_CATEGORIES, "experimental"];

// Design §5.4 — create a stack (name + intent + mode).
export function NewStackForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [intent, setIntent] = useState<StackIntent>("foundational");
  const [mode, setMode] = useState<StackMode>("current");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Stack name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), intent, mode, description: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to create stack.");
      router.push(`/stack-lab/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create stack.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-hairline p-4"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-body">New stack</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sleep stack"
          className="rounded-md border border-hairline px-3 py-2 outline-none focus:border-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-body">Intent</span>
        <select
          value={intent}
          onChange={(e) => setIntent(e.target.value as StackIntent)}
          className="rounded-md border border-hairline px-3 py-2 capitalize outline-none focus:border-ink"
        >
          {INTENTS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-body">Mode</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as StackMode)}
          className="rounded-md border border-hairline px-3 py-2 capitalize outline-none focus:border-ink"
        >
          <option value="current">current</option>
          <option value="planned">planned</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
