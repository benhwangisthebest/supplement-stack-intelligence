// Test infrastructure for `src/lib/db` ownership pins (Phase 2 U9).
//
// NOT PRODUCTION CODE, and deliberately not in a `.test.ts` either: it is
// imported by ~10 sibling test files, and a helper living inside one of them
// would have that file's suites collected twice. It is excluded from coverage
// for the same reason `*.test.ts` is — tests measure product code, they are not
// product coverage themselves. Nothing under `src/app` or `src/components` may
// import it; if anything ever does, that is the finding, not this file.
//
// ===========================================================================
// WHAT THESE PINS ARE FOR
// ===========================================================================
// Every table in this schema is protected by RLS, so ownership is enforced by
// the database whether or not the repository asks for it. That makes the
// application-side scoping look redundant — and it is exactly why it was never
// pinned, and why it can be deleted without a single test noticing.
//
// It is not redundant. RLS is the LAST line, not the only one:
//
//   · A `SECURITY DEFINER` function bypasses RLS by construction. The ledger
//     writers added in 0008 already do; more will follow.
//   · The seed path runs under the service-role key, which bypasses RLS
//     entirely, and `src/lib/db` modules are what it calls.
//   · A policy is one migration away from being widened or dropped — the
//     ledger's `for all` policy shipped in 0003 and survived until 0008.
//   · A repo function that reads `.eq("id", id)` with no owner clause returns
//     another user's row the moment it is called from any context where RLS is
//     not in force, and reads as correct in review.
//
// So the property pinned here is: A FUNCTION THAT ACCEPTS A `userId` MUST BIND
// IT TO THE ROWS IT TOUCHES — as a filter on reads, updates and deletes, or in
// the written payload on inserts and upserts. Taking an owner and using it for
// neither is the defect. `CLAUDE.md` §4 rule 8 and §2.3 rule 11.

/** One recorded call in a query chain, in the order it was made. */
export interface SpyCall {
  method: string;
  args: unknown[];
}

export interface SpyOptions {
  /** Resolved as `{ data, error }` by every terminal await. */
  data?: unknown;
  error?: unknown;
}

export interface QuerySpy {
  /** Typed as the client the repos take; it implements only what they call. */
  client: import("@supabase/supabase-js").SupabaseClient;
  /** Every chained call, across every `from()`, in order. */
  calls: SpyCall[];
  /** Table names passed to `from()`, in order. */
  tables: string[];
  /** Payloads passed to `insert`/`update`/`upsert`, flattened to rows. */
  payloads: Record<string, unknown>[];
  /** True if `.eq(column, value)` was recorded with exactly these arguments. */
  filtered(column: string, value: unknown): boolean;
  /**
   * Every `.eq(column, value)` recorded, as pairs.
   *
   * Preferred over `filtered` for the ownership assertions, purely for the
   * failure text: `expect(spy.filtered(...)).toBe(true)` reports "expected false
   * to be true", which names neither the column that was missing nor the filters
   * that were applied instead. `expect(spy.filters()).toContainEqual([...])`
   * prints both, so the red says what happened.
   */
  filters(): [string, unknown][];
}

const TERMINAL = new Set(["single", "maybeSingle"]);

/**
 * A Supabase client that records the chain instead of performing it.
 *
 * Every builder method returns the same object and appends to `calls`, and the
 * builder is thenable, so `await supabase.from(t).select().eq(...)` resolves to
 * the configured result whatever shape the repo's chain takes. Repos differ in
 * method ORDER (`.select().eq()` vs `.eq().select()`), so the spy asserts on the
 * SET of calls made rather than on a fixed sequence — an assertion on order
 * would fail on a harmless refactor and teach people to loosen it.
 */
export function querySpy(opts: SpyOptions = {}): QuerySpy {
  const calls: SpyCall[] = [];
  const tables: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  const result = { data: opts.data ?? null, error: opts.error ?? null };

  const record = (method: string, args: unknown[]) => {
    calls.push({ method, args });
    if (method === "insert" || method === "update" || method === "upsert") {
      const payload = args[0];
      if (Array.isArray(payload)) payloads.push(...(payload as Record<string, unknown>[]));
      else if (payload && typeof payload === "object") {
        payloads.push(payload as Record<string, unknown>);
      }
    }
  };

  function builder(): Record<string, unknown> {
    const self: Record<string, unknown> = {
      then(resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    for (const method of [
      "select", "eq", "neq", "in", "is", "gte", "lte", "gt", "lt",
      "order", "limit", "range", "match", "not", "or", "contains",
      "insert", "update", "upsert", "delete",
    ]) {
      self[method] = (...args: unknown[]) => {
        record(method, args);
        return self;
      };
    }
    for (const method of TERMINAL) {
      self[method] = async (...args: unknown[]) => {
        record(method, args);
        return result;
      };
    }
    return self;
  }

  const client = {
    from(table: string) {
      tables.push(table);
      return builder();
    },
    async rpc(fn: string, args: unknown) {
      record("rpc", [fn, args]);
      return result;
    },
  } as unknown as QuerySpy["client"];

  return {
    client,
    calls,
    tables,
    payloads,
    filtered(column, value) {
      return calls.some(
        (c) => c.method === "eq" && c.args[0] === column && c.args[1] === value,
      );
    },
    filters() {
      return calls
        .filter((c) => c.method === "eq")
        .map((c) => [c.args[0] as string, c.args[1]] as [string, unknown]);
    },
  };
}

/**
 * Asserts the owner reached the query — as a filter or in the written payload.
 *
 * Returns a description of HOW it was bound so a caller can assert the specific
 * form where the form matters (a read must filter; an insert must carry the
 * column). Returns `null` when the owner never reached the query at all, which
 * is the failure this whole file exists to make loud.
 */
export function ownerBinding(spy: QuerySpy, userId: string): "filter" | "payload" | null {
  if (spy.filtered("user_id", userId)) return "filter";
  if (spy.payloads.some((row) => row.user_id === userId)) return "payload";
  return null;
}
