<script setup>
import { computed } from 'vue'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
const len = computed(() => [...(props.data.title || '').replaceAll('\u200B', '')].length)
</script>

<template>
  <Shell :data="data" bare>
    <div class="cv">
      <div class="cv-kicker rise">{{ data.kicker }}</div>
      <h1 class="cv-title" :class="len > 10 ? 'is-long' : len > 6 ? 'is-mid' : ''">
        <Words :text="data.title" />
      </h1>
      <p class="cv-sub rise" style="--d: 500ms"><Txt :t="data.subtitle" /></p>
      <svg class="cv-art" viewBox="0 0 400 400" aria-hidden="true">
        <circle class="draw" cx="200" cy="200" r="170" pathLength="1" />
        <circle class="draw" cx="200" cy="200" r="120" pathLength="1" style="--i: 2" />
        <path class="draw" d="M30 330 L370 70" pathLength="1" style="--i: 4" />
        <path class="draw" d="M30 200 H370" pathLength="1" style="--i: 6" />
      </svg>
    </div>
  </Shell>
</template>
