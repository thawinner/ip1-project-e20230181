<script setup lang="ts">
import { isLowStock } from '@/api/products'
import type { Product } from '@/types'

defineProps<{ product: Product }>()
</script>

<template>
  <span v-if="isLowStock(product)" class="badge warn">Low stock</span>
  <span v-else class="badge ok">In stock</span>
</template>
