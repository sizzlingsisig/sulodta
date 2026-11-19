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
  const firstDay = new Date(y, m, 1).getDay()
  const currentCount = new Date(y, m + 1, 0).getDate()
  const out = []

  // Trailing days from previous month
  if (firstDay > 0) {
    const prevDate = new Date(y, m, 0)
    const prevCount = prevDate.getDate()
    const prevY = prevDate.getFullYear()
    const prevM = prevDate.getMonth()
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevCount - i
      const key = iso(prevY, prevM, d)
      out.push({
        outside: true,
        key,
        day: d,
        on: props.days.has(key),
        past: key < TODAY,
        today: key === TODAY,
        ms: milestones.value[key],
      })
    }
  }

  // Days in current month
  for (let d = 1; d <= currentCount; d++) {
    const key = iso(y, m, d)
    out.push({
      outside: false,
      key,
      day: d,
      on: props.days.has(key),
      past: key < TODAY,
      today: key === TODAY,
      ms: milestones.value[key],
    })
  }

  // Leading days from next month to complete the week through Saturday
  const lastWeekday = new Date(y, m, currentCount).getDay()
  if (lastWeekday < 6) {
    const nextDate = new Date(y, m + 1, 1)
    const nextY = nextDate.getFullYear()
    const nextM = nextDate.getMonth()
    const daysToAdd = 6 - lastWeekday
    for (let d = 1; d <= daysToAdd; d++) {
      const key = iso(nextY, nextM, d)
      out.push({
        outside: true,
        key,
        day: d,
        on: props.days.has(key),
        past: key < TODAY,
        today: key === TODAY,
        ms: milestones.value[key],
      })
    }
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
        :class="{ on: c.on, past: c.past, today: c.today, ms: c.ms, outside: c.outside }"
        :title="c.ms || (c.on ? 'Candidate day' : '')"
        :aria-label="
          `${c.key}${c.outside ? ', outside month' : ''}${c.on ? ', candidate day' : ''}${c.ms ? `, deadline: ${c.ms}` : ''}`
        "
      >
        {{ c.day }}
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
        <b>These are the candidate days</b> picked by the PM — each one becomes a column
        in the grid. Use <b>‹ ›</b> to move between months. <b style="color: var(--green-ink)">Green</b>
        = candidate day · <b style="color: var(--danger-ink)">●</b> = a timeline deadline ·
        <b style="color: var(--teal-deep)">ring</b> = today · past days are locked.
      </span>
    </div>
    <p class="hoursline">
      <b>Grid hours</b> {{ slotLabel(startHour) }} – {{ slotLabel(endHour) }}
      <span>· half-hour rows</span>
    </p>
    <p class="cap">Days and hours are managed by the PM.</p>
  </section>
</template>
