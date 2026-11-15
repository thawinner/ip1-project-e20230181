<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import NotFoundView from './NotFoundView.vue'
import AppIcon from '@/components/AppIcon.vue'
import FormField from '@/components/form/FormField.vue'
import FormSelect from '@/components/form/FormSelect.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useProductStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { checkProduct, type ProductErrors } from '@/utils/productRules'
import { unitLabel, unitWord } from '@/utils/format'
import { UNITS, type Id, type ProductInput, type Unit } from '@/types'

// /products/new (no id) and /products/:id/edit (story 7)
const props = defineProps<{ id?: string }>()

const catalog = useCatalogStore()
const products = useProductStore()
const router = useRouter()
const toast = useToast()

const productId = computed(() => (props.id === undefined ? null : Number(props.id)))
const isNew = computed(() => productId.value === null)
const validId = computed(() => isNew.value || (Number.isInteger(productId.value) && productId.value! > 0))

// Numbers are typed as text, so "2.5" or "abc" reach the checks and get their message
const form = reactive({
  name: '',
  sku: '',
  categoryId: null as Id | null,
  supplierId: null as Id | null,
  unit: 'CASE' as Unit,
  costPrice: '',
  reorderLevel: '',
  targetLevel: '',
})
const saved = ref('') // the form as it was loaded, to see unsaved changes
const tried = ref(false)
const saving = ref(false)
const serverErrors = ref<ProductErrors>({})
const formError = ref<string | null>(null)

const snapshot = () => JSON.stringify(form)
const dirty = computed(() => snapshot() !== saved.value)

async function load() {
  if (isNew.value) {
    form.categoryId = catalog.categories[0]?.id ?? null
    saved.value = snapshot()
    return
  }
  if (!validId.value) return
  await products.fetchOne(productId.value!)
  const p = products.current
  if (!p) return
  Object.assign(form, {
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    supplierId: p.supplierId,
    unit: p.unit,
    costPrice: String(p.costPrice),
    reorderLevel: String(p.reorderLevel),
    targetLevel: String(p.targetLevel),
  })
  saved.value = snapshot()
}
watch(productId, load, { immediate: true })
// A new product starts in the first category once the categories have loaded
watch(
  () => catalog.categories,
  (list) => {
    if (isNew.value && form.categoryId === null && list[0]) {
      form.categoryId = list[0].id
      saved.value = snapshot()
    }
  },
)

const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text))

const input = computed<ProductInput>(() => ({
  name: form.name,
  sku: form.sku.trim().toUpperCase(),
  categoryId: form.categoryId ?? 0,
  supplierId: form.supplierId,
  unit: form.unit,
  costPrice: toNumber(form.costPrice),
  reorderLevel: toNumber(form.reorderLevel),
  targetLevel: toNumber(form.targetLevel),
}))

const errors = computed<ProductErrors>(() => (tried.value ? { ...serverErrors.value, ...checkProduct(input.value) } : {}))

// Typing in a field clears the API's message for it
watch(
  () => form.sku,
  () => (serverErrors.value = {}),
)

const categoryOptions = computed(() => catalog.categories.map((c) => ({ value: c.id as Id | null, label: c.name })))
const supplierOptions = computed(() => [
  { value: null as Id | null, label: 'No supplier' },
  ...catalog.suppliers.map((s) => ({ value: s.id as Id | null, label: s.name })),
])
const unitOptions = UNITS.map((u) => ({ value: u, label: unitLabel(u).replace(/^./, (c) => c.toUpperCase()) }))

