<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })

// Three stacked boxes: stock in storage
const boxes: { x: number; y: number }[] = [
  { x: 12.5, y: 34 },
  { x: 34.5, y: 34 },
  { x: 23.5, y: 15 },
]
</script>

<template>
  <svg class="logo" :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="15" fill="var(--logo-bg, #004aad)" />
    <g v-for="{ x, y } in boxes" :key="`${x}-${y}`">
      <rect :x="x" :y="y" width="17" height="15" rx="2.2" fill="var(--logo-fg, #fff)" />
      <rect :x="x + 6.8" :y="y" width="3.4" height="6.5" rx="0.6" fill="var(--logo-bg, #004aad)" />
    </g>
  </svg>
</template>

<style scoped>
.logo {
  flex: none;
}
</style>
