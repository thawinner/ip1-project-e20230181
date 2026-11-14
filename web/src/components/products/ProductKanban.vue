<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ProductColumn from './ProductColumn.vue'
import ProductCard from './ProductCard.vue'
import type { ProductGroup } from './groups'
import type { Id } from '@/types'

const props = defineProps<{
  groups: ProductGroup[]
  grouped: boolean // false: one grid of cards, no columns
  groupNoun: string // "Categories" / "Suppliers", for "Categories 1–4 of 6"
  categoryName: (id: Id) => string
  supplierName: (id: Id | null) => string
}>()

const VISIBLE = 4 // whole columns in view on a wide screen
const PER_COLUMN = 10
const PER_GRID = 24 // cards shown at first when not grouped

const scroller = ref<HTMLElement | null>(null)
const first = ref(0) // index of the first column in view
const shown = ref<Record<string, number>>({}) // cards shown per column (or for the grid)

// A new search, filter or grouping starts again from the first cards
watch(
  () => props.groups,
  () => {
    shown.value = {}
    first.value = 0
    scroller.value?.scrollTo({ left: 0 })
  },
)

const count = (key: string) => shown.value[key] ?? (props.grouped ? PER_COLUMN : PER_GRID)
const last = computed(() => Math.min(first.value + VISIBLE, props.groups.length))

function showMore(key: string) {
  shown.value = { ...shown.value, [key]: count(key) + (props.grouped ? PER_COLUMN : PER_GRID) }
}

// Not grouped: all cards in one grid, "Showing 24 of 32" and Show more under it
const all = computed(() => props.groups[0]?.products ?? [])
const gridShown = computed(() => Math.min(count('all'), all.value.length))

function columnWidth() {
  const col = scroller.value?.firstElementChild as HTMLElement | null
  return col ? col.offsetWidth + 16 : 0 // 16 = the gap
}

function onScroll() {
  const width = columnWidth()
  if (width && scroller.value) first.value = Math.round(scroller.value.scrollLeft / width)
}

function move(step: number) {
  scroller.value?.scrollBy({ left: step * columnWidth(), behavior: 'smooth' })
}
</script>

<template>
  <div v-if="!grouped">
    <div class="grid">
      <ProductCard
        v-for="p in all.slice(0, gridShown)"
        :key="p.id"
        :product="p"
        :category-name="categoryName(p.categoryId)"
        :supplier-name="supplierName(p.supplierId)"
      />
    </div>
    <div v-if="all.length > gridShown" class="grid-foot">
      <span class="muted">Showing {{ gridShown }} of {{ all.length }}</span>
      <button type="button" class="btn btn-outline" @click="showMore('all')">
        Show {{ Math.min(PER_GRID, all.length - gridShown) }} more
      </button>
    </div>
  </div>

  <div v-else>
    <div v-if="groups.length > VISIBLE" class="col-pager">
      <span class="muted">{{ groupNoun }} {{ first + 1 }}–{{ last }} of {{ groups.length }}</span>
      <button
        type="button"
        class="btn btn-outline btn-sm"
        :aria-label="`Previous ${groupNoun.toLowerCase()}`"
        :disabled="first === 0"
        @click="move(-1)"
      >
        <AppIcon name="chevronLeft" :size="16" />
      </button>
      <button
        type="button"
        class="btn btn-outline btn-sm"
        :aria-label="`Next ${groupNoun.toLowerCase()}`"
        :disabled="last >= groups.length"
        @click="move(1)"
      >
        <AppIcon name="chevronRight" :size="16" />
      </button>
    </div>
    <div ref="scroller" class="columns" :class="{ many: groups.length > VISIBLE }" @scroll.passive="onScroll">
      <ProductColumn
        v-for="g in groups"
        :key="g.key"
        :group="g"
        :shown="count(g.key)"
        :category-name="categoryName"
        :supplier-name="supplierName"
        @show-more="showMore(g.key)"
      />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.grid-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}

.grid-foot .btn {
  min-width: 220px;
}

.col-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: -4px 0 10px;
}

.col-pager .muted {
  margin-right: 4px;
  font-size: 13px;
}

.col-pager .btn {
  width: 36px;
  padding: 0;
}

/* Wide screens: the columns share the width; with more than 4 they scroll sideways, 4 whole columns in view */
.columns {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(250px, 1fr);
  gap: 16px;
  align-items: start;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 12px;
}

.columns.many {
  grid-auto-columns: calc((100% - 48px) / 4);
}

.columns > * {
  scroll-snap-align: start;
}

/* Tablets: the groups stack, cards side by side inside each one */
@media (max-width: 1180px) {
  .col-pager {
    display: none;
  }

  .columns,
  .columns.many {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 22px;
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .grid-foot .btn {
    width: 100%;
  }
}
</style>
