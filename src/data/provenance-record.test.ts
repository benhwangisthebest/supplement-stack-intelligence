import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DO_NOT_CITE,
  KINDS,
  checkPapers,
  fixtureKey,
  isWellFormed,
  validateFixture,
} from "../../content/verification/provenance.mjs";

// Phase 3 U5 — provenance behind a record (D-3; closes N-80 with G2).
//
// A seed paper's `doi` / `pmid` fails the build unless it is well-formed AND
// content/verification/provenance-fixture.json holds an entry for it whose
// resolved title matches the paper's title. Malformed, unverified and
// mismatched are separate tests with separate messages: one guard passing for
// all three reasons would not be three guards.
//
// Reads the authored JSON, the source of truth, as G3 does; CONTENT_FIDELITY
// makes the generated src/data/ modules byte-equal to it. Offline: the rules
// live in content/verification/provenance.mjs and no resolver is ever called.
//
// Stated limit: the fixture ships empty, so P1 checks nothing until U6 adds
// entries. Its redness was proved at U5's landing by planted entries
// (docs/01-plan/features/p3-u5-provenance-record.plan.md §6).

const REPO_ROOT = path.resolve(__dirname, "../..");
const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, rel), "utf8"));

type PaperRow = { id: string; title: string } & Record<string, unknown>;
const papers = readJson("content/seed/seed-papers.json") as PaperRow[];
const fixture = readJson("content/verification/provenance-fixture.json") as Record<string, unknown>;
const result = checkPapers(papers, fixture);

describe("P0 — the guard reads the real corpus (anti-vacuity)", () => {
  it("finds the seed papers and a fixture object", () => {
    expect(papers.length).toBeGreaterThan(0);
    expect(fixture).toBeTypeOf("object");
  });
});

describe("P1 — the verification fixture is well-formed", () => {
  it("every entry has exactly the recorded fields, a known source and verifier, and a past ISO date", () => {
    expect(validateFixture(fixture)).toEqual([]);
  });
});

describe.each(KINDS)("P2/P3 — %s", (kind) => {
  it(`P2 ${kind}: every paper ${kind} is well-formed`, () => {
    expect(result.malformed.filter((m) => m.includes(`.${kind} `))).toEqual([]);
  });

  it(`P3 ${kind}: every well-formed paper ${kind} has a fixture entry`, () => {
    expect(result.unverified.filter((m) => m.includes(`.${kind} `))).toEqual([]);
  });
});

describe("P4 — a recorded identifier belongs to the paper that cites it", () => {
  it("each fixture entry's resolved title matches the citing paper's title", () => {
    expect(result.mismatched).toEqual([]);
  });
});

describe("P5 — the fixture records nothing the corpus does not cite", () => {
  it("has no orphan entries", () => {
    expect(result.orphans).toEqual([]);
  });
});

describe("P6 — no paper cites an identifier on the do-not-cite list (U6, owner 2026-09-23)", () => {
  it("the list is non-empty and every key is a well-formed, normalised fixture key", () => {
    expect(Object.keys(DO_NOT_CITE).length).toBeGreaterThan(0);
    for (const key of Object.keys(DO_NOT_CITE)) {
      const [kind, ...rest] = key.split(":");
      const id = rest.join(":");
      expect(KINDS).toContain(kind);
      expect(isWellFormed(kind, id)).toBe(true);
      expect(fixtureKey(kind, id)).toBe(key);
    }
  });

  it("no paper doi/pmid is on the list", () => {
    expect(result.doNotCite).toEqual([]);
  });
});

// P7 — Phase 3 U6 closeout, [P3-X2]: 100% of citations carry a verified identifier.
// P3 fails an identifier with no fixture entry; P7 closes the other half: a CITED
// paper with no identifier at all. Every paperIds entry in seed-effects.json, at any
// depth (effect level and evidence-profile dimensions), must name a paper that has a
// doi or pmid, which P2–P4 then verify against the fixture.
describe("P7 — every cited paper carries a doi or pmid ([P3-X2])", () => {
  const effects = readJson("content/seed/seed-effects.json");
  const cited: { where: string; id: string }[] = [];
  const walk = (node: unknown, where: string): void => {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${where}[${i}]`));
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) {
        if (k === "paperIds" && Array.isArray(v)) v.forEach((id, i) => cited.push({ where: `${where}.${k}[${i}]`, id }));
        else walk(v, `${where}.${k}`);
      }
  };
  walk(effects, "seed-effects.json");
  const byId = new Map(papers.map((p) => [p.id, p]));

  it("finds citations to check (anti-vacuity)", () => {
    expect(cited.length).toBeGreaterThan(0);
  });

  it("no cited paper lacks an identifier", () => {
    const bare = cited.filter(({ id }) => {
      const p = byId.get(id);
      return !p || (p.doi === undefined && p.pmid === undefined);
    });
    expect(bare.map((c) => `${c.where} → ${c.id}`)).toEqual([]);
  });
});
