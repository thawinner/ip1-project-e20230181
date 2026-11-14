<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import TypeToggle from './TypeToggle.vue'
import ReasonChips from './ReasonChips.vue'
import QuantityStepper from './QuantityStepper.vue'
import FormField from '@/components/form/FormField.vue'
import FormSelect from '@/components/form/FormSelect.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import { checkMovement, isWriteOff, MAX_INVOICE_LENGTH, type MovementErrors } from '@/utils/movementRules'
import { quantityText, unitWord } from '@/utils/format'
import type { Id, NewMovement, Product, Reason, Supplier } from '@/types'

const props = withDefaults(
  defineProps<{
    product: Product | null // the dialog shows the form before a product is chosen
    suppliers: Supplier[]
    lastDelivery: { supplierId: Id; invoiceNo: string | null } | null
    isManager: boolean
    saving: boolean
    initialType: 'IN' | 'OUT'
    serverErrors: MovementErrors // field messages from the API
    serverError: string | null // a message that belongs to no field
    // Inside the Receive / Send out dialog: no card, no in/out toggle, the dialog's own buttons
    embedded?: boolean
    idPrefix?: string // keeps ids unique when the dialog opens on the product page
  }>(),
  { embedded: false, idPrefix: '' },
)
const emit = defineEmits<{ submit: [input: NewMovement] }>()

const type = ref<'IN' | 'OUT'>(props.initialType)
const reason = ref<Reason>('TO_SHOP')
const quantity = ref('')
const supplierId = ref<Id | null>(null)
const invoiceNo = ref('')
const note = ref('')
const tried = ref(false) // show messages only after the first try

// Stock out starts on "To the shop"; stock in on "Purchase" from the delivery being unpacked
function applyDefaults() {
  if (type.value === 'OUT') {
    reason.value = 'TO_SHOP'
  } else {
    reason.value = 'PURCHASE'
    supplierId.value = props.lastDelivery?.supplierId ?? props.product?.supplierId ?? null
    invoiceNo.value = props.lastDelivery?.invoiceNo ?? ''
  }
}

function reset() {
  quantity.value = ''
  note.value = ''
  tried.value = false
  applyDefaults()
}

watch(type, applyDefaults, { immediate: true })
// Another product: start again. The first product chosen in the dialog keeps what was typed.
watch(
  () => props.product?.id,
  (id, old) => {
    if (old !== undefined) {
      type.value = props.initialType
      reset()
    } else if (isPurchase.value && supplierId.value === null) {
      supplierId.value = props.product?.supplierId ?? null
    }
  },
)
watch(
  () => props.initialType,
  (t) => (type.value = t),
)

const supplierOptions = computed(() => [
  { value: null as Id | null, label: 'Choose the supplier' },
  ...props.suppliers.map((s) => ({ value: s.id as Id | null, label: s.name })),
])

const isPurchase = computed(() => reason.value === 'PURCHASE')
const waits = computed(() => !props.isManager && isWriteOff(reason.value))
const noteRequired = computed(() => isWriteOff(reason.value))

const input = computed<NewMovement>(() => ({
  productId: props.product?.id ?? 0,
  type: type.value,
  reason: reason.value,
  quantity: quantity.value.trim() === '' ? Number.NaN : Number(quantity.value),
  supplierId: isPurchase.value ? supplierId.value : null,
  invoiceNo: isPurchase.value ? invoiceNo.value.trim() || null : null,
  note: note.value.trim() || null,
}))

const errors = computed<MovementErrors>(() => {
  if (!tried.value || !props.product) return {}
  return { ...props.serverErrors, ...checkMovement(input.value, props.product) }
})

const quickAmounts = computed(() => {
  const amounts = [1, 5, 10].map((n) => ({ label: String(n), value: n }))
  const p = props.product
  if (!p) return amounts
  if (type.value === 'OUT' && p.quantity > 0) amounts.push({ label: `All ${p.quantity}`, value: p.quantity })
  if (type.value === 'IN' && p.targetLevel > p.quantity) {
    amounts.push({ label: 'Up to target', value: p.targetLevel - p.quantity })
  }
  return amounts
})

