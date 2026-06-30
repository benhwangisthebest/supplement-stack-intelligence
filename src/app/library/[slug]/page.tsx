import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Paper } from "@/types";
import {
  getAllSupplements,
  getEffectsForSupplement,
  getPapersForEffect,
  getRelatedSupplements,
  getSupplementBySlug,
} from "@/lib/evidence";
import { SupplementDetail } from "@/components/library/SupplementDetail";
import { InteractionSection } from "@/components/library/InteractionSection";
import { BiomarkerRelevanceSection } from "@/components/library/BiomarkerRelevanceSection";
import { AddToStackButton } from "@/components/stack/AddToStackButton";

// Seed is static — prerender every supplement page (Design §11.3).
export function generateStaticParams() {
  return getAllSupplements().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supp = getSupplementBySlug(slug);
  return { title: supp ? `${supp.name} — Library` : "Not found — Library" };
}

export default async function SupplementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supplement = getSupplementBySlug(slug);
  if (!supplement) notFound();

  const effects = getEffectsForSupplement(supplement.id);
  const related = getRelatedSupplements(supplement.id);

  // De-duplicate papers across all of the supplement's effects.
  const paperMap = new Map<string, Paper>();
  for (const effect of effects) {
    for (const paper of getPapersForEffect(effect)) {
      paperMap.set(paper.id, paper);
    }
  }
  const papers = [...paperMap.values()];

  return (
    <main className="container-page max-w-4xl py-10">
      <Link href="/library" className="text-sm font-medium text-muted hover:text-ink">
        ← Back to Library
      </Link>

      <header className="mt-4">
        <h1 className="display-md">{supplement.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {supplement.category}
          {supplement.aliases.length > 0 && <> · {supplement.aliases.join(", ")}</>}
        </p>
      </header>

      <div className="mt-6">
        <AddToStackButton
          supplementId={supplement.id}
          defaultDose={supplement.generalDose.min}
          unit={supplement.generalDose.unit}
        />
      </div>

      <div className="mt-8">
        <SupplementDetail
          supplement={supplement}
          effects={effects}
          papers={papers}
          related={related}
        />
      </div>

      <InteractionSection supplementId={supplement.id} />

      <BiomarkerRelevanceSection supplementId={supplement.id} />
    </main>
  );
}
