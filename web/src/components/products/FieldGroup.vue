<script setup lang="ts">
export interface Field {
  label: string
  value: string
  unit?: string // shown small and grey after the value
  help?: string // a grey line under the value
  to?: string // the value is a link
  badge?: string // the value is a badge with this class (in, out, adj)
  mono?: boolean
  muted?: boolean
}

defineProps<{ title: string; fields: Field[] }>()
</script>

<template>
  <section class="group">
    <h3>{{ title }}</h3>
    <dl>
      <div v-for="field in fields" :key="field.label" class="row">
        <dt>{{ field.label }}</dt>
        <dd :class="{ mono: field.mono, muted: field.muted }">
          <RouterLink v-if="field.to" :to="field.to">{{ field.value }}</RouterLink>
          <span v-else-if="field.badge" class="badge" :class="field.badge">{{ field.value }}</span>
          <template v-else>{{ field.value }}</template>
          <small v-if="field.unit">&nbsp;{{ field.unit }}</small>
          <span v-if="field.help" class="help">{{ field.help }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
h3 {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--row);
  font-size: 14px;
  color: var(--ink);
}

dl {
  margin: 0;
}

.row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  padding: 10px 0;
}

dt {
  color: var(--ink-2);
}

dd {
  margin: 0;
  color: var(--ink);
}

dd.muted {
  color: var(--muted);
}

dd a {
  text-decoration: none;
}

dd a:hover {
  text-decoration: underline;
}

small {
  color: var(--muted);
  font-size: 12px;
}

.help {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
}
</style>
