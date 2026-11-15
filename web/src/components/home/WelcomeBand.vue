<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatLongDate } from '@/utils/format'

export interface WaitingLink {
  text: string
  to: string
}

const props = defineProps<{ name: string; waiting: WaitingLink[]; continueLink?: WaitingLink | null }>()
const emit = defineEmits<{ receive: []; 'send-out': [] }>()

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${props.name}`
})
</script>

<template>
  <header class="band">
    <div class="inner">
      <div>
        <p class="date">{{ formatLongDate() }}</p>
        <h1>{{ greeting }}</h1>
        <p class="waiting">
          <template v-if="waiting.length">
            <template v-for="(item, i) in waiting" :key="item.text">
              <span v-if="i > 0" aria-hidden="true"> · </span>
              <RouterLink :to="item.to">{{ item.text }}</RouterLink>
            </template>
          </template>
          <template v-else>Nothing is waiting for you.</template>
        </p>
        <RouterLink v-if="continueLink" :to="continueLink.to" class="continue">
          <AppIcon name="arrowRight" :size="16" /> {{ continueLink.text }}
        </RouterLink>
      </div>
      <div class="actions">
        <button type="button" class="btn act" @click="emit('receive')">
          <AppIcon name="inbox" /> Receive
        </button>
        <button type="button" class="btn act" @click="emit('send-out')">
          <AppIcon name="send" /> Send out
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.continue {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  opacity: 0.92;
}

.continue:hover {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.band {
  background: var(--nav-bg);
  color: #fff;
  padding: 36px 24px 88px;
}

.inner {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.date,
.waiting {
  margin: 0;
  color: var(--nav-soft);
}

.waiting {
  font-size: 15px;
}

.date {
  font-size: 14px;
  font-weight: 500;
}

h1 {
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  margin: 4px 0 8px;
}

.waiting a {
  color: #fff;
  font-weight: 600;
  text-underline-offset: 3px;
}

.actions {
  display: flex;
  gap: 10px;
}

.act {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  background: #fff;
  color: var(--nav-bg);
  font-size: 15px;
}

.act svg {
  color: var(--accent);
}

.act:hover {
  background: #e9eef7;
}

@media (max-width: 720px) {
  .band {
    padding: 14px 16px 56px;
  }

  .date {
    display: none;
  }

  h1 {
    font-size: 19px;
    margin: 0 0 4px;
  }

  .waiting {
    font-size: 13px;
  }

  .actions {
    width: 100%;
  }

  .act {
    flex: 1;
  }
}
</style>
