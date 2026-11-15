<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import AccountStatus from '@/components/AccountStatus.vue'
import SearchBox, { type FilterTag } from '@/components/search/SearchBox.vue'
import FilterMenu from '@/components/search/FilterMenu.vue'
import GroupFold from '@/components/search/GroupFold.vue'
import SortHeader from '@/components/search/SortHeader.vue'
import { useFolded } from '@/composables/useFolded'
import { sortRows, type SortKeys, type SortState } from '@/utils/sort'
import {
  applyFilters,
  groupRows,
  resetTag,
  viewTags,
  NO_DEFAULTS,
  type FilterOption,
  type GroupOption,
} from '@/components/search/filters'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { useCatalogStore } from '@/stores/catalog'
import type { User } from '@/types'
import { formatPhone } from '@/utils/format'

// Staff accounts (stories 1 and 10), manager only
const catalog = useCatalogStore()
const router = useRouter()

// Filters ▾ like the design
const FILTERS: FilterOption<User>[][] = [
  [
    { id: 'active', label: 'Active', test: (u) => u.isActive },
    { id: 'inactive', label: 'Deactivated', test: (u) => !u.isActive },
  ],
  [{ id: 'temp', label: 'Must change password', test: (u) => u.mustChangePassword }],
]
const STATUS_ORDER = { Active: 1, 'Must change password': 2, Deactivated: 3 } as const
const statusText = (u: User) => (!u.isActive ? 'Deactivated' : u.mustChangePassword ? 'Must change password' : 'Active')
const GROUP_BYS: GroupOption<User>[] = [
  { id: 'role', label: 'Role', key: (u) => ({ id: u.role, title: u.role === 'MANAGER' ? 'Manager' : 'Staff' }) },
  {
    id: 'status',
    label: 'Status',
    key: (u) => ({ id: statusText(u), title: statusText(u), order: STATUS_ORDER[statusText(u)] }),
  },
]

const SORT_KEYS: SortKeys<User> = {
  name: (u) => u.fullName,
  username: (u) => u.username,
  role: (u) => u.role,
  added: (u) => u.createdAt,
}
const sort = ref<SortState | null>({ id: 'name', dir: 'asc' })
const { isOpen, toggle } = useFolded()

const search = ref('')
const filters = ref<string[]>([])
const groupBy = ref<string | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  catalog.error = null
  await catalog.fetchUsers()
  loading.value = false
}
onMounted(load)

const shown = computed(() => {
  const text = search.value.trim().toLowerCase()
  const found = catalog.users.filter(
    (u) => !text || [u.fullName, u.username, u.phone].some((v) => v.toLowerCase().includes(text)),
  )
  return applyFilters(found, FILTERS, filters.value)
})
const DEFAULTS = NO_DEFAULTS
const groupOption = computed(() => GROUP_BYS.find((g) => g.id === groupBy.value) ?? null)
const groups = computed(() => groupRows(sortRows(shown.value, sort.value, SORT_KEYS), groupOption.value))

const tags = computed<FilterTag[]>(() => {
  const list = viewTags(FILTERS, GROUP_BYS, filters.value, groupBy.value, DEFAULTS)
  return list
})

function removeTag(id: string) {
  const next = resetTag(FILTERS, filters.value, groupBy.value, DEFAULTS, id)
  filters.value = next.on
  groupBy.value = next.group
}

const added = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner toolbar">
      <h1 class="sr-only">Staff accounts</h1>
      <RouterLink to="/staff/new" class="btn btn-primary">New</RouterLink>
      <SearchBox
        v-model="search"
        class="search"
        input-id="staff-search"
        placeholder="Search…"
        :tags="tags"
        @remove-tag="removeTag"
      >
        <FilterMenu
          v-model:on="filters"
          v-model:group="groupBy"
          :options="FILTERS"
          :group-bys="GROUP_BYS"
          :defaults="DEFAULTS"
        />
      </SearchBox>
      <span class="muted total">{{ shown.length }} {{ shown.length === 1 ? 'account' : 'accounts' }}</span>
    </div>
  </div>

  <div class="page">
    <ErrorState v-if="catalog.error" :message="catalog.error" @retry="load" />
    <section v-else class="panel list">
      <LoadingState v-if="loading && !catalog.users.length" message="Loading accounts…" />
      <EmptyState v-else-if="!shown.length" icon="search" message="No accounts match your search" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <SortHeader id="name" v-model="sort" label="Name" />
              <SortHeader id="username" v-model="sort" label="Username" />
              <th scope="col">Phone</th>
              <SortHeader id="role" v-model="sort" label="Role" />
              <SortHeader id="added" v-model="sort" label="Added" />
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody v-for="g in groups" :key="g.key">
            <tr v-if="g.title" class="group">
              <th scope="rowgroup" colspan="6">
                <GroupFold :title="g.title" :count="g.rows.length" :open="isOpen(g.key)" @toggle="toggle(g.key)" />
              </th>
            </tr>
            <tr
              v-for="u in isOpen(g.key) ? g.rows : []"
              :key="u.id"
              :class="{ off: !u.isActive }"
              @click="router.push(`/staff/${u.id}`)"
            >
              <td>
                <RouterLink :to="`/staff/${u.id}`" class="person" @click.stop>
                  <UserAvatar :name="u.fullName" />
                  <span class="name">{{ u.fullName }}</span>
                </RouterLink>
              </td>
              <td class="mono">{{ u.username }}</td>
              <td class="mono nowrap">{{ formatPhone(u.phone) }}</td>
              <td>{{ u.role === 'MANAGER' ? 'Manager' : 'Staff' }}</td>
              <td class="nowrap">{{ added(u.createdAt) }}</td>
              <td><AccountStatus :user="u" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.search {
  flex: 0 1 560px;
}

.total {
  margin-left: auto;
  font-size: 13px;
}

.list {
  overflow: hidden;
}

tbody tr:not(.group) {
  cursor: pointer;
}

tbody tr:not(.group):hover {
  background: var(--surface-2);
}

.group th {
  background: var(--surface-2);
  color: var(--ink);
  font-weight: 600;
}

tbody tr.off td {
  color: var(--muted);
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name {
  color: var(--ink);
  font-weight: 600;
}

.nowrap {
  white-space: nowrap;
}
</style>
