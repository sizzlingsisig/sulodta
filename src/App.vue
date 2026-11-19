<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RefreshCw, X } from '@lucide/vue'
import RoughDefs from './components/RoughDefs.vue'
import TopBar from './components/TopBar.vue'
import ToastHost from './components/ToastHost.vue'
import EventBar from './components/EventBar.vue'
import PaintCard from './components/PaintCard.vue'
import RepliesCard from './components/RepliesCard.vue'
import CalendarCard from './components/CalendarCard.vue'
import TimelineCard from './components/TimelineCard.vue'
import NoteCard from './components/NoteCard.vue'
import StatusCard from './components/StatusCard.vue'
import { ROSTER } from './data/roster'
import { toast } from './composables/useToast'
import { isSupabaseConfigured } from './lib/supabase'
import {
  loadPlanner,
  loadAvailability,
  addBlocks,
  removeBlocks,
  clearBlocks,
  subscribeToChanges,
  plannerErrorMessage,
} from './lib/api'

const tool = ref('draw')
const loading = ref(true)
const loadError = ref('')
const events = ref([])
const timeline = ref([])
const activeEventId = ref('')
const reloadTick = ref(0)

const me = ref(readSavedName())
const replies = ref(emptyReplies())
const savedMine = ref(new Set())
const repliesLoading = ref(false)
const repliesError = ref('')
const saving = ref(false)
const selectedSlot = ref('')
const painting = ref(false)

let repliesRequest = 0
let committing = false
let commitAgain = false
let repliesTimer = null
let plannerTimer = null
let unsubscribeLive = null

const activeEvent = computed(
  () => events.value.find((event) => event.id === activeEventId.value) ?? events.value[0] ?? null,
)
const days = computed(() => activeEvent.value?.days ?? new Set())
const startHour = computed(() => activeEvent.value?.startHour ?? 8)
const endHour = computed(() => activeEvent.value?.endHour ?? 18)
const myBlocks = computed(() => (me.value ? (replies.value[me.value]?.size ?? 0) : 0))
const repliedCount = computed(
  () => Object.values(replies.value).filter((blocks) => blocks.size > 0).length,
)

const slotList = computed(() => {
  const out = []
  for (let h = startHour.value; h < endHour.value; h += 0.5) out.push(h)
  return out
})

const rankedSlots = computed(() => {
  const names = Object.keys(replies.value)
  const out = []
  for (const day of [...days.value].sort()) {
    for (const slot of slotList.value) {
      const key = `${day}|${slot}`
      const count = names.reduce(
        (total, name) => total + (replies.value[name]?.has(key) ? 1 : 0),
        0,
      )
      if (count) out.push({ day, slot, count })
    }
  }
  return out.sort(
    (a, b) => b.count - a.count || a.day.localeCompare(b.day) || a.slot - b.slot,
  )
})

const bestSlot = computed(() => rankedSlots.value[0] ?? null)

function readSavedName() {
  try {
    const saved = localStorage.getItem('aquasci-me')
    return ROSTER.includes(saved) ? saved : ''
  } catch {
    return ''
  }
}

function emptyReplies() {
  return Object.fromEntries(ROSTER.map((name) => [name, new Set()]))
}

function syncEventUrl(id) {
  if (!id) return
  const url = new URL(location.href)
  if (url.searchParams.get('event') === id) return
  url.searchParams.set('event', id)
  history.replaceState(null, '', url)
}

function selectSlot({ day, slot }) {
  selectedSlot.value = `${day}|${slot}`
  tool.value = 'group'
}

function clearSelection() {
  selectedSlot.value = ''
}

async function share() {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard')
    await navigator.clipboard.writeText(location.href)
    toast('Link copied — send it to the class', { kind: 9 })
  } catch {
    toast('Copy the address bar to share', { kind: 8 })
  }
}

