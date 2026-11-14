<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import SearchBox, { type FilterTag } from '@/components/search/SearchBox.vue'
import FilterMenu from '@/components/search/FilterMenu.vue'
import ViewSwitch from '@/components/products/ViewSwitch.vue'
import ProductKanban from '@/components/products/ProductKanban.vue'
import ProductList from '@/components/products/ProductList.vue'
import ListPager from '@/components/products/ListPager.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { productGroupBys, type ProductGroup } from '@/components/products/groups'
import { groupRows, resetTag, viewTags, type DefaultView, type FilterOption } from '@/components/search/filters'
import { MAX_PER_PAGE } from '@/api/http'
import { isLowStock } from '@/api/products'
import { useRecordDialog } from '@/composables/useRecordDialog'
import { useToast } from '@/composables/useToast'
import { errorMessage } from '@/utils/errors'
import type { SortState } from '@/utils/sort'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useProductStore } from '@/stores/products'
import type { Id, Product } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const products = useProductStore()
const catalog = useCatalogStore()
const record = useRecordDialog()
const toast = useToast()

// Filters ▾ like the design: Low stock / Out of stock, then Active / Archived (manager only)
const FILTERS = computed<FilterOption<Product>[][]>(() => {
  const stock: FilterOption<Product>[] = [
    { id: 'low', label: 'Low stock', test: isLowStock },
    { id: 'out', label: 'Out of stock', test: (p) => p.quantity === 0 },
  ]
  const status: FilterOption<Product>[] = [
    { id: 'active', label: 'Active', test: (p) => p.isActive },
    { id: 'archived', label: 'Archived', test: (p) => !p.isActive },
  ]
  return auth.isManager ? [stock, status] : [stock]
})
const GROUP_BYS = computed(() => productGroupBys(catalog.categories, catalog.suppliers))

const view = ref<'cards' | 'list'>('cards')
const search = ref('')
const searchQuery = ref('') // `search` after the user stops typing
const categoryId = ref<Id | null>(null)
const supplierId = ref<Id | null>(null)
// The usual view: active products (manager), grouped by category. Only changes from it get a tag.
const DEFAULTS = computed<DefaultView>(() => ({
  on: auth.isManager ? ['active'] : [],
  group: 'category',
  anyLabel: { 1: 'Active or Archived' },
}))
const filters = ref<string[]>([...DEFAULTS.value.on])
const groupBy = ref<string | null>(DEFAULTS.value.group)
const page = ref(1)
const perPage = ref(10)
const sort = ref<SortState | null>({ id: 'name', dir: 'asc' })
const selected = ref<Id[]>([]) // manager: ticked rows in the list

// "Low stock" in the top bar is /products?stock=low, so the link and the filter stay the same
watch(
  () => route.query.stock,
  (stock) => {
    const has = filters.value.includes('low')
    if (stock === 'low' && !has) filters.value = [...filters.value, 'low']
    if (stock !== 'low' && has) filters.value = filters.value.filter((id) => id !== 'low')
  },
  { immediate: true },
)
watch(filters, (list) => {
  const want = list.includes('low')
  if (want !== (route.query.stock === 'low')) router.replace({ query: { ...route.query, stock: want ? 'low' : undefined } })
})

// The product counts on Categories / Suppliers open /products?category=2 or ?supplier=1
watch(
  () => [route.query.category, route.query.supplier],
  ([category, supplier]) => {
    if (typeof category === 'string') categoryId.value = Number(category)
    if (typeof supplier === 'string') supplierId.value = Number(supplier)
  },
  { immediate: true },
)

// The top bar search opens /products?q=coca
watch(
  () => route.query.q,
  (q) => {
    search.value = typeof q === 'string' ? q : ''
    searchQuery.value = search.value
  },
  { immediate: true },
)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (text) => {
  clearTimeout(timer)
  timer = setTimeout(() => (searchQuery.value = text), 300)
})
onBeforeUnmount(() => clearTimeout(timer))

// Active only, archived only, or both (both ticked or none ticked); staff always see active products
const status = computed(() => {
  if (!auth.isManager) return 'active' as const
  const active = filters.value.includes('active')
  const archived = filters.value.includes('archived')
  if (active && !archived) return 'active' as const
  if (archived && !active) return 'archived' as const
  return 'all' as const
})
const stock = computed(() => filters.value.filter((id): id is 'low' | 'out' => id === 'low' || id === 'out'))

// A new search, filter or view starts again from page 1
watch([searchQuery, categoryId, supplierId, filters, perPage, view, sort], () => (page.value = 1))

// Cards show every match (up to the API maximum of 50); the list shows one page
function load() {
  return products.fetchPage({
    search: searchQuery.value,
    categoryId: categoryId.value ?? undefined,
    supplierId: supplierId.value ?? undefined,
    stock: stock.value,
    status: status.value,
    sort: sort.value ?? undefined,
    page: view.value === 'cards' ? 1 : page.value,
    perPage: view.value === 'cards' ? MAX_PER_PAGE : perPage.value,
  })
}
watch([searchQuery, categoryId, supplierId, filters, page, perPage, view, sort], load, { immediate: true })

// Ticks are for the rows on screen: a new search, filter or page starts with none
watch([searchQuery, categoryId, supplierId, filters, page, perPage, view], () => (selected.value = []))

const groupOption = computed(() => GROUP_BYS.value.find((g) => g.id === groupBy.value) ?? null)

