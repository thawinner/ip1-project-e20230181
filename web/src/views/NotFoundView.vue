<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
</script>

<template>
  <div class="page">
    <section class="panel not-found" aria-labelledby="not-found-title">
      <header>
        <AppIcon name="alert" :size="16" />
        <h1 id="not-found-title">Not found</h1>
      </header>
      <p>This page does not exist.</p>
      <footer>
        <RouterLink :to="auth.isLoggedIn ? '/' : '/login'" class="btn btn-primary">
          Go to the start page
        </RouterLink>
        <button type="button" class="btn btn-outline" @click="router.back()">Go back</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.not-found {
  max-width: 520px;
  margin: 24px auto;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--danger-bg);
  color: var(--danger-fg);
}

h1 {
  font-size: 15px;
  font-weight: 600;
  color: inherit;
}

p {
  margin: 0;
  padding: 20px;
}

footer {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--row);
}
</style>
