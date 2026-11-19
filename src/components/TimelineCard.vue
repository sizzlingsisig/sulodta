<script setup>
import { fmt } from '../lib/dates'

defineProps({
  entries: { type: Array, default: () => [] },
})
</script>

<template>
  <section class="card a-timeline" style="--rot: -0.5deg; --d: 0.15s">
    <h2>Timeline</h2>
    <ul class="tl">
      <li v-for="t in entries" :key="t.id" class="tlrow">
        <span class="tld">{{ t.day ? fmt(t.day).md : 'TBA' }}</span>
        <span class="tlt">{{ t.text }}</span>
      </li>
    </ul>
    <p v-if="!entries.length" class="lbempty">No timeline entries yet.</p>
    <p class="cap">
      Managed by the PM. Dated entries appear as
      <b style="color: var(--danger)">●</b> on the calendar. Blank dates show as TBA.
    </p>
  </section>
</template>
