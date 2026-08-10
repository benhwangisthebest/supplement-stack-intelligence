import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftFlag } from "@/types";
import { listFlags, replaceFlags } from "./evaluation-flag-repo";
import type { EvaluationFlagRow } from "./types";

// ===========================================================================
// THE FAKE, AND WHY IT YIELDS
// ===========================================================================
// `replaceFlags` is three round trips with no transaction around them. What is
// worth testing is not "does it end in the right state" — a mock that resolves
// instantly proves that and nothing else — but WHAT AN OBSERVER SEES BETWEEN
// THEM, and what survives when one of them fails.
//
// So this fake holds REAL ROWS, and every operation yields to the scheduler
// before touching them.
//
// Of those two properties, mutation testing says the load-bearing one is the
// rows, and it is worth writing down which, because the intuition points the
// other way. Deleting the explicit `await Promise.resolve()` below changes
// nothing — `then` bridges to an async function, so a round trip cannot fail to
// yield even if it tries; the line documents intent and earns no more than
// that. Making the fake STATELESS, so selects replay the seed and ignore every
// write, leaves the file green unless something pins the state (see the second
// self-test). A stub that resolves instantly and remembers nothing is
// indistinguishable from this fake on the happy path and blind to every failure
// this file exists to catch — Phase 1 U10 shipped exactly that (§6.2.2), U4 is
// where the shape was fixed, and this is the same treatment for persistence.
//
// Two observation points are offered, and they prove different things:
//   onStep   — a snapshot after EVERY operation. Deterministic, and covers all
//              points at once, including ones a race would reach only by luck.
//   beforeOp — an async hook awaited at an operation's yield point, so a test
//              can run a genuinely concurrent `listFlags` THROUGH THIS SAME
//              FAKE at a chosen moment.

type Op = "select" | "insert" | "delete";

interface FakeOptions {
  /** Operations that should return an error instead of running. */
  failOn?: Op[];
  /** Called with a copy of the table after each successful operation. */
  onStep?: (op: Op, rows: EvaluationFlagRow[]) => void;
  /** Awaited at each operation's yield point, BEFORE it touches state. */
  beforeOp?: (op: Op) => Promise<void> | void;
  /**
   * Awaited AFTER each operation has touched state.
   *
   * The distinction is the whole test, and getting it wrong cost a mutation:
   * an observer that only runs *before* each operation never sees the instant
   * after a delete, which under delete-then-insert is the empty one. Observing
   * only at `beforeOp` produced a test that passed against both the fixed and
   * the broken implementation — a test, not a guard.
   */
  afterOp?: (op: Op) => Promise<void> | void;
}

function flagRow(over: Partial<EvaluationFlagRow> & { id: string }): EvaluationFlagRow {
  return {
    stack_id: "s1",
    stack_item_id: null,
    severity: "warning",
    category: "dose-fit",
    title: "prior flag",
    explanation: "explanation",
    recommendation: "recommendation",
    evidence_level: "n/a",
    created_at: "2026-08-10T00:00:00Z",
    ...over,
  };
}

function draft(title: string): DraftFlag {
  return {
    stackItemId: null,
    severity: "warning",
    category: "dose-fit",
    title,
    explanation: "explanation",
    recommendation: "recommendation",
    evidenceLevel: "n/a",
  };
}

/**
 * Ids are minted from a MODULE-level counter, not a per-fake one. The column is
 * `uuid default gen_random_uuid()`, so two ids are never equal even across
 * unrelated inserts; a per-fake counter reset made a second fake mint an id a
 * row seeded from the first already held, and the delete-by-id then removed a
 * freshly inserted row. That was the harness inventing a collision the database
 * cannot produce.
 */
let nextId = 100;

