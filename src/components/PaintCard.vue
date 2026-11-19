<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Info, MousePointerClick, RefreshCw, Star, Trash2, User, UserCheck } from '@lucide/vue'
import { fmt, slotLabel } from '../lib/dates'
import { ROSTER } from '../data/roster'
import { toast } from '../composables/useToast'
import Hamster from './Hamster.vue'

const props = defineProps({
  days: { type: Set, required: true },
  tool: { type: String, default: 'draw' },
  startHour: { type: Number, default: 8 },
  endHour: { type: Number, default: 18 },
  replies: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  responded: { type: Number, default: 0 },
  bestSlot: { type: Object, default: null },
  selectedSlot: { type: String, default: '' },
})

const emit = defineEmits([
  'toggle',
  'commit',
  'retry',
  'select',
  'clear-selection',
  'clear',
  'paint-start',
  'paint-end',
])
const me = defineModel('me', { default: '' })

const dayList = computed(() => [...props.days].sort())
const slots = computed(() => {
  const out = []
  for (let h = props.startHour; h < props.endHour; h += 0.5) out.push(h)
  return out
})
const columns = computed(
  () => `var(--timecol) repeat(${dayList.value.length}, minmax(var(--cellw), 1fr))`,
)
const isGroup = computed(() => props.tool === 'group')
const mine = computed(() => (me.value ? (props.replies[me.value] ?? new Set()) : new Set()))
const bestKey = computed(() =>
  props.bestSlot ? `${props.bestSlot.day}|${props.bestSlot.slot}` : '',
)
const selected = computed(() => {
  if (!props.selectedSlot) return null
  const [day, slot] = props.selectedSlot.split('|')
  return { day, slot: Number(slot) }
})
const selectedLabel = computed(() =>
  selected.value
    ? `${fmt(selected.value.day).dow}, ${fmt(selected.value.day).md} · ${slotLabel(selected.value.slot)}`
    : '',
)
const selectedFree = computed(() =>
  selected.value
    ? ROSTER.filter((name) =>
        props.replies[name]?.has(`${selected.value.day}|${selected.value.slot}`),
      )
    : [],
)
const selectedBusy = computed(() =>
  selected.value
    ? ROSTER.filter(
        (name) =>
          (props.replies[name]?.size ?? 0) > 0 &&
          !props.replies[name]?.has(`${selected.value.day}|${selected.value.slot}`),
      )
    : [],
)
const selectedWaiting = computed(() => ROSTER.length - props.responded)
const confirmingClear = ref(false)

const grid = ref(null)
const picker = ref(null)
const focusKey = ref('')
const shake = ref(false)
let paint = null
let tap = null

watch([me, () => mine.value.size], () => {
  confirmingClear.value = false
})

function label(day, slot) {
  return `${fmt(day).dow} ${fmt(day).md}, ${slotLabel(slot)}`
}

function rowLabel(slot) {
  return slot % 1 === 0 ? slotLabel(slot) : slotLabel(slot).replace(/ (AM|PM)$/, '')
}

function askClear() {
  if (!mine.value.size) return
  confirmingClear.value = true
}

function doClear() {
  confirmingClear.value = false
  emit('clear')
}

function hasBlock(day, slot) {
  return mine.value.has(`${day}|${slot}`)
}

function tabIndex(day, slot) {
  const key = `${day}|${slot}`
  if (focusKey.value) return focusKey.value === key ? 0 : -1
  return day === dayList.value[0] && slot === slots.value[0] ? 0 : -1
}

function freeCount(day, slot) {
  const key = `${day}|${slot}`
  return ROSTER.reduce((count, name) => count + (props.replies[name]?.has(key) ? 1 : 0), 0)
}

function heatStyle(day, slot) {
  const count = freeCount(day, slot)
  if (!count) return undefined
  const pct = props.responded ? Math.round((count / props.responded) * 100) : 0
  return { background: `color-mix(in srgb, var(--green) ${Math.max(pct, 12)}%, var(--cellbg))` }
}

function isBest(day, slot) {
  return bestKey.value === `${day}|${slot}`
}

function isSelected(day, slot) {
  return props.selectedSlot === `${day}|${slot}`
}

function groupLabel(day, slot) {
  return `${label(day, slot)}, ${freeCount(day, slot)} free`
}

function needName() {
  toast('Pick your name first', { kind: 8 })
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => {
      shake.value = false
    }, 700)
  })
  picker.value?.focus()
}

function apply(day, slot) {
  if (!paint || !me.value) return
  const on = paint === 'add'
  if (on === hasBlock(day, slot)) return
  emit('toggle', { day, slot, on })
}

