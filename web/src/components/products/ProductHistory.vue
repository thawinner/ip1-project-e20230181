<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatTime, reasonLabel, signed, unitWord } from '@/utils/format'
import type { Id, Product, StockMovement } from '@/types'

// Manager: every move of this product as a log, newest first, one heading per day
const props = defineProps<{
  product: Product
  movements: StockMovement[] // newest first
  userName: (id: Id) => string
  supplierName: (id: Id | null) => string
}>()

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const what = (m: StockMovement) =>
  m.type === 'ADJUST' ? 'Adjusted after a count' : `${m.type === 'IN' ? 'Received' : 'Sent out'} · ${reasonLabel(m)}`

const days = computed(() => {
  const list: { day: string; moves: StockMovement[] }[] = []
  for (const m of props.movements) {
    const day = dayOf(m.createdAt)
    const last = list[list.length - 1]
    if (last?.day === day) last.moves.push(m)
    else list.push({ day, moves: [m] })
  }
  return list
})
</script>

<template>
  <section class="panel history" aria-labelledby="product-history-title">
    <h2 id="product-history-title">History <AppIcon name="history" :size="18" class="muted" /></h2>
    <p class="muted sub">Every move of this product, newest first</p>
    <p v-if="!movements.length" class="muted">No moves yet.</p>
    <template v-for="d in days" :key="d.day">
      <p class="day">{{ d.day }}</p>
      <ol>
        <li v-for="m in d.moves" :key="m.id">
          <span class="avatar" aria-hidden="true">{{ initials(userName(m.userId)) }}</span>
          <div>
            <p class="who">
              <b>{{ userName(m.userId) }}</b>
              <time class="muted" :datetime="m.createdAt">{{ formatTime(m.createdAt) }}</time>
              <StatusBadge v-if="m.status !== 'APPLIED'" :status="m.status" />
            </p>
            <RouterLink :to="`/moves/${m.id}`">{{ what(m) }}</RouterLink>
            <ul class="track">
              <li>
                <b>{{ signed(m.change) }}</b> {{ unitWord(m.change, product.unit) }}
                <template v-if="m.status === 'APPLIED'"> → {{ m.quantityAfter }} on hand</template>
              </li>
              <li v-if="m.supplierId !== null">
                Supplier: {{ supplierName(m.supplierId) }}
                <template v-if="m.invoiceNo"> · invoice <span class="mono">{{ m.invoiceNo }}</span></template>
              </li>
              <li v-if="m.status === 'APPLIED' && m.reviewedById !== null">
                Approved by {{ userName(m.reviewedById) }}
              </li>
              <li v-if="m.status === 'REJECTED' && m.reviewedById !== null" class="rejected">
                Rejected by {{ userName(m.reviewedById) }}: {{ m.rejectReason }}
              </li>
            </ul>
            <blockquote v-if="m.note">{{ m.note }}</blockquote>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.history {
  padding: 16px 18px 18px;
}

/* Wide screens: stays in view next to the product and scrolls on its own */
@media (min-width: 1001px) {
  .history {
    position: sticky;
    top: calc(var(--top) + 16px);
    max-height: calc(100vh - var(--top) - 32px);
    overflow-y: auto;
  }
}

h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-size: 15px;
}

.sub {
  margin: 2px 0 0;
  font-size: 13px;
}

.day {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

ol,
.track {
  list-style: none;
  margin: 0;
  padding: 0;
}

ol {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

ol > li {
  display: flex;
  gap: 10px;
}

.track {
  margin-top: 2px;
  font-size: 13px;
  color: var(--ink-2);
}

.rejected {
  color: var(--danger-fg);
}

p {
  margin: 0 0 2px;
}

.avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-hover);
  font-size: 12px;
  font-weight: 600;
}

.who {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.who time {
  font-size: 13px;
}

b {
  color: var(--ink);
  font-weight: 600;
}

a {
  color: var(--ink-2);
  text-decoration: none;
}

a:hover {
  color: var(--accent);
  text-decoration: underline;
}

blockquote {
  margin: 6px 0 0;
  padding: 8px 12px;
  border-left: 3px solid var(--border);
  background: var(--surface-2);
  font-size: 13px;
}
</style>
