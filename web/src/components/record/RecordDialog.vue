<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import FormSelect from '@/components/form/FormSelect.vue'
import RecordStockPanel from './RecordStockPanel.vue'
import { useRecordDialog } from '@/composables/useRecordDialog'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useMovementStore } from '@/stores/movements'
import { useProductStore } from '@/stores/products'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { quantityText } from '@/utils/format'
import type { MovementErrors } from '@/utils/movementRules'
import type { Id, NewMovement } from '@/types'

// Receive / Send out from anywhere: choose the product here instead of opening its page first
const dialog = useRecordDialog()
const auth = useAuthStore()
const catalog = useCatalogStore()
const movements = useMovementStore()
const products = useProductStore()
const toast = useToast()

const productId = ref<Id | null>(null)
const productError = ref<string | null>(null)
const serverErrors = ref<MovementErrors>({})
const serverError = ref<string | null>(null)
const panel = ref<InstanceType<typeof RecordStockPanel> | null>(null)
let andNew = false // "Save & new": stay open for the next product of the same delivery

const isIn = computed(() => dialog.type.value === 'IN')
const product = computed(() => products.all.find((p) => p.id === productId.value) ?? null)
const options = computed(() => [
  { value: null as Id | null, label: 'Choose a product' },
  ...products.all.filter((p) => p.isActive).map((p) => ({ value: p.id as Id | null, label: `${p.name} (${p.sku})` })),
])

watch(dialog.type, (type) => {
  if (!type) return
  productId.value = dialog.productId.value
  productError.value = null
  serverErrors.value = {}
  serverError.value = null
  if (!products.all.length) products.fetchAll()
})
watch(productId, () => {
  productError.value = null
  serverErrors.value = {}
  serverError.value = null
})

function save(next: boolean) {
  andNew = next
  if (!product.value) {
    productError.value = 'Choose a product'
    document.getElementById('dialog-product')?.focus()
    return
  }
  panel.value?.submit()
}

async function record(input: NewMovement) {
  serverErrors.value = {}
  serverError.value = null
  try {
    const movement = await movements.create(input)
    const p = products.byId(input.productId)
    if (movement.status === 'PENDING') toast.show('success', "Write-off recorded. It waits for the manager's approval.")
    else if (p) toast.show('success', `Saved. ${p.name} now has ${quantityText(p.quantity, p.unit)}.`)
    if (andNew) {
      productId.value = null // the supplier and invoice stay for the next product
      panel.value?.reset()
    } else {
      dialog.close()
    }
  } catch (e) {
    serverErrors.value = fieldErrors(e)
    if (!Object.keys(serverErrors.value).length) serverError.value = errorMessage(e)
  }
}
</script>

<template>
  <BaseDialog :open="dialog.type.value !== null" :title="isIn ? 'Receive stock' : 'Send out stock'" @close="dialog.close">
    <div class="dialog-body">
      <FormSelect
        id="dialog-product"
        v-model="productId"
        label="Product"
        required
        horizontal
        :options="options"
        :error="productError"
      />
      <RecordStockPanel
        v-if="dialog.type.value"
        ref="panel"
        embedded
        id-prefix="dialog-"
        :product="product"
        :suppliers="catalog.suppliers"
        :last-delivery="movements.lastDelivery"
        :is-manager="auth.isManager"
        :saving="movements.saving"
        :initial-type="dialog.type.value"
        :server-errors="serverErrors"
        :server-error="serverError"
        @submit="record"
      />
    </div>
    <footer class="dialog-foot">
      <BaseButton variant="primary" :loading="movements.saving && !andNew" loading-text="Saving…" @click="save(false)">
        {{ isIn ? 'Receive' : 'Send out' }}
      </BaseButton>
      <BaseButton :loading="movements.saving && andNew" loading-text="Saving…" @click="save(true)">Save &amp; new</BaseButton>
      <BaseButton @click="dialog.close">Cancel</BaseButton>
    </footer>
  </BaseDialog>
</template>

