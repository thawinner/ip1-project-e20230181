<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

const type = defineModel<'IN' | 'OUT'>({ required: true })
</script>

<template>
  <div class="toggle" role="radiogroup" aria-label="Stock in or out">
    <button type="button" role="radio" :aria-checked="type === 'IN'" @click="type = 'IN'">
      <AppIcon name="inbox" :size="16" /> Stock in
    </button>
    <button type="button" role="radio" :aria-checked="type === 'OUT'" @click="type = 'OUT'">
      <AppIcon name="send" :size="16" /> Stock out
    </button>
  </div>
</template>

<style scoped>
.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--row);
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--ink-2);
  font-weight: 600;
  cursor: pointer;
}

@media (pointer: coarse) {
  button {
    min-height: 44px;
  }
}

button[aria-checked='true'] {
  background: var(--surface);
  color: var(--accent-hover);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.12);
}
</style>
