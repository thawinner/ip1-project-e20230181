<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 30 })

// "Dara Chan" → "DC"
const initials = computed(() =>
  props.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
</script>

<template>
  <span
    class="avatar"
    aria-hidden="true"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }"
  >
    {{ initials }}
  </span>
</template>

<style scoped>
.avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-hover);
  font-weight: 600;
}
</style>
