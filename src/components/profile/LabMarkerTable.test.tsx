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
import { normalizeUnit } from "@/lib/biomarkers/units";
import { labRangeClearedCopy } from "@/lib/safety";
import { LabMarkerTable, lookupMarkerCatalog, normalizeEnteredUnit } from "./LabMarkerTable";
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
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
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

// [Phase 4 U21] The auto-filled range is in the catalog's unit. Submitted under
// another unit it would be stored as, e.g., "30–100 nmol/L" with ng/mL numbers,
// and statusOf (which now converts user bounds) would read it in the wrong unit.
// So an auto-filled bound the user did not edit is sent as null when the unit at
// submit normalises to something else; the catalog fallback then applies.
describe("LabMarkerTable — an auto-filled range follows its unit (U21)", () => {
  const vitD = markerCatalogEntry("Vitamin D")!;
  const field = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;
  const type = (p: string, v: string) => fireEvent.change(field(p), { target: { value: v } });

  async function submitted(): Promise<Record<string, unknown>> {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as { body: string };
    return JSON.parse(init.body);
  }

  it("normalises units exactly as lib/biomarkers normalizeUnit does", () => {
    const units = SEED_BIOMARKERS.flatMap((b) => [b.canonicalUnit, ...Object.keys(b.unitConversions)]);
    const variants = [...units, ...units.map((u) => ` ${u.toUpperCase()}\t`), "µg/dL", "µmol / L", ""];
    expect(units.length).toBeGreaterThan(10); // anti-vacuity
    expect(variants.map(normalizeEnteredUnit)).toEqual(variants.map(normalizeUnit));
  });

  it("sends the auto-filled range as null when the unit is changed after auto-fill", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    expect(field("Unit").value).toBe(vitD.unit);
    type("Unit", "nmol/L");
    type("Value", "100");
    const body = await submitted();
    expect(body).toMatchObject({ unit: "nmol/L", referenceLow: null, referenceHigh: null });
  });

  it("sends the auto-filled range as null when a different unit was typed first", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Unit", "nmol/L");
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    // [U22, owner approval 2026-10-01] was: shows String(vitD.refLow). The range is
    // auto-filled but not sendable under nmol/L, so it is now shown as sent: blank.
    expect(field("Ref low (optional)").value).toBe("");
    type("Value", "100");
    const body = await submitted();
    expect(body).toMatchObject({ unit: "nmol/L", referenceLow: null, referenceHigh: null });
  });

  it("keeps the auto-filled range when the unit only differs in case or spacing", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    type("Unit", " NG / mL ");
    type("Value", "40");
    const body = await submitted();
    expect(body).toMatchObject({ referenceLow: vitD.refLow, referenceHigh: vitD.refHigh });
  });

  it("keeps a bound the user edited after auto-fill", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    type("Unit", "nmol/L");
    type("Ref low (optional)", "75");
    type("Value", "100");
    const body = await submitted();
    expect(body).toMatchObject({ referenceLow: 75, referenceHigh: null });
  });

  it("keeps a range the user typed for a marker the catalog does not know", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Dragon Enzyme");
    type("Unit", "nmol/L");
    type("Ref low (optional)", "75");
    type("Ref high (optional)", "250");
    type("Value", "100");
    const body = await submitted();
    expect(body).toMatchObject({ referenceLow: 75, referenceHigh: 250 });
  });

  // [Phase 4 U21, review finding 2] Switching to another recognised marker used
  // to keep the first marker's auto-filled bound under the second marker.
  it("refills an untouched bound when the marker switches to another entry", async () => {
    const mg = markerCatalogEntry("Magnesium")!;
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "hs-CRP"); // mg/L, high 3
    type("Unit", "mg/dL");
    type("Marker (e.g. Vitamin D)", "Magnesium"); // mg/dL, 1.7–2.4
    type("Value", "2.8");
    const body = await submitted();
    expect(body).toMatchObject({ unit: "mg/dL", referenceLow: mg.refLow, referenceHigh: mg.refHigh });
  });

  it("refills an untouched bound across two markers in the same unit", async () => {
    const ca = markerCatalogEntry("Calcium")!;
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Glucose"); // mg/dL, high 100
    type("Marker (e.g. Vitamin D)", "Calcium"); // mg/dL, 8.5–10.5
    expect(field("Ref high (optional)").value).toBe(String(ca.refHigh));
    type("Value", "9");
    const body = await submitted();
    expect(body).toMatchObject({ unit: ca.unit, referenceLow: ca.refLow, referenceHigh: ca.refHigh });
  });

  it("keeps a bound the user edited when the marker switches", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Glucose");
    type("Ref high (optional)", "99");
    type("Marker (e.g. Vitamin D)", "Calcium");
    expect(field("Ref high (optional)").value).toBe("99");
  });

  it("moves an auto-filled unit to the new marker's unit on a switch", () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "hs-CRP");
    expect(field("Unit").value).toBe(markerCatalogEntry("hs-CRP")!.unit);
    type("Marker (e.g. Vitamin D)", "Magnesium");
    expect(field("Unit").value).toBe(markerCatalogEntry("Magnesium")!.unit);
  });

  // [Phase 4 U21, review rounds 2 and 3] With a bound or value typed, moving an
  // auto-filled unit on a switch relabels what was typed, and keeping it carries
  // it to the wrong marker. So it is cleared, and submit asks for a unit.
  it.each([
    ["a high bound", "Ref high (optional)"],
    ["a low bound", "Ref low (optional)"],
    ["a value", "Value"],
  ])("clears an auto-filled unit on a switch when the user typed %s", (_what, placeholder) => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "hs-CRP");
    type(placeholder, "4");
    type("Marker (e.g. Vitamin D)", "Magnesium");
    expect(field("Unit").value).toBe("");
  });

  it("clears the unit when a value typed before any unit meets a switch", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Value", "2");
    type("Marker (e.g. Vitamin D)", "Magnesium"); // fills mg/dL
    type("Marker (e.g. Vitamin D)", "hs-CRP");
    expect(field("Unit").value).toBe("");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    vi.unstubAllGlobals();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Marker, numeric value, and unit are required.")).toBeTruthy();
  });

  // [Phase 4 U21, review round 2, finding 2] The server also resolves a name that
  // contains an alias ("Total Magnesium"); the form's exact lookup misses it, so
  // an untouched bound auto-filled for another marker must not be sent with it.
  it("does not send an auto-filled bound once the marker no longer resolves to its entry", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Glucose");
    type("Marker (e.g. Vitamin D)", "Total Magnesium");
    type("Value", "3");
    const body = await submitted();
    expect(body).toMatchObject({ unit: "mg/dL", referenceLow: null, referenceHigh: null });
  });
});

