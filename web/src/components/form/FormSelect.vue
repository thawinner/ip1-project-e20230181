<script setup lang="ts" generic="T extends string | number | null">
// Like FormField, for a choice from a list. `T` is the type of the values (an id, a unit…)
withDefaults(
  defineProps<{
    id: string
    label: string
    options: { value: T; label: string }[]
    error?: string | null
    help?: string
    required?: boolean
    horizontal?: boolean
  }>(),
  { error: null, help: undefined, required: false, horizontal: false },
)

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="field" :class="{ horizontal }">
    <label :for="id">{{ label }}<span v-if="required" class="req" aria-hidden="true"> *</span></label>
    <div class="control">
      <select
        :id="id"
        v-model="model"
        class="input"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : help ? `${id}-help` : undefined"
      >
        <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
      </select>
      <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
      <p v-else-if="help" :id="`${id}-help`" class="help">{{ help }}</p>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field.horizontal {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.horizontal label {
  padding-top: 9px;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-weight: 600;
  color: var(--ink);
}

.req {
  color: var(--danger-fg);
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
    gap: 4px;
  }

  .horizontal label {
    padding-top: 0;
  }
}
</style>
