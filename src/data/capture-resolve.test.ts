import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient, runResolve } from "../../content/verification/capture.mjs";

// Phase 3 U4 (owner ruling 2026-09-23, F-2 option a). The resolve step (S2) used
// to keep no response body, so when it refused an owner-approved mapping (PMID
// 29543316, twice) the title it compared could not be read back and the cause
// could only be guessed. Every resolver response is now saved as committed
// metadata under <out>/<paperId>/, the pattern S1 already uses for its search
// responses. Offline: a fake fetch stands in for PubMed. Red proof: both tests
// failed before capture.mjs saved the body
// (docs/01-plan/features/p3-u4-profiles.plan.md §5).

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function resolveWith(body: string, expectedTitle: string) {
  const out = mkdtempSync(path.join(os.tmpdir(), "u4-resolve-"));
  dirs.push(out);
  const client = createClient({
    dryRun: false,
    maxCalls: 1,
    scenario: "S2",
    mailto: null,
    logFile: null,
    fetchImpl: async () => new Response(body, { status: 200 }),
    sleep: async () => {},
  });
  const approval = {
    paperId: "p-resolve-test",
    kind: "pmid",
    id: "29543316",
    expectedTitle,
    approvedBy: "owner",
    approvedOn: "2026-09-23",
    approvalRef: "test",
  };
  return runResolve([approval], client, "2026-09-23", out).then((r) => ({
    ...r,
    saved: path.join(out, "p-resolve-test", "esummary.json"),
  }));
}

const title = "Oral vitamin B12 versus intramuscular vitamin B12 for vitamin B12 deficiency.";
const body = JSON.stringify({ result: { uids: ["29543316"], "29543316": { title } } });

describe("S2 resolve keeps every response body (U4, F-2 option a)", () => {
  it("saves the body of a matched mapping, byte for byte", async () => {
    const r = await resolveWith(body, title);
    expect(r.entries).toHaveLength(1);
    expect(existsSync(r.saved)).toBe(true);
    expect(readFileSync(r.saved, "utf8")).toBe(body);
  });

  it("saves the body of a REFUSED mapping, so the refusal can be diagnosed", async () => {
    const r = await resolveWith(body, "A different approved title");
    expect(r.refusals).toHaveLength(1);
    expect(existsSync(r.saved)).toBe(true);
    expect(readFileSync(r.saved, "utf8")).toBe(body);
  });
});
