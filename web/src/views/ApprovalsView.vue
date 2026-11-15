<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ApprovalTable, { type ApprovalRow } from '@/components/approvals/ApprovalTable.vue'
import RejectDialog from '@/components/approvals/RejectDialog.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import SearchBox, { type FilterTag } from '@/components/search/SearchBox.vue'
import FilterMenu from '@/components/search/FilterMenu.vue'
import {
  applyFilters,
  groupRows,
  resetTag,
  viewTags,
  NO_DEFAULTS,
  type FilterOption,
  type GroupOption,
} from '@/components/search/filters'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import type { Id } from '@/types'
import { errorMessage } from '@/utils/errors'
import { useToast } from '@/composables/useToast'
import { quantityText, reasonLabel } from '@/utils/format'
import { sortRows, type SortKeys, type SortState } from '@/utils/sort'
import { useLastMoves } from '@/composables/useLastMoves'

const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()

const toast = useToast()
const loading = ref(true)
const search = ref('')
const filters = ref<string[]>([])
const groupBy = ref<string | null>(null)

// Filters ▾ like the design: the reason, and write-offs bigger than what is left in storage
const FILTERS: FilterOption<ApprovalRow>[][] = [
  [
    { id: 'DAMAGED', label: 'Damaged', test: (r) => r.movement.reason === 'DAMAGED' },
    { id: 'EXPIRED', label: 'Expired', test: (r) => r.movement.reason === 'EXPIRED' },
    { id: 'RETURN_TO_SUPPLIER', label: 'Return to supplier', test: (r) => r.movement.reason === 'RETURN_TO_SUPPLIER' },
  ],
  [{ id: 'short', label: 'Not enough stock', test: (r) => -r.movement.change > (r.product?.quantity ?? 0) }],
]
const GROUP_BYS: GroupOption<ApprovalRow>[] = [
  { id: 'reason', label: 'Reason', key: (r) => ({ id: r.movement.reason ?? '', title: reasonLabel(r.movement) }) },
  { id: 'user', label: 'Recorded by', key: (r) => ({ id: r.movement.userId, title: r.recordedBy }) },
  { id: 'product', label: 'Product', key: (r) => ({ id: r.movement.productId, title: r.product?.name ?? '' }) },
]
const SORT_KEYS: SortKeys<ApprovalRow> = {
  date: (r) => r.movement.createdAt,
  product: (r) => r.product?.name ?? '',
  reason: (r) => reasonLabel(r.movement),
  quantity: (r) => -r.movement.change,
  loss: (r) => -r.movement.change * r.movement.unitCost,
  user: (r) => r.recordedBy,
}
const sort = ref<SortState | null>({ id: 'date', dir: 'asc' }) // oldest first: they waited longest
const selected = ref<Id[]>([])
const busyId = ref<Id | null>(null)
const rejectingIds = ref<Id[] | null>(null)
const rejectError = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function load() {
  loading.value = true
  await Promise.all([movements.fetchPending(), products.fetchAll()])
  loading.value = false
}
onMounted(load)

const allRows = computed<ApprovalRow[]>(() =>
  movements.pending.map((movement) => ({
    movement,
    product: products.byId(movement.productId),
    recordedBy: catalog.userName(movement.userId),
  })),
)

// Search by product, SKU, note or who recorded it; then the filters
const rows = computed(() => {
  const text = search.value.trim().toLowerCase()
  const found = allRows.value.filter(
    (row) =>
      !text ||
      [row.product?.name, row.product?.sku, row.movement.note, row.recordedBy].some((v) => v?.toLowerCase().includes(text)),
  )
  return applyFilters(found, FILTERS, filters.value)
})
const DEFAULTS = NO_DEFAULTS
const groupOption = computed(() => GROUP_BYS.find((g) => g.id === groupBy.value) ?? null)
const groups = computed(() => groupRows(sortRows(rows.value, sort.value, SORT_KEYS), groupOption.value))

// The move page pages through these rows, in the order shown
const lastMoves = useLastMoves()
watch(groups, (list) => (lastMoves.ids.value = list.flatMap((g) => g.rows.map((r) => r.movement.id))), {
  immediate: true,
})

// Ticks only for write-offs still on the list (search, filters, or one just approved)
watch(rows, (list) => {
  selected.value = selected.value.filter((id) => list.some((r) => r.movement.id === id))
})

