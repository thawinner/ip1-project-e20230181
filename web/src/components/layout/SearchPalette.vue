<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/components/icons'
import { appsFor } from '@/apps'
import { isLowStock } from '@/api/products'
import { useRecordDialog } from '@/composables/useRecordDialog'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useProductStore } from '@/stores/products'
import { quantityText } from '@/utils/format'

// "Search…" in the top bar: type to jump to a product, a page or an action. ↑ ↓ to choose, Enter to open.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const catalog = useCatalogStore()
const products = useProductStore()
const record = useRecordDialog()
const route = useRoute()
const router = useRouter()

interface Item {
  group: 'Products' | 'Actions' | 'Go to' | 'Staff'
  label: string
  sub?: string
  icon: IconName
  app?: string // coloured square like the home menu tile
  run: () => void
}

const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const text = ref('')
const active = ref(0)

watch(
  () => props.open,
  async (open) => {
    if (!open) return dialog.value?.close()
    text.value = ''
    active.value = 0
    if (!products.all.length) products.fetchAll()
    dialog.value?.showModal()
    await nextTick()
    input.value?.focus()
  },
)

const go = (to: RouteLocationRaw) => () => router.push(to)

// On an active product's page, Receive / Send out start with that product
const currentProduct = () => {
  const p = route.name === 'product' ? products.current : null
  return p?.isActive ? p.id : null
}

const actions = computed<Item[]>(() => {
  const list: Item[] = [
    {
      group: 'Actions',
      icon: 'inbox',
      label: 'Receive goods',
      sub: 'A delivery or a return from the shop',
      run: () => record.open('IN', currentProduct()),
    },
    {
      group: 'Actions',
      icon: 'send',
      label: 'Send out stock',
      sub: 'To the shop, or a write-off',
      run: () => record.open('OUT', currentProduct()),
    },
  ]
  if (auth.isManager) {
    list.push(
      { group: 'Actions', icon: 'plus', label: 'New product', run: go('/products/new') },
      { group: 'Actions', icon: 'users', label: 'Add a staff account', run: go('/staff/new') },
    )
  }
  return list
})

// The home menu, then every page of every app, once each
const pages = computed<Item[]>(() => {
  const list: Item[] = [{ group: 'Go to', icon: 'apps', label: 'Home menu', sub: 'All sections as tiles', run: go('/') }]
  const seen = new Set<string>()
  for (const app of auth.user ? appsFor(auth.user.role) : []) {
    for (const page of app.pages) {
      const key = page.path + JSON.stringify(page.query ?? {})
      if (seen.has(key)) continue
      seen.add(key)
      list.push({
        group: 'Go to',
        icon: app.icon,
        app: app.id,
        label: page.label,
        sub: page.label === app.label ? '' : app.label,
        run: go({ path: page.path, query: page.query }),
      })
    }
  }
  return list
})

const items = computed<Item[]>(() => {
  const q = text.value.trim().toLowerCase()
  const has = (s: string | undefined) => (s ?? '').toLowerCase().includes(q)
  const acts = actions.value.filter((a) => !q || has(a.label) || has(a.sub))
  if (!q) return [...acts, ...pages.value.slice(0, 8)]

  const found = products.all
    .filter((p) => (p.isActive || auth.isManager) && (has(p.name) || has(p.sku)))
    .slice(0, 6)
    .map<Item>((p) => ({
      group: 'Products',
      icon: 'box',
      label: p.name,
      sub: `${p.sku} · ${quantityText(p.quantity, p.unit)}${isLowStock(p) ? ' · low' : ''}${p.isActive ? '' : ' · archived'}`,
      run: go(`/products/${p.id}`),
    }))
  const people = (auth.isManager ? catalog.users : [])
    .filter((u) => has(u.fullName) || has(u.username))
    .slice(0, 4)
    .map<Item>((u) => ({
      group: 'Staff',
      icon: 'user',
      label: u.fullName,
      sub: `${u.username}${u.isActive ? '' : ' · deactivated'}`,
      run: go(`/staff/${u.id}`),
    }))
  const pgs = pages.value.filter((p) => has(p.label) || has(p.sub)).slice(0, 6)
  return [...found, ...acts, ...pgs, ...people]
})

watch(text, () => (active.value = 0))

function move(step: number) {
  const n = items.value.length
  if (!n) return
  active.value = (active.value + step + n) % n
  nextTick(() => document.getElementById(`palette-${active.value}`)?.scrollIntoView({ block: 'nearest' }))
}

function run(i: number) {
  const item = items.value[i]
  if (!item) return
  emit('close')
  item.run()
}

// A click on the dark backdrop (outside the box) closes it
function onClick(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog ref="dialog" class="palette" aria-label="Search or jump to" @close="emit('close')" @click="onClick">
    <div class="field">
      <AppIcon name="search" :size="18" />
      <input
        ref="input"
        v-model="text"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        aria-autocomplete="list"
        :aria-activedescendant="items.length ? `palette-${active}` : undefined"
        placeholder="Search a product, a page or an action…"
        autocomplete="off"
        spellcheck="false"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="run(active)"
      />
    </div>
    <ul id="palette-list" role="listbox" aria-label="Results">
      <template v-for="(item, i) in items" :key="`${item.group}-${item.label}-${i}`">
        <li v-if="i === 0 || items[i - 1]!.group !== item.group" class="group" role="presentation">
          {{ item.group }}
        </li>
        <li
          :id="`palette-${i}`"
          role="option"
          :aria-selected="i === active"
          @mousemove="active = i"
          @click="run(i)"
        >
          <span class="ic" :class="{ app: item.app }" :style="item.app ? { background: `var(--app-${item.app})` } : undefined">
            <AppIcon :name="item.icon" :size="16" />
          </span>
          <span class="text">
            <span>{{ item.label }}</span>
            <small v-if="item.sub">{{ item.sub }}</small>
          </span>
        </li>
      </template>
      <li v-if="!items.length" class="empty" role="presentation">Nothing found for “{{ text.trim() }}”</li>
    </ul>
  </dialog>
</template>

<style scoped>
.palette {
  width: min(620px, calc(100vw - 24px));
  margin: 12vh auto auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.palette::backdrop {
  background: rgba(22, 25, 29, 0.42);
}

.field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--row);
  color: var(--muted);
}

input {
  flex: 1;
  height: 56px;
  border: 0;
  outline: 0;
  background: none;
  color: var(--ink);
  font-size: 16px;
}

ul {
  margin: 0;
  padding: 6px;
  list-style: none;
  max-height: min(420px, 55vh);
  overflow-y: auto;
}

.group {
  padding: 10px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

[role='option'] {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: var(--radius);
  cursor: pointer;
}

[role='option'][aria-selected='true'] {
  background: var(--accent-soft);
}

.ic {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--ink-2);
}

.ic.app {
  border-radius: 7px;
  color: #fff;
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.text span {
  overflow: hidden;
  color: var(--ink);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text small {
  color: var(--muted);
  font-size: 12px;
}

.empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 720px) {
  .palette {
    margin-top: 8px;
  }
}
</style>
