-- Sottobosco: shared forest for a fixed list of members.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Who may use the app. Add the two email addresses at the bottom.
create table if not exists public.members (email text primary key);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_member() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  color text not null default '#2f8f5b',
  updated_at timestamptz not null default now()
);

-- One row per person: settings, unlocked species, running session, status…
create table if not exists public.forests (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Finished sessions, one row per person per month.
create table if not exists public.months (
  user_id uuid not null references auth.users on delete cascade,
  month text not null,
  list jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- Web Push subscriptions (one per installed device).
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  sub jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.forests enable row level security;
alter table public.months enable row level security;
alter table public.push_subs enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member());

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_write on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (public.is_member());
create policy profiles_write on public.profiles for all to authenticated
  using (public.is_member() and id = auth.uid()) with check (public.is_member() and id = auth.uid());

drop policy if exists forests_read on public.forests;
drop policy if exists forests_write on public.forests;
create policy forests_read on public.forests for select to authenticated using (public.is_member());
create policy forests_write on public.forests for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

drop policy if exists months_read on public.months;
drop policy if exists months_write on public.months;
create policy months_read on public.months for select to authenticated using (public.is_member());
create policy months_write on public.months for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

-- Live updates for the shared forest.
do $$ begin
  begin alter publication supabase_realtime add table public.forests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.months; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
end $$;
