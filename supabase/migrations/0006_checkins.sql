-- Migration 0006 — daily-checkin (v10, Design §3.3). ADDITIVE ONLY.
-- Adds a single new table `checkins` (one idempotent row per user per calendar
-- day: adherence + goal ratings + optional note/side-effect). No existing
-- table/engine is altered. RLS scopes every row to its owner (mirrors 0003/0004).

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  ratings jsonb not null default '{}'::jsonb,   -- { outcomeCategory: 1..5 }
  taken jsonb not null default '[]'::jsonb,      -- supplementId[] taken that day
  scheduled jsonb not null default '[]'::jsonb,  -- supplementId[] scheduled (adherence denom)
  note text,
  side_effect text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)                 -- idempotent daily upsert
);

create index if not exists idx_checkins_user_date
  on public.checkins(user_id, checkin_date desc);

-- ===== Row Level Security =====
alter table public.checkins enable row level security;

create policy "own_checkins" on public.checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
