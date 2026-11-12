<script setup>
import { computed } from 'vue'

const props = defineProps({ page: String, src: String })
const url = computed(() => import.meta.env.BASE_URL + props.src)
</script>

<template>
  <div class="lr-video">
    <SlidevVideo :key="url" autoplay autoreset="slide" muted loop playsinline>
      <source :src="url" type="video/mp4">
    </SlidevVideo>
  </div>
</template>
