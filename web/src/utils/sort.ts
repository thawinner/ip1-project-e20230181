// Sorting a list by one column: click a header once for A→Z, again for Z→A.
export interface SortState {
  id: string // the column
  dir: 'asc' | 'desc'
}

export type SortKeys<T> = Record<string, (row: T) => string | number>

export function nextSort(current: SortState | null, id: string): SortState {
  return current?.id === id ? { id, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' }
}

export function sortRows<T>(rows: T[], sort: SortState | null, keys: SortKeys<T>): T[] {
  const key = sort ? keys[sort.id] : undefined
  if (!sort || !key) return rows
  const sign = sort.dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = key(a)
    const y = key(b)
    const order = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : x < y ? -1 : x > y ? 1 : 0
    return order * sign
  })
}
