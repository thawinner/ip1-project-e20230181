<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import FormField from '@/components/form/FormField.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import { checkAdjustment, type AdjustErrors } from '@/utils/movementRules'
import { changeText, quantityText } from '@/utils/format'
import type { Product } from '@/types'

const props = defineProps<{ open: boolean; product: Product; busy: boolean; serverErrors: AdjustErrors }>()
const emit = defineEmits<{ confirm: [counted: number, note: string]; cancel: [] }>()

const counted = ref('')
const note = ref('')
const tried = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    counted.value = ''
    note.value = ''
    tried.value = false
  },
)

const countedNumber = computed(() => (counted.value.trim() === '' ? Number.NaN : Number(counted.value)))
const errors = computed<AdjustErrors>(() =>
  tried.value ? { ...props.serverErrors, ...checkAdjustment(countedNumber.value, note.value, props.product) } : {},
)

// "Adjustment: −2 cases" while typing, so the manager sees what will be saved
const preview = computed(() => {
  const n = countedNumber.value
  if (!Number.isInteger(n) || n < 0 || n === props.product.quantity) return null
  return changeText(n - props.product.quantity, props.product.unit)
})

function confirm() {
  tried.value = true
  if (Object.keys(checkAdjustment(countedNumber.value, note.value, props.product)).length) return
  emit('confirm', countedNumber.value, note.value.trim())
}
</script>

<template>
  <BaseDialog :open="open" :title="`Adjust stock: ${product.name}`" @close="emit('cancel')">
    <form novalidate @submit.prevent="confirm">
      <div class="dialog-body">
        <div class="system">
          <span>In the system</span>
          <b>{{ quantityText(product.quantity, product.unit) }}</b>
        </div>
        <FormField
          id="adjust-counted"
          v-model="counted"
          label="Counted quantity"
          required
          horizontal
          help="What you counted on the shelf"
          :error="errors.counted"
        />
        <FormField id="adjust-note" v-model="note" label="Note" required horizontal multiline :error="errors.note" />
        <p v-if="preview" class="preview">Adjustment: <b>{{ preview }}</b></p>
      </div>
      <footer class="dialog-foot">
        <BaseButton type="submit" variant="primary" :loading="busy" loading-text="Saving…">Adjust</BaseButton>
        <BaseButton @click="emit('cancel')">Cancel</BaseButton>
      </footer>
    </form>
  </BaseDialog>
</template>

<style scoped>
.system {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
}

.system span {
  font-weight: 600;
  color: var(--ink);
}

.system b {
  font-weight: 500;
  color: var(--ink);
}

.preview {
  margin: 0;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: var(--adj-bg);
  color: var(--adj-fg);
  font-size: 13px;
}

@media (max-width: 720px) {
  .system {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
}
</style>
