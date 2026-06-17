import { describe, expect, it } from "vitest";
import type { Citation, ToolResult } from "@/types/advisor";
import { buildCitations, hasNoGrounding } from "./citations";

const cite = (kind: Citation["kind"], refId: string, label = refId): Citation => ({
  kind,
  refId,
  label,
});

const okResult = (citations: Citation[]): ToolResult => ({
  ok: true,
  data: {},
  citations,
});
const emptyResult = (): ToolResult => ({
  ok: false,
  data: null,
  emptyReason: "none",
  citations: [],
});

describe("buildCitations", () => {
  it("flattens ok results and preserves first-seen order", () => {
    const out = buildCitations([
      okResult([cite("effect-grade", "e1"), cite("interaction-rule", "r1")]),
      okResult([cite("biomarker-rule", "b1")]),
    ]);
    expect(out.map((c) => c.refId)).toEqual(["e1", "r1", "b1"]);
  });

  it("de-duplicates by kind+refId", () => {
    const out = buildCitations([
      okResult([cite("effect-grade", "e1")]),
      okResult([cite("effect-grade", "e1"), cite("paper", "e1")]),
    ]);
    // same refId but different kind is NOT a dup; same kind+refId is.
    expect(out.map((c) => `${c.kind}:${c.refId}`)).toEqual([
      "effect-grade:e1",
      "paper:e1",
    ]);
  });

  it("ignores citations from non-ok (refused) results", () => {
    const out = buildCitations([
      emptyResult(),
      okResult([cite("lab-trend", "t1")]),
    ]);
    expect(out.map((c) => c.refId)).toEqual(["t1"]);
  });
});

describe("hasNoGrounding", () => {
  it("true when empty or all results are refusals", () => {
    expect(hasNoGrounding([])).toBe(true);
    expect(hasNoGrounding([emptyResult(), emptyResult()])).toBe(true);
  });
  it("false when at least one result is ok", () => {
    expect(hasNoGrounding([emptyResult(), okResult([])])).toBe(false);
  });
});
