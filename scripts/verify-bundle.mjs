#!/usr/bin/env node
// verify:bundle — has any route's first-load JS grown past its budget?
// Phase 3 U8 landing (b). Register: docs/01-plan/phase-3-evidence-grounding.plan.md
// §4 U8 (D-5: percentage headroom over a recorded baseline); cycle artifact
// docs/01-plan/features/p3-u8-bundle-budget.plan.md §3 (the choice of H).
//
// THE CHECK. For every page route, and for "shared by all":
//
//     measured  <=  floor(baseline × (1 + H/100))
//
// measured comes from the last build (scripts/bundle-sizes.mjs, which is Next's
// own First Load JS computed in bytes), and baseline comes from the committed
// docs/05-qa/bundle-baseline.json.
//
// WHY H = 1%. The measured noise is 0 B build to build and at most 3 B across
// checkout paths (N-82). 1% of the smallest route is about 1 kB, so the margin
// over that noise is more than 300 times. At 1%, reversing any of U9's moves
// would fail. At 2%, /stack-lab's (1.45%) would pass unnoticed. Changing H is
// a change to this line, which is a diff in review.
//
// THE ROUTE SET MUST MATCH EXACTLY. A route that is missing from the baseline
// fails, and so does a baseline route that the build no longer has. Either
// case means the baseline has gone stale, and a stale baseline is the §2
// failure U8 exists to end (finding U8-F1: the rows nobody recorded were the
// rows that grew).
//
// THIS SCRIPT NEVER WRITES THE BASELINE. To accept a new figure, run
// `npm run bundle:baseline` and commit the diff. A check that updated itself
// on failure would pass everything forever.
//
// Like verify:rendering it reads the last build and never builds. A missing
// build fails; it does not pass.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BASELINE_PATH, deriveBundleSizes, kB } from "./bundle-sizes.mjs";

export const HEADROOM_PERCENT = 1;

export const limitFor = (baselineBytes) => Math.floor(baselineBytes * (1 + HEADROOM_PERCENT / 100));

/** Compare measured sizes to a baseline document. Returns { rows, failures }. */
export function compare(baseline, measured) {
  const rows = [];
  const failures = [];
  const check = (name, base, now) => {
    const limit = limitFor(base);
    const delta = now - base;
    const pct = ((delta / base) * 100).toFixed(3);
    rows.push(`${name.padEnd(26)} ${String(now).padStart(8)} / baseline ${String(base).padStart(8)} (${delta >= 0 ? "+" : ""}${delta} B, ${pct}%) · limit ${limit}`);
    if (now > limit) {
      failures.push(
        `${name}: first-load JS is ${now} B (${kB(now)}), over its limit of ${limit} B ` +
          `(baseline ${base} B + H ${HEADROOM_PERCENT}%), by ${now - limit} B.`,
      );
    }
  };
  check("shared by all", baseline.sharedByAll, measured.sharedByAll);
  for (const [route, base] of Object.entries(baseline.routes)) {
    const now = measured.routes[route];
    if (!now) {
      failures.push(`${route}: in the baseline but not in this build. The baseline is stale.`);
      continue;
    }
    check(route, base.firstLoadJs, now.firstLoadJs);
  }
  for (const route of Object.keys(measured.routes)) {
    if (!(route in baseline.routes)) {
      failures.push(`${route}: in this build but has no baseline, so it has no budget.`);
    }
  }
  return { rows, failures };
}

function main() {
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    console.error(`verify:bundle — cannot read ${BASELINE_PATH}. Run \`npm run bundle:baseline\` and commit it.`);
    process.exit(1);
  }
  let measured;
  try {
    measured = deriveBundleSizes();
  } catch (err) {
    console.error(`verify:bundle — ${err.message}`);
    process.exit(1);
  }
  const { rows, failures } = compare(baseline, measured);
  console.log(
    `verify:bundle — H = ${HEADROOM_PERCENT}% · baseline zlib ${baseline.measuredWith?.zlib ?? "?"} · ` +
      `this zlib ${process.versions.zlib}`,
  );
  for (const row of rows) console.log(`  ${row}`);
  if (failures.length > 0) {
    console.error(
      `\nverify:bundle — ${failures.length} BUDGET FAILURE(S):\n` +
        failures.map((f) => `  ✗ ${f}`).join("\n") +
        "\n\nIf the growth is intended, run `npm run bundle:baseline` and commit the diff so it\n" +
        "is reviewed. Nothing updates the baseline automatically. If the growth is not intended,\n" +
        "check whether a client component has started importing seed data or a domain engine\n" +
        "(CLAUDE.md §4 rule 7).",
    );
    process.exit(1);
  }
  console.log(`verify:bundle — OK. Every route is within ${HEADROOM_PERCENT}% of its baseline.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
