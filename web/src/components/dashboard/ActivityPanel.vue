<script setup lang="ts">
import type { Id } from '@/types'

export interface Activity {
  id: Id
  who: string | null // manager only: who recorded it
  verb: string // "sent out"
  amount: string // "11 cases"
  productId: Id
  productName: string
  when: string // "Nov 6, 10:34 · To the shop"
  kind: 'in' | 'out' | 'adj'
}

defineProps<{ title: string; items: Activity[]; seeAll: string }>()
</script>

<template>
  <section class="panel" aria-labelledby="activity-title">
    <header class="head">
      <h2 id="activity-title">{{ title }}</h2>
      <RouterLink :to="seeAll" class="see-all">See all</RouterLink>
    </header>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">
        <RouterLink :to="`/products/${item.productId}`" class="item">
          <span class="dot" :class="item.kind" aria-hidden="true" />
          <span class="body">
            <span>
              <template v-if="item.who"><b>{{ item.who }}</b>&nbsp;</template>{{ item.verb }}
              <b>{{ item.amount }}</b> {{ item.productName }}
            </span>
            <small>{{ item.when }}</small>
          </span>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="empty">No moves yet</p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--row);
}

.head h2 {
  font-size: 15px;
}

.see-all {
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

ul {
  list-style: none;
  margin: 0;
  padding: 6px 0;
}

.item {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  color: var(--ink-2);
  text-decoration: none;
}

.item:hover {
  background: var(--surface-2);
}

b {
  color: var(--ink);
  font-weight: 600;
}

.dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--muted);
}

.dot.in {
  background: var(--success-line);
}

.dot.out {
  background: var(--low-line);
}

.dot.adj {
  background: var(--adj-fg);
}

.body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

small {
  color: var(--muted);
  font-size: 12px;
}

.empty {
  margin: 0;
  padding: 16px;
  color: var(--muted);
}
</style>
