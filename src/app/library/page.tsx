import {
  compareGrades,
  getAllSupplements,
  getEffectsForSupplement,
} from "@/lib/evidence";
import {
  SupplementSearch,
  type LibraryEntry,
} from "@/components/library/SupplementSearch";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Library — Supplement Stack Intelligence" };

// Design §5.4 — public Library search (Plan Flow 1: learn before auth).
// Server reads seed and hands precomputed entries to the client search.
export default function LibraryPage() {
  const entries: LibraryEntry[] = getAllSupplements().map((supplement) => {
    const topEffect = getEffectsForSupplement(supplement.id).sort((a, b) =>
      compareGrades(a.grade, b.grade),
    )[0];
    return { supplement, topEffect };
  });

  return (
    <main className="container-page max-w-4xl py-12">
      <PageHeader
        title="Library"
        lead="Search supplements and understand the evidence — graded by effect, never overstated."
      />
      <div className="mt-8">
        <SupplementSearch entries={entries} />
      </div>
    </main>
  );
}
