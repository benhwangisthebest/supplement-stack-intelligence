// Phase 3 U6 — the capture script. Owner-run, build-time, never imported by src/.
// Register: docs/01-plan/phase-3-evidence-grounding.plan.md §4 U6; cycle record:
// docs/01-plan/features/p3-u6-corpus-verified.plan.md §3.
//
// Two modes, one per pre-registered spend scenario:
//
//   search  (S1) — for each claim, one Crossref query plus PubMed esearch and
//                  efetch. PubMed is restricted to PUBMED_TYPE_FILTER and is
//                  widened to all types only when that returns nothing. The
//                  parsed candidates go to <out>/candidates.json, carrying
//                  metadata and an excerpt of at most EXCERPT_CHARS. The raw
//                  efetch XML holds full abstracts, so it goes to <out>/local/,
//                  which is gitignored, and only its SHA-256 (plus one per
//                  abstract) is committed. This mode writes NOTHING to the
//                  corpus or the fixture: choosing a candidate is the owner's
//                  decision, not the script's.
//   resolve (S2) — for each owner-approved mapping in --approvals, one lookup
//                  of the identifier (Crossref works/{doi}, PubMed esummary). It
//                  refuses a mapping whose resolved title does not match the
//                  title the owner approved. With --write, it records the
//                  fixture entry and sets the paper's title and doi/pmid in
//                  content/seed/seed-papers.json. Run content:generate after.
//                  Every response body is saved, committed, at
//                  <out>/<paperId>/esummary.json (or crossref-work.json), so a
//                  refusal can be read back (U4, owner 2026-09-23).
//
// Controls, all enforced here rather than by convention:
//   --dry-run        no request leaves the machine; each planned call is printed
//                    and the call log records 0 calls made
//   --max-calls N    hard cap. The call that would exceed it throws STOP
//   --scenario S     S1 | S2 | S3 | S4, stamped on every call-log line
//   rate limit       one request at a time, at least MIN_INTERVAL_MS apart
//   host allowlist   api.crossref.org and eutils.ncbi.nlm.nih.gov only
//   --mailto EMAIL | --no-mailto   the contact both services ask for. It is
//                    redacted from the call log, which may be committed
//
// Every rule about identifiers, titles and the fixture's shape comes from
// provenance.mjs, which is the same module the build's guard reads.

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DO_NOT_CITE,
  SOURCES,
  VERIFIERS,
  fixtureKey,
  isWellFormed,
  normaliseIdentifier,
  normaliseTitle,
  validateFixture,
} from "./provenance.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE = path.join(REPO, "content/verification/provenance-fixture.json");
const PAPERS = path.join(REPO, "content/seed/seed-papers.json");

export const ALLOWED_HOSTS = Object.freeze(["api.crossref.org", "eutils.ncbi.nlm.nih.gov"]);
export const SCENARIOS = Object.freeze(["S1", "S2", "S3", "S4"]); // S4: U4 ruling R7 (2026-09-23), scoped addendum
// NCBI allows 3 requests/second without an API key. 400 ms keeps under it.
export const MIN_INTERVAL_MS = 400;
const CANDIDATES_PER_SOURCE = 3;
// Owner ruling (2026-09-23, U6 (b)): committed excerpts are at most 300 chars;
// full abstracts stay local. Evidence-grade designs first, widened only on zero hits.
export const EXCERPT_CHARS = 300;
export const PUBMED_TYPE_FILTER =
  "(meta-analysis[pt] OR systematic review[pt] OR randomized controlled trial[pt])";
export const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const TOOL = "supplement-stack-intelligence-u6-capture";

// ---------------------------------------------------------------------------
// The one door to the network.
// ---------------------------------------------------------------------------

/**
 * @param {{ dryRun: boolean, maxCalls: number, scenario: string, mailto: string|null,
 *           logFile: string|null, fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void> }} opts
 */
