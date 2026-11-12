import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as categoriesApi from '@/api/categories'
import * as suppliersApi from '@/api/suppliers'
import * as usersApi from '@/api/users'
import { useAuthStore } from './auth'
import type { AccountInput } from '@/utils/accountRules'
import { errorMessage } from '@/utils/errors'
import type { Category, Id, Supplier, User } from '@/types'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

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
      const [c, s] = await Promise.all([categoriesApi.listCategories(), suppliersApi.listSuppliers()])
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
      users.value = await usersApi.listUsers()
    } catch (e) {
      error.value = errorMessage(e)
    }
  }

  // Save and delete throw on purpose: the dialog shows the message under the field

  async function saveCategory(id: Id | null, input: categoriesApi.CategoryInput) {
    const saved = id === null ? await categoriesApi.createCategory(input) : await categoriesApi.updateCategory(id, input)
    categories.value = [...categories.value.filter((c) => c.id !== saved.id), saved].sort(byName)
    return saved
  }

  async function deleteCategory(id: Id) {
    await categoriesApi.deleteCategory(id)
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  async function saveSupplier(id: Id | null, input: suppliersApi.SupplierInput) {
    const saved = id === null ? await suppliersApi.createSupplier(input) : await suppliersApi.updateSupplier(id, input)
    suppliers.value = [...suppliers.value.filter((s) => s.id !== saved.id), saved].sort(byName)
    return saved
  }

  async function deleteSupplier(id: Id) {
    await suppliersApi.deleteSupplier(id)
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
  }

  // Staff accounts (stories 1 and 10)
  function putUser(saved: User) {
    users.value = [...users.value.filter((u) => u.id !== saved.id), saved].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    )
    useAuthStore().setUser(saved)
    return saved
  }

  async function saveUser(id: Id | null, input: AccountInput, temporaryPassword: string) {
    return putUser(id === null ? await usersApi.createUser(input, temporaryPassword) : await usersApi.updateUser(id, input))
  }

  async function setUserActive(id: Id, active: boolean) {
    const me = useAuthStore().user
    if (!me) return
    return putUser(await usersApi.setActive(id, active, me))
  }

  async function resetPassword(id: Id, temporaryPassword: string) {
    return putUser(await usersApi.resetPassword(id, temporaryPassword))
  }

  const categoryName = (id: Id) => categories.value.find((c) => c.id === id)?.name ?? ''
  const supplierName = (id: Id | null) => suppliers.value.find((s) => s.id === id)?.name ?? 'No supplier'
  const userName = (id: Id) => users.value.find((u) => u.id === id)?.fullName ?? ''

  return {
    categories,
    suppliers,
    users,
    loaded,
    error,
    fetchAll,
    fetchUsers,
    saveCategory,
    deleteCategory,
    saveSupplier,
    deleteSupplier,
    saveUser,
    setUserActive,
    resetPassword,
    categoryName,
    supplierName,
    userName,
  }
})