/** An in-memory `evaluation_flags` reachable through the Supabase call shapes. */
function fakeFlagsTable(seed: EvaluationFlagRow[] = [], opts: FakeOptions = {}) {
  let rows: EvaluationFlagRow[] = [...seed];
  const failOn = new Set(opts.failOn ?? []);

  // A hook that reads through this same fake would re-enter its own hooks
  // forever. Observers see the table; they are not themselves observed.
  let inHook = false;
  async function hook(fn: ((op: Op) => Promise<void> | void) | undefined, op: Op) {
    if (!fn || inHook) return;
    inHook = true;
    try {
      await fn(op);
    } finally {
      inHook = false;
    }
  }

  /** One round trip: hand control back, let anything queued run, then act. */
  async function roundTrip<T>(op: Op, act: () => T): Promise<{ data: T | null; error: unknown }> {
    await Promise.resolve();
    await hook(opts.beforeOp, op);
    if (failOn.has(op)) {
      return { data: null, error: { message: `${op} failed`, code: "TEST" } };
    }
    const data = act();
    opts.onStep?.(op, rows.map((r) => ({ ...r })));
    await hook(opts.afterOp, op);
    return { data, error: null };
  }

  function builder() {
    let op: Op = "select";
    let columns = "*";
    const eqs: [string, string][] = [];
    let inIds: string[] = [];
    let pending: Record<string, unknown>[] = [];

    const self = {
      select(cols: string) {
        columns = cols;
        return self;
      },
      eq(col: string, val: string) {
        eqs.push([col, val]);
        return self;
      },
      in(_col: string, ids: string[]) {
        inIds = ids;
        return self;
      },
      insert(payload: Record<string, unknown>[]) {
        op = "insert";
        pending = payload;
        return self;
      },
      delete() {
        op = "delete";
        return self;
      },
      then(
        resolve: (v: { data: unknown; error: unknown }) => unknown,
        reject?: (e: unknown) => unknown,
      ) {
        return run().then(resolve, reject);
      },
    };

    async function run() {
      if (op === "insert") {
        return roundTrip("insert", () => {
          const created = pending.map((p) =>
            flagRow({ ...(p as Partial<EvaluationFlagRow>), id: `n${nextId++}` }),
          );
          rows = [...rows, ...created];
          return created;
        });
      }
      if (op === "delete") {
        return roundTrip("delete", () => {
          rows = rows.filter((r) => {
            if (inIds.length > 0) return !inIds.includes(r.id);
            // The pre-U8 shape: delete every row for the stack.
            return !eqs.every(([c, v]) => (r as unknown as Record<string, string>)[c] === v);
          });
          return null;
        });
      }
      return roundTrip("select", () => {
        const matched = rows.filter((r) =>
          eqs.every(([c, v]) => (r as unknown as Record<string, string>)[c] === v),
        );
        return columns === "id" ? matched.map((r) => ({ id: r.id })) : matched.map((r) => ({ ...r }));
      });
    }

    return self;
  }

  const client = { from: () => builder() } as unknown as SupabaseClient;
  return { client, current: () => rows.map((r) => ({ ...r })) };
}

const PRIOR = [
  flagRow({ id: "old1", title: "prior one" }),
  flagRow({ id: "old2", title: "prior two" }),
  flagRow({ id: "old3", title: "prior three" }),
];

describe("the fake itself — a test harness that cannot observe the bug proves nothing", () => {
  it("reports an empty table as empty, so 'never empty' is a real claim", async () => {
    // Anti-vacuity. Every assertion below is of the form "the observer never
    // saw []". If the observer could not see [] under any circumstance, those
    // assertions would hold against any implementation whatsoever.
    const { client } = fakeFlagsTable([]);
    expect(await listFlags(client, "s1")).toEqual([]);
  });

  it("shows writes to a later reader, which is the property the empty check misses", async () => {
    // The check above is NOT sufficient, and a mutation proved it: a fake whose
    // selects always replayed the seed and ignored every write kept the whole
    // file green, because "empty seed reads empty" is still true of it. A
    // stateless fake makes every `listFlags`-based observation below vacuous
    // while looking exactly as convincing. So statefulness — not asynchrony —
    // is what has to be pinned, and this is the pin.
    const { client } = fakeFlagsTable([flagRow({ id: "seeded" })]);

    await replaceFlags(client, "s1", [draft("written")]);

    const after = await listFlags(client, "s1");
    expect(after.map((f) => f.title)).toEqual(["written"]);
  });

  it("yields before touching state, so an interleaved reader actually runs", async () => {
    const order: string[] = [];
    const { client } = fakeFlagsTable(PRIOR, {
      beforeOp: (op) => {
        order.push(`op:${op}`);
      },
    });
    const inFlight = replaceFlags(client, "s1", [draft("new")]);
    order.push("caller-continues-before-first-op");
    await inFlight;
    // If the fake resolved synchronously, the caller line would be last.
    expect(order[0]).toBe("caller-continues-before-first-op");
    expect(order).toContain("op:insert");
  });
});

describe("replaceFlags — the happy path is unchanged", () => {
  it("returns the new set and leaves only the new set behind", async () => {
    const { client, current } = fakeFlagsTable(PRIOR);
    const result = await replaceFlags(client, "s1", [draft("a"), draft("b")]);

    expect(result.map((f) => f.title)).toEqual(["a", "b"]);
    expect(current().map((r) => r.title)).toEqual(["a", "b"]);
  });

  it("clears the stack when the evaluation produces no flags", async () => {
    const { client, current } = fakeFlagsTable(PRIOR);
    expect(await replaceFlags(client, "s1", [])).toEqual([]);
    expect(current()).toEqual([]);
  });

  it("works on a first evaluation, where there is nothing to retire", async () => {
    const { client, current } = fakeFlagsTable([]);
    const result = await replaceFlags(client, "s1", [draft("first")]);
    expect(result).toHaveLength(1);
    expect(current()).toHaveLength(1);
  });

  it("retires only this stack's flags, never another stack's", async () => {
    const other = flagRow({ id: "other1", stack_id: "s2", title: "someone else's" });
    const { client, current } = fakeFlagsTable([...PRIOR, other]);
    await replaceFlags(client, "s1", [draft("a")]);
    expect(current().map((r) => r.id)).toContain("other1");
  });
});

