<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import AttentionPanel from '@/components/dashboard/AttentionPanel.vue'
import ActivityPanel, { type Activity } from '@/components/dashboard/ActivityPanel.vue'
import RejectDialog from '@/components/approvals/RejectDialog.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import type { Task } from '@/components/dashboard/TaskRow.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { errorMessage } from '@/utils/errors'
import { useToast } from '@/composables/useToast'
import { useRecordDialog } from '@/composables/useRecordDialog'
import { changeText, formatDateTime, formatLongDate, isToday, quantityText, reasonLabel, signed } from '@/utils/format'
import type { Id, StockMovement } from '@/types'

const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()

const toast = useToast()
const loading = ref(true)
const busyId = ref<Id | null>(null)
const rejectingId = ref<Id | null>(null)
const rejectError = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function load() {
  loading.value = true
  const requests = [products.fetchAll(), movements.fetchMine()]
  if (auth.isManager) requests.push(movements.fetchPending(), movements.fetchRecent())
  await Promise.all(requests)
  loading.value = false
}
onMounted(load)

const firstName = (userId: Id) => catalog.userName(userId).split(' ')[0] ?? ''

function describe(m: StockMovement) {
  const product = products.byId(m.productId)
  const n = Math.abs(m.change)
  return {
    name: product?.name ?? `Product #${m.productId}`,
    amount: product ? quantityText(n, product.unit) : String(n),
    signedAmount: product ? changeText(m.change, product.unit) : signed(m.change),
  }
}

// Story 6 (staff) and story 8 (manager): what needs doing first
const tasks = computed<Task[]>(() => {
  const list: Task[] = []
  const low = products.lowStock

  if (auth.isManager) {
    for (const m of movements.pending) {
      const { name, signedAmount } = describe(m)
      list.push({
        id: `approve-${m.id}`,
        tone: 'warn',
        icon: 'clock',
        title: `${name}: ${signedAmount} ${reasonLabel(m).toLowerCase()}`,
        detail: [catalog.userName(m.userId), formatDateTime(m.createdAt), m.note ? `“${m.note}”` : '']
          .filter(Boolean)
          .join(' · '),
        approveId: m.id,
      })
    }
    // Story 1: accounts still on the temporary password the manager gave them
    for (const u of catalog.users.filter((u) => u.isActive && u.mustChangePassword)) {
      list.push({
        id: `password-${u.id}`,
        tone: 'info',
        icon: 'key',
        title: `${u.fullName} has not set a password yet`,
        detail: 'They log in with the temporary password you gave them.',
        link: { label: 'Open', to: `/staff/${u.id}` },
      })
    }
    if (low.length) {
      list.push({
        id: 'reorder',
        tone: 'danger',
        icon: 'bell',
        title: `${low.length} ${low.length === 1 ? 'product needs' : 'products need'} reordering`,
        detail: low.map((p) => `${p.name} (${quantityText(p.quantity, p.unit)})`).join(' · '),
        link: { label: 'Reorder list', to: '/reorder' },
      })
    }
    return list
  }

  // Rejected first: the storekeeper has to act on them
  const mine = [...movements.mine].sort((a, b) => Number(b.status === 'REJECTED') - Number(a.status === 'REJECTED'))
  for (const m of mine) {
    if (m.status === 'APPLIED') continue
    const { name, signedAmount } = describe(m)
    const rejected = m.status === 'REJECTED'
    list.push({
      id: `mine-${m.id}`,
      tone: rejected ? 'danger' : 'warn',
      icon: rejected ? 'alert' : 'clock',
      title: rejected ? `Rejected: ${name} ${signedAmount}` : `Waiting for the manager: ${name} ${signedAmount}`,
      detail: rejected
        ? `The manager: “${m.rejectReason ?? ''}”`
        : `${reasonLabel(m)} · ${formatDateTime(m.createdAt)}`,
      link: { label: 'Open', to: `/moves/${m.id}` },
    })
  }
  if (low.length) {
    list.push({
      id: 'low',
      tone: 'danger',
      icon: 'bell',
      title: `${low.length} ${low.length === 1 ? 'product is' : 'products are'} running low`,
      detail: 'Tell the manager or check the shelf.',
      link: { label: 'See them', to: '/products?stock=low' },
    })
  }
  return list
})

