-- Migration 0003 — ai-advisor (Design §3.3). ADDITIVE ONLY.
-- New tables for read-only advisor history + per-user token budget. No existing
-- table or engine is touched; RLS restricts every row to its owner.

-- ===== advisor_conversations (new) =====
create table if not exists public.advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== advisor_messages (new) =====
create table if not exists public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.advisor_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ===== advisor_usage (new) — per-user, per-day token budget ledger =====
create table if not exists public.advisor_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  primary key (user_id, usage_date)
);

create index if not exists idx_advisor_messages_conversation
  on public.advisor_messages(conversation_id, created_at);
create index if not exists idx_advisor_conversations_user
  on public.advisor_conversations(user_id, updated_at desc);

-- ===== Row Level Security =====
alter table public.advisor_conversations enable row level security;
alter table public.advisor_messages      enable row level security;
alter table public.advisor_usage         enable row level security;

-- Direct ownership on conversations + usage (mirrors own_lab_panels).
create policy "own_advisor_conversations" on public.advisor_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_advisor_usage" on public.advisor_usage
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messages are owned transitively via their conversation.
create policy "own_advisor_messages" on public.advisor_messages
  for all
  using (
    exists (
      select 1 from public.advisor_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.advisor_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
