import {
  compareGrades,
  getAllSupplements,
  getEffectsForSupplement,
} from "@/lib/evidence";
import {
  SupplementSearch,
  type LibraryEntry,
} from "@/components/library/SupplementSearch";

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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
      <p className="mt-2 text-neutral-600">
        Search supplements and understand the evidence — graded by effect.
      </p>
      <div className="mt-6">
        <SupplementSearch entries={entries} />
      </div>
    </main>
  );
}
