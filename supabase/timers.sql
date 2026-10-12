-- End-of-timer notifications: the app writes when the running timer ends,
-- a cron job calls the `tick` function every minute and it pushes the due ones.
-- Run after schema.sql. Replace __TICK_SECRET__ and __PROJECT_REF__ (tools/setup-timers.mjs does it).

create table if not exists public.timers (
  user_id uuid primary key references auth.users on delete cascade,
  end_at timestamptz not null,
  title text not null,
  body text not null
);
alter table public.timers enable row level security;
drop policy if exists timers_own on public.timers;
create policy timers_own on public.timers for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('sottobosco-tick'); exception when others then null; end $$;
select cron.schedule('sottobosco-tick', '* * * * *', $cron$
  select net.http_post(
    url := 'https://__PROJECT_REF__.supabase.co/functions/v1/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tick-secret', '__TICK_SECRET__'),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.timers where end_at <= now());
$cron$);