export function createClient(opts) {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const state = { made: 0, planned: 0, last: 0 };
  const redact = (u) =>
    opts.mailto ? u.split(encodeURIComponent(opts.mailto)).join("REDACTED") : u;
  const log = (line) => {
    if (opts.logFile) appendFileSync(opts.logFile, JSON.stringify(line) + "\n");
  };

  async function get(url) {
    const host = new URL(url).host;
    if (!ALLOWED_HOSTS.includes(host)) throw new Error(`STOP: host ${host} is outside the scenario table`);
    if (opts.dryRun) {
      state.planned += 1;
      console.log(`[dry-run] would GET ${redact(url)}`);
      return null;
    }
    if (state.made >= opts.maxCalls) {
      throw new Error(`STOP: call ${state.made + 1} would exceed --max-calls ${opts.maxCalls}`);
    }
    const wait = state.last + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    state.last = Date.now();
    state.made += 1;
    const headers = { "User-Agent": opts.mailto ? `${TOOL} (mailto:${opts.mailto})` : TOOL };
    const started = Date.now();
    let status = 0;
    let body = "";
    try {
      const res = await fetchImpl(url, { headers });
      status = res.status;
      body = await res.text();
    } finally {
      log({
        n: state.made,
        scenario: opts.scenario,
        at: new Date(started).toISOString(),
        host,
        url: redact(url),
        status,
        bytes: body.length,
        ms: Date.now() - started,
      });
    }
    if (status !== 200) throw new Error(`HTTP ${status} from ${host}`);
    return body;
  }

  function withContact(url, kind) {
    const u = new URL(url);
    if (kind === "ncbi") {
      u.searchParams.set("tool", TOOL);
      if (opts.mailto) u.searchParams.set("email", opts.mailto);
    } else if (opts.mailto) {
      u.searchParams.set("mailto", opts.mailto);
    }
    return u.toString();
  }

  return { get, withContact, state, dryRun: opts.dryRun };
}

