<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SectionSwitcher from './SectionSwitcher.vue'
import SectionMenu, { type MenuItem } from './SectionMenu.vue'
import GlobalSearch from './GlobalSearch.vue'
import AccountMenu from './AccountMenu.vue'
import { appsFor, type AppPage } from '@/apps'
import { useAuthStore } from '@/stores/auth'
import { useCounts } from '@/composables/useCounts'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { counts } = useCounts()

const apps = computed(() => (auth.user ? appsFor(auth.user.role) : []))
const current = computed(() => apps.value.find((a) => a.id === route.meta.app) ?? null)

// "/products?stock=low" → Low stock; any other "/products…" → All products
function matches(page: AppPage) {
  if (page.path !== route.path) return false
  return Object.entries(page.query ?? {}).every(([key, value]) => route.query[key] === value)
}

const menuItems = computed<MenuItem[]>(() => {
  const app = current.value
  if (!app || (app.pages.length === 1 && app.pages[0]?.label === app.label)) return []
  const best = [...app.pages]
    .filter(matches)
    .sort((a, b) => Object.keys(b.query ?? {}).length - Object.keys(a.query ?? {}).length)[0]
  return app.pages.map((page) => ({
    label: page.label,
    to: { path: page.path, query: page.query },
    current: page === best,
    count: page.count ? counts.value[page.count] : undefined,
  }))
})

// While a temporary password is being replaced, only the account menu (Log out) is shown
const restricted = computed(() => auth.mustChangePassword)

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header v-if="auth.user" class="topbar">
    <RouterLink
      v-if="!restricted"
      to="/"
      class="nav-btn home-btn"
      aria-label="Home menu"
      title="Home menu"
      :aria-current="route.name === 'home' ? 'page' : undefined"
    >
      <AppIcon name="apps" :size="20" />
    </RouterLink>

    <SectionSwitcher v-if="current && !restricted" :current="current" :apps="apps" :counts="counts" :pages="menuItems" />
    <RouterLink v-else to="/" class="brand"><span>Shop<b>Stock</b></span></RouterLink>

    <SectionMenu v-if="menuItems.length && !restricted" :items="menuItems" />

    <div class="tray">
      <GlobalSearch v-if="!restricted" />
      <AccountMenu :user="auth.user" :restricted="restricted" @logout="logout" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--top);
  padding: 0 16px;
  background: var(--nav-bg);
  color: var(--nav-fg);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

.home-btn {
  margin-left: -8px;
  height: var(--top);
  padding: 0 14px;
  border-radius: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  color: var(--nav-fg);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.brand b {
  color: var(--nav-accent);
}

.tray {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

@media (max-width: 720px) {
  .topbar {
    padding: 0 8px 0 12px;
  }
}
</style>
