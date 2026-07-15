-- Migration 0007 — side-effect-engine (v11, Design §3.3). ADDITIVE ONLY.
-- Adds a single new table `side_effect_reports` (structured, canonical-label
-- side-effect reports: one row per user / day / effect). No existing table or
-- engine is altered — v10 `checkins` is untouched. RLS scopes every row to its
-- owner (mirrors 0006).

create table if not exists public.side_effect_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  effect_label text not null,                   -- canonical vocabulary (server-normalized)
  severity smallint check (severity between 1 and 3),
  note text,                                    -- display-only
  created_at timestamptz not null default now(),
  unique (user_id, report_date, effect_label)   -- one row per user / day / effect
);

create index if not exists idx_side_effect_reports_user_date
  on public.side_effect_reports(user_id, report_date desc);

-- ===== Row Level Security =====
alter table public.side_effect_reports enable row level security;

create policy "own_side_effects" on public.side_effect_reports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
