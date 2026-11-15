<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import FormField from '@/components/form/FormField.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import type { Category, Supplier } from '@/types'

export type CatalogKind = 'categories' | 'suppliers'
export type CatalogForm = Record<string, string>

const props = defineProps<{
  open: boolean
  kind: CatalogKind
  item: Category | Supplier | null // null = a new one
  busy: boolean
  serverError: string | null // the API's message for the name
}>()
const emit = defineEmits<{ save: [form: CatalogForm]; cancel: [] }>()

const FIELDS = {
  categories: [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description', multiline: true },
  ],
  suppliers: [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone', mono: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'address', label: 'Address', multiline: true },
  ],
} as const

const fields = computed(() => FIELDS[props.kind])
const noun = computed(() => (props.kind === 'categories' ? 'category' : 'supplier'))
const title = computed(() => (props.item ? `Edit ${noun.value}: ${props.item.name}` : `New ${noun.value}`))

const form = reactive<CatalogForm>({})
const nameError = ref<string | null>(null)

// Each time it opens: fill with the item being edited, or empty for a new one
watch(
  () => props.open,
  (open) => {
    if (!open) return
    const source = (props.item ?? {}) as Record<string, unknown>
    for (const f of fields.value) form[f.key] = String(source[f.key] ?? '')
    nameError.value = null
  },
)

function save() {
  nameError.value = form.name?.trim() ? null : 'Name is required'
  if (!nameError.value) emit('save', { ...form })
}
</script>

<template>
  <BaseDialog :open="open" :title="title" @close="emit('cancel')">
    <form novalidate @submit.prevent="save">
      <div class="dialog-body">
        <FormField
          v-for="f in fields"
          :id="`catalog-${f.key}`"
          :key="f.key"
          v-model="form[f.key]!"
          :label="f.label"
          horizontal
          :required="f.key === 'name'"
          :multiline="'multiline' in f"
          :mono="'mono' in f"
          :type="'type' in f ? f.type : 'text'"
          :error="f.key === 'name' ? (nameError ?? serverError) : null"
        />
      </div>
      <footer class="dialog-foot">
        <BaseButton type="submit" variant="primary" :loading="busy" loading-text="Saving…">
          {{ item ? `Save ${noun}` : `Add ${noun}` }}
        </BaseButton>
        <BaseButton @click="emit('cancel')">Cancel</BaseButton>
      </footer>
    </form>
  </BaseDialog>
</template>
