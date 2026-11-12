<script setup lang="ts">
import { statusLabel } from '@/utils/format'
import type { MovementStatus } from '@/types'

defineProps<{ status: MovementStatus }>()

const KIND: Record<MovementStatus, string> = { APPLIED: 'ok', PENDING: 'warn', REJECTED: 'danger' }
</script>

<template>
  <span class="badge" :class="KIND[status]">{{ statusLabel(status) }}</span>
</template>