// ---------------------------------------------------------------------------
// Parsers. Dependency-free on purpose: the corpus build has no XML library.
// ---------------------------------------------------------------------------

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function decodeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Inline markup removed, entities decoded, whitespace collapsed. For display, not for matching. */
export function plainText(s) {
  return decodeXml(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

const first = (re, s) => {
  const m = re.exec(s);
  return m ? m[1] : null;
};

/** PubMed efetch (rettype=abstract, retmode=xml) → one record per article. */
export function parsePubmedXml(xml) {
  const out = [];
  for (const [, a] of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const pmid = first(/<PMID[^>]*>(\d+)<\/PMID>/, a);
    const title = first(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/, a);
    const journal = first(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/, a);
    const year =
      first(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/, a) ??
      first(/<PubDate>[\s\S]*?<MedlineDate>(\d{4})/, a);
    const doi = first(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/, a);
    const pubTypes = [...a.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map(([, t]) =>
      plainText(t),
    );
    const abstract = [...a.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)]
      .map(([, attrs, text]) => {
        const label = first(/Label="([^"]+)"/, attrs);
        return (label ? `${label}: ` : "") + plainText(text);
      })
      .join(" ");
    out.push({
      source: "pubmed-eutils",
      pmid,
      doi: doi ? plainText(doi) : null,
      title: title ? plainText(title) : null,
      journal: journal ? plainText(journal) : null,
      year,
      pubTypes,
      abstractExcerpt: abstract ? abstract.slice(0, EXCERPT_CHARS) : null,
      abstractChars: abstract.length,
      abstractSha256: abstract ? sha256(abstract) : null,
    });
  }
  return out;
}

/** Crossref /works?query… → one record per item. Crossref carries no abstract we rely on. */
export function parseCrossrefSearch(json) {
  const items = json?.message?.items ?? [];
  return items.map((it) => ({
    source: "crossref",
    pmid: null,
    doi: it.DOI ?? null,
    title: it.title?.[0] ? plainText(it.title[0]) : null,
    journal: it["container-title"]?.[0] ? plainText(it["container-title"][0]) : null,
    year: it.issued?.["date-parts"]?.[0]?.[0] ? String(it.issued["date-parts"][0][0]) : null,
    pubTypes: it.type ? [it.type] : [],
    abstractExcerpt: null,
    abstractChars: 0,
    abstractSha256: null,
  }));
}

// ---------------------------------------------------------------------------
// search (S1)
// ---------------------------------------------------------------------------

const safeName = (claimId) => claimId.replace(/[^A-Za-z0-9._-]+/g, "_");

/** claims: [{ claimId, claim, pubmed, crossref }]. Returns the candidate table rows. */
export async function runSearch(claims, client, outDir) {
  const rows = [];
  for (const c of claims) {
    const name = safeName(c.claimId);
    const files = [];
    // committed: raw metadata responses. local: raw efetch XML (full abstracts), hash only.
    const save = (body, file, local) => {
      if (body === null) return;
      const full = path.join(outDir, ...(local ? ["local"] : []), name, file);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body);
      files.push({ path: path.relative(outDir, full), committed: !local, sha256: sha256(body) });
    };
    const cr = client.withContact(
      `https://api.crossref.org/works?rows=${CANDIDATES_PER_SOURCE}` +
        `&select=DOI,title,container-title,issued,type&query.bibliographic=${encodeURIComponent(c.crossref)}`,
      "crossref",
    );
    const crBody = await client.get(cr);
    save(crBody, "crossref.json", false);

    const esearch = async (term, file) => {
      const url = client.withContact(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json` +
          `&sort=relevance&retmax=${CANDIDATES_PER_SOURCE}&term=${encodeURIComponent(term)}`,
        "ncbi",
      );
      const body = await client.get(url);
      save(body, file, false);
      return body === null ? [] : (JSON.parse(body).esearchresult?.idlist ?? []);
    };
    let pubmedScope = "filtered";
    let pmids = await esearch(`(${c.pubmed}) AND ${PUBMED_TYPE_FILTER}`, "esearch.json");
    if (pmids.length === 0 && !client.dryRun) {
      pubmedScope = "widened";
      pmids = await esearch(c.pubmed, "esearch-widened.json");
    }

    let pubmed = [];
    if (pmids.length > 0) {
      const ef = client.withContact(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml` +
          `&rettype=abstract&id=${pmids.join(",")}`,
        "ncbi",
      );
      const efBody = await client.get(ef);
      save(efBody, "efetch.xml", true);
      if (efBody !== null) {
        const byPmid = new Map(parsePubmedXml(efBody).map((p) => [p.pmid, p]));
        pubmed = pmids.map((id) => byPmid.get(id)).filter(Boolean); // esearch's relevance order
      }
    }
    const crossref = crBody === null ? [] : parseCrossrefSearch(JSON.parse(crBody));
    rows.push({
      claimId: c.claimId,
      libraryClaim: c.libraryClaim,
      illustrativeDetails: c.illustrativeDetails,
      queries: { pubmed: c.pubmed, pubmedFilter: PUBMED_TYPE_FILTER, pubmedScope, crossref: c.crossref },
      files,
      pubmed,
      crossref,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// resolve (S2)
// ---------------------------------------------------------------------------

/**
 * approvals: [{ paperId, kind, id, expectedTitle, approvedBy, approvedOn, approvalRef }].
 * Returns { entries, refusals }. Writes nothing; see applyResolved.
 */
export async function runResolve(approvals, client, today, outDir) {
  // U4 (owner, 2026-09-23): every resolver response body is kept as committed
  // metadata at <outDir>/<paperId>/, as S1 keeps its search responses. Without it,
  // a refused mapping (PMID 29543316, twice) could not be diagnosed.
  if (!outDir) throw new Error("runResolve: outDir is required (every response body is saved)");
  const entries = [];
  const refusals = [];
  for (const a of approvals) {
    const where = `${a.paperId} ${a.kind}:${a.id}`;
    if (!VERIFIERS.includes(a.approvedBy) || !a.approvalRef || !a.approvedOn) {
      refusals.push(`${where}: no written owner approval recorded`);
      continue;
    }
    if (!isWellFormed(a.kind, a.id)) {
      refusals.push(`${where}: malformed ${a.kind}`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(DO_NOT_CITE, fixtureKey(a.kind, a.id))) {
      refusals.push(`${where}: on the do-not-cite list — not resolved`);
      continue;
    }
    let url;
    let source;
    if (a.kind === "doi") {
      url = client.withContact(`https://api.crossref.org/works/${encodeURIComponent(a.id)}`, "crossref");
      source = "crossref";
    } else {
      url = client.withContact(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${a.id}`,
        "ncbi",
      );
      source = "pubmed-eutils";
    }
    const body = await client.get(url);
    if (body === null) continue; // dry run
    const saved = path.join(outDir, safeName(a.paperId), a.kind === "doi" ? "crossref-work.json" : "esummary.json");
    mkdirSync(path.dirname(saved), { recursive: true });
    writeFileSync(saved, body);
    const json = JSON.parse(body);
    const title = a.kind === "doi" ? json?.message?.title?.[0] : json?.result?.[a.id]?.title;
    if (typeof title !== "string" || title.trim() === "") {
      refusals.push(`${where}: resolver returned no title`);
      continue;
    }
    if (normaliseTitle(title) !== normaliseTitle(a.expectedTitle)) {
      refusals.push(`${where}: resolved title does not match the approved title`);
      continue;
    }
    if (!SOURCES[a.kind].includes(source)) throw new Error(`source ${source} not allowed for ${a.kind}`);
    const id = normaliseIdentifier(a.kind, a.id);
    entries.push({
      paperId: a.paperId,
      kind: a.kind,
      value: a.id,
      key: fixtureKey(a.kind, a.id),
      entry: { id, kind: a.kind, resolvedTitle: title, source, verifiedOn: today, verifiedBy: a.approvedBy },
    });
  }
  return { entries, refusals };
}

/** Merge resolved entries into the fixture and the paper corpus. Pure: returns new values. */
export function applyResolved(entries, fixture, papers) {
  const nextFixture = { ...fixture };
  const nextPapers = papers.map((p) => ({ ...p }));
  for (const r of entries) {
    const p = nextPapers.find((x) => x.id === r.paperId);
    if (!p) throw new Error(`${r.paperId}: not in content/seed/seed-papers.json — add the row first`);
    if (p[r.kind] !== undefined && normaliseIdentifier(r.kind, p[r.kind]) !== r.entry.id) {
      throw new Error(`${r.paperId}: already carries a different ${r.kind}`);
    }
    nextFixture[r.key] = r.entry;
    const display = plainText(r.entry.resolvedTitle);
    if (normaliseTitle(p.title) !== normaliseTitle(display)) p.title = display;
    p[r.kind] = r.value;
  }
  const sorted = Object.fromEntries(Object.keys(nextFixture).sort().map((k) => [k, nextFixture[k]]));
  return { fixture: sorted, papers: nextPapers };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) throw new Error(`unexpected argument ${a}`);
    const k = a.slice(2);
    if (["dry-run", "no-mailto", "write"].includes(k)) flags[k] = true;
    else flags[k] = rest[++i];
  }
  return { mode, flags };
}

async function main() {
  const { mode, flags } = parseArgs(process.argv.slice(2));
  if (!["search", "resolve"].includes(mode)) {
    throw new Error("usage: capture.mjs search|resolve --out DIR --scenario S1|S2|S3 --max-calls N (--mailto EMAIL | --no-mailto) [--dry-run] …");
  }
  if (!SCENARIOS.includes(flags.scenario)) throw new Error(`--scenario must be one of ${SCENARIOS}`);
  const maxCalls = Number(flags["max-calls"]);
  if (!Number.isInteger(maxCalls) || maxCalls < 1) throw new Error("--max-calls N is required");
  if (!flags.out) throw new Error("--out DIR is required");
  if (!flags["no-mailto"] && !flags.mailto) throw new Error("pass --mailto EMAIL or --no-mailto");
  const dryRun = Boolean(flags["dry-run"]);
  const outDir = path.resolve(REPO, flags.out);
  mkdirSync(outDir, { recursive: true });
  const logFile = path.join(outDir, "call-log.jsonl");
  const client = createClient({
    dryRun,
    maxCalls,
    scenario: flags.scenario,
    mailto: flags["no-mailto"] ? null : flags.mailto,
    logFile,
  });
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (mode === "search") {
      const claims = JSON.parse(readFileSync(path.resolve(REPO, flags.claims), "utf8"));
      const rows = await runSearch(claims, client, outDir);
      if (!dryRun) writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(rows, null, 2) + "\n");
    } else {
      const approvals = JSON.parse(readFileSync(path.resolve(REPO, flags.approvals), "utf8"));
      const { entries, refusals } = await runResolve(approvals, client, today, outDir);
      for (const r of refusals) console.error(`REFUSED ${r}`);
      if (flags.write && !dryRun) {
        if (refusals.length > 0) throw new Error("STOP: refusals present, nothing written");
        const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
        const papers = JSON.parse(readFileSync(PAPERS, "utf8"));
        const next = applyResolved(entries, fixture, papers);
        const errors = validateFixture(next.fixture, today);
        if (errors.length > 0) throw new Error(`STOP: fixture invalid:\n${errors.join("\n")}`);
        writeFileSync(FIXTURE, JSON.stringify(next.fixture, null, 2) + "\n");
        writeFileSync(PAPERS, JSON.stringify(next.papers, null, 2) + "\n");
        console.log(`wrote ${entries.length} fixture entries; now run npm run content:generate`);
      }
    }
  } finally {
    console.log(
      `${dryRun ? "[dry-run] " : ""}calls made: ${client.state.made}` +
        (dryRun ? ` · planned: ${client.state.planned}` : "") +
        ` · log: ${path.relative(REPO, logFile)}`,
    );
    if (dryRun) appendFileSync(logFile, JSON.stringify({ dryRun: true, callsMade: client.state.made, planned: client.state.planned, at: new Date().toISOString() }) + "\n");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
