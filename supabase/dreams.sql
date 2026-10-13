-- Sogni: one row per dream. The other person sees it unless it is marked private.
create table if not exists public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  night date not null,
  mood text not null check (mood in ('fear', 'anger', 'fun', 'joy', 'sad', 'anxiety', 'love', 'wonder', 'confused', 'calm', 'blank')),
  note text not null default '' check (char_length(note) <= 2000),
  private boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dreams_night on public.dreams (night desc);
alter table public.dreams enable row level security;
drop policy if exists dreams_read on public.dreams;
drop policy if exists dreams_write on public.dreams;
create policy dreams_read on public.dreams for select to authenticated
  using (public.is_member() and (user_id = auth.uid() or not private));
create policy dreams_write on public.dreams for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());
do $$ begin
  begin alter publication supabase_realtime add table public.dreams; exception when duplicate_object then null; end;
end $$;
