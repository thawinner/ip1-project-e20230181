<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NotFoundView from './NotFoundView.vue'
import AppIcon from '@/components/AppIcon.vue'
import StockBadge from '@/components/StockBadge.vue'
import StockLevelCard from '@/components/products/StockLevelCard.vue'
import FieldGroup, { type Field } from '@/components/products/FieldGroup.vue'
import MovementTable from '@/components/products/MovementTable.vue'
import RecordPager from '@/components/products/RecordPager.vue'
import RecordStockPanel from '@/components/record/RecordStockPanel.vue'
import ProductActions from '@/components/products/ProductActions.vue'
import ProductHistory from '@/components/products/ProductHistory.vue'
import AdjustDialog from '@/components/products/AdjustDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { changeText, money, quantityText, unitLabel, unitWord } from '@/utils/format'
import type { AdjustErrors, MovementErrors } from '@/utils/movementRules'
import type { NewMovement } from '@/types'

// From the route /products/:id (props: true), so always a string
const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const productId = computed(() => Number(props.id))
const validId = computed(() => Number.isInteger(productId.value) && productId.value > 0)
const tab = ref<'moves' | 'deliveries'>('moves')

function load() {
  if (!validId.value) return
  tab.value = 'moves'
  products.fetchOne(productId.value)
  movements.fetchByProduct(productId.value)
  if (!products.all.length) products.fetchAll()
}
watch(productId, load, { immediate: true })

const product = computed(() => (products.current?.id === productId.value ? products.current : null))
watch(product, (p) => {
  if (p) document.title = `ShopStock · ${p.name}`
})

// "7 / 16": where this product is in the list, by name (archived products are not in the list)
const listed = computed(() => products.all.filter((p) => p.isActive))
const position = computed(() => listed.value.findIndex((p) => p.id === productId.value) + 1)
function go(step: number) {
  const next = listed.value[position.value - 1 + step]
  if (next) router.push(`/products/${next.id}`)
}

const generalFields = computed<Field[]>(() => {
  const p = product.value
  if (!p) return []
  const fields: Field[] = [
    { label: 'SKU', value: p.sku, mono: true },
    { label: 'Category', value: catalog.categoryName(p.categoryId) },
    { label: 'Supplier', value: catalog.supplierName(p.supplierId) },
    { label: 'Storage unit', value: unitLabel(p.unit).replace(/^./, (c) => c.toUpperCase()) },
  ]
  return fields
})

const stockFields = computed<Field[]>(() => {
  const p = product.value
  if (!p) return []
  return [
    { label: 'On hand', value: String(p.quantity), unit: unitWord(p.quantity, p.unit) },
    { label: 'Reorder level', value: String(p.reorderLevel), unit: unitWord(p.reorderLevel, p.unit) },
    { label: 'Target level', value: String(p.targetLevel), unit: unitWord(p.targetLevel, p.unit) },
  ]
})

// The In / Out buttons on the product list open this page with ?type=IN or ?type=OUT
const initialType = computed(() => (route.query.type === 'IN' ? 'IN' : 'OUT'))

const panel = ref<InstanceType<typeof RecordStockPanel> | null>(null)
const serverErrors = ref<MovementErrors>({})
const serverError = ref<string | null>(null)

// The panel only checks and emits; the page saves through the store
async function record(input: NewMovement) {
  serverErrors.value = {}
  serverError.value = null
  try {
    const movement = await movements.create(input)
    panel.value?.reset()
    tab.value = 'moves'
    const p = product.value
    if (movement.status === 'PENDING') {
      toast.show('success', "Write-off recorded. It waits for the manager's approval.")
    } else if (p) {
      toast.show('success', `Saved. ${p.name} now has ${quantityText(p.quantity, p.unit)}.`)
    }
  } catch (e) {
    serverErrors.value = fieldErrors(e)
    if (!Object.keys(serverErrors.value).length) serverError.value = errorMessage(e)
  }
}

// Manager: adjust after a count (story 8), archive or restore, delete (story 7)
const adjusting = ref(false)
const adjustErrors = ref<AdjustErrors>({})
const deleting = ref(false)
const busy = ref(false)

function openAdjust() {
  adjustErrors.value = {}
  adjusting.value = true
}

