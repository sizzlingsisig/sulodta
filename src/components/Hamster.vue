<script setup>
import { computed } from 'vue'
import grinning from '../../assets/98183261af18d6785d310902cd183d11.jpg'
import laughing from '../../assets/67b4f3dd0ec80795d42702ee303453eb.jpg'
import shy from '../../assets/7d804e4dc1c7461f465494d31f8bb9af.jpg'
import blank from '../../assets/def0cf31528eacc2764cfe532f4c2721.jpg'
import chad from '../../assets/chad.jpg'
import smug from '../../assets/a464c56355b526c1522799a002e8a769.jpg'
import crying from '../../assets/c2367a961a22d8f72aa61485aaca5e9d.jpg'
import sobbing from '../../assets/f057155a2776ce70be5afe51089e4e00.jpg'
import rage from '../../assets/7e0d6f9748c0b6730a60986e3f7914a5.jpg'
import tongueOut from '../../assets/8770666d23a9abdc9108c9c423c13715.jpg'

const props = defineProps({
  kind: { type: Number, default: 0 },
  height: { type: Number, default: 88 },
})

const PHOTOS = [blank, grinning, laughing, shy, chad, smug, crying, sobbing, tongueOut, rage]

const src = computed(() => PHOTOS[props.kind] ?? PHOTOS[0])
</script>

<template>
  <img
    class="ham"
    :src="src"
    :width="height"
    :height="height"
    alt=""
    aria-hidden="true"
    draggable="false"
  />
</template>
