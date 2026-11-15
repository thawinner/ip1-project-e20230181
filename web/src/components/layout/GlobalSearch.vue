<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SearchPalette from './SearchPalette.vue'

// "Search…" in the top bar opens the search palette
const open = ref(false)
</script>

<template>
  <button type="button" class="search-btn" aria-label="Search" @click="open = true">
    <AppIcon name="search" :size="16" />
    <span class="txt">Search…</span>
  </button>
  <SearchPalette :open="open" @close="open = false" />
</template>

<style scoped>
.search-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  min-width: 180px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--nav-line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.12);
  color: var(--nav-soft);
  cursor: pointer;
}

.search-btn:hover {
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.2);
  color: var(--nav-fg);
}

.txt {
  flex: 1;
  text-align: left;
  font-size: 13px;
}

@media (max-width: 960px) {
  .search-btn {
    min-width: 0;
  }

  .txt {
    display: none;
  }
}
</style>
