<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(defineProps<{ index: number; total: number; noun?: string }>(), { noun: 'product' })
const emit = defineEmits<{ prev: []; next: [] }>()
</script>

<template>
  <nav class="pager" :aria-label="`${noun[0]!.toUpperCase()}${noun.slice(1)}s`">
    <span class="muted">{{ index }} / {{ total }}</span>
    <button type="button" class="icon-btn" :aria-label="`Previous ${noun}`" :disabled="index <= 1" @click="emit('prev')">
      <AppIcon name="chevronLeft" :size="18" />
    </button>
    <button type="button" class="icon-btn" :aria-label="`Next ${noun}`" :disabled="index >= total" @click="emit('next')">
      <AppIcon name="chevronRight" :size="18" />
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.muted {
  margin-right: 8px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
