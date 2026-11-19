<script setup>
import { computed, ref, watch } from 'vue'
import { ClipboardList } from '@lucide/vue'
import Hamster from './Hamster.vue'
import { ROSTER } from '../data/roster'
import { fmt, slotLabel } from '../lib/dates'
import { toast } from '../composables/useToast'

const props = defineProps({
  replies: { type: Object, default: () => ({}) },
  selectedSlot: { type: String, default: '' },
  ranked: { type: Array, default: () => [] },
  responded: { type: Number, default: 0 },
  eventName: { type: String, default: '' },
})

const emit = defineEmits(['select', 'clear-selection'])

const q = ref('')
const filter = ref('all')
const sort = ref('az')

const selected = computed(() => {
  if (!props.selectedSlot) return null
  const [day, slot] = props.selectedSlot.split('|')
  return { day, slot: Number(slot) }
})

const mode = computed(() => (selected.value ? 'slot' : 'roster'))

const freeCount = computed(() => {
  if (!selected.value) return 0
  const key = `${selected.value.day}|${selected.value.slot}`
  return ROSTER.filter((name) => props.replies[name]?.has(key)).length
})

const filterOptions = computed(() =>
  mode.value === 'slot'
    ? [
        { value: 'all', label: 'Everyone' },
        { value: 'yes', label: 'Free' },
        { value: 'no', label: 'Busy' },
      ]
    : [
        { value: 'all', label: 'Everyone' },
        { value: 'yes', label: 'Replied' },
        { value: 'no', label: 'Waiting' },
      ],
)

const sortOptions = computed(() =>
  mode.value === 'slot'
    ? [
        { value: 'az', label: 'A–Z' },
        { value: 'yes', label: 'Free first' },
        { value: 'no', label: 'Busy first' },
      ]
    : [
        { value: 'az', label: 'A–Z' },
        { value: 'yes', label: 'Replied first' },
        { value: 'no', label: 'Waiting first' },
      ],
)

watch(mode, () => {
  filter.value = 'all'
  sort.value = 'az'
})

const isClassmateUnavailable = (name) => {
  const set = props.replies[name]
  if (!set || !set.size) return false
  for (const k of set) {
    if (k.endsWith('|-1')) return true
  }
  return false
}

const unavailableCount = computed(
  () => ROSTER.filter((name) => isClassmateUnavailable(name)).length,
)

const people = computed(() => {
  const key = props.selectedSlot
  let list = ROSTER.map((name) => {
    const unavailable = isClassmateUnavailable(name)
    const set = props.replies[name]
    const hasSlot = key ? (set?.has(key) ?? false) : false
    const hasReplied = (set?.size ?? 0) > 0
    return {
      name,
      ok: key ? hasSlot : hasReplied,
      unavailable,
    }
  })

  const needle = q.value.trim().toLowerCase()
  if (needle) list = list.filter((person) => person.name.toLowerCase().includes(needle))
  if (filter.value !== 'all') {
    const wanted = filter.value === 'yes'
    list = list.filter((person) => person.ok === wanted)
  }

  list.sort((a, b) => {
    if (sort.value === 'yes') return Number(b.ok) - Number(a.ok) || a.name.localeCompare(b.name)
    if (sort.value === 'no') return Number(a.ok) - Number(b.ok) || a.name.localeCompare(b.name)
    return a.name.localeCompare(b.name)
  })
  return list
})

const progress = computed(() => Math.round((props.responded / ROSTER.length) * 100))

const mood = computed(() => {
  if (selected.value) {
    return freeCount.value === props.responded && props.responded > 1
      ? { kind: 5, cap: 'everyone is free at this slot ♥' }
      : { kind: 1, cap: `${freeCount.value} free at the selected slot` }
  }
  if (props.responded === 0) return { kind: 0, cap: 'no replies yet… concerned' }
  if (props.responded === ROSTER.length) return { kind: 2, cap: 'EVERYONE replied!!' }
  return { kind: 1, cap: `${props.responded} of ${ROSTER.length} in — hopeful` }
})

const top = computed(() => props.ranked.slice(0, 5))

const selectedLabel = computed(() =>
  selected.value
    ? `${fmt(selected.value.day).dow}, ${fmt(selected.value.day).md} · ${slotLabel(selected.value.slot)}`
    : '',
)

