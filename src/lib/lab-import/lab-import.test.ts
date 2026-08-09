import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { parsePaste } from "./paste";
import { NotConfiguredError } from "@/lib/api/errors";
import {
  candidatesFromTranscript,
  extractFromText,
  ExtractionError,
  EXTRACTION_SYSTEM_PROMPT,
} from "./pdf-adapter";
import {
  labCommitSchema,
  parsedCandidateSchema,
  columnMapSchema,
} from "./schema";

describe("parseCsv", () => {
  it("parses a well-formed CSV into candidates, resolving known markers", () => {
    const csv = [
      "marker,value,unit,refLow,refHigh",
      "Vitamin D 25-OH,28,ng/mL,30,100",
      "Ferritin,22,ng/mL,30,400",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      rawLabel: "Vitamin D 25-OH",
      value: 28,
      unit: "ng/mL",
      referenceLow: 30,
      referenceHigh: 100,
      biomarkerId: "vitamin-d-25oh",
      confidence: "high",
    });
  });

  it("tolerates column reordering and header aliases", () => {
    const csv = ["Test,Result,Units", "Magnesium,1.6,mg/dL"].join("\n");
    const out = parseCsv(csv);
    expect(out[0]).toMatchObject({
      rawLabel: "Magnesium",
      value: 1.6,
      unit: "mg/dL",
      biomarkerId: "magnesium-serum",
    });
  });

  it("marks unrecognized markers low-confidence but still returns them", () => {
    const csv = ["marker,value,unit", "Mystery Compound X,5,ng/mL"].join("\n");
    const out = parseCsv(csv);
    expect(out[0].biomarkerId).toBeNull();
    expect(out[0].confidence).toBe("low");
  });

  it("skips rows without a numeric value (never guesses)", () => {
    const csv = ["marker,value,unit", "Ferritin,pending,ng/mL"].join("\n");
    expect(parseCsv(csv)).toHaveLength(0);
  });

  it("returns [] for empty input or unrecognized header", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("foo,bar\n1,2")).toEqual([]);
  });

  it("is deterministic — identical text yields deep-equal output", () => {
    const csv = "marker,value,unit\nZinc,55,ug/dL";
    expect(parseCsv(csv)).toEqual(parseCsv(csv));
  });
});

describe("parsePaste", () => {
  const map = columnMapSchema.parse({ marker: 0, value: 1, unit: 2 });

  it("parses tab-delimited rows via an explicit column map", () => {
    const text = "Vitamin D 25-OH\t28\tng/mL\nFerritin\t22\tng/mL";
    const out = parsePaste(text, map);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ rawLabel: "Vitamin D 25-OH", value: 28 });
  });

  it("parses space-delimited rows and resolves markers", () => {
    const out = parsePaste("Magnesium  1.6  mg/dL", map);
    expect(out[0]).toMatchObject({ value: 1.6, biomarkerId: "magnesium-serum" });
  });

  it("skips rows missing label/value/unit", () => {
    expect(parsePaste("Ferritin\t\tng/mL", map)).toHaveLength(0);
  });
});

describe("candidatesFromTranscript (PDF adapter core — canned transcript)", () => {
  const canned = JSON.stringify({
    markers: [
      {
        rawLabel: "25-OH Vitamin D",
        value: 41,
        unit: "ng/mL",
        referenceLow: 30,
        referenceHigh: 100,
      },
      { rawLabel: "Ferritin", value: 35, unit: "ng/mL" },
    ],
  });

  it("validates and maps a canned transcript into candidates", () => {
    const out = candidatesFromTranscript(canned);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      rawLabel: "25-OH Vitamin D",
      value: 41,
      biomarkerId: "vitamin-d-25oh",
      confidence: "high",
    });
    expect(out[1].referenceLow).toBeNull(); // not printed → null, never invented
  });

  it("throws EXTRACTION_FAILED on non-JSON output", () => {
    try {
      candidatesFromTranscript("not json");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ExtractionError);
      expect((e as ExtractionError).code).toBe("EXTRACTION_FAILED");
    }
  });

  it("throws EXTRACTION_FAILED when output fails schema", () => {
    const bad = JSON.stringify({ markers: [{ rawLabel: "x", value: "NaN" }] });
    expect(() => candidatesFromTranscript(bad)).toThrow(ExtractionError);
  });

  it("system prompt forbids interpretation/diagnosis", () => {
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toContain("do not");
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toContain("diagnose");
  });
});

