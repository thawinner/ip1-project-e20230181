import { http, HttpError } from './http'
import type { Id, Product, StockMovement, Supplier } from '@/types'

export type SupplierInput = Omit<Supplier, 'id'>

export function listSuppliers() {
  return http.get<Supplier[]>('/suppliers', { _sort: 'name' })
}

// Mock only: below, the browser checks what the server will check (POST/PATCH/DELETE /suppliers in M2)

async function checkName(input: SupplierInput, id: Id | null): Promise<SupplierInput> {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'Name is required', { name: 'Name is required' })
  const all = await listSuppliers()
  if (all.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== id)) {
    throw new HttpError(409, 'This name is already used', { name: 'This name is already used' })
  }
  return { name, phone: input.phone.trim(), email: input.email.trim(), address: input.address.trim() }
}

export async function createSupplier(input: SupplierInput) {
  return http.post<Supplier>('/suppliers', await checkName(input, null))
}

export async function updateSupplier(id: Id, input: SupplierInput) {
  return http.patch<Supplier>(`/suppliers/${id}`, await checkName(input, id))
}

// Story 10: not while products use it; and not while deliveries name it, so the history keeps its supplier
export async function deleteSupplier(id: Id) {
  const [products, deliveries] = await Promise.all([
    http.get<Product[]>('/products', { supplierId: id, _limit: 1 }),
    http.get<StockMovement[]>('/movements', { supplierId: id, _limit: 1 }),
  ])
  if (products.length || deliveries.length) throw new HttpError(409, 'Move or delete its products first')
  await http.delete(`/suppliers/${id}`)
}
