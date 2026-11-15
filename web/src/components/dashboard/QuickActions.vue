<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

defineProps<{ isManager: boolean }>()
const emit = defineEmits<{ receive: []; 'send-out': [] }>()
</script>

<template>
  <div class="quick">
    <button type="button" class="card" style="--q: var(--success-fg)" @click="emit('receive')">
      <span class="ic"><AppIcon name="inbox" :size="20" /></span>
      <span><strong>Receive goods</strong><span>A delivery or a return from the shop</span></span>
    </button>
    <button type="button" class="card" style="--q: var(--out-fg)" @click="emit('send-out')">
      <span class="ic"><AppIcon name="send" :size="20" /></span>
      <span><strong>Send to the shop</strong><span>Or write off damaged and expired stock</span></span>
    </button>
    <RouterLink v-if="isManager" to="/products/new" class="card" style="--q: var(--accent)">
      <span class="ic"><AppIcon name="plus" :size="20" /></span>
      <span><strong>New product</strong><span>Add it to the list</span></span>
    </RouterLink>
    <RouterLink v-else to="/products" class="card" style="--q: var(--accent)">
      <span class="ic"><AppIcon name="search" :size="20" /></span>
      <span><strong>Find a product</strong><span>See what is in storage</span></span>
    </RouterLink>
  </div>
</template>

<style scoped>
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--card-shadow);
  color: var(--ink-2);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.card:hover:not(:disabled) {
  border-color: var(--q);
}

.card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ic {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--q);
}

strong {
  display: block;
  color: var(--ink);
  font-size: 15px;
}

strong + span {
  display: block;
  font-size: 13px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .quick {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