describe("replaceFlags — the defect U8 exists to fix", () => {
  it("keeps the prior flags when the insert fails", async () => {
    // THE test. Delete-then-insert answers this with an empty table: the user's
    // evaluation is destroyed to make room for one that never arrived, and no
    // retry recovers it because the data is gone.
    const { client } = fakeFlagsTable(PRIOR, { failOn: ["insert"] });

    await expect(replaceFlags(client, "s1", [draft("a")])).rejects.toBeTruthy();

    const survivors = await listFlags(client, "s1");
    expect(survivors).toHaveLength(3);
    expect(survivors.map((f) => f.title)).toEqual(["prior one", "prior two", "prior three"]);
  });

  it("never leaves the stack momentarily empty — the window holds both sets, not neither", async () => {
    // Deterministic and exhaustive: snapshot after EVERY operation, not at a
    // point a race happens to reach. Under delete-then-insert the snapshot
    // taken after the delete is [].
    const seen: number[] = [];
    const { client } = fakeFlagsTable(PRIOR, {
      onStep: (_op, rows) => seen.push(rows.length),
    });

    await replaceFlags(client, "s1", [draft("a"), draft("b")]);

    expect(seen.length).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeGreaterThan(0);
    expect(seen).toContain(5); // the declared cost: 3 old + 2 new, transiently
  });

  it("a genuinely concurrent listFlags never observes an empty stack", async () => {
    // The same property proven the hard way: a REAL reader, running through the
    // same fake, resolving its own promises — not a synchronous peek at an
    // array. It reads AFTER every operation, because the dangerous instant is
    // the one right after a delete, and an observer that only ran before each
    // operation missed it entirely (see `FakeOptions.afterOp`).
    const observed: number[] = [];
    const { client } = fakeFlagsTable(PRIOR, {
      afterOp: async () => {
        observed.push((await listFlags(client, "s1")).length);
      },
    });

    await replaceFlags(client, "s1", [draft("a")]);

    expect(observed.length).toBeGreaterThan(0);
    expect(Math.min(...observed)).toBeGreaterThan(0);
  });

  it("throws rather than reporting success when the retiring delete fails", async () => {
    // The residual cost of the chosen order, pinned so it is a known state and
    // not a surprise: the new rows are committed, the old ones are not gone.
    // Reporting success here would leave the user reading doubled flags with no
    // indication anything went wrong — the silent-failure defect §8.3 names.
    const { client, current } = fakeFlagsTable(PRIOR, { failOn: ["delete"] });

    await expect(replaceFlags(client, "s1", [draft("a")])).rejects.toBeTruthy();
    expect(current()).toHaveLength(4);
  });

  it("self-heals on the next evaluation, because stale ids are captured up front", async () => {
    // Continues the case above: the leftovers are indistinguishable from any
    // other prior flag, so the next run retires them with everything else.
    const { client, current } = fakeFlagsTable(PRIOR, { failOn: ["delete"] });
    await expect(replaceFlags(client, "s1", [draft("a")])).rejects.toBeTruthy();
    expect(current()).toHaveLength(4);

    const healthy = fakeFlagsTable(current());
    const result = await replaceFlags(healthy.client, "s1", [draft("b")]);

    expect(result.map((f) => f.title)).toEqual(["b"]);
    expect(healthy.current()).toHaveLength(1);
  });
});

describe("replaceFlags — concurrency semantics are last-writer-wins, not mutual destruction", () => {
  it("leaves one complete set behind when two replacements overlap", async () => {
    // Deleting "everything not just inserted" would have each call remove the
    // other's rows and end with neither set. Capturing ids before the insert
    // means the later writer's set survives intact.
    const { client, current } = fakeFlagsTable(PRIOR);

    await Promise.all([
      replaceFlags(client, "s1", [draft("from-A")]),
      replaceFlags(client, "s1", [draft("from-B")]),
    ]);

    const titles = current().map((r) => r.title);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.some((t) => t === "from-A" || t === "from-B")).toBe(true);
    expect(titles).not.toContain("prior one");
  });
});

describe("listFlags", () => {
  it("returns the stack's flags mapped to the domain shape", async () => {
    const { client } = fakeFlagsTable(PRIOR);
    const flags = await listFlags(client, "s1");
    expect(flags).toHaveLength(3);
    expect(flags[0]).toMatchObject({ id: "old1", stackId: "s1", evidenceLevel: "n/a" });
  });

  it("scopes by stack, so another stack's flags never leak in", async () => {
    const { client } = fakeFlagsTable([...PRIOR, flagRow({ id: "x", stack_id: "s2" })]);
    expect(await listFlags(client, "s1")).toHaveLength(3);
  });
});
