<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { accessDenied } from '@/router'
import ForbiddenView from '@/views/ForbiddenView.vue'
import TopBar from '@/components/layout/TopBar.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useCounts } from '@/composables/useCounts'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const catalog = useCatalogStore()
const { load } = useCounts()
const { current: toast, close: closeToast } = useToast()

// "Undo": close the message first, so it cannot be pressed twice
function runToastAction() {
  const action = toast.value?.action
  closeToast()
  action?.run()
}

// After logging in (or reopening the tab while logged in): fill the counts and the small lists
watch(
  () => auth.user?.id,
  (id) => {
    if (id === undefined) return
    load()
    catalog.fetchAll()
    if (auth.isManager) catalog.fetchUsers()
  },
  { immediate: true },
)
</script>

<template>
  <TopBar />
  <main>
    <ForbiddenView v-if="accessDenied" />
    <RouterView v-else />
  </main>
  <ToastMessage
    v-if="toast"
    :kind="toast.kind"
    :message="toast.message"
    :action-label="toast.action?.label"
    @action="runToastAction"
    @close="closeToast"
  />
</template>
