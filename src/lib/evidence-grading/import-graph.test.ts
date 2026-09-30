// [2026-09-29, Phase 4 U20; FU-75] U5 (b) left ./index and ./gate importing each other. U20 moved
// the composite to ./composite so neither needs the other's module. This keeps it that way: it
// reads this directory's own import graph with TypeScript's pre-processor (imports and
// re-exports, comments ignored) and fails on any cycle. A specifier names a sibling when it is
// relative ("./x", "./x.js", "." or "./") or the "@/lib/evidence-grading" alias ("…/x", or the
// bare alias, which is ./index). Other forms (e.g. "../evidence-grading") are not resolved.
// Red proof: pointing ./gate's composite import back at ./index, or adding a side-effect import
// of ".", "./index.js" or the alias, fails (docs/01-plan/features/p4-u20-evidence-hygiene.plan.md).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "src/lib/evidence-grading");

/** The sibling module a specifier names, or null when it names none. */
function sibling(specifier: string): string | null {
  const ALIAS = "@/lib/evidence-grading";
  let rest: string;
  if (specifier === "." || specifier === "./" || specifier === ALIAS) return "index";
  if (specifier.startsWith("./")) rest = specifier.slice(2);
  else if (specifier.startsWith(`${ALIAS}/`)) rest = specifier.slice(ALIAS.length + 1);
  else return null;
  return rest.replace(/\.(ts|js)$/, "").replace(/\/index$/, "") || "index";
}

/** Module name (no extension) → the sibling modules it imports or re-exports from. */
function localGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const file of readdirSync(DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const { importedFiles } = ts.preProcessFile(readFileSync(join(DIR, file), "utf8"), true, true);
    const local = importedFiles
      .map((f) => sibling(f.fileName))
      .filter((name): name is string => name !== null);
    graph.set(file.replace(/\.ts$/, ""), local);
  }
  return graph;
}

/** Every cycle reached by depth-first search, as the path that closes it. */
function cycles(graph: Map<string, string[]>): string[][] {
  const found: string[][] = [];
  const visit = (node: string, path: string[]) => {
    for (const next of graph.get(node) ?? []) {
      if (path.includes(next)) found.push([...path.slice(path.indexOf(next)), next]);
      else visit(next, [...path, next]);
    }
  };
  for (const node of graph.keys()) visit(node, [node]);
  return found;
}

describe("evidence-grading import graph (FU-75)", () => {
  it("has no import cycle", () => {
    const graph = localGraph();
    // Anti-vacuity: the edges this rule is about are present and read.
    expect(graph.get("index")).toEqual(expect.arrayContaining(["composite", "gate"]));
    expect(graph.get("gate")).toContain("composite");
    expect(cycles(graph)).toEqual([]);
  });

  it("the gate does not import the engine's index", () => {
    expect(localGraph().get("gate")).not.toContain("index");
  });
});