describe("extractFromText (injected transcriber)", () => {
  it("throws UNREADABLE_DOCUMENT for empty text", async () => {
    await expect(extractFromText("   ")).rejects.toMatchObject({
      code: "UNREADABLE_DOCUMENT",
    });
  });

  it("uses the injected transcriber and returns candidates", async () => {
    const transcribe = async () =>
      JSON.stringify({ markers: [{ rawLabel: "Zinc", value: 55, unit: "ug/dL" }] });
    const out = await extractFromText("some pdf text", { transcribe });
    expect(out[0]).toMatchObject({ rawLabel: "Zinc", biomarkerId: "zinc-serum" });
  });

  it("wraps transcriber failures as EXTRACTION_FAILED", async () => {
    const transcribe = async () => {
      throw new Error("network down");
    };
    await expect(extractFromText("text", { transcribe })).rejects.toMatchObject({
      code: "EXTRACTION_FAILED",
    });
  });

  // ---- Phase 2 U1: response-byte preservation, asserted rather than assumed --
  it("still surfaces a missing API key as ExtractionError/EXTRACTION_FAILED", async () => {
    // U1 retyped `requireKey`'s throw from ExtractionError to
    // NotConfiguredError. That is safe ONLY because the wrapper above catches
    // every non-ExtractionError and re-wraps it with the same code — so the
    // route still answers 502 EXTRACTION_FAILED and the wire bytes do not move.
    // Nothing pinned that before, which is exactly how a status change goes
    // unnoticed. No `transcribe` is injected, so the real key check runs; no
    // network is reached, because the throw happens before the SDK import.
    const previous = process.env.API_ANTHROPIC_KEY;
    delete process.env.API_ANTHROPIC_KEY;
    try {
      const rejection = await extractFromText("some lab text").catch((e: unknown) => e);
      expect(rejection).toBeInstanceOf(ExtractionError);
      expect((rejection as ExtractionError).code).toBe("EXTRACTION_FAILED");
      expect(rejection).not.toBeInstanceOf(NotConfiguredError);
    } finally {
      if (previous === undefined) delete process.env.API_ANTHROPIC_KEY;
      else process.env.API_ANTHROPIC_KEY = previous;
    }
  });
});

describe("schema (confirm-gate guarantees)", () => {
  it("labCommitSchema requires at least one approved marker", () => {
    const empty = labCommitSchema.safeParse({
      collectedAt: "2026-06-01",
      source: "pdf",
      markers: [],
    });
    expect(empty.success).toBe(false);
  });

  it("labCommitSchema accepts a valid approved payload", () => {
    const ok = labCommitSchema.safeParse({
      collectedAt: "2026-06-01",
      source: "csv",
      markers: [{ rawLabel: "Ferritin", value: 35, unit: "ng/mL" }],
    });
    expect(ok.success).toBe(true);
  });

  it("labCommitSchema has NO canonical fields (server recomputes them)", () => {
    const shape = labCommitSchema.parse({
      collectedAt: "2026-06-01",
      source: "manual",
      markers: [{ rawLabel: "Zinc", value: 55, unit: "ug/dL" }],
    });
    expect(shape.markers[0]).not.toHaveProperty("canonicalValue");
    expect(shape.markers[0]).not.toHaveProperty("biomarkerId");
  });

  it("parsedCandidateSchema defaults reference bounds to null", () => {
    const c = parsedCandidateSchema.parse({
      rawLabel: "Ferritin",
      value: 22,
      unit: "ng/mL",
    });
    expect(c.referenceLow).toBeNull();
    expect(c.confidence).toBe("low");
  });
});
