import { biomarkersForSupplement } from "@/lib/biomarkers";
import { DISCLAIMERS } from "@/lib/safety";
import type { BiomarkerRelation } from "@/types/biomarker";

// Design §5.4 — Library "Relevant biomarkers" section. Server component, static seed.
// Honest empty state never implies "nothing to check" (Plan FR-9).
const RELATION_STYLES: Record<BiomarkerRelation, string> = {
  support: "bg-emerald-100 text-emerald-800 border-emerald-200",
  caution: "bg-amber-100 text-amber-800 border-amber-200",
};

export function BiomarkerRelevanceSection({
  supplementId,
}: {
  supplementId: string;
}) {
  const rows = biomarkersForSupplement(supplementId);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Relevant biomarkers</h2>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No biomarkers are linked to this supplement in our dataset. This does not
          mean your labs have nothing worth reviewing.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map(({ biomarker, rule }) => (
            <li key={rule.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-neutral-900">
                  {biomarker.name}
                </h4>
                <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                  when {rule.trigger}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${RELATION_STYLES[rule.relation]}`}
                >
                  {rule.relation}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                  evidence {rule.evidenceGrade}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-700">{rule.rationale}.</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-neutral-400">{DISCLAIMERS.labs}</p>
    </section>
  );
}
