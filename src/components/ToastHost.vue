<script setup>
import { toastState, runToastAction } from '../composables/useToast'
import Hamster from './Hamster.vue'
</script>

<template>
  <div class="toast" :class="{ show: toastState.visible }" role="status" aria-live="polite">
    <Hamster v-if="toastState.kind !== null" :kind="toastState.kind" :height="26" />
    <span>{{ toastState.message }}</span>
    <button v-if="toastState.action" type="button" @click="runToastAction">
      {{ toastState.action.label }}
    </button>
  </div>
</template>
