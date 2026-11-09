import { http, HttpError } from './http'
import { getProduct } from './products'
import { checkMovement, isWriteOff } from '@/utils/movementRules'
import type { Id, NewMovement, StockMovement, User } from '@/types'

const newestFirst = { _sort: 'createdAt', _order: 'desc' }

export function listByProduct(productId: Id) {
  return http.get<StockMovement[]>('/movements', { productId, ...newestFirst })
}

export function listByUser(userId: Id) {
  return http.get<StockMovement[]>('/movements', { userId, ...newestFirst })
}

export function listRecent(limit = 6) {
  return http.get<StockMovement[]>('/movements', { ...newestFirst, _limit: limit })
}

export function listPending() {
  return http.get<StockMovement[]>('/movements', { status: 'PENDING', _sort: 'createdAt', _order: 'asc' })
}

export function getMovement(id: Id) {
  return http.get<StockMovement>(`/movements/${id}`)
}

function now() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

// Mock only: below, the browser does the server's work (checks, quantityAfter, product update).
// In M3 each function becomes one request: POST /movements, PATCH /movements/:id/approve or /reject.

export async function createMovement(input: NewMovement, user: User): Promise<StockMovement> {
  const product = await getProduct(input.productId)
  const errors = checkMovement(input, product)
  const first = Object.values(errors)[0]
  if (first) throw new HttpError(400, first, errors)

  const change = input.type === 'IN' ? input.quantity : -input.quantity
  const waits = user.role === 'STAFF' && isWriteOff(input.reason)
  const quantityAfter = product.quantity + (waits ? 0 : change)
  const isPurchase = input.reason === 'PURCHASE'

  const movement = await http.post<StockMovement>('/movements', {
    productId: product.id,
    userId: user.id,
    type: input.type,
    reason: input.reason,
    change,
    quantityAfter,
    unitCost: product.costPrice,
    status: waits ? 'PENDING' : 'APPLIED',
    supplierId: isPurchase ? input.supplierId : null,
    invoiceNo: isPurchase ? input.invoiceNo?.trim() || null : null,
    note: input.note?.trim() || null,
    reviewedById: null,
    rejectReason: null,
    createdAt: now(),
  })

  if (!waits) await http.patch(`/products/${product.id}`, { quantity: quantityAfter })
  return movement
}

export async function approveMovement(id: Id, manager: User): Promise<StockMovement> {
  const movement = await getMovement(id)
  const product = await getProduct(movement.productId)
  const quantityAfter = product.quantity + movement.change
  if (quantityAfter < 0) throw new HttpError(400, `Not enough stock: only ${product.quantity} left`)

  const updated = await http.patch<StockMovement>(`/movements/${id}`, {
    status: 'APPLIED',
    quantityAfter,
    reviewedById: manager.id,
  })
  await http.patch(`/products/${product.id}`, { quantity: quantityAfter })
  return updated
}

export async function rejectMovement(id: Id, reason: string, manager: User): Promise<StockMovement> {
  const missing = 'Please give a reason for rejecting'
  if (!reason.trim()) throw new HttpError(400, missing, { rejectReason: missing })
  return http.patch<StockMovement>(`/movements/${id}`, {
    status: 'REJECTED',
    rejectReason: reason.trim(),
    reviewedById: manager.id,
  })
}
