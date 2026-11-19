-- AquaSci 1 Outreach Scheduler — Supabase schema
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Access model:
--   events / event_days / timeline : read-only to the app (PM edits in Supabase)
--   availability                   : classmates may read, insert, delete blocks
--
-- The app uses the anon key, so these grants + RLS policies are the only guard.
-- There is no login: anyone with the link can paint under any name. That is the
-- agreed trust model for a one-time class activity.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  start_hour numeric(3,1) not null default 8 check (start_hour between 6 and 21),
  end_hour numeric(3,1) not null default 18 check (
    end_hour between 7 and 22 and end_hour > start_hour
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.event_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  day date not null,
  unique (event_id, day)
);

create table if not exists public.availability (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  classmate text not null,
  day date not null,
  slot numeric(3,1) not null,
  created_at timestamptz not null default now(),
  unique (event_id, classmate, day, slot)
);

create table if not exists public.timeline (
  id uuid primary key default gen_random_uuid(),
  day date,
  text text not null check (char_length(text) between 1 and 140),
  created_at timestamptz not null default now()
);

create index if not exists availability_event_idx on public.availability (event_id);
create index if not exists event_days_event_idx on public.event_days (event_id);

-- ---------------------------------------------------------------------------
-- Explicit grants
--
-- Supabase no longer auto-exposes new tables in public to the Data API
-- (enforced 2026-10-30). Grant the minimum each role needs, and revoke the
-- default grants the app does not use.
-- ---------------------------------------------------------------------------

revoke all on table public.events from anon;
revoke all on table public.event_days from anon;
revoke all on table public.timeline from anon;
revoke all on table public.availability from anon;
revoke all on sequence public.availability_id_seq from anon;

grant usage on schema public to anon;
grant select on table public.events to anon;
grant select on table public.event_days to anon;
grant select on table public.timeline to anon;
grant select, insert, delete on table public.availability to anon;
grant usage, select on sequence public.availability_id_seq to anon;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.event_days enable row level security;
alter table public.availability enable row level security;
alter table public.timeline enable row level security;

-- Read-only reference data.
drop policy if exists "anon full events" on public.events;
drop policy if exists "anon read events" on public.events;
create policy "anon read events" on public.events
  for select to anon using (true);

drop policy if exists "anon full event_days" on public.event_days;
drop policy if exists "anon read event_days" on public.event_days;
create policy "anon read event_days" on public.event_days
  for select to anon using (true);

drop policy if exists "anon full timeline" on public.timeline;
drop policy if exists "anon read timeline" on public.timeline;
create policy "anon read timeline" on public.timeline
  for select to anon using (true);

-- Classmates may add and remove their own blocks. There is no UPDATE path:
-- painting inserts a block, erasing deletes it.
drop policy if exists "anon full availability" on public.availability;
drop policy if exists "anon read availability" on public.availability;
drop policy if exists "anon insert availability" on public.availability;
drop policy if exists "anon delete availability" on public.availability;
create policy "anon read availability" on public.availability
  for select to anon using (true);
create policy "anon insert availability" on public.availability
  for insert to anon with check (true);
create policy "anon delete availability" on public.availability
  for delete to anon using (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['events','event_days','availability','timeline'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.events replica identity full;
alter table public.event_days replica identity full;
alter table public.availability replica identity full;
alter table public.timeline replica identity full;
