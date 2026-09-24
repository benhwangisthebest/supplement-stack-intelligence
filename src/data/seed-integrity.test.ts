import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_PAPERS } from "@/data/seed-papers";
import { SEED_PRODUCTS } from "@/data/seed-products";
import { deriveGrade } from "@/lib/evidence-grading";
import { containsBannedLanguage } from "@/lib/safety";
import { paperSchema } from "@/lib/validation/seed";
import type { EvidenceProfile } from "@/types/evidence-grading";

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

  // [2026-09-23, Phase 3 U5, N-80] The list above is an ENUMERATION: it never
  // named doi/pmid, so adding either reddened nothing. G2 now also DERIVES the
  // permitted keys from paperSchema, which tsc holds equal to Paper (seed.ts
  // _PaperSchemaConformsToPaper). A key outside it fails here whatever its name;
  // doi/pmid are inside it, and provenance-record.test.ts decides whether a value
  // is verified.
  it("no authored paper carries a key outside paperSchema", () => {
    const allowed = new Set(Object.keys(paperSchema.shape));
    const authored = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "content/seed/seed-papers.json"), "utf8"),
    ) as Record<string, unknown>[];
    expect(authored.length).toBeGreaterThan(0);
    const offenders = authored.flatMap((p) =>
      Object.keys(p).filter((k) => !allowed.has(k)).map((k) => `${String(p.id)}.${k}`),
    );
    expect(offenders).toEqual([]);
  });

  it("paperSchema itself admits none of the v13 provenance fields", () => {
    const shape = Object.keys(paperSchema.shape);
    expect(FORBIDDEN_PAPER_KEYS.filter((k) => shape.includes(k))).toEqual([]);
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

// G3 — every `paperIds` entry in the authored corpus resolves (Phase 3 U2, P-06).
// Reads content/seed/*.json, the source of truth, not the generated modules:
// CONTENT_FIDELITY makes those byte-equal, so this also covers src/data/.
// It walks every `paperIds` array at any depth (effect level, evidence-profile
// dimension level, side-effect profiles), so a new citing site is covered the
// day it is written. This checks POINTERS, not provenance (see the header):
// it is G1/G2's complement, not a substitute.
describe("G3 — every paperIds entry in content/seed/ resolves to a seed paper", () => {
  const SEED_JSON = path.join(REPO_ROOT, "content/seed");
  const read = (f: string): unknown => JSON.parse(readFileSync(path.join(SEED_JSON, f), "utf8"));
  const paperIds = new Set((read("seed-papers.json") as { id: string }[]).map((p) => p.id));

  const refs: { where: string; id: unknown }[] = [];
  function collect(node: unknown, where: string): void {
    if (Array.isArray(node)) return node.forEach((n, i) => collect(n, `${where}[${i}]`));
    if (node === null || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (k === "paperIds" && Array.isArray(v)) v.forEach((id, i) => refs.push({ where: `${where}.${k}[${i}]`, id }));
      else collect(v, `${where}.${k}`);
    }
  }
  for (const f of readdirSync(SEED_JSON).filter((n) => n.endsWith(".json"))) collect(read(f), f);

  it("finds references at both effect and evidence-profile level (anti-vacuity)", () => {
    expect(paperIds.size).toBeGreaterThan(0);
    expect(refs.some((r) => r.where.includes(".evidenceProfile."))).toBe(true);
    expect(refs.some((r) => /^seed-effects\.json\[\d+\]\.paperIds\[/.test(r.where))).toBe(true);
  });

  it("no dangling paperId", () => {
    const dangling = refs.filter((r) => typeof r.id !== "string" || !paperIds.has(r.id));
    expect(dangling.map((r) => `${r.where} = ${JSON.stringify(r.id)}`)).toEqual([]);
  });
});

// G4 — an effect's grade is DERIVED where a profile exists (Phase 3 U3).
// Reads the authored source, content/seed/seed-effects.json, as G3 does. The JSON
// keeps `grade` (the generator is plain node and cannot reach the TypeScript
// derivation without a second copy of the rubric), so the letter is a cache of
// deriveGrade(evidenceProfile) and any other letter fails here. Runtime already
// re-derives it (resolveEffect, src/lib/evidence/index.ts). Design:
// docs/01-plan/features/p3-u3-derived-grade.plan.md §3.
//
// A grade with NO profile is a hand-typed claim with no derivation behind it and
// fails, except for the effects below. SHRINK-ONLY: U4 authors their profiles and
// deletes each entry in the same change (G4e reddens a stale entry); nothing may
// be added (G4d: the list stays a subset of ALLOWLIST_ORIGIN, the 19 measured at
// 697a79c — owner ruling 2026-09-23, FU-55, replacing a size ceiling that would
// have let a new id back in once U4 had removed some).
const ALLOWLIST_ORIGIN: ReadonlySet<string> = new Set([
  "magnesium-stress",
  "magnesium-metabolic",
  "creatine-recovery",
  "vitamin-d-immune",
  "fish-oil-mood",
  "fish-oil-longevity",
  "l-theanine-focus",
  "l-theanine-stress",
  "glycine-sleep",
  "ashwagandha-sleep",
  "berberine-metabolic",
  "zinc-immune",
  "zinc-deficiency",
  "vitamin-b12-deficiency",
  "caffeine-training",
  "taurine-training",
  "nac-antioxidant",
  "protein-powder-training",
  "protein-powder-recovery",
]);
// [2026-09-23] EMPTY since U4 B4: all 27 effects carry a profile ([P3-X1]). Kept, not
// deleted, so G4d/G4f still bind it: an entry can only come back from ALLOWLIST_ORIGIN.
const UNPROFILED_GRADE_ALLOWLIST: readonly string[] = [];

describe("G4 — an effect's grade is derived from its evidenceProfile", () => {
  type AuthoredEffect = { id: string; grade: string; evidenceProfile?: EvidenceProfile };
  const effects = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "content/seed/seed-effects.json"), "utf8"),
  ) as AuthoredEffect[];
  const effectIds = new Set(effects.map((e) => e.id));
  const allowed = new Set(UNPROFILED_GRADE_ALLOWLIST);

  it("G4a reads the authored effects, profiled and not (anti-vacuity)", () => {
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.some((e) => e.evidenceProfile)).toBe(true);
  });

  it("G4b a profiled effect's grade equals deriveGrade(evidenceProfile)", () => {
    const mismatched = effects
      .filter((e) => e.evidenceProfile && deriveGrade(e.evidenceProfile) !== e.grade)
      .map((e) => `${e.id}: authored ${e.grade}, derived ${deriveGrade(e.evidenceProfile!)}`);
    expect(mismatched).toEqual([]);
  });

  it("G4c a grade without a profile fails unless allowlisted", () => {
    const underived = effects.filter((e) => !e.evidenceProfile && !allowed.has(e.id)).map((e) => e.id);
    expect(underived).toEqual([]);
  });

  it("G4d the allowlist only shrinks: every entry is in ALLOWLIST_ORIGIN", () => {
    expect(UNPROFILED_GRADE_ALLOWLIST.filter((id) => !ALLOWLIST_ORIGIN.has(id))).toEqual([]);
  });

  it("G4e no allowlisted effect has a profile (stale entry)", () => {
    const stale = effects.filter((e) => e.evidenceProfile && allowed.has(e.id)).map((e) => e.id);
    expect(stale).toEqual([]);
  });

  it("G4f every allowlisted id is an effect id, listed once", () => {
    expect(UNPROFILED_GRADE_ALLOWLIST.filter((id) => !effectIds.has(id))).toEqual([]);
    expect(allowed.size).toBe(UNPROFILED_GRADE_ALLOWLIST.length);
  });
});

