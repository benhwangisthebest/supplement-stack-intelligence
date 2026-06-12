"use client";

import { useState } from "react";
import type { ProductMatchResult } from "@/types";
import { ProductMatchCard } from "./ProductMatchCard";

// Design §5.4 — Product Match panel on the stack detail page.
// Matches seed products to each stack item by fit; affiliate never affects order.
export function ProductMatchPanel({ stackId }: { stackId: string }) {
  const [result, setResult] = useState<ProductMatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findProducts() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/products/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stackId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Product match failed.");
      setResult(json.data as ProductMatchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Product match failed.");
    } finally {
      setBusy(false);
    }
  }

  const hasGroups = result && result.groups.length > 0;

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Product Match</h2>
          <p className="text-sm text-neutral-500">
            Real products ranked by fit — never by commission.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void findProducts()}
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Matching…" : result ? "Refresh" : "Find Products"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {result && !hasGroups && (
        <p className="mt-4 text-sm text-neutral-500">
          Add items to your stack to match products.
        </p>
      )}

      {hasGroups && (
        <div className="mt-4 space-y-6">
          {result!.groups.map((g) => (
            <div key={g.stackItemId}>
              <h3 className="mb-2 text-sm font-medium text-neutral-700">
                {g.supplementName}{" "}
                <span className="font-normal text-neutral-400">
                  — target {g.targetDose} {g.targetUnit}
                </span>
              </h3>
              {g.matches.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No matched products in the current catalog.
                </p>
              ) : (
                <div className="space-y-3">
                  {g.matches.map((m) => (
                    <ProductMatchCard key={m.product.id} match={m} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
