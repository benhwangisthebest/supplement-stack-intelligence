// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a citation or a safety
// flag ships with a component test. AdvisorPanel consumes the advisor's event
// stream. The citations and the projected safety flags that arrive on it must reach
// the message they belong to: the chips under Sources, and the flags on the
// proposal card, where a critical one blocks Confirm. `fetch` is stubbed with a
// canned event stream: no request leaves the process, and no model is called.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Citation } from "@/types/advisor";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";
import { AdvisorPanel } from "./AdvisorPanel";
import { buildCitationIndex } from "./citation-index";

const citations: Citation[] = [{ kind: "stack-eval", refId: "made-up", label: "Made-up stack evaluation" }];

const proposal: ActionProposal = {
  type: "add_item",
  stackId: "made-up-stack",
  payload: { supplementId: "magnesium", dose: 200, unit: "mg", timing: null, frequency: null, reason: null },
  diff: [{ label: "Add Magnesium", after: "200 mg" }],
  editable: null,
  rationaleCitations: [],
};

const safetyFlags: DraftFlag[] = [
  {
    stackItemId: null,
    severity: "critical",
    category: "medication-caution",
    title: "Made-up critical flag",
    explanation: "Made-up explanation.",
    recommendation: "Made-up recommendation.",
    evidenceLevel: "B",
  },
];

const sse = (events: [string, unknown][]) =>
  events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join("");

function stubFetch(stream: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/advisor") {
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

// jsdom implements no Element.prototype.scrollTo; the panel scrolls after each message.
// A test-environment gap, stubbed here rather than changed in the component.
const realScrollTo = Element.prototype.scrollTo;

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
  stubFetch(
    sse([
      ["token", { delta: "Made-up answer." }],
      ["citations", { citations }],
      ["proposals", { proposals: [proposal], safetyFlags }],
      ["done", { conversationId: "made-up-conversation", status: "proposed" }],
    ]),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Element.prototype.scrollTo = realScrollTo;
});

async function ask() {
  render(<AdvisorPanel initialConversations={[]} citationIndex={buildCitationIndex()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Ask the advisor" }), {
    target: { value: "Made-up question?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Made-up answer.");
  await screen.findByRole("button", { name: "Send" });
}

describe("AdvisorPanel — streamed citations and safety flags reach the message (rule 8)", () => {
  it("the answer's citations appear under Sources", async () => {
    await ask();
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getByText("Made-up stack evaluation")).toBeTruthy();
  });

  it("the proposal's safety flags appear on its card, and a critical one blocks Confirm", async () => {
    await ask();
    const flags = screen.getByRole("list", { name: "Safety flags" });
    expect(within(flags).getByText("⚠ Made-up critical flag")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" }).hasAttribute("disabled")).toBe(true);
  });
});
