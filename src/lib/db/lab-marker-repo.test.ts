// Ownership pins for `lab-marker-repo` (Phase 2 U9).
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import {
  createLabMarker,
  deleteLabMarker,
  listLabMarkers,
  updateLabMarker,
} from "./lab-marker-repo";

const markerRow = {
  id: "m1",
  user_id: "u1",
  panel_id: null,
  marker: "ferritin",
  value: 40,
  unit: "ng/mL",
  reference_low: null,
  reference_high: null,
  date: "2026-08-01",
  notes: null,
  biomarker_id: null,
  canonical_value: null,
  canonical_unit: null,
  created_at: "2026-08-01T00:00:00Z",
};

const input = {
  marker: "ferritin",
  value: 40,
  unit: "ng/mL",
  referenceLow: null,
  referenceHigh: null,
  date: "2026-08-01",
  notes: null,
};

describe("lab-marker-repo — every function binds the owner", () => {
  // Lab results are health data (§2.3 rule 15). An unscoped read here is the
  // most consequential leak in the schema, and RLS is not the only reason it
  // does not happen.
  it("listLabMarkers filters by user_id", async () => {
    const spy = querySpy({ data: [markerRow] });
    await listLabMarkers(spy.client, "u1");
    expect(spy.tables).toEqual(["lab_markers"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("createLabMarker writes user_id into the row", async () => {
    const spy = querySpy({ data: markerRow });
    await createLabMarker(spy.client, "u1", input as never);
    expect(ownerBinding(spy, "u1")).toBe("payload");
  });

  it("updateLabMarker filters by user_id as well as id", async () => {
    const spy = querySpy({ data: markerRow });
    await updateLabMarker(spy.client, "u1", "m1", input as never);
    expect(spy.filters()).toContainEqual(["id", "m1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("deleteLabMarker filters by user_id as well as id", async () => {
    const spy = querySpy({ data: null });
    await deleteLabMarker(spy.client, "u1", "m1");
    expect(spy.calls.some((c) => c.method === "delete")).toBe(true);
    expect(spy.filters()).toContainEqual(["id", "m1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });
});
