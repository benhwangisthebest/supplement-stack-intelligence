// Presentation — conversation list rail (Design §5.3). Select an existing thread
// or start a new one. Persisted history comes from /api/advisor/conversations.
"use client";

import type { AdvisorConversation } from "@/types/advisor";

export function ConversationRail({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: AdvisorConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-hairline pr-4">
      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-surface-dark-elevated"
      >
        New conversation
      </button>
      <ul className="mt-3 space-y-1">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                c.id === activeId
                  ? "bg-surface-card font-medium text-ink"
                  : "text-body hover:bg-surface-soft"
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          </li>
        ))}
        {conversations.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted-soft">No conversations yet</li>
        )}
      </ul>
    </aside>
  );
}
