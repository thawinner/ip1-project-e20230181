import { ref } from 'vue'
import type { Id } from '@/types'

// One Receive / Send out dialog for the whole app (App.vue shows it); any page can open it
const type = ref<'IN' | 'OUT' | null>(null)
const productId = ref<Id | null>(null)

export function useRecordDialog() {
  function open(kind: 'IN' | 'OUT', product: Id | null = null) {
    productId.value = product
    type.value = kind
  }

  function close() {
    type.value = null
  }

  return { type, productId, open, close }
}
