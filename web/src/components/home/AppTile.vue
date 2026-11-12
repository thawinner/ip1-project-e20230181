<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import CountBadge from '@/components/CountBadge.vue'
import type { AppDef } from '@/apps'

defineProps<{ app: AppDef; count?: number }>()
</script>

<template>
  <RouterLink :to="app.to" class="tile" :aria-label="count ? `${app.label}, ${count} waiting` : undefined">
    <span class="ic" :style="{ background: `var(--app-${app.id})` }">
      <AppIcon :name="app.icon" :size="32" />
      <CountBadge v-if="count" class="badge-corner" :count="count" />
    </span>
    <span class="name">{{ app.label }}</span>
  </RouterLink>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-radius: var(--radius);
  color: var(--ink);
  text-align: center;
  text-decoration: none;
}

a.tile:hover {
  background: var(--surface-2);
}

a.tile:hover .ic {
  filter: brightness(1.08);
}

.ic {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  color: #fff;
  box-shadow: 0 1px 2px rgba(22, 25, 29, 0.15);
}

.badge-corner {
  position: absolute;
  top: -7px;
  right: -7px;
  box-shadow: 0 0 0 2px var(--surface);
}

.name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
}

@media (max-width: 720px) {
  .ic {
    width: 64px;
    height: 64px;
  }
}
</style>
