-- Migration 0005 — advisor-experience (v8, Design §3.3). ADDITIVE ONLY.
-- Adds a nullable batch_id to advisor_actions so a multi-action confirm writes N
-- rows sharing one batch_id → grouped, atomic one-click undo. Each row remains a
-- valid single action_type (the 0004 CHECK is untouched). Legacy rows: batch_id NULL.
-- No CHECK change, no column drop/alter, no RLS change (own_advisor_actions from 0004
-- already scopes by user_id). Streak of non-destructive migrations preserved.

alter table public.advisor_actions
  add column if not exists batch_id uuid;

-- Partial index: only batched rows are looked up by batch_id (undoBatch); legacy
-- single-action rows (batch_id NULL) are unaffected.
create index if not exists idx_advisor_actions_batch
  on public.advisor_actions(batch_id) where batch_id is not null;
