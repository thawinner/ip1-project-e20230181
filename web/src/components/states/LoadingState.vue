<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), { message: 'Loading…' })
</script>

<template>
  <div class="state" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 16px;
  color: var(--muted);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
}
</style>
