<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatTime, reasonLabel } from '@/utils/format'
import type { StockMovement } from '@/types'

const props = defineProps<{
  movement: StockMovement
  recordedBy: string
  reviewedBy: string // "" when nobody has reviewed it yet
  amount: string // "−2 packs"
}>()

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const day = computed(() =>
  new Date(props.movement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
)
const verb = computed(() => ({ IN: 'Received', OUT: 'Sent out', ADJUST: 'Adjusted' })[props.movement.type])
</script>

<template>
  <section class="panel history" aria-labelledby="history-title">
    <header>
      <div>
        <h2 id="history-title">History</h2>
        <p class="muted">Moves are never edited or deleted</p>
      </div>
      <AppIcon name="history" :size="18" class="muted" />
    </header>

    <p class="day">{{ day }}</p>
    <ol>
      <li>
        <span class="avatar" aria-hidden="true">{{ initials(recordedBy) }}</span>
        <div>
          <p class="who">
            <b>{{ recordedBy }}</b> <span class="muted">{{ formatTime(movement.createdAt) }}</span>
            <StatusBadge :status="movement.reviewedById ? 'PENDING' : movement.status" />
          </p>
          <p>{{ verb }} · {{ reasonLabel(movement) }}</p>
          <p><b>{{ amount }}</b></p>
          <blockquote v-if="movement.note">{{ movement.note }}</blockquote>
        </div>
      </li>
      <li v-if="movement.reviewedById !== null">
        <span class="avatar" aria-hidden="true">{{ initials(reviewedBy) }}</span>
        <div>
          <p class="who">
            <b>{{ reviewedBy }}</b>
            <StatusBadge :status="movement.status" />
          </p>
          <p>{{ movement.status === 'REJECTED' ? 'Rejected the write-off' : 'Approved the write-off' }}</p>
          <blockquote v-if="movement.rejectReason">{{ movement.rejectReason }}</blockquote>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.history {
  padding: 16px 18px 18px;
}

header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

h2 {
  font-size: 15px;
}

header p {
  margin: 2px 0 0;
  font-size: 13px;
}

.day {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

li {
  display: flex;
  gap: 10px;
}

li p {
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

b {
  color: var(--ink);
  font-weight: 600;
}

blockquote {
  margin: 6px 0 0;
  padding: 8px 12px;
  border-left: 3px solid var(--border);
  background: var(--surface-2);
  font-size: 13px;
}
</style>