// G5 — confidence follows the grade exactly (Phase 3 U4; owner rulings R8, then R14,
// 2026-09-23). `confidence` is hand-authored beside a DERIVED grade, so once U4 moved
// letters an effect could say "high" at Grade C, or "low" at Grade B, and every
// surface showing both would contradict itself. R8 forbade only "high" below B
// (red: zinc-deficiency, C/high). R14 fixes the whole mapping: A → high,
// B → moderate, C and D → low. Red proof for R14: the 4 effects then mismatched
// (fish-oil-mood, l-theanine-stress, glycine-sleep, ashwagandha-sleep) failed
// G5b before their confidence was set, and a planted mismatch failed after
// (docs/01-plan/features/p3-u4-profiles.plan.md).
const CONFIDENCE_FOR_GRADE: Readonly<Record<string, string>> = { A: "high", B: "moderate", C: "low", D: "low" };

describe("G5 — confidence follows the grade (A high · B moderate · C/D low)", () => {
  const effects = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "content/seed/seed-effects.json"), "utf8"),
  ) as { id: string; grade: string; confidence: string }[];

  it("G5a reads the authored effects, with every grade mapped (anti-vacuity)", () => {
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.filter((e) => !(e.grade in CONFIDENCE_FOR_GRADE)).map((e) => e.id)).toEqual([]);
  });

  it("G5b every effect's confidence is the one its grade maps to", () => {
    const bad = effects.filter((e) => e.confidence !== CONFIDENCE_FOR_GRADE[e.grade]);
    expect(bad.map((e) => `${e.id}: Grade ${e.grade}, confidence ${e.confidence} (expected ${CONFIDENCE_FOR_GRADE[e.grade]})`)).toEqual([]);
  });
});