// The tags in the search box: what differs from the usual view, and the category or supplier from a link
const tags = computed<FilterTag[]>(() => {
  const list = viewTags(FILTERS.value, GROUP_BYS.value, filters.value, groupBy.value, DEFAULTS.value)
  if (categoryId.value !== null) list.push({ id: 'category', label: catalog.categoryName(categoryId.value) })
  if (supplierId.value !== null) list.push({ id: 'supplier', label: catalog.supplierName(supplierId.value) })
  return list
})

const filtered = computed(
  () => searchQuery.value.trim() !== '' || categoryId.value !== null || supplierId.value !== null || stock.value.length > 0,
)

function removeTag(id: string) {
  if (id === 'category') categoryId.value = null
  else if (id === 'supplier') supplierId.value = null
  else {
    const next = resetTag(FILTERS.value, filters.value, groupBy.value, DEFAULTS.value, id)
    filters.value = next.on
    groupBy.value = next.group
  }
}

function clearAll() {
  search.value = ''
  searchQuery.value = ''
  categoryId.value = null
  supplierId.value = null
  filters.value = [...DEFAULTS.value.on]
}

const groups = computed<ProductGroup[]>(() =>
  groupRows(products.page.items, groupOption.value).map((g) => ({ key: g.key, title: g.title, products: g.rows })),
)

// Bulk Archive / Unarchive on the ticked rows (products are archived, never deleted)
const confirmArchive = ref(false)
const busy = ref(false)
const noun = (n: number) => `${n} ${n === 1 ? 'product' : 'products'}`

async function setArchived(ids: Id[], archived: boolean, undo = true) {
  busy.value = true
  try {
    await Promise.all(ids.map((id) => products.setArchived(id, archived)))
    selected.value = []
    confirmArchive.value = false
    await load()
    if (undo) {
      toast.show('success', `${noun(ids.length)} ${archived ? 'archived' : 'unarchived'}`, {
        label: 'Undo',
        run: () => setArchived(ids, !archived, false),
      })
    }
  } catch (e) {
    toast.show('error', errorMessage(e))
  } finally {
    busy.value = false
  }
}

// In / Out on a row opens the Receive / Send out dialog with that product chosen
function onRecord({ product, type }: { product: Product; type: 'IN' | 'OUT' }) {
  record.open(type, product.id)
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">Products</h1>
      <div v-if="selected.length" class="buttons">
        <span class="selection">
          {{ selected.length }} selected
          <button type="button" class="btn btn-link btn-sm" @click="selected = []">Unselect</button>
        </span>
        <button type="button" class="btn btn-outline" @click="confirmArchive = true">Archive</button>
        <button type="button" class="btn btn-outline" :disabled="busy" @click="setArchived(selected, false)">
          Unarchive
        </button>
      </div>
      <div v-else class="buttons">
        <RouterLink v-if="auth.isManager" to="/products/new" class="btn btn-primary">New</RouterLink>
        <button type="button" class="btn btn-outline" @click="record.open('IN')">
          <AppIcon name="inbox" :size="16" /> Receive
        </button>
        <button type="button" class="btn btn-outline" @click="record.open('OUT')">
          <AppIcon name="send" :size="16" /> Send out
        </button>
      </div>
      <SearchBox
        v-model="search"
        class="search"
        input-id="product-search"
        placeholder="Search by name or SKU…"
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
      <div class="side">
        <ViewSwitch v-model="view" />
        <span class="muted total">{{ products.page.total }} {{ products.page.total === 1 ? 'product' : 'products' }}</span>
      </div>
    </div>
  </div>

  <div class="page" :aria-busy="products.loading">
    <ErrorState v-if="products.error" :message="products.error" @retry="load" />
    <section v-else-if="products.loading && products.page.items.length === 0" class="panel">
      <LoadingState message="Loading products…" />
    </section>
    <section v-else-if="products.page.items.length === 0" class="panel">
      <EmptyState
        v-if="filtered"
        icon="search"
        message="No products match your search"
        detail="Check the spelling, or search by SKU."
      >
        <button type="button" class="btn btn-outline btn-sm" @click="clearAll">Clear search and filters</button>
      </EmptyState>
      <EmptyState v-else message="No products yet" />
    </section>
    <ProductKanban
      v-else-if="view === 'cards'"
      :groups="groups"
      :grouped="groupOption !== null"
      :group-noun="groupOption ? `${groupOption.label}s` : ''"
      :category-name="catalog.categoryName"
      :supplier-name="catalog.supplierName"
      :class="{ dim: products.loading }"
    />
    <template v-else>
      <section class="panel list" :class="{ dim: products.loading }">
        <ProductList
          v-model:sort="sort"
          v-model:selected="selected"
          :groups="groups"
          :show-money="auth.isManager"
          :selectable="auth.isManager"
          :category-name="catalog.categoryName"
          :supplier-name="catalog.supplierName"
          @record="onRecord"
        />
      </section>
      <ListPager
        v-if="products.page.total > 10"
        v-model:page="page"
        v-model:per-page="perPage"
        :total="products.page.total"
        noun="products"
      />
    </template>
  </div>

  <ConfirmDialog
    :open="confirmArchive"
    title="Archive products"
    :text="`Archive ${noun(selected.length)}? They leave the lists and get no more moves. You can unarchive them later.`"
    ok-label="Archive"
    danger
    :busy="busy"
    @confirm="setArchived(selected, true)"
    @cancel="confirmArchive = false"
  />
</template>

<style scoped>
.buttons {
  display: flex;
  gap: 8px;
}

.search {
  flex: 0 1 620px;
}

.side {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
}

.total {
  font-size: 13px;
  white-space: nowrap;
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
