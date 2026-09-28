// Phase 4 U6 (b) — the mechanism-tag and description sweep (N-93, N-94). Report-only.
//
//   node scripts/mechanism-sweep.mjs            write docs/05-qa/2026-09-27-mechanism-sweep.md
//   node scripts/mechanism-sweep.mjs --check    exit 1 if that file is not what this script writes
//   node scripts/mechanism-sweep.mjs --dump     print each row's evidence set (for reading; writes nothing)
//
// Checks every effect's `mechanismTags` and every supplement's `description` and `mechanismSummary`
// sentences against the CAPTURED abstracts of the papers cited on that effect (or on that supplement's
// effects). The script owns the enumeration, the admission of each abstract and the quoting; the
// hand-filled part is VERDICTS below, one entry per row. Method: the (b) section of
// docs/01-plan/features/p4-u6-content-corrections.plan.md.
//
// Abstracts are read from content/verification/captures/*/local/**/efetch.xml (gitignored) and admitted
// only when the file's bytes AND the parsed abstract both hash to the committed candidates.json record.
// It never fetches, reads no clock, and changes no content: same inputs, same bytes.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePubmedXml, plainText, sha256 } from "../content/verification/capture.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURES = "content/verification/captures";
const OUT = "docs/05-qa/2026-09-27-mechanism-sweep.md";
const INPUTS = ["content/seed/seed-effects.json", "content/seed/seed-supplements.json", "content/seed/seed-papers.json"];
const MAX_WORDS = 15;

// P-b / P-c. Each claim is re-checked below: the named line must still carry the field.
const RENDERED = {
  tag: {
    text: "no — read only by the redundancy rule",
    lines: [["src/lib/stack-evaluator/rules.ts", 158, "mechanismTags"]],
  },
  description: {
    text: "yes — Library card and detail page; advisor tool output",
    lines: [
      ["src/components/library/SupplementCard.tsx", 28, "supplement.description"],
      ["src/components/library/SupplementDetail.tsx", 57, "supplement.description"],
      ["src/lib/advisor/tools.ts", 95, "s.description"],
    ],
  },
  mechanismSummary: {
    text: "yes — Library detail page; advisor tool output",
    lines: [
      ["src/components/library/SupplementDetail.tsx", 61, "supplement.mechanismSummary"],
      ["src/lib/advisor/tools.ts", 168, "supp.mechanismSummary"],
    ],
  },
};