const help = computed(() =>
  props.product
    ? `Whole number · ${quantityText(props.product.quantity, props.product.unit)} in storage now`
    : 'Whole number from 1 to 10,000',
)

const stockAfter = computed(() => {
  const n = input.value.quantity
  if (!props.product || !Number.isInteger(n) || n < 1) return null
  return props.product.quantity + (type.value === 'IN' ? n : -n)
})

const ids = computed(() => ({
  quantity: `${props.idPrefix}quantity`,
  supplierId: `${props.idPrefix}record-supplier`,
  invoiceNo: `${props.idPrefix}record-invoice`,
  note: `${props.idPrefix}record-note`,
}))

async function submit() {
  if (!props.product) return
  tried.value = true
  const first = Object.keys(checkMovement(input.value, props.product))[0]
  if (first) {
    await nextTick()
    document.getElementById(ids.value[first as keyof typeof ids.value] ?? '')?.focus()
    return
  }
  emit('submit', input.value)
}

defineExpose({ reset, submit })
</script>

<template>
  <section :class="embedded ? 'embedded' : 'panel record'" :aria-labelledby="embedded ? undefined : 'record-title'">
    <h2 v-if="!embedded" id="record-title">Record stock</h2>
    <form novalidate @submit.prevent="submit">
      <TypeToggle v-if="!embedded" v-model="type" />
      <ReasonChips
        v-model="reason"
        :type="type"
        :name="`${idPrefix}reason`"
        :horizontal="embedded"
        :error="errors.reason"
      />

      <QuantityStepper
        :id="ids.quantity"
        v-model="quantity"
        :horizontal="embedded"
        :quick-amounts="quickAmounts"
        :help="help"
        :error="errors.quantity"
      />

      <template v-if="isPurchase">
        <FormSelect
          :id="ids.supplierId"
          v-model="supplierId"
          label="Supplier"
          required
          :horizontal="embedded"
          :options="supplierOptions"
          :error="errors.supplierId"
        />
        <FormField
          :id="ids.invoiceNo"
          v-model="invoiceNo"
          label="Invoice no."
          :horizontal="embedded"
          :help="`Optional, up to ${MAX_INVOICE_LENGTH} characters`"
          :error="errors.invoiceNo"
        />
      </template>

      <FormField
        :id="ids.note"
        v-model="note"
        label="Note"
        :required="noteRequired"
        :horizontal="embedded"
        multiline
        :help="noteRequired ? 'Say what happened, for the manager' : undefined"
        :error="errors.note"
      />

      <p v-if="waits" class="hint wait">Waiting for the manager's approval. Stock does not change until then.</p>
      <p v-else-if="stockAfter !== null" class="hint" :class="{ bad: stockAfter < 0 }">
        Stock after: <b>{{ stockAfter }}</b> {{ product ? unitWord(stockAfter, product.unit) : '' }}
      </p>

      <FormAlert v-if="serverError" kind="error" :message="serverError" />

      <BaseButton v-if="!embedded" type="submit" variant="primary" :loading="saving" loading-text="Saving…">
        {{ type === 'IN' ? 'Record stock in' : 'Record stock out' }}
      </BaseButton>
    </form>
  </section>
</template>

<style scoped>
.record {
  padding: 16px 18px 18px;
}

h2 {
  font-size: 15px;
  margin-bottom: 10px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Labels in the narrow side panel are a little smaller (not in the dialog) */
.record form :deep(label),
.record form :deep(.label) {
  font-size: 13px;
}

.hint {
  margin: 0;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: var(--surface-2);
  font-size: 13px;
  color: var(--ink-2);
}

.hint b {
  color: var(--ink);
}

.hint.wait {
  background: var(--low-bg);
  color: var(--low-fg);
}

.hint.bad b {
  color: var(--danger-fg);
}

.btn {
  width: 100%;
}
</style>
