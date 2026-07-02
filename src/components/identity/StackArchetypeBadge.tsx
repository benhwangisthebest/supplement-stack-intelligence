// Presentation — per-stack archetype badge (Design §5.4, Plan SC4). Compact,
// non-diagnostic: how a single stack "reads". Hidden for the emerging state so a
// sparse stack shows nothing rather than a hollow label.
import type { StackArchetype } from "@/types/identity";

export function StackArchetypeBadge({ archetype }: { archetype: StackArchetype }) {
  if (archetype.archetype === "emerging") return null;
  return (
    <span
      className="inline-flex items-center rounded-full border border-hairline bg-surface-soft px-2 py-0.5 text-xs text-body"
      title={archetype.note}
    >
      {archetype.name}
    </span>
  );
}