function start(event, day, slot) {
  const isTouch = event.pointerType && event.pointerType !== 'mouse'

  if (isTouch) {
    tap = { day, slot, x: event.clientX, y: event.clientY, id: event.pointerId }
    focusKey.value = `${day}|${slot}`
    event.currentTarget.focus?.({ preventScroll: true })
    return
  }

  if (props.loading) {
    toast('Still loading saved times…', { kind: 8 })
    return
  }
  if (props.error) {
    toast('Retry loading saved times first', { kind: 8 })
    return
  }

  if (isGroup.value) {
    event.preventDefault()
    event.currentTarget.focus?.()
    focusKey.value = `${day}|${slot}`
    emit('select', { day, slot })
    return
  }

  if (!me.value) {
    needName()
    return
  }

  event.preventDefault()
  event.currentTarget.focus?.()
  paint = event.button === 2 || props.tool === 'erase' ? 'remove' : 'add'
  focusKey.value = `${day}|${slot}`
  emit('paint-start')
  apply(day, slot)
}

function move(event) {
  if (tap) {
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) tap = null
    return
  }
  if (!paint) return
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const cell = element?.closest?.('.cell')
  if (!cell || !grid.value?.contains(cell)) return
  apply(cell.dataset.d, Number(cell.dataset.s))
}

function end(event) {
  if (tap) {
    if (event?.pointerId !== undefined && tap.id !== event.pointerId) return
    const { day, slot } = tap
    tap = null

    if (props.loading) {
      toast('Still loading saved times…', { kind: 8 })
      return
    }
    if (props.error) {
      toast('Retry loading saved times first', { kind: 8 })
      return
    }
    if (isGroup.value) {
      emit('select', { day, slot })
      return
    }
    if (!me.value) {
      needName()
      return
    }

    const on = props.tool === 'erase' ? false : !hasBlock(day, slot)
    if (on === hasBlock(day, slot)) return
    emit('paint-start')
    emit('toggle', { day, slot, on })
    emit('paint-end')
    emit('commit')
    return
  }

  if (!paint) return
  paint = null
  emit('paint-end')
  emit('commit')
}

function cancel() {
  tap = null
  if (!paint) return
  paint = null
  emit('paint-end')
  emit('commit')
}

function onGridKey(event) {
  const cell = event.target.closest?.('.cell')
  if (!cell) return

  const ds = dayList.value
  const ss = slots.value
  let di = ds.indexOf(cell.dataset.d)
  let si = ss.indexOf(Number(cell.dataset.s))

  const delta = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[event.key]

  if (delta) {
    event.preventDefault()
    di = Math.min(ds.length - 1, Math.max(0, di + delta[0]))
    si = Math.min(ss.length - 1, Math.max(0, si + delta[1]))
    const next = grid.value?.querySelector(
      `[data-d="${ds[di]}"][data-s="${ss[si]}"]`,
    )
    if (next) {
      focusKey.value = `${ds[di]}|${ss[si]}`
      next.focus()
    }
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (isGroup.value) {
      emit('select', { day: cell.dataset.d, slot: Number(cell.dataset.s) })
      return
    }
    if (!me.value) {
      needName()
      return
    }
    const day = cell.dataset.d
    const slot = Number(cell.dataset.s)
    emit('toggle', { day, slot, on: !hasBlock(day, slot) })
    emit('commit')
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && !isGroup.value) {
    event.preventDefault()
    if (!me.value) {
      needName()
      return
    }
    emit('toggle', { day: cell.dataset.d, slot: Number(cell.dataset.s), on: false })
    emit('commit')
  }
}

onMounted(() => {
  addEventListener('pointerup', end)
  addEventListener('pointercancel', cancel)
})
onUnmounted(() => {
  removeEventListener('pointerup', end)
  removeEventListener('pointercancel', cancel)
  tap = null
  if (paint) {
    paint = null
    emit('paint-end')
  }
})
</script>

