<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state" role="alert">
    <span class="ic"><AppIcon name="alert" :size="20" /></span>
    <p>{{ message }}</p>
    <button type="button" class="btn btn-outline btn-sm" @click="emit('retry')">Try again</button>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #f2c4bf;
  border-radius: var(--radius-lg);
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.ic {
  flex: none;
  display: flex;
}

p {
  flex: 1;
  margin: 0;
  font-weight: 500;
}
</style>
