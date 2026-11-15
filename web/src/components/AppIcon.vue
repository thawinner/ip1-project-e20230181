<script setup lang="ts">
import { ICONS, type IconName } from './icons'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 18 })
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- the markup is our own constant, never user input -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="ICONS[name]"
  />
</template>
