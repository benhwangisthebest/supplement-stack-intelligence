// Phase 3 U5 — the provenance verification record (D-3 = (c) with (b)'s fields).
//
// A seed paper may carry `doi` / `pmid` only behind an entry in
// provenance-fixture.json, captured by a live lookup and committed. The build
// never calls a resolver: it checks the corpus against the fixture, offline.
// U5 shipped the fixture empty; U6 and U4 filled it by owner-run live lookups, and each
// entry now names the committed response it was read from (closeout (e1), P3-5).
//
// This module is plain JS so the guard (src/data/provenance-record.test.ts) and
// U6's capture script share one definition of every rule below.
//
// Fixture shape — an object keyed by fixtureKey(kind, id):
//   "doi:10.xxxx/yyyy": { id, kind, resolvedTitle, source, verifiedOn, verifiedBy, response }
//   id            the identifier in normalised form (the key without its prefix)
//   kind          "doi" | "pmid"
//   resolvedTitle the title the resolver returned, stored as returned
//   source        which resolver answered (SOURCES[kind])
//   verifiedOn    ISO date YYYY-MM-DD, a real calendar date, not in the future
//   verifiedBy    one of VERIFIERS
//   response      { path, sha256 } — the COMMITTED resolver response this entry was
//                 read from: a repo-relative path under RESPONSE_ROOT and the SHA-256
//                 of its bytes. Phase 3 closeout (e1), Check finding P3-5: before this
//                 field, an entry was an attestation only, so a hand-written entry for
//                 an invented DOI passed every check. checkResponses() re-parses the
//                 body and holds the entry's identifier and title to it.
// No other key is accepted: an entry cannot smuggle authors, journal or year.

export const KINDS = Object.freeze(["doi", "pmid"]);

/** Who may attest a lookup. Widening this list is a reviewed diff, not a default. */
export const VERIFIERS = Object.freeze(["owner"]);

/** Which resolver produced `resolvedTitle`, per kind. */
export const SOURCES = Object.freeze({
  doi: Object.freeze(["crossref", "doi.org"]),
  pmid: Object.freeze(["pubmed-eutils"]),
});

/**
 * Identifiers that must never be cited, keyed by fixtureKey, each with its reason.
 * A paper carrying one fails the build (DO-NOT-CITE bucket), the fixture may not
 * hold an entry for one, and U6's capture script refuses to resolve one.
 * Adding an entry is an owner decision; removing one is a reviewed diff.
 */
export const DO_NOT_CITE = Object.freeze({
  // Owner, 2026-09-23 (U6 (c) decision #13). Surfaced by U6 S1 as a candidate for
  // p-zinc-immune; the record's own title marks it withdrawn.
  "pmid:25924708": "WITHDRAWN Cochrane review (Zinc for the common cold, 2015)",
  "doi:10.1002/14651858.cd001364.pub5": "WITHDRAWN Cochrane review (Zinc for the common cold, 2015)",
});

const ENTRY_KEYS = ["id", "kind", "resolvedTitle", "source", "verifiedOn", "verifiedBy", "response"];

/** Where a committed resolver response may live, and what each kind's body is called. */
export const RESPONSE_ROOT = "content/verification/captures/";
const RESPONSE_FILE = Object.freeze({ doi: "crossref-work.json", pmid: "esummary.json" });
const RESPONSE_KEYS = ["path", "sha256"];

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
    if (Object.prototype.hasOwnProperty.call(DO_NOT_CITE, key)) {
      errors.push(`${at}: ${key} is on the do-not-cite list (${DO_NOT_CITE[key]})`);
    }
    if (!VERIFIERS.includes(e.verifiedBy)) {
      errors.push(`${at}: verifiedBy must be one of ${VERIFIERS.join("|")}`);
    }
    const r = e.response;
    if (r === null || typeof r !== "object" || Array.isArray(r)) {
      errors.push(`${at}: response must be an object { path, sha256 }`);
    } else {
      for (const k of RESPONSE_KEYS) if (!Object.keys(r).includes(k)) errors.push(`${at}: response missing ${k}`);
      for (const k of Object.keys(r)) if (!RESPONSE_KEYS.includes(k)) errors.push(`${at}: response unknown key ${k}`);
      if (
        typeof r.path !== "string" ||
        !r.path.startsWith(RESPONSE_ROOT) ||
        r.path.split("/").includes("..") ||
        r.path.includes("\\") ||
        !r.path.endsWith(`/${RESPONSE_FILE[e.kind]}`)
      ) {
        errors.push(`${at}: response.path must be a ${RESPONSE_FILE[e.kind]} under ${RESPONSE_ROOT}`);
      }
      if (typeof r.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(r.sha256)) {
        errors.push(`${at}: response.sha256 must be 64 lowercase hex characters`);
      }
    }
  }
  return errors;
}

