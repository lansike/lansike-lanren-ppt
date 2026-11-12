<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<template>
  <Shell :data="data">
    <div class="qt-mark pop" aria-hidden="true">“</div>
    <blockquote class="qt-text rise" style="--i: 1"><Txt :t="data.quote || data.title" /></blockquote>
    <p v-if="data.by" class="qt-by rise" style="--i: 4">— <Txt :t="data.by" /></p>
  </Shell>
</template>
