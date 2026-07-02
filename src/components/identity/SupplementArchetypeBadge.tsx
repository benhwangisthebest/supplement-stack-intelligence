// Presentation — compound (supplement-level) archetype badge in the Library
// (Design §5.4, Plan SC6). Pure prop render; the archetype is derived SSR from the
// seed evidence, so this is public and always available.
import type { SupplementArchetype } from "@/types/identity";

export function SupplementArchetypeBadge({
  archetype,
}: {
  archetype: SupplementArchetype;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-soft px-2.5 py-0.5 text-xs text-body"
      title={archetype.rationale}
    >
      <span className="font-medium text-muted">Archetype</span>
      {archetype.name}
    </span>
  );
}
