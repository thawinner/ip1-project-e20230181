import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as productsApi from '@/api/products'
import { HttpError } from '@/api/http'
import { errorMessage } from '@/utils/errors'
import type { Id, Page, Product, ProductInput } from '@/types'

export const useProductStore = defineStore('products', () => {
  // One page of the products list
  const page = ref<Page<Product>>({ items: [], total: 0, page: 1, perPage: 10 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Every product, for the dashboard, the low-stock count and product names
  const all = ref<Product[]>([])

  // The product page
  const current = ref<Product | null>(null)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)
  const currentNotFound = ref(false)

  const lowStock = computed(() => all.value.filter(productsApi.isLowStock))

  async function fetchPage(query: productsApi.ProductQuery) {
    loading.value = true
    error.value = null
    try {
      page.value = await productsApi.listProducts(query)
    } catch (e) {
      error.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    try {
      all.value = await productsApi.listAllProducts()
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  async function fetchOne(id: Id) {
    currentLoading.value = true
    currentError.value = null
    currentNotFound.value = false
    try {
      current.value = await productsApi.getProduct(id)
      replace(current.value)
    } catch (e) {
      current.value = null
      if (e instanceof HttpError && e.status === 404) currentNotFound.value = true
      else currentError.value = errorMessage(e)
    } finally {
      currentLoading.value = false
    }
  }

  // After a movement: show the new quantity everywhere without reloading every list
  function replace(product: Product) {
    const swap = (list: Product[]) => list.map((p) => (p.id === product.id ? product : p))
    all.value = swap(all.value)
    page.value = { ...page.value, items: swap(page.value.items) }
    if (current.value?.id === product.id) current.value = product
  }

  // These throw on purpose: the form shows the message under the field
  async function save(id: Id | null, input: ProductInput) {
    const saved = id === null ? await productsApi.createProduct(input) : await productsApi.updateProduct(id, input)
    all.value = [...all.value.filter((p) => p.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name))
    replace(saved)
    return saved
  }

  async function setArchived(id: Id, archived: boolean) {
    replace(await productsApi.setArchived(id, archived))
  }

  async function remove(id: Id) {
    await productsApi.deleteProduct(id)
    all.value = all.value.filter((p) => p.id !== id)
    if (current.value?.id === id) current.value = null
  }

  function byId(id: Id) {
    return all.value.find((p) => p.id === id)
  }

  return {
    page,
    loading,
    error,
    all,
    current,
    currentLoading,
    currentError,
    currentNotFound,
    lowStock,
    fetchPage,
    fetchAll,
    fetchOne,
    replace,
    save,
    setArchived,
    remove,
    byId,
  }
})
