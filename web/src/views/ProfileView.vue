<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import FieldGroup, { type Field } from '@/components/products/FieldGroup.vue'
import { useAuthStore } from '@/stores/auth'
import { formatPhone } from '@/utils/format'

const auth = useAuthStore()

const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const loginFields = computed<Field[]>(() =>
  auth.user
    ? [
        { label: 'Username', value: auth.user.username, mono: true },
        { label: 'Password', value: '••••••••' },
      ]
    : [],
)
const contactFields = computed<Field[]>(() =>
  auth.user
    ? [
        { label: 'Phone', value: formatPhone(auth.user.phone), mono: true },
        { label: 'Added', value: date(auth.user.createdAt) },
      ]
    : [],
)
</script>

<template>
  <div v-if="auth.user" class="page">
    <h1 class="sr-only">My profile</h1>
    <div class="actions">
      <RouterLink to="/profile/password" class="btn btn-primary"><AppIcon name="lock" :size="16" /> Change password</RouterLink>
    </div>
    <article class="panel sheet">
      <header class="title">
        <div>
          <p class="label">My profile</p>
          <h2>{{ auth.user.fullName }}</h2>
          <p class="sub">{{ auth.isManager ? 'Manager' : 'Staff (storekeeper)' }}</p>
        </div>
        <UserAvatar :name="auth.user.fullName" :size="72" />
      </header>
      <div class="groups">
        <FieldGroup title="Login" :fields="loginFields" />
        <FieldGroup title="Contact" :fields="contactFields" />
      </div>
      <p class="info">
        <AppIcon name="alert" :size="16" />
        <template v-if="auth.isManager">Your details are set when the app is installed.</template>
        <template v-else>To change your name, username or phone, ask your manager.</template>
      </p>
    </article>
  </div>
</template>

<style scoped>
.actions {
  margin-bottom: 12px;
}

.sheet {
  padding: 28px 32px 32px;
}

.title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.title h2 {
  margin: 4px 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.sub {
  margin: 0;
  color: var(--ink-2);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px 40px;
}

.info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--info-bg);
  color: var(--info-fg);
  font-size: 13px;
}

@media (max-width: 720px) {
  .sheet {
    padding: 16px;
  }
}
</style>
