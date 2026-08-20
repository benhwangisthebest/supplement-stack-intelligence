import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// UI_ERROR_TEXT — Phase 2 U19, discharging F5.
// ---------------------------------------------------------------------------
// THE PROMISE THIS GUARDS. `respond.ts` has documented `ApiError.correlationId`
// since Phase 0 as "safe to render, quote in a support ticket, or paste into an
// incident report". Measured at `f8b2cab`, the id appeared in ZERO `.tsx` files:
// fourteen components read `json?.error?.message` and dropped the id sitting
// beside it in the same object. The type's own comment was false, and nothing
// noticed, because the rule lived only in prose (CLAUDE.md §3.5).
//
// ---------------------------------------------------------------------------
// WHY SOURCE-LEVEL AND NOT A COMPONENT TEST
// ---------------------------------------------------------------------------
// `boundaries.test.ts`'s `HARNESS_GAP` hard-fails on any tracked `*.test.tsx`,
// and `vitest.config.ts` collects `src/**/*.test.ts` only. Adding jsdom/RTL is
// its own decision with its own cost, explicitly out of scope for Phase 2. So
// the property is read off the source text — the same constraint and the same
// answer as U24's `nav-pillars.test.ts`.
//
// ---------------------------------------------------------------------------
// THE RATCHET, AND WHY THERE IS ONE
// ---------------------------------------------------------------------------
// U19 converts `AdvisorPanel` and allowlists the other thirteen. That is a
// deliberate ruling (2026-08-20), not an oversight: converting all fourteen
// would turn an M/S unit into fourteen user-visible copy changes across all
// three pillars, which the plan's file list did not approve — CLAUDE.md §8.1
// says name debt, do not absorb it.
//
// The allowlist is a RATCHET, borrowed wholesale from `boundaries.test.ts`'s
// `DOMAIN_PURITY_ALLOWLIST`: every entry must STILL VIOLATE. Fix a file and
// leave its entry, and this file goes red. An allowlist that outlives the
// violation it excuses is a standing permission on a path nobody watches. The
// list can only shrink.
// ---------------------------------------------------------------------------

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Tracked `.tsx` under a pathspec. Git's index, not the working tree (§4.2):
 * an untracked scratch component must not be able to hide a violation, and
 * `git add -N` must be enough to expose one.
 *
 * Empty is a HARD failure. U18's lint step was written against exactly this
 * mutation — an over-broad `ignores` produces a green run over zero files, and
 * the roadmap names that as the only unacceptable end state. A guard that
 * scans nothing passes vacuously.
 */
