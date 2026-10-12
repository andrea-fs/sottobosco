-- Atlante: places you have been to (or dream of), the trips there, their photos.
-- Shared by the two of you: either can add or edit everything. Run after schema.sql. Safe to re-run.

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  admin text not null default '',
  country text not null default '',
  country_code text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  wish boolean not null default false,
  wish_note text not null default '',
  geo_id text,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists places_geo_id on public.places (geo_id) where geo_id is not null;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places on delete cascade,
  start_on date not null,
  end_on date,
  people uuid[] not null default '{}',
  transport text not null default 'plane' check (transport in ('plane', 'train', 'car', 'ship', 'bus', 'bike', 'walk')),
  origin_name text not null default '',
  origin_lat double precision,
  origin_lon double precision,
  rating int check (rating is null or rating between 1 and 5),
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists trips_place on public.trips (place_id);

create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  path text not null unique,
  width int, height int,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists trip_photos_trip on public.trip_photos (trip_id);

-- One shared "home" the routes start from.
create table if not exists public.atlas_home (
  id int primary key default 1 check (id = 1),
  name text not null,
  lat double precision not null,
  lon double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.places enable row level security;
alter table public.trips enable row level security;
alter table public.trip_photos enable row level security;
alter table public.atlas_home enable row level security;

drop policy if exists places_all on public.places;
create policy places_all on public.places for all to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists trips_all on public.trips;
create policy trips_all on public.trips for all to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists photos_all on public.trip_photos;
create policy photos_all on public.trip_photos for all to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists home_all on public.atlas_home;
create policy home_all on public.atlas_home for all to authenticated using (public.is_member()) with check (public.is_member());

-- Photos: private bucket, only the two of you, images up to 6 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atlas', 'atlas', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists atlas_read on storage.objects;
drop policy if exists atlas_add on storage.objects;
drop policy if exists atlas_remove on storage.objects;
create policy atlas_read on storage.objects for select to authenticated using (bucket_id = 'atlas' and public.is_member());
create policy atlas_add on storage.objects for insert to authenticated with check (bucket_id = 'atlas' and public.is_member());
create policy atlas_remove on storage.objects for delete to authenticated using (bucket_id = 'atlas' and public.is_member());

do $$ begin
  begin alter publication supabase_realtime add table public.places; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trips; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trip_photos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.atlas_home; exception when duplicate_object then null; end;
end $$;
