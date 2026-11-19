# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The 25 classmates of AquaSci 1, organizing an educational outreach for elementary students and younger children. A classmate acting as PM creates events, shares links, and collects replies. The children attending the outreach never use the product.

## Product Purpose

Give the class one shared place to choose the outreach date. Classmates mark when they are free; the PM sees which candidate slot the most people can attend, how many have replied, and who is still missing. The same tool hosts side events such as a makeup date, committee sync, or dry run.

## Positioning

A name-based scheduler built for one class, not a general meeting poll: a fixed 25-person roster, no accounts, per-event availability grids with half-hour blocks, live shared replies, and a group-chat-ready summary. Each event keeps its own candidate days, hours, and replies, so switching events never mixes answers.

## Operating Context

- The PM distributes a link through the class group chat; classmates answer on their phones.
- The activity targets the first week of December 2026; venue and exact date are still TBD.
- Planning runs alongside a milestone timeline (finalize barangay coordination and groupings, send letters, infographics lecture and IEC drafts) and a fixed ₱1,000 budget for children's snacks.
- Replies are shared through Supabase and update in real time.

## Capabilities and Constraints

- Events each own their candidate days, daily hour range, availability grid, and replies.
- Classmates pick their name from the fixed roster, then paint free half-hour blocks, erase them, and view group results.
- Switching names loads that person's saved times and never deletes another classmate's reply.
- Replies view supports search, filter, and sort; the results view surfaces top slots and who has not replied.
- PM actions: create, rename, and delete events, set candidate days and hour range, and edit the timeline in the Supabase dashboard; read all results; copy a GC summary.
- Access is anonymous through Supabase. The app can read events, candidate days, and timeline but cannot change them; only availability is writable. RLS and explicit grants enforce this in the database.
- Built as a Vue 3 + Vite single-page app with Supabase as the backend.

## Brand Commitments

Product name: AquaSci 1. The outreach is referred to as HKK outreach. The class roster is fixed at 25 names.

## Evidence on Hand

- Roster: `src/data/roster.js` (25 classmates).
- Milestones and project facts: `src/components/CalendarCard.vue`, `TimelineCard.vue`, `NoteCard.vue`.
- Prototype: `prototype.html`.
- Mascot images: `assets/` (10 hamster images).
- Venue and exact activity date are undecided; do not invent them.

## Product Principles

1. Answering takes under a minute: no account, no password, just pick your name and paint.
2. Every event is sealed: its days, hours, grid, and replies never leak into another event.
3. Show the decision, not the raw data: lead with the winning slots, coverage, and who is missing.
4. Your name owns your reply: changing names or tools never destroys someone else's times.
5. Keep the class context beside the poll: timeline, project facts, and reply status stay visible while deciding.
