import { http } from './http'
import { isLowStock, listAllProducts } from './products'
import { listCategories } from './categories'
import { listSuppliers } from './suppliers'
import { isWriteOff } from '@/utils/movementRules'
import { todayKey } from '@/utils/format'
import type { Category, Product, StockMovement, Supplier } from '@/types'

// Mock only: the browser adds up products and moves here. In M3 these become
// GET /reports/reorder and GET /reports/monthly?month=2026-11, computed by the server in SQL.

// ---------- Reorder list (story 9) ----------

export interface ReorderLine {
  product: Product
  suggested: number // target level − on hand
  cost: number // suggested × cost price
}

export interface ReorderGroup {
  supplier: Supplier | null // null = products with no supplier
  lines: ReorderLine[]
  cost: number
}

export async function getReorderList(): Promise<ReorderGroup[]> {
  const [products, suppliers] = await Promise.all([listAllProducts(), listSuppliers()])
  const low = products.filter(isLowStock)

  const groups = [...suppliers, null].map((supplier) => {
    const lines = low
      .filter((p) => p.supplierId === (supplier?.id ?? null))
      .map((product) => {
        const suggested = Math.max(product.targetLevel - product.quantity, 0)
        return { product, suggested, cost: suggested * product.costPrice }
      })
    return { supplier, lines, cost: lines.reduce((sum, l) => sum + l.cost, 0) }
  })
  return groups.filter((g) => g.lines.length > 0)
}

// ---------- Monthly report (story 9) ----------

export interface ProductTotals {
  product: Product
  in: number
  out: number
  losses: number // value at the cost price of the day
}

export interface CategoryTotals {
  category: Category
  in: number
  out: number
  losses: number
  products: ProductTotals[]
}

export interface MonthlyReport {
  month: string // "2026-11"
  stockValue: number // today, at cost price
  stockIn: number
  stockOut: number
  losses: number
  categories: CategoryTotals[]
  topToShop: { product: Product; quantity: number }[]
  lossMoves: { movement: StockMovement; product: Product | undefined; value: number }[]
  slowMoving: { product: Product; value: number }[] // nothing sent to the shop in 30 days
}

// Losses are applied write-offs and stock found missing at a count (a negative adjustment)
const isLoss = (m: StockMovement) =>
  m.status === 'APPLIED' && ((m.reason !== null && isWriteOff(m.reason)) || (m.type === 'ADJUST' && m.change < 0))
const lossValue = (m: StockMovement) => Math.abs(m.change) * m.unitCost

export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const [products, categories, all] = await Promise.all([
    listAllProducts(),
    listCategories(),
    http.get<StockMovement[]>('/movements', { status: 'APPLIED', _sort: 'createdAt', _order: 'desc' }),
  ])
  const moves = all.filter((m) => m.createdAt.startsWith(month))
  const productOf = (m: StockMovement) => products.find((p) => p.id === m.productId)

  const totals = (list: StockMovement[]) => ({
    in: list.filter((m) => m.type === 'IN').reduce((sum, m) => sum + m.change, 0),
    out: list.filter((m) => m.type === 'OUT').reduce((sum, m) => sum - m.change, 0),
    losses: list.filter(isLoss).reduce((sum, m) => sum + lossValue(m), 0),
  })

  const byCategory = categories.map((category) => {
    const inCategory = products.filter((p) => p.categoryId === category.id)
    const productRows = inCategory
      .map((product) => ({ product, ...totals(moves.filter((m) => m.productId === product.id)) }))
      .filter((row) => row.in || row.out || row.losses)
    const ids = new Set(inCategory.map((p) => p.id))
    return { category, ...totals(moves.filter((m) => ids.has(m.productId))), products: productRows }
  })

  // Top 5 sent to the shop, by quantity
  const toShop = new Map<number, number>()
  for (const m of moves.filter((m) => m.reason === 'TO_SHOP')) {
    toShop.set(m.productId, (toShop.get(m.productId) ?? 0) - m.change)
  }
  const topToShop = [...toShop.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([id, quantity]) => {
      const product = products.find((p) => p.id === id)
      return product ? [{ product, quantity }] : []
    })

  // Slow-moving: in storage but nothing sent to the shop in the last 30 days
  const d = new Date()
  const since = todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30))
  const recentlySent = new Set(all.filter((m) => m.reason === 'TO_SHOP' && m.createdAt >= since).map((m) => m.productId))
  const slowMoving = products
    .filter((p) => p.isActive && p.quantity > 0 && !recentlySent.has(p.id))
    .map((product) => ({ product, value: product.quantity * product.costPrice }))
    .sort((a, b) => b.value - a.value)

  const sum = totals(moves)
  return {
    month,
    stockValue: products.filter((p) => p.isActive).reduce((s, p) => s + p.quantity * p.costPrice, 0),
    stockIn: sum.in,
    stockOut: sum.out,
    losses: sum.losses,
    categories: byCategory,
    topToShop,
    lossMoves: moves.filter(isLoss).map((movement) => ({ movement, product: productOf(movement), value: lossValue(movement) })),
    slowMoving,
  }
}
