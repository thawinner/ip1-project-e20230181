<script setup lang="ts">
import TaskRow, { type Task } from './TaskRow.vue'
import CountBadge from '@/components/CountBadge.vue'
import type { Id } from '@/types'

defineProps<{ tasks: Task[]; busy: boolean }>()
const emit = defineEmits<{ approve: [id: Id]; reject: [id: Id] }>()
</script>

<template>
  <section class="panel" aria-labelledby="attention-title">
    <header class="head">
      <h2 id="attention-title">Needs your attention</h2>
      <CountBadge :count="tasks.length" label="waiting" />
    </header>
    <ul v-if="tasks.length">
      <TaskRow
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :busy="busy"
        @approve="emit('approve', $event)"
        @reject="emit('reject', $event)"
      />
    </ul>
    <p v-else class="all-clear">All caught up. Nothing is waiting for you.</p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

h2 {
  font-size: 15px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.all-clear {
  margin: 0;
  padding: 16px;
  border-top: 1px solid var(--row);
  color: var(--success-fg);
}
</style>
