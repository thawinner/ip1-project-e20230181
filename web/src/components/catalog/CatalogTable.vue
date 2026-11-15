<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import { sortRows, type SortState } from '@/utils/sort'
import type { CatalogKind } from './CatalogDialog.vue'
import { formatPhone } from '@/utils/format'
import type { Category, Supplier } from '@/types'

const props = defineProps<{
  kind: CatalogKind
  items: (Category | Supplier)[]
  productCount: (id: number) => number
}>()
const emit = defineEmits<{ edit: [item: Category | Supplier]; delete: [item: Category | Supplier] }>()

// `'phone' in item` tells TypeScript the item is a Supplier; a Category has a description instead
const description = (item: Category | Supplier) => ('description' in item && item.description) || '—'
const contact = (item: Category | Supplier, key: 'phone' | 'email' | 'address') =>
  ('phone' in item && item[key]) || '—'

const sort = ref<SortState | null>({ id: 'name', dir: 'asc' })
const sorted = computed(() =>
  sortRows(props.items, sort.value, { name: (it) => it.name.toLowerCase(), products: (it) => props.productCount(it.id) }),
)
</script>

<template>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <SortHeader id="name" v-model="sort" label="Name" />
          <template v-if="kind === 'categories'">
            <th scope="col">Description</th>
          </template>
          <template v-else>
            <th scope="col">Phone</th>
            <th scope="col" class="hide-sm">Email</th>
            <th scope="col" class="hide-sm">Address</th>
          </template>
          <SortHeader id="products" v-model="sort" label="Products" num />
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sorted" :key="item.id">
          <td class="name">{{ item.name }}</td>
          <template v-if="kind === 'categories'">
            <td>{{ description(item) }}</td>
          </template>
          <template v-else>
            <td class="mono nowrap">{{ formatPhone(contact(item, 'phone')) }}</td>
            <td class="hide-sm">{{ contact(item, 'email') }}</td>
            <td class="hide-sm">{{ contact(item, 'address') }}</td>
          </template>
          <td class="num">
            <RouterLink
              :to="{ path: '/products', query: { [kind === 'categories' ? 'category' : 'supplier']: String(item.id) } }"
            >
              {{ productCount(item.id) }}
            </RouterLink>
          </td>
          <td>
            <div class="actions">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                :aria-label="`Edit ${item.name}`"
                @click="emit('edit', item)"
              >
                <AppIcon name="edit" :size="14" /> Edit
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm danger"
                :aria-label="`Delete ${item.name}`"
                @click="emit('delete', item)"
              >
                <AppIcon name="trash" :size="14" /> Delete
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.name {
  color: var(--ink);
  font-weight: 600;
}

.nowrap {
  white-space: nowrap;
}

tbody tr:hover {
  background: var(--surface-2);
}

.num a {
  text-decoration: none;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.danger {
  color: var(--danger-fg);
}

.danger:hover {
  border-color: #ebc4bf;
  background: var(--danger-bg);
}

@media (max-width: 720px) {
  .hide-sm {
    display: none;
  }
}
</style>
