<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NotFoundView from './NotFoundView.vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import FieldGroup, { type Field } from '@/components/products/FieldGroup.vue'
import MoveHistory from '@/components/moves/MoveHistory.vue'
import RejectDialog from '@/components/approvals/RejectDialog.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import RecordPager from '@/components/products/RecordPager.vue'
import { useLastMoves } from '@/composables/useLastMoves'
import ErrorState from '@/components/states/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import { errorMessage } from '@/utils/errors'
import { changeText, formatFullDateTime, money, quantityText, reasonLabel, signed } from '@/utils/format'

// From the route /moves/:id (props: true)
const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()
const toast = useToast()
const router = useRouter()

const moveId = computed(() => Number(props.id))
const validId = computed(() => Number.isInteger(moveId.value) && moveId.value > 0)

// "3 / 10 ‹ ›" through the list you came from (shown only when this move is in it)
const listIds = useLastMoves().ids
const position = computed(() => listIds.value.indexOf(moveId.value) + 1)
const go = (step: number) => router.push(`/moves/${listIds.value[position.value - 1 + step]}`)

function load() {
  if (!validId.value) return
  movements.fetchOne(moveId.value)
  if (!products.all.length) products.fetchAll()
}
watch(moveId, load, { immediate: true })

const move = computed(() => (movements.current?.id === moveId.value ? movements.current : null))
const product = computed(() => (move.value ? products.byId(move.value.productId) : undefined))
watch(move, (m) => {
  if (m) document.title = `ShopStock · Move #${m.id}`
})

const TYPE = {
  IN: { label: 'In', css: 'in' },
  OUT: { label: 'Out', css: 'out' },
  ADJUST: { label: 'Adjustment', css: 'adj' },
} as const

const amount = computed(() => {
  const m = move.value
  if (!m) return ''
  return product.value ? changeText(m.change, product.value.unit) : signed(m.change)
})

// Staff have no list of users: their own name, and "Manager" for the person who reviewed it
const recordedBy = computed(() => {
  const m = move.value
  if (!m) return ''
  return m.userId === auth.user?.id ? auth.user.fullName : catalog.userName(m.userId)
})
const reviewedBy = computed(() => {
  const id = move.value?.reviewedById
  if (id === null || id === undefined) return ''
  return catalog.userName(id) || 'Manager'
})

const moveFields = computed<Field[]>(() => {
  const m = move.value
  if (!m) return []
  return [
    { label: 'Product', value: product.value?.name ?? `Product #${m.productId}`, to: `/products/${m.productId}` },
    { label: 'Type', value: TYPE[m.type].label, badge: TYPE[m.type].css },
    { label: 'Reason', value: reasonLabel(m) },
    { label: 'Quantity', value: amount.value },
    m.status === 'APPLIED'
      ? { label: 'Stock after', value: product.value ? quantityText(m.quantityAfter, product.value.unit) : String(m.quantityAfter) }
      : { label: 'Stock after', value: m.status === 'PENDING' ? 'Not changed yet' : 'Not changed', muted: true },
  ]
})

const detailFields = computed<Field[]>(() => {
  const m = move.value
  if (!m) return []
  const fields: Field[] = [
    { label: 'Recorded by', value: recordedBy.value },
    { label: 'Date', value: formatFullDateTime(m.createdAt) },
  ]
  if (m.reason === 'PURCHASE') {
    fields.push({ label: 'Supplier', value: catalog.supplierName(m.supplierId) })
    fields.push({ label: 'Invoice no.', value: m.invoiceNo ?? '—', mono: !!m.invoiceNo })
  }
  if (m.reviewedById !== null) {
    fields.push({ label: m.status === 'REJECTED' ? 'Rejected by' : 'Approved by', value: reviewedBy.value })
  }
  // Story 6: staff never see cost prices
  if (auth.isManager) {
    fields.push({ label: 'Unit cost', value: money(m.unitCost), help: 'Cost price when it was recorded' })
    fields.push({ label: 'Value', value: money(Math.abs(m.change) * m.unitCost) })
  }
  return fields
})

// Manager: approve or reject a waiting write-off right here
const busy = ref(false)
const rejecting = ref(false)
const rejectError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const canReview = computed(() => auth.isManager && move.value?.status === 'PENDING')

