import { http, HttpError } from './http'
import { getProduct, listAllProducts } from './products'
import { listSuppliers } from './suppliers'
import { listUsers } from './users'
import { checkAdjustment, checkMovement, isWriteOff } from '@/utils/movementRules'
import { reasonLabel } from '@/utils/format'
import { sortRows, type SortState } from '@/utils/sort'
import type { Id, MovementStatus, MovementType, NewMovement, Page, Reason, StockMovement, User } from '@/types'

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

export interface MovementQuery {
  userId?: Id // only this person's moves
  types?: readonly MovementType[] // any of these (empty = all)
  statuses?: readonly MovementStatus[]
  reasons?: readonly Reason[]
  since?: string // "2026-10-12": moves on or after this day
  search?: string
  sort?: SortState // newest first when not given
  page: number
  perPage: number
}

export interface MovementPage extends Page<StockMovement> {
  appliedValue: number // value of the applied moves in the whole result, for the total row
}

// Mock only: json-server cannot search across products, people and suppliers, so the browser filters and
// pages here. The real API does it in one query: GET /movements?search=…&page=…
export async function listMovements(query: MovementQuery): Promise<MovementPage> {
  let items = await http.get<StockMovement[]>('/movements', {
    userId: query.userId,
    createdAt_gte: query.since,
    ...newestFirst,
  })
  const { types, statuses } = query
  if (types?.length) items = items.filter((m) => types.includes(m.type))
  if (statuses?.length) items = items.filter((m) => statuses.includes(m.status))
  const reasons = query.reasons
  if (reasons?.length) items = items.filter((m) => m.reason !== null && reasons.includes(m.reason))

  const text = query.search?.trim().toLowerCase()
  const sort = query.sort
  const byName = sort?.id === 'product' || sort?.id === 'user'
  const [products, users, suppliers] = text || byName
    ? await Promise.all([listAllProducts(), listUsers(), listSuppliers()])
    : [[], [], []]
  if (text) {
    items = items.filter((m) => {
      const product = products.find((p) => p.id === m.productId)
      const words = [
        product?.name,
        product?.sku,
        m.invoiceNo,
        m.note,
        users.find((u) => u.id === m.userId)?.fullName,
        suppliers.find((s) => s.id === m.supplierId)?.name,
      ]
      return words.some((w) => w?.toLowerCase().includes(text))
    })
  }

  items = sortRows(items, sort ?? null, {
    date: (m) => m.createdAt,
    product: (m) => products.find((p) => p.id === m.productId)?.name ?? '',
    type: (m) => m.type,
    reason: (m) => reasonLabel(m),
    quantity: (m) => m.change,
    user: (m) => users.find((u) => u.id === m.userId)?.fullName ?? '',
    value: (m) => m.change * m.unitCost,
    status: (m) => m.status,
  })

  const appliedValue = items
    .filter((m) => m.status === 'APPLIED')
    .reduce((sum, m) => sum + m.change * m.unitCost, 0)
  const start = (query.page - 1) * query.perPage
  return {
    items: items.slice(start, start + query.perPage),
    total: items.length,
    page: query.page,
    perPage: query.perPage,
    appliedValue,
  }
}

// Mock only: the real API answers 404 itself when a storekeeper asks for someone else's move (story 6)
export async function getMovementFor(id: Id, user: User) {
  const movement = await getMovement(id)
  if (user.role === 'STAFF' && movement.userId !== user.id) throw new HttpError(404, 'Not found')
  return movement
}

function now() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

// Mock only: below, the browser does the server's work (checks, quantityAfter, product update).
// In M3 each function becomes one request: POST /movements, PATCH /movements/:id/approve or /reject.

const ARCHIVED = 'This product is archived. Restore it first'

export async function createMovement(input: NewMovement, user: User): Promise<StockMovement> {
  const product = await getProduct(input.productId)
  if (!product.isActive) throw new HttpError(409, ARCHIVED)
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

// Story 8: counted 18 when the system says 20 saves an adjustment of -2 with the note
export async function adjustStock(productId: Id, counted: number, note: string, manager: User): Promise<StockMovement> {
  const product = await getProduct(productId)
  if (!product.isActive) throw new HttpError(409, ARCHIVED)
  const errors = checkAdjustment(counted, note, product)
  const first = Object.values(errors)[0]
  if (first) throw new HttpError(400, first, errors)

  const movement = await http.post<StockMovement>('/movements', {
    productId,
    userId: manager.id,
    type: 'ADJUST',
    reason: null,
    change: counted - product.quantity,
    quantityAfter: counted,
    unitCost: product.costPrice,
    status: 'APPLIED',
    supplierId: null,
    invoiceNo: null,
    note: note.trim(),
    reviewedById: null,
    rejectReason: null,
    createdAt: now(),
  })
  await http.patch(`/products/${productId}`, { quantity: counted })
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
