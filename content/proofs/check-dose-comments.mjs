// Phase 3 U1 landing (a) — DOSE-COMMENT check.
// Landing (a) removed the `// ---- <Supplement> (target X-Y unit) ----` comments
// from seed-products.ts. Owner ruling: a comment may be dropped only if seed data
// already holds that dose. This re-derives, from the module text AT THE BASE REF
// (default b5aaab8), whether each comment's range equals the `generalDose` of the
// supplement its section's products belong to, and whether any `allergen: X`
// note is carried by every product in that section.
//
//   npx tsx content/proofs/check-dose-comments.mjs [ref]
//
// Exit 0 only if the NOT-HELD set is exactly the one recorded verbatim in the U1
// cycle artifact's Appendix A (and routed to FU-49). A change in either
// direction is a record that has gone stale, so it fails.

import { readFileSync } from "node:fs";
import path from "node:path";
import { importValue, materialiseBase, refFromArgv } from "./base.mjs";

/** Recorded in docs/01-plan/features/p3-u1-codegen-identity.plan.md, Appendix A. */
const RECORDED_NOT_HELD = ["seed-products.ts:163"];

const COMMENT = /^ {2}\/\/ ---- (.+?) \(target ~?([\d.]+)(?:-([\d.]+))? (\w+)\)(?: — allergen: (\w+))? ----$/;

const ref = refFromArgv();
const { dir } = materialiseBase(ref);
const supplements = await importValue(path.join(dir, "seed-supplements.ts"), "SEED_SUPPLEMENTS");
const products = await importValue(path.join(dir, "seed-products.ts"), "SEED_PRODUCTS");
const lines = readFileSync(path.join(dir, "seed-products.ts"), "utf8").split("\n");

const notHeld = [];
let checked = 0;

lines.forEach((line, i) => {
  if (!line.includes("// ----")) return;
  const where = `seed-products.ts:${i + 1}`;
  const m = line.match(COMMENT);
  if (!m) {
    notHeld.push(where);
    console.log(`${where} UNPARSED ${line.trim()}`);
    return;
  }
  const [, label, lo, hi = lo, unit, allergen] = m;

  const ids = new Set();
  for (let j = i + 1; j < lines.length && !lines[j].includes("// ----"); j++) {
    const s = lines[j].match(/supplementId: "([^"]+)"/);
    if (s) ids.add(s[1]);
  }
  const [sid] = ids;
  const dose = supplements.find((s) => s.id === sid)?.generalDose;
  const doseHeld = ids.size === 1 && dose?.min === Number(lo) && dose?.max === Number(hi) && dose?.unit === unit;
  const section = products.filter((p) => p.supplementId === sid);
  const allergenHeld = !allergen || (section.length > 0 && section.every((p) => p.allergenTags.includes(allergen)));

  checked++;
  if (!doseHeld || !allergenHeld) notHeld.push(where);
  console.log(
    `${where.padEnd(21)} ${label.padEnd(15)} comment ${lo}-${hi} ${unit}${allergen ? ` +${allergen}` : ""} | ` +
      `generalDose(${[...ids].join(",")}) ${dose ? `${dose.min}-${dose.max} ${dose.unit}` : "MISSING"} | ` +
      `dose ${doseHeld ? "HELD" : "NOT HELD"}${allergen ? ` | allergen ${allergenHeld ? "HELD" : "NOT HELD"} on ${section.length}` : ""}`,
  );
});

const matches = JSON.stringify(notHeld) === JSON.stringify(RECORDED_NOT_HELD);
console.log(`\ndose comments: ${checked} checked at ${ref}; NOT HELD = [${notHeld.join(", ")}]; recorded = [${RECORDED_NOT_HELD.join(", ")}]; ${matches ? "MATCHES" : "DIFFERS"}`);
process.exit(checked === 0 || !matches ? 1 : 0);
