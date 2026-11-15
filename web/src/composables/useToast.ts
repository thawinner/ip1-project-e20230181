import { ref } from 'vue'

// An optional button in the message, like "Undo"
export interface ToastAction {
  label: string
  run: () => void | Promise<void>
}

export interface Toast {
  kind: 'success' | 'error'
  message: string
  action?: ToastAction
}

// One message at a time for the whole app, shown by App.vue
const current = ref<Toast | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  function show(kind: Toast['kind'], message: string, action?: ToastAction) {
    current.value = { kind, message, action }
    clearTimeout(timer)
    timer = setTimeout(close, action ? 8000 : 5000) // longer, so there is time to press Undo
  }

  function close() {
    clearTimeout(timer)
    current.value = null
  }

  return { current, show, close }
}
