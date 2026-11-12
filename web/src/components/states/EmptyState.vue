<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/components/icons'

withDefaults(defineProps<{ message: string; detail?: string; icon?: IconName }>(), {
  detail: undefined,
  icon: 'box',
})
</script>

<template>
  <div class="state">
    <span class="ic"><AppIcon :name="icon" :size="22" /></span>
    <p class="message">{{ message }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
    <!-- an optional button, e.g. "Clear filters" -->
    <slot />
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 16px;
  text-align: center;
}

.ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--muted);
}

p {
  margin: 0;
}

.message {
  font-weight: 600;
  color: var(--ink);
}

.detail {
  font-size: 13px;
  color: var(--muted);
}

.state :deep(.btn) {
  margin-top: 8px;
}
</style>
