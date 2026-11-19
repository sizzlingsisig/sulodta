<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import Hamster from './Hamster.vue'
import { ROSTER } from '../data/roster'
import { fmt, slotLabel, todayISO } from '../lib/dates'

const props = defineProps({
  event: { type: Object, default: null },
  daysCount: { type: Number, default: 0 },
  timeline: { type: Array, default: () => [] },
  me: { type: String, default: '' },
  myBlocks: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },
  bestSlot: { type: Object, default: null },
})

const next = computed(
  () =>
    props.timeline
      .filter((entry) => entry.day && entry.day >= todayISO())
      .sort((a, b) => a.day.localeCompare(b.day))[0] ?? null,
)

const nextLabel = computed(() => {
  if (!next.value) return 'none ahead'
  return `${fmt(next.value.day).md} · ${next.value.text}`
})

const bestLabel = computed(() => {
  if (!props.bestSlot) return '—'
  const day = fmt(props.bestSlot.day)
  return `${day.dow} ${day.md} · ${slotLabel(props.bestSlot.slot)} (${props.bestSlot.count})`
})

const mood = computed(() => {
  if (props.repliesCount === 0) return { kind: 0, label: 'concerned' }
  if (props.repliesCount === ROSTER.length) return { kind: 2, label: 'EVERYONE replied!!' }
  if (props.bestSlot && props.bestSlot.count === props.repliesCount && props.repliesCount > 1) {
    return { kind: 5, label: 'best slot is unanimous ♥' }
  }
  return { kind: 1, label: `${props.repliesCount} of ${ROSTER.length} in — hopeful` }
})

const wiggle = ref(false)
let wiggleTimer = null

watch(
  () => mood.value.kind,
  () => {
    clearTimeout(wiggleTimer)
    wiggle.value = false
    requestAnimationFrame(() => {
      wiggle.value = true
      wiggleTimer = setTimeout(() => {
        wiggle.value = false
      }, 600)
    })
  },
)

onUnmounted(() => clearTimeout(wiggleTimer))
</script>

<template>
  <section class="card a-status" style="--rot: -0.9deg; --d: 0.24s">
    <h2>Status &amp; morale</h2>
    <div class="statusgrid">
      <div class="mascot" :class="{ wiggle }">
        <Hamster :kind="mood.kind" :height="104" />
      </div>
      <ul class="stats">
        <li><span>Event</span><span>{{ event?.name || '—' }}</span></li>
        <li><span>Candidate days</span><span>{{ daysCount }}</span></li>
        <li><span>Replies</span><span>{{ repliesCount }} / {{ ROSTER.length }}</span></li>
        <li><span>Best slot</span><span>{{ bestLabel }}</span></li>
        <li><span>Next deadline</span><span>{{ nextLabel }}</span></li>
        <li><span>Your blocks</span><span>{{ me ? myBlocks : 'pick a name' }}</span></li>
      </ul>
    </div>
    <p class="cap c">morale officer · {{ mood.label }}</p>
  </section>
</template>
