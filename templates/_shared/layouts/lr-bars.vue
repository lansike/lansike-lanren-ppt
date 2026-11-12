<script setup>
import { computed } from 'vue'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
const max = computed(() => Math.max(1, ...(props.data.bars || []).map(b => Number(b.value) || 0)))
</script>

<template>
  <Shell :data="data">
    <h2 class="lr-title rise"><Txt :t="data.title" /></h2>
    <p v-if="data.subtitle" class="lr-sub rise" style="--d: 120ms"><Txt :t="data.subtitle" /></p>
    <div class="bar-list">
      <div v-for="(b, i) in data.bars" :key="i" class="bar-row" :style="{ '--i': i }">
        <span class="bar-label rise" :style="{ '--i': i + 2 }"><Txt :t="b.label" /></span>
        <div class="bar-track">
          <div class="bar-fill grow" :style="{ width: `${Math.max(2, (Number(b.value) || 0) / max * 100)}%`, '--i': i }" />
        </div>
        <span class="bar-value rise" :style="{ '--i': i + 5 }">{{ b.value }}{{ b.unit || '' }}</span>
      </div>
    </div>
  </Shell>
</template>
