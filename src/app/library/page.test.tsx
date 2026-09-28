// Phase 4 U6 (c), owner ruling (2) and approval (5), 2026-09-28. mechanismSummary is
// withheld until sourced, and the Library search is a client component, so its props ARE
// the page payload the browser receives. This finds the SupplementSearch element the
// server page renders and checks those props: no supplement's mechanismSummary, by key
// or by text; every description present, with the background label beside it.
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { BACKGROUND_LABEL } from "@/lib/safety";
import { SupplementSearch } from "@/components/library/SupplementSearch";
import LibraryPage from "./page";

type SearchProps = Parameters<typeof SupplementSearch>[0];

function findSearch(node: ReactNode): ReactElement<SearchProps> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findSearch(child);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (node.type === SupplementSearch) return node as ReactElement<SearchProps>;
  return findSearch((node.props as { children?: ReactNode }).children);
}

describe("/library page payload (U6 (c))", () => {
  const search = findSearch(LibraryPage());

  it("renders the client search", () => {
    expect(search).not.toBeNull();
  });

  it("passes no mechanismSummary to the client, by key or by text", () => {
    const payload = JSON.stringify(search!.props);
    expect(payload).not.toContain("mechanismSummary");
    for (const s of SEED_SUPPLEMENTS) expect(payload, s.id).not.toContain(s.mechanismSummary);
  });

  it("passes every supplement, with its description and the background label", () => {
    const { entries, backgroundLabel } = search!.props;
    expect(backgroundLabel).toBe(BACKGROUND_LABEL);
    expect(entries.map((e) => e.supplement.id).sort()).toEqual(SEED_SUPPLEMENTS.map((s) => s.id).sort());
    for (const e of entries) {
      expect(e.supplement.description).toBe(SEED_SUPPLEMENTS.find((s) => s.id === e.supplement.id)!.description);
    }
  });
});
