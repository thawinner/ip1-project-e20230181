<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string
    label: string
    type?: string
    error?: string | null
    help?: string
    autocomplete?: string
    multiline?: boolean
    required?: boolean // shows a red * after the label
    horizontal?: boolean // label on the left (dialogs)
    mono?: boolean
  }>(),
  {
    type: 'text',
    error: null,
    help: undefined,
    autocomplete: undefined,
    multiline: false,
    required: false,
    horizontal: false,
    mono: false,
  },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="field" :class="{ horizontal }">
    <label :for="id">{{ label }}<span v-if="required" class="req" aria-hidden="true"> *</span></label>
    <div class="control">
      <textarea
        v-if="multiline"
        :id="id"
        v-model="model"
        class="input"
        rows="3"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : help ? `${id}-help` : undefined"
      />
      <input
        v-else
        :id="id"
        v-model="model"
        class="input"
        :class="{ mono }"
        :type="type"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : help ? `${id}-help` : undefined"
      />
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