async function save() {
  tried.value = true
  formError.value = null
  const first = Object.keys(checkProduct(input.value))[0]
  if (first) {
    document.getElementById(`product-${first}`)?.focus()
    return
  }
  saving.value = true
  try {
    const product = await products.save(productId.value, input.value)
    saved.value = snapshot() // nothing unsaved any more, so leaving does not ask
    toast.show('success', isNew.value ? `${product.name} added. It starts at 0.` : `${product.name} saved.`)
    await router.push(`/products/${product.id}`)
  } catch (e) {
    serverErrors.value = fieldErrors(e) as ProductErrors
    if (!Object.keys(serverErrors.value).length) formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push(isNew.value ? '/products' : `/products/${productId.value}`)
}

// Leaving with unsaved changes asks first
onBeforeRouteLeave(() => {
  if (dirty.value && !saving.value) return window.confirm('Leave without saving? Your changes will be lost.')
})
</script>

<template>
  <NotFoundView v-if="!validId || (!isNew && products.currentNotFound)" />

  <template v-else>
    <div class="page-band">
      <div class="page-band-inner band">
        <h1>{{ isNew ? 'New' : `Edit: ${products.current?.name ?? ''}` }}</h1>
        <span class="state" :class="{ dirty: isNew || dirty }">
          <AppIcon name="alert" :size="14" />
          {{ isNew ? 'New product, not saved yet' : dirty ? 'Unsaved changes' : 'Editing' }}
        </span>
        <BaseButton @click="cancel">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" loading-text="Saving…" @click="save">
          <AppIcon name="check" :size="16" /> Save product
        </BaseButton>
      </div>
    </div>

    <div class="page">
      <section v-if="!isNew && products.currentLoading" class="panel"><LoadingState message="Loading the product…" /></section>
      <ErrorState v-else-if="!isNew && products.currentError" :message="products.currentError" @retry="load" />

      <form v-else class="panel sheet" novalidate @submit.prevent="save">
        <FormAlert v-if="formError" kind="error" :message="formError" />

        <div class="title">
          <div class="grow">
            <label for="product-name" class="label">Product name <span class="req" aria-hidden="true">*</span></label>
            <input
              id="product-name"
              v-model="form.name"
              class="input big"
              placeholder="Name and pack size"
              :aria-invalid="errors.name ? 'true' : undefined"
              :aria-describedby="errors.name ? 'product-name-error' : undefined"
            />
            <p v-if="errors.name" id="product-name-error" class="error">{{ errors.name }}</p>
            <p v-else class="sku">{{ input.sku || 'New product' }}</p>
          </div>
          <span class="thumb pic"><AppIcon name="box" :size="40" /></span>
        </div>

        <div class="groups">
          <section>
            <h2>General</h2>
            <FormField
              id="product-sku"
              v-model="form.sku"
              label="SKU"
              required
              horizontal
              mono
              help="3 letters, a dash and 4 digits"
              :error="errors.sku"
            />
            <FormSelect
              id="product-categoryId"
              v-model="form.categoryId"
              label="Category"
              required
              horizontal
              :options="categoryOptions"
              :error="errors.categoryId"
            />
            <FormSelect id="product-supplierId" v-model="form.supplierId" label="Supplier" horizontal :options="supplierOptions" />
            <FormSelect
              id="product-unit"
              v-model="form.unit"
              label="Storage unit"
              required
              horizontal
              :options="unitOptions"
              :error="errors.unit"
            />
          </section>
          <section>
            <h2>Stock</h2>
            <div class="on-hand">
              <span>On hand</span>
              <span>
                {{ isNew ? 0 : (products.current?.quantity ?? 0) }}
                <small>{{ unitWord(isNew ? 0 : (products.current?.quantity ?? 0), form.unit) }}</small>
              </span>
            </div>
            <FormField
              id="product-reorderLevel"
              v-model="form.reorderLevel"
              label="Reorder level"
              required
              horizontal
              help="Low stock at or below this"
              :error="errors.reorderLevel"
            />
            <FormField
              id="product-targetLevel"
              v-model="form.targetLevel"
              label="Target level"
              required
              horizontal
              help="The reorder fills up to this"
              :error="errors.targetLevel"
            />
            <FormField
              id="product-costPrice"
              v-model="form.costPrice"
              label="Cost price"
              required
              horizontal
              :help="`Per ${unitLabel(form.unit)}, in USD`"
              :error="errors.costPrice"
            />
          </section>
        </div>
        <!-- Enter in a field saves, like the button in the band -->
        <button type="submit" hidden />
      </form>
    </div>
  </template>
</template>

<style scoped>
.band {
  padding-top: 18px;
  padding-bottom: 18px;
}

.band h1 {
  font-size: 22px;
  font-weight: 700;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.state.dirty {
  color: var(--low-fg);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px 32px;
}

.title {
  display: flex;
  gap: 20px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.req {
  color: var(--danger-fg);
}

.big {
  min-height: 48px;
  font-size: 22px;
  font-weight: 600;
}

.sku {
  margin: 6px 0 0;
  font-family: var(--mono);
  color: var(--muted);
}

.error {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--danger-fg);
}

.pic {
  width: 96px;
  height: 96px;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 8px 40px;
}

.groups section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--row);
  font-size: 14px;
}

/* Quantity is not typed here: a new product starts at 0 and only moves change it */
.on-hand {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
  padding: 4px 0;
}

.on-hand span:first-child {
  font-weight: 600;
  color: var(--ink);
}

.on-hand small {
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 720px) {
  .sheet {
    padding: 16px;
  }

  .pic {
    display: none;
  }
}
</style>
