# AquaSci 1 — HKK Outreach Scheduler

A shared availability planner for the AquaSci 1 class outreach. Classmates pick
their name, paint the half-hour blocks they are free, and the class sees the
best slots, who has replied, and who is still missing. The PM manages events,
candidate days, and the timeline in Supabase.

Built with Vue 3 + Vite, Supabase, and the hand-drawn aquatic look from
`prototype.html`.

## What is in it

- **Events** — each event has its own candidate days, hour range, grid, and
  replies. Switching events never mixes answers.
- **Painting** — name-pick, drag to mark free, right-drag or Erase to remove,
  immediate save to Supabase, and a Clear my times button.
- **Results** — a green heatmap of who is free, the best slot, and a top-five
  leaderboard. Click a cell or a leaderboard row to see who is free or busy.
- **Replies** — search, filter (replied/waiting or free/busy), sort, progress,
  and a group-chat summary.
- **Live updates** — Supabase Realtime refreshes replies and planner data when
  someone else paints or the PM edits the dashboard.
- **Share link** — the Share button copies a URL with `?event=<id>` so everyone
  lands on the same event.

## Local setup

```sh
npm install
cp .env.example .env
# fill in the two Supabase values, then:
npm run dev
```

Open the printed local URL. The app needs a configured Supabase project; without
one it shows the setup card instead of the grid.

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Open a new query and run `supabase/seed.sql` (HKK event, Dec 1–7, timeline).
4. Copy the **Project URL** and **anon public key** into `.env`:

   ```sh
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart the dev server.

Full PM instructions live in [`supabase/README.md`](supabase/README.md). In
short: events, `event_days`, and `timeline` are read-only to the app and are
edited in the Supabase Table Editor; `availability` is written by classmates.

## Commands

```sh
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import the repository at [vercel.com/new](https://vercel.com/new). Vercel
   detects Vite automatically: build `npm run build`, output `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under
   **Settings → Environment Variables** for Production, Preview, and Development.
4. Deploy, then open the deployed URL and check that the HKK event loads.
5. Send the **Share** link to the class group chat.

Vite inlines environment variables at build time, so redeploy after changing
them.

## Security model

- The Supabase anon key is public by design. RLS and the explicit grants in
  `supabase/schema.sql` are the guard.
- No login. Anyone with the link can paint under any roster name; this is a
  one-time, trust-based class tool.
- The app can only read events, candidate days, and the timeline. It can only
  select, insert, and delete availability rows. There is no update path.
- Never put the `service_role` key in `.env` or any `VITE_` variable.

## Project layout

```
src/
  App.vue                 app state, Supabase loading, realtime, share links
  components/             cards, grid, calendar, replies, timeline, mascot
  composables/useToast.js toast helper
  data/roster.js          fixed 25-classmate roster
  lib/api.js              Supabase reads/writes + realtime subscription
  lib/dates.js            date and slot helpers
  lib/supabase.js         client from VITE_ env vars
supabase/
  schema.sql              tables, grants, RLS, realtime publication
  seed.sql                HKK event, Dec 1–7, timeline
  README.md               PM setup and workflow
prototype.html            original single-file prototype
```