function pick(row) {
  emit('select', { day: row.day, slot: row.slot })
}

async function copySummary() {
  const topText =
    props.ranked
      .slice(0, 3)
      .map(
        (x, i) =>
          `${i + 1}. ${fmt(x.day).dow} ${fmt(x.day).md}, ${slotLabel(x.slot)} — ${x.count} free`,
      )
      .join('\n') || '(no times painted yet)'
  const waiting = ROSTER.length - props.responded
  const availableCount = Math.max(0, props.responded - unavailableCount.value)
  const breakdown =
    unavailableCount.value > 0
      ? ` (${availableCount} available, ${unavailableCount.value} can’t attend)`
      : ''
  const text = `AquaSci 1 — ${props.eventName || 'HKK Outreach'}\n${props.responded}/${ROSTER.length} replied${breakdown}\n\nTop slots:\n${topText}\n\nStill waiting on: ${waiting} classmate${waiting === 1 ? '' : 's'}\n\nAdd your times: ${location.href}`

  try {
    if (!navigator.clipboard) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    toast('Summary copied — paste sa GC!', { kind: 9 })
  } catch {
    toast('Couldn’t copy on this browser', { kind: 8 })
  }
}
</script>

<template>
  <section class="card a-replies" style="--rot: 0.2deg; --d: 0.12s">
    <div class="rhead">
      <h2>Replies</h2>
      <div class="rtools">
        <input
          id="rSearch"
          v-model="q"
          type="search"
          placeholder="Search classmates…"
          aria-label="Search classmates"
        />
        <select v-model="filter" aria-label="Filter classmates">
          <option v-for="option in filterOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="sort" aria-label="Sort classmates">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          class="pill"
          title="Copy a text summary for the group chat"
          @click="copySummary"
        >
          <ClipboardList />GC summary
        </button>
      </div>
    </div>
    <div class="lb">
      <h3>Top slots so far</h3>
      <button
        v-for="(row, index) in top"
        :key="`${row.day}|${row.slot}`"
        class="lbrow"
        :class="{ on: selectedSlot === `${row.day}|${row.slot}` }"
        @click="pick(row)"
      >
        <span class="rk">{{ index + 1 }}</span>
        <span>{{ fmt(row.day).dow }} {{ fmt(row.day).md }} · {{ slotLabel(row.slot) }}</span>
        <span class="lbb">
          <i :style="{ width: `${responded ? Math.round((row.count / responded) * 100) : 0}%` }" />
        </span>
        <span class="ct">{{ row.count }}/{{ responded }}</span>
      </button>
      <p v-if="!top.length" class="lbempty">
        Nothing painted yet. Pick your name and paint on the grid — the leaderboard fills in as
        classmates reply.
      </p>
    </div>
    <div class="rgrid">
      <div class="mascot">
        <Hamster :kind="mood.kind" :height="88" />
        <p class="cap c">{{ mood.cap }}</p>
      </div>
      <div class="rcol">
        <p v-if="selected" class="selline">
          <b>{{ selectedLabel }}</b>
          <span>
            {{ freeCount }} free · {{ responded - freeCount }} busy ·
            {{ ROSTER.length - responded }} not replied
          </span>
          <button class="pill" type="button" @click="$emit('clear-selection')">clear</button>
        </p>
        <p v-else class="selline muted">
          Click any box in the grid above — or a row in the leaderboard — to see who’s free.
        </p>
        <p class="rprogress">
          <b>{{ responded }}</b> of {{ ROSTER.length }} classmates have added times
        </p>
        <div class="bar"><i :style="{ width: `${progress}%` }" /></div>
        <ul class="chips" role="list">
          <li
            v-for="person in people"
            :key="person.name"
            class="chip"
            :class="{ ok: person.ok, unavail: person.unavailable }"
          >
            <span class="dot" />{{ person.name }}
            <span v-if="person.unavailable" class="tag-unavail"> (can’t attend)</span>
            <span v-else-if="person.ok"> ✓</span>
          </li>
          <li v-if="!people.length" class="cap">
            {{ q ? `no matches for “${q}”` : 'nobody in this filter yet' }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
