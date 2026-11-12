import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import type { CountKey } from '@/apps'

// The numbers on the home menu tiles and in the top bar
export function useCounts() {
  const auth = useAuthStore()
  const movements = useMovementStore()
  const products = useProductStore()

  const counts = computed<Record<CountKey, number>>(() => ({
    pending: movements.pendingCount,
    low: products.lowStock.length,
    rejected: movements.mine.filter((m) => m.status === 'REJECTED').length,
  }))

  function load() {
    if (!auth.user) return Promise.resolve()
    return Promise.all([
      products.fetchAll(),
      auth.isManager ? movements.fetchPending() : movements.fetchMine(),
    ]).then(() => undefined)
  }

  return { counts, load }
}
