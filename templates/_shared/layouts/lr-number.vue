<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<template>
  <Shell :data="data">
    <div class="num-value pop">{{ data.value }}</div>
    <svg class="num-rule" viewBox="0 0 600 8" preserveAspectRatio="none" aria-hidden="true">
      <path class="draw" d="M0 4 H600" pathLength="1" style="--i: 3" />
    </svg>
    <h2 class="lr-title rise" style="--i: 3"><Txt :t="data.title" /></h2>
    <p v-if="data.subtitle" class="lr-sub rise" style="--i: 4"><Txt :t="data.subtitle" /></p>
  </Shell>
</template>
