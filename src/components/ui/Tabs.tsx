"use client";

import { useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

// Minimal accessible tabs (Design §5.4 — progressive depth).
export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-hairline">
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          hidden={t.id !== active}
          className="pt-5"
        >
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}
