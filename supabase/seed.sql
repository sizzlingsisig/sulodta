-- AquaSci 1 Outreach Scheduler — starter data
-- Run after schema.sql in the Supabase SQL Editor. Safe to re-run.
--
-- Fixed ids make the seed idempotent. Re-running does not overwrite edits you
-- made in the Table Editor.

begin;

insert into public.events (id, name, start_hour, end_hour)
values (
  'a9c1e000-0000-4000-8000-000000000001',
  'HKK Outreach — pick the date',
  8,
  18
)
on conflict (id) do nothing;

insert into public.event_days (event_id, day)
select
  'a9c1e000-0000-4000-8000-000000000001'::uuid,
  d::date
from generate_series(date '2026-12-01', date '2026-12-07', interval '1 day') as d
on conflict (event_id, day) do nothing;

insert into public.timeline (id, day, text)
values
  ('a9c1e000-0000-4000-8000-000000000101', '2026-11-20', 'Finalize Brgy., groupings & assignments'),
  ('a9c1e000-0000-4000-8000-000000000102', '2026-11-24', 'Send letter to Brgy. & Pahinungod'),
  ('a9c1e000-0000-4000-8000-000000000103', '2026-11-27', 'Infographics lecture (Sir Yan) + 1st IEC drafts due'),
  ('a9c1e000-0000-4000-8000-000000000104', null, 'HKK activity date — we’re picking it here →')
on conflict (id) do nothing;

commit;
