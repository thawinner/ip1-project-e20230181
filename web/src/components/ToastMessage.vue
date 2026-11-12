<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ kind: 'success' | 'error'; message: string; actionLabel?: string }>()
const emit = defineEmits<{ close: []; action: [] }>()
</script>

<template>
  <div class="toast" :class="kind" :role="kind === 'error' ? 'alert' : 'status'">
    <AppIcon :name="kind === 'success' ? 'check' : 'alert'" :size="18" class="ic" />
    <p>{{ message }}</p>
    <button v-if="actionLabel" type="button" class="action" @click="emit('action')">
      <AppIcon name="undo" :size="14" /> {{ actionLabel }}
    </button>
    <button type="button" aria-label="Close message" @click="emit('close')">
      <AppIcon name="x" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: min(380px, calc(100% - 32px));
  padding: 12px 10px 12px 14px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--success-line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--ink-2);
}

.toast.error {
  border-left-color: var(--danger-fg);
}

.ic {
  flex: none;
  margin-top: 2px;
  color: var(--success-fg);
}

.error .ic {
  color: var(--danger-fg);
}

p {
  flex: 1;
  margin: 0;
}

button {
  flex: none;
  display: inline-flex;
  padding: 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--muted);
  cursor: pointer;
}

button:hover {
  background: var(--surface-2);
}

.action {
  align-items: center;
  gap: 4px;
  margin: -2px 0;
  padding: 4px 8px;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
}
</style>
