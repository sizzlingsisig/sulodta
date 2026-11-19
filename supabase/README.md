# Supabase setup

The app reads events, candidate days, and the timeline from Supabase. Only
availability (the painted blocks) is written by classmates.

## First-time setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `schema.sql`, and press **Run**.
3. Open a new query, paste `seed.sql`, and press **Run**. This adds the HKK
   event, Dec 1–7 candidate days, and the four timeline entries.
4. In **Project Settings → API**, copy the **Project URL** and the **anon
   public key** into `.env`:

   ```sh
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart `npm run dev`. The app should load the HKK event.
6. On Vercel, add those same two variables under **Settings → Environment
   Variables**, then redeploy.

If the app shows “The planner tables are missing”, re-run `schema.sql` and
`seed.sql`. If it shows “permission denied”, re-run the GRANT and RLS section of
`schema.sql`.

## PM workflow

Everything the PM changes happens in the Supabase dashboard, not in the app.
The `anon` role can only `SELECT` events, event_days, and timeline, so the app
cannot accidentally edit them.

### Add an event

**Table Editor → events → Insert row**

| column     | value                          |
| ---------- | ------------------------------ |
| name       | e.g. `Committee sync`          |
| start_hour | `8` (6–21)                     |
| end_hour   | `18` (7–22, greater than start) |

Leave `id` and `created_at` on their defaults.

### Add candidate days

**Table Editor → event_days → Insert row**, one row per day, using the event's
`id` and a date. Or paste this SQL, replacing the event id and date range:

```sql
insert into public.event_days (event_id, day)
select 'PASTE-EVENT-ID', d::date
from generate_series(date '2026-12-01', date '2026-12-07', interval '1 day') d
on conflict (event_id, day) do nothing;
```

### Add a timeline entry

**Table Editor → timeline → Insert row**. `day` may be blank for TBA. Dated
entries appear as red dots on the calendar.

### Do not edit availability

`availability` belongs to the classmates. The app inserts a row when someone
paints a block and deletes it when they erase. It never updates a row.

## Security model

- The anon key is public by design. RLS and the explicit grants in `schema.sql`
  are the guard.
- There is no login. Anyone with the link can paint under any classmate's name.
  That is the agreed one-time, trust-based model.
- `events`, `event_days`, and `timeline` are read-only to the app.
- `availability` allows `SELECT`, `INSERT`, and `DELETE` only.
- Realtime is enabled for all four tables. The app subscribes to availability
  changes for the active event and silently refreshes planner data when the PM
  edits an event, day, or timeline entry.
