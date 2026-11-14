<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(
  defineProps<{
    quickAmounts: { label: string; value: number }[]
    help: string
    error?: string | null
    id?: string
    horizontal?: boolean
  }>(),
  { error: null, id: 'quantity', horizontal: false },
)

// Kept as text so "2.5" or "abc" reach the validation and get its message
const text = defineModel<string>({ required: true })

function step(by: number) {
  const n = Number.parseInt(text.value, 10)
  text.value = String(Math.max(1, (Number.isNaN(n) ? 0 : n) + by))
}
</script>

<template>
  <div class="field" :class="{ horizontal }">
    <label :for="id">Quantity <span class="req" aria-hidden="true">*</span></label>
    <div class="control">
      <div class="stepper" :class="{ invalid: error }">
        <button type="button" aria-label="One less" @click="step(-1)">
          <AppIcon name="minus" :size="18" />
        </button>
        <input
          :id="id"
          v-model="text"
          inputmode="numeric"
          autocomplete="off"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="`${id}-help ${id}-error`"
        />
        <button type="button" aria-label="One more" @click="step(1)">
          <AppIcon name="plus" :size="18" />
        </button>
      </div>
      <div class="quick">
        <button
          v-for="amount in quickAmounts"
          :key="amount.label"
          type="button"
          class="btn btn-outline btn-sm"
          @click="text = String(amount.value)"
        >
          {{ amount.label }}
        </button>
      </div>
      <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
      <p v-else :id="`${id}-help`" class="help">{{ help }}</p>
    </div>
  </div>
</template>

<style scoped>
.field,
.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.horizontal {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
}

.horizontal label {
  padding-top: 9px;
}

.horizontal .stepper {
  max-width: 260px;
}

label {
  font-weight: 600;
  color: var(--ink);
}

.req {
  color: var(--danger-fg);
}

.stepper {
  display: flex;
  border: 1px solid #c9ced6;
  border-radius: var(--radius);
  overflow: hidden;
}

.stepper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.stepper.invalid {
  border-color: var(--danger-fg);
}

.stepper button {
  flex: none;
  width: 44px;
  border: 0;
  background: var(--surface-2);
  color: var(--ink-2);
  cursor: pointer;
}

.stepper button:hover {
  background: var(--row);
}

input {
  flex: 1;
  min-width: 0;
  min-height: var(--ctl);
  padding: 0 12px;
  border: 0;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  font-size: 16px;
  text-align: center;
  outline: none;
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.error,
.help {
  margin: 0;
  font-size: 13px;
}

.error {
  color: var(--danger-fg);
}

.help {
  color: var(--muted);
}

@media (max-width: 720px) {
  .field.horizontal {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }

  .horizontal label {
    padding-top: 0;
  }
}
</style>
