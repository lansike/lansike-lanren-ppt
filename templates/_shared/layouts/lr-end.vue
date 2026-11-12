<script setup>
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<template>
  <Shell :data="data" bare>
    <div class="end">
      <h1 class="end-title">
        <Words :text="data.title || '谢谢'" />
      </h1>
      <p v-if="data.subtitle" class="end-sub rise" style="--d: 500ms"><Txt :t="data.subtitle" /></p>
    </div>
  </Shell>
</template>
