"use client";

import { useState } from "react";
import type { ProductMatchResult } from "@/types";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { ProductMatchCard } from "./ProductMatchCard";

// Design §5.4 — Product Match panel on the stack detail page.
// Matches seed products to each stack item by fit; affiliate never affects order.
export function ProductMatchPanel({ stackId }: { stackId: string }) {
  const [result, setResult] = useState<ProductMatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
    <section className="rounded-lg border border-hairline p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Product Match</h2>
          <p className="text-sm text-muted">
            Real products ranked by fit — never by commission.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void findProducts()}
            disabled={busy}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Matching…" : result ? "Refresh" : "Find Products"}
          </button>
          <CollapseToggle
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            label="product match"
          />
        </div>
      </div>

      {collapsed ? null : (
        <>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}

      {result && !hasGroups && (
        <p className="mt-4 text-sm text-muted">
          Add items to your stack to match products.
        </p>
      )}

      {hasGroups && (
        <div className="mt-4 space-y-6">
          {result!.groups.map((g) => (
            <div key={g.stackItemId}>
              <h3 className="mb-2 text-sm font-medium text-body">
                {g.supplementName}{" "}
                <span className="font-normal text-muted-soft">
                  — target {g.targetDose} {g.targetUnit}
                </span>
              </h3>
              {g.matches.length === 0 ? (
                <p className="text-sm text-muted">
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
        </>
      )}
    </section>
  );
}
