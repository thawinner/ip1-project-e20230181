<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SearchBox, { type FilterTag } from '@/components/search/SearchBox.vue'
import FilterMenu from '@/components/search/FilterMenu.vue'
import MovesTable, { type MoveRow } from '@/components/moves/MovesTable.vue'
import ListPager from '@/components/products/ListPager.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import {
  groupRows,
  resetTag,
  viewTags,
  type DefaultView,
  type FilterChoice,
  type GroupOption,
} from '@/components/search/filters'
import { listMovements, type MovementQuery } from '@/api/movements'
import { useRecordDialog } from '@/composables/useRecordDialog'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { WRITE_OFF_REASONS, type MovementStatus, type MovementType, type Reason } from '@/types'
import { formatDateTime, reasonLabel, statusLabel, todayKey } from '@/utils/format'
import { downloadFile, toCsv } from '@/utils/csv'
import { errorMessage } from '@/utils/errors'
import type { SortState } from '@/utils/sort'
import { useLastMoves } from '@/composables/useLastMoves'

// /moves: a storekeeper sees their own moves (story 6), the manager everyone's.
// Write-off history (`fixed: 'writeoff'`) and Moves by product (`group: 'product'`) are this page too.
const props = withDefaults(defineProps<{ fixed?: string; group?: string }>(), {
  fixed: undefined,
  group: undefined,
})

const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()
const route = useRoute()
const record = useRecordDialog()
const toast = useToast()
const scope = computed(() => (auth.isManager ? 'all' : 'mine'))
// The storekeeper's section is called "My moves": the tab says so too
if (scope.value === 'mine') document.title = 'ShopStock · My moves'

// The ids below are only for the menu; the page turns them into a query for the API (`query()`)
const TYPE_IDS: Record<string, MovementType> = { in: 'IN', out: 'OUT', adjust: 'ADJUST' }
const STATUS_IDS: Record<string, MovementStatus> = { pending: 'PENDING', applied: 'APPLIED', rejected: 'REJECTED' }
const REASON_IDS: Record<string, readonly Reason[]> = {
  delivery: ['PURCHASE'],
  toshop: ['TO_SHOP'],
  writeoff: WRITE_OFF_REASONS,
}

function daysAgo(n: number) {
  const d = new Date()
  return todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n))
}
const SINCE: Record<string, () => string> = {
  today: () => daysAgo(0),
  week: () => daysAgo(6),
  d30: () => daysAgo(29),
  month: () => todayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
}

// Filters ▾ like the design (the API does the filtering, from `query()`)
const FILTERS: FilterChoice[][] = [
  [
    { id: 'in', label: 'In' },
    { id: 'out', label: 'Out' },
    { id: 'adjust', label: 'Adjustment' },
  ],
  [
    { id: 'pending', label: 'Pending' },
    { id: 'applied', label: 'Applied' },
    { id: 'rejected', label: 'Rejected' },
  ],
  [
    { id: 'delivery', label: 'Deliveries' },
    { id: 'toshop', label: 'To the shop' },
    { id: 'writeoff', label: 'Write-offs' },
  ],
  [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Last 7 days' },
    { id: 'd30', label: 'Last 30 days' },
    { id: 'month', label: 'This month' },
  ],
]

