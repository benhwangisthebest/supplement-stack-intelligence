// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — LabMarkerModal used to call
// `normalizeMarker()` (`@/lib/biomarkers`) in the browser to pick the readings that
// belong to the open biomarker. The profile page now passes
// `biomarkerIdsByMarker(markers)` down through LabTimeline. Behaviour unchanged: for
// every seed biomarker, the history lists exactly the rows normalizeMarker assigns
// to it — exact names, aliases, noisy "contains" spellings, and none of the rest.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { normalizeMarker } from "@/lib/biomarkers";
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
          onClose={() => {}}
        />,
      );
      expect(historyValues().sort()).toEqual(expected.sort());
    },
  );
});
