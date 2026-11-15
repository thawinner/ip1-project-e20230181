<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SearchBox, { type FilterTag } from '@/components/search/SearchBox.vue'
import FilterMenu from '@/components/search/FilterMenu.vue'
import GroupFold from '@/components/search/GroupFold.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import { useFolded } from '@/composables/useFolded'
import { sortRows, type SortState } from '@/utils/sort'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import {
  applyFilters,
  groupRows,
  resetTag,
  viewTags,
  type DefaultView,
  type FilterOption,
  type GroupOption,
} from '@/components/search/filters'
import { getReorderList, type ReorderLine } from '@/api/reports'
import { useCatalogStore } from '@/stores/catalog'
import { errorMessage } from '@/utils/errors'
import { formatPhone, money, unitWord } from '@/utils/format'

// Story 9: products at or below their reorder level with a suggested order, grouped by supplier.
// Only this page uses the list, so it stays local instead of going into a store.
const catalog = useCatalogStore()

const lines = ref<ReorderLine[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const filters = ref<string[]>([])
const DEFAULTS: DefaultView = { on: [], group: 'supplier' } // opens grouped by supplier, like the design
const groupBy = ref<string | null>(DEFAULTS.group)
const sort = ref<SortState | null>(null) // in supplier order until a column is clicked
const { isOpen, toggle } = useFolded()

async function load() {
  loading.value = true
  error.value = null
  try {
    lines.value = (await getReorderList()).flatMap((g) => g.lines)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const FILTERS: FilterOption<ReorderLine>[][] = [
  [{ id: 'out', label: 'Out of stock', test: (l) => l.product.quantity === 0 }],
]
const GROUP_BYS: GroupOption<ReorderLine>[] = [
  {
    id: 'supplier',
    label: 'Supplier',
    key: (l) => ({
      id: l.product.supplierId ?? 0,
      title: catalog.supplierName(l.product.supplierId),
      order: l.product.supplierId ? catalog.supplierName(l.product.supplierId) : '~', // "No supplier" last
    }),
  },
  {
    id: 'category',
    label: 'Category',
    key: (l) => ({ id: l.product.categoryId, title: catalog.categoryName(l.product.categoryId) }),
  },
]

const shown = computed(() => {
  const text = search.value.trim().toLowerCase()
  const found = lines.value.filter(
    (l) =>
      !text ||
      [l.product.name, l.product.sku, catalog.supplierName(l.product.supplierId)].some((v) => v.toLowerCase().includes(text)),
  )
  return applyFilters(found, FILTERS, filters.value)
})

const groupOption = computed(() => GROUP_BYS.find((g) => g.id === groupBy.value) ?? null)

// Each group with its cost, and its supplier (for the phone number) when grouped by supplier
const groups = computed(() =>
  groupRows(
    sortRows(shown.value, sort.value, {
      name: (l) => l.product.name,
      quantity: (l) => l.product.quantity,
      suggested: (l) => l.suggested,
      cost: (l) => l.cost,
    }),
    groupOption.value,
  ).map((g) => ({
    ...g,
    cost: g.rows.reduce((sum, l) => sum + l.cost, 0),
    supplier: groupBy.value === 'supplier' ? (catalog.suppliers.find((s) => g.key === `supplier-${s.id}`) ?? null) : null,
  })),
)

const total = computed(() => shown.value.reduce((sum, l) => sum + l.cost, 0))

const tags = computed<FilterTag[]>(() => {
  const list = viewTags(FILTERS, GROUP_BYS, filters.value, groupBy.value, DEFAULTS)
  return list
})

function removeTag(id: string) {
  const next = resetTag(FILTERS, filters.value, groupBy.value, DEFAULTS, id)
  filters.value = next.on
  groupBy.value = next.group
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">Reorder list</h1>
      <p class="muted hint">Suggested order = target level − on hand. ShopStock does not send orders.</p>
      <SearchBox
        v-model="search"
        class="search"
        input-id="reorder-search"
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
      <span class="muted total">{{ shown.length }} {{ shown.length === 1 ? 'product' : 'products' }}</span>
    </div>
  </div>

  <div class="page">
    <ErrorState v-if="error" :message="error" @retry="load" />
    <section v-else class="panel list">
      <LoadingState v-if="loading" message="Loading the reorder list…" />
      <EmptyState
        v-else-if="!lines.length"
        icon="check"
        message="Nothing to reorder"
        detail="Every product is above its reorder level."
      />
      <EmptyState v-else-if="!shown.length" icon="search" message="No products match your search" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <SortHeader id="name" v-model="sort" label="Product" />
              <SortHeader id="quantity" v-model="sort" label="On hand" num />
              <th scope="col" class="num">Reorder at</th>
              <th scope="col" class="num">Target</th>
              <SortHeader id="suggested" v-model="sort" label="Suggested order" num />
              <th scope="col" class="num">Cost price</th>
              <SortHeader id="cost" v-model="sort" label="Estimated cost" num />
            </tr>
          </thead>
          <tbody v-for="g in groups" :key="g.key">
            <tr v-if="g.title" class="group">
              <th scope="rowgroup" colspan="6">
                <GroupFold :title="g.title" :count="g.rows.length" :open="isOpen(g.key)" @toggle="toggle(g.key)" />
                <a v-if="g.supplier?.phone" class="call" :href="`tel:${g.supplier.phone.replace(/\s/g, '')}`">
                  <AppIcon name="phone" :size="14" /> {{ formatPhone(g.supplier.phone) }}
                </a>
              </th>
              <td class="num"><b>{{ money(g.cost) }}</b></td>
            </tr>
            <template v-if="isOpen(g.key)">
              <tr v-for="l in g.rows" :key="l.product.id" :class="{ empty: l.product.quantity === 0 }">
                <td>
                  <RouterLink :to="`/products/${l.product.id}`" class="product">
                    <span class="thumb pic"><AppIcon name="box" :size="14" /></span>
                    <span>
                      <span class="name">{{ l.product.name }}</span>
                      <span class="sku">{{ l.product.sku }}</span>
                    </span>
                  </RouterLink>
                </td>
                <td class="num">{{ l.product.quantity }} <small>{{ unitWord(l.product.quantity, l.product.unit) }}</small></td>
                <td class="num">{{ l.product.reorderLevel }}</td>
                <td class="num">{{ l.product.targetLevel }}</td>
                <td class="num"><b>{{ l.suggested }}</b> <small>{{ unitWord(l.suggested, l.product.unit) }}</small></td>
                <td class="num">{{ money(l.product.costPrice) }}</td>
                <td class="num">{{ money(l.cost) }}</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colspan="6">Total</th>
              <td class="num"><b>{{ money(total) }}</b></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hint {
  margin: 0;
  font-size: 13px;
}

.search {
  flex: 0 1 560px;
}

.total {
  margin-left: auto;
  font-size: 13px;
}

.list {
  overflow: hidden;
}

.group th,
.group td {
  background: var(--surface-2);
}

.group th {
  color: var(--ink);
}

.call {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 14px;
  padding: 2px 10px;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

.call:hover {
  background: var(--accent-soft);
}

tbody tr.empty {
  box-shadow: inset 3px 0 0 var(--danger-fg);
}

.product {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.pic {
  width: 28px;
  height: 28px;
}

.name {
  display: block;
  color: var(--ink);
  font-weight: 600;
}

.sku {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

small {
  color: var(--muted);
  font-size: 12px;
}

b {
  color: var(--ink);
  font-weight: 600;
}

tfoot th,
tfoot td {
  background: var(--surface-2);
  border-bottom: 0;
}

tfoot th {
  color: var(--ink-2);
  text-align: left;
}
</style>
