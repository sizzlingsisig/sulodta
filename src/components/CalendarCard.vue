<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, CalendarDays } from '@lucide/vue'
import { iso, MNAMES, parse, slotLabel, todayISO } from '../lib/dates'

const props = defineProps({
  days: { type: Set, default: () => new Set() },
  timeline: { type: Array, default: () => [] },
  startHour: { type: Number, default: 8 },
  endHour: { type: Number, default: 18 },
  eventId: { type: String, default: '' },
  eventName: { type: String, default: '' },
})

const TODAY = todayISO()

const milestones = computed(() =>
  Object.fromEntries(
    props.timeline.filter((entry) => entry.day).map((entry) => [entry.day, entry.text]),
  ),
)

function monthOfFirstDay() {
  const first = [...props.days].sort()[0]
  const date = first ? parse(first) : new Date(2026, 11, 1)
  return { y: date.getFullYear(), m: date.getMonth() }
}

const view = ref(monthOfFirstDay())
const dir = ref(0)

watch(
  () => props.eventId,
  () => {
    view.value = monthOfFirstDay()
    dir.value = 0
  },
)

const title = computed(() => `${MNAMES[view.value.m]} ${view.value.y}`)

const cells = computed(() => {
  const { y, m } = view.value
  const first = new Date(y, m, 1).getDay()
  const count = new Date(y, m + 1, 0).getDate()
  const out = []
  for (let i = 0; i < first; i++) out.push({ blank: true, key: `blank-${i}` })
  for (let d = 1; d <= count; d++) {
    const key = iso(y, m, d)
    out.push({
      blank: false,
      key,
      day: d,
      on: props.days.has(key),
      past: key < TODAY,
      today: key === TODAY,
      ms: milestones.value[key],
    })
  }
  return out
})

function move(step) {
  let { y, m } = view.value
  m += step
  if (m < 0) {
    m = 11
    y--
  }
  if (m > 11) {
    m = 0
    y++
  }
  view.value = { y, m }
  dir.value = step
  setTimeout(() => (dir.value = 0), 300)
}
</script>

<template>
  <section class="card a-cal" style="--rot: 0.4deg; --d: 0.09s">
    <h2>Candidate days</h2>
    <div class="calhead">
      <button class="mini nav" aria-label="Previous month" title="Previous month" @click="move(-1)">
        <ChevronLeft />
      </button>
      <h3 aria-live="polite">{{ title }}</h3>
      <button class="mini nav" aria-label="Next month" title="Next month" @click="move(1)">
        <ChevronRight />
      </button>
    </div>
    <div class="dows">
      <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
    </div>
    <div class="days" :class="{ anim: dir !== 0 }" :style="{ '--dir': dir }">
      <span
        v-for="c in cells"
        :key="c.key"
        class="day"
        :class="{ on: c.on, past: c.past, today: c.today, ms: c.ms, blank: c.blank }"
        :title="c.blank ? undefined : c.ms || (c.on ? 'Candidate day' : '')"
        :aria-label="
          c.blank
            ? undefined
            : `${c.key}${c.on ? ', candidate day' : ''}${c.ms ? `, deadline: ${c.ms}` : ''}`
        "
        :aria-hidden="c.blank || undefined"
      >
        {{ c.blank ? '' : c.day }}
      </span>
    </div>
    <p class="calcount">
      <b>{{ days.size }}</b> candidate day{{ days.size === 1 ? '' : 's' }} picked<span
        v-if="eventName"
      >
        for “{{ eventName }}”</span
      >
    </p>
    <div class="guide">
      <CalendarDays />
      <span>
        <b>These are the candidate days</b> picked by the PM in Supabase — each one becomes a column
        in the grid. Use <b>‹ ›</b> to move between months. <b style="color: var(--green-ink)">Green</b>
        = candidate day · <b style="color: var(--danger-ink)">●</b> = a timeline deadline ·
        <b style="color: var(--teal-deep)">ring</b> = today · past days are locked.
      </span>
    </div>
    <p class="hoursline">
      <b>Grid hours</b> {{ slotLabel(startHour) }} – {{ slotLabel(endHour) }}
      <span>· half-hour rows</span>
    </p>
    <p class="cap">Days and hours are managed by the PM in Supabase.</p>
  </section>
</template>