const todayCount = computed(() => movements.mine.filter((m) => isToday(m.createdAt)).length)

const summary = computed(() => {
  const today = todayCount.value
    ? `You recorded ${todayCount.value} ${todayCount.value === 1 ? 'move' : 'moves'} today`
    : 'Nothing recorded yet today'
  const n = tasks.value.length
  const attention = n ? `${n} ${n === 1 ? 'thing needs' : 'things need'} your attention` : 'All caught up'
  return `${today} · ${attention}`
})

function verb(m: StockMovement) {
  if (m.type === 'IN') return 'received'
  if (m.type === 'OUT') return 'sent out'
  return 'adjusted'
}

const activity = computed<Activity[]>(() => {
  const list = auth.isManager ? movements.recent : movements.mine.slice(0, 6)
  return list.map((m) => {
    const { name, amount } = describe(m)
    const status = m.status === 'APPLIED' ? '' : ` · ${m.status.toLowerCase()}`
    return {
      id: m.id,
      who: auth.isManager ? firstName(m.userId) : null,
      verb: verb(m),
      amount,
      productId: m.productId,
      productName: name,
      when: `${formatDateTime(m.createdAt)} · ${reasonLabel(m)}${status}`,
      kind: m.type === 'IN' ? 'in' : m.type === 'OUT' ? 'out' : 'adj',
    }
  })
})

async function approve(id: Id) {
  busyId.value = id
  actionError.value = null
  try {
    const movement = await movements.approve(id)
    const p = products.byId(movement.productId)
    toast.show('success', p ? `Write-off approved. ${p.name} now has ${quantityText(p.quantity, p.unit)}.` : 'Write-off approved.')
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    busyId.value = null
  }
}

async function confirmReject(reason: string) {
  if (rejectingId.value === null) return
  busyId.value = rejectingId.value
  try {
    await movements.reject(rejectingId.value, reason)
    rejectingId.value = null
    toast.show('success', 'Write-off rejected. The storekeeper can see your reason.')
  } catch (e) {
    rejectError.value = errorMessage(e)
  } finally {
    busyId.value = null
  }
}

function openReject(id: Id) {
  rejectingId.value = id
  rejectError.value = null
}

const record = useRecordDialog()
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner head">
      <h1 class="sr-only">Today</h1>
      <p class="date">{{ formatLongDate() }}</p>
      <p class="muted">{{ loading ? 'Loading…' : summary }}</p>
    </div>
  </div>

  <div class="page">
    <QuickActions :is-manager="auth.isManager" @receive="record.open('IN')" @send-out="record.open('OUT')" />

    <FormAlert v-if="actionError" kind="error" :message="actionError" class="alert" />

    <section v-if="loading" class="panel state"><LoadingState message="Loading your day…" /></section>
    <ErrorState
      v-else-if="movements.error || products.error"
      class="state"
      :message="movements.error || products.error || ''"
      @retry="load"
    />
    <div v-else class="grid">
      <AttentionPanel :tasks="tasks" :busy="busyId !== null" @approve="approve" @reject="openReject" />
      <ActivityPanel
        :title="auth.isManager ? 'Recent activity' : 'My recent moves'"
        :items="activity"
        see-all="/moves"
      />
    </div>

    <RejectDialog
      :open="rejectingId !== null"
      :busy="busyId !== null && busyId === rejectingId"
      :server-error="rejectError"
      @confirm="confirmReject"
      @cancel="rejectingId = null"
    />
  </div>
</template>

<style scoped>
.head {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-top: 20px;
  padding-bottom: 18px;
}

.head p {
  margin: 0;
}

.date {
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.page {
  padding-top: 16px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 16px;
  align-items: start;
  margin-top: 20px;
}

.alert {
  margin-top: 16px;
}

.state {
  margin-top: 20px;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
