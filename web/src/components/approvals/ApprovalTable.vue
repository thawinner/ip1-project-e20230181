<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import GroupFold from '@/components/search/GroupFold.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import { useFolded } from '@/composables/useFolded'
import type { SortState } from '@/utils/sort'
import { formatDateTime, money, reasonLabel, signed, unitWord } from '@/utils/format'
import type { RowGroup } from '@/components/search/filters'
import type { Id, Product, StockMovement } from '@/types'

export interface ApprovalRow {
  movement: StockMovement
  product: Product | undefined
  recordedBy: string
}

const props = defineProps<{ groups: RowGroup<ApprovalRow>[]; busyId: Id | null }>()
const sort = defineModel<SortState | null>('sort', { required: true })
const selected = defineModel<Id[]>('selected', { default: () => [] })
const emit = defineEmits<{ approve: [id: Id]; reject: [id: Id] }>()

const { isOpen, toggle } = useFolded()

const shown = computed(() => props.groups.flatMap((g) => g.rows.map((r) => r.movement.id)))
const allTicked = computed(() => shown.value.length > 0 && shown.value.every((id) => selected.value.includes(id)))

function tick(id: Id, on: boolean) {
  selected.value = on ? [...selected.value, id] : selected.value.filter((x) => x !== id)
}

const loss = (row: ApprovalRow) => Math.abs(row.movement.change) * row.movement.unitCost
const groupLoss = (rows: ApprovalRow[]) => rows.reduce((sum, row) => sum + loss(row), 0)
const totalLoss = computed(() => props.groups.reduce((sum, g) => sum + groupLoss(g.rows), 0))
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col" class="sel">
            <label class="hit">
              <input
                type="checkbox"
                aria-label="Select all"
                :checked="allTicked"
                @change="selected = ($event.target as HTMLInputElement).checked ? [...shown] : []"
              />
            </label>
          </th>
          <SortHeader id="date" v-model="sort" label="Date" />
          <SortHeader id="product" v-model="sort" label="Product" />
          <SortHeader id="reason" v-model="sort" label="Reason" />
          <SortHeader id="quantity" v-model="sort" label="Quantity" num />
          <th scope="col" class="num">In storage</th>
          <SortHeader id="loss" v-model="sort" label="Loss" num />
          <SortHeader id="user" v-model="sort" label="Recorded by" />
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody v-for="g in groups" :key="g.key">
        <tr v-if="g.title" class="group">
          <th scope="rowgroup" colspan="6">
            <GroupFold :title="g.title" :count="g.rows.length" :open="isOpen(g.key)" @toggle="toggle(g.key)" />
          </th>
          <td class="num"><b>{{ money(groupLoss(g.rows)) }}</b></td>
          <td colspan="2" />
        </tr>
        <tr
          v-for="row in isOpen(g.key) ? g.rows : []"
          :key="row.movement.id"
          :class="{ selected: selected.includes(row.movement.id), short: -row.movement.change > (row.product?.quantity ?? 0) }"
        >
          <td class="sel">
            <label class="hit">
              <input
                type="checkbox"
                :aria-label="`Select #${row.movement.id}`"
                :checked="selected.includes(row.movement.id)"
                @change="tick(row.movement.id, ($event.target as HTMLInputElement).checked)"
              />
            </label>
          </td>
          <td class="nowrap">{{ formatDateTime(row.movement.createdAt) }}</td>
          <td>
            <RouterLink :to="`/products/${row.movement.productId}`" class="product">
              <span class="thumb pic"><AppIcon name="box" :size="14" /></span>
              <span>
                <span class="name">{{ row.product?.name ?? `Product #${row.movement.productId}` }}</span>
                <span v-if="row.product" class="sku">{{ row.product.sku }}</span>
              </span>
            </RouterLink>
          </td>
          <td>
            {{ reasonLabel(row.movement) }}
            <small v-if="row.movement.note" class="note">{{ row.movement.note }}</small>
          </td>
          <td class="num">
            <b>{{ signed(row.movement.change) }}</b>
            <small v-if="row.product">&nbsp;{{ unitWord(row.movement.change, row.product.unit) }}</small>
          </td>
          <td class="num">{{ row.product?.quantity ?? '—' }}</td>
          <td class="num">{{ money(loss(row)) }}</td>
          <td>{{ row.recordedBy }}</td>
          <td class="actions">
            <BaseButton
              small
              variant="success"
              :loading="busyId === row.movement.id"
              loading-text="Approving…"
              :disabled="busyId !== null"
              @click="emit('approve', row.movement.id)"
            >
              Approve
            </BaseButton>
            <BaseButton small :disabled="busyId !== null" @click="emit('reject', row.movement.id)">Reject</BaseButton>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colspan="6">Total</th>
          <td class="num"><b>{{ money(totalLoss) }}</b></td>
          <td colspan="2" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
tbody tr.selected {
  background: var(--accent-soft);
}

/* More to write off than is left in storage */
tbody tr.short td.sel {
  box-shadow: inset 3px 0 var(--danger-line);
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

.actions {
  white-space: nowrap;
  text-align: right;
}

.actions .btn + .btn {
  margin-left: 6px;
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

tfoot th,
tfoot td {
  background: var(--surface-2);
  border-bottom: 0;
}

tfoot th {
  color: var(--ink-2);
}
</style>
