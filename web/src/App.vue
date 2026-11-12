<script setup lang="ts">
import { RouterView } from 'vue-router'
import { accessDenied } from '@/router'
import ForbiddenView from '@/views/ForbiddenView.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import { useToast } from '@/composables/useToast'

const { current: toast, close: closeToast } = useToast()

// "Undo": close the message first, so it cannot be pressed twice
function runToastAction() {
  const action = toast.value?.action
  closeToast()
  action?.run()
}
</script>

<template>
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
