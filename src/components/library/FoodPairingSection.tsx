import { foodPairingsForSupplement } from "@/lib/interactions";
import { DISCLAIMERS } from "@/lib/safety";
import type { InteractionRule } from "@/types/interaction";

// Design Ref: §5.1 — Library "Food & absorption" section. Server component over
// static seed data. Synergy renders as helpful guidance; avoid as gentle caution.
// Empty state never implies "no effect" (Plan SC: non-implying-safety copy).

function PairingCard({
  rule,
  tone,
}: {
  rule: InteractionRule;
  tone: "synergy" | "avoid";
}) {
  const accent =
    tone === "synergy"
      ? "border-brand/30 bg-brand/5"
      : "border-warning/30 bg-warning/5";
  return (
    <li className={`rounded-lg border p-4 ${accent}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-ink">{rule.food}</h4>
        <span className="text-[11px] uppercase tracking-wide text-muted-soft">
          evidence {rule.evidenceGrade}
        </span>
      </div>
      <p className="mt-1 text-sm text-body">{rule.mechanism}.</p>
      {rule.timing && (
        <p className="mt-1 text-sm text-muted">⏱ {rule.timing}</p>
      )}
    </li>
  );
}

export function FoodPairingSection({ supplementId }: { supplementId: string }) {
  const rules = foodPairingsForSupplement(supplementId);
  const pairsWell = rules.filter((r) => r.direction === "synergy");
  const avoid = rules.filter((r) => r.direction === "avoid");

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Food &amp; absorption</h2>

      {rules.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No food-pairing guidance in our dataset yet. This does not mean food has
          no effect — our dataset is limited.
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {pairsWell.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-brand">Pairs well with</h3>
              <ul className="mt-2 space-y-3">
                {pairsWell.map((rule) => (
                  <PairingCard key={rule.id} rule={rule} tone="synergy" />
                ))}
              </ul>
            </div>
          )}

          {avoid.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-warning">Best to space apart</h3>
              <ul className="mt-2 space-y-3">
                {avoid.map((rule) => (
                  <PairingCard key={rule.id} rule={rule} tone="avoid" />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-soft">{DISCLAIMERS.food}</p>
    </section>
  );
}
