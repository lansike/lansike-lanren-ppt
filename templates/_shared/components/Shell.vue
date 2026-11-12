<script setup>
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

defineProps({ data: { type: Object, default: () => ({}) }, bare: Boolean })
const { $slidev, $page } = useSlideContext()
const active = computed(() => $slidev.nav.currentSlideNo === $page.value)
const pad = n => String(n ?? '').padStart(2, '0')
</script>

<template>
  <div class="lr" :class="[`lr-${data.type}`, { 'is-active': active, 'has-video': data.video }]">
    <div class="lr-bg" aria-hidden="true"><i /><i /><i /></div>
    <div class="lr-grain" aria-hidden="true" />
    <header v-if="!bare" class="lr-top rise">
      <span class="lr-kicker">{{ data.kicker }}</span>
      <span class="lr-pageno">{{ pad(data.no) }} / {{ pad(data.total) }}</span>
    </header>
    <div class="lr-body">
      <div class="lr-main"><slot /></div>
      <VideoSlot v-if="data.video" class="lr-aside" :page="data.video.page" :src="data.video.src" />
    </div>
  </div>
</template>
