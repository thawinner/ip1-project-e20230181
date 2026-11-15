<script setup lang="ts">
import { REASONS, type Reason } from '@/types'
import { reasonLabel } from '@/utils/format'

withDefaults(defineProps<{ type: 'IN' | 'OUT'; error?: string | null; name?: string; horizontal?: boolean }>(), {
  error: null,
  name: 'reason',
  horizontal: false,
})
const reason = defineModel<Reason>({ required: true })
</script>

<template>
  <div class="chips" :class="{ horizontal }" role="radiogroup" :aria-labelledby="`${name}-label`">
    <span :id="`${name}-label`" class="label">Reason</span>
    <div>
      <div class="list">
        <label v-for="r in REASONS[type]" :key="r" class="chip" :class="{ on: reason === r }">
          <input v-model="reason" type="radio" :name="name" :value="r" />
          {{ reasonLabel({ reason: r }) }}
        </label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chips.horizontal {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
}

.label {
  font-weight: 600;
  color: var(--ink);
}

.horizontal .label {
  padding-top: 9px;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--ctl);
  padding: 0 12px;
  border: 1px solid #c9ced6;
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.chip.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.chip input {
  margin: 0;
  accent-color: var(--accent);
}

.error {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--danger-fg);
}

@media (max-width: 720px) {
  .chips.horizontal {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .horizontal .label {
    padding-top: 0;
  }
}
</style>
