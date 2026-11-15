import { http, HttpError } from './http'
import { checkProduct } from '@/utils/productRules'
import { sortRows, type SortState } from '@/utils/sort'
import type { Id, Page, Product, ProductInput, StockMovement } from '@/types'

export interface ProductQuery {
  search?: string
  categoryId?: Id
  supplierId?: Id
  stock?: ('low' | 'out')[] // low stock and / or out of stock (either one)
  status?: 'active' | 'archived' | 'all' // manager: archived products are hidden unless asked for
  sort?: SortState // by name when not given
  page?: number
  perPage?: number
}

export function isLowStock(product: Product) {
  return product.isActive && product.quantity <= product.reorderLevel
}

// The columns the list can sort by, and the product field for each one
const SORT_FIELDS: Record<string, keyof Product> = {
  name: 'name',
  quantity: 'quantity',
  reorder: 'reorderLevel',
  cost: 'costPrice',
}

export async function listProducts(query: ProductQuery = {}): Promise<Page<Product>> {
  const page = Math.max(query.page ?? 1, 1)
  const perPage = query.perPage ?? 10
  const sort = query.sort ?? { id: 'name', dir: 'asc' }
  const field = SORT_FIELDS[sort.id]
  const params = {
    q: query.search?.trim(),
    categoryId: query.categoryId,
    supplierId: query.supplierId,
    isActive: query.status === 'all' ? undefined : query.status !== 'archived',
    _sort: field ?? 'name',
    _order: sort.dir,
  }

  const stock = query.stock ?? []
  if (!stock.length && field) return http.getPage<Product>('/products', params, page, perPage)

  // json-server cannot compare two fields ("low stock") or sort by stock value, so the browser does it here;
  // the real API does it in SQL
  let kept = await http.get<Product[]>('/products', params)
  if (stock.length) {
    kept = kept.filter((p) => (stock.includes('low') && isLowStock(p)) || (stock.includes('out') && p.quantity === 0))
  }
  if (!field) kept = sortRows(kept, sort, { value: (p) => p.quantity * p.costPrice })
  return { items: kept.slice((page - 1) * perPage, page * perPage), total: kept.length, page, perPage }
}

export function listAllProducts() {
  return http.get<Product[]>('/products', { _sort: 'name' })
}

export function getProduct(id: Id) {
  return http.get<Product>(`/products/${id}`)
}

// Mock only: below, the browser checks what the server will check (POST/PATCH/DELETE /products in M2)

async function check(input: ProductInput, id: Id | null): Promise<ProductInput> {
  const clean = { ...input, sku: input.sku.trim().toUpperCase(), name: input.name.trim() }
  const errors = checkProduct(clean)
  const first = Object.values(errors)[0]
  if (first) throw new HttpError(400, first, errors)

  const same = await http.get<Product[]>('/products', { sku: clean.sku })
  if (same.some((p) => p.id !== id)) {
    throw new HttpError(409, 'SKU already exists', { sku: 'SKU already exists' })
  }
  return clean
}

// Story 7: a new product starts at quantity 0; only stock moves change the quantity
export async function createProduct(input: ProductInput) {
  const clean = await check(input, null)
  return http.post<Product>('/products', { ...clean, quantity: 0, isActive: true, imageUrl: null })
}

export async function updateProduct(id: Id, input: ProductInput) {
  return http.patch<Product>(`/products/${id}`, await check(input, id))
}

export function setArchived(id: Id, archived: boolean) {
  return http.patch<Product>(`/products/${id}`, { isActive: !archived })
}

// Story 7: a product with movements can only be archived, so its history stays complete
export async function deleteProduct(id: Id) {
  const moves = await http.get<StockMovement[]>('/movements', { productId: id, _limit: 1 })
  if (moves.length) throw new HttpError(409, 'Archive it instead')
  await http.delete(`/products/${id}`)
}
