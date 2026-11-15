<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

// The title of a group row: click it to fold the group away or open it again
defineProps<{ title: string; count: number; open: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button type="button" class="fold" :aria-expanded="open" @click="$emit('toggle')">
    <AppIcon :name="open ? 'caret' : 'chevronRight'" :size="16" />
    {{ title }} <span class="muted">({{ count }})</span>
  </button>
</template>

<style scoped>
.fold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