/**
 * Reads the identifier and title out of a saved resolver body. PubMed esummary
 * (retmode=json) must hold exactly one uid; Crossref works/{doi} its DOI and title.
 * Throws on anything else, so a body of the wrong kind cannot pass by accident.
 */
export function parseResponse(kind, text) {
  const json = JSON.parse(text);
  if (kind === "pmid") {
    const uids = json?.result?.uids;
    if (!Array.isArray(uids) || uids.length !== 1) throw new Error("esummary must hold exactly one uid");
    const rec = json.result[uids[0]];
    if (typeof rec?.title !== "string") throw new Error("esummary record has no title");
    return { id: String(rec.uid ?? uids[0]), title: rec.title };
  }
  const m = json?.message;
  if (typeof m?.DOI !== "string" || typeof m?.title?.[0] !== "string") throw new Error("Crossref work has no DOI or title");
  return { id: normaliseIdentifier("doi", m.DOI), title: m.title[0] };
}

/**
 * Checks every fixture entry against the resolver response it names. The caller
 * supplies the file system, so this stays pure and testable:
 *   isTracked(path) — is the path committed (git ls-files), not merely on disk
 *   read(path)      — the file's bytes (Buffer/Uint8Array), or null if absent
 *   sha256(bytes)   — lowercase hex digest
 * Each defect lands in one bucket so failures stay distinct. Returns the number of
 * entries checked, for anti-vacuity.
 */
export function checkResponses(fixture, { isTracked, read, sha256 }) {
  /** @type {{ checked: number, missing: string[], uncommitted: string[], hash: string[], unparseable: string[], identity: string[], title: string[] }} */
  const out = { checked: 0, missing: [], uncommitted: [], hash: [], unparseable: [], identity: [], title: [] };
  for (const [key, e] of Object.entries(fixture)) {
    out.checked += 1;
    const r = e?.response;
    if (!r || typeof r.path !== "string") {
      out.missing.push(`${key}: no resolver response recorded`);
      continue;
    }
    if (!isTracked(r.path)) {
      out.uncommitted.push(`${key}: ${r.path} is not a committed file`);
      continue;
    }
    const bytes = read(r.path);
    if (bytes === null) {
      out.uncommitted.push(`${key}: ${r.path} is tracked but absent from the working tree`);
      continue;
    }
    if (sha256(bytes) !== r.sha256) {
      out.hash.push(`${key}: ${r.path} does not hash to the recorded sha256`);
      continue;
    }
    let parsed;
    try {
      parsed = parseResponse(e.kind, Buffer.from(bytes).toString("utf8"));
    } catch (err) {
      out.unparseable.push(`${key}: ${r.path}: ${err.message}`);
      continue;
    }
    if (parsed.id !== e.id) out.identity.push(`${key}: ${r.path} is the record for ${parsed.id}, not ${e.id}`);
    else if (normaliseTitle(parsed.title) !== normaliseTitle(e.resolvedTitle ?? "")) {
      out.title.push(`${key}: resolvedTitle does not match the title in ${r.path}`);
    }
  }
  return out;
}

/**
 * Checks each paper identifier against the fixture. Each defect lands in
 * exactly one bucket, so the guard's failures stay distinct:
 *   malformed  — present but not well-formed (never looked up)
 *   unverified — well-formed, no fixture entry
 *   mismatched — has an entry, but its resolvedTitle is not the paper's title
 *   orphans    — fixture keys no paper cites (a record of nothing)
 *   doNotCite  — well-formed, but on DO_NOT_CITE (checked before the fixture)
 */
export function checkPapers(papers, fixture) {
  /** @type {{ malformed: string[], unverified: string[], mismatched: string[], orphans: string[], doNotCite: string[] }} */
  const out = { malformed: [], unverified: [], mismatched: [], orphans: [], doNotCite: [] };
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
      if (Object.prototype.hasOwnProperty.call(DO_NOT_CITE, key)) {
        out.doNotCite.push(`${where}: ${key} is on the do-not-cite list (${DO_NOT_CITE[key]})`);
        continue;
      }
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
