-- Saju Finance account storage.
-- Run this after creating the Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.finance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_snapshot_id text not null,
  created_at timestamptz not null default now(),
  check_due_at timestamptz,
  focused_question text not null,
  concerns text[] not null default '{}',
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  unique (user_id, client_snapshot_id)
);

create table if not exists public.finance_rechecks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.finance_snapshots(id) on delete cascade,
  client_recheck_id text not null,
  checked_at timestamptz not null default now(),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  unique (user_id, client_recheck_id)
);

alter table public.finance_snapshots enable row level security;
alter table public.finance_rechecks enable row level security;

drop policy if exists "users read own finance snapshots" on public.finance_snapshots;
create policy "users read own finance snapshots"
on public.finance_snapshots for select
using (auth.uid() = user_id);

drop policy if exists "users insert own finance snapshots" on public.finance_snapshots;
create policy "users insert own finance snapshots"
on public.finance_snapshots for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own finance snapshots" on public.finance_snapshots;
create policy "users update own finance snapshots"
on public.finance_snapshots for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users delete own finance snapshots" on public.finance_snapshots;
create policy "users delete own finance snapshots"
on public.finance_snapshots for delete
using (auth.uid() = user_id);

drop policy if exists "users read own finance rechecks" on public.finance_rechecks;
create policy "users read own finance rechecks"
on public.finance_rechecks for select
using (auth.uid() = user_id);

drop policy if exists "users insert own finance rechecks" on public.finance_rechecks;
create policy "users insert own finance rechecks"
on public.finance_rechecks for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own finance rechecks" on public.finance_rechecks;
create policy "users update own finance rechecks"
on public.finance_rechecks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users delete own finance rechecks" on public.finance_rechecks;
create policy "users delete own finance rechecks"
on public.finance_rechecks for delete
using (auth.uid() = user_id);

create index if not exists finance_snapshots_user_created_idx
  on public.finance_snapshots (user_id, created_at desc);

create index if not exists finance_rechecks_snapshot_checked_idx
  on public.finance_rechecks (snapshot_id, checked_at desc);