const day = (iso: string) => iso.slice(0, 10)
const GROUP_BYS = computed<GroupOption<MoveRow>[]>(() => {
  const list: GroupOption<MoveRow>[] = [
    { id: 'product', label: 'Product', key: (r) => ({ id: r.movement.productId, title: r.product?.name ?? '' }) },
    {
      id: 'type',
      label: 'Type',
      key: (r) => ({ id: r.movement.type, title: { IN: 'In', OUT: 'Out', ADJUST: 'Adjustment' }[r.movement.type] }),
    },
    { id: 'reason', label: 'Reason', key: (r) => ({ id: r.movement.reason ?? 'ADJUST', title: reasonLabel(r.movement) }) },
    { id: 'status', label: 'Status', key: (r) => ({ id: r.movement.status, title: statusLabel(r.movement.status) }) },
    {
      id: 'day',
      label: 'Day',
      // newest day first: the order is the day turned around
      key: (r) => ({
        id: day(r.movement.createdAt),
        title: new Date(r.movement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        order: -Number(day(r.movement.createdAt).replace(/-/g, '')),
      }),
    },
  ]
  if (scope.value === 'all') {
    list.push({ id: 'user', label: 'Recorded by', key: (r) => ({ id: r.movement.userId, title: r.recordedBy }) })
    list.push({
      id: 'supplier',
      label: 'Supplier',
      key: (r) => ({
        id: r.movement.supplierId ?? 0,
        title: r.movement.supplierId ? catalog.supplierName(r.movement.supplierId) : 'No supplier',
        order: r.movement.supplierId ? catalog.supplierName(r.movement.supplierId) : '~',
      }),
    })
  }
  return list
})

// Links name a filter in the address: /moves?status=pending, /moves?reason=writeoff, /moves?type=in.
// Without one, the page opens on the last 30 days.
const QUERY_KEYS = ['type', 'status', 'reason'] as const // the first three filter groups, in order

function startFilters() {
  if (props.fixed) return [props.fixed]
  const named = QUERY_KEYS.flatMap((key, i) => {
    const value = route.query[key]
    return typeof value === 'string' && FILTERS[i]?.some((f) => f.id === value) ? [value] : []
  })
  return named.length ? named : ['d30']
}

const search = ref('')
const searchQuery = ref('')
const filters = ref<string[]>(startFilters())
const groupBy = ref<string | null>(props.group ?? null)

// The usual view of this page (the last 30 days, or the section's filter); only changes from it get a tag
const DEFAULTS = computed<DefaultView>(() => ({
  on: startFilters(),
  group: props.group ?? null,
  anyLabel: { 3: 'All dates' },
}))
const page = ref(1)
const perPage = ref(10)
const sort = ref<SortState | null>({ id: 'date', dir: 'desc' }) // newest first

watch(
  () => QUERY_KEYS.map((key) => route.query[key]),
  () => (filters.value = startFilters()),
)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (text) => {
  clearTimeout(timer)
  timer = setTimeout(() => (searchQuery.value = text), 300)
})
onBeforeUnmount(() => clearTimeout(timer))

function query(): MovementQuery {
  const on = filters.value
  // Several dates ticked: the widest one
  const since = on
    .filter((id) => SINCE[id])
    .map((id) => SINCE[id]!())
    .sort()[0]
  return {
    search: searchQuery.value,
    types: on.flatMap((id) => (TYPE_IDS[id] ? [TYPE_IDS[id]] : [])),
    statuses: on.flatMap((id) => (STATUS_IDS[id] ? [STATUS_IDS[id]] : [])),
    reasons: on.flatMap((id) => REASON_IDS[id] ?? []),
    since,
    sort: sort.value ?? undefined,
    page: page.value,
    perPage: perPage.value,
  }
}

function load() {
  return movements.fetchPage(query(), scope.value === 'mine')
}

watch([searchQuery, filters, perPage, sort], () => (page.value = 1))
watch([searchQuery, filters, page, perPage, sort, scope], load, { immediate: true })
onMounted(() => {
  if (!products.all.length) products.fetchAll()
})

const groupOption = computed(() => GROUP_BYS.value.find((g) => g.id === groupBy.value) ?? null)

const tags = computed<FilterTag[]>(() => {
  const list = viewTags(FILTERS, GROUP_BYS.value, filters.value, groupBy.value, DEFAULTS.value)
  return list
})

function removeTag(id: string) {
  const next = resetTag(FILTERS, filters.value, groupBy.value, DEFAULTS.value, id)
  filters.value = next.on
  groupBy.value = next.group
}

const filtered = computed(() => searchQuery.value.trim() !== '' || filters.value.length > 0)

function clearAll() {
  search.value = ''
  searchQuery.value = ''
  filters.value = []
}

const rows = computed<MoveRow[]>(() =>
  movements.page.items.map((movement) => ({
    movement,
    product: products.byId(movement.productId),
    recordedBy: scope.value === 'mine' ? (auth.user?.fullName ?? '') : catalog.userName(movement.userId),
  })),
)
const groups = computed(() => groupRows(rows.value, groupOption.value))

// The move page pages through these rows, in the order shown
const lastMoves = useLastMoves()
watch(groups, (list) => (lastMoves.ids.value = list.flatMap((g) => g.rows.map((r) => r.movement.id))), {
  immediate: true,
})

const placeholder = computed(() =>
  scope.value === 'mine' ? 'Search by product, invoice or note…' : 'Search by product, person, supplier or invoice…',
)