// [Phase 4 U22, N-116] `Number("")` and `Number("  ")` are 0, so an empty Value
// was saved as a reading of 0 (which can read low), and a whitespace-only bound
// was sent as 0. An empty or whitespace Value now fails the form's existing check;
// a whitespace-only bound is sent as null, like an empty one.
describe("LabMarkerTable — an empty field is never a 0 (U22, N-116)", () => {
  const field = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;
  const type = (p: string, v: string) => fireEvent.change(field(p), { target: { value: v } });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])("rejects an %s Value with the existing message and sends nothing", (_what, v) => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Dragon Enzyme");
    type("Unit", "U/L");
    type("Value", v);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    vi.unstubAllGlobals();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Marker, numeric value, and unit are required.")).toBeTruthy();
  });

  it("sends a whitespace-only bound as null, not 0", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Dragon Enzyme");
    type("Unit", "U/L");
    type("Value", "12");
    type("Ref low (optional)", "  ");
    type("Ref high (optional)", "40");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
    expect(body).toMatchObject({ value: 12, referenceLow: null, referenceHigh: 40 });
  });

  it("still sends a typed 0 as 0", async () => {
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);
    type("Marker (e.g. Vitamin D)", "Dragon Enzyme");
    type("Unit", "U/L");
    type("Value", "0");
    type("Ref low (optional)", "0");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
    expect(body).toMatchObject({ value: 0, referenceLow: 0, referenceHigh: null });
  });
});

// [Phase 4 U22, N-115; owner approval 2026-10-01] U21 sends an untouched auto-filled
// range as null once it no longer fits the unit or marker. The user used to keep
// seeing it in the Ref fields. Now the fields show what will be sent (blank) and
// the approved notice says why; a bound the user types, any number, is kept.
describe("LabMarkerTable — a cleared range is shown cleared, with the notice (U22, N-115)", () => {
  const vitD = markerCatalogEntry("Vitamin D")!;
  const field = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;
  const type = (p: string, v: string) => fireEvent.change(field(p), { target: { value: v } });
  const notice = () => screen.queryByText(labRangeClearedCopy.form);
  const mount = () =>
    render(<LabMarkerTable initial={[]} catalog={markerCatalog()} rangeCleared={labRangeClearedCopy.form} />);

  it("blanks the auto-filled range and shows the notice on a unit edit, and restores both on an edit back", () => {
    mount();
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    expect(notice()).toBeNull();
    type("Unit", "nmol/L");
    expect(field("Ref low (optional)").value).toBe("");
    expect(field("Ref high (optional)").value).toBe("");
    expect(notice()).toBeTruthy();
    type("Unit", vitD.unit);
    expect(field("Ref low (optional)").value).toBe(String(vitD.refLow));
    expect(notice()).toBeNull();
  });

  it("blanks the range and shows the notice when the marker no longer resolves to its entry", () => {
    mount();
    type("Marker (e.g. Vitamin D)", "Glucose");
    type("Marker (e.g. Vitamin D)", "Total Magnesium");
    expect(field("Ref high (optional)").value).toBe("");
    expect(notice()).toBeTruthy();
  });

  it("keeps a bound typed after the unit edit, even the auto-filled number", async () => {
    mount();
    type("Marker (e.g. Vitamin D)", "Vitamin D");
    type("Unit", "nmol/L");
    type("Ref low (optional)", String(vitD.refLow));
    type("Ref high (optional)", String(vitD.refHigh));
    type("Value", "100");
    expect(field("Ref low (optional)").value).toBe(String(vitD.refLow));
    expect(notice()).toBeNull();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as { body: string }).body);
    expect(body).toMatchObject({ referenceLow: vitD.refLow, referenceHigh: vitD.refHigh });
  });
});