// ---------------------------------------------------------------------------
// VERDICTS — the only hand-filled part. Key: `tag · <effectId> · <tag>` or
// `<description|mechanismSummary> · <supplementId> · <n>` (n = 1-based sentence).
//   S  SUPPORTED      quotes: [[paperId, "verbatim excerpt ≤ 15 words"], …], one per claim
//   U  UNSUPPORTED    why: the claim no captured abstract in the set states
//   N  NOT CHECKABLE  why: optional; the uncaptured papers are listed by the script
// ---------------------------------------------------------------------------
const NOT_NAMED = (c) => `no captured abstract in the set states ${c}`;
const VERDICTS = {
  // ---- effect × tag ----
  "tag · magnesium-sleep · GABA": { v: "U", why: NOT_NAMED("GABA") },
  "tag · magnesium-sleep · relaxation": { v: "U", why: NOT_NAMED("relaxation") },
  "tag · magnesium-stress · GABA": { v: "U", why: NOT_NAMED("GABA") },
  "tag · magnesium-stress · HPA-axis": { v: "U", why: NOT_NAMED("the HPA axis or cortisol") },
  "tag · magnesium-metabolic · insulin-sensitivity": {
    v: "S",
    quotes: [["p-magnesium-glucose", "Mg supplementation demonstrated an improvement in insulin sensitivity markers"]],
  },
  "tag · creatine-strength · phosphocreatine": { v: "U", why: NOT_NAMED("phosphocreatine") },
  "tag · creatine-strength · ATP": { v: "U", why: NOT_NAMED("ATP") },
  "tag · creatine-cognition · brain-energy": {
    v: "S",
    quotes: [["p-creatine-cognition", "some hypothesize that it aids cognition by improving energy supply and neuroprotection"]],
    note: "hypothesis-level: stated as background hypothesis, not as a finding (AC-5 note 1)",
  },
  "tag · creatine-recovery · phosphocreatine": { v: "U", why: NOT_NAMED("phosphocreatine") },
  "tag · vitamin-d-deficiency · calcitriol": { v: "U", why: NOT_NAMED("calcitriol or 1,25-dihydroxyvitamin D") },
  "tag · vitamin-d-immune · immune-modulation": {
    v: "U",
    why: `${NOT_NAMED("an immune mechanism")}; both report respiratory-infection risk and adverse events only`,
  },
  "tag · fish-oil-cardiovascular · triglyceride-lowering": {
    v: "S",
    quotes: [["p-fish-oil-cv", "combined intake of omega-3 fatty acids near linearly lowers triglyceride"]],
  },
  "tag · fish-oil-cardiovascular · anti-inflammatory": { v: "U", why: `${NOT_NAMED("inflammation")} (landing (a)'s finding)` },
  "tag · fish-oil-mood · anti-inflammatory": {
    v: "U",
    why: `${NOT_NAMED("an anti-inflammatory effect")}; its one mention is subjects with inflammation, as a future-study subgroup`,
  },
  "tag · fish-oil-longevity · anti-inflammatory": { v: "U", why: NOT_NAMED("inflammation") },
  "tag · l-theanine-focus · alpha-waves": { v: "U", why: NOT_NAMED("alpha waves or EEG") },
  "tag · l-theanine-focus · glutamate-modulation": {
    v: "U",
    why: `${NOT_NAMED("glutamate")}; p-ltheanine-stress does, but it is not cited on this effect`,
  },
  "tag · l-theanine-stress · alpha-waves": { v: "U", why: NOT_NAMED("alpha waves or EEG") },
  "tag · l-theanine-stress · GABA": { v: "U", why: `${NOT_NAMED("GABA")}; it names glutamate receptors only` },
  "tag · glycine-sleep · inhibitory-neurotransmitter": { v: "N", why: "DOI, title only (R6)" },
  "tag · glycine-sleep · thermoregulation": { v: "N", why: "DOI, title only (R6)" },
  "tag · melatonin-sleep · circadian": { v: "U", why: NOT_NAMED("circadian timing") },
  "tag · melatonin-sleep · MT-receptor": { v: "U", why: NOT_NAMED("a receptor") },
  "tag · ashwagandha-stress · HPA-axis": {
    v: "U",
    why: `${NOT_NAMED("the HPA axis")}; cortisol reduction is stated (see cortisol-modulation), the axis is not`,
  },
  "tag · ashwagandha-stress · cortisol-modulation": {
    v: "S",
    quotes: [["p-ashwagandha-stress", "ARE was also associated with a greater reduction in the morning salivary cortisol"]],
  },
  "tag · ashwagandha-sleep · HPA-axis": { v: "U", why: NOT_NAMED("the HPA axis or cortisol") },
  "tag · berberine-metabolic · AMPK": { v: "U", why: NOT_NAMED("AMPK") },
  "tag · berberine-metabolic · insulin-sensitivity": {
    v: "S",
    quotes: [["p-berberine-metabolic", "Improved insulin resistance was assessed by lowering FINS"]],
  },
  "tag · zinc-immune · immune-cell-function": {
    v: "U",
    why: `${NOT_NAMED("immune-cell function")}; it reports common-cold incidence, duration and adverse events only`,
  },
  "tag · zinc-deficiency · enzyme-cofactor": { v: "U", why: NOT_NAMED("an enzyme or cofactor role") },
  "tag · vitamin-b12-deficiency · methylation": {
    v: "U",
    why: `${NOT_NAMED("methylation")}; methylmalonic acid and homocysteine appear only as status biomarkers`,
  },
  "tag · caffeine-focus · adenosine-antagonism": { v: "U", why: NOT_NAMED("adenosine") },
  "tag · caffeine-training · adenosine-antagonism": { v: "U", why: NOT_NAMED("adenosine") },
  "tag · caffeine-training · ergogenic": {
    v: "S",
    quotes: [["p-caffeine-training", "caffeine intake showed a meaningful ergogenic effect"]],
  },
  "tag · taurine-training · osmoregulation": { v: "U", why: NOT_NAMED("osmoregulation") },
  "tag · taurine-training · ergogenic": {
    v: "S",
    quotes: [["p-taurine-training", "Taurine ingestion improved overall endurance performance"]],
  },
  "tag · nac-antioxidant · glutathione": { v: "N" },
  "tag · nac-antioxidant · antioxidant": { v: "N" },
  "tag · protein-powder-training · leucine": { v: "U", why: NOT_NAMED("leucine") },
  "tag · protein-powder-training · MPS": {
    v: "U",
    why: `${NOT_NAMED("muscle protein synthesis")}; it reports muscle mass and strength gains`,
  },
  "tag · protein-powder-recovery · leucine": { v: "N" },
  "tag · protein-powder-recovery · satiety": { v: "N" },

  // ---- supplement × sentence ----
  "description · magnesium · 1": {
    v: "U",
    why: "no captured abstract in the set states an essential mineral, enzymatic reactions, relaxation or muscle function; common use for sleep is stated",
  },
  "mechanismSummary · magnesium · 1": { v: "U", why: NOT_NAMED("ATP, NMDA receptors, GABA, or muscle and nerve function") },
  "description · creatine · 1": {
    v: "U",
    why: "strength is stated; no captured abstract in the set states power, high-intensity output, or a most-studied rank (power appears only as post-exercise power loss)",
  },
  "mechanismSummary · creatine · 1": {
    v: "U",
    why: "no captured abstract in the set states increased muscle phosphocreatine stores or ATP regeneration; one names phosphocreatine as a high-energy phosphate reserve",
  },
  "description · vitamin-d · 1": {
    v: "U",
    why: "correcting deficiency is stated; no captured abstract in the set states fat-soluble, prohormone, bone health or immune function (only respiratory-infection risk)",
  },
  "mechanismSummary · vitamin-d · 1": { v: "U", why: NOT_NAMED("calcitriol, calcium absorption, or immune or gene-expression modulation") },
  "description · fish-oil · 1": {
    v: "U",
    why: "EPA/DHA as long-chain omega-3 and study for cardiovascular disease are stated; no captured abstract in the set states study for cognitive or inflammatory support (N-93 (1))",
  },
  "mechanismSummary · fish-oil · 1": { v: "U", why: NOT_NAMED("cell-membrane incorporation or anti-inflammatory signalling molecules") },
  "description · l-theanine · 1": {
    v: "U",
    why: "an amino acid in tea is stated; no captured abstract in the set states use for calm focus or smoothing caffeine's stimulation",
  },
  "mechanismSummary · l-theanine · 1": {
    v: "U",
    why: "glutamate is stated (p-ltheanine-stress); no captured abstract in the set states alpha waves, GABA, or relaxation without sedation",
  },
  "description · glycine · 1": { v: "N", why: "DOI, title only (R6)" },
  "mechanismSummary · glycine · 1": { v: "N", why: "DOI, title only (R6)" },
  "description · melatonin · 1": {
    v: "U",
    why: "sleep onset is stated; no captured abstract in the set states a hormone, darkness signalling, short-term use, or circadian support",
  },
  "mechanismSummary · melatonin · 1": { v: "U", why: NOT_NAMED("MT1/MT2 receptors or circadian timing") },
  "description · ashwagandha · 1": {
    v: "S",
    quotes: [
      ["p-ashwagandha-stress", "Ashwagandha, an ayurvedic adaptogen"],
      ["p-ashwagandha-stress-anxiety", "the clinical efficacy of the plant"],
      ["p-ashwagandha-stress-anxiety", "Does Ashwagandha supplementation have a beneficial effect on the management of anxiety and stress?"],
      ["p-ashwagandha-stress", "associated with a greater reduction in the morning salivary cortisol"],
      ["p-ashwagandha-sleep", "Effect of Ashwagandha (Withania somnifera) extract on sleep"],
    ],
    note: "\"herb\" rests on \"the plant\", a near-equivalent (AC-5 note 4)",
  },
  "mechanismSummary · ashwagandha · 1": {
    v: "U",
    why: "no captured abstract in the set states the HPA axis or a reduced cortisol response to stress; one reports lower morning salivary cortisol with a withanolide-standardised extract",
  },
  "description · berberine · 1": {
    v: "U",
    why: "plant origin, blood sugar and metabolic study are stated; no captured abstract in the set states an alkaloid",
  },
  "mechanismSummary · berberine · 1": {
    v: "U",
    why: "improved insulin resistance and glucose are stated; no captured abstract in the set states AMPK activation",
  },
  "description · zinc · 1": { v: "U", why: NOT_NAMED("an essential trace mineral, immune function, skin, or hormone production") },
  "mechanismSummary · zinc · 1": { v: "U", why: NOT_NAMED("an enzyme cofactor role, immune-cell function, or protein synthesis") },
  "description · vitamin-b12 · 1": {
    v: "U",
    why: "low status on plant-based diets is stated; no captured abstract in the set states water-soluble, nerve function, or red-cell formation",
  },
  "mechanismSummary · vitamin-b12 · 1": { v: "U", why: NOT_NAMED("methylation, myelin synthesis, or nerve and blood-cell function") },
  "description · caffeine · 1": {
    v: "U",
    why: "wide use, and study for alertness, attention and acute performance, are stated; no captured abstract in the set states a stimulant",
  },
  "mechanismSummary · caffeine · 1": { v: "U", why: NOT_NAMED("adenosine receptors or perceived effort") },
  "description · taurine · 1": {
    v: "U",
    why: "study for exercise performance is stated; no captured abstract in the set states an amino acid, conditionally essential, or cellular hydration",
  },
  "mechanismSummary · taurine · 1": { v: "U", why: NOT_NAMED("osmoregulation, calcium handling, or antioxidant defence") },
  "description · nac · 1": { v: "N" },
  "mechanismSummary · nac · 1": { v: "N" },
  "description · protein-powder · 1": {
    v: "U",
    why: "no captured abstract in the set states study for muscle protein synthesis, recovery or satiety (protein-powder-recovery cites no paper)",
  },
  "mechanismSummary · protein-powder · 1": { v: "U", why: NOT_NAMED("leucine or muscle protein synthesis") },
};

