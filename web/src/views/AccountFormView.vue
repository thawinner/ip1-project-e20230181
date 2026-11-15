<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import NotFoundView from './NotFoundView.vue'
import AppIcon from '@/components/AppIcon.vue'
import FormField from '@/components/form/FormField.vue'
import FormAlert from '@/components/form/FormAlert.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useToast } from '@/composables/useToast'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { checkAccount, passwordError, type AccountErrors } from '@/utils/accountRules'

// /staff/new (no id) and /staff/:id/edit (story 1)
const props = defineProps<{ id?: string }>()

const catalog = useCatalogStore()
const router = useRouter()
const toast = useToast()

const userId = computed(() => (props.id === undefined ? null : Number(props.id)))
const isNew = computed(() => userId.value === null)
const loading = ref(!isNew.value)

const form = reactive({ fullName: '', username: '', phone: '', password: '' })
const saved = ref('')
const tried = ref(false)
const saving = ref(false)
const serverErrors = ref<AccountErrors>({})
const formError = ref<string | null>(null)

const snapshot = () => JSON.stringify(form)
const dirty = computed(() => snapshot() !== saved.value)

const account = computed(() => catalog.users.find((u) => u.id === userId.value) ?? null)

async function load() {
  if (isNew.value) {
    saved.value = snapshot()
    return
  }
  if (!catalog.users.length) await catalog.fetchUsers()
  loading.value = false
  if (!account.value) return
  Object.assign(form, { fullName: account.value.fullName, username: account.value.username, phone: account.value.phone })
  saved.value = snapshot()
}
watch(userId, load, { immediate: true })

const input = computed(() => ({ fullName: form.fullName, username: form.username.trim().toLowerCase(), phone: form.phone }))

// What the browser can check by itself; the API adds "This username is already taken"
const clientErrors = computed<AccountErrors>(() => {
  const found = checkAccount(input.value)
  const weak = isNew.value ? passwordError(form.password) : null
  return weak ? { ...found, password: weak } : found
})
const errors = computed<AccountErrors>(() => (tried.value ? { ...serverErrors.value, ...clientErrors.value } : {}))

// Typing a new username clears "This username is already taken"
watch(
  () => form.username,
  () => (serverErrors.value = {}),
)

async function save() {
  tried.value = true
  formError.value = null
  const first = Object.keys(clientErrors.value)[0]
  if (first) {
    document.getElementById(`account-${first}`)?.focus()
    return
  }
  saving.value = true
  try {
    const user = await catalog.saveUser(userId.value, input.value, form.password)
    saved.value = snapshot()
    toast.show('success', isNew.value ? `${user.fullName} added. Give them the temporary password.` : `${user.fullName} saved.`)
    await router.push(`/staff/${user.id}`)
  } catch (e) {
    serverErrors.value = fieldErrors(e) as AccountErrors
    if (!Object.keys(serverErrors.value).length) formError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push(isNew.value ? '/staff' : `/staff/${userId.value}`)
}

onBeforeRouteLeave(() => {
  if (dirty.value && !saving.value) return window.confirm('Leave without saving? Your changes will be lost.')
})
</script>

<template>
  <NotFoundView v-if="!isNew && !loading && !account" />

  <template v-else>
    <div class="page-band">
      <div class="page-band-inner band">
        <h1>{{ isNew ? 'New' : `Edit: ${account?.fullName ?? ''}` }}</h1>
        <span class="state" :class="{ dirty: isNew || dirty }">
          <AppIcon name="alert" :size="14" />
          {{ isNew ? 'New account, not saved yet' : dirty ? 'Unsaved changes' : 'Editing' }}
        </span>
        <BaseButton @click="cancel">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" loading-text="Saving…" @click="save">
          <AppIcon name="check" :size="16" /> Save account
        </BaseButton>
      </div>
    </div>

    <div class="page">
      <section v-if="loading" class="panel"><LoadingState message="Loading the account…" /></section>

      <form v-else class="panel sheet" novalidate @submit.prevent="save">
        <FormAlert v-if="formError" kind="error" :message="formError" />

        <div class="title">
          <div class="grow">
            <label for="account-fullName" class="label">Full name <span class="req" aria-hidden="true">*</span></label>
            <input
              id="account-fullName"
              v-model="form.fullName"
              class="input big"
              placeholder="First and last name"
              :aria-invalid="errors.fullName ? 'true' : undefined"
            />
            <p v-if="errors.fullName" class="error">{{ errors.fullName }}</p>
            <p v-else class="role">{{ account?.role === 'MANAGER' ? 'Manager' : 'Staff (storekeeper)' }}</p>
          </div>
          <span class="pic"><AppIcon name="user" :size="32" /></span>
        </div>

        <div class="groups">
          <section>
            <h2>Login</h2>
            <FormField
              id="account-username"
              v-model="form.username"
              label="Username"
              required
              horizontal
              mono
              autocomplete="off"
              help="3–20 lowercase letters or numbers"
              :error="errors.username"
            />
            <FormField
              v-if="isNew"
              id="account-password"
              v-model="form.password"
              label="Temporary password"
              required
              horizontal
              autocomplete="off"
              help="They must choose their own at first login"
              :error="errors.password"
            />
          </section>
          <section>
            <h2>Contact</h2>
            <FormField
              id="account-phone"
              v-model="form.phone"
              label="Phone"
              required
              horizontal
              mono
              help="Like 012 345 678"
              :error="errors.phone"
            />
          </section>
        </div>
        <button type="submit" hidden />
      </form>
    </div>
  </template>
</template>

<style scoped>
.band {
  padding-top: 18px;
  padding-bottom: 18px;
}

.band h1 {
  font-size: 22px;
  font-weight: 700;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.state.dirty {
  color: var(--low-fg);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 32px 32px;
}

.title {
  display: flex;
  gap: 20px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.req {
  color: var(--danger-fg);
}

.big {
  min-height: 48px;
  font-size: 22px;
  font-weight: 600;
}

.role {
  margin: 6px 0 0;
  color: var(--ink-2);
}

.error {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--danger-fg);
}

.pic {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-hover);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 8px 40px;
}

.groups section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--row);
  font-size: 14px;
}

@media (max-width: 720px) {
  .sheet {
    padding: 16px;
  }

  .pic {
    display: none;
  }
}
</style>
