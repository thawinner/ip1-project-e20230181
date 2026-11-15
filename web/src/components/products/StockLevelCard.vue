<script setup lang="ts">
import { computed } from 'vue'
import StockBar from './StockBar.vue'
import { isLowStock } from '@/api/products'
import { unitWord } from '@/utils/format'
import type { Product } from '@/types'

const props = defineProps<{ product: Product }>()

const low = computed(() => isLowStock(props.product))
const note = computed(() => {
  const p = props.product
  if (p.quantity >= p.targetLevel) return 'At target'
  return `${p.targetLevel - p.quantity} to target`
})
</script>

<template>
  <section class="panel card" aria-label="Stock level">
    <div class="row">
      <strong :class="low ? 'low' : 'ok'">{{ low ? 'Low stock' : 'In stock' }}</strong>
      <span>
        <b>{{ product.quantity }}</b> / {{ product.targetLevel }} {{ unitWord(product.targetLevel, product.unit) }}
      </span>
    </div>
    <StockBar
      class="meter"
      :quantity="product.quantity"
      :reorder-level="product.reorderLevel"
      :target-level="product.targetLevel"
    />
    <div class="row small">
      <span>Reorder at {{ product.reorderLevel }}</span>
      <span>{{ note }}</span>
    </div>
  </section>
</template>

<style scoped>
.card {
  padding: 14px 14px 12px;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

strong {
  font-size: 13px;
}

.ok {
  color: var(--success-fg);
}

.low {
  color: var(--low-fg);
}

b {
  font-size: 18px;
  color: var(--ink);
}

.meter {
  margin: 10px 0 8px;
}

.small {
  font-size: 12px;
}
</style>