<template>
  <section class="card a-paint" style="--rot: -0.25deg; --d: 0.06s">
    <h2>{{ isGroup ? 'Results — who can make it?' : 'Your free times' }}</h2>
    <div class="guide">
      <MousePointerClick />
      <span v-if="isGroup">
        <b>Click a box</b> to see who’s free at that time. Darker green means more classmates are
        available; a <b style="color: var(--danger)">red outline</b> marks the best slot so far. Click
        a leaderboard row below to jump straight to a slot.
      </span>
      <span v-else>
        <b>Drag</b> across the boxes you’re free. <b>Right-drag</b> (or the Erase tool) rubs them out.
        Switching your name loads <b>that person’s own saved times</b> — it never deletes anyone’s
        reply. Keys <b>1 / 2 / 3</b> swap tools; arrow keys + Enter work too.
      </span>
    </div>
    <div v-if="!isGroup" class="mhead">
      <div class="pickwrap">
        <label for="me">I’m</label>
        <select
          id="me"
          ref="picker"
          v-model="me"
          :class="{ shake }"
          :disabled="loading"
        >
          <option value="">— pick your name —</option>
          <option v-for="p in ROSTER" :key="p">{{ p }}</option>
        </select>
      </div>
      <span :class="['whochip', me ? '' : 'none']">
        <UserCheck v-if="me" />
        <User v-else />
        {{
          me
            ? `Painting as ${me} · ${mine.size} block${mine.size === 1 ? '' : 's'}`
            : 'No name picked yet'
        }}
      </span>
      <div v-if="me" class="clearzone">
        <button
          v-if="!confirmingClear"
          class="pill"
          type="button"
          :disabled="!mine.size"
          title="Remove every time you painted for this event"
          @click="askClear"
        >
          <Trash2 />Clear my times
        </button>
        <template v-else>
          <span class="clearask" role="alert">
            Clear all {{ mine.size }} {{ mine.size === 1 ? 'time' : 'times' }}?
          </span>
          <button class="pill danger" type="button" @click="doClear">Yes, clear</button>
          <button class="pill" type="button" @click="confirmingClear = false">Cancel</button>
        </template>
      </div>
    </div>
    <p class="hint">
      <template v-if="loading">Loading saved times…</template>
      <template v-else-if="error">Couldn’t load saved times — retry below.</template>
      <template v-else-if="isGroup">
        <template v-if="!responded">
          No replies yet — the heatmap fills in as classmates paint their times.
        </template>
        <template v-else>
          Darker green = more classmates free. Tap a box to inspect; red outline = best slot.
        </template>
      </template>
      <template v-else-if="!me">
        Choose your name above to start. Switching names loads that person’s own saved times.
      </template>
      <template v-else>
        Drag on desktop, or tap a box on your phone to mark or unmark it. Right-drag erases.
        <span v-if="saving"> Saving…</span>
      </template>
    </p>
    <div v-if="isGroup && bestSlot" class="best">
      <Star />
      <span>
        Best so far: {{ fmt(bestSlot.day).dow }}, {{ fmt(bestSlot.day).md }} at
        {{ slotLabel(bestSlot.slot) }} — {{ bestSlot.count }} of {{ responded }} who replied
        {{ bestSlot.count === 1 ? 'is' : 'are' }} free
      </span>
      <span v-if="bestSlot.count === responded && responded > 1" class="miniham">
        <Hamster :kind="5" :height="30" raw />
      </span>
    </div>
    <div v-if="isGroup && selected" class="slotinfo">
      <div class="slothead">
        <b>{{ selectedLabel }}</b>
        <span>
          {{ selectedFree.length }} free · {{ selectedBusy.length }} busy ·
          {{ selectedWaiting }} not replied
        </span>
        <button class="pill" type="button" @click="$emit('clear-selection')">Close</button>
      </div>
      <p class="slotnames">
        <b>Free:</b> {{ selectedFree.length ? selectedFree.join(', ') : 'nobody yet' }}
      </p>
      <p v-if="selectedBusy.length" class="slotnames">
        <b>Busy:</b> {{ selectedBusy.join(', ') }}
      </p>
    </div>
    <div v-if="error" class="guide warn">
      <Info />
      <span>{{ error }}</span>
      <button class="mini" type="button" aria-label="Retry loading saved times" @click="$emit('retry')">
        <RefreshCw />
      </button>
    </div>
    <p v-if="dayList.length > 1" class="scrollcue">
      Swipe sideways for all {{ dayList.length }} days →
    </p>
    <div class="scrollwrap">
      <div class="scroll">
        <div v-if="!dayList.length" class="empty">
          <p>
            No candidate days yet — the PM hasn’t picked days for this event in Supabase.<br />The
            grid wakes up as soon as days are added.
          </p>
        </div>
        <div
          v-else
          ref="grid"
          class="tgrid"
          :style="{ gridTemplateColumns: columns }"
          @pointermove="move"
          @contextmenu.prevent
          @keydown="onGridKey"
        >
          <div class="corner" />
          <div v-for="d in dayList" :key="`h-${d}`" class="th">
            <b>{{ fmt(d).dow }}</b><small>{{ fmt(d).md }}</small>
          </div>
          <template v-for="s in slots" :key="s">
            <div class="tlab" :class="{ half: s % 1 !== 0 }">{{ rowLabel(s) }}</div>
            <div
              v-for="d in dayList"
              :key="`${d}-${s}`"
              class="cell"
              :class="{
                hr: s % 1 === 0,
                mine: !isGroup && hasBlock(d, s),
                group: isGroup,
                top1: isGroup && isBest(d, s),
                sel: isGroup && isSelected(d, s),
              }"
              :style="isGroup ? heatStyle(d, s) : undefined"
              :data-d="d"
              :data-s="s"
              :tabindex="tabIndex(d, s)"
              :role="isGroup ? 'button' : 'checkbox'"
              :aria-checked="isGroup ? undefined : hasBlock(d, s)"
              :aria-pressed="isGroup ? isSelected(d, s) : undefined"
              :aria-label="isGroup ? groupLabel(d, s) : label(d, s)"
              @pointerdown="start($event, d, s)"
            />
          </template>
        </div>
      </div>
    </div>
    <div v-if="isGroup" class="legend">
      <span>nobody</span>
      <span
        v-for="pct in [0, 25, 50, 75, 100]"
        :key="pct"
        class="sw"
        :style="{ background: `color-mix(in srgb, var(--green) ${pct}%, var(--cellbg))` }"
      />
      <span>everyone who replied</span>
    </div>
    <div v-else class="legend">
      <span class="sw" />not marked
      <span class="sw" style="background: var(--cellfill); border-color: var(--green)" />free
    </div>
  </section>
</template>
