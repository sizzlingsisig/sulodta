import { supabase } from './supabase'

/**
 * Loads the planner's read-only reference data:
 * events, their candidate days, and the shared timeline.
 *
 * Availability is loaded separately when the grid becomes live in step 4.
 */
export async function loadPlanner() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.',
    )
  }

  const [eventsRes, daysRes, timelineRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, start_hour, end_hour, created_at')
      .order('created_at', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('event_days').select('event_id, day').order('day', { ascending: true }),
    supabase.from('timeline').select('id, day, text').order('day', { ascending: true }),
  ])

  for (const res of [eventsRes, daysRes, timelineRes]) {
    if (res.error) throw res.error
  }

  const daysByEvent = new Map()
  for (const row of daysRes.data ?? []) {
    if (!daysByEvent.has(row.event_id)) daysByEvent.set(row.event_id, new Set())
    daysByEvent.get(row.event_id).add(row.day)
  }

  return {
    events: (eventsRes.data ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      startHour: Number(event.start_hour),
      endHour: Number(event.end_hour),
      days: daysByEvent.get(event.id) ?? new Set(),
    })),
    timeline: (timelineRes.data ?? []).map((entry) => ({
      id: entry.id,
      day: entry.day ?? '',
      text: entry.text,
    })),
  }
}

/**
 * Loads every saved block for one event. Returns raw rows:
 * `{ classmate, day, slot }`.
 */
export async function loadAvailability(eventId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('availability')
    .select('classmate, day, slot')
    .eq('event_id', eventId)
  if (error) throw error
  return data ?? []
}

/**
 * Inserts painted blocks. A plain batch insert keeps the request count low;
 * if a row already exists (23505) the batch is retried row by row and the
 * duplicates are ignored.
 */
export async function addBlocks(eventId, classmate, keys) {
  if (!keys.length) return
  if (!supabase) throw new Error('Supabase is not configured.')

  const rows = keys.map((key) => {
    const [day, slot] = key.split('|')
    return { event_id: eventId, classmate, day, slot: Number(slot) }
  })

  const { error } = await supabase.from('availability').insert(rows)
  if (!error) return
  if (error.code !== '23505') throw error

  const retries = await Promise.all(
    rows.map((row) => supabase.from('availability').insert(row)),
  )
  const realError = retries.find((result) => result.error && result.error.code !== '23505')
  if (realError) throw realError.error
}

/**
 * Deletes painted blocks by (day, slot) pairs, chunked to keep the PostgREST
 * filter URL short.
 */
export async function removeBlocks(eventId, classmate, keys) {
  if (!keys.length) return
  if (!supabase) throw new Error('Supabase is not configured.')

  for (let i = 0; i < keys.length; i += 25) {
    const filter = keys
      .slice(i, i + 25)
      .map((key) => {
        const [day, slot] = key.split('|')
        return `and(day.eq.${day},slot.eq.${slot})`
      })
      .join(',')

    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('event_id', eventId)
      .eq('classmate', classmate)
      .or(filter)
    if (error) throw error
  }
}

/** Deletes every block one classmate saved for one event. */
export async function clearBlocks(eventId, classmate) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('event_id', eventId)
    .eq('classmate', classmate)
  if (error) throw error
}

/**
 * Subscribes to live availability and planner changes.
 * Returns an unsubscribe function.
 */
export function subscribeToChanges({ availability, planner } = {}) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('aquasci-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'availability' },
      (payload) => availability?.(payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      () => planner?.(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_days' },
      () => planner?.(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timeline' },
      () => planner?.(),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('AquaSci live updates are unavailable; manual refresh still works.')
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}

export function plannerErrorMessage(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? error ?? '')

  if (code === 'PGRST205' || code === '42P01' || /schema cache/i.test(message)) {
    return 'The schedule database is not initialized yet. Please contact your PM.'
  }

  if (code === '42501' || /permission denied/i.test(message)) {
    return 'Database permissions need updating. Please contact your PM.'
  }

  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return 'Could not reach the server. Check your internet connection and try again.'
  }

  return message || 'Could not load the schedule. Please try again.'
}
