<script setup lang="ts">
import { reactive, ref } from 'vue'
import FormField from '@/components/form/FormField.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import type { LoginInput } from '@/types'

defineProps<{ loading: boolean; error: string | null }>()
const emit = defineEmits<{ submit: [input: LoginInput] }>()

const username = ref('')
const password = ref('')
const errors = reactive<{ username: string | null; password: string | null }>({ username: null, password: null })

function submit() {
  errors.username = username.value.trim() ? null : 'Enter your username'
  errors.password = password.value ? null : 'Enter your password'
  if (errors.username || errors.password) return
  emit('submit', { username: username.value.trim(), password: password.value })
}

// The parent fills the form for the demo accounts
function fill(user: string, pass: string) {
  username.value = user
  password.value = pass
  errors.username = null
  errors.password = null
}

defineExpose({ fill })
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <FormAlert v-if="error" kind="error" :message="error" />
    <FormField
      id="username"
      v-model="username"
      label="Username"
      autocomplete="username"
      :error="errors.username"
    />
    <FormField
      id="password"
      v-model="password"
      label="Password"
      type="password"
      autocomplete="current-password"
      :error="errors.password"
    />
    <BaseButton type="submit" variant="primary" :loading="loading" loading-text="Logging in…">Log in</BaseButton>
    <p class="foot">No account? Ask your manager.</p>
  </form>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.btn {
  width: 100%;
}

.foot {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
</style>
