import type { Id } from '@/types'

// "Continue where you left off": the last product or move page opened in this tab
const KEY = 'shopstock-last'

export interface LastVisit {
  kind: 'product' | 'move'
  id: Id
  userId: Id // so the next person on this computer does not see it
}

export function rememberVisit(visit: LastVisit) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(visit))
  } catch {
    // storage blocked (private window): no Continue link, nothing else breaks
  }
}

export function lastVisit(): LastVisit | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as LastVisit | null
  } catch {
    return null
  }
}
