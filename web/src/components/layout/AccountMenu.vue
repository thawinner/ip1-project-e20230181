<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useDropdown } from '@/composables/useDropdown'
import type { User } from '@/types'

const props = defineProps<{ user: User; restricted: boolean }>()
const emit = defineEmits<{ logout: [] }>()

const root = ref<HTMLElement | null>(null)
const { open, toggle } = useDropdown(root)

const initials = computed(() =>
  props.user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
const firstName = computed(() => props.user.fullName.split(' ')[0])
</script>

<template>
  <div ref="root" class="account">
    <button
      type="button"
      class="nav-btn"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`${user.fullName}, account menu`"
      @click="toggle"
    >
      <span class="avatar" aria-hidden="true">{{ initials }}</span>
      <span class="name" aria-hidden="true">{{ firstName }}</span>
      <AppIcon name="caret" :size="14" />
    </button>

    <div v-if="open" class="menu" role="menu">
      <div class="who">
        <strong>{{ user.fullName }}</strong>
        <span class="muted">{{ user.role === 'MANAGER' ? 'Manager' : 'Staff' }} · {{ user.username }}</span>
      </div>
      <template v-if="!restricted">
        <RouterLink to="/profile" class="item" role="menuitem" @click="open = false">
          <AppIcon name="user" :size="16" /> My profile
        </RouterLink>
        <RouterLink to="/profile/password" class="item" role="menuitem" @click="open = false">
          <AppIcon name="lock" :size="16" /> Change password
        </RouterLink>
        <hr />
      </template>
      <button type="button" class="item danger" role="menuitem" @click="emit('logout')">
        <AppIcon name="logout" :size="16" /> Log out
      </button>
    </div>
  </div>
</template>

<style scoped>
.account {
  position: relative;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  font-weight: 600;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  min-width: 220px;
  padding: 6px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.who {
  display: flex;
  flex-direction: column;
  padding: 6px 10px 8px;
  font-size: 13px;
}

.who strong {
  color: var(--ink);
  font-size: 14px;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
}

a.item {
  color: var(--ink-2);
  text-decoration: none;
}

button.item:hover,
a.item:hover {
  background: var(--surface-2);
}

.danger {
  color: var(--danger-fg);
}

hr {
  border: 0;
  border-top: 1px solid var(--row);
  margin: 6px 0;
}

@media (max-width: 720px) {
  .name {
    display: none;
  }
}
</style>
