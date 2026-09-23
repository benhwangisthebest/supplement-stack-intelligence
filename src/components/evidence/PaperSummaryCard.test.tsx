// Phase 3 U6 (c2) — owner scope addition 2026-09-23. A verified paper's card shows its
// PMID/DOI as links to pubmed.ncbi.nlm.nih.gov / doi.org, which is how a reader tells a
// summary's source (IllustrativeDatasetNotice points at the link).
// Red proof: removing the identifier block from PaperSummaryCard fails the first three
// tests (docs/01-plan/features/p3-u6-corpus-verified.plan.md §8).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getPaperById } from "@/lib/evidence";
import type { Paper } from "@/types";
import { PaperSummaryCard } from "./PaperSummaryCard";

afterEach(cleanup);

const base: Paper = {
  id: "p-test",
  title: "A test title",
  population: "p",
  intervention: "i",
  dose: "d",
  duration: "t",
  outcomes: "o",
  limitations: "l",
  summary: "s",
};

describe("PaperSummaryCard — verified identifiers (U6 c2)", () => {
  it("links a PMID to PubMed", () => {
    render(<PaperSummaryCard paper={{ ...base, pmid: "12345678" }} />);
    const link = screen.getByRole("link", { name: "PMID 12345678" });
    expect(link.getAttribute("href")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("links a DOI to doi.org", () => {
    render(<PaperSummaryCard paper={{ ...base, doi: "10.0000/test.1" }} />);
    const link = screen.getByRole("link", { name: "DOI 10.0000/test.1" });
    expect(link.getAttribute("href")).toBe("https://doi.org/10.0000/test.1");
  });

  it("reaches the real corpus: a seed paper verified in U6 shows its PMID link", () => {
    const paper = getPaperById("p-creatine-strength");
    expect(paper?.pmid).toBeDefined();
    render(<PaperSummaryCard paper={paper!} />);
    expect(
      screen.getByRole("link", { name: `PMID ${paper!.pmid}` }).getAttribute("href"),
    ).toBe(`https://pubmed.ncbi.nlm.nih.gov/${paper!.pmid}/`);
  });

  it("a paper with no identifier renders no link and no 'Verified source'", () => {
    render(<PaperSummaryCard paper={base} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByTestId("paper-identifiers")).toBeNull();
  });
});
