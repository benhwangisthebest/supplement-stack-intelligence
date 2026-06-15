import { getSupplementById } from "@/lib/evidence";
import { interactionsForSupplement } from "@/lib/interactions";
import { DISCLAIMERS } from "@/lib/safety";
import type { InteractionRule, InteractionSeverity } from "@/types/interaction";

// Design §5.4 — Library "Interactions" section. Server component over static seed data.
// Empty state never implies safety (Plan FR-10).
const SEVERITY_STYLES: Record<InteractionSeverity, string> = {
  serious: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  caution: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-sky-100 text-sky-800 border-sky-200",
};

function humanize(s: string): string {
  return s.replace(/-/g, " ");
}

/** Label for the counterpart in a rule, viewed from `supplementId`'s perspective. */
function counterpartLabel(rule: InteractionRule, supplementId: string): string {
  if (rule.kind === "supplement-drug") {
    return humanize(rule.drugGeneric ?? rule.drugClass ?? "a medication");
  }
  // supplement-supplement: show the *other* supplement's name.
  const otherId =
    rule.supplementId === supplementId ? rule.otherSupplementId : rule.supplementId;
  const other = otherId ? getSupplementById(otherId) : undefined;
  return other?.name ?? otherId ?? "another supplement";
}

export function InteractionSection({ supplementId }: { supplementId: string }) {
  const rules = interactionsForSupplement(supplementId);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Interactions</h2>

      {rules.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No known interactions in our dataset. This does not mean a combination is
          safe — our dataset is limited.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-lg border border-neutral-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${SEVERITY_STYLES[rule.severity]}`}
                >
                  {rule.severity}
                </span>
                <h4 className="text-sm font-semibold text-neutral-900">
                  {counterpartLabel(rule, supplementId)}
                </h4>
                <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {rule.kind === "supplement-drug" ? "medication" : "supplement"} ·
                  evidence {rule.evidenceGrade}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-700">{rule.mechanism}.</p>
              <p className="mt-1 text-sm text-neutral-600">{rule.management}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-neutral-400">{DISCLAIMERS.interaction}</p>
    </section>
  );
}
