// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — LabMarkerTable used to call
// `markerSuggestions()` and `markerCatalogEntry()` (`@/lib/biomarkers/marker-catalog`)
// in the browser. The profile page now passes `markerCatalog()`, and the component
// looks a typed name up in it. Behaviour unchanged: the datalist is the lib's list,
// and for every name, alias, case and whitespace variant — and for names the
// catalog does not hold, prototype names included — the lookup returns exactly what
// `markerCatalogEntry` returns, and the form auto-fills from it as before.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { markerCatalogEntry, markerSuggestions } from "@/lib/biomarkers/marker-catalog";
import { LabMarkerTable, lookupMarkerCatalog } from "./LabMarkerTable";
import { markerCatalog } from "./profile-props";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

const names = SEED_BIOMARKERS.flatMap((b) => [b.name, ...b.aliases]);
const inputs = [
  ...names,
  ...names.map((n) => n.toUpperCase()),
  ...names.map((n) => `  ${n}\t`),
  "",
  "   ",
  "no such marker",
  "constructor",
  "__proto__",
  "toString",
  "hasOwnProperty",
];

describe("LabMarkerTable — catalog from the server page (U9)", () => {
  it("answers every lookup exactly as markerCatalogEntry does", () => {
    expect(names.length).toBeGreaterThan(10); // anti-vacuity
    const catalog = markerCatalog();
    expect(inputs.map((i) => lookupMarkerCatalog(catalog, i))).toEqual(
      inputs.map((i) => markerCatalogEntry(i)),
    );
  });

  it("offers markerSuggestions() as the datalist, and auto-fills unit and range from a typed alias", () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} />);
    const marker = screen.getByPlaceholderText("Marker (e.g. Vitamin D)");
    const list = document.getElementById(marker.getAttribute("list")!)!;
    expect([...list.querySelectorAll("option")].map((o) => o.value)).toEqual(markerSuggestions());

    const typed = ` ${SEED_BIOMARKERS[0].aliases[0].toUpperCase()} `;
    const entry = markerCatalogEntry(typed)!;
    fireEvent.change(marker, { target: { value: typed } });
    expect((screen.getByPlaceholderText("Unit") as HTMLInputElement).value).toBe(entry.unit);
    expect((screen.getByPlaceholderText("Ref low (optional)") as HTMLInputElement).value).toBe(
      String(entry.refLow),
    );
    expect((screen.getByPlaceholderText("Ref high (optional)") as HTMLInputElement).value).toBe(
      String(entry.refHigh),
    );
  });
});
