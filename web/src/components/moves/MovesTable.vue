<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import GroupFold from '@/components/search/GroupFold.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import { useFolded } from '@/composables/useFolded'
import type { SortState } from '@/utils/sort'
import { formatDateTime, money, reasonLabel, signed, unitWord } from '@/utils/format'
import type { RowGroup } from '@/components/search/filters'
import type { Product, StockMovement } from '@/types'

export interface MoveRow {
  movement: StockMovement
  product: Product | undefined
  recordedBy: string
}

defineProps<{
  groups: RowGroup<MoveRow>[] // one group without a title when not grouped
  showManager: boolean // Recorded by, Value and the total row
  appliedValue: number
}>()
const sort = defineModel<SortState | null>('sort', { required: true })
const { isOpen, toggle } = useFolded()
const groupValue = (rows: MoveRow[]) =>
  rows.filter((r) => r.movement.status === 'APPLIED').reduce((sum, r) => sum + r.movement.change * r.movement.unitCost, 0)

const TYPE = {
  IN: { label: 'In', css: 'in' },
  OUT: { label: 'Out', css: 'out' },
  ADJUST: { label: 'Adjustment', css: 'adj' },
} as const
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <SortHeader id="date" v-model="sort" label="Date" />
          <SortHeader id="product" v-model="sort" label="Product" />
          <SortHeader id="type" v-model="sort" label="Type" />
          <SortHeader id="reason" v-model="sort" label="Reason" />
          <SortHeader id="quantity" v-model="sort" label="Quantity" num />
          <th scope="col" class="num">Stock after</th>
          <SortHeader v-if="showManager" id="user" v-model="sort" label="Recorded by" />
          <SortHeader v-if="showManager" id="value" v-model="sort" label="Value" num />
          <SortHeader id="status" v-model="sort" label="Status" />
        </tr>
      </thead>
      <tbody v-for="g in groups" :key="g.key">
        <tr v-if="g.title" class="group">
          <th scope="rowgroup" :colspan="showManager ? 7 : 6">
            <GroupFold :title="g.title" :count="g.rows.length" :open="isOpen(g.key)" @toggle="toggle(g.key)" />
          </th>
          <td v-if="showManager" class="num"><b>{{ money(groupValue(g.rows)) }}</b></td>
          <td />
        </tr>
        <tr
          v-for="{ movement: m, product, recordedBy } in isOpen(g.key) ? g.rows : []"
          :key="m.id"
          :class="{ waiting: m.status === 'PENDING' }"
        >
          <td class="nowrap">
            <RouterLink :to="`/moves/${m.id}`" class="date">{{ formatDateTime(m.createdAt) }}</RouterLink>
          </td>
          <td>
            <span class="product">
              <span class="thumb pic"><AppIcon name="box" :size="14" /></span>
              <span>
                <span class="name">{{ product?.name ?? `Product #${m.productId}` }}</span>
                <span v-if="product" class="sku">{{ product.sku }}</span>
              </span>
            </span>
          </td>
          <td><span class="badge" :class="TYPE[m.type].css">{{ TYPE[m.type].label }}</span></td>
          <td>
            {{ reasonLabel(m) }}
            <small v-if="m.note || m.invoiceNo" class="note">
              {{ [m.invoiceNo ? `Invoice ${m.invoiceNo}` : '', m.note ?? ''].filter(Boolean).join(' · ') }}
            </small>
          </td>
          <td class="num">
            <b>{{ signed(m.change) }}</b>
            <small v-if="product">&nbsp;{{ unitWord(m.change, product.unit) }}</small>
          </td>
          <td class="num">{{ m.status === 'APPLIED' ? m.quantityAfter : '—' }}</td>
          <td v-if="showManager">{{ recordedBy }}</td>
          <td v-if="showManager" class="num">{{ money(m.change * m.unitCost) }}</td>
          <td><StatusBadge :status="m.status" /></td>
        </tr>
      </tbody>
      <tfoot v-if="showManager">
        <tr>
          <th scope="row" colspan="7">Total value of applied moves</th>
          <td class="num"><b>{{ money(appliedValue) }}</b></td>
          <td />
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
tbody tr {
  box-shadow: inset 3px 0 0 transparent;
}

tbody tr.waiting {
  box-shadow: inset 3px 0 0 var(--low-line);
}

tbody tr:not(.group):hover {
  background: var(--surface-2);
}

.group th,
.group td {
  background: var(--surface-2);
  color: var(--ink);
  font-weight: 600;
}

.date {
  text-decoration: none;
}

.date:hover {
  text-decoration: underline;
}

.product {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pic {
  width: 28px;
  height: 28px;
}

.name {
  display: block;
  color: var(--ink);
}

.sku {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

.note {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

b {
  color: var(--ink);
  font-weight: 600;
}

.num small {
  color: var(--muted);
  font-size: 12px;
}

.nowrap {
  white-space: nowrap;
}

tfoot th,
tfoot td {
  background: var(--surface-2);
  border-bottom: 0;
}

tfoot th {
  color: var(--muted);
  font-weight: 500;
}
</style>