async function approve() {
  if (!move.value) return
  busy.value = true
  actionError.value = null
  try {
    await movements.approve(move.value.id)
    toast.show('success', 'Write-off approved.')
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

function openReject() {
  rejecting.value = true
  rejectError.value = null
}

async function confirmReject(reason: string) {
  if (!move.value) return
  busy.value = true
  try {
    await movements.reject(move.value.id, reason)
    rejecting.value = false
    toast.show('success', 'Write-off rejected. The storekeeper can see your reason.')
  } catch (e) {
    rejectError.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <NotFoundView v-if="!validId || movements.currentNotFound" />

  <template v-else>
    <div class="page-band">
      <div class="page-band-inner band">
        <h1>Move #{{ moveId }}</h1>
        <RecordPager
          v-if="position > 0"
          class="pager-right"
          noun="move"
          :index="position"
          :total="listIds.length"
          @prev="go(-1)"
          @next="go(1)"
        />
      </div>
    </div>

    <div class="page">
      <section v-if="movements.currentLoading && !move" class="panel"><LoadingState message="Loading the move…" /></section>
      <ErrorState v-else-if="movements.currentError" :message="movements.currentError" @retry="load" />

      <template v-else-if="move">
        <div v-if="canReview" class="actions">
          <BaseButton variant="success" :loading="busy && !rejecting" loading-text="Approving…" @click="approve">
            <AppIcon name="check" :size="16" /> Approve
          </BaseButton>
          <BaseButton :disabled="busy" @click="openReject">Reject</BaseButton>
        </div>
        <FormAlert v-if="actionError" kind="error" :message="actionError" class="alert" />

        <div class="layout">
          <article class="panel sheet">
            <header class="title">
              <div>
                <p class="label">{{ amount }}</p>
                <h2>{{ product?.name ?? `Product #${move.productId}` }}</h2>
                <p class="sub">
                  <span class="badge" :class="TYPE[move.type].css">{{ TYPE[move.type].label }}</span>
                  <StatusBadge :status="move.status" />
                  <span class="muted">{{ formatFullDateTime(move.createdAt) }}</span>
                </p>
              </div>
              <span class="thumb pic"><AppIcon name="box" :size="32" /></span>
            </header>

            <p v-if="move.status === 'PENDING'" class="hint wait">
              <AppIcon name="clock" :size="16" /> Waiting for the manager's approval. Stock does not change until then.
            </p>
            <p v-else-if="move.status === 'REJECTED'" class="hint bad">
              <AppIcon name="alert" :size="16" /> Rejected: {{ move.rejectReason }}
            </p>

            <div class="groups">
              <FieldGroup title="Move" :fields="moveFields" />
              <FieldGroup title="Details" :fields="detailFields" />
            </div>

            <section v-if="move.note" class="note">
              <h3>Note</h3>
              <p>{{ move.note }}</p>
            </section>
          </article>

          <MoveHistory :movement="move" :recorded-by="recordedBy" :reviewed-by="reviewedBy" :amount="amount" />
        </div>
      </template>

      <RejectDialog
        :open="rejecting"
        :busy="busy"
        :server-error="rejectError"
        @confirm="confirmReject"
        @cancel="rejecting = false"
      />
    </div>
  </template>
</template>

<style scoped>
.band {
  padding-top: 20px;
  padding-bottom: 20px;
}

.pager-right {
  margin-left: auto;
}

.band h1 {
  font-size: 24px;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.alert {
  margin-bottom: 12px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--side-w);
  gap: 20px;
  align-items: stretch;
}

.sheet {
  padding: 28px 32px 32px;
}

.title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.title h2 {
  margin: 4px 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
}

.pic {
  width: 72px;
  height: 72px;
}

.hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding: 10px 12px;
  border-radius: var(--radius);
  font-size: 13px;
}

.hint.wait {
  background: var(--low-bg);
  color: var(--low-fg);
}

.hint.bad {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px 40px;
}

.note {
  margin-top: 16px;
}

.note h3 {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--row);
  font-size: 14px;
}

.note p {
  margin: 0;
}

@media (max-width: 1000px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .sheet {
    padding: 16px;
  }
}
</style>
