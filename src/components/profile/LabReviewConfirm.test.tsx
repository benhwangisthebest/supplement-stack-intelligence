// [Phase 4 U22] The import review gate, driven through LabUpload so what is
// asserted is the body actually POSTed to /api/lab-import/commit.
// - N-114: the extracted reference range is shown beside the unit, and it is
//   in the extracted unit, so editing the unit saves the range as null (the rule
//   the Profile form has followed since U21). Editing it back restores it.
// - N-116: clearing a row's Value never saves a reading of 0.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DISCLAIMERS, labRangeClearedCopy } from "@/lib/safety";
import { LabReviewConfirm } from "./LabReviewConfirm";
import { LabUpload } from "./LabUpload";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DISCLAIMER = DISCLAIMERS.labs;

const VIT_D = {
  rawLabel: "Vitamin D",
  value: 40,
  unit: "ng/mL",
  referenceLow: 30,
  referenceHigh: 100,
  biomarkerId: "vitamin-d-25oh",
  confidence: "high",
};

const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

async function review(candidates: unknown[]) {
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith("/extract") ? ok({ candidates }) : ok({}),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<LabUpload labsDisclaimer={DISCLAIMER} rangeCleared={labRangeClearedCopy.review} />);
  fireEvent.click(screen.getByRole("button", { name: "Paste table" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Vitamin D, 40, ng/mL" } });
  fireEvent.click(screen.getByRole("button", { name: "Parse pasted table" }));
  await screen.findByText("Review parsed markers");
  return fetchMock;
}

const unitOf = (label: string) => screen.getByLabelText(`Unit for ${label}`) as HTMLInputElement;
const valueOf = (label: string) => screen.getByLabelText(`Value for ${label}`) as HTMLInputElement;

function committed(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown>[] | null {
  const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/commit"));
  if (!call) return null;
  return JSON.parse((call[1] as { body: string }).body).markers;
}

async function confirm(fetchMock: ReturnType<typeof vi.fn>) {
  fireEvent.click(screen.getByRole("button", { name: /Confirm & save/ }));
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  return committed(fetchMock)!;
}

describe("LabReviewConfirm — the extracted range follows its unit (U22, N-114)", () => {
  it("shows the extracted range beside the unit", async () => {
    await review([VIT_D]);
    expect(screen.getByText("30–100")).toBeTruthy();
  });

  it("saves the range when the unit is left as extracted", async () => {
    const f = await review([VIT_D]);
    expect(await confirm(f)).toEqual([
      { rawLabel: "Vitamin D", value: 40, unit: "ng/mL", referenceLow: 30, referenceHigh: 100 },
    ]);
  });

  it("saves the range as null after the unit is edited (30–100 ng/mL → nmol/L)", async () => {
    const f = await review([VIT_D]);
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "nmol/L" } });
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "100" } });
    expect(screen.queryByText("30–100")).toBeNull();
    expect(await confirm(f)).toEqual([
      { rawLabel: "Vitamin D", value: 100, unit: "nmol/L", referenceLow: null, referenceHigh: null },
    ]);
  });

  it("keeps the range when the unit only differs in case or spacing, and restores it on an edit back", async () => {
    const f = await review([VIT_D]);
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "nmol/L" } });
    fireEvent.change(unitOf("Vitamin D"), { target: { value: " NG / mL " } });
    expect(screen.getByText("30–100")).toBeTruthy();
    expect(await confirm(f)).toMatchObject([{ referenceLow: 30, referenceHigh: 100 }]);
  });
});

describe("LabReviewConfirm — a cleared Value is never saved as 0 (U22, N-116)", () => {
  it("does not save a row whose Value was cleared", async () => {
    const f = await review([VIT_D]);
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "" } });
    const button = screen.getByRole("button", { name: /Confirm & save/ }) as HTMLButtonElement;
    fireEvent.click(button);
    await new Promise((r) => setTimeout(r, 0));
    const saved = committed(f);
    expect(saved?.some((m) => m.value === 0) ?? false).toBe(false);
    expect(saved).toBeNull();
  });

  it("saves the row again once a value is typed back, and a typed 0 as 0", async () => {
    const f = await review([VIT_D]);
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "" } });
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "0" } });
    expect(await confirm(f)).toMatchObject([{ value: 0 }]);
  });

  // [U22 review finding 3] The disabled gate is not the only guard: a blank
  // Value never reaches the row as a number, so loosening the gate later cannot
  // bring the 0 back on its own.
  it("never writes a number into the row for a blank Value", () => {
    const onSetRow = vi.fn();
    render(
      <LabReviewConfirm
        rows={[{ ...VIT_D, confidence: "high", approved: true }]}
        approvedCount={1}
        committing={false}
        error={null}
        onSetRow={onSetRow}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        labsDisclaimer={DISCLAIMER}
        rangeCleared={labRangeClearedCopy.review}
      />,
    );
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "" } });
    expect(onSetRow).not.toHaveBeenCalled();
    fireEvent.change(valueOf("Vitamin D"), { target: { value: "7" } });
    expect(onSetRow).toHaveBeenCalledWith(0, { value: 7 });
  });
});

// [Phase 4 U22, N-115; owner approval 2026-10-01] The review says when a unit edit
// cleared a range the user was shown, and stops saying so on an edit back.
describe("LabReviewConfirm — the cleared-range notice (U22, N-115)", () => {
  const notice = () => screen.queryByText(labRangeClearedCopy.review);

  it("shows the notice after a unit edit clears the range, and not after an edit back", async () => {
    await review([VIT_D]);
    expect(notice()).toBeNull();
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "nmol/L" } });
    expect(notice()).toBeTruthy();
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "ng/mL" } });
    expect(notice()).toBeNull();
  });

  it("shows no notice for a row that was extracted without a range", async () => {
    await review([{ ...VIT_D, referenceLow: null, referenceHigh: null }]);
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "nmol/L" } });
    expect(notice()).toBeNull();
  });

  // [U22 review round 2, finding 1] A half-open range was shown too, so clearing
  // it must also be said.
  it("shows the notice when a half-open range is cleared, and saves it as null", async () => {
    const f = await review([{ ...VIT_D, referenceLow: null, referenceHigh: 100 }]);
    expect(screen.getByText("—–100")).toBeTruthy();
    fireEvent.change(unitOf("Vitamin D"), { target: { value: "nmol/L" } });
    expect(notice()).toBeTruthy();
    expect(await confirm(f)).toMatchObject([{ referenceLow: null, referenceHigh: null }]);
  });
});
