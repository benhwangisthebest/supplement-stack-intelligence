import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_PAPERS } from "@/data/seed-papers";
import { SEED_PRODUCTS } from "@/data/seed-products";

// Design Ref: §8.2 — anti-fabrication guards for the trust layer.
// Plan SC: SC-1, SC-2 (G1, G2)
//
// These target the FABRICATION ITSELF, not the pointers between records. A
// referential-integrity check ("every paperId resolves") passes happily over
// invented studies — it validates pointers, not provenance.

const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * G1's roots. [2026-09-23, Phase 3 U2, FU-48] ~~src/ only~~ — the SEED_* corpus
 * is now authored as JSON under content/ (D-2) and generated into src/data/, so
 * a placeholder host written in the source of truth would never reach src/ as
 * anything but generated output. G1 reads both.
 */
const G1_ROOTS = ["src", "content"].map((r) => path.join(REPO_ROOT, r));

/** [2026-09-23, FU-48] ~~/\.(ts|tsx)$/~~ — widened to the authored formats. */
const G1_EXTENSIONS = /\.(ts|tsx|mjs|json)$/;

/** Built at runtime so this file does not itself contain the literal it forbids. */
const PLACEHOLDER_HOST = ["example", "org"].join(".");

/** Provenance fields deleted in v13 — a paper is a summary, not a citable study. */
const FORBIDDEN_PAPER_KEYS = [
  "authors",
  "journal",
  "year",
  "link",
  "sampleSize",
  "studyType",
] as const;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return G1_EXTENSIONS.test(full) ? [full] : [];
  });
}

describe("G1 — no fabricated source links anywhere under src/ or content/", () => {
  const files = G1_ROOTS.flatMap(walk).filter((f) => f !== __filename);

  it("reaches the authored JSON corpus, not only src/ (FU-48 anti-vacuity)", () => {
    const corpus = files.filter((f) => /\/content\/seed\/seed-[^/]+\.json$/.test(f));
    expect(corpus.length).toBe(9);
  });

  it("no source file references the placeholder host", () => {
    const offenders = files
      .filter((f) => readFileSync(f, "utf8").includes(PLACEHOLDER_HOST))
      .map((f) => path.relative(REPO_ROOT, f));

    expect(offenders).toEqual([]);
  });
});

describe("G2 — fabricated provenance is unauthorable", () => {
  it("no seed paper carries a provenance field", () => {
    const offenders = SEED_PAPERS.flatMap((p) => {
      const keys = Object.keys(p);
      return FORBIDDEN_PAPER_KEYS.filter((k) => keys.includes(k)).map((k) => `${p.id}.${k}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps the educational content that makes a summary useful", () => {
    for (const p of SEED_PAPERS) {
      expect(p.title).toBeTruthy();
      expect(p.dose).toBeTruthy();
      expect(p.duration).toBeTruthy();
      expect(p.outcomes).toBeTruthy();
      expect(p.limitations).toBeTruthy();
      expect(p.summary).toBeTruthy();
    }
  });

  it("no seed product carries a fabricated affiliate link", () => {
    const offenders = SEED_PRODUCTS.filter((p) => p.affiliateLink?.includes(PLACEHOLDER_HOST)).map(
      (p) => p.id,
    );

    expect(offenders).toEqual([]);
  });
});
