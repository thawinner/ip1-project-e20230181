<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useDropdown } from '@/composables/useDropdown'
import { isDefaultView, NO_DEFAULTS, type DefaultView } from './filters'

// Filters ▾: a "Filters" column (groups split by a line) and a "Group by" column, each item ticked when on
const props = withDefaults(
  defineProps<{
    options: { id: string; label: string }[][] // the filter groups
    groupBys: { id: string; label: string }[]
    defaults?: DefaultView // what "Reset to default" goes back to
  }>(),
  { defaults: () => NO_DEFAULTS },
)
const on = defineModel<string[]>('on', { required: true }) // ids of the ticked filters
const group = defineModel<string | null>('group', { required: true })

const root = ref<HTMLElement | null>(null)
const { open, toggle } = useDropdown(root)

function toggleFilter(id: string) {
  on.value = on.value.includes(id) ? on.value.filter((x) => x !== id) : [...on.value, id]
}

function toggleGroup(id: string) {
  group.value = group.value === id ? null : id
}

function reset() {
  on.value = [...props.defaults.on]
  group.value = props.defaults.group
}
</script>

<template>
  <div ref="root" class="filters">
    <button type="button" class="toggle" aria-haspopup="true" :aria-expanded="open" @click="toggle">
      Filters <AppIcon name="caret" :size="14" />
    </button>
    <div v-if="open" class="panel menu">
      <div class="cols">
        <div v-if="options.length" class="col">
          <h3>Filters</h3>
          <template v-for="(list, i) in options" :key="i">
            <hr v-if="i > 0" />
            <button
              v-for="f in list"
              :key="f.id"
              type="button"
              class="item"
              :aria-pressed="on.includes(f.id)"
              @click="toggleFilter(f.id)"
            >
              <span class="check"><AppIcon v-if="on.includes(f.id)" name="check" :size="16" /></span>
              {{ f.label }}
            </button>
          </template>
        </div>
        <div v-if="groupBys.length" class="col">
          <h3>Group by</h3>
          <button
            v-for="g in groupBys"
            :key="g.id"
            type="button"
            class="item"
            :aria-pressed="group === g.id"
            @click="toggleGroup(g.id)"
          >
            <span class="check"><AppIcon v-if="group === g.id" name="check" :size="16" /></span>
            {{ g.label }}
          </button>
        </div>
      </div>
      <button v-if="!isDefaultView(on, group, defaults)" type="button" class="reset" @click="reset">
        <AppIcon name="undo" :size="14" /> Reset to default
      </button>
    </div>
  </div>
</template>

<style scoped>
.filters {
  position: relative;
  display: flex;
  border-left: 1px solid var(--border);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  background: none;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.toggle:hover,
.toggle[aria-expanded='true'] {
  background: var(--surface-2);
}

.menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 35;
  width: max-content;
  max-width: min(640px, calc(100vw - 32px));
  padding: 10px 6px;
  box-shadow: var(--shadow);
}

.cols {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(190px, 1fr);
}

.reset {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(100% - 8px);
  margin: 8px 4px 0;
  padding: 8px 10px 4px;
  border: 0;
  border-top: 1px solid var(--row);
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.reset:hover {
  text-decoration: underline;
}

.col {
  min-width: 0;
  padding: 0 6px;
}

.col + .col {
  border-left: 1px solid var(--row);
}

h3 {
  margin: 2px 8px 6px;
  font-size: 13px;
  color: var(--ink-2);
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink-2);
  text-align: left;
  cursor: pointer;
}

.item:hover {
  background: var(--surface-2);
}

.item[aria-pressed='true'] {
  color: var(--accent-hover);
  font-weight: 600;
}

.check {
  display: inline-flex;
  width: 16px;
  color: var(--accent);
}

hr {
  margin: 4px 8px;
  border: 0;
  border-top: 1px solid var(--row);
}

@media (pointer: coarse) {
  .item {
    min-height: 44px;
  }
}

@media (max-width: 720px) {
  .menu {
    position: fixed;
    left: 12px;
    right: 12px;
    top: auto;
    width: auto;
    max-width: none;
    max-height: 60vh;
    overflow-y: auto;
  }

  .cols {
    grid-auto-flow: row;
    grid-auto-columns: auto;
  }

  .col + .col {
    margin-top: 4px;
    padding-top: 8px;
    border-left: 0;
    border-top: 1px solid var(--row);
  }
}
</style>
