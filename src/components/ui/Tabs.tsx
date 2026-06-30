"use client";

import { useEffect, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

// Minimal accessible tabs (Design §5.4 — progressive depth).
// v8 advisor-experience: `anchorTabMap` maps a URL-hash PREFIX → tab id so a deep
// link like #effect-{id} (from an advisor provenance chip) auto-opens the right tab
// and scrolls to the anchor — closing analysis gap G1.
export function Tabs({
  items,
  anchorTabMap,
}: {
  items: TabItem[];
  anchorTabMap?: Record<string, string>;
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    if (!anchorTabMap) return;
    function syncFromHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const match = Object.entries(anchorTabMap!).find(([prefix]) => hash.startsWith(prefix));
      if (!match) return;
      setActive(match[1]);
      // Scroll after the (now-active) panel has painted.
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: "start" });
      });
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
    // anchorTabMap is a stable literal from the parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
