<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ quantity: number; reorderLevel: number; targetLevel: number }>()

// Full at the target level; the mark shows the reorder level
const max = computed(() => Math.max(props.targetLevel, props.quantity, 1))
const fill = computed(() => `${Math.min(100, (props.quantity / max.value) * 100)}%`)
const mark = computed(() => `${(props.reorderLevel / max.value) * 100}%`)
const low = computed(() => props.quantity <= props.reorderLevel)
</script>

<template>
  <div class="bar" role="img" :aria-label="`${quantity} in storage, reorder at ${reorderLevel}, target ${targetLevel}`">
    <span class="fill" :class="{ low }" :style="{ width: fill }" />
    <span class="mark" :style="{ left: mark }" />
  </div>
</template>

<style scoped>
.bar {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--row);
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  background: var(--success-line);
}

.fill.low {
  background: var(--low-line);
}

.mark {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  margin-left: -1px;
  background: var(--ink-2);
}
</style>
