import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listCategories } from '@/api/categories'
import { listSuppliers } from '@/api/suppliers'
import { listUsers } from '@/api/users'
import { errorMessage } from '@/utils/errors'
import type { Category, Id, Supplier, User } from '@/types'

// Small lists that rarely change: loaded once, used by many pages
export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref<Category[]>([])
  const suppliers = ref<Supplier[]>([])
  const users = ref<User[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(force = false) {
    if (loaded.value && !force) return
    error.value = null
    try {
      const [c, s] = await Promise.all([listCategories(), listSuppliers()])
      categories.value = c
      suppliers.value = s
      loaded.value = true
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  // Manager only: names for "Recorded by"
  async function fetchUsers() {
    try {
      users.value = await listUsers()
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  const categoryName = (id: Id) => categories.value.find((c) => c.id === id)?.name ?? ''
  const supplierName = (id: Id | null) => suppliers.value.find((s) => s.id === id)?.name ?? 'No supplier'
  const userName = (id: Id) => users.value.find((u) => u.id === id)?.fullName ?? ''

  return { categories, suppliers, users, loaded, error, fetchAll, fetchUsers, categoryName, supplierName, userName }
})
