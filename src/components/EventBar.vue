<script setup>
import { Database, Info, RefreshCw } from '@lucide/vue'

defineProps({
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['refresh'])

const activeId = defineModel('activeId', { default: '' })
</script>

<template>
  <section class="card eventbar" style="--rot: 0deg; --d: 0s">
    <div class="eb-title">
      <h1>AquaSci 1</h1>
      <svg width="120" height="10" viewBox="0 0 120 10" aria-hidden="true">
        <path
          d="M2 6 Q12 1 22 6 T42 6 T62 6 T82 6 T102 6 T118 6"
          fill="none"
          stroke="var(--teal)"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
      <p class="sub">HKK outreach scheduler · first week of Dec 2026</p>
    </div>
    <div class="eb-controls">
      <div v-if="events.length > 1" id="evPick">
        <span class="lbl">Event — each has its own days &amp; replies</span>
        <div class="evrow">
          <select
            v-model="activeId"
            :disabled="loading || !events.length"
            aria-label="Choose event"
          >
            <option v-if="loading" value="">Loading events…</option>
            <option v-else-if="!events.length" value="">No events yet</option>
            <option v-for="event in events" :key="event.id" :value="event.id">
              {{ event.name }}
            </option>
          </select>
          <button
            class="mini"
            type="button"
            title="Reload events, days and timeline from Supabase"
            aria-label="Reload from Supabase"
            :disabled="loading"
            @click="$emit('refresh')"
          >
            <RefreshCw />
          </button>
        </div>
      </div>
      <div v-else class="eb-single">
        <span class="lbl">Event</span>
        <div class="evrow">
          <b>{{ loading ? 'Loading event…' : events[0]?.name || 'No event yet' }}</b>
          <button
            class="mini"
            type="button"
            title="Reload events, days and timeline from Supabase"
            aria-label="Reload from Supabase"
            :disabled="loading"
            @click="$emit('refresh')"
          >
            <RefreshCw />
          </button>
        </div>
      </div>
      <span class="whochip none" title="Events and candidate days are edited in the Supabase dashboard">
        <Database />PM edits in Supabase
      </span>
    </div>
    <div class="guide">
      <Info />
      <span>
        <b>Each event stays separate.</b> Every event keeps its own days, grid and replies.
        Candidate days and the timeline are <b>read-only here</b> — the PM edits them in the
        Supabase dashboard. Pick your name, paint your free times, then open <b>Results</b>.
        <b>Share</b> the link so classmates can add theirs.
      </span>
    </div>
  </section>
</template>
