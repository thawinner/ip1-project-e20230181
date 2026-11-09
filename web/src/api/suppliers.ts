import { http } from './http'
import type { Supplier } from '@/types'

export function listSuppliers() {
  return http.get<Supplier[]>('/suppliers', { _sort: 'name' })
}
