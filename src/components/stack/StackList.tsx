"use client";

import { useState } from "react";
import Link from "next/link";
import type { Stack, StackMode } from "@/types";
import type { StackArchetype } from "@/types/identity";
import { StackArchetypeBadge } from "@/components/identity/StackArchetypeBadge";

type Filter = "all" | StackMode;

// Design §5.4 — stack list with Current/Planned filter.
// v9 identity-cards: each stack optionally carries its derived archetype badge.
export function StackList({
  stacks,
  archetypes = {},
}: {
  stacks: Stack[];
  archetypes?: Record<string, StackArchetype>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = filter === "all" ? stacks : stacks.filter((s) => s.mode === filter);

  return (
    <div>
      <div className="flex gap-1">
        {(["all", "current", "planned"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              filter === f
                ? "bg-ink text-white"
                : "text-body hover:bg-surface-card"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No stacks yet. Create one above to get started.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/stack-lab/${s.id}`}
                className="block rounded-lg border border-hairline p-4 transition-colors hover:border-muted-soft"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-ink">{s.name}</h3>
                  <span className="rounded-full bg-surface-card px-2 py-0.5 text-xs capitalize text-body">
                    {s.mode}
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize text-muted">
                  Intent: {s.intent}
                </p>
                {archetypes[s.id] && (
                  <div className="mt-2">
                    <StackArchetypeBadge archetype={archetypes[s.id]} />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
