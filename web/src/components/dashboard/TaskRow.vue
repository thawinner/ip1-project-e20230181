<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/components/icons'
import type { Id } from '@/types'

export interface Task {
  id: string
  tone: 'danger' | 'warn' | 'info'
  icon: IconName
  title: string
  detail: string
  link?: { label: string; to: string }
  approveId?: Id // manager: Approve · Reject on this write-off
}

defineProps<{ task: Task; busy: boolean }>()
const emit = defineEmits<{ approve: [id: Id]; reject: [id: Id] }>()
</script>

<template>
  <li class="task" :class="task.tone">
    <span class="ic"><AppIcon :name="task.icon" :size="18" /></span>
    <div class="body">
      <strong>{{ task.title }}</strong>
      <span>{{ task.detail }}</span>
    </div>
    <div class="act">
      <template v-if="task.approveId !== undefined">
        <button type="button" class="btn btn-success btn-sm" :disabled="busy" @click="emit('approve', task.approveId)">
          Approve
        </button>
        <button type="button" class="btn btn-outline btn-sm" :disabled="busy" @click="emit('reject', task.approveId)">
          Reject
        </button>
      </template>
      <RouterLink v-else-if="task.link" :to="task.link.to" class="btn btn-outline btn-sm">
        {{ task.link.label }}
      </RouterLink>
    </div>
  </li>
</template>

<style scoped>
.task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--row);
}

.ic {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: var(--info-bg);
  color: var(--info-fg);
}

.warn .ic {
  background: var(--low-bg);
  color: var(--low-fg);
}

.danger .ic {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

strong {
  color: var(--ink);
  font-weight: 600;
}

.body span {
  font-size: 13px;
  color: var(--muted);
}

.act {
  flex: none;
  display: flex;
  gap: 6px;
}

@media (max-width: 720px) {
  .task {
    flex-wrap: wrap;
  }

  .act {
    width: 100%;
    padding-left: 48px;
  }
}
</style>
