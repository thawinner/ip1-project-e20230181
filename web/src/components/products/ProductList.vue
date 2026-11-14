<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StockBadge from '@/components/StockBadge.vue'
import GroupFold from '@/components/search/GroupFold.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import StockBar from './StockBar.vue'
import { isLowStock } from '@/api/products'
import { useFolded } from '@/composables/useFolded'
import { money, unitWord } from '@/utils/format'
import type { SortState } from '@/utils/sort'
import type { ProductGroup } from './groups'
import type { Id, Product } from '@/types'

const props = defineProps<{
  groups: ProductGroup[] // one group without a title when not grouped
  showMoney: boolean // manager: cost price and stock value (story 6: never for staff)
  selectable: boolean // manager: tick boxes for Archive / Unarchive
  categoryName: (id: Id) => string
  supplierName: (id: Id | null) => string
}>()
const sort = defineModel<SortState | null>('sort', { required: true })
const selected = defineModel<Id[]>('selected', { default: () => [] })
const emit = defineEmits<{ record: [payload: { product: Product; type: 'IN' | 'OUT' }] }>()

const { isOpen, toggle } = useFolded()

const value = (list: Product[]) => list.reduce((sum, p) => sum + p.quantity * p.costPrice, 0)

// "Select all" ticks every product shown on this page
const shown = computed(() => props.groups.flatMap((g) => g.products.map((p) => p.id)))
const allTicked = computed(() => shown.value.length > 0 && shown.value.every((id) => selected.value.includes(id)))

function tick(id: Id, on: boolean) {
  selected.value = on ? [...selected.value, id] : selected.value.filter((x) => x !== id)
}

function tickAll(on: boolean) {
  const rest = selected.value.filter((id) => !shown.value.includes(id))
  selected.value = on ? [...rest, ...shown.value] : rest
}

// Columns before "Stock value", for the group row
const leadCols = computed(() => (props.selectable ? 1 : 0) + (props.showMoney ? 6 : 5))
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th v-if="selectable" scope="col" class="sel">
            <label class="hit">
              <input
                type="checkbox"
                aria-label="Select all"
                :checked="allTicked"
                @change="tickAll(($event.target as HTMLInputElement).checked)"
              />
            </label>
          </th>
          <SortHeader id="name" v-model="sort" label="Product" />
          <th scope="col">Category</th>
          <th scope="col">Supplier</th>
          <SortHeader id="quantity" v-model="sort" label="On hand" num />
          <SortHeader id="reorder" v-model="sort" label="Reorder at" num />
          <SortHeader v-if="showMoney" id="cost" v-model="sort" label="Cost price" num />
          <SortHeader v-if="showMoney" id="value" v-model="sort" label="Stock value" num />
          <th scope="col">Status</th>
          <th scope="col">Record</th>
        </tr>
      </thead>
      <tbody v-for="g in groups" :key="g.key">
        <tr v-if="g.title" class="group">
          <th scope="rowgroup" :colspan="leadCols">
            <GroupFold :title="g.title" :count="g.products.length" :open="isOpen(g.key)" @toggle="toggle(g.key)" />
          </th>
          <td v-if="showMoney" class="num"><b>{{ money(value(g.products)) }}</b></td>
          <td colspan="2" />
        </tr>
        <template v-if="isOpen(g.key)">
          <tr
            v-for="p in g.products"
            :key="p.id"
            :class="{ low: isLowStock(p), selected: selected.includes(p.id) }"
          >
            <td v-if="selectable" class="sel">
              <label class="hit">
                <input
                  type="checkbox"
                  :aria-label="`Select ${p.name}`"
                  :checked="selected.includes(p.id)"
                  @change="tick(p.id, ($event.target as HTMLInputElement).checked)"
                />
              </label>
            </td>
            <td>
              <RouterLink :to="`/products/${p.id}`" class="product">
                <span class="thumb pic"><AppIcon name="box" :size="16" /></span>
                <span>
                  <span class="name">{{ p.name }}</span>
                  <span class="sku">{{ p.sku }}</span>
                </span>
              </RouterLink>
            </td>
            <td>{{ categoryName(p.categoryId) }}</td>
            <td>{{ supplierName(p.supplierId) }}</td>
            <td class="num on-hand">
              {{ p.quantity }} <small>{{ unitWord(p.quantity, p.unit) }}</small>
              <StockBar :quantity="p.quantity" :reorder-level="p.reorderLevel" :target-level="p.targetLevel" />
            </td>
            <td class="num">{{ p.reorderLevel }}</td>
            <td v-if="showMoney" class="num">{{ money(p.costPrice) }}</td>
            <td v-if="showMoney" class="num">{{ money(p.quantity * p.costPrice) }}</td>
            <td>
              <StockBadge v-if="p.isActive" :product="p" />
              <span v-else class="badge">Archived</span>
            </td>
            <td>
              <div v-if="p.isActive" class="actions">
                <button type="button" class="btn btn-outline btn-sm in" @click="emit('record', { product: p, type: 'IN' })">
                  <AppIcon name="plus" :size="14" /> In
                </button>
                <button type="button" class="btn btn-outline btn-sm out" @click="emit('record', { product: p, type: 'OUT' })">
                  <span aria-hidden="true">—</span> Out
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
tbody tr {
  box-shadow: inset 3px 0 0 transparent;
}

tbody tr.low {
  box-shadow: inset 3px 0 0 var(--low-line);
}

tbody tr:not(.group):hover {
  background: var(--surface-2);
}

tbody tr.selected,
tbody tr.selected:hover {
  background: var(--accent-soft);
}

.group th,
.group td {
  background: var(--surface-2);
}

b {
  color: var(--ink);
  font-weight: 600;
}

.product {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.pic {
  width: 32px;
  height: 32px;
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

.on-hand {
  min-width: 110px;
}

.on-hand small {
  color: var(--muted);
}

.on-hand .bar {
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 4px;
}

.in {
  color: var(--in-fg);
}

.out {
  color: var(--out-fg);
}
</style>