// G6 — a dimension scored above 0 cites a paper (Phase 3 U4, owner ruling R5, 2026-09-23).
// The rubric reads only `score`, so nothing stopped a dimension claiming "moderate"
// or "strong" with an empty paperIds, i.e. with no verified evidence behind it.
// R5 rules that an uncited dimension scores 0. Red proof: at U4 B5's base this
// failed on exactly magnesium-sleep/populationRelevance (2) and
// melatonin-sleep/populationRelevance (3), whose citations U6 had removed.
describe("G6 — score > 0 requires a cited paper (R5)", () => {
  const effects = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "content/seed/seed-effects.json"), "utf8"),
  ) as { id: string; evidenceProfile?: EvidenceProfile }[];
  const dims = effects.flatMap((e) =>
    Object.entries(e.evidenceProfile?.dimensions ?? {}).map(([k, d]) => ({ at: `${e.id}/${k}`, d })),
  );

  it("G6a reads every profile dimension (anti-vacuity)", () => {
    expect(dims.length).toBeGreaterThan(100);
  });

  it("G6b no dimension scores above 0 with an empty paperIds", () => {
    expect(dims.filter(({ d }) => d.score > 0 && d.paperIds.length === 0).map(({ at, d }) => `${at}: score ${d.score}, no paper`)).toEqual([]);
  });
});

// G7 — the seed-text safety sweep (Phase 3 U4, AC-3; CLAUDE.md §2.1 rule 6). Every
// rendered effect summary and every dimension rationale in the authored corpus is
// checked with the existing banned-phrase list (src/lib/safety, unchanged). Before
// U4 only profiled rationales were swept (evidence-grading.test.ts), and summaries
// never were. Red proof: a banned phrase planted in one rationale failed G7b and was
// restored from backup (docs/01-plan/features/p3-u4-profiles.plan.md).
describe("G7 — no seed summary or rationale uses banned language", () => {
  const effects = JSON.parse(
    readFileSync(path.join(REPO_ROOT, "content/seed/seed-effects.json"), "utf8"),
  ) as { id: string; summary: string; evidenceProfile?: EvidenceProfile }[];
  const texts = effects.flatMap((e) => [
    { at: `${e.id}.summary`, text: e.summary },
    ...Object.entries(e.evidenceProfile?.dimensions ?? {}).map(([k, d]) => ({ at: `${e.id}/${k}.rationale`, text: d.rationale })),
  ]);

  it("G7a sweeps every summary and every rationale (anti-vacuity)", () => {
    expect(texts.filter((t) => t.at.endsWith(".summary"))).toHaveLength(effects.length);
    expect(texts.length).toBeGreaterThan(effects.length * 5);
  });

  it("G7b none contains banned language", () => {
    expect(texts.filter((t) => containsBannedLanguage(t.text)).map((t) => `${t.at}: ${t.text}`)).toEqual([]);
  });
});
