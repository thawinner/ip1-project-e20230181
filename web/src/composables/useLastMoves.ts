import { ref } from 'vue'
import type { Id } from '@/types'

// The moves shown by the last moves list, in order, for the "3 / 10 ‹ ›" pager on a move page
const ids = ref<Id[]>([])

export function useLastMoves() {
  return { ids }
}
