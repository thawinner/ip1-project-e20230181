import { isLowStock } from '@/api/products'
import { unitLabel } from '@/utils/format'
import type { GroupOption } from '@/components/search/filters'
import type { Category, Product, Supplier } from '@/types'

export interface ProductGroup {
  key: string
  title: string
  products: Product[]
}

// "Group by" on Products: Category, Supplier, Storage unit, Stock status (no supplier and archived last)
export function productGroupBys(categories: Category[], suppliers: Supplier[]): GroupOption<Product>[] {
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? ''
  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? 'No supplier'
  return [
    { id: 'category', label: 'Category', key: (p) => ({ id: p.categoryId, title: categoryName(p.categoryId) }) },
    {
      id: 'supplier',
      label: 'Supplier',
      key: (p) => ({ id: p.supplierId ?? 0, title: supplierName(p.supplierId), order: p.supplierId ? supplierName(p.supplierId) : '~' }),
    },
    {
      id: 'unit',
      label: 'Storage unit',
      key: (p) => ({ id: p.unit, title: unitLabel(p.unit).replace(/^./, (c) => c.toUpperCase()) }),
    },
    {
      id: 'stock',
      label: 'Stock status',
      key: (p) => {
        if (!p.isActive) return { id: 'archived', title: 'Archived', order: 4 }
        if (p.quantity === 0) return { id: 'out', title: 'Out of stock', order: 1 }
        if (isLowStock(p)) return { id: 'low', title: 'Low stock', order: 2 }
        return { id: 'ok', title: 'In stock', order: 3 }
      },
    },
  ]
}