async function load() {
  if (saving.value) {
    toast('Hold on — still saving your times', { kind: 8 })
    return
  }

  loading.value = true
  loadError.value = ''

  if (!isSupabaseConfigured) {
    loadError.value =
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.'
    loading.value = false
    return
  }

  try {
    const previousId = activeEventId.value
    const data = await loadPlanner()
    events.value = data.events
    timeline.value = data.timeline

    const wanted = new URLSearchParams(location.search).get('event')
    if (wanted && events.value.some((event) => event.id === wanted)) {
      activeEventId.value = wanted
    } else if (!events.value.some((event) => event.id === activeEventId.value)) {
      activeEventId.value = events.value[0]?.id ?? ''
    }
    syncEventUrl(activeEventId.value)

    if (!events.value.length) {
      loadError.value =
        'Connected to Supabase, but there are no events yet. Run supabase/seed.sql to add the HKK event.'
    } else if (activeEventId.value === previousId) {
      // Same event after a refresh: reload its replies without blanking the grid.
      reloadTick.value += 1
    }
  } catch (error) {
    loadError.value = plannerErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function scheduleRepliesReload() {
  clearTimeout(repliesTimer)
  repliesTimer = setTimeout(() => {
    if (saving.value || painting.value) {
      scheduleRepliesReload()
      return
    }
    loadReplies()
  }, 450)
}

function schedulePlannerRefresh() {
  clearTimeout(plannerTimer)
  plannerTimer = setTimeout(refreshPlanner, 450)
}

async function refreshPlanner() {
  if (saving.value) {
    schedulePlannerRefresh()
    return
  }
  try {
    const previousId = activeEventId.value
    const data = await loadPlanner()
    events.value = data.events
    timeline.value = data.timeline
    if (!events.value.some((event) => event.id === activeEventId.value)) {
      activeEventId.value = events.value[0]?.id ?? ''
    }
    if (activeEventId.value === previousId) reloadTick.value += 1
  } catch {
    /* Keep the current data; the manual refresh button surfaces errors. */
  }
}

async function loadReplies() {
  if (saving.value || painting.value) {
    scheduleRepliesReload()
    return
  }

  const eventId = activeEvent.value?.id
  if (!eventId) {
    replies.value = emptyReplies()
    savedMine.value = new Set()
    return
  }
  const request = ++repliesRequest
  repliesLoading.value = true
  repliesError.value = ''

  try {
    const rows = await loadAvailability(eventId)
    if (request !== repliesRequest) return

    const next = emptyReplies()
    for (const row of rows) {
      if (!next[row.classmate]) continue
      next[row.classmate].add(`${row.day}|${Number(row.slot)}`)
    }

    replies.value = next
    savedMine.value = new Set(me.value ? next[me.value] : [])
  } catch (error) {
    if (request !== repliesRequest) return
    repliesError.value = plannerErrorMessage(error)
  } finally {
    if (request === repliesRequest) repliesLoading.value = false
  }
}

function toggleBlock({ day, slot, on }) {
  const name = me.value
  if (!name) return

  const current = replies.value[name] ?? new Set()
  const key = `${day}|${slot}`
  if (current.has(key) === on) return

  const next = new Set(current)
  if (on) next.add(key)
  else next.delete(key)
  replies.value = { ...replies.value, [name]: next }
}

async function commit() {
  if (committing) {
    commitAgain = true
    return
  }

  committing = true
  saving.value = true
  try {
    do {
      commitAgain = false
      await commitOnce()
    } while (commitAgain)
  } finally {
    committing = false
    saving.value = false
  }
}

async function commitOnce() {
  const eventId = activeEvent.value?.id
  const name = me.value
  if (!eventId || !name) return

  const mine = replies.value[name] ?? new Set()
  const saved = savedMine.value
  const toAdd = [...mine].filter((key) => !saved.has(key))
  const toRemove = [...saved].filter((key) => !mine.has(key))
  if (!toAdd.length && !toRemove.length) return

  const snapshot = new Set(mine)

  try {
    if (toAdd.length) await addBlocks(eventId, name, toAdd)
    if (toRemove.length) await removeBlocks(eventId, name, toRemove)
    if (me.value === name && activeEvent.value?.id === eventId) savedMine.value = snapshot
  } catch (error) {
    if (activeEvent.value?.id === eventId) {
      replies.value = { ...replies.value, [name]: new Set(saved) }
    }
    if (me.value === name && activeEvent.value?.id === eventId) {
      toast(plannerErrorMessage(error), { kind: 8 })
    }
  }
}

async function clearMine() {
  const eventId = activeEvent.value?.id
  const name = me.value
  if (!name) {
    toast('Pick your name first', { kind: 8 })
    return
  }
  if (!eventId) return
  if (saving.value) {
    toast('Hold on — still saving', { kind: 8 })
    return
  }

  const before = new Set(replies.value[name] ?? [])
  if (!before.size) {
    toast('Nothing painted yet', { kind: 3 })
    return
  }

  replies.value = { ...replies.value, [name]: new Set() }
  saving.value = true
  try {
    await clearBlocks(eventId, name)
    if (me.value === name && activeEvent.value?.id === eventId) savedMine.value = new Set()
    toast('Your times were cleared', { kind: 6 })
  } catch (error) {
    if (activeEvent.value?.id === eventId) {
      replies.value = { ...replies.value, [name]: before }
    }
    toast(plannerErrorMessage(error), { kind: 8 })
  } finally {
    saving.value = false
  }
}

watch(
  () => activeEvent.value?.id,
  () => {
    replies.value = emptyReplies()
    savedMine.value = new Set()
    selectedSlot.value = ''
    painting.value = false
    if (activeEvent.value?.id) loadReplies()
  },
)

watch(activeEventId, (id) => syncEventUrl(id))

watch([days, startHour, endHour], () => {
  if (!selectedSlot.value) return
  const [day, slot] = selectedSlot.value.split('|')
  if (
    !days.value.has(day) ||
    Number(slot) < startHour.value ||
    Number(slot) >= endHour.value
  ) {
    selectedSlot.value = ''
  }
})

watch(reloadTick, () => {
  if (activeEvent.value?.id) loadReplies()
})

watch(me, (name) => {
  try {
    if (name) localStorage.setItem('aquasci-me', name)
    else localStorage.removeItem('aquasci-me')
  } catch {
    /* localStorage can be unavailable in private mode */
  }

  savedMine.value = new Set(name ? (replies.value[name] ?? []) : [])
  if (!name) return

  const count = savedMine.value.size
  toast(
    count
      ? `Now painting as ${name} — ${count} saved block${count === 1 ? '' : 's'}`
      : `Fresh grid for ${name} — nothing painted yet`,
    { kind: count ? 1 : 3 },
  )
})

const HINTS = {
  draw: 'Paint: drag to mark free · right-drag erases · keys 1 / 2 / 3 switch tools',
  erase: 'Erase: drag to rub out times',
  group: 'Results: click a box or a leaderboard row · red outline = best slot',
}
const TOUCH_HINTS = {
  draw: 'Tap a box to mark or unmark it · open Results to see who’s free',
  erase: 'Tap a box to rub out that time',
  group: 'Tap a box or a leaderboard row · red outline = best slot',
}
const isTouch = ref(false)
const showHint = ref(true)
const hintbar = computed(() => (isTouch.value ? TOUCH_HINTS[tool.value] : HINTS[tool.value]))

function dismissHint() {
  showHint.value = false
  try {
    sessionStorage.setItem('aquasci-hint-dismissed', '1')
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
}

function onKey(e) {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return
  const next = { 1: 'draw', 2: 'erase', 3: 'group' }[e.key]
  if (next) tool.value = next
}

function onPaintStart() {
  painting.value = true
}

function onPaintEnd() {
  painting.value = false
}

onMounted(() => {
  addEventListener('keydown', onKey)
  isTouch.value = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  try {
    if (sessionStorage.getItem('aquasci-hint-dismissed') === '1') showHint.value = false
  } catch {
    /* sessionStorage can be unavailable in private mode */
  }
  load()
  unsubscribeLive = subscribeToChanges({
    availability: (payload) => {
      const eventId = payload.new?.event_id ?? payload.old?.event_id
      const classmate = payload.new?.classmate ?? payload.old?.classmate
      if (eventId !== activeEvent.value?.id) return
      if (classmate && classmate === me.value) return
      scheduleRepliesReload()
    },
    planner: schedulePlannerRefresh,
  })
})
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  unsubscribeLive?.()
  clearTimeout(repliesTimer)
  clearTimeout(plannerTimer)
})
</script>

<template>
  <RoughDefs />
  <TopBar v-if="!loading && !loadError" v-model:tool="tool" @share="share" />
  <main class="canvas" :class="{ 'is-setup': loading || loadError }">
    <EventBar
      v-if="!loading && !loadError"
      v-model:active-id="activeEventId"
      :events="events"
      :loading="loading"
      @refresh="load"
    />

    <section v-if="loading" class="card setup-card" style="--rot: 0deg; --d: 0s">
      <p class="setup-brand">AquaSci 1 · HKK outreach</p>
      <h2>Loading the schedule…</h2>
      <p class="cap">Fetching events, candidate days and the timeline.</p>
    </section>

    <section v-else-if="loadError" class="card setup-card" style="--rot: 0deg; --d: 0s">
      <p class="setup-brand">AquaSci 1 · HKK outreach</p>
      <h2>The schedule didn’t load</h2>
      <p class="lead">
        Check your connection, then try again. If it still fails, send this screen to your PM.
      </p>
      <div class="tools">
        <button class="pill primary" @click="load"><RefreshCw />Retry</button>
      </div>
      <details class="pm-setup">
        <summary>For the PM: setup &amp; technical details</summary>
        <p class="detail">{{ loadError }}</p>
        <ol v-if="isSupabaseConfigured" class="setup-steps">
          <li>Open your Supabase project → <b>SQL Editor</b>.</li>
          <li>Paste <code>supabase/schema.sql</code> and press <b>Run</b>.</li>
          <li>Open a new query, paste <code>supabase/seed.sql</code>, press <b>Run</b>.</li>
          <li>Come back here and press <b>Retry</b>.</li>
        </ol>
        <p v-else class="cap">
          After adding the two values to <code>.env</code>, restart <code>npm run dev</code>, then
          press <b>Retry</b>.
        </p>
      </details>
    </section>

    <div v-else class="workspace">
      <div class="stack">
        <PaintCard
          v-model:me="me"
          :days="days"
          :tool="tool"
          :start-hour="startHour"
          :end-hour="endHour"
          :replies="replies"
          :saving="saving"
          :loading="repliesLoading"
          :error="repliesError"
          :responded="repliedCount"
          :best-slot="bestSlot"
          :selected-slot="selectedSlot"
          @toggle="toggleBlock"
          @commit="commit"
          @retry="loadReplies"
          @select="selectSlot"
          @clear="clearMine"
          @clear-selection="clearSelection"
          @paint-start="onPaintStart"
          @paint-end="onPaintEnd"
        />
        <RepliesCard
          :replies="replies"
          :selected-slot="selectedSlot"
          :ranked="rankedSlots"
          :responded="repliedCount"
          :event-name="activeEvent?.name ?? ''"
          @select="selectSlot"
          @clear-selection="clearSelection"
        />
      </div>
      <aside class="rail">
        <CalendarCard
          :days="days"
          :timeline="timeline"
          :start-hour="startHour"
          :end-hour="endHour"
          :event-id="activeEvent?.id ?? ''"
          :event-name="activeEvent?.name ?? ''"
        />
        <TimelineCard :entries="timeline" />
        <NoteCard />
        <StatusCard
          :event="activeEvent"
          :days-count="days.size"
          :timeline="timeline"
          :me="me"
          :my-blocks="myBlocks"
          :replies-count="repliedCount"
          :best-slot="bestSlot"
        />
      </aside>
    </div>
  </main>
  <div v-if="!loading && !loadError && showHint" class="hintbar">
    <span>{{ hintbar }}</span>
    <button
      class="hintx"
      type="button"
      title="Dismiss hint"
      aria-label="Dismiss hint"
      @click="dismissHint"
    >
      <X />
    </button>
  </div>
  <ToastHost />
</template>
