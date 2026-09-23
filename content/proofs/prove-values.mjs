// Phase 3 U1 landing (a) — VALUE proof.
// Every exported SEED_* constant in the working tree deep-equals its value at the
// base ref (default b5aaab8), AND keeps its key order.
//
//   npx tsx content/proofs/prove-values.mjs [ref]
//
// Exit 0 only if all modules match. Exit 1 on any difference or on zero modules.

import { deepStrictEqual } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO, exportName, importValue, materialiseBase, refFromArgv } from "./base.mjs";

const ref = refFromArgv();
const { dir, names } = materialiseBase(ref);
let failures = 0;

for (const n of names) {
  const basePath = path.join(dir, n);
  const name = exportName(readFileSync(basePath, "utf8"), n);
  const before = await importValue(basePath, name);
  const after = await importValue(path.join(REPO, "src/data", n), name);

  let deepEqual = true;
  try {
    deepStrictEqual(after, before);
  } catch {
    deepEqual = false;
  }
  const keyOrder = JSON.stringify(after) === JSON.stringify(before);
  if (!deepEqual || !keyOrder) failures++;
  console.log(`${name.padEnd(26)} len=${String(before.length).padStart(2)} deepStrictEqual=${deepEqual} keyOrder=${keyOrder}`);
}

console.log(`\nvalues: ${names.length} modules compared against ${ref}, failures=${failures}`);
process.exit(names.length === 0 || failures ? 1 : 0);
