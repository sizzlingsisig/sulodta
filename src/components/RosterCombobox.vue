<script setup>
import { ref } from 'vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'radix-vue'
import { Check, ChevronsUpDown, X } from '@lucide/vue'
import { ROSTER } from '../data/roster'

defineProps({
  disabled: { type: Boolean, default: false },
  shake: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })
const inputRef = ref(null)

defineExpose({
  focus: () => {
    const el = inputRef.value?.$el || inputRef.value
    el?.focus?.()
  },
})
</script>

<template>
  <ComboboxRoot
    v-model="model"
    :disabled="disabled"
    class="roster-combo"
    :class="{ shake }"
    :reset-search-term-on-blur="true"
  >
    <ComboboxAnchor class="roster-anchor">
      <ComboboxInput
        id="me"
        ref="inputRef"
        class="roster-input"
        :placeholder="model ? model : '— pick or type your name —'"
        :display-value="(v) => v || ''"
        :disabled="disabled"
      />
      <button
        v-if="model"
        type="button"
        class="roster-clear"
        title="Clear selection"
        aria-label="Clear selected name"
        @click.stop="model = ''"
      >
        <X class="clear-icon" />
      </button>
      <ComboboxTrigger class="roster-trigger" aria-label="Toggle classmate list">
        <ChevronsUpDown class="trigger-icon" />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        class="roster-content"
        position="popper"
        :side-offset="6"
        align="start"
      >
        <ComboboxViewport class="roster-viewport">
          <ComboboxEmpty class="roster-empty">
            No classmate matches your search
          </ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem
              v-for="person in ROSTER"
              :key="person"
              :value="person"
              class="roster-item"
            >
              <span>{{ person }}</span>
              <ComboboxItemIndicator class="roster-check">
                <Check />
              </ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped>
.roster-combo {
  position: relative;
  width: 100%;
}

.roster-anchor {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(27, 43, 39, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.roster-anchor:focus-within {
  border-color: var(--teal);
  box-shadow: 0 0 0 2px var(--hover);
}

.roster-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 8px 10px;
  font: 14.5px var(--ui);
  color: var(--ink);
  outline: none;
}

.roster-input::placeholder {
  color: var(--muted);
  font-style: italic;
}

.roster-clear {
  border: none;
  background: transparent;
  color: var(--muted);
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.roster-clear:hover {
  color: var(--danger-ink);
  background: var(--hover);
}

.clear-icon {
  width: 14px;
  height: 14px;
}

.roster-trigger {
  border: none;
  background: transparent;
  color: var(--muted);
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid var(--line);
}

.roster-trigger:hover {
  color: var(--ink);
  background: var(--hover);
}

.trigger-icon {
  width: 16px;
  height: 16px;
}

:global(.roster-content) {
  background: var(--surface);
  border: 1.5px solid var(--line-strong, var(--line));
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(27, 43, 39, 0.14);
  z-index: 1000;
  min-width: var(--radix-combobox-trigger-width, 260px);
  max-width: 380px;
  overflow: hidden;
  font-family: var(--ui);
  animation: popDown 0.15s ease-out;
}

:global(.roster-viewport) {
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}

:global(.roster-item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  user-select: none;
  outline: none;
}

:global(.roster-item[data-highlighted]) {
  background: var(--hover);
  color: var(--teal-deep);
}

:global(.roster-item[data-state='checked']) {
  font-weight: 600;
  background: var(--cellfill);
  color: var(--green-ink);
}

:global(.roster-check) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--green);
}

:global(.roster-check svg) {
  width: 15px;
  height: 15px;
}

:global(.roster-empty) {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
}

@keyframes popDown {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 680px) {
  .roster-input {
    font-size: 16px;
    padding: 10px 12px;
  }

  .roster-trigger {
    padding: 10px 12px;
  }

  :global(.roster-item) {
    padding: 10px 12px;
    font-size: 15px;
    min-height: 42px;
  }
}
</style>
