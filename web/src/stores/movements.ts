import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as movementsApi from '@/api/movements'
import { getProduct } from '@/api/products'
import { HttpError } from '@/api/http'
import { useAuthStore } from './auth'
import { useProductStore } from './products'
import { errorMessage } from '@/utils/errors'
import type { Id, NewMovement, StockMovement, User } from '@/types'

interface Delivery {
  supplierId: Id
  invoiceNo: string | null
}

export const useMovementStore = defineStore('movements', () => {
  const forProduct = ref<StockMovement[]>([])
  const mine = ref<StockMovement[]>([])
  const recent = ref<StockMovement[]>([])
  const pending = ref<StockMovement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)

  // The delivery being unpacked: kept for the next product
  const lastDelivery = ref<Delivery | null>(null)

  const pendingCount = computed(() => pending.value.length)

  function currentUser(): User {
    const auth = useAuthStore()
    if (!auth.user) throw new HttpError(401, 'Your session has expired, please log in again')
    return auth.user
  }

  async function load(target: typeof forProduct, request: () => Promise<StockMovement[]>) {
    loading.value = true
    error.value = null
    try {
      target.value = await request()
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  const fetchByProduct = (productId: Id) => load(forProduct, () => movementsApi.listByProduct(productId))
  const fetchMine = () => load(mine, () => movementsApi.listByUser(currentUser().id))
  const fetchRecent = () => load(recent, () => movementsApi.listRecent())
  const fetchPending = () => load(pending, movementsApi.listPending)

  async function refreshProduct(productId: Id) {
    useProductStore().replace(await getProduct(productId))
  }

  // These throw on purpose: the form shows the message under the field
  async function create(input: NewMovement) {
    saving.value = true
    try {
      const movement = await movementsApi.createMovement(input, currentUser())
      forProduct.value = [movement, ...forProduct.value]
      if (movement.status === 'PENDING') pending.value = [...pending.value, movement]
      if (input.reason === 'PURCHASE' && input.supplierId) {
        lastDelivery.value = { supplierId: input.supplierId, invoiceNo: input.invoiceNo }
      }
      await refreshProduct(input.productId)
      return movement
    } finally {
      saving.value = false
    }
  }

  async function approve(id: Id) {
    const movement = await movementsApi.approveMovement(id, currentUser())
    pending.value = pending.value.filter((m) => m.id !== id)
    await refreshProduct(movement.productId)
    return movement
  }

  async function reject(id: Id, reason: string) {
    const movement = await movementsApi.rejectMovement(id, reason, currentUser())
    pending.value = pending.value.filter((m) => m.id !== id)
    return movement
  }

  return {
    forProduct,
    mine,
    recent,
    pending,
    loading,
    error,
    saving,
    lastDelivery,
    pendingCount,
    fetchByProduct,
    fetchMine,
    fetchRecent,
    fetchPending,
    create,
    approve,
    reject,
  }
})
