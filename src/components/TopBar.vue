<script setup>
import { Link as LinkIcon, Pencil, Eraser, Users } from '@lucide/vue'
import Hamster from './Hamster.vue'

const tool = defineModel('tool', { default: 'draw' })
defineEmits(['share'])
</script>

<template>
  <div class="top">
    <div class="island brand" aria-hidden="true"><Hamster :kind="1" :height="30" /></div>
    <div class="island mid" role="toolbar" aria-label="Tools">
      <button class="ib tool" :aria-pressed="tool === 'draw'" title="Mark free times" @click="tool = 'draw'">
        <Pencil /><span>Paint</span><small>1</small>
      </button>
      <button class="ib tool" :aria-pressed="tool === 'erase'" title="Erase" @click="tool = 'erase'">
        <Eraser /><span>Erase</span><small>2</small>
      </button>
      <span class="sep" />
      <button class="ib tool" :aria-pressed="tool === 'group'" title="Group results" @click="tool = 'group'">
        <Users /><span>Results</span><small>3</small>
      </button>
    </div>
    <div class="right">
      <button class="share" title="Copy a link to this scheduler" @click="$emit('share')">
        <LinkIcon />Share
      </button>
    </div>
  </div>
</template>
