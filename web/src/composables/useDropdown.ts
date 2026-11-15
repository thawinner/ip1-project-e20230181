import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

// Open / close a menu; a click outside it or Escape closes it
export function useDropdown(root: Ref<HTMLElement | null>) {
  const open = ref(false)

  function onClick(e: MouseEvent) {
    if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open.value = false
  }

  onMounted(() => {
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKey)
  })

  return { open, toggle: () => (open.value = !open.value), close: () => (open.value = false) }
}
