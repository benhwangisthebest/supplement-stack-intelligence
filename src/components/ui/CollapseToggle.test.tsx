// Phase 3 U0 — the component-test harness's own smoke test.
//
// This proves the jsdom project renders a client component and dispatches a
// real DOM event through React. It is the harness's proof, NOT a U7 coverage
// test: `CollapseToggle` was chosen because it imports nothing (no `next/*`,
// no `@/lib`), so a failure here can only mean the harness is broken.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollapseToggle } from "./CollapseToggle";

afterEach(cleanup);

describe("CollapseToggle (U0 harness smoke)", () => {
  it("renders its state into the DOM and reports a click", () => {
    const onToggle = vi.fn();
    render(<CollapseToggle collapsed onToggle={onToggle} label="Protocol" />);

    const button = screen.getByRole("button", { name: "Expand Protocol" });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
