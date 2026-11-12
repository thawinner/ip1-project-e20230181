<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' }>(), { size: 'md' })
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

// The parent decides when it is open; the browser's <dialog> gives the backdrop, focus and Escape
watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (open && !dialog.value?.open) dialog.value?.showModal()
    if (!open && dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)
</script>

<template>
  <dialog ref="dialog" :class="size" aria-labelledby="dialog-title" @cancel.prevent="emit('close')">
    <header>
      <h2 id="dialog-title">{{ title }}</h2>
      <button type="button" class="close" aria-label="Close" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </button>
    </header>
    <!-- the form or message -->
    <slot />
  </dialog>
</template>

<style scoped>
dialog {
  width: min(460px, calc(100% - 32px));
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  color: var(--ink-2);
}

dialog.md {
  width: min(520px, calc(100% - 32px));
}

dialog::backdrop {
  background: rgba(22, 25, 29, 0.42);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px 8px;
}

h2 {
  font-size: 18px;
}

.close {
  display: inline-flex;
  padding: 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.close:hover {
  background: var(--surface-2);
}

/* Shared layout for what goes inside: <div class="dialog-body"> and <footer class="dialog-foot"> */
dialog :deep(.dialog-body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 22px 18px;
}

dialog :deep(.dialog-foot) {
  display: flex;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--row);
  background: var(--surface-2);
}

@media (max-width: 720px) {
  dialog :deep(.dialog-foot .btn) {
    flex: 1;
  }
}
</style>
