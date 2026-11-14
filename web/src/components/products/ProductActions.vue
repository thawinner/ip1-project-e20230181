<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useDropdown } from '@/composables/useDropdown'

defineProps<{ archived: boolean }>()
const emit = defineEmits<{ archive: []; restore: []; delete: [] }>()

const root = ref<HTMLElement | null>(null)
const { open, toggle, close } = useDropdown(root)

function choose(action: 'archive' | 'restore' | 'delete') {
  close()
  if (action === 'archive') emit('archive')
  else if (action === 'restore') emit('restore')
  else emit('delete')
}
</script>

<template>
  <div ref="root" class="actions">
    <button type="button" class="btn btn-outline btn-sm" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
      <AppIcon name="cog" :size="15" /> Actions <AppIcon name="caret" :size="14" />
    </button>
    <div v-if="open" class="menu" role="menu">
      <button v-if="archived" type="button" role="menuitem" @click="choose('restore')">
        <AppIcon name="undo" :size="16" /> Restore
      </button>
      <button v-else type="button" role="menuitem" @click="choose('archive')">
        <AppIcon name="archive" :size="16" /> Archive
      </button>
      <button type="button" role="menuitem" class="danger" @click="choose('delete')">
        <AppIcon name="trash" :size="16" /> Delete
      </button>
    </div>
  </div>
</template>

<style scoped>
.actions {
  position: relative;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 220px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink-2);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.menu button:hover {
  background: var(--surface-2);
}

.menu .danger {
  color: var(--danger-fg);
}
</style>