async function adjust(counted: number, note: string) {
  const p = product.value
  if (!p) return
  adjustErrors.value = {}
  try {
    const movement = await movements.adjust(p.id, counted, note)
    adjusting.value = false
    tab.value = 'moves'
    const after = product.value ?? p
    toast.show('success', `Adjusted by ${changeText(movement.change, p.unit)}. ${p.name} now has ${quantityText(after.quantity, p.unit)}.`)
  } catch (e) {
    adjustErrors.value = fieldErrors(e) as AdjustErrors
    if (!Object.keys(adjustErrors.value).length) adjustErrors.value = { counted: errorMessage(e) }
  }
}

async function setArchived(archived: boolean, undo = true) {
  const p = product.value
  if (!p) return
  try {
    await products.setArchived(p.id, archived)
    const message = archived ? `${p.name} archived. It no longer shows in the product list.` : `${p.name} restored.`
    toast.show('success', message, undo ? { label: 'Undo', run: () => setArchived(!archived, false) } : undefined)
  } catch (e) {
    toast.show('error', errorMessage(e))
  }
}

async function confirmDelete() {
  const p = product.value
  if (!p) return
  busy.value = true
  try {
    await products.remove(p.id)
    toast.show('success', `${p.name} deleted.`)
    await router.push('/products')
  } catch (e) {
    toast.show('error', `Cannot delete ${p.name}: ${errorMessage(e)}`)
  } finally {
    busy.value = false
    deleting.value = false
  }
}

const productMoves = computed(() => movements.forProduct.filter((m) => m.productId === productId.value))
const deliveries = computed(() => productMoves.value.filter((m) => m.reason === 'PURCHASE'))
</script>

<template>
  <NotFoundView v-if="!validId || products.currentNotFound" />

  <template v-else>
    <div class="page-band">
      <div class="page-band-inner band">
        <h1>{{ product?.name ?? 'Product' }}</h1>
        <template v-if="auth.isManager && product">
          <RouterLink :to="`/products/${product.id}/edit`" class="btn btn-outline btn-sm">
            <AppIcon name="edit" :size="14" /> Edit
          </RouterLink>
          <ProductActions
            :archived="!product.isActive"
            @archive="setArchived(true)"
            @restore="setArchived(false)"
            @delete="deleting = true"
          />
        </template>
        <RecordPager
          v-if="position > 0"
          class="pager-right"
          :index="position"
          :total="listed.length"
          @prev="go(-1)"
          @next="go(1)"
        />
      </div>
    </div>

    <div class="page">
      <section v-if="products.currentLoading && !product" class="panel">
        <LoadingState message="Loading the product…" />
      </section>
      <ErrorState v-else-if="products.currentError" :message="products.currentError" @retry="load" />

      <template v-else-if="product">
      <div class="layout">
        <div class="status-row">
          <button v-if="auth.isManager && product.isActive" type="button" class="btn btn-outline" @click="openAdjust">
            <AppIcon name="scale" :size="16" /> Adjust stock
          </button>
        </div>
        <StockLevelCard class="gauge" :product="product" />
        <article class="panel sheet">
          <p v-if="!product.isActive" class="archived">
            <AppIcon name="archive" :size="16" /> Archived: it is hidden from the product list and no stock can be
            recorded.
          </p>
          <div v-if="auth.isManager" class="tiles">
            <div class="tile">
              <AppIcon name="arrows" :size="20" />
              <span><b>{{ productMoves.length }}</b>Moves</span>
            </div>
            <div class="tile">
              <AppIcon name="dollar" :size="20" />
              <span><b>{{ money(product.costPrice * product.quantity) }}</b>Stock value</span>
            </div>
          </div>
          <header class="title">
            <div>
              <p class="label">Product</p>
              <h2>{{ product.name }}</h2>
              <p class="sub"><span class="mono">{{ product.sku }}</span> <StockBadge :product="product" /></p>
            </div>
            <span class="thumb pic"><AppIcon name="box" :size="40" /></span>
          </header>

          <div class="groups">
            <FieldGroup title="General" :fields="generalFields" />
            <FieldGroup title="Stock" :fields="stockFields" />
          </div>

          <div class="tabs" role="tablist">
            <button type="button" role="tab" :aria-selected="tab === 'moves'" @click="tab = 'moves'">
              Stock moves ({{ productMoves.length }})
            </button>
            <button type="button" role="tab" :aria-selected="tab === 'deliveries'" @click="tab = 'deliveries'">
              Deliveries ({{ deliveries.length }})
            </button>
          </div>
          <div class="tab-body" role="tabpanel">
            <ErrorState v-if="movements.error" :message="movements.error" @retry="movements.fetchByProduct(productId)" />
            <LoadingState v-else-if="movements.loading && !productMoves.length" message="Loading moves…" />
            <MovementTable
              v-else
              :movements="tab === 'moves' ? productMoves : deliveries"
              :show-by="auth.isManager"
              :user-name="catalog.userName"
              :empty-text="
                tab === 'moves' ? 'No moves yet' : 'Deliveries from a supplier show here with their invoice number.'
              "
            />
          </div>
        </article>

        <aside class="side">
          <section v-if="!product.isActive" class="panel no-record">
            <h2>Record stock</h2>
            <p class="muted">This product is archived. Restore it to record stock.</p>
          </section>
          <RecordStockPanel
            v-else
            ref="panel"
            :product="product"
            :suppliers="catalog.suppliers"
            :last-delivery="movements.lastDelivery"
            :is-manager="auth.isManager"
            :saving="movements.saving"
            :initial-type="initialType"
            :server-errors="serverErrors"
            :server-error="serverError"
            @submit="record"
          />
          <ProductHistory
            v-if="auth.isManager"
            :product="product"
            :movements="productMoves"
            :user-name="catalog.userName"
            :supplier-name="catalog.supplierName"
          />
        </aside>
      </div>
      <AdjustDialog
        v-if="auth.isManager"
        :open="adjusting"
        :product="product"
        :busy="movements.saving"
        :server-errors="adjustErrors"
        @confirm="adjust"
        @cancel="adjusting = false"
      />
      <ConfirmDialog
        v-if="auth.isManager"
        :open="deleting"
        title="Delete product"
        :text="`Delete ${product.name}? This can't be undone.`"
        ok-label="Delete"
        danger
        :busy="busy"
        @confirm="confirmDelete"
        @cancel="deleting = false"
      />
      </template>
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

