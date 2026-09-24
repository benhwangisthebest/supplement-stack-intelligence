// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — ProfileForm used to call
// `knownMedicationNames()` (`@/lib/interactions/medication-names`) in the browser.
// The profile page now passes `medicationSuggestions()`. Behaviour unchanged: the
// medications field offers exactly the names the lib returns, in its order.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { knownMedicationNames } from "@/lib/interactions/medication-names";
import { ProfileForm } from "./ProfileForm";
import { medicationSuggestions } from "./profile-props";

afterEach(cleanup);

describe("ProfileForm — medication suggestions from the server page (U9)", () => {
  it("offers exactly knownMedicationNames(), in order", () => {
    const expected = knownMedicationNames();
    expect(expected.length).toBeGreaterThan(5); // anti-vacuity
    render(<ProfileForm initial={null} medicationSuggestions={medicationSuggestions()} />);
    const input = screen.getByPlaceholderText("Type and press Enter (e.g. warfarin, metformin)");
    const list = document.getElementById(input.getAttribute("list")!)!;
    expect([...list.querySelectorAll("option")].map((o) => o.value)).toEqual(expected);
  });
});
