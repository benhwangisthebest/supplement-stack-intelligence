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
import { advisorOutcomeCopy } from "@/lib/safety";
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
  render(<AdvisorPanel initialConversations={[]} citationIndex={buildCitationIndex()} outcomeCopy={outcomeCopy} />);
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

// ---- Phase 4 U10 — the confirm surface's two outcomes (D-14 (a), FU-34, N-15) ----
// The copy is the real src/lib/safety text, handed in as the page hands it in.
// Cycle record: docs/01-plan/features/p4-u10-confirm-surface.plan.md.
const outcomeCopy = { ...advisorOutcomeCopy };

function stubFetchWith(stream: string, confirm?: { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/advisor") {
        return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
      }
      if (url === "/api/advisor/actions" && confirm) {
        return new Response(JSON.stringify(confirm.body), {
          status: confirm.status,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
}

async function askWith(stream: string, confirm?: { status: number; body: unknown }) {
  stubFetchWith(stream, confirm);
  render(<AdvisorPanel initialConversations={[]} citationIndex={buildCitationIndex()} outcomeCopy={outcomeCopy} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Ask the advisor" }), {
    target: { value: "Made-up question?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Send" });
}

describe("AdvisorPanel — PARTIALLY_APPLIED renders counts only (U10, D-14 (a), FU-34)", () => {
  const proposing = sse([
    ["token", { delta: "Made-up answer." }],
    ["proposals", { proposals: [proposal], safetyFlags: [] }],
    ["done", { conversationId: "made-up-conversation", status: "proposed" }],
  ]);
  const partial = (details: Record<string, unknown>) => ({
    status: 500,
    body: {
      data: null,
      error: { code: "PARTIALLY_APPLIED", message: "Something went wrong.", details, correlationId: "made-up-cid" },
    },
  });

  it("the approved sentence, built from the reverted and unreverted counts", async () => {
    await askWith(proposing, partial({ rolledBack: false, reverted: 2, unreverted: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    const alert = await screen.findByText(/some changes couldn.t be undone/);
    expect(alert.textContent).toBe(
      advisorOutcomeCopy.partiallyApplied.replace("{reverted}", "2").replace("{unreverted}", "1"),
    );
  });

  it("nothing but the two counts reaches the screen, whatever else details carries", async () => {
    await askWith(
      proposing,
      partial({ rolledBack: false, reverted: 0, unreverted: 1, itemIds: ["SENTINEL-ITEM"], reason: "SENTINEL-REASON", notes: "SENTINEL-NOTES" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await screen.findByText(/some changes couldn.t be undone/);
    expect(document.body.textContent).not.toMatch(/SENTINEL/);
  });

  it("the copy the panel takes is two strings, with no room for anything else", () => {
    expect(Object.keys(outcomeCopy).sort()).toEqual(["aborted", "partiallyApplied"]);
    for (const v of Object.values(outcomeCopy)) expect(typeof v).toBe("string");
    expect(advisorOutcomeCopy.partiallyApplied.match(/\{[a-z]+\}/gi)).toEqual(["{reverted}", "{unreverted}"]);
  });
});

describe("AdvisorPanel — an aborted turn renders a message, not a blank (U10, N-15)", () => {
  it("a done event with status aborted", async () => {
    await askWith(sse([["done", { conversationId: "made-up-conversation", status: "aborted" }]]));
    expect(await screen.findByText(advisorOutcomeCopy.aborted)).toBeTruthy();
  });

  it("a stream that closes with no done or error event, which is what the route sends on abort", async () => {
    await askWith(sse([["progress", { type: "turn-start" }]]));
    expect(await screen.findByText(advisorOutcomeCopy.aborted)).toBeTruthy();
  });

  it("a normal answer is left alone", async () => {
    await askWith(
      sse([
        ["token", { delta: "Made-up answer." }],
        ["done", { conversationId: "made-up-conversation", status: "answered" }],
      ]),
    );
    expect(screen.getByText("Made-up answer.")).toBeTruthy();
    expect(screen.queryByText(advisorOutcomeCopy.aborted)).toBeNull();
  });
});
