// Phase 3 U5 — the provenance verification record (D-3 = (c) with (b)'s fields).
//
// A seed paper may carry `doi` / `pmid` only behind an entry in
// provenance-fixture.json, captured by a live lookup and committed. The build
// never calls a resolver: it checks the corpus against the fixture, offline.
// The fixture ships EMPTY. U6 fills it by live verification (owner-run).
//
// This module is plain JS so the guard (src/data/provenance-record.test.ts) and
// U6's capture script share one definition of every rule below.
//
// Fixture shape — an object keyed by fixtureKey(kind, id):
//   "doi:10.xxxx/yyyy": { id, kind, resolvedTitle, source, verifiedOn, verifiedBy }
//   id            the identifier in normalised form (the key without its prefix)
//   kind          "doi" | "pmid"
//   resolvedTitle the title the resolver returned, stored as returned
//   source        which resolver answered (SOURCES[kind])
//   verifiedOn    ISO date YYYY-MM-DD, a real calendar date, not in the future
//   verifiedBy    one of VERIFIERS
// No other key is accepted: an entry cannot smuggle authors, journal or year.

export const KINDS = Object.freeze(["doi", "pmid"]);

/** Who may attest a lookup. Widening this list is a reviewed diff, not a default. */
export const VERIFIERS = Object.freeze(["owner"]);

/** Which resolver produced `resolvedTitle`, per kind. */
export const SOURCES = Object.freeze({
  doi: Object.freeze(["crossref", "doi.org"]),
  pmid: Object.freeze(["pubmed-eutils"]),
});

const ENTRY_KEYS = ["id", "kind", "resolvedTitle", "source", "verifiedOn", "verifiedBy"];

// DOI: a bare DOI — no "doi:" or https://doi.org/ prefix — using Crossref's
// published pattern for modern DOIs. A real DOI outside it is a false
// "malformed"; widening the pattern is then a reviewed change here.
// PMID: a positive integer, no leading zeros, at most 8 digits.
const FORMAT = Object.freeze({
  doi: /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/,
  pmid: /^[1-9]\d{0,7}$/,
});

export function isWellFormed(kind, value) {
  return typeof value === "string" && FORMAT[kind].test(value);
}

/** DOIs are case-insensitive, so they compare lowercased. A PMID is already canonical. */
export function normaliseIdentifier(kind, value) {
  return kind === "doi" ? value.toLowerCase() : value;
}

export function fixtureKey(kind, value) {
  return `${kind}:${normaliseIdentifier(kind, value)}`;
}

/**
 * Title equality rule: strip inline markup tags, apply NFKC, lowercase, then
 * treat every run of non-letter, non-digit characters as one space. So case,
 * punctuation, whitespace and <i>…</i> differ freely; words and numbers may not.
 */
export function normaliseTitle(title) {
  return title
    .replace(/<[^>]*>/g, " ")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function isIsoDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Schema check. Returns one message per defect; [] means the fixture is well-formed. */
export function validateFixture(fixture, today = new Date().toISOString().slice(0, 10)) {
  if (fixture === null || typeof fixture !== "object" || Array.isArray(fixture)) {
    return ["fixture: top level must be an object keyed by identifier"];
  }
  const errors = [];
  for (const [key, e] of Object.entries(fixture)) {
    const at = `fixture[${JSON.stringify(key)}]`;
    if (e === null || typeof e !== "object" || Array.isArray(e)) {
      errors.push(`${at}: entry must be an object`);
      continue;
    }
    const keys = Object.keys(e);
    for (const k of ENTRY_KEYS) if (!keys.includes(k)) errors.push(`${at}: missing ${k}`);
    for (const k of keys) if (!ENTRY_KEYS.includes(k)) errors.push(`${at}: unknown key ${k}`);
    if (!KINDS.includes(e.kind)) {
      errors.push(`${at}: kind must be one of ${KINDS.join("|")}`);
      continue;
    }
    if (!isWellFormed(e.kind, e.id)) errors.push(`${at}: id is not a well-formed ${e.kind}`);
    else if (e.id !== normaliseIdentifier(e.kind, e.id)) errors.push(`${at}: id is not normalised`);
    else if (key !== fixtureKey(e.kind, e.id)) errors.push(`${at}: key must be ${fixtureKey(e.kind, e.id)}`);
    if (typeof e.resolvedTitle !== "string" || normaliseTitle(e.resolvedTitle) === "") {
      errors.push(`${at}: resolvedTitle must be a non-empty title`);
    }
    if (!SOURCES[e.kind].includes(e.source)) {
      errors.push(`${at}: source must be one of ${SOURCES[e.kind].join("|")}`);
    }
    if (!isIsoDate(e.verifiedOn)) errors.push(`${at}: verifiedOn must be an ISO date YYYY-MM-DD`);
    else if (e.verifiedOn > today) errors.push(`${at}: verifiedOn ${e.verifiedOn} is in the future`);
    if (!VERIFIERS.includes(e.verifiedBy)) {
      errors.push(`${at}: verifiedBy must be one of ${VERIFIERS.join("|")}`);
    }
  }
  return errors;
}

/**
 * Checks each paper identifier against the fixture. Each defect lands in
 * exactly one bucket, so the guard's failures stay distinct:
 *   malformed  — present but not well-formed (never looked up)
 *   unverified — well-formed, no fixture entry
 *   mismatched — has an entry, but its resolvedTitle is not the paper's title
 *   orphans    — fixture keys no paper cites (a record of nothing)
 */
export function checkPapers(papers, fixture) {
  /** @type {{ malformed: string[], unverified: string[], mismatched: string[], orphans: string[] }} */
  const out = { malformed: [], unverified: [], mismatched: [], orphans: [] };
  const used = new Set();
  for (const p of papers) {
    for (const kind of KINDS) {
      if (!Object.prototype.hasOwnProperty.call(p, kind)) continue;
      const value = p[kind];
      const where = `${p.id}.${kind} ${JSON.stringify(value)}`;
      if (!isWellFormed(kind, value)) {
        out.malformed.push(`${where}: malformed ${kind.toUpperCase()}`);
        continue;
      }
      const key = fixtureKey(kind, value);
      used.add(key);
      const entry = fixture[key];
      if (!entry) {
        out.unverified.push(`${where}: no fixture entry for ${key}`);
        continue;
      }
      if (normaliseTitle(entry.resolvedTitle ?? "") !== normaliseTitle(p.title)) {
        out.mismatched.push(`${where}: resolved title does not match paper title`);
      }
    }
  }
  for (const key of Object.keys(fixture)) if (!used.has(key)) out.orphans.push(key);
  return out;
}
