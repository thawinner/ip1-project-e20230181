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

  // The Moves and My moves lists (one page) and the Move page
  const page = ref<movementsApi.MovementPage>({ items: [], total: 0, page: 1, perPage: 10, appliedValue: 0 })
  const pageLoading = ref(false)
  const pageError = ref<string | null>(null)
  const current = ref<StockMovement | null>(null)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)
  const currentNotFound = ref(false)

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

  async function fetchPage(query: Omit<movementsApi.MovementQuery, 'userId'>, mineOnly: boolean) {
    pageLoading.value = true
    pageError.value = null
    try {
      page.value = await movementsApi.listMovements({ ...query, userId: mineOnly ? currentUser().id : undefined })
    } catch (e) {
      pageError.value = errorMessage(e)
    } finally {
      pageLoading.value = false
    }
  }

  async function fetchOne(id: Id) {
    currentLoading.value = true
    currentError.value = null
    currentNotFound.value = false
    try {
      current.value = await movementsApi.getMovementFor(id, currentUser())
    } catch (e) {
      current.value = null
      if (e instanceof HttpError && e.status === 404) currentNotFound.value = true
      else currentError.value = errorMessage(e)
    } finally {
      currentLoading.value = false
    }
  }

  // After approve / reject: the Move page shows the new status
  function updateCurrent(movement: StockMovement) {
    if (current.value?.id === movement.id) current.value = movement
  }

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

  // Throws on purpose: the Adjust stock dialog shows the message under the field
  async function adjust(productId: Id, counted: number, note: string) {
    saving.value = true
    try {
      const movement = await movementsApi.adjustStock(productId, counted, note, currentUser())
      forProduct.value = [movement, ...forProduct.value]
      await refreshProduct(productId)
      return movement
    } finally {
      saving.value = false
    }
  }

  async function approve(id: Id) {
    const movement = await movementsApi.approveMovement(id, currentUser())
    pending.value = pending.value.filter((m) => m.id !== id)
    updateCurrent(movement)
    await refreshProduct(movement.productId)
    return movement
  }

  async function reject(id: Id, reason: string) {
    const movement = await movementsApi.rejectMovement(id, reason, currentUser())
    pending.value = pending.value.filter((m) => m.id !== id)
    updateCurrent(movement)
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
    page,
    pageLoading,
    pageError,
    current,
    currentLoading,
    currentError,
    currentNotFound,
    pendingCount,
    fetchByProduct,
    fetchMine,
    fetchRecent,
    fetchPending,
    fetchPage,
    fetchOne,
    create,
    adjust,
    approve,
    reject,
  }
})
