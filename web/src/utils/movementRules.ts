import { REASONS, WRITE_OFF_REASONS } from '@/types'
import type { NewMovement, Product, Reason } from '@/types'

export type MovementField = 'quantity' | 'reason' | 'note' | 'supplierId' | 'invoiceNo'
export type MovementErrors = Partial<Record<MovementField, string>>

export const MAX_QUANTITY = 10_000
export const MAX_INVOICE_LENGTH = 30

export function isWriteOff(reason: Reason) {
  return WRITE_OFF_REASONS.includes(reason)
}

// Used by the Record stock form and by the mock API, so both give the same messages
export function checkMovement(input: NewMovement, product: Product): MovementErrors {
  const errors: MovementErrors = {}
  const { quantity, type, reason } = input

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    errors.quantity = 'Quantity must be a whole number from 1 to 10,000'
  } else if (type === 'OUT' && quantity > product.quantity) {
    errors.quantity = `Not enough stock: only ${product.quantity} left`
  }

  const allowed: readonly Reason[] = REASONS[type]
  if (!allowed.includes(reason)) errors.reason = 'Choose a reason'

  if (isWriteOff(reason) && !input.note?.trim()) errors.note = 'A note is required for this reason'

  if (reason === 'PURCHASE') {
    if (!input.supplierId) errors.supplierId = 'Choose the supplier who delivered'
    if ((input.invoiceNo ?? '').trim().length > MAX_INVOICE_LENGTH) {
      errors.invoiceNo = 'Invoice number can have at most 30 characters'
    }
  }

  return errors
}