.status-row {
  grid-area: status;
  align-self: end;
}

.archived {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--row);
  color: var(--ink-2);
  font-size: 13px;
}

.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 24px;
}

.tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--accent);
}

.tile span {
  display: flex;
  flex-direction: column;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.3;
}

.tile b {
  color: var(--ink);
  font-size: 15px;
}

.no-record {
  padding: 16px 18px 18px;
}

.no-record h2 {
  font-size: 15px;
}

.no-record p {
  margin: 8px 0 0;
}

.band h1 {
  font-size: 24px;
  font-weight: 700;
}

/* Like the design: the stock card sits above Record stock, the sheet starts level with Record stock */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--side-w);
  grid-template-areas:
    'status gauge'
    'sheet side';
  gap: 20px;
  align-items: start;
}

.gauge {
  grid-area: gauge;
}

.sheet {
  grid-area: sheet;
}

.side {
  grid-area: side;
}

.sheet {
  padding: 28px 32px 32px;
}

.title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
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
  gap: 10px;
  margin: 0;
  color: var(--muted);
}

.pic {
  width: 96px;
  height: 96px;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px 40px;
  margin-bottom: 24px;
}

.tab-body {
  padding-top: 12px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Narrow screens: Record stock first (the task), then the stock level, then the details */
@media (max-width: 1000px) {
  .layout {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .side {
    order: -2;
  }

  .gauge {
    order: -1;
  }

  .status-row:empty {
    display: none;
  }
}

@media (max-width: 720px) {
  .page {
    padding-left: 0;
    padding-right: 0;
  }

  .sheet {
    padding: 16px;
  }

  .layout :deep(.panel) {
    border-radius: 0;
    border-width: 1px 0;
  }

  .layout .gauge {
    margin: 0 16px;
    border-radius: var(--radius-lg);
    border-width: 1px;
  }

  .status-row {
    padding: 0 16px;
  }
}
</style>
