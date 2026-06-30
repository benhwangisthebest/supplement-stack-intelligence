-- Migration 0004 — advisor-actions (v7, Design §3.3). ADDITIVE ONLY.
-- Adds: (1) a nullable product_id column on stack_items so the advisor can attach a
-- matched product to an item, and (2) an advisor_actions audit table holding each
-- APPLIED action plus its inverse (for one-click undo). No existing table/engine is
-- altered destructively; legacy stack_items rows keep product_id NULL. RLS scopes
-- every advisor_actions row to its owner (mirrors own_advisor_conversations, 0003).

-- ===== stack_items.product_id (additive nullable column) =====
alter table public.stack_items
  add column if not exists product_id text;

-- ===== advisor_actions (new) — applied-action audit + inverse for undo =====
create table if not exists public.advisor_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid
    references public.advisor_conversations(id) on delete set null,
  action_type text not null check (action_type in
    ('add_item', 'remove_item', 'edit_item', 'generate_protocol', 'attach_product')),
  status text not null default 'applied' check (status in ('applied', 'undone')),
  payload jsonb not null,
  inverse jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index if not exists idx_advisor_actions_user
  on public.advisor_actions(user_id, created_at desc);

-- ===== Row Level Security =====
alter table public.advisor_actions enable row level security;

create policy "own_advisor_actions" on public.advisor_actions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
