<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import CountBadge from '@/components/CountBadge.vue'
import { useDropdown } from '@/composables/useDropdown'
import type { AppDef, CountKey } from '@/apps'
import type { MenuItem } from './SectionMenu.vue'

// `pages` show at the top of the menu on narrow screens, where the section menu is hidden
defineProps<{ current: AppDef; apps: AppDef[]; counts: Record<CountKey, number>; pages: MenuItem[] }>()

const root = ref<HTMLElement | null>(null)
const { open, toggle, close } = useDropdown(root)

const route = useRoute()
watch(() => route.fullPath, close)
</script>

<template>
  <div ref="root" class="switcher">
    <button
      type="button"
      class="nav-btn section"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`Section: ${current.section ?? current.label}. Switch section`"
      @click="toggle"
    >
      <span>{{ current.section ?? current.label }}</span>
      <AppIcon name="caret" :size="16" />
    </button>

    <div v-if="open" class="menu" role="menu">
      <div v-if="pages.length" class="pages">
        <p class="head">{{ current.section ?? current.label }}</p>
        <RouterLink
          v-for="page in pages"
          :key="page.label"
          :to="page.to"
          role="menuitem"
          :aria-current="page.current ? 'page' : undefined"
        >
          <span class="grow">{{ page.label }}</span>
          <CountBadge v-if="page.count" :count="page.count" label="waiting" />
        </RouterLink>
        <hr />
        <p class="head">All sections</p>
      </div>
      <template v-for="app in apps" :key="app.id">
        <RouterLink :to="app.to" role="menuitem" :aria-current="app.id === current.id ? 'page' : undefined">
          <span class="section-ic" :style="{ background: `var(--app-${app.id})` }">
            <AppIcon :name="app.icon" :size="18" />
          </span>
          <span class="grow">{{ app.label }}</span>
          <CountBadge v-if="app.count" :count="counts[app.count]" label="waiting" />
        </RouterLink>
      </template>
      <hr />
      <RouterLink to="/" role="menuitem"><AppIcon name="apps" :size="18" /> Home menu</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.switcher {
  position: relative;
}

.section {
  height: 40px;
  padding: 0 10px 0 12px;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius);
}

.section svg {
  opacity: 0.8;
}

.section-ic {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: #fff;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 250px;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.menu a {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  color: var(--ink-2);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.menu a:hover,
.menu a[aria-current='page'] {
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.grow {
  flex: 1;
}

.pages {
  display: none;
}

.head {
  margin: 4px 10px 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .pages {
    display: block;
  }

  .pages a[aria-current='page'] {
    font-weight: 600;
  }
}

hr {
  border: 0;
  border-top: 1px solid var(--row);
  margin: 6px 0;
}
</style>
