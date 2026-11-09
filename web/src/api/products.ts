import { http } from './http'
import type { Id, Page, Product } from '@/types'

export interface ProductQuery {
  search?: string
  categoryId?: Id
  supplierId?: Id
  lowOnly?: boolean
  page?: number
  perPage?: number
}

export function isLowStock(product: Product) {
  return product.quantity <= product.reorderLevel
}

export async function listProducts(query: ProductQuery = {}): Promise<Page<Product>> {
  const page = Math.max(query.page ?? 1, 1)
  const perPage = query.perPage ?? 10
  const params = {
    q: query.search?.trim(),
    categoryId: query.categoryId,
    supplierId: query.supplierId,
    isActive: true,
    _sort: 'name',
  }

  if (!query.lowOnly) return http.getPage<Product>('/products', params, page, perPage)

  // json-server cannot compare two fields, so "low stock" is filtered here; the real API does it in SQL
  const low = (await http.get<Product[]>('/products', params)).filter(isLowStock)
  return { items: low.slice((page - 1) * perPage, page * perPage), total: low.length, page, perPage }
}

export function listAllProducts() {
  return http.get<Product[]>('/products', { _sort: 'name' })
}

export function getProduct(id: Id) {
  return http.get<Product>(`/products/${id}`)
}