// ---------------------------------------------------------------------------

// U6 (c), owner ruling (1) 2026-09-28: the redundancy rule counts only the tags rated SUPPORTED here.
// `<effectId> · <tag>`, derived from VERDICTS and nothing else, so it needs no capture. NOT CHECKABLE
// counts as UNSUPPORTED. src/lib/stack-evaluator/rules.ts holds a copy that its test binds to this.
export const SUPPORTED_TAGS = Object.freeze(
  Object.entries(VERDICTS)
    .filter(([k, v]) => k.startsWith("tag · ") && v.v === "S")
    .map(([k]) => k.slice("tag · ".length))
    .sort(),
);

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const rel = (p) => path.relative(REPO, p).split(path.sep).join("/");
const norm = (s) => s.replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").length;
const cell = (s) => String(s).replace(/\|/g, "\\|");

/** Admit every local efetch record whose file and abstract hashes match a committed record. */
export function loadCaptures() {
  const all = walk(path.join(REPO, CAPTURES));
  const fileSha = new Map(); // repo-relative xml path -> committed sha256 of its bytes
  const absSha = new Map(); // pmid -> Set(committed abstractSha256)
  for (const f of all.filter((x) => x.endsWith("candidates.json")).sort()) {
    const runDir = path.dirname(f);
    for (const row of JSON.parse(readFileSync(f, "utf8"))) {
      for (const file of row.files ?? []) {
        if (!file.committed) fileSha.set(rel(path.join(runDir, file.path)), file.sha256);
      }
      for (const p of row.pubmed ?? []) {
        if (!p.pmid) continue;
        if (!absSha.has(p.pmid)) absSha.set(p.pmid, new Set());
        absSha.get(p.pmid).add(p.abstractSha256);
      }
    }
  }
  const byPmid = new Map(); // pmid -> { file, title, titleLine, parts: [{ text, line }] }
  const problems = [];
  for (const f of all.filter((x) => x.endsWith("efetch.xml")).sort()) {
    const r = rel(f);
    const body = readFileSync(f, "utf8");
    if (fileSha.get(r) !== sha256(body)) {
      problems.push(`${r}: file sha256 ${sha256(body)} ≠ committed ${fileSha.get(r) ?? "(no record)"}`);
      continue;
    }
    const lineAt = (i) => body.slice(0, i).split("\n").length;
    const articles = [...body.matchAll(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g)];
    for (const rec of parsePubmedXml(body)) {
      if (!rec.abstractSha256 || !absSha.get(rec.pmid)?.has(rec.abstractSha256)) {
        problems.push(`${r}: PMID ${rec.pmid} abstract sha256 ${rec.abstractSha256} ≠ committed`);
        continue;
      }
      if (byPmid.has(rec.pmid)) continue; // first admitted file, in sorted order
      const art = articles.find((m) => new RegExp(`<MedlineCitation[^>]*>\\s*<PMID[^>]*>${rec.pmid}</PMID>`).test(m[0]));
      const base = art.index;
      const t = /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/.exec(art[0]);
      const parts = [...art[0].matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => ({
        text: plainText(m[1]),
        line: lineAt(base + m.index),
      }));
      byPmid.set(rec.pmid, { file: r, title: plainText(t[1]), titleLine: lineAt(base + t.index), parts });
    }
  }
  return { byPmid, problems };
}

