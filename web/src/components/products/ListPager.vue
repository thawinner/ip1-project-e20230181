<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ total: number; noun: string }>()
const page = defineModel<number>('page', { required: true })
const perPage = defineModel<number>('perPage', { required: true })

const PER_PAGE_OPTIONS = [10, 20, 50] // 50 is the most the API returns

const lastPage = computed(() => Math.max(1, Math.ceil(props.total / perPage.value)))
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * perPage.value + 1))
const to = computed(() => Math.min(page.value * perPage.value, props.total))

// 1 … 4 5 6 … 12: the first, the last and the pages next to the current one
const numbers = computed(() => {
  const list: (number | 'gap')[] = []
  for (let i = 1; i <= lastPage.value; i++) {
    if (i === 1 || i === lastPage.value || Math.abs(i - page.value) <= 1) list.push(i)
    else if (list[list.length - 1] !== 'gap') list.push('gap')
  }
  return list
})
</script>

<template>
  <nav class="pager" aria-label="Pages">
    <p class="info">
      Showing <strong>{{ from }}–{{ to }}</strong> of <strong>{{ total }}</strong> {{ noun }}
    </p>
    <div class="pages">
      <button type="button" class="btn btn-outline btn-sm" :disabled="page <= 1" @click="page--">
        <AppIcon name="chevronLeft" :size="16" /><span class="word">Previous</span>
      </button>
      <template v-for="(n, i) in numbers" :key="`${n}-${i}`">
        <span v-if="n === 'gap'" class="gap" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="btn btn-sm num"
          :aria-current="n === page ? 'page' : undefined"
          :aria-label="`Page ${n}`"
          @click="page = n"
        >
          {{ n }}
        </button>
      </template>
      <button type="button" class="btn btn-outline btn-sm" :disabled="page >= lastPage" @click="page++">
        <span class="word">Next</span><AppIcon name="chevronRight" :size="16" />
      </button>
    </div>
    <label class="size">
      Per page
      <select v-model="perPage" class="input">
        <option v-for="n in PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }}</option>
      </select>
    </label>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.info {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.info strong {
  color: var(--ink);
}

.pages {
  display: flex;
  align-items: center;
  gap: 4px;
}

.num {
  min-width: 34px;
  padding: 0 8px;
  border: 1px solid transparent;
  background: none;
}

.num:hover {
  border-color: var(--border);
  background: var(--surface-2);
}

.num[aria-current='page'] {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.gap {
  padding: 0 4px;
  color: var(--muted);
}

.size {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.size .input {
  width: auto;
  min-height: 34px;
  padding: 4px 8px;
}

@media (max-width: 720px) {
  .pager {
    justify-content: center;
    text-align: center;
  }

  .info {
    width: 100%;
  }

  .word {
    display: none;
  }
}
</style>
