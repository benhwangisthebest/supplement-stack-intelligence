// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a citation ships with a
// component test. AdvisorMessageBubble is one chat message. An assistant message
// must carry its own citations to the source chips. A user message carries none,
// because the advisor's provenance is the engine's, never the user's.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultLibrary } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";
import { AdvisorMessageBubble, type ChatMessageView } from "./AdvisorMessageBubble";
import { buildCitationIndex } from "./citation-index";

afterEach(cleanup);

const index = buildCitationIndex();
const effect = defaultLibrary.effects[0];
const citations: Citation[] = [
  { kind: "effect-grade", refId: effect.id, label: `Made-up → ${effect.name}, Grade ${effect.grade}` },
  { kind: "stack-eval", refId: "made-up", label: "Made-up stack evaluation" },
];

const message = (over: Partial<ChatMessageView>): ChatMessageView => ({
  role: "assistant",
  content: "Made-up answer.",
  citations,
  ...over,
});

describe("AdvisorMessageBubble — the answer's own citations (rule 8)", () => {
  it("an assistant message lists each of its citations under Sources", () => {
    render(<AdvisorMessageBubble message={message({})} citationIndex={index} />);
    const sources = screen.getByRole("list", { name: "Sources" });
    expect(within(sources).getAllByRole("listitem")).toHaveLength(citations.length);
    expect(within(sources).getByText(citations[0].label)).toBeTruthy();
    expect(within(sources).getByText("Made-up stack evaluation")).toBeTruthy();
    expect(screen.getByText("Made-up answer.")).toBeTruthy();
  });

  it("a user message shows no Sources, even if handed citations", () => {
    render(<AdvisorMessageBubble message={message({ role: "user" })} citationIndex={index} />);
    expect(screen.queryByRole("list", { name: "Sources" })).toBeNull();
  });

  it("an assistant message with no citations shows no Sources", () => {
    render(<AdvisorMessageBubble message={message({ citations: [] })} citationIndex={index} />);
    expect(screen.queryByRole("list", { name: "Sources" })).toBeNull();
  });
});
