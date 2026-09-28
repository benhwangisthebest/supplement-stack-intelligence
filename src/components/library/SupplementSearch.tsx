"use client";

import { useMemo, useState } from "react";
import type { Effect, Supplement } from "@/types";
import { SupplementCard } from "./SupplementCard";

export interface LibraryEntry {
  // U6 (c): mechanismSummary is withheld until sourced; the server page drops it.
  supplement: Omit<Supplement, "mechanismSummary">;
  topEffect?: Effect;
}

// Design §5.4 — search box filtering name + aliases, case-insensitive.
// U6 (c): `backgroundLabel` is BACKGROUND_LABEL from @/lib/safety, passed by the server
// page because this client graph cannot import it (rule 7).
export function SupplementSearch({
  entries,
  backgroundLabel,
}: {
  entries: LibraryEntry[];
  backgroundLabel: string;
}) {
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
        className="input h-11"
      />

      <p className="mt-2 text-xs text-muted">
        {filtered.length} of {entries.length} supplements
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No matches in the current dataset.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <SupplementCard
              key={entry.supplement.id}
              supplement={entry.supplement}
              topEffect={entry.topEffect}
              backgroundLabel={backgroundLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
