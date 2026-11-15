<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotFoundView from './NotFoundView.vue'
import AppIcon from '@/components/AppIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import AccountStatus from '@/components/AccountStatus.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FieldGroup, { type Field } from '@/components/products/FieldGroup.vue'
import RecordPager from '@/components/products/RecordPager.vue'
import ResetPasswordDialog from '@/components/accounts/ResetPasswordDialog.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useToast } from '@/composables/useToast'
import { errorMessage, fieldErrors } from '@/utils/errors'
import { formatPhone } from '@/utils/format'

// /staff/:id (props: true)
const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const catalog = useCatalogStore()
const router = useRouter()
const toast = useToast()

const loading = ref(true)
async function load() {
  loading.value = true
  catalog.error = null
  await catalog.fetchUsers()
  loading.value = false
}
onMounted(load)

const userId = computed(() => Number(props.id))
const account = computed(() => catalog.users.find((u) => u.id === userId.value) ?? null)
const isMe = computed(() => account.value?.id === auth.user?.id)

// "3 / 6": where this account is in the list
const position = computed(() => catalog.users.findIndex((u) => u.id === userId.value) + 1)
function go(step: number) {
  const next = catalog.users[position.value - 1 + step]
  if (next) router.push(`/staff/${next.id}`)
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const loginFields = computed<Field[]>(() => (account.value ? [{ label: 'Username', value: account.value.username, mono: true }] : []))
const contactFields = computed<Field[]>(() =>
  account.value
    ? [
        { label: 'Phone', value: formatPhone(account.value.phone), mono: true },
        { label: 'Added', value: date(account.value.createdAt) },
      ]
    : [],
)

// Reset password
const resetting = ref(false)
const resetError = ref<string | null>(null)
const busy = ref(false)

function openReset() {
  resetError.value = null
  resetting.value = true
}

async function reset(password: string) {
  if (!account.value) return
  busy.value = true
  try {
    await catalog.resetPassword(account.value.id, password)
    resetting.value = false
    toast.show('success', `Password reset. ${account.value.fullName} must choose a new one at the next login.`)
  } catch (e) {
    resetError.value = fieldErrors(e).password ?? errorMessage(e)
  } finally {
    busy.value = false
  }
}

// Deactivate / reactivate (story 10): never deleted, so their moves keep their name
const confirming = ref(false)

async function setActive(active: boolean, undo = true) {
  if (!account.value) return
  busy.value = true
  try {
    await catalog.setUserActive(account.value.id, active)
    toast.show(
      'success',
      active ? `${account.value.fullName} can log in again.` : `${account.value.fullName} is deactivated and can no longer log in.`,
      undo ? { label: 'Undo', run: () => setActive(!active, false) } : undefined,
    )
  } catch (e) {
    toast.show('error', errorMessage(e))
  } finally {
    busy.value = false
    confirming.value = false
  }
}
</script>

<template>
  <NotFoundView v-if="!loading && !catalog.error && !account" />

  <template v-else>
    <div class="page-band">
      <div class="page-band-inner band">
        <h1>{{ account?.fullName ?? 'Account' }}</h1>
        <RouterLink v-if="account" :to="`/staff/${account.id}/edit`" class="btn btn-outline btn-sm">
          <AppIcon name="edit" :size="14" /> Edit
        </RouterLink>
        <RecordPager
          v-if="position > 0"
          class="pager-right"
          :index="position"
          :total="catalog.users.length"
          @prev="go(-1)"
          @next="go(1)"
        />
      </div>
    </div>

    <div class="page">
      <ErrorState v-if="catalog.error" :message="catalog.error" @retry="load" />
      <section v-else-if="loading && !account" class="panel"><LoadingState message="Loading the account…" /></section>

      <template v-else-if="account">
        <div class="actions">
          <button v-if="!isMe" type="button" class="btn btn-outline" @click="openReset">
            <AppIcon name="key" :size="16" /> Reset password
          </button>
          <button v-if="account.isActive" type="button" class="btn btn-outline" @click="confirming = true">
            <AppIcon name="userOff" :size="16" /> Deactivate
          </button>
          <button v-else type="button" class="btn btn-outline" :disabled="busy" @click="setActive(true)">
            <AppIcon name="user" :size="16" /> Reactivate
          </button>
        </div>

        <article class="panel sheet">
          <header class="title">
            <div>
              <p class="label">Account</p>
              <h2>{{ account.fullName }}</h2>
              <p class="sub">
                {{ account.role === 'MANAGER' ? 'Manager' : 'Staff (storekeeper)' }}
                <AccountStatus :user="account" />
              </p>
            </div>
            <UserAvatar :name="account.fullName" :size="72" />
          </header>
          <div class="groups">
            <FieldGroup title="Login" :fields="loginFields" />
            <FieldGroup title="Contact" :fields="contactFields" />
          </div>
          <p v-if="isMe" class="info">
            <AppIcon name="alert" :size="16" /> This is your own account. Change your password from My profile.
          </p>
        </article>

        <ResetPasswordDialog
          :open="resetting"
          :name="account.fullName"
          :busy="busy"
          :server-error="resetError"
          @confirm="reset"
          @cancel="resetting = false"
        />
        <ConfirmDialog
          :open="confirming"
          title="Deactivate account"
          :text="`Deactivate ${account.fullName}? They can no longer log in. Their moves stay in the history.`"
          ok-label="Deactivate"
          danger
          :busy="busy"
          @confirm="setActive(false)"
          @cancel="confirming = false"
        />
      </template>
    </div>
  </template>
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

.pager-right {
  margin-left: auto;
}

.actions {
  display: flex;
  gap: 8px;
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
  display: flex;
  align-items: center;
  gap: 10px;
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
