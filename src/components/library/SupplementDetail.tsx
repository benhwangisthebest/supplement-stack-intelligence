import Link from "next/link";
import type { Effect, Paper, Supplement } from "@/types";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";
import { EvidenceBreakdown } from "@/components/evidence/EvidenceBreakdown";
import { PaperSummaryCard } from "@/components/evidence/PaperSummaryCard";
import { WhatToWatch } from "@/components/library/WhatToWatch";

interface SupplementDetailProps {
  supplement: Supplement;
  effects: Effect[];
  papers: Paper[];
  related: Supplement[];
}

// Design §5.4 — layered depth: Summary → Dose → Effects → Papers → Related.
export function SupplementDetail({
  supplement,
  effects,
  papers,
  related,
}: SupplementDetailProps) {
  const items: TabItem[] = [
    { id: "summary", label: "Summary", content: <SummaryTab supplement={supplement} /> },
    { id: "dose", label: "Dose", content: <DoseTab supplement={supplement} effects={effects} /> },
    { id: "effects", label: "Effects", content: <EffectsTab effects={effects} papers={papers} /> },
    {
      id: "papers",
      label: `Papers${papers.length ? ` (${papers.length})` : ""}`,
      content: <PapersTab papers={papers} />,
    },
    { id: "related", label: "Related", content: <RelatedTab related={related} /> },
  ];

  // v8: advisor provenance chips deep-link to #effect-{id} / #paper-{id}; map those
  // hash prefixes to their tabs so the link lands on the right section (gap G1).
  return <Tabs items={items} anchorTabMap={{ "effect-": "effects", "paper-": "papers" }} />;
}

function SummaryTab({ supplement }: { supplement: Supplement }) {
  return (
    <div className="space-y-5">
      <p className="text-body">{supplement.description}</p>

      <section>
        <h3 className="text-sm font-semibold text-ink">Mechanism</h3>
        <p className="mt-1 text-sm text-body">{supplement.mechanismSummary}</p>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-ink">Side effects</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-body">
            {supplement.sideEffects.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-ink">Contraindications</h3>
          {supplement.contraindications.length ? (
            <ul className="mt-1 list-disc pl-5 text-sm text-body">
              {supplement.contraindications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">None noted.</p>
          )}
        </section>
      </div>

      {supplement.allergenTags.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink">Allergens</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {supplement.allergenTags.map((a) => (
              <span
                key={a}
                className="rounded-full border border-error/30 bg-error/10 px-2 py-0.5 text-xs text-error"
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* side-effect-engine v11: curated commonly-reported effects (public). */}
      <WhatToWatch supplementId={supplement.id} />
    </div>
  );
}

function DoseTab({ supplement, effects }: { supplement: Supplement; effects: Effect[] }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-semibold text-ink">General dose range</h3>
        <p className="mt-1 text-sm text-body">
          {supplement.generalDose.min}–{supplement.generalDose.max} {supplement.generalDose.unit}
        </p>
        <p className="mt-1 text-xs text-muted-soft">
          Common forms: {supplement.commonForms.join(", ")}
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Doses used in studies</h3>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Effect</th>
              <th className="py-2 pr-3">Studied dose</th>
            </tr>
          </thead>
          <tbody>
            {effects.map((e) => (
              <tr key={e.id} className="border-b border-hairline-soft">
                <td className="py-2 pr-3 text-body">{e.name}</td>
                <td className="py-2 pr-3 text-body">
                  {e.studiedDose.min}–{e.studiedDose.max} {e.studiedDose.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function EffectsTab({ effects, papers }: { effects: Effect[]; papers: Paper[] }) {
  return (
    <div className="space-y-4">
      {effects.map((e) => (
        // v8: anchor target for advisor provenance chips (citationHref → #effect-{id}).
        <article
          key={e.id}
          id={`effect-${e.id}`}
          className="scroll-mt-24 rounded-lg border border-hairline p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-ink">{e.name}</h3>
            <EffectGradeBadge grade={e.grade} confidence={e.confidence} />
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-soft">
            {e.outcomeCategory} · {e.relevantPopulation}
          </p>
          <p className="mt-2 text-sm text-body">{e.summary}</p>
          {/* evidence-grading v5: per-dimension breakdown for profiled effects only. */}
          {e.evidenceProfile && (
            <EvidenceBreakdown profile={e.evidenceProfile} papers={papers} />
          )}
        </article>
      ))}
    </div>
  );
}

function PapersTab({ papers }: { papers: Paper[] }) {
  if (papers.length === 0) {
    return <p className="text-sm text-muted">No study summaries seeded yet.</p>;
  }
  return (
    <div className="space-y-3">
      {papers.map((p) => (
        // v8: anchor target for advisor 'paper' provenance chips (#paper-{id}).
        <div key={p.id} id={`paper-${p.id}`} className="scroll-mt-24">
          <PaperSummaryCard paper={p} />
        </div>
      ))}
    </div>
  );
}

function RelatedTab({ related }: { related: Supplement[] }) {
  if (related.length === 0) {
    return <p className="text-sm text-muted">No related supplements listed.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {related.map((s) => (
        <li key={s.id}>
          <Link
            href={`/library/${s.slug}`}
            className="rounded-full border border-hairline px-3 py-1 text-sm text-body hover:border-muted"
          >
            {s.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