// "1–10 / 18" and ‹ › in the toolbar, like the pager under the list
const from = computed(() => (movements.page.total ? (page.value - 1) * perPage.value + 1 : 0))
const to = computed(() => Math.min(page.value * perPage.value, movements.page.total))

// Export: every move that matches the search and filters (not only this page) as a CSV file
const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    const all = await listMovements({ ...query(), page: 1, perPage: 100_000 })
    const header = ['Date', 'Product', 'SKU', 'Type', 'Reason', 'Quantity', 'Stock after', 'Supplier', 'Invoice no.']
    const out = all.items.map((m) => {
      const p = products.byId(m.productId)
      return [
        formatDateTime(m.createdAt),
        p?.name,
        p?.sku,
        m.type,
        reasonLabel(m),
        m.change,
        m.status === 'APPLIED' ? m.quantityAfter : '',
        m.supplierId ? catalog.supplierName(m.supplierId) : '',
        m.invoiceNo,
        catalog.userName(m.userId),
        statusLabel(m.status),
        (m.change * m.unitCost).toFixed(2),
      ]
    })
    downloadFile('shopstock-moves.csv', toCsv([[...header, 'Recorded by', 'Status', 'Value'], ...out]))
    toast.show('success', `Downloaded shopstock-moves.csv with ${all.items.length} moves.`)
  } catch (e) {
    toast.show('error', errorMessage(e))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">{{ fixed === 'writeoff' ? 'Write-off history' : scope === 'mine' ? 'My moves' : 'Moves' }}</h1>
      <div class="buttons">
        <button type="button" class="btn btn-outline" @click="record.open('IN')">
          <AppIcon name="inbox" :size="16" /> Receive
        </button>
        <button type="button" class="btn btn-outline" @click="record.open('OUT')">
          <AppIcon name="send" :size="16" /> Send out
        </button>
        <button v-if="scope === 'all'" type="button" class="btn btn-outline" :disabled="exporting" @click="exportCsv">
          <AppIcon name="download" :size="16" /> Export
        </button>
      </div>
      <SearchBox
        v-model="search"
        class="search"
        input-id="move-search"
        :placeholder="placeholder"
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
      <nav class="mini-pager" aria-label="Pages">
        <span class="muted">{{ from }}–{{ to }} / {{ movements.page.total }}</span>
        <button type="button" class="icon-btn" aria-label="Previous page" :disabled="page <= 1" @click="page--">
          <AppIcon name="chevronLeft" :size="18" />
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label="Next page"
          :disabled="to >= movements.page.total"
          @click="page++"
        >
          <AppIcon name="chevronRight" :size="18" />
        </button>
      </nav>
    </div>
  </div>

  <div class="page" :aria-busy="movements.pageLoading">
    <ErrorState v-if="movements.pageError" :message="movements.pageError" @retry="load" />
    <section v-else-if="movements.pageLoading && rows.length === 0" class="panel">
      <LoadingState message="Loading moves…" />
    </section>
    <section v-else-if="rows.length === 0" class="panel">
      <EmptyState v-if="filtered" icon="search" message="No moves match your search">
        <button type="button" class="btn btn-outline btn-sm" @click="clearAll">Clear search and filters</button>
      </EmptyState>
      <EmptyState
        v-else
        icon="arrows"
        message="No moves yet"
        detail="Stock you receive or send out shows here, newest first."
      />
    </section>
    <template v-else>
      <section class="panel list" :class="{ dim: movements.pageLoading }">
        <MovesTable
          v-model:sort="sort"
          :groups="groups"
          :show-manager="scope === 'all'"
          :applied-value="movements.page.appliedValue"
        />
      </section>
      <ListPager
        v-if="movements.page.total > 10"
        v-model:page="page"
        v-model:per-page="perPage"
        :total="movements.page.total"
        noun="moves"
      />
    </template>
  </div>
</template>

<style scoped>
.buttons {
  display: flex;
  gap: 8px;
}

.search {
  flex: 0 1 560px;
}

.mini-pager {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 13px;
  white-space: nowrap;
}

.mini-pager .muted {
  margin-right: 6px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.list {
  overflow: hidden;
}

.dim {
  opacity: 0.6;
}

@media (max-width: 720px) {
  .search {
    flex: 1 1 100%;
    order: -1;
  }
}
</style>
