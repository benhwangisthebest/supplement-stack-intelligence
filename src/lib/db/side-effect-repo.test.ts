// Ownership pins for `side-effect-repo` (Phase 2 U9).
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import { listSideEffectReports, replaceReportsForDate } from "./side-effect-repo";

const reportRow = {
  id: "r1",
  user_id: "u1",
  report_date: "2026-08-01",
  effect_label: "nausea",
  severity: null,
  note: null,
  created_at: "2026-08-01T00:00:00Z",
};

describe("side-effect-repo — every function binds the owner", () => {
  it("listSideEffectReports filters by user_id", async () => {
    const spy = querySpy({ data: [reportRow] });
    await listSideEffectReports(spy.client, "u1", 30);
    expect(spy.tables).toEqual(["side_effect_reports"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("replaceReportsForDate scopes its DELETE by user_id, not by date alone", async () => {
    // The highest-stakes pin in this file: a delete scoped only by
    // `report_date` removes every user's reports for that day.
    const spy = querySpy({ data: [reportRow] });
    await replaceReportsForDate(spy.client, "u1", "2026-08-01", [{ effectLabel: "nausea" }] as never);
    expect(spy.calls.some((c) => c.method === "delete")).toBe(true);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    expect(spy.filters()).toContainEqual(["report_date", "2026-08-01"]);
  });

  it("replaceReportsForDate writes user_id on every inserted row", async () => {
    const spy = querySpy({ data: [reportRow] });
    await replaceReportsForDate(spy.client, "u1", "2026-08-01", [
      { effectLabel: "nausea" },
      { effectLabel: "headache" },
    ] as never);
    expect(ownerBinding(spy, "u1")).toBe("filter"); // the delete filtered too
    expect(spy.payloads).toHaveLength(2);
    expect(spy.payloads.filter((r) => r.user_id !== "u1")).toEqual([]);
  });

  it("deduplicates by label, so one day cannot hold the same effect twice", async () => {
    const spy = querySpy({ data: [reportRow] });
    await replaceReportsForDate(spy.client, "u1", "2026-08-01", [
      { effectLabel: "nausea" },
      { effectLabel: "nausea" },
    ] as never);
    expect(spy.payloads).toHaveLength(1);
  });

  it("skips the insert entirely when the day's reports are cleared", async () => {
    const spy = querySpy({ data: [] });
    expect(await replaceReportsForDate(spy.client, "u1", "2026-08-01", [])).toEqual([]);
    expect(spy.calls.some((c) => c.method === "insert")).toBe(false);
  });
});