const tags = computed<FilterTag[]>(() => {
  const list = viewTags(FILTERS, GROUP_BYS, filters.value, groupBy.value, DEFAULTS)
  return list
})

function removeTag(id: string) {
  const next = resetTag(FILTERS, filters.value, groupBy.value, DEFAULTS, id)
  filters.value = next.on
  groupBy.value = next.group
}

const writeOffs = (n: number) => `${n} ${n === 1 ? 'write-off' : 'write-offs'}`

// One by one, so a write-off that no longer fits the stock does not stop the others
async function approve(ids: Id[]) {
  actionError.value = null
  const failed: string[] = []
  let last = null
  for (const id of ids) {
    busyId.value = id
    try {
      last = await movements.approve(id)
    } catch (e) {
      failed.push(`#${id}: ${errorMessage(e)}`)
    }
  }
  busyId.value = null
  const done = ids.length - failed.length
  if (failed.length) actionError.value = `Not approved: ${failed.join('; ')}`
  if (!done) return
  const p = last && ids.length === 1 ? products.byId(last.productId) : undefined
  toast.show('success', p ? `Write-off approved. ${p.name} now has ${quantityText(p.quantity, p.unit)}.` : `${writeOffs(done)} approved.`)
}

function openReject(ids: Id[]) {
  rejectingIds.value = ids
  rejectError.value = null
}

async function confirmReject(reason: string) {
  const ids = rejectingIds.value
  if (!ids) return
  try {
    for (const id of ids) {
      busyId.value = id
      await movements.reject(id, reason)
    }
    rejectingIds.value = null
    toast.show(
      'success',
      ids.length === 1 ? 'Write-off rejected. The storekeeper can see your reason.' : `${writeOffs(ids.length)} rejected.`,
    )
  } catch (e) {
    rejectError.value = errorMessage(e)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">To approve</h1>
      <div v-if="selected.length" class="bulk">
        <span class="selection">{{ selected.length }} selected</span>
        <button type="button" class="btn btn-success" :disabled="busyId !== null" @click="approve([...selected])">
          <AppIcon name="check" :size="16" /> Approve
        </button>
        <button type="button" class="btn btn-outline" :disabled="busyId !== null" @click="openReject([...selected])">
          Reject
        </button>
      </div>
      <SearchBox
        v-model="search"
        class="search"
        input-id="approval-search"
        placeholder="Search…"
        :tags="tags"
        @remove-tag="removeTag"
      >
        <FilterMenu
          v-model:on="filters"
          v-model:group="groupBy"
          :options="FILTERS"
          :group-bys="GROUP_BYS"
          :defaults="DEFAULTS"
        />
      </SearchBox>
      <span v-if="!loading" class="muted waiting">{{ movements.pendingCount }} waiting</span>
    </div>
  </div>

  <div class="page">
    <FormAlert v-if="actionError" kind="error" :message="actionError" class="alert" />

    <section class="panel">
      <LoadingState v-if="loading" message="Loading write-offs…" />
      <div v-else-if="movements.error" class="pad"><ErrorState :message="movements.error" @retry="load" /></div>
      <EmptyState
        v-else-if="allRows.length === 0"
        icon="check"
        message="Nothing to approve"
        detail="Write-offs from storekeepers show here until you approve or reject them."
      />
      <EmptyState
        v-else-if="rows.length === 0"
        icon="search"
        message="No write-offs match your search"
      />
      <ApprovalTable
        v-else
        v-model:sort="sort"
        v-model:selected="selected"
        :groups="groups"
        :busy-id="busyId"
        @approve="approve([$event])"
        @reject="openReject([$event])"
      />
    </section>

    <RejectDialog
      :open="rejectingIds !== null"
      :count="rejectingIds?.length ?? 1"
      :busy="busyId !== null && rejectingIds !== null"
      :server-error="rejectError"
      @confirm="confirmReject"
      @cancel="rejectingIds = null"
    />
  </div>
</template>

<style scoped>
.search {
  flex: 0 1 560px;
}

.bulk {
  display: flex;
  align-items: center;
  gap: 8px;
}

.waiting {
  margin-left: auto;
  font-size: 13px;
}

.panel {
  overflow: hidden;
}

.alert {
  margin-bottom: 12px;
}

.pad {
  padding: 16px;
}
</style>