/** Rows, in content order. */
export function enumerate() {
  const [effects, supplements, papers] = INPUTS.map((f) => JSON.parse(readFileSync(path.join(REPO, f), "utf8")));
  const paperById = new Map(papers.map((p) => [p.id, p]));
  const setOf = (e) => {
    const s = new Set(e.paperIds);
    for (const d of Object.values(e.evidenceProfile.dimensions)) for (const p of d.paperIds) s.add(p);
    return [...s];
  };
  const rows = [];
  for (const e of effects) {
    for (const tag of e.mechanismTags) {
      rows.push({ key: `tag · ${e.id} · ${tag}`, kind: "tag", id: e.id, supplementId: e.supplementId, text: tag, set: setOf(e) });
    }
  }
  for (const s of supplements) {
    const set = [...new Set(effects.filter((e) => e.supplementId === s.id).flatMap(setOf))];
    for (const field of ["description", "mechanismSummary"]) {
      const sentences = s[field].split(/(?<=[.!?])\s+(?=[A-Z])/);
      sentences.forEach((text, i) =>
        rows.push({ key: `${field} · ${s.id} · ${i + 1}`, kind: field, id: s.id, supplementId: s.id, text, set }),
      );
    }
  }
  return { rows, paperById };
}

function locate(cap, excerpt) {
  const x = norm(excerpt);
  if (norm(cap.title).includes(x)) return { line: cap.titleLine, where: "title" };
  const part = cap.parts.find((p) => norm(p.text).includes(x));
  return part ? { line: part.line, where: "abstract" } : null;
}

