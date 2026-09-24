// Phase 3 U9 (b), CLAUDE.md §4 rule 7 — Disclaimer became presentational: callers
// pass `DISCLAIMERS.<variant>` instead of a variant key, so the component carries no
// `@/lib` value import into the client components that render it. Behaviour
// unchanged: every standard disclaimer renders verbatim, as the same note element.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DISCLAIMERS } from "@/lib/safety";
import { Disclaimer } from "./Disclaimer";

afterEach(cleanup);

describe("Disclaimer — renders the standard copy it is handed (U9)", () => {
  it.each(Object.entries(DISCLAIMERS))("renders DISCLAIMERS.%s verbatim as a note", (_key, text) => {
    render(<Disclaimer text={text} className="mt-4" />);
    const note = screen.getByRole("note");
    expect(note.textContent).toBe(text);
    expect(note.className).toContain("mt-4");
  });

  it("admits only a standard disclaimer — inline copy does not typecheck", () => {
    // @ts-expect-error — "All text comes from lib/safety — never inline it."
    render(<Disclaimer text="Inline advisory copy" />);
    expect(screen.getByRole("note")).toBeTruthy();
  });
});
