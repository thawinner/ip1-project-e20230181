<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

// App.vue shows this instead of a manager page a storekeeper opened (story 10: 403), at that same address
</script>

<template>
  <div class="page">
    <section class="panel box" aria-labelledby="forbidden-title">
      <header>
        <AppIcon name="lock" :size="16" />
        <h1 id="forbidden-title">Access error</h1>
      </header>
      <div class="body">
        <p class="strong">Only managers can open this page.</p>
        <p class="muted">You are logged in as a storekeeper. Ask your manager if you need it.</p>
      </div>
      <footer>
        <RouterLink to="/" class="btn btn-primary">Go to the start page</RouterLink>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.box {
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

.body {
  padding: 20px;
}

.body p {
  margin: 0 0 4px;
}

.strong {
  font-weight: 600;
  color: var(--ink-2);
}

footer {
  padding: 12px 20px;
  border-top: 1px solid var(--row);
}
</style>
