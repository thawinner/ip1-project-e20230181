<script setup lang="ts">
defineProps<{ kind: 'error' | 'success' | 'info'; message: string }>()
</script>

<template>
  <p class="alert" :class="kind" :role="kind === 'error' ? 'alert' : 'status'">{{ message }}</p>
</template>

<style scoped>
.alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius);
  border-left: 4px solid currentColor;
}

.error {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.success {
  background: var(--success-bg);
  color: var(--success-fg);
}

.info {
  background: var(--info-bg);
  color: var(--info-fg);
}
</style>
