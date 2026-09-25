// Phase 3 U10 — CLAUDE.md §5 rule 8: a component rendering a citation ships with a
// component test. IdentityCard's "Why this archetype" trail turns each signal's
// citation into a deep link, using the same resolver as the advisor's chips
// (citationHref). A signal whose citation does not resolve, or that has none,
// renders as plain text, never as a dead link.
// Cycle record: docs/01-plan/features/p3-u10-rule8-tests.plan.md.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { citationHref } from "@/lib/advisor/citation-href";
import { defaultLibrary } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";
import type { IdentityCard as IdentityCardData } from "@/types/identity";
import { IdentityCard } from "./IdentityCard";

afterEach(cleanup);

const effect = defaultLibrary.effects[0];
const linked: Citation = { kind: "effect-grade", refId: effect.id, label: `Grade ${effect.grade}` };
const inert: Citation = { kind: "stack-eval", refId: "made-up", label: "Made-up evaluation" };

const card = (over: Partial<IdentityCardData>): IdentityCardData => ({
  archetype: "evidence-minimalist",
  name: "Made-up Archetype",
  tagline: "Made-up tagline.",
  matchScore: 0.8,
  traits: [],
  confidence: "developing",
  sharpen: [],
  trail: [
    { label: "Linked signal", detail: "Linked detail.", citation: linked },
    { label: "Inert signal", detail: "Inert detail.", citation: inert },
    { label: "Uncited signal", detail: "Uncited detail." },
  ],
  disclaimer: "Made-up disclaimer.",
  ...over,
});

describe("IdentityCard — the cited trail (rule 8)", () => {
  it("the linked fixture resolves to a real Library anchor (anti-vacuity)", () => {
    expect(citationHref(linked)).toMatch(/^\/library\/.+#effect-/);
    expect(citationHref(inert)).toBeNull();
  });

  it("deep-links a signal whose citation resolves, to exactly citationHref's target", () => {
    render(<IdentityCard card={card({})} />);
    const link = screen.getByRole("link", { name: /Linked signal/ });
    expect(link.getAttribute("href")).toBe(citationHref(linked));
  });

  it("renders an unresolvable or absent citation as plain text, not a link", () => {
    render(<IdentityCard card={card({})} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    const trail = screen.getByText("Why this archetype").parentElement!;
    expect(within(trail).getByText("Inert signal")).toBeTruthy();
    expect(within(trail).getByText("Uncited signal")).toBeTruthy();
  });

  it("an emerging card shows the sharpen checklist instead of a cited trail", () => {
    render(<IdentityCard card={card({ confidence: "emerging", sharpen: ["Add a lab marker"] })} />);
    expect(screen.queryByText("Why this archetype")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Add a lab marker")).toBeTruthy();
  });

  it("closes with the card's disclaimer", () => {
    render(<IdentityCard card={card({})} />);
    expect(screen.getByText("Made-up disclaimer.")).toBeTruthy();
  });
});
