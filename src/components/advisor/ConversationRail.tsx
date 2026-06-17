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
    <aside className="w-56 shrink-0 border-r border-neutral-200 pr-4">
      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
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
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          </li>
        ))}
        {conversations.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-neutral-400">No conversations yet</li>
        )}
      </ul>
    </aside>
  );
}
