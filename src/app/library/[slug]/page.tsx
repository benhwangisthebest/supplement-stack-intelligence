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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/library" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to Library
      </Link>

      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight">{supplement.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
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
    </main>
  );
}
