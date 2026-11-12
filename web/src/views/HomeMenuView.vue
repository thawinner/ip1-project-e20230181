<script setup lang="ts">
import { computed } from 'vue'
import WelcomeBand, { type WaitingLink } from '@/components/home/WelcomeBand.vue'
import AppTile from '@/components/home/AppTile.vue'
import { appsFor } from '@/apps'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { lastVisit } from '@/utils/lastVisit'
import { useCounts } from '@/composables/useCounts'
import { useRecordDialog } from '@/composables/useRecordDialog'

const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()
const { counts } = useCounts()

const apps = computed(() => (auth.user ? appsFor(auth.user.role) : []))
const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

const waiting = computed<WaitingLink[]>(() => {
  const links: WaitingLink[] = []
  const { pending, low, rejected } = counts.value
  if (auth.isManager) {
    if (pending) links.push({ text: plural(pending, 'write-off waiting', 'write-offs waiting'), to: '/approvals' })
  } else {
    const myPending = movements.mine.filter((m) => m.status === 'PENDING').length
    if (rejected) links.push({ text: plural(rejected, 'write-off rejected', 'write-offs rejected'), to: '/moves?status=rejected' })
    if (myPending) links.push({ text: plural(myPending, 'write-off waiting', 'write-offs waiting'), to: '/moves?status=pending' })
  }
  if (low) {
    const to = auth.isManager ? '/reorder' : '/products?stock=low'
    links.push({ text: plural(low, 'product running low', 'products running low'), to })
  }
  const noPassword = auth.isManager ? catalog.users.filter((u) => u.isActive && u.mustChangePassword).length : 0
  if (noPassword) {
    const text = plural(noPassword, 'account without a password yet', 'accounts without a password yet')
    links.push({ text, to: '/staff' })
  }
  return links
})

// The last product or move opened in this tab, if this person can still open it
const continueLink = computed<WaitingLink | null>(() => {
  const visit = lastVisit()
  if (!visit || visit.userId !== auth.user?.id) return null
  if (visit.kind === 'product') {
    const p = products.byId(visit.id)
    return p && (p.isActive || auth.isManager) ? { text: `Continue: ${p.name}`, to: `/products/${p.id}` } : null
  }
  const canOpen = auth.isManager || movements.mine.some((m) => m.id === visit.id)
  return canOpen ? { text: `Continue: Move #${visit.id}`, to: `/moves/${visit.id}` } : null
})

const record = useRecordDialog()
</script>

<template>
  <div class="home">
    <WelcomeBand :name="firstName" :waiting="waiting" :continue-link="continueLink" @receive="record.open('IN')" @send-out="record.open('OUT')" />
    <section class="panel apps" aria-label="Apps">
      <nav class="grid" :class="{ four: apps.length === 4 }" aria-label="Apps">
        <AppTile v-for="app in apps" :key="app.id" :app="app" :count="app.count ? counts[app.count] : undefined" />
      </nav>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: 48px;
}

.apps {
  max-width: 960px;
  margin: -56px auto 0;
  padding: 36px 32px;
  box-shadow:
    0 4px 16px rgba(16, 24, 40, 0.08),
    0 0 0 1px rgba(16, 24, 40, 0.04);
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 28px 16px;
}

.grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (max-width: 1000px) {
  .apps {
    margin-left: 24px;
    margin-right: 24px;
  }
}

@media (max-width: 720px) {
  .apps {
    margin: -40px 16px 0;
    padding: 16px 10px;
  }

  .grid,
  .grid.four {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px 6px;
  }
}
</style>
