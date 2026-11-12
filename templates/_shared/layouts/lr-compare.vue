<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<template>
  <Shell :data="data">
    <h2 class="lr-title rise"><Txt :t="data.title" /></h2>
    <div class="cp-grid">
      <section v-for="(side, s) in [data.left, data.right]" :key="s" class="cp-card" :class="s ? 'from-right' : 'from-left'">
        <h3 class="cp-head"><Txt :t="side?.head" /></h3>
        <ul>
          <li v-for="(it, i) in side?.items" :key="i" class="rise" :style="{ '--i': i + 3 }"><Txt :t="it" /></li>
        </ul>
      </section>
    </div>
  </Shell>
</template>
