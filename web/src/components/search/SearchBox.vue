<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

export interface FilterTag {
  id: string
  label: string
  group?: boolean // a "group by" tag (layers icon) instead of a filter (funnel icon)
}

const props = defineProps<{ tags: FilterTag[]; placeholder: string; inputId: string }>()
const emit = defineEmits<{ 'remove-tag': [id: string] }>()
const text = defineModel<string>({ required: true })

// Phones have no room for the tags: they shrink to "funnel 2" / "layers 1", which open the Filters menu
const root = ref<HTMLElement | null>(null)
const filterTags = computed(() => props.tags.filter((t) => !t.group))
const groupTags = computed(() => props.tags.filter((t) => t.group))

function openMenu() {
  root.value?.querySelector<HTMLButtonElement>('.filters .toggle')?.click()
}
</script>

<template>
  <div ref="root" class="search">
    <span class="icon"><AppIcon name="search" :size="16" /></span>
    <button
      v-if="filterTags.length"
      type="button"
      class="sum"
      :aria-label="`Filtered by ${filterTags.map((t) => t.label).join(', ')}`"
      :title="`Filtered by ${filterTags.map((t) => t.label).join(', ')}`"
      @click.stop="openMenu"
    >
      <AppIcon name="funnel" :size="15" /> {{ filterTags.length }}
    </button>
    <button
      v-if="groupTags.length"
      type="button"
      class="sum"
      :aria-label="`Grouped: ${groupTags.map((t) => t.label).join(', ')}`"
      :title="`Grouped: ${groupTags.map((t) => t.label).join(', ')}`"
      @click.stop="openMenu"
    >
      <AppIcon name="layers" :size="15" /> {{ groupTags.length }}
    </button>
    <span v-for="tag in tags" :key="tag.id" class="tag">
      <span class="tag-ic"><AppIcon :name="tag.group ? 'layers' : 'funnel'" :size="13" /></span>
      <span class="tag-label">{{ tag.label }}</span>
      <button type="button" :aria-label="`Remove ${tag.group ? 'grouping' : 'filter'} ${tag.label}`" @click="emit('remove-tag', tag.id)">
        <AppIcon name="x" :size="12" />
      </button>
    </span>
    <label :for="inputId" class="sr-only">{{ placeholder }}</label>
    <input :id="inputId" v-model="text" type="search" :placeholder="placeholder" autocomplete="off" />
    <!-- the Filters ▾ menu -->
    <slot />
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: stretch;
  min-width: 0;
  min-height: var(--ctl);
  border: 1px solid #c9ced6;
  border-radius: var(--radius);
  background: var(--surface);
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.icon {
  display: flex;
  align-items: center;
  padding: 0 6px 0 12px;
  color: var(--muted);
}

.tag {
  align-self: center;
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--row);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.tag-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  background: var(--accent);
  color: #fff;
}

.tag-label {
  padding: 0 6px 0 8px;
}

.tag button {
  display: inline-flex;
  margin-right: 4px;
  padding: 2px;
  border: 0;
  border-radius: 3px;
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.tag button:hover {
  background: rgba(22, 25, 29, 0.08);
  color: var(--ink);
}

input {
  flex: 1 1 60px;
  min-width: 0;
  padding: 0 8px;
  border: 0;
  background: none;
  outline: none;
}

.sum {
  display: none;
  align-self: center;
  align-items: center;
  gap: 5px;
  flex: none;
  height: 32px;
  margin-right: 4px;
  padding: 0 10px 0 8px;
  border: 1px solid var(--accent-line);
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-hover);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.sum:hover {
  border-color: var(--accent);
}

@media (max-width: 720px) {
  .tag {
    display: none;
  }

  .sum {
    display: inline-flex;
  }
}
</style>
