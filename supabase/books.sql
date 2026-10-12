-- Biblioteca: a shared catalogue of books, and each person's own reading of them.
-- Run after schema.sql (needs public.is_member). Safe to re-run.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  author text not null default '',
  year int,
  pages int check (pages is null or pages between 1 and 20000),
  cover_url text,
  isbn text,
  source_id text,
  added_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists books_source_id on public.books (source_id) where source_id is not null;

-- One row per person per book: where they are with it and what they thought.
create table if not exists public.readings (
  book_id uuid not null references public.books on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  status text not null default 'want' check (status in ('want', 'reading', 'read', 'dnf')),
  rating numeric(2,1) check (rating is null or (rating >= 0.5 and rating <= 5)),
  review text not null default '',
  fav boolean not null default false,
  progress int not null default 0,
  started_on date,
  finished_on date,
  updated_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

-- Quotes, comments (the two-person book club) and recommendations.
create table if not exists public.book_notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('quote', 'comment', 'rec')),
  text text not null check (char_length(text) between 1 and 1000),
  page int,
  created_at timestamptz not null default now()
);
create index if not exists book_notes_book on public.book_notes (book_id);

create table if not exists public.reading_goals (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  year int not null,
  target int not null check (target between 1 and 366),
  primary key (user_id, year)
);

alter table public.books enable row level security;
alter table public.readings enable row level security;
alter table public.book_notes enable row level security;
alter table public.reading_goals enable row level security;

-- The catalogue is shared: either of you can add, fix or remove a book.
drop policy if exists books_read on public.books;
drop policy if exists books_add on public.books;
drop policy if exists books_edit on public.books;
drop policy if exists books_remove on public.books;
create policy books_read on public.books for select to authenticated using (public.is_member());
create policy books_add on public.books for insert to authenticated with check (public.is_member() and added_by = auth.uid());
create policy books_edit on public.books for update to authenticated using (public.is_member()) with check (public.is_member());
create policy books_remove on public.books for delete to authenticated using (public.is_member());

-- Everything personal: everyone reads, each writes only their own.
drop policy if exists readings_read on public.readings;
drop policy if exists readings_write on public.readings;
create policy readings_read on public.readings for select to authenticated using (public.is_member());
create policy readings_write on public.readings for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

drop policy if exists notes_read on public.book_notes;
drop policy if exists notes_write on public.book_notes;
create policy notes_read on public.book_notes for select to authenticated using (public.is_member());
create policy notes_write on public.book_notes for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

drop policy if exists goals_read on public.reading_goals;
drop policy if exists goals_write on public.reading_goals;
create policy goals_read on public.reading_goals for select to authenticated using (public.is_member());
create policy goals_write on public.reading_goals for all to authenticated
  using (public.is_member() and user_id = auth.uid()) with check (public.is_member() and user_id = auth.uid());

do $$ begin
  begin alter publication supabase_realtime add table public.books; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.readings; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.book_notes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reading_goals; exception when duplicate_object then null; end;
end $$;
