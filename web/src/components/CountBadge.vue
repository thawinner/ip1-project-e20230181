<script setup lang="ts">
defineProps<{ count: number; label?: string }>()
</script>

<template>
  <span v-if="count > 0" class="count" :aria-label="label ? `${count} ${label}` : undefined">{{ count }}</span>
</template>

<style scoped>
.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--attention);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
</style>