export function sweep() {
  const { byPmid, problems } = loadCaptures();
  const { rows, paperById } = enumerate();
  const errors = [...problems];
  const captured = (pid) => {
    const p = paperById.get(pid);
    return p?.pmid && byPmid.has(p.pmid) ? byPmid.get(p.pmid) : null;
  };
  for (const [kind, r] of Object.entries(RENDERED)) {
    for (const [f, n, token] of r.lines) {
      const line = readFileSync(path.join(REPO, f), "utf8").split("\n")[n - 1] ?? "";
      if (!line.includes(token)) errors.push(`rendered? (${kind}): ${f}:${n} no longer carries ${token}`);
    }
  }
  const keys = new Set(rows.map((r) => r.key));
  for (const k of Object.keys(VERDICTS)) if (!keys.has(k)) errors.push(`orphan verdict: ${k}`);
  for (const row of rows) {
    const v = VERDICTS[row.key];
    const missing = row.set.filter((pid) => !captured(pid));
    row.missing = missing;
    if (!v) {
      errors.push(`no verdict: ${row.key}`);
      continue;
    }
    row.verdict = { S: "SUPPORTED", U: "UNSUPPORTED", N: "NOT CHECKABLE" }[v.v];
    if (!row.verdict) errors.push(`${row.key}: verdict must be S, U or N`);
    if (v.v === "S") {
      if (!v.quotes?.length) errors.push(`${row.key}: SUPPORTED needs a quote`);
      if (v.note) row.note = v.note;
      row.evidence = (v.quotes ?? []).map(([pid, excerpt]) => {
        const cap = captured(pid);
        if (!row.set.includes(pid)) errors.push(`${row.key}: ${pid} is not in this row's evidence set`);
        if (!cap) return errors.push(`${row.key}: ${pid} has no captured abstract (R6)`), "";
        if (words(excerpt) > MAX_WORDS) errors.push(`${row.key}: excerpt over ${MAX_WORDS} words`);
        const at = locate(cap, excerpt);
        if (!at) return errors.push(`${row.key}: excerpt not found verbatim in ${pid}: "${excerpt}"`), "";
        return `"${excerpt}" — ${pid}, PMID ${paperById.get(pid).pmid}, ${at.where}, \`${cap.file}:${at.line}\``;
      });
    } else if (v.v === "U") {
      if (row.set.length === 0 || missing.length > 0) errors.push(`${row.key}: UNSUPPORTED needs every paper captured`);
      if (!v.why) errors.push(`${row.key}: UNSUPPORTED needs a reason`);
      row.evidence = [`${v.why} (read: ${row.set.map((p) => `${p} PMID ${paperById.get(p).pmid}`).join(", ")})`];
    } else if (v.v === "N") {
      if (row.set.length > 0 && missing.length === 0) errors.push(`${row.key}: NOT CHECKABLE needs an uncaptured paper or an empty set`);
      const none = row.kind === "tag" ? "no paper is cited on this effect" : "no paper is cited on this supplement's effects";
      const base = row.set.length === 0 ? none : `not captured: ${missing.join(", ")}`;
      row.evidence = [v.why ? `${base}; ${v.why}` : base];
    }
  }
  // AC-2 known answers, from landing (a).
  const known = { "tag · fish-oil-cardiovascular · triglyceride-lowering": "SUPPORTED", "tag · fish-oil-cardiovascular · anti-inflammatory": "UNSUPPORTED" };
  for (const [k, want] of Object.entries(known)) {
    const got = rows.find((r) => r.key === k)?.verdict;
    if (got !== want) errors.push(`AC-2 known answer: ${k} is ${got}, expected ${want}`);
  }
  return { rows, paperById, byPmid, errors };
}

