<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDateTime, reasonLabel, signed } from '@/utils/format'
import type { Id, StockMovement } from '@/types'

const props = defineProps<{
  movements: StockMovement[]
  showBy: boolean
  userName: (id: Id) => string
  emptyText: string
}>()

const TYPE = {
  IN: { label: 'In', css: 'in' },
  OUT: { label: 'Out', css: 'out' },
  ADJUST: { label: 'Adjustment', css: 'adj' },
} as const

const PER_PAGE = 10
const page = ref(1)
watch(
  () => props.movements,
  () => (page.value = 1),
)

const from = computed(() => (page.value - 1) * PER_PAGE)
const rows = computed(() => props.movements.slice(from.value, from.value + PER_PAGE))
const to = computed(() => Math.min(from.value + PER_PAGE, props.movements.length))
</script>

<template>
  <div v-if="movements.length">
    <div class="box table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Reason</th>
            <th scope="col" class="num">Quantity</th>
            <th scope="col" class="num">Stock after</th>
            <th v-if="showBy" scope="col">By</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m.id">
            <td class="nowrap">{{ formatDateTime(m.createdAt) }}</td>
            <td><span class="badge" :class="TYPE[m.type].css">{{ TYPE[m.type].label }}</span></td>
            <td>
              {{ reasonLabel(m) }}
              <small v-if="m.note || m.invoiceNo" class="note">
                {{ [m.invoiceNo ? `Invoice ${m.invoiceNo}` : '', m.note ?? ''].filter(Boolean).join(' · ') }}
              </small>
              <small v-if="m.rejectReason" class="note danger">Rejected: {{ m.rejectReason }}</small>
            </td>
            <td class="num strong">{{ signed(m.change) }}</td>
            <td class="num">{{ m.status === 'APPLIED' ? m.quantityAfter : '—' }}</td>
            <td v-if="showBy">{{ userName(m.userId) }}</td>
            <td><StatusBadge :status="m.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="movements.length > PER_PAGE" class="pager">
      <span class="muted">{{ from + 1 }}–{{ to }} / {{ movements.length }}</span>
      <button type="button" class="icon-btn" aria-label="Previous moves" :disabled="page === 1" @click="page--">
        <AppIcon name="chevronLeft" :size="16" />
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="Next moves"
        :disabled="to >= movements.length"
        @click="page++"
      >
        <AppIcon name="chevronRight" :size="16" />
      </button>
    </div>
  </div>
  <p v-else class="empty muted">{{ emptyText }}</p>
</template>

<style scoped>
.box {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.box tbody tr:last-child td {
  border-bottom: 0;
}

.nowrap {
  white-space: nowrap;
}

.note {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.note.danger {
  color: var(--danger-fg);
}

.strong {
  font-weight: 600;
  color: var(--ink);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 12px;
  font-size: 13px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty {
  margin: 0;
  padding: 16px 0;
}
</style>
