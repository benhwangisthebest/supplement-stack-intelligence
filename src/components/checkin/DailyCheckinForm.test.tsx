// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — DailyCheckinForm used to import
// `checkinCopy` (`@/lib/safety`) and `sideEffectLabel` (`@/lib/side-effects/vocab`)
// in the browser. It now receives `checkinFormCopy()`, built by the Stack Lab page.
// Behaviour unchanged: every picker option, logged chip and its controls carry the
// label `sideEffectLabel` gives, and the note disclaimer renders verbatim.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { checkinCopy } from "@/lib/safety";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import { SIDE_EFFECT_VOCAB } from "@/types/side-effect";
import { checkinFormCopy } from "./checkin-props";
import { DailyCheckinForm } from "./DailyCheckinForm";

afterEach(cleanup);

function renderForm(reported: (typeof SIDE_EFFECT_VOCAB)[number][] = []) {
  render(
    <DailyCheckinForm
      date="2026-09-24"
      items={[]}
      goals={[]}
      initial={null}
      initialSideEffects={reported.map((effectLabel) => ({ effectLabel }))}
      copy={checkinFormCopy()}
    />,
  );
}

describe("DailyCheckinForm — labels and disclaimer from the server page (U9)", () => {
  it("covers the whole vocabulary (anti-vacuity)", () => {
    expect(SIDE_EFFECT_VOCAB.length).toBeGreaterThan(5);
    expect(Object.keys(checkinFormCopy().sideEffectLabels).sort()).toEqual([...SIDE_EFFECT_VOCAB].sort());
  });

  it("renders the note disclaimer verbatim", () => {
    renderForm();
    expect(screen.getByText(checkinCopy.sideEffectDisclaimer)).toBeTruthy();
  });

  it("labels every picker option as sideEffectLabel does", () => {
    renderForm();
    const picker = screen.getByRole("combobox", { name: "Side-effect to log" });
    const options = within(picker)
      .getAllByRole("option")
      .filter((o) => (o as HTMLOptionElement).value !== "");
    expect(options.map((o) => [(o as HTMLOptionElement).value, o.textContent])).toEqual(
      SIDE_EFFECT_VOCAB.map((v) => [v, sideEffectLabel(v)]),
    );
  });

  it("labels every logged chip, its severity group and its remove button as sideEffectLabel does", () => {
    renderForm([...SIDE_EFFECT_VOCAB]);
    for (const v of SIDE_EFFECT_VOCAB) {
      const label = sideEffectLabel(v);
      expect(screen.getByRole("radiogroup", { name: `${label} severity` })).toBeTruthy();
      expect(screen.getByRole("button", { name: `Remove ${label}` })).toBeTruthy();
    }
    expect(
      screen.getAllByRole("listitem").map((li) => li.querySelector("span")!.textContent),
    ).toEqual(SIDE_EFFECT_VOCAB.map((v) => sideEffectLabel(v)));
  });
});
