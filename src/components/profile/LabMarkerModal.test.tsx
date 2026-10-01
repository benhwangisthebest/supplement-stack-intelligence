// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — LabMarkerModal used to call
// `normalizeMarker()` (`@/lib/biomarkers`) in the browser to pick the readings that
// belong to the open biomarker. The profile page now passes
// `biomarkerIdsByMarker(markers)` down through LabTimeline. Behaviour unchanged: for
// every seed biomarker, the history lists exactly the rows normalizeMarker assigns
// to it — exact names, aliases, noisy "contains" spellings, and none of the rest.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { normalizeMarker } from "@/lib/biomarkers";
import { labRangeClearedCopy } from "@/lib/safety";
import type { LabMarker } from "@/types";
import type { TrendSignal } from "@/types/lab";
import { LabMarkerModal } from "./LabMarkerModal";
import { biomarkerIdsByMarker } from "./profile-props";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

const spellings = [
  ...SEED_BIOMARKERS.flatMap((b) => [b.name, ...b.aliases, `serum ${b.name}, per unit`]),
  "no such marker",
  "constructor",
];
// Unique five-digit values, so each rendered row is identifiable by its value alone.
const markers: LabMarker[] = spellings.map((marker, i) => ({
  id: `row-${i}`,
  userId: "made-up-user",
  marker,
  value: 90000 + i,
  unit: "u",
  referenceLow: null,
  referenceHigh: null,
  date: null,
  notes: null,
}));

const trendFor = (biomarkerId: string, biomarkerName: string): TrendSignal => ({
  biomarkerId,
  biomarkerName,
  latest: { value: 1, unit: "u", collectedAt: "2026-01-01" } as TrendSignal["latest"],
  previous: null,
  delta: null,
  pctChange: null,
  direction: "insufficient",
  windowDays: null,
  points: 1,
});

function historyValues(): number[] {
  const heading = screen.getByText("Reading history");
  const list = heading.nextElementSibling!;
  return [...list.querySelectorAll(":scope > li")].map((li) => Number(/9\d{4}/.exec(li.textContent!)![0]));
}

describe("LabMarkerModal — readings chosen by server-computed biomarker ids (U9)", () => {
  it.each(SEED_BIOMARKERS.map((b) => [b.id, b.name]))(
    "lists exactly the rows normalizeMarker assigns to %s",
    (id, name) => {
      const expected = markers.filter((m) => normalizeMarker(m.marker) === id).map((m) => m.value);
      expect(expected.length).toBeGreaterThan(0); // anti-vacuity
      render(
        <LabMarkerModal
          trend={trendFor(id, name)}
          points={[]}
          markers={markers}
          biomarkerIds={biomarkerIdsByMarker(markers)}
          rangeCleared={labRangeClearedCopy.form}
          onClose={() => {}}
        />,
      );
      expect(historyValues().sort()).toEqual(expected.sort());
    },
  );
});

// [Phase 4 U22, owner ruling 2026-10-01] The per-reading edit had both halves of
// N-116 (a cleared Value saved as 0, a whitespace bound sent as 0) and N-114's
// class: an edited Unit kept the stored bounds, re-sent under the new unit. Now
// stored bounds the user did not re-type are cleared, visibly and with the form
// notice, while the unit differs from the stored one. Re-typed bounds are kept.
describe("LabMarkerModal — the per-reading edit never saves a false value (U22)", () => {
  const vitD: LabMarker = {
    id: "r1",
    userId: "made-up-user",
    marker: "Vitamin D",
    value: 40,
    unit: "ng/mL",
    referenceLow: 30,
    referenceHigh: 100,
    date: "2026-01-01",
    notes: null,
  };
  const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
  const type = (label: string, v: string) => fireEvent.change(field(label), { target: { value: v } });

  function open() {
    render(
      <LabMarkerModal
        trend={trendFor("vitamin-d-25oh", "Vitamin D")}
        points={[]}
        markers={[vitD]}
        biomarkerIds={{ r1: "vitamin-d-25oh" }}
        rangeCleared={labRangeClearedCopy.form}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  }

  async function saved(): Promise<Record<string, unknown>> {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    return JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
  }

  it.each([["empty", ""], ["whitespace-only", "  "]])(
    "rejects an %s Value with the existing message and sends nothing",
    (_what, v) => {
      open();
      type("Value", v);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      vi.unstubAllGlobals();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByText("A numeric value and a unit are required.")).toBeTruthy();
    },
  );

  it("sends a whitespace-only bound as null, not 0", async () => {
    open();
    type("Reference low", "  ");
    expect(await saved()).toMatchObject({ value: 40, referenceLow: null, referenceHigh: 100 });
  });

  it("clears the stored bounds, visibly and with the notice, when the Unit is edited", async () => {
    open();
    expect(screen.queryByText(labRangeClearedCopy.form)).toBeNull();
    type("Unit", "nmol/L");
    type("Value", "100");
    expect(field("Reference low").value).toBe("");
    expect(field("Reference high").value).toBe("");
    expect(screen.getByText(labRangeClearedCopy.form)).toBeTruthy();
    expect(await saved()).toMatchObject({
      value: 100,
      unit: "nmol/L",
      referenceLow: null,
      referenceHigh: null,
    });
  });

  it("keeps a bound the user re-typed after the Unit edit, even the stored number", async () => {
    open();
    type("Unit", "nmol/L");
    type("Reference low", "30");
    type("Reference high", "250");
    expect(field("Reference low").value).toBe("30");
    expect(screen.queryByText(labRangeClearedCopy.form)).toBeNull();
    expect(await saved()).toMatchObject({ unit: "nmol/L", referenceLow: 30, referenceHigh: 250 });
  });

  it("keeps the stored bounds when the Unit only differs in case or spacing", async () => {
    open();
    type("Unit", " NG / mL ");
    expect(screen.queryByText(labRangeClearedCopy.form)).toBeNull();
    expect(await saved()).toMatchObject({ referenceLow: 30, referenceHigh: 100 });
  });

  // [U22 review round 2, finding 1] The typed flags belong to one edit. Carried to
  // the next reading, they would send its stored bounds under an edited unit.
  it("does not carry typed bounds from one reading's edit to the next", async () => {
    const older: LabMarker = { ...vitD, id: "r0", value: 35, date: "2025-06-01" };
    render(
      <LabMarkerModal
        trend={trendFor("vitamin-d-25oh", "Vitamin D")}
        points={[]}
        markers={[vitD, older]}
        biomarkerIds={{ r1: "vitamin-d-25oh", r0: "vitamin-d-25oh" }}
        rangeCleared={labRangeClearedCopy.form}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    type("Reference low", "31");
    type("Reference high", "99");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]); // the other reading
    expect(field("Value").value).toBe("35");
    type("Unit", "nmol/L");
    expect(screen.getByText(labRangeClearedCopy.form)).toBeTruthy();
    expect(await saved()).toMatchObject({ value: 35, referenceLow: null, referenceHigh: null });
  });
});
