// Ownership pins for `checkin-repo` (Phase 2 U9).
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import { getCheckin, listAllCheckins, listCheckins, upsertCheckin } from "./checkin-repo";

const checkinRow = {
  id: "c1",
  user_id: "u1",
  checkin_date: "2026-08-01",
  ratings: {},
  taken: [],
  scheduled: [],
  note: null,
  side_effect: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

describe("checkin-repo — every function binds the owner", () => {
  it("listCheckins filters by user_id and bounds the window", async () => {
    const spy = querySpy({ data: [checkinRow] });
    await listCheckins(spy.client, "u1", 30);
    expect(spy.tables).toEqual(["checkins"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    expect(spy.calls.some((c) => c.method === "gte" && c.args[0] === "checkin_date")).toBe(true);
  });

  it("listAllCheckins filters by user_id and applies NO window", async () => {
    // The windowing trap, pinned. `listCheckins` above defaults to 90 days,
    // which is right for a dashboard and silently wrong for a data export: the
    // response would look complete while omitting everything older. A `gte`
    // here means the export truncates the user's history.
    const spy = querySpy({ data: [checkinRow] });
    await listAllCheckins(spy.client, "u1");
    expect(spy.tables).toEqual(["checkins"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    expect(
      spy.calls.some((c) => c.method === "gte" || c.method === "lte" || c.method === "limit"),
      "listAllCheckins must not bound its result — a truncated export is indistinguishable from a complete one",
    ).toBe(false);
  });

  it("getCheckin filters by user_id as well as date", async () => {
    // Without the owner clause this returns whoever else checked in that day.
    const spy = querySpy({ data: checkinRow });
    await getCheckin(spy.client, "u1", "2026-08-01");
    expect(spy.filters()).toContainEqual(["checkin_date", "2026-08-01"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("upsertCheckin writes user_id and conflicts on (user_id, date)", async () => {
    const spy = querySpy({ data: checkinRow });
    await upsertCheckin(spy.client, "u1", {
      date: "2026-08-01",
      ratings: {},
      taken: [],
      scheduled: [],
      note: null,
      sideEffect: null,
    } as never);
    expect(ownerBinding(spy, "u1")).toBe("payload");
    // A conflict target of `checkin_date` alone would make two users' entries
    // for the same day collide into one row.
    expect(spy.calls.find((c) => c.method === "upsert")?.args[1]).toMatchObject({
      onConflict: "user_id,checkin_date",
    });
  });
});
