// Entities from PROPOSAL.md, shaped like the API. Dates are ISO strings.

export type Id = number

export const ROLES = ['STAFF', 'MANAGER'] as const
export type Role = (typeof ROLES)[number]

export const UNITS = ['CASE', 'BOX', 'BAG', 'PACK', 'PIECE'] as const
export type Unit = (typeof UNITS)[number]

export const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const MOVEMENT_STATUSES = ['APPLIED', 'PENDING', 'REJECTED'] as const
export type MovementStatus = (typeof MOVEMENT_STATUSES)[number]

export const REASONS = {
  IN: ['PURCHASE', 'RETURN_FROM_SHOP'],
  OUT: ['TO_SHOP', 'DAMAGED', 'EXPIRED', 'RETURN_TO_SUPPLIER'],
} as const
export type InReason = (typeof REASONS.IN)[number]
export type OutReason = (typeof REASONS.OUT)[number]
export type Reason = InReason | OutReason

// Need a note and the manager's approval
export const WRITE_OFF_REASONS: readonly Reason[] = ['DAMAGED', 'EXPIRED', 'RETURN_TO_SUPPLIER']

// passwordHash stays on the server
export interface User {
  id: Id
  fullName: string
  username: string
  phone: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
}

export interface Category {
  id: Id
  name: string
  description: string
}

export interface Supplier {
  id: Id
  name: string
  phone: string
  email: string
  address: string
}

export interface Product {
  id: Id
  sku: string
  name: string
  categoryId: Id
  supplierId: Id | null
  unit: Unit
  costPrice: number
  quantity: number
  reorderLevel: number
  targetLevel: number
  isActive: boolean
  imageUrl: string | null
}

export interface StockMovement {
  id: Id
  productId: Id
  userId: Id
  type: MovementType
  reason: Reason | null // null for ADJUST
  change: number // signed: +12, -3
  quantityAfter: number
  unitCost: number
  status: MovementStatus
  supplierId: Id | null // PURCHASE only
  invoiceNo: string | null
  note: string | null
  reviewedById: Id | null
  rejectReason: string | null
  createdAt: string
}

export interface LoginInput {
  username: string
  password: string
}

// The server works out change, quantityAfter, unitCost, status and createdAt
export interface NewMovement {
  productId: Id
  type: 'IN' | 'OUT'
  reason: Reason
  quantity: number
  supplierId: Id | null
  invoiceNo: string | null
  note: string | null
}

// What the manager types in the product form; the server keeps quantity (starts at 0), isActive and imageUrl
export type ProductInput = Pick<
  Product,
  'sku' | 'name' | 'categoryId' | 'supplierId' | 'unit' | 'costPrice' | 'reorderLevel' | 'targetLevel'
>

export interface Page<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}

export interface ApiError {
  status: number
  message: string
  fields?: Record<string, string>
}
