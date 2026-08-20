import { describe, expect, it } from "vitest";

import { errorText } from "./error-text";
import { INTERNAL_ERROR_MESSAGE } from "./respond";

// ---------------------------------------------------------------------------
// ERROR_TEXT — Phase 2 U19, discharging F5.
// ---------------------------------------------------------------------------
// The mutations these are written against, recorded so a later reader can tell
// which assertion is load-bearing and which is scaffolding:
//
//   M1  drop the id branch (always return `message`)   -> "renders the reference"
//   M2  return the id without the message              -> "keeps the message"
//   M3  append the suffix when there is no id          -> the ABSENT-case block
//
// M3 is the one that matters. `correlationId` is absent on every error a user
// is likely to see, so a formatter that gets the absent case wrong is strictly
// worse than the bare `json?.error?.message` it replaces.
// ---------------------------------------------------------------------------

const ID = "3f1c2b0a-9d44-4e51-b7a2-5c6e8d90f123";

describe("ERROR_TEXT — the id is rendered when there is one", () => {
  it("renders the reference after the message", () => {
    expect(errorText(INTERNAL_ERROR_MESSAGE, ID)).toBe(
      `${INTERNAL_ERROR_MESSAGE} (Reference: ${ID})`,
    );
  });

  it("keeps the message verbatim and does not replace it with the id", () => {
    const out = errorText("Compare failed.", ID);
    expect(out.startsWith("Compare failed.")).toBe(true);
    expect(out).toContain(ID);
  });

  it("renders the id exactly, with no truncation or reformatting", () => {
    // The id is only useful if it JOINS to a server log line. Any prettifying
    // here silently breaks that join while still looking right on screen.
    expect(errorText("x", ID)).toContain(ID);
    expect(errorText("x", ID).includes(ID.slice(0, 8) + "…")).toBe(false);
  });
});

describe("ERROR_TEXT — the absent case, which is the common one", () => {
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty string", ""],
    ["whitespace only", "   "],
  ])("returns the message unchanged when the id is %s", (_label, id) => {
    expect(errorText("Please sign in to use the advisor.", id)).toBe(
      "Please sign in to use the advisor.",
    );
  });

  it("never emits the literal string 'undefined' or an empty reference", () => {
    // The exact defect a template literal at each call site would produce.
    for (const id of [undefined, null, "", "  "]) {
      const out = errorText("Failed to save profile.", id);
      expect(out).not.toContain("undefined");
      expect(out).not.toContain("Reference");
    }
  });

  it("is called with one argument at least as often as two, so the default holds", () => {
    expect(errorText("Failed to add item.")).toBe("Failed to add item.");
  });
});

describe("ERROR_TEXT — purity", () => {
  it("is deterministic and does not mutate its inputs", () => {
    expect(errorText(INTERNAL_ERROR_MESSAGE, ID)).toBe(errorText(INTERNAL_ERROR_MESSAGE, ID));
  });

  it("trims surrounding whitespace on the id rather than rendering it", () => {
    expect(errorText("x", ` ${ID} `)).toBe(`x (Reference: ${ID})`);
  });
});
