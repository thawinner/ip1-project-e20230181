import { http, HttpError } from './http'
import type { Category, Id, Product } from '@/types'

export type CategoryInput = Omit<Category, 'id'>

export function listCategories() {
  return http.get<Category[]>('/categories', { _sort: 'name' })
}

// Mock only: below, the browser checks what the server will check (POST/PATCH/DELETE /categories in M2)

async function checkName(input: CategoryInput, id: Id | null) {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'Name is required', { name: 'Name is required' })
  const all = await listCategories()
  if (all.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) {
    throw new HttpError(409, 'This name is already used', { name: 'This name is already used' })
  }
  return { name, description: input.description.trim() }
}

export async function createCategory(input: CategoryInput) {
  return http.post<Category>('/categories', await checkName(input, null))
}

export async function updateCategory(id: Id, input: CategoryInput) {
  return http.patch<Category>(`/categories/${id}`, await checkName(input, id))
}

// Story 10: a category that still has products cannot be deleted
export async function deleteCategory(id: Id) {
  const used = await http.get<Product[]>('/products', { categoryId: id, _limit: 1 })
  if (used.length) throw new HttpError(409, 'Move or delete its products first')
  await http.delete(`/categories/${id}`)
}
