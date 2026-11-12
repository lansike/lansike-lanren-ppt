<script setup>
import { computed } from 'vue'

// 逐字入场的大标题：生成时已在短语之间插了零宽空格，这里按短语分组，组内不换行
const props = defineProps({ text: String })
const words = computed(() => {
  let i = 0
  return (props.text || '').split('\u200B').map(w => [...w].map(c => ({ c, i: i++ })))
})
</script>

<template>
  <span v-for="(w, j) in words" :key="j" class="cv-word"><span v-for="x in w" :key="x.i" class="cv-ch" :style="{ '--i': x.i }">{{ x.c }}</span></span>
</template>
