<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

const view = defineModel<'cards' | 'list'>({ required: true })
</script>

<template>
  <div class="switch" role="group" aria-label="View">
    <button type="button" :aria-pressed="view === 'list'" aria-label="List" title="List" @click="view = 'list'">
      <AppIcon name="listView" />
    </button>
    <button type="button" :aria-pressed="view === 'cards'" aria-label="Cards" title="Cards" @click="view = 'cards'">
      <AppIcon name="kanban" />
    </button>
  </div>
</template>

<style scoped>
.switch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--border);
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: calc(var(--ctl) - 6px);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--muted);
  cursor: pointer;
}

button[aria-pressed='true'] {
  background: var(--surface);
  color: var(--accent);
}
</style>
