<script setup>
// 生成时在词之间插了零宽空格（只留在 slides.md 里），这里换成 <wbr>：只在词之间换行，页面上和复制出来的文字里都没有零宽空格
defineProps({ t: [String, Number] })
</script>

<template>
  <template v-for="(w, i) in String(t ?? '').split('\u200B')" :key="i"><wbr v-if="i">{{ w }}</template>
</template>
