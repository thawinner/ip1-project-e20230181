<script setup lang="ts">
import CountBadge from '@/components/CountBadge.vue'

export interface MenuItem {
  label: string
  to: { path: string; query?: Record<string, string> }
  current: boolean
  count?: number
}

defineProps<{ items: MenuItem[] }>()
</script>

<template>
  <nav class="section-menu" aria-label="Section pages">
    <RouterLink
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="nav-btn"
      :aria-current="item.current ? 'page' : undefined"
    >
      {{ item.label }}
      <CountBadge v-if="item.count" :count="item.count" label="waiting" />
    </RouterLink>
  </nav>
</template>

<style scoped>
.section-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  padding-left: 10px;
  border-left: 1px solid var(--nav-line);
  align-self: stretch;
}

.section-menu .nav-btn {
  height: 100%;
  border-radius: 0;
  padding: 0 14px;
  font-weight: 600;
}

/* Tablets and phones: these pages move into the section menu (SectionSwitcher) */
@media (max-width: 960px) {
  .section-menu {
    display: none;
  }
}
</style>
