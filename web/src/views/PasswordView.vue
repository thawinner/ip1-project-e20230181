<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormField from '@/components/form/FormField.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { checkNewPassword, type PasswordErrors } from '@/utils/accountRules'

// /profile/password: change your password; with a temporary password (story 1) the guard keeps you here first
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const firstLogin = computed(() => auth.mustChangePassword)

const current = ref('')
const next = ref('')
const confirm = ref('')
const tried = ref(false)
const saving = ref(false)
const serverErrors = ref<PasswordErrors>({})
const formError = ref<string | null>(null)

const errors = computed<PasswordErrors>(() =>
  tried.value ? { ...serverErrors.value, ...checkNewPassword(current.value, next.value, confirm.value) } : {},
)

async function save() {
  tried.value = true
  serverErrors.value = {}
  formError.value = null
  const first = Object.keys(checkNewPassword(current.value, next.value, confirm.value))[0]
  if (first) {
    document.getElementById(`password-${first}`)?.focus()
    return
  }
  saving.value = true
  const wasFirst = firstLogin.value
  try {
    await auth.changePassword(current.value, next.value, confirm.value)
    toast.show('success', 'Password changed. Use the new one next time you log in.')
    await router.replace(wasFirst ? '/' : '/profile')
  } catch (e) {
    serverErrors.value = fieldErrors(e) as PasswordErrors
    if (!Object.keys(serverErrors.value).length) formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner band">
      <h1>{{ firstLogin ? 'Set your new password' : 'Change password' }}</h1>
    </div>
  </div>

  <div class="page">
    <form class="panel card" novalidate @submit.prevent="save">
      <p class="who">{{ auth.user?.fullName }}</p>
      <p class="muted intro">
        <template v-if="firstLogin">You logged in with a temporary password. Choose your own to continue.</template>
        <template v-else>Use the new one next time you log in.</template>
      </p>
      <FormAlert v-if="formError" kind="error" :message="formError" />
      <FormField
        id="password-current"
        v-model="current"
        :label="firstLogin ? 'Temporary password' : 'Current password'"
        type="password"
        required
        horizontal
        autocomplete="current-password"
        :error="errors.current"
      />
      <FormField
        id="password-next"
        v-model="next"
        label="New password"
        type="password"
        required
        horizontal
        autocomplete="new-password"
        help="8+ characters with a letter and a number"
        :error="errors.next"
      />
      <FormField
        id="password-confirm"
        v-model="confirm"
        label="Confirm new password"
        type="password"
        required
        horizontal
        autocomplete="new-password"
        :error="errors.confirm"
      />
      <div class="buttons">
        <BaseButton type="submit" variant="primary" :loading="saving" loading-text="Saving…">Save password</BaseButton>
        <RouterLink v-if="!firstLogin" to="/profile" class="btn btn-outline">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
.band {
  padding-top: 20px;
  padding-bottom: 20px;
}

.band h1 {
  font-size: 24px;
  font-weight: 700;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
  padding: 24px 32px 32px;
}

.who {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.intro {
  margin: -8px 0 4px;
}

.card :deep(.field.horizontal) {
  grid-template-columns: 180px minmax(0, 1fr);
}

.buttons {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

@media (max-width: 720px) {
  .card {
    padding: 16px;
  }
}
</style>
