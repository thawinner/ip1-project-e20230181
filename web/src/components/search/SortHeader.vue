<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { nextSort, type SortState } from '@/utils/sort'

// A column header you can click to sort by that column
const props = defineProps<{ id: string; label: string; num?: boolean }>()
const sort = defineModel<SortState | null>({ required: true })
</script>

<template>
  <th
    scope="col"
    :class="{ num }"
    :aria-sort="sort?.id === props.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined"
  >
    <button type="button" class="sort" @click="sort = nextSort(sort, props.id)">
      {{ label }}<AppIcon name="caret" :size="14" />
    </button>
  </th>
</template>

<style scoped>
.sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: pointer;
}

.num .sort {
  flex-direction: row-reverse;
}

.sort :deep(svg) {
  opacity: 0;
  transition:
    transform 0.1s,
    opacity 0.1s;
}

.sort:hover :deep(svg) {
  opacity: 0.5;
}

th[aria-sort] {
  color: var(--accent-hover);
}

th[aria-sort] .sort :deep(svg) {
  opacity: 1;
}

th[aria-sort='descending'] .sort :deep(svg) {
  transform: rotate(180deg);
}
</style>
