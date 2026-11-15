import { ref } from 'vue'

// Group rows in a table that the user can fold away (they start open)
export function useFolded() {
  const closed = ref(new Set<string>())

  function toggle(key: string) {
    const next = new Set(closed.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    closed.value = next
  }

  return { isOpen: (key: string) => !closed.value.has(key), toggle }
}
