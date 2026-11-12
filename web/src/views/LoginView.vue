<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import LoginForm from '@/components/login/LoginForm.vue'
import { useAuthStore } from '@/stores/auth'
import { DEMO_PASSWORD } from '@/api/auth'
import { errorMessage } from '@/utils/errors'
import type { LoginInput } from '@/types'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const form = ref<InstanceType<typeof LoginForm> | null>(null)

// Mock only: one click fills a demo account (removed with the mock login in M3)
const demos = [
  { label: 'Staff', username: 'sokha' },
  { label: 'Manager', username: 'dara' },
]

// Only paths inside the app, never "//other-site.com"
function redirectTarget() {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
}

async function login(input: LoginInput) {
  loading.value = true
  error.value = null
  try {
    await auth.login(input)
    await router.replace(redirectTarget() ?? '/dashboard')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="card panel">
      <div class="brand">
        <AppLogo :size="56" />
        <span>Shop<b>Stock</b></span>
      </div>
      <h1 class="sr-only">Log in</h1>
      <LoginForm ref="form" :loading="loading" :error="error" @submit="login" />
    </div>
    <div class="demo" role="group" aria-label="Demo accounts">
      <span>Demo accounts:</span>
      <button
        v-for="demo in demos"
        :key="demo.username"
        type="button"
        class="btn btn-outline btn-sm"
        @click="form?.fill(demo.username, DEMO_PASSWORD)"
      >
        {{ demo.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 16px;
}

.card {
  width: min(400px, 100%);
  padding: 28px;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 22px;
  font-weight: 700;
}

.brand b {
  color: var(--accent);
}

.demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}
</style>
