// Ownership pins for `lab-panel-repo` (Phase 2 U9).
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import { createPanelWithMarkers, listPanels, listTimelinePoints } from "./lab-panel-repo";

const panelRow = {
  id: "pan1",
  user_id: "u1",
  source: "pdf",
  collected_at: "2026-08-01",
  created_at: "2026-08-01T00:00:00Z",
};

describe("lab-panel-repo — every function binds the owner", () => {
  it("listPanels filters by user_id", async () => {
    const spy = querySpy({ data: [panelRow] });
    await listPanels(spy.client, "u1");
    expect(spy.tables).toEqual(["lab_panels"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("createPanelWithMarkers stamps user_id on the panel AND on every marker", async () => {
    // Two tables, one call. The marker rows are inserted separately from the
    // panel, so the owner has to reach both writes — stamping only the panel
    // would leave the markers owned by nobody and visible under any policy that
    // keys on `user_id`.
    const spy = querySpy({ data: panelRow });
    await createPanelWithMarkers(spy.client, "u1", {
      source: "pdf",
      collectedAt: "2026-08-01",
      markers: [
        { rawLabel: "ferritin", value: 40, unit: "ng/mL", referenceLow: null, referenceHigh: null },
      ],
    } as never);

    expect(spy.tables).toEqual(["lab_panels", "lab_markers"]);
    expect(ownerBinding(spy, "u1")).toBe("payload");
    expect(spy.payloads).toHaveLength(2);
    expect(spy.payloads.filter((r) => r.user_id !== "u1")).toEqual([]);
  });

  it("listTimelinePoints filters BOTH of its queries by user_id", async () => {
    // It reads markers and panels separately and joins them in JS. An owner
    // clause on one query only would join this user's markers to whatever
    // panels came back.
    const spy = querySpy({ data: [] });
    await listTimelinePoints(spy.client, "u1");
    expect(spy.tables).toEqual(["lab_markers", "lab_panels"]);
    const ownerFilters = spy.calls.filter(
      (c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "u1",
    );
    expect(ownerFilters).toHaveLength(2);
  });
});
