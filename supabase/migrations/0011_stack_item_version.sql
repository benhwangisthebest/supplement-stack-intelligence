-- Migration 0011 — stack_items.version (Phase 4 U10 (c)). ADDITIVE ONLY.
-- A row version for compare-and-set. Every application write to a stack item
-- sets version = expected + 1 WHERE id = … AND version = expected, so a write
-- built from a stale read matches no row. The filter carries an id and a
-- number, never a field value (FU-78, §2.3 rule 15). Existing rows start at 0.
-- No policy change: RLS is per table, and own_stack_items (0001) already
-- covers every column of stack_items, this one included.
alter table public.stack_items
  add column if not exists version integer not null default 0;
