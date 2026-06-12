"use client";

import { useMemo, useState } from "react";
import type { Effect, Supplement } from "@/types";
import { SupplementCard } from "./SupplementCard";

export interface LibraryEntry {
  supplement: Supplement;
  topEffect?: Effect;
}

// Design §5.4 — search box filtering name + aliases, case-insensitive.
export function SupplementSearch({ entries }: { entries: LibraryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(({ supplement }) => {
      if (supplement.name.toLowerCase().includes(q)) return true;
      return supplement.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [query, entries]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search supplements (e.g. magnesium, omega-3, ashwagandha)…"
        aria-label="Search supplements"
        className="w-full rounded-md border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900"
      />

      <p className="mt-2 text-xs text-neutral-400">
        {filtered.length} of {entries.length} supplements
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          No matches in the current dataset.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <SupplementCard
              key={entry.supplement.id}
              supplement={entry.supplement}
              topEffect={entry.topEffect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
