<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CatalogTable from '@/components/catalog/CatalogTable.vue'
import CatalogDialog, { type CatalogForm, type CatalogKind } from '@/components/catalog/CatalogDialog.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useProductStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import { errorMessage, fieldErrors } from '@/utils/errors'
import type { Category, Supplier } from '@/types'

// /settings/categories and /settings/suppliers (story 10): the route passes `kind`
const props = defineProps<{ kind: CatalogKind }>()

const catalog = useCatalogStore()
const products = useProductStore()
const toast = useToast()

const isCategories = computed(() => props.kind === 'categories')
const noun = computed(() => (isCategories.value ? 'category' : 'supplier'))
const items = computed<(Category | Supplier)[]>(() => (isCategories.value ? catalog.categories : catalog.suppliers))
const countText = computed(() => {
  const n = items.value.length
  if (n === 1) return `1 ${noun.value}`
  return `${n} ${isCategories.value ? 'categories' : 'suppliers'}`
})

const loading = ref(true)
async function load() {
  loading.value = true
  await Promise.all([catalog.fetchAll(true), products.fetchAll()])
  loading.value = false
}
onMounted(load)

const productCount = (id: number) =>
  products.all.filter((p) => (isCategories.value ? p.categoryId === id : p.supplierId === id)).length

// Add / edit dialog
const editing = ref<Category | Supplier | null>(null)
const dialogOpen = ref(false)
const saving = ref(false)
const nameError = ref<string | null>(null)

function openForm(item: Category | Supplier | null) {
  editing.value = item
  nameError.value = null
  dialogOpen.value = true
}

async function save(form: CatalogForm) {
  saving.value = true
  nameError.value = null
  const id = editing.value?.id ?? null
  try {
    const saved = isCategories.value
      ? await catalog.saveCategory(id, { name: form.name ?? '', description: form.description ?? '' })
      : await catalog.saveSupplier(id, {
          name: form.name ?? '',
          phone: form.phone ?? '',
          email: form.email ?? '',
          address: form.address ?? '',
        })
    dialogOpen.value = false
    toast.show('success', `${saved.name} ${id === null ? 'added' : 'saved'}.`)
  } catch (e) {
    nameError.value = fieldErrors(e).name ?? errorMessage(e)
  } finally {
    saving.value = false
  }
}

// Delete: ask first; the API refuses while products use it ("Move or delete its products first")
const deleting = ref<Category | Supplier | null>(null)
const deleteBusy = ref(false)

async function confirmDelete() {
  const item = deleting.value
  if (!item) return
  deleteBusy.value = true
  try {
    if (isCategories.value) await catalog.deleteCategory(item.id)
    else await catalog.deleteSupplier(item.id)
    toast.show('success', `${item.name} deleted.`)
  } catch (e) {
    toast.show('error', `Cannot delete ${item.name}: ${errorMessage(e)}`)
  } finally {
    deleteBusy.value = false
    deleting.value = null
  }
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">{{ isCategories ? 'Categories' : 'Suppliers' }}</h1>
      <button type="button" class="btn btn-primary" @click="openForm(null)">
        <AppIcon name="plus" :size="16" /> New {{ noun }}
      </button>
      <span class="muted total">{{ countText }}</span>
    </div>
  </div>

  <div class="page">
    <ErrorState v-if="catalog.error" :message="catalog.error" @retry="load" />
    <section v-else class="panel list">
      <LoadingState v-if="loading && !items.length" />
      <EmptyState
        v-else-if="!items.length"
        :icon="isCategories ? 'tag' : 'truck'"
        :message="`No ${isCategories ? 'categories' : 'suppliers'} yet`"
        :detail="`Add the first one with New ${noun}.`"
      />
      <CatalogTable
        v-else
        :kind="kind"
        :items="items"
        :product-count="productCount"
        @edit="openForm"
        @delete="deleting = $event"
      />
    </section>

    <CatalogDialog
      :open="dialogOpen"
      :kind="kind"
      :item="editing"
      :busy="saving"
      :server-error="nameError"
      @save="save"
      @cancel="dialogOpen = false"
    />
    <ConfirmDialog
      :open="deleting !== null"
      :title="`Delete ${noun}`"
      :text="`Delete ${deleting?.name}? This can't be undone.`"
      ok-label="Delete"
      danger
      :busy="deleteBusy"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<style scoped>
.toolbar {
  justify-content: space-between;
}

.total {
  font-size: 13px;
}

.list {
  overflow: hidden;
}
</style>
