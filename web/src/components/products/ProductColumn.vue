<script setup lang="ts">
import { computed } from 'vue'
import ProductCard from './ProductCard.vue'
import { isLowStock } from '@/api/products'
import type { ProductGroup } from './groups'
import type { Id } from '@/types'

const props = defineProps<{
  group: ProductGroup
  shown: number
  categoryName: (id: Id) => string
  supplierName: (id: Id | null) => string
}>()
const emit = defineEmits<{ 'show-more': [] }>()

// Green part = in stock, orange part = low
const okShare = computed(() => {
  const all = props.group.products
  if (!all.length) return '100%'
  return `${(all.filter((p) => !isLowStock(p)).length / all.length) * 100}%`
})
const more = computed(() => Math.min(10, props.group.products.length - props.shown))
</script>

<template>
  <section class="col" :aria-labelledby="`col-${group.key}`">
    <h2 :id="`col-${group.key}`">
      {{ group.title }} <span class="n">{{ group.products.length }}</span>
    </h2>
    <div class="split" aria-hidden="true"><span :style="{ width: okShare }" /></div>
    <ProductCard
      v-for="p in group.products.slice(0, shown)"
      :key="p.id"
      :product="p"
      :category-name="categoryName(p.categoryId)"
      :supplier-name="supplierName(p.supplierId)"
    />
    <button v-if="more > 0" type="button" class="btn btn-outline more" @click="emit('show-more')">
      Show {{ more }} more
    </button>
  </section>
</template>

<style scoped>
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.col :deep(.title) {
  overflow-wrap: anywhere;
}

h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 0;
  font-size: 14px;
}

.n {
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--row);
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}

.split {
  height: 3px;
  margin-bottom: 4px;
  border-radius: 2px;
  background: var(--low-line);
}

.split span {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--success-line);
}

.more {
  width: 100%;
}

/* Tablets: cards side by side inside the group */
@media (max-width: 1180px) and (min-width: 721px) {
  .col {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  h2,
  .split,
  .more {
    grid-column: 1 / -1;
  }
}
</style>
