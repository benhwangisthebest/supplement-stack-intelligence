// Test infrastructure for Phase 4 U10 (c). NOT PRODUCTION CODE.
//
// An in-memory `stacks` + `stack_items` that answers the PostgREST chains the
// real repos build, with the semantics the compare-and-set depends on: a filter
// narrows the rows an UPDATE or DELETE touches, zero rows is not an error, an
// explicit primary key that is taken is 23505, and deleting a stack cascades to
// its items. `version` is a plain column with default 0; nothing here bumps it,
// exactly like migration 0011, so only the application can move it.
//
// The real repos and the real executor run against it, which is what lets the
// interleaving tests fail for the right reason at HEAD: the write that lands is
// the one Postgres would have applied.

type Row = Record<string, unknown>;
type Filter = [column: string, op: "eq" | "is", value: unknown];

/** One recorded request: its table, operation, and the filters it carried. */
export interface FakeCall {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  filters: Filter[];
}

const DEFAULTS: Record<string, () => Row> = {
  stacks: () => ({ mode: "current", description: null, created_at: "2026-09-28T00:00:00Z", updated_at: "2026-09-28T00:00:00Z" }),
  stack_items: () => ({
    supplement_id: null,
    custom_name: null,
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
    product_id: null,
    version: 0,
  }),
};

export function fakeStackDb() {
  const tables: Record<string, Row[]> = { stacks: [], stack_items: [] };
  const calls: FakeCall[] = [];
  let nextId = 1;
  let writes = 0;
  /** Runs once, before the Nth write request (1-based) is applied: an interleaved writer. */
  const before: { n: number; run: () => Promise<void> }[] = [];

  function builder(table: string) {
    let op: FakeCall["op"] = "select";
    let payload: unknown = null;
    const filters: Filter[] = [];
    const matches = (r: Row) =>
      filters.every(([c, o, v]) => (o === "is" ? r[c] === null : r[c] === v));

    async function run(): Promise<{ data: Row[] | null; error: { code: string } | null }> {
      calls.push({ table, op, filters: [...filters] });
      if (op !== "select") {
        writes += 1;
        const due = before.findIndex((b) => b.n === writes);
        if (due >= 0) await before.splice(due, 1)[0].run();
      }
      const rows = tables[table];
      switch (op) {
        case "select":
          return { data: rows.filter(matches).map((r) => ({ ...r })), error: null };
        case "insert": {
          const out: Row[] = [];
          for (const given of [payload].flat() as Row[]) {
            const row: Row = { ...DEFAULTS[table](), id: `${table}-${nextId++}`, ...given };
            if (rows.some((r) => r.id === row.id)) return { data: null, error: { code: "23505" } };
            if (table === "stack_items" && !tables.stacks.some((s) => s.id === row.stack_id)) {
              return { data: null, error: { code: "23503" } };
            }
            rows.push(row);
            out.push({ ...row });
          }
          return { data: out, error: null };
        }
        case "update": {
          const hit = rows.filter(matches);
          for (const r of hit) Object.assign(r, payload as Row);
          return { data: hit.map((r) => ({ ...r })), error: null };
        }
        case "delete": {
          const hit = rows.filter(matches);
          tables[table] = rows.filter((r) => !hit.includes(r));
          if (table === "stacks") {
            tables.stack_items = tables.stack_items.filter((i) => !hit.some((s) => s.id === i.stack_id));
          }
          return { data: hit.map((r) => ({ ...r })), error: null };
        }
      }
    }

    const self: Record<string, unknown> = {
      select: () => self,
      order: () => self,
      insert: (p: unknown) => ((op = "insert"), (payload = p), self),
      update: (p: unknown) => ((op = "update"), (payload = p), self),
      delete: () => ((op = "delete"), self),
      eq: (c: string, v: unknown) => (filters.push([c, "eq", v]), self),
      is: (c: string, v: unknown) => (filters.push([c, "is", v]), self),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => run().then(resolve, reject),
      single: async () => {
        const { data, error } = await run();
        if (error) return { data: null, error };
        return data?.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116" } };
      },
      maybeSingle: async () => {
        const { data, error } = await run();
        if (error) return { data: null, error };
        return { data: data?.[0] ?? null, error: null };
      },
    };
    return self;
  }

  return {
    /** Pass as the SupabaseClient; it implements only what the stack repos call. */
    client: { from: (table: string) => builder(table) },
    calls,
    /** The live row, or undefined when there is none. */
    item: (id: string) => tables.stack_items.find((r) => r.id === id),
    items: () => tables.stack_items,
    stack: (id: string) => tables.stacks.find((r) => r.id === id),
    seedStack: (row: Row) => void tables.stacks.push({ ...DEFAULTS.stacks(), ...row }),
    seedItem: (row: Row) => void tables.stack_items.push({ ...DEFAULTS.stack_items(), ...row }),
    /** Run `fn` just before write request number `n` from now is applied. */
    beforeWrite: (n: number, fn: () => Promise<void>) => void before.push({ n: writes + n, run: fn }),
  };
}
