<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import StockBadge from '@/components/StockBadge.vue'
import StockBar from './StockBar.vue'
import { unitWord } from '@/utils/format'
import type { Product } from '@/types'

defineProps<{ product: Product; categoryName: string; supplierName: string }>()
</script>

<template>
  <RouterLink :to="`/products/${product.id}`" class="card">
    <span class="thumb pic"><AppIcon name="box" :size="26" /></span>
    <span class="body">
      <span class="title">{{ product.name }}</span>
      <span class="sku">{{ product.sku }}</span>
      <span class="meta">{{ categoryName }} · {{ supplierName }}</span>
      <span class="foot">
        <span class="qty">{{ product.quantity }} <small>{{ unitWord(product.quantity, product.unit) }}</small></span>
        <StockBadge :product="product" />
      </span>
      <StockBar
        class="meter"
        :quantity="product.quantity"
        :reorder-level="product.reorderLevel"
        :target-level="product.targetLevel"
      />
    </span>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--card-shadow);
  color: var(--ink-2);
  text-decoration: none;
}

.card:hover {
  border-color: var(--accent-line);
}

.pic {
  width: 56px;
  height: 56px;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}

.sku {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

.meta {
  font-size: 13px;
  color: var(--muted);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
}

.qty {
  font-weight: 600;
  color: var(--ink);
}

.qty small {
  font-weight: 400;
  color: var(--muted);
}

.meter {
  margin-top: 8px;
}
</style>
