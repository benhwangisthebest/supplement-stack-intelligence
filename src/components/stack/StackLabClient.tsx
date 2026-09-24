"use client";

import { useState } from "react";
import type { EvaluationFlag, Stack, StackItem } from "@/types";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { StackWorkspace } from "./StackWorkspace";
import { ProtocolPanel } from "./ProtocolPanel";
import { ProductMatchPanel } from "./ProductMatchPanel";
import type { SupplementOption } from "./AddItemForm";
import type { AttachedProductLabels, StackLabCopy } from "./stack-lab-props";

// Owns the stack's items state so sibling panels stay in sync. Accepting a
// Suggested Protocol item now updates the Items list immediately (no reload).
export function StackLabClient({
  stack,
  initialItems,
  initialFlags,
  supplements,
  copy,
  productLabels,
}: {
  stack: Stack;
  initialItems: StackItem[];
  initialFlags: EvaluationFlag[];
  supplements: SupplementOption[];
  /** Safety copy and product labels, built by the server page (U9, rule 7). */
  copy: StackLabCopy;
  productLabels: AttachedProductLabels;
}) {
  const [items, setItems] = useState<StackItem[]>(initialItems);

  // Add unless it's already present (Accept-all can re-emit existing rows).
  function addItem(item: StackItem) {
    setItems((xs) => (xs.some((x) => x.id === item.id) ? xs : [...xs, item]));
  }

  return (
    <>
      <div className="mt-8">
        <StackWorkspace
          stack={stack}
          items={items}
          setItems={setItems}
          initialFlags={initialFlags}
          supplements={supplements}
          copy={copy}
          productLabels={productLabels}
        />
      </div>

      <div className="mt-10">
        <ProtocolPanel stackId={stack.id} onAccepted={addItem} />
      </div>

      <div className="mt-10">
        <ProductMatchPanel stackId={stack.id} />
      </div>

      <Disclaimer text={copy.evaluationDisclaimer} className="mt-10" />
    </>
  );
}
