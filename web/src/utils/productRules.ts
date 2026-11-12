import { UNITS } from '@/types'
import type { ProductInput } from '@/types'

export type ProductField = 'name' | 'sku' | 'categoryId' | 'unit' | 'costPrice' | 'reorderLevel' | 'targetLevel'
export type ProductErrors = Partial<Record<ProductField, string>>

export const SKU_PATTERN = /^[A-Z]{3}-\d{4}$/ // DRK-0001: 3 letters, a dash, 4 digits

// Used by the product form and by the mock API, so both give the same messages.
// "SKU already exists" needs the other products, so only the API checks it.
export function checkProduct(input: ProductInput): ProductErrors {
  const errors: ProductErrors = {}

  if (!input.name.trim()) errors.name = 'Name is required'
  if (!SKU_PATTERN.test(input.sku)) errors.sku = 'SKU must be 3 letters, a dash and 4 digits, like DRK-0001'
  if (!input.categoryId) errors.categoryId = 'Choose a category'
  if (!UNITS.includes(input.unit)) errors.unit = 'Choose a storage unit'
  if (!Number.isFinite(input.costPrice) || input.costPrice < 0) errors.costPrice = 'Cost price must be 0 or more'

  if (!Number.isInteger(input.reorderLevel) || input.reorderLevel < 0) {
    errors.reorderLevel = 'Reorder level must be a whole number, 0 or more'
  }
  if (!Number.isInteger(input.targetLevel) || input.targetLevel < 1) {
    errors.targetLevel = 'Target level must be a whole number, 1 or more'
  } else if (!errors.reorderLevel && input.targetLevel <= input.reorderLevel) {
    errors.targetLevel = 'Target level must be higher than the reorder level'
  }
  return errors
}
