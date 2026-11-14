import type { FilterTag } from './SearchBox.vue'

// The Filters ▾ menu on every list: filters in groups, and one "group by".
// Inside a group, ticked filters mean "any of these" (Low stock OR Out of stock);
// across groups they mean "all of these" (Low stock AND Active).

// What the menu and the tags need
export interface FilterChoice {
  id: string
  label: string
}

// A filter the page applies itself (when the API does the filtering, FilterChoice is enough)
export interface FilterOption<T> extends FilterChoice {
  test: (row: T) => boolean
}

export interface GroupOption<T> {
  id: string
  label: string
  // Which group a row belongs to; `order` sorts the groups (else the title)
  key: (row: T) => { id: string | number; title: string; order?: string | number }
}

export interface RowGroup<T> {
  key: string
  title: string
  rows: T[]
}

export function applyFilters<T>(rows: T[], groups: FilterOption<T>[][], on: string[]) {
  return groups.reduce((left, group) => {
    const ticked = group.filter((f) => on.includes(f.id))
    return ticked.length ? left.filter((row) => ticked.some((f) => f.test(row))) : left
  }, rows)
}

// What a list shows before the user changes anything (Products: Active, grouped by Category)
export interface DefaultView {
  on: string[]
  group: string | null
  // Tag text when a group that has a default is emptied, e.g. { 3: 'All dates' }
  anyLabel?: Record<number, string>
}

export const NO_DEFAULTS: DefaultView = { on: [], group: null }

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

// Tags only for what differs from the default view, one per filter group ("Low stock or Out of stock"),
// plus one for the grouping. The default stays visible as ticks in the Filters menu.
export function viewTags(
  groups: FilterChoice[][],
  groupBys: FilterChoice[],
  on: string[],
  group: string | null,
  defaults: DefaultView,
): FilterTag[] {
  const tags: FilterTag[] = groups.flatMap((list, i) => {
    const ticked = list.filter((f) => on.includes(f.id)).map((f) => f.id)
    const usual = list.filter((f) => defaults.on.includes(f.id)).map((f) => f.id)
    if (sameSet(ticked, usual)) return []
    const label = ticked.length
      ? list.filter((f) => ticked.includes(f.id)).map((f) => f.label).join(' or ')
      : (defaults.anyLabel?.[i] ?? 'Any')
    return [{ id: `filters-${i}`, label }]
  })
  if (group !== defaults.group) {
    tags.push({ id: 'group', label: groupBys.find((g) => g.id === group)?.label ?? 'No grouping', group: true })
  }
  return tags
}

// × on a tag puts that part back to the default (× on "Archived" → Active again)
export function resetTag(
  groups: FilterChoice[][],
  on: string[],
  group: string | null,
  defaults: DefaultView,
  tagId: string,
): { on: string[]; group: string | null } {
  if (tagId === 'group') return { on, group: defaults.group }
  const list = groups[Number(tagId.replace('filters-', ''))] ?? []
  const inList = (id: string) => list.some((f) => f.id === id)
  return { on: [...on.filter((id) => !inList(id)), ...defaults.on.filter(inList)], group }
}

export function isDefaultView(on: string[], group: string | null, defaults: DefaultView) {
  return sameSet(on, defaults.on) && group === defaults.group
}

export function groupRows<T>(rows: T[], by: GroupOption<T> | null): RowGroup<T>[] {
  if (!by) return [{ key: 'all', title: '', rows }]
  const map = new Map<string, { title: string; order: string | number; rows: T[] }>()
  for (const row of rows) {
    const k = by.key(row)
    const id = String(k.id)
    const entry = map.get(id) ?? { title: k.title, order: k.order ?? k.title, rows: [] }
    entry.rows.push(row)
    map.set(id, entry)
  }
  return [...map.entries()]
    .sort(([, a], [, b]) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map(([id, g]) => ({ key: `${by.id}-${id}`, title: g.title, rows: g.rows }))
}