function render({ rows, byPmid, paperById }) {
  const corpus = [...paperById.values()];
  const inCorpus = corpus.filter((p) => p.pmid && byPmid.has(p.pmid)).length;
  const tally = { SUPPORTED: 0, UNSUPPORTED: 0, "NOT CHECKABLE": 0 };
  for (const r of rows) tally[r.verdict]++;
  const byKind = (k) => rows.filter((r) => (k === "tag" ? r.kind === "tag" : r.kind !== "tag"));
  const count = (rs, v) => rs.filter((r) => r.verdict === v).length;
  const inputSha = INPUTS.map((f) => `\`${f}\` sha256 \`${sha256(readFileSync(path.join(REPO, f), "utf8"))}\``);
  const table = (rs, kindCol) => [
    `| id | ${kindCol} | text | verdict | evidence (excerpt — paper, PMID, capture file:line) or reason | rendered? |`,
    "|---|---|---|---|---|---|",
    ...rs.map(
      (r) =>
        `| \`${r.id}\` | ${r.kind === "tag" ? "tag" : `${r.kind} ${r.key.split(" · ")[2]}`} | ${cell(r.text)} | **${r.verdict}** | ${cell([...r.evidence, ...(r.note ? [`*${r.note}*`] : [])].join("<br>"))} | ${RENDERED[r.kind === "tag" ? "tag" : r.kind].text} |`,
    ),
  ];
  const renderedLines = Object.entries(RENDERED)
    .map(([k, r]) => `\`${k}\`: ${r.text} (${r.lines.map(([f, n]) => `\`${f}:${n}\``).join(", ")})`)
    .join(" · ");
  return [
    "# Mechanism-tag and description sweep (Phase 4 U6 (b), report-only)",
    "",
    "> **Generated** by `node scripts/mechanism-sweep.mjs` from " + inputSha.join(", ") + ".",
    "> Do not edit by hand; re-run it (`--check` verifies). The verdicts are the one hand-filled table inside the script;",
    "> the enumeration, the admission of each abstract, and every excerpt's file:line are computed. **Nothing in",
    "> `content/` was changed.** Method: `docs/01-plan/features/p4-u6-content-corrections.plan.md` §8.",
    `> **Captures admitted:** ${byPmid.size} PubMed abstracts, each file and abstract hash equal to its committed \`candidates.json\``,
    `> record; **${inCorpus} of the ${corpus.length} corpus papers** have one. The \`efetch.xml\` files are gitignored (Phase 3 U6 ruling), so a cited line is read on the`,
    `> machine holding the captures. Each excerpt is ≤ ${MAX_WORDS} words; its file:line locates the abstract element, which efetch writes on one line.`,
    "",
    `**Totals (${rows.length} rows):** SUPPORTED ${tally.SUPPORTED} · UNSUPPORTED ${tally.UNSUPPORTED} · NOT CHECKABLE ${tally["NOT CHECKABLE"]}.`,
    "",
    "| | rows | SUPPORTED | UNSUPPORTED | NOT CHECKABLE |",
    "|---|---|---|---|---|",
    ...[
      ["effect × tag", byKind("tag")],
      ["supplement × sentence", byKind("sentence")],
    ].map(([n, rs]) => `| ${n} | ${rs.length} | ${count(rs, "SUPPORTED")} | ${count(rs, "UNSUPPORTED")} | ${count(rs, "NOT CHECKABLE")} |`),
    "",
    `**Rendered?** ${renderedLines}.`,
    "",
    "## Effect × mechanism tag",
    "",
    ...table(byKind("tag"), "field"),
    "",
    "## Supplement × sentence (description, mechanismSummary)",
    "",
    ...table(byKind("sentence"), "field"),
    "",
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--dump")) {
    const { byPmid } = loadCaptures();
    const { rows, paperById } = enumerate();
    const seen = new Set();
    for (const r of rows) {
      const sig = r.set.join(",");
      console.log(`\n### ${r.key} :: ${r.text}\n    set: ${sig || "(empty)"}`);
      if (seen.has(sig)) continue;
      seen.add(sig);
      for (const pid of r.set) {
        const cap = paperById.get(pid)?.pmid && byPmid.get(paperById.get(pid).pmid);
        if (!cap) {
          console.log(`  [${pid}] NOT CAPTURED`);
          continue;
        }
        console.log(`  [${pid}] ${cap.file}:${cap.titleLine} TITLE: ${cap.title}`);
        for (const p of cap.parts) console.log(`    :${p.line} ${p.text}`);
      }
    }
    return;
  }
  const result = sweep();
  if (result.errors.length > 0) {
    console.error(`mechanism-sweep: ${result.errors.length} error(s)\n  ${result.errors.join("\n  ")}`);
    process.exit(1);
  }
  const md = render(result);
  const target = path.join(REPO, OUT);
  if (args.includes("--check")) {
    const onDisk = (() => {
      try {
        return readFileSync(target, "utf8");
      } catch {
        return null;
      }
    })();
    if (onDisk !== md) {
      console.error(`mechanism-sweep: ${OUT} is stale; re-run without --check`);
      process.exit(1);
    }
    console.log(`mechanism-sweep: ${OUT} is current (${result.rows.length} rows)`);
    return;
  }
  writeFileSync(target, md);
  console.log(`mechanism-sweep: wrote ${OUT} (${result.rows.length} rows)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