function trackedTsx(...pathspecs: string[]): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", ...pathspecs],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "UI_ERROR_TEXT could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- ${pathspecs.join(" ")}\n` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const files = stdout
    .split("\0")
    .filter((p) => p.length > 0 && p.endsWith(".tsx"))
    .sort();
  if (files.length === 0) {
    throw new Error(
      "UI_ERROR_TEXT found zero tracked .tsx files. A guard that scans nothing\n" +
        "passes vacuously, so this is a hard failure rather than a silent green.",
    );
  }
  return files;
}

const UI_FILES = trackedTsx("src/components", "src/app");

/**
 * Comments stripped before every structural assertion.
 *
 * N-14's audit found this repository's guards will happily match a mention
 * inside a comment, and it fired for real on `nav-pillars.test.ts`'s first run.
 * A guard that a file's PROSE can redden or green is not measuring structure.
 */
function codeOf(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * A read of the API envelope's error message: `json?.error?.message`,
 * `body.error.message`, and the optional-chained variants in between.
 */
const ENVELOPE_READ = /\.error\??\.message/;

/**
 * Statements, split on `;`.
 *
 * WHY STATEMENTS AND NOT LINES, stated plainly because it is the one place this
 * guard could be brittle: the conversion wraps a read in a call, and a wrapped
 * read is routinely spread across four lines by the formatter. A line-based
 * check would call `errorText(\n  json?.error?.message,` a violation. Splitting
 * on `;` ignores newlines entirely, so the same statement is seen whole however
 * it is wrapped.
 *
 * The known cost: a `for (;;)` header splits into empty fragments. Harmless —
 * they contain no envelope read. A `;` inside a string literal would also split;
 * none exists in the scanned set today, and if one appears the guard reddens
 * rather than silently passing, which is the safe direction.
 */
const statementsOf = (code: string) => code.split(";");

/** Every ungoverned envelope read in a file: read present, `errorText` absent. */
function ungovernedReads(file: string): string[] {
  return statementsOf(codeOf(file))
    .filter((s) => ENVELOPE_READ.test(s) && !s.includes("errorText("))
    .map((s) => s.trim().replace(/\s+/g, " ").slice(0, 100));
}

// ---------------------------------------------------------------------------
// THE RATCHET. Thirteen entries, each with a written reason. It can only shrink.
// ---------------------------------------------------------------------------
const ALLOWLIST: Readonly<Record<string, string>> = {
  "src/components/advisor/ActionProposalCard.tsx":
    "U19 converts AdvisorPanel only (ruled 2026-08-20). Action-apply failures are 500s that DO carry an id.",
  "src/components/advisor/UndoToast.tsx":
    "As above. Undo failures are 500s that DO carry an id — a real loss, not a theoretical one.",
  "src/components/profile/LabMarkerModal.tsx": "U19 scope ruling; Profile pillar untouched by this unit.",
  "src/components/profile/LabMarkerTable.tsx": "U19 scope ruling; Profile pillar untouched by this unit.",
  "src/components/profile/ProfileForm.tsx": "U19 scope ruling; Profile pillar untouched by this unit.",
  "src/components/stack/AddItemForm.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/AddToStackButton.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/CompareView.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/NewStackForm.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/ProductMatchPanel.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/ProtocolPanel.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/StackItemRow.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
  "src/components/stack/StackWorkspace.tsx": "U19 scope ruling; Stack Lab pillar untouched by this unit.",
};

describe("UI_ERROR_TEXT — anti-vacuity, asserted before anything else", () => {
  // These exist so that NARROWING THE GUARD REDDENS IT. Every assertion below
  // is a statement about a set; a guard whose set can quietly empty is the
  // failure mode U18 was written to prevent, and it would be reintroduced by
  // the unit that cites U18 as its precedent.
  it("scans a real inventory of UI files", () => {
    expect(UI_FILES.length).toBeGreaterThanOrEqual(50);
  });

  it("the envelope-read inventory is non-empty and stays measurable", () => {
    // 14 at f8b2cab. Conversion does not shrink this: a converted call site
    // still READS `.error.message`, it just passes the result through
    // `errorText`. So this floor is stable across the ratchet closing.
    const total = UI_FILES.filter((f) => ENVELOPE_READ.test(codeOf(f))).length;
    expect(total).toBeGreaterThanOrEqual(14);
  });

  it("the file the unit converted is actually in the scanned set", () => {
    expect(UI_FILES).toContain("src/components/advisor/AdvisorPanel.tsx");
  });
});

describe("UI_ERROR_TEXT — no UI file renders an error message without the formatter", () => {
  it("every ungoverned envelope read is either fixed or allowlisted", () => {
    const violations: string[] = [];
    for (const file of UI_FILES) {
      if (file in ALLOWLIST) continue;
      for (const read of ungovernedReads(file)) {
        violations.push(`${file} — ${read}`);
      }
    }

    expect(
      violations,
      "UI_ERROR_TEXT: these files read the API envelope's error message and drop\n" +
        "the correlation id sitting beside it. Wrap the read in `errorText()` from\n" +
        "`@/lib/api/error-text` and pass `…error?.correlationId` as the second\n" +
        "argument. The id is the only handle a user has to quote when reporting a\n" +
        "failure, and `respond.ts` promises it is renderable:\n  " +
        violations.join("\n  "),
    ).toEqual([]);
  });
});

describe("UI_ERROR_TEXT — the ratchet's own integrity", () => {
  it("every allowlist entry still violates, and names a tracked file", () => {
    // THE RATCHET PROPERTY. Fix a file, leave the entry, and the next unwrapped
    // read in it slips in pre-approved. So a stale entry is a failure.
    const stale: string[] = [];
    for (const file of Object.keys(ALLOWLIST)) {
      if (!UI_FILES.includes(file)) {
        stale.push(`${file} — allowlisted but not a tracked .tsx under src/components or src/app`);
        continue;
      }
      if (ungovernedReads(file).length === 0) {
        stale.push(`${file} — allowlisted but no longer violates; delete the entry`);
      }
    }
    expect(
      stale,
      "UI_ERROR_TEXT ratchet: the allowlist may only shrink.\n  " + stale.join("\n  "),
    ).toEqual([]);
  });

  it("every allowlist entry carries a written reason", () => {
    const unexplained = Object.entries(ALLOWLIST)
      .filter(([, reason]) => reason.trim().length < 20)
      .map(([file]) => file);
    expect(unexplained).toEqual([]);
  });

  it("AdvisorPanel is not allowlisted — it is the file this unit converted", () => {
    expect(Object.keys(ALLOWLIST)).not.toContain("src/components/advisor/AdvisorPanel.tsx");
  });
});

describe("UI_ERROR_TEXT — the SSE error event, which no envelope regex can see", () => {
  // The advisor's stream does not deliver an ApiEnvelope. `route.ts:236-238`
  // emits `sse("error", { message, correlationId })`, and the client reads
  // `data.message` — a shape the envelope pattern above cannot match. It was
  // the SECOND discard site in the same file, and orienting found it only by
  // reading the stream consumer. Pinned separately because a guard that misses
  // it would have reported this unit complete with half the defect live.
  const ADVISOR_PANEL_CODE = codeOf("src/components/advisor/AdvisorPanel.tsx");

  it("the stream's error branch composes its text through the formatter", () => {
    const branch = statementsOf(ADVISOR_PANEL_CODE).filter((s) => s.includes('event === "error"'));
    expect(branch).toHaveLength(1);
    expect(branch[0]).toContain("errorText(");
  });

  it("the stream's error branch passes the correlation id, not just the message", () => {
    const branch = statementsOf(ADVISOR_PANEL_CODE).find((s) => s.includes('event === "error"'))!;
    expect(branch).toContain("correlationId");
  });

  it("AdvisorPanel imports the formatter from the pure module", () => {
    expect(ADVISOR_PANEL_CODE).toContain('from "@/lib/api/error-text"');
  });
});
