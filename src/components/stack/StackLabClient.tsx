"use client";

import { useState } from "react";
import type { EvaluationFlag, Stack, StackItem } from "@/types";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { StackWorkspace } from "./StackWorkspace";
import { ProtocolPanel } from "./ProtocolPanel";
import { ProductMatchPanel } from "./ProductMatchPanel";
import type { SupplementOption } from "./AddItemForm";

// Owns the stack's items state so sibling panels stay in sync. Accepting a
// Suggested Protocol item now updates the Items list immediately (no reload).
export function StackLabClient({
  stack,
  initialItems,
  initialFlags,
  supplements,
}: {
  stack: Stack;
  initialItems: StackItem[];
  initialFlags: EvaluationFlag[];
  supplements: SupplementOption[];
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
        />
      </div>

      <div className="mt-10">
        <ProtocolPanel stackId={stack.id} onAccepted={addItem} />
      </div>

      <div className="mt-10">
        <ProductMatchPanel stackId={stack.id} />
      </div>

      <Disclaimer variant="evaluation" className="mt-10" />
    </>
  );
}
