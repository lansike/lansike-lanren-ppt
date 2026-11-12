<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<template>
  <Shell :data="data">
    <h2 class="lr-title rise"><Txt :t="data.title" /></h2>
    <p v-if="data.subtitle" class="lr-sub rise" style="--d: 120ms"><Txt :t="data.subtitle" /></p>
    <ol class="pt-list">
      <li v-for="(it, i) in data.items" :key="i" class="pt-item rise" :style="{ '--i': i + 2 }">
        <span class="pt-no">{{ String(i + 1).padStart(2, '0') }}</span>
        <div><b class="pt-head"><Txt :t="it.head" /></b><span v-if="it.text" class="pt-text"><Txt :t="it.text" /></span></div>
      </li>
    </ol>
  </Shell>
</template>
